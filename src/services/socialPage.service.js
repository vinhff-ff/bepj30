const crypto = require("crypto");
const { prisma } = require("../config/db");
const { AppError } = require("../utils/AppError");

const SOCIAL_PAGE_ID = "fanpage";
const SOCIAL_PLATFORMS = [
  "facebook",
  "tiktok",
  "youtube",
  "instagram",
  "zalo",
  "telegram",
  "discord",
];

const DEFAULT_SOCIAL_PROFILE = {
  name: "STEM Game Center",
  tagline:
    "Theo dõi kênh chính thức để nhận tin tức, sự kiện, hướng dẫn chơi và quà tặng mới nhất.",
  logoSrc: "/images/logo.png",
  logoAlt: "STEM Game Center",
  about:
    "STEM Game Center là sân chơi học qua trò chơi dành cho học sinh cấp 2. Các kênh bên dưới là nơi cập nhật lịch sự kiện, mẹo vượt màn chơi và quà tặng cộng đồng.",
  contactEmail: "hotro@steamgame.vn",
};

const DEFAULT_SOCIAL_STATS = [
  { id: "followers", label: "Tổng lượt theo dõi", value: "Đang cập nhật" },
  { id: "channels", label: "Kênh chính thức", value: "01" },
  { id: "founded", label: "Năm thành lập", value: "2026" },
];

const DEFAULT_SOCIAL_CHANNELS = [
  {
    id: "facebook",
    platform: "facebook",
    name: "Facebook",
    url: "https://www.facebook.com/profile.php?id=61595040895107",
    description: "Fanpage Hỗ trợ chính thức: tin tức, sự kiện và giải đáp cho người chơi.",
    followers: "Đang cập nhật",
    actionLabel: "Theo dõi",
    color: "#1877f2",
    featured: true,
    enabled: true,
  },
];

function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function cleanString(value, { field, min = 1, max = 500, required = true } = {}) {
  if (value === undefined || value === null) {
    if (required) {
      throw AppError.badRequest(`Thiếu trường ${field}`, { field });
    }
    return "";
  }
  if (typeof value !== "string") {
    throw AppError.badRequest(`Trường ${field} phải là chuỗi`, { field });
  }
  const trimmed = value.trim();
  if (required && trimmed.length < min) {
    throw AppError.badRequest(`Trường ${field} phải có ít nhất ${min} ký tự`, { field });
  }
  if (trimmed.length > max) {
    throw AppError.badRequest(`Trường ${field} không được vượt quá ${max} ký tự`, { field });
  }
  return trimmed;
}

function cleanUrl(value, { field, allowEmpty = false } = {}) {
  const trimmed = cleanString(value, { field, min: 0, max: 500, required: !allowEmpty });
  if (!trimmed) {
    return "";
  }
  let parsed;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw AppError.badRequest(`Trường ${field} phải là link http(s) hợp lệ`, { field });
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw AppError.badRequest(`Trường ${field} phải là link http(s) hợp lệ`, { field });
  }
  return trimmed;
}

function cleanColor(value) {
  const trimmed = cleanString(value, { field: "color", min: 7, max: 7 });
  if (!/^#[0-9a-fA-F]{6}$/.test(trimmed)) {
    throw AppError.badRequest("Màu kênh phải có dạng #rrggbb", { field: "color" });
  }
  return trimmed.toLowerCase();
}

