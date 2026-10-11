// Format response thống nhất cho toàn bộ API
// Thành công: { success: true, message, data, meta? }
// Thất bại:  { success: false, message, code?, details? }

function sendSuccess(res, data = null, message = "OK", statusCode = 200, meta = undefined) {
  const body = { success: true, message, data };
  if (meta) {
    body.meta = meta;
  }
  return res.status(statusCode).json(body);
}

function sendCreated(res, data, message = "Tạo thành công") {
  return sendSuccess(res, data, message, 201);
}

function sendPaginated(res, data, meta, message = "OK") {
  return res.status(200).json({ success: true, message, data, meta });
}

function sendError(res, message, code, details, statusCode) {
  const body = { success: false, message };
  if (code) {
    body.code = code;
  }
  if (details) {
    body.details = details;
  }
  return res.status(statusCode).json(body);
}

module.exports = { sendSuccess, sendCreated, sendPaginated, sendError };
