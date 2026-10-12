// Seed dữ liệu tối thiểu cho hệ thống tủ đồ + bài học thí nghiệm.
//
// Script chạy lại nhiều lần được (upsert theo khoá tĩnh), không bao giờ xoá
// dữ liệu đã có: user, phòng và bài học cũ của chủ project giữ nguyên.
//
// Chạy: npm run prisma:seed

const fs = require("node:fs");
const path = require("node:path");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const LAB_ROOM_NAME = "Phòng thí nghiệm";

// Nội dung HTML của 2 màn mẫu nằm trong repo để seed chạy lại được trên
// database trống. Chỉ seed 2 màn này, không đụng tới bài do admin soạn.
const ASSETS_DIR = path.join(__dirname, "assets");

// Bài học thuộc phòng, id đặt tay cố định vì catalog.json tham chiếu tới
const SEED_LESSONS = [
  {
    id: "level-demo-1",
    name: "Màn 1: Pha trộn",
    order: 1,
    requiredSlots: [],
    slug: null,
    path: null,
    htmlAsset: "level-demo-1.html",
  },
  {
    id: "level-demo-2",
    name: "Màn 2: Quan sát mẫu",
    order: 2,
    requiredSlots: [],
    slug: null,
    path: null,
    htmlAsset: "level-demo-2.html",
  },
];

function readAsset(fileName) {
  const full = path.join(ASSETS_DIR, fileName);

  if (!fs.existsSync(full)) {
    throw new Error(`Thiếu file màn mẫu: ${full}`);
  }

  return fs.readFileSync(full, "utf-8");
}

async function seedLabRoom() {
  // Room.name không có ràng buộc unique nên phải tự dò tìm trước khi tạo
  const existing = await prisma.room.findFirst({ where: { name: LAB_ROOM_NAME } });
  const room = existing
    ? existing
    : await prisma.room.create({ data: { name: LAB_ROOM_NAME, order: 0 } });

  for (const lesson of SEED_LESSONS) {
    const html = lesson.htmlAsset ? readAsset(lesson.htmlAsset) : null;

    await prisma.lesson.upsert({
      where: { id: lesson.id },
      update: {
        name: lesson.name,
        order: lesson.order,
        requiredSlots: lesson.requiredSlots,
        slug: lesson.slug,
        path: lesson.path,
        published: true,
        // Màn mẫu: đồng bộ lại nội dung để sửa file trong repo là thấy ngay.
        // Sửa tay trong admin sẽ bị ghi đè khi chạy lại seed.
        ...(html === null ? {} : { html }),
      },
      create: {
        id: lesson.id,
        roomId: room.id,
        name: lesson.name,
        order: lesson.order,
        requiredSlots: lesson.requiredSlots,
        slug: lesson.slug,
        path: lesson.path,
        published: true,
        html: html ?? "",
      },
    });
  }

  return room;
}

async function main() {
  const room = await seedLabRoom();

  console.log("Đã seed phòng:", room.name, `(${room.id})`);
  console.log("Bài học thuộc phòng:", [...SEED_LESSONS, SEED_LAB_LESSON].map((l) => l.id).join(", "));
  console.log("Bài học plugin:", `${SEED_LAB_LESSON.slug} -> ${SEED_LAB_LESSON.path}`);
  console.log("Yêu cầu đồ của bài demo:", SEED_LAB_LESSON.requiredSlots.join(", "));
}

main()
  .catch((err) => {
    console.error("Seed thất bại:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