function cleanEmail(value) {
  const trimmed = cleanString(value, { field: "contactEmail", min: 5, max: 254 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    throw AppError.badRequest("Email liên hệ không hợp lệ", { field: "contactEmail" });
  }
  return trimmed;
}

function cleanChannelId(value, platform) {
  const candidate = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  if (candidate) {
    return candidate;
  }
  return `${platform}-${crypto.randomBytes(4).toString("hex")}`;
}

function normalizeProfile(rawProfile = {}) {
  if (!isPlainObject(rawProfile)) {
    throw AppError.badRequest("Hồ sơ Fanpage phải là một object", { field: "profile" });
  }
  const name = cleanString(rawProfile.name, { field: "name", min: 2, max: 120 });
  const tagline = cleanString(rawProfile.tagline, { field: "tagline", min: 5, max: 180 });
  const logoSrc = cleanString(rawProfile.logoSrc, { field: "logoSrc", min: 1, max: 2000 });
  const logoAlt = cleanString(rawProfile.logoAlt ?? name, { field: "logoAlt", min: 1, max: 120 });
  const about = cleanString(rawProfile.about, { field: "about", min: 10, max: 1000 });
  const contactEmail = cleanEmail(rawProfile.contactEmail);
  return { name, tagline, logoSrc, logoAlt, about, contactEmail };
}

function normalizeStats(rawStats = []) {
  if (!Array.isArray(rawStats)) {
    throw AppError.badRequest("Số liệu Fanpage phải là một mảng", { field: "stats" });
  }
  if (rawStats.length < 1 || rawStats.length > 5) {
    throw AppError.badRequest("Số liệu Fanpage phải gồm từ 1 đến 5 mục", { field: "stats" });
  }
  return rawStats.map((stat, index) => {
    if (!isPlainObject(stat)) {
      throw AppError.badRequest(`Số liệu thứ ${index + 1} không hợp lệ`, { field: `stats[${index}]` });
    }
    return {
      id: cleanChannelId(stat.id || `stat-${index + 1}`, "stat"),
      label: cleanString(stat.label, { field: `stats[${index}].label`, min: 1, max: 80 }),
      value: cleanString(stat.value, { field: `stats[${index}].value`, min: 1, max: 80 }),
    };
  });
}

function normalizeChannels(rawChannels = []) {
  if (!Array.isArray(rawChannels)) {
    throw AppError.badRequest("Danh sách kênh phải là một mảng", { field: "channels" });
  }
  if (rawChannels.length > 20) {
    throw AppError.badRequest("Danh sách kênh không được vượt quá 20 kênh", { field: "channels" });
  }

  const normalized = rawChannels.map((channel, index) => {
    if (!isPlainObject(channel)) {
      throw AppError.badRequest(`Kênh thứ ${index + 1} không hợp lệ`, { field: `channels[${index}]` });
    }
    if (!SOCIAL_PLATFORMS.includes(channel.platform)) {
      throw AppError.badRequest(`Kênh thứ ${index + 1} dùng nền tảng không được hỗ trợ`, {
        field: `channels[${index}].platform`,
      });
    }

    const url = cleanUrl(channel.url, { field: `channels[${index}].url`, allowEmpty: true });
    const enabled = url ? Boolean(channel.enabled ?? true) : false;
    return {
      id: cleanChannelId(channel.id, channel.platform),
      platform: channel.platform,
      name: cleanString(channel.name, { field: `channels[${index}].name`, min: 1, max: 80 }),
      url,
      description: cleanString(channel.description, {
        field: `channels[${index}].description`,
        min: 1,
        max: 240,
      }),
      followers: cleanString(channel.followers, {
        field: `channels[${index}].followers`,
        min: 1,
        max: 80,
      }),
      actionLabel: cleanString(channel.actionLabel, {
        field: `channels[${index}].actionLabel`,
        min: 1,
        max: 40,
      }),
      color: cleanColor(channel.color),
      featured: Boolean(channel.featured),
      enabled,
    };
  });

  const published = normalized.filter((channel) => channel.enabled && channel.url);
  const featuredIndex = published.findIndex((channel) => channel.featured);
  const activeFeaturedId =
    featuredIndex >= 0 ? published[featuredIndex].id : published[0]?.id;

  return normalized.map((channel) => ({
    ...channel,
    featured: Boolean(activeFeaturedId && channel.id === activeFeaturedId),
  }));
}

function toPublicConfig(config) {
  const channels = Array.isArray(config.channels) ? config.channels : [];
  const published = channels.filter((channel) => channel?.enabled && channel?.url);
  return {
    profile: config.profile,
    stats: Array.isArray(config.stats) ? config.stats : [],
    channels: published,
  };
}

async function ensureSocialPageConfig() {
  const existing = await prisma.socialPageConfig.findUnique({ where: { id: SOCIAL_PAGE_ID } });
  if (existing) {
    return existing;
  }
  return prisma.socialPageConfig.create({
    data: {
      id: SOCIAL_PAGE_ID,
      profile: DEFAULT_SOCIAL_PROFILE,
      stats: DEFAULT_SOCIAL_STATS,
      channels: DEFAULT_SOCIAL_CHANNELS,
    },
  });
}

async function getPublicSocialPage() {
  const config = await ensureSocialPageConfig();
  return toPublicConfig(config);
}

async function getAdminSocialPage() {
  const config = await ensureSocialPageConfig();
  return {
    profile: config.profile,
    stats: Array.isArray(config.stats) ? config.stats : [],
    channels: Array.isArray(config.channels) ? config.channels : [],
    updatedAt: config.updatedAt,
  };
}

async function updateSocialPage(payload = {}) {
  if (!isPlainObject(payload)) {
    throw AppError.badRequest("Dữ liệu Fanpage không hợp lệ", { field: "socialPage" });
  }
  const profile = normalizeProfile(payload.profile);
  const stats = normalizeStats(payload.stats);
  const channels = normalizeChannels(payload.channels);
  const updated = await prisma.socialPageConfig.upsert({
    where: { id: SOCIAL_PAGE_ID },
    create: { id: SOCIAL_PAGE_ID, profile, stats, channels },
    update: { profile, stats, channels },
  });
  return {
    profile: updated.profile,
    stats: updated.stats,
    channels: updated.channels,
    updatedAt: updated.updatedAt,
  };
}

module.exports = {
  SOCIAL_PLATFORMS,
  getPublicSocialPage,
  getAdminSocialPage,
  updateSocialPage,
};
