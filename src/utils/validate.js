const { z } = require("zod");
const { AppError } = require("./AppError");

// Gom lỗi zod thành object field -> message cho đúng kiểu details mà
// errorHandler đang trả ra, để client hiển thị được lỗi ở đúng ô nhập.
function collectIssues(error) {
  const fields = {};

  for (const issue of error.issues || []) {
    const key = issue.path.length ? issue.path.join(".") : "body";
    if (!(key in fields)) {
      fields[key] = issue.message;
    }
  }

  return fields;
}

/**
 * Validate body/query rồi trả về dữ liệu đã bóc kiểu.
 * Hợp đồng: validate = kiểm tra ở server, client gửi gì cũng phải qua đây.
 */
function parseOrThrow(schema, data) {
  const result = schema.safeParse(data);

  if (!result.success) {
    throw AppError.badRequest("Dữ liệu gửi lên không hợp lệ", {
      fields: collectIssues(result.error),
    });
  }

  return result.data;
}

module.exports = { parseOrThrow, collectIssues };
