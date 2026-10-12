// Phải require ở dòng đầu: express-async-errors vá Express để lỗi promise trong
// controller tự được chuyển tới errorHandler, không cần try/catch
require("express-async-errors");

const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const morgan = require("morgan");

const { env } = require("./config/env");
const routes = require("./routes");
const { notFoundHandler } = require("./middlewares/notFound");
const { errorHandler } = require("./middlewares/errorHandler");

function createApp() {
  const app = express();

  // Để req.ip lấy đúng IP khi chạy sau reverse proxy
  app.set("trust proxy", 1);

  app.use(helmet());
  app.use(
    cors({
      origin: function checkOrigin(origin, callback) {
        // Cho phép request không có origin (curl, proxy nội bộ, server-to-server)
        if (!origin) return callback(null, true);
        // Trong môi trường development: cho phép mọi origin (IP LAN, IP Public router, domain ngrok)
        if (!env.isProduction) return callback(null, true);
        // Trong production: kiểm tra whitelist CORS_ORIGIN
        if (env.corsOrigins.includes(origin)) return callback(null, true);
        return callback(new Error("CORS không cho phép origin này: " + origin));
      },
      credentials: true,
    }),
  );

  app.use(express.json({ limit: "25mb" }));
  app.use(express.urlencoded({ limit: "25mb", extended: true }));

  app.use(env.isProduction ? morgan("combined") : morgan("dev"));

  app.get("/", function root(req, res) {
    return res.json({
      success: true,
      message: "project30tr API",
      data: { docs: "/api", health: "/api/health" },
    });
  });

  app.use("/api", routes);

  // Thứ tự bắt buộc: 404 trước, errorHandler sau cùng
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
