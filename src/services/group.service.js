const { prisma } = require("../config/db");
const { AppError } = require("../utils/AppError");
const { validateGroupName, validateSearchKeyword } = require("../utils/validators");
const { GROUP_SELECT, INVITATION_SELECT } = require("../utils/select");
const { enrichGroupStreakData, updateGroupStreak } = require("./streak.service");

const ONE_GROUP_PER_USER_MESSAGE = "Bạn đã ở trong một nhóm, mỗi người chỉ được vào một nhóm";

// Nhóm mà user đang ở (làm chủ hoặc thành viên), null nếu chưa có nhóm nào
async function findMembership(userId) {
  return prisma.groupMember.findUnique({ where: { userId } });
}

function alreadyInGroupError() {
  return AppError.conflict(ONE_GROUP_PER_USER_MESSAGE, { field: "groupId" });
}

async function createGroup({ name, userId }) {
  const groupName = validateGroupName(name);

  // Ràng buộc 1 người 1 nhóm: kiểm tra trước để trả thông báo rõ ràng
  const existing = await findMembership(userId);
  if (existing) {
    throw alreadyInGroupError();
  }

  try {
    const created = await prisma.group.create({
      data: {
        name: groupName,
        ownerId: userId,
        members: { create: { userId, role: "OWNER" } },
      },
      select: GROUP_SELECT,
    });
    await updateGroupStreak(created.id);
    return enrichGroupStreakData(created);
  } catch (err) {
    // Hai request tạo nhóm chạy song song có thể cùng qua bước kiểm tra ở trên.
    // Khi đó ràng buộc @@unique([userId]) ở tầng DB chặn, trả lại cùng thông báo rõ ràng.
    if (err && err.code === "P2002") {
      throw alreadyInGroupError();
    }
    throw err;
  }
}

// Nhóm của tôi kèm thành viên, null nếu chưa ở nhóm nào
async function getMyGroup(userId) {
  const membership = await findMembership(userId);
  if (!membership) {
    return null;
  }

  await updateGroupStreak(membership.groupId);

  const group = await prisma.group.findUnique({
    where: { id: membership.groupId },
    select: GROUP_SELECT,
  });

  return enrichGroupStreakData(group);
}

// Nhóm phải do chính người gọi làm chủ mới được quản lý
async function requireOwnedGroup(userId) {
  const membership = await findMembership(userId);
  if (!membership) {
    throw AppError.notFound("Bạn chưa có nhóm nào, hãy tạo nhóm trước");
  }
  if (membership.role !== "OWNER") {
    throw AppError.forbidden("Chỉ chủ nhóm mới được mời thêm thành viên");
  }
  return membership;
}

// Tìm bạn theo tài khoản, kèm trạng thái để biết ai mời được
async function searchFriends({ keyword, userId }) {
  const term = validateSearchKeyword(keyword);
  const myGroup = await findMembership(userId);

  const [users, invited, myMembers] = await Promise.all([
    prisma.user.findMany({
      where: {
        username: { contains: term, mode: "insensitive" },
        id: { not: userId },
      },
      select: {
        id: true,
        username: true,
        avatarUrl: true,
        groupMemberships: {
          select: { group: { select: { id: true, name: true } } },
          take: 1,
        },
      },
      take: 20,
      orderBy: { username: "asc" },
    }),
    prisma.groupInvitation.findMany({
      where: { inviterId: userId, status: "PENDING" },
      select: { inviteeId: true },
    }),
    myGroup
      ? prisma.groupMember.findMany({ where: { groupId: myGroup.groupId }, select: { userId: true } })
      : Promise.resolve([]),
  ]);

  const invitedIds = new Set(invited.map((item) => item.inviteeId));
  const myMemberIds = new Set(myMembers.map((item) => item.userId));

  return users.map((user) => {
    const membership = user.groupMemberships[0];
    return {
      id: user.id,
      username: user.username,
      avatarUrl: user.avatarUrl,
      hasGroup: Boolean(membership),
      groupName: membership ? membership.group.name : null,
      isMyGroupMember: myMemberIds.has(user.id),
      isInvitedByMe: invitedIds.has(user.id),
    };
  });
}

