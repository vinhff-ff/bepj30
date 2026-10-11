// Quy ước chung cho đồ trang bị. Frontend và backend cùng đọc file này để
// không lệch nhau về tên slot, vị trí gắn và cách suy ra id từ tên file.
//
// Quy tắc đặt tên: <slot>_<phần còn lại>, ví dụ "hat_circle.webp" thuộc slot
// "hat". Slot lấy từ chữ trước dấu gạch dưới đầu tiên, nên thêm đồ mới chỉ cần
// thêm ảnh và khai báo trong catalog.json, không sửa code này.

const ITEM_EXT = ".webp";

/**
 * anchor: vùng trên người mà đồ gắn vào.
 * top: vị trí vùng gắn, phần trăm chiều cao khung người.
 * offset: lệch của riêng ảnh so với vùng, tính theo phần trăm kích thước ảnh
 * nên đổi ảnh cùng tên không phải chỉnh lại.
 */
const SLOTS = {
  hat: { label: "Mũ", anchor: "HEAD", top: 6, scale: 1, offsetX: 0, offsetY: 0 },
  glasses: { label: "Kính", anchor: "HEAD", top: 20, scale: 1, offsetX: 0, offsetY: 0 },
  mask: { label: "Mặt nạ", anchor: "HEAD", top: 0, scale: 1, offsetX: 0, offsetY: 0 },
};

const SLOT_NAMES = Object.keys(SLOTS);
const ANCHORS = ["HEAD", "BODY"];

/** Suy ra slot từ tên file/slug: "hat_circle" -> "hat" */
function slotFromName(name) {
  return String(name).split("_")[0];
}

function isKnownSlot(slot) {
  return Object.prototype.hasOwnProperty.call(SLOTS, slot);
}

/** Chuẩn hoá về dạng slug dùng làm id: bỏ .webp, hạ chữ, gộm khoảng trắng */
function toItemSlug(name) {
  return String(name)
    .replace(/\.webp$/i, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
}

function itemImageName(slug) {
  return `${slug}${ITEM_EXT}`;
}

function getSlotDef(slot) {
  return isKnownSlot(slot) ? SLOTS[slot] : null;
}

module.exports = {
  ITEM_EXT,
  SLOTS,
  SLOT_NAMES,
  ANCHORS,
  slotFromName,
  isKnownSlot,
  toItemSlug,
  itemImageName,
  getSlotDef,
};
