const { env, validateEnv } = require("./config/env");
const { createApp } = require("./app");
const { prisma, disconnectPrisma } = require("./config/db");

async function bootstrap() {
  validateEnv();
  await prisma.$connect();

  const app = createApp();
  const server = app.listen(env.port, function onListening() {
    console.log("[server] API sẵn sàng tại http://localhost:" + env.port + "/api");
  });

  // Đóng kết nối DB sạch trước khi thoát
  async function shutdown(signal) {
    console.log("\n[server] Nhận " + signal + ", đang tắt...");
    server.close(async function onClosed() {
      await disconnectPrisma();
      process.exit(0);
    });

    // Ép buộc thoát nếu treo quá 10 giây
    setTimeout(function forceExit() {
      process.exit(1);
    }, 10000).unref();
  }

  process.on("SIGINT", function onSigint() {
    shutdown("SIGINT");
  });
  process.on("SIGTERM", function onSigterm() {
    shutdown("SIGTERM");
  });
  process.on("unhandledRejection", function onUnhandledRejection(reason) {
    console.error("[server] Promise bị từ chối mà không xử lý:", reason);
  });
}

bootstrap().catch(function onBootFailed(err) {
  console.error("[server] Không khởi động được:", err.message);
  process.exit(1);
});