// Mời một người vào nhóm. Người được mời phải chưa có nhóm thì mới tạo lời mời được.
async function inviteToGroup({ groupId, inviteeId, userId }) {
  const membership = await requireOwnedGroup(userId);
  if (membership.groupId !== groupId) {
    throw AppError.forbidden("Bạn không sở hữu nhóm này");
  }
  if (inviteeId === userId) {
    throw AppError.badRequest("Không thể mời chính mình", { field: "inviteeId" });
  }

  const invitee = await prisma.user.findUnique({
    where: { id: inviteeId },
    select: { id: true, username: true },
  });
  if (!invitee) {
    throw AppError.notFound("Không tìm thấy người dùng cần mời");
  }

  // Backend kiểm tra người được mời đã có nhóm chưa, có thì báo ngay cho người gửi
  const inviteeMembership = await findMembership(inviteeId);
  if (inviteeMembership) {
    throw AppError.conflict(`Người này đã có nhóm rồi, không thể mời vào nhóm của bạn`, {
      field: "inviteeId",
      username: invitee.username,
    });
  }

  // Chặn mời trùng khi đang có lời mời chờ, cho phép mời lại nếu lời cũ đã bị từ chối
  await prisma.groupInvitation.deleteMany({
    where: { groupId, inviteeId, status: { not: "PENDING" } },
  });

  const pending = await prisma.groupInvitation.findUnique({
    where: { groupId_inviteeId: { groupId, inviteeId } },
    select: { id: true, status: true },
  });
  if (pending && pending.status === "PENDING") {
    throw AppError.conflict("Bạn đã gửi lời mời cho người này rồi", { field: "inviteeId" });
  }

  return prisma.groupInvitation.upsert({
    where: { groupId_inviteeId: { groupId, inviteeId } },
    update: { status: "PENDING", inviterId: userId, respondedAt: null },
    create: { groupId, inviteeId, inviterId: userId },
    select: INVITATION_SELECT,
  });
}

// Lời mời đang chờ mà tôi nhận được, kèm người gửi để hiện "ai đã mời bạn"
async function listReceivedInvitations(userId) {
  return prisma.groupInvitation.findMany({
    where: { inviteeId: userId, status: "PENDING" },
    select: INVITATION_SELECT,
    orderBy: { createdAt: "desc" },
  });
}

// Lời mời tôi đã gửi, phục vụ phần "đã mời" trên trang bạn bè
async function listSentInvitations(userId) {
  return prisma.groupInvitation.findMany({
    where: { inviterId: userId, status: "PENDING" },
    select: { ...INVITATION_SELECT, invitee: { select: { id: true, username: true, avatarUrl: true } } },
    orderBy: { createdAt: "desc" },
  });
}

// Chấp nhận hoặc từ chối lời mời
async function respondToInvitation({ id, action, userId }) {
  const invitation = await prisma.groupInvitation.findUnique({
    where: { id },
    select: { id: true, inviteeId: true, groupId: true, status: true },
  });

  if (!invitation) {
    throw AppError.notFound("Không tìm thấy lời mời");
  }
  if (invitation.inviteeId !== userId) {
    throw AppError.forbidden("Bạn không có quyền xử lý lời mời này");
  }
  if (invitation.status !== "PENDING") {
    throw AppError.conflict("Lời mời này đã được xử lý trước đó", { status: invitation.status });
  }

  if (action === "REJECT") {
    return prisma.groupInvitation.update({
      where: { id },
      data: { status: "REJECTED", respondedAt: new Date() },
      select: INVITATION_SELECT,
    });
  }

  // Chấp nhận: người nhận phải vẫn chưa có nhóm nào
  const membership = await findMembership(userId);
  if (membership) {
    throw alreadyInGroupError();
  }

  try {
    return await prisma.$transaction(async (tx) => {
      await tx.groupMember.create({ data: { groupId: invitation.groupId, userId, role: "MEMBER" } });
      return tx.groupInvitation.update({
        where: { id },
        data: { status: "ACCEPTED", respondedAt: new Date() },
        select: INVITATION_SELECT,
      });
    });
  } catch (err) {
    // Chấp nhận 2 lời mời cùng lúc: request thứ hai vi phạm @@unique([userId]) ở tầng DB
    if (err && err.code === "P2002") {
      throw alreadyInGroupError();
    }
    throw err;
  }
}

// Rời khỏi nhóm hoặc giải tán nếu là chủ và không còn ai
async function leaveGroup(userId) {
  const membership = await findMembership(userId);
  if (!membership) {
    throw AppError.notFound("Bạn chưa tham gia nhóm nào");
  }

  const { groupId, role } = membership;

  if (role === "OWNER") {
    // Tìm thành viên lâu năm nhất kế tiếp để chuyển quyền chủ nhóm
    const nextMember = await prisma.groupMember.findFirst({
      where: { groupId, userId: { not: userId } },
      orderBy: { joinedAt: "asc" },
    });

    if (nextMember) {
      await prisma.$transaction([
        prisma.group.update({
          where: { id: groupId },
          data: { ownerId: nextMember.userId },
        }),
        prisma.groupMember.update({
          where: { id: nextMember.id },
          data: { role: "OWNER" },
        }),
        prisma.groupMember.delete({
          where: { id: membership.id },
        }),
      ]);
      return { message: "Đã rời nhóm và chuyển quyền trưởng nhóm", disbanded: false };
    } else {
      // Không còn ai khác -> giải tán nhóm
      await prisma.group.delete({ where: { id: groupId } });
      return { message: "Đã giải tán nhóm", disbanded: true };
    }
  } else {
    // Thành viên rời nhóm
    await prisma.groupMember.delete({ where: { id: membership.id } });
    return { message: "Đã rời nhóm thành công", disbanded: false };
  }
}

module.exports = {
  createGroup,
  getMyGroup,
  searchFriends,
  inviteToGroup,
  listReceivedInvitations,
  listSentInvitations,
  respondToInvitation,
  leaveGroup,
};
