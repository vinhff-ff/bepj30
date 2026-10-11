const { PrismaClient } = require("@prisma/client");
const { env } = require("./env");

// Giữ instance trên global khi dev để nodemon reload không tạo phát kết nối mới mỗi lần
const globalForPrisma = global;

function createPrismaClient() {
  return new PrismaClient({
    log: env.isProduction ? ["error"] : ["query", "warn", "error"],
  });
}

const prisma = globalForPrisma.prisma || createPrismaClient();

if (!env.isProduction) {
  globalForPrisma.prisma = prisma;
}

function disconnectPrisma() {
  return prisma.$disconnect();
}

module.exports = { prisma, disconnectPrisma };
