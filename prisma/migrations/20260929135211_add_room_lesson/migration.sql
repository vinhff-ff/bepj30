-- CreateTable
CREATE TABLE "rooms" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "imageUrl" VARCHAR(500),
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lessons" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "imageUrl" VARCHAR(500),
    "html" TEXT NOT NULL DEFAULT '',
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lessons_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "rooms_order_createdAt_idx" ON "rooms"("order", "createdAt");

-- CreateIndex
CREATE INDEX "lessons_roomId_order_createdAt_idx" ON "lessons"("roomId", "order", "createdAt");

-- AddForeignKey
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
