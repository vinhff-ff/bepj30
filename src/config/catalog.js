// Danh mục đồ: nguồn sự thật duy nhất cho cả frontend và backend.
//
// Mỗi món là 1 khóa trong public/items/catalog.json, khóa chính là slug của
// file ảnh cùng tên trong public/items/<slug>.webp. Slot KHÔNG khai báo tay mà
// suy ra từ chữ trước dấu gạch dưới đầu tiên: "hat_circle" -> slot "hat".
// Vì vậy thêm đồ mới chỉ cần thả ảnh + thêm 1 dòng JSON, không sửa code.
//
// DB chỉ giữ itemId dạng chuỗi (slug), không lưu ảnh hay metadata của đồ.

const fs = require("fs");
const path = require("path");
const { z } = require("zod");

const { env } = require("./env");
const {
  SLOT_NAMES,
  slotFromName,
  isKnownSlot,
  toItemSlug,
  itemImageName,
  getSlotDef,
} = require("./itemSlots");

// scale/offsetX/offsetY là ghi đè tùy chọn cho từng món, chủ yếu để chỉnh ảnh
// lệch so với mặc định của slot. Khối theo phần trăm kích thước ảnh.
const itemSchema = z.object({
  name: z.string().min(1).max(100),
  scale: z.number().positive().max(4).optional(),
  offsetX: z.number().min(-100).max(100).optional(),
  offsetY: z.number().min(-100).max(100).optional(),
  // id của bài học mở khoá món đồ này (có thể để rỗng nếu nhận từ cửa hàng)
  unlockedBy: z.string().optional().default(""),
  ext: z.string().optional(),
});

const catalogSchema = z.record(z.string(), itemSchema);

// Cache ở module level: đọc + parse 1 lần, sau đó chỉ đọc lại khi file đổi
let cache = null;

function readCatalogFile() {
  const file = env.labCatalogPath;
  const raw = fs.readFileSync(file, "utf8");
  let parsed;

  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error(`catalog.json không phải JSON hợp lệ (${file}): ${err.message}`);
  }

  const result = catalogSchema.safeParse(parsed);

  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new Error(`catalog.json sai cấu trúc (${file}): ${issues}`);
  }

  const entries = Object.entries(result.data).map(([key, meta]) => {
    const id = toItemSlug(key);

    if (id !== key) {
      throw new Error(
        `catalog.json có khoá "${key}" không đúng dạng slug (chữ thường, không .webp). Hãy dùng "${id}"`,
      );
    }

    const slot = slotFromName(id);

    if (!isKnownSlot(slot)) {
      throw new Error(
        `catalog.json: món "${id}" có tiền tố "${slot}" chưa biết. Cho phép: ${SLOT_NAMES.join(", ")}`,
      );
    }

    const def = getSlotDef(slot);

    return [
      id,
      {
        id,
        name: meta.name,
        slot,
        anchor: def.anchor,
        top: def.top,
        scale: meta.scale ?? def.scale,
        offsetX: meta.offsetX ?? def.offsetX,
        offsetY: meta.offsetY ?? def.offsetY,
        image: meta.ext ? `${id}.${meta.ext}` : itemImageName(id),
        unlockedBy: meta.unlockedBy || "",
      },
    ];
  });

  return new Map(entries);
}

function getCatalog() {
  const file = env.labCatalogPath;

  if (cache && cache.file === file) {
    try {
      const stat = fs.statSync(file);
      if (stat.mtimeMs === cache.mtimeMs) {
        return cache.items;
      }
    } catch {
      // File biến mất giữa chừng: đọc lại để báo lỗi rõ ràng bên dưới
    }
  }

  const items = readCatalogFile();
  cache = { file, mtimeMs: fs.statSync(file).mtimeMs, items };
  return items;
}

function getAllItems() {
  return Array.from(getCatalog().values()).sort((a, b) => a.id.localeCompare(b.id));
}

function getItemMeta(itemId) {
  return getCatalog().get(toItemSlug(itemId)) || null;
}

/** Món đã sở hữu theo slot từ id, bỏ qua id không còn trong catalog */
function getSlotItems(items) {
  const bySlot = {};

  for (const slot of SLOT_NAMES) {
    bySlot[slot] = [];
  }

  for (const item of items) {
    const meta = getItemMeta(item.id);
    if (meta) {
      bySlot[meta.slot].push(meta);
    }
  }

  return bySlot;
}

function getItemIdsBySlot(slot) {
  return getAllItems()
    .filter((item) => item.slot === slot)
    .map((item) => item.id);
}

/** Các món đồ mà bài học levelId mở khoá khi người chơi hoàn thành */
function getRewardItemIdsForLevel(levelId) {
  return getAllItems()
    .filter((item) => item.unlockedBy === String(levelId))
    .map((item) => item.id);
}

/** Đường dẫn ảnh, suy ra từ slug: "hat_circle" -> "/items/hat_circle.webp" */
function getItemImagePath(itemId) {
  return `/items/${itemImageName(toItemSlug(itemId))}`;
}

/** File ảnh có thật trong thư mục public/items hay không */
function getMissingItemImageFiles() {
  const dir = path.dirname(env.labCatalogPath);

  return getAllItems()
    .map((item) => path.join(dir, item.image))
    .filter((file) => !fs.existsSync(file));
}

// Chỉ dùng cho test, không dùng trong request
function clearCatalogCache() {
  cache = null;
}

module.exports = {
  SLOT_NAMES,
  getCatalog,
  getAllItems,
  getItemMeta,
  getItemIdsBySlot,
  getSlotItems,
  getRewardItemIdsForLevel,
  getItemImagePath,
  getMissingItemImageFiles,
  clearCatalogCache,
  catalogPath: () => env.labCatalogPath,
};
