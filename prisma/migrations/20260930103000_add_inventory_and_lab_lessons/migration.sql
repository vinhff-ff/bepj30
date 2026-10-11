-- Mở rộng bài học cũ thành bài học dạng plugin: file HTML độc lập trong
-- public/lab-lessons/<slug>/index.html, kèm slot đồ bắt buộc. Ba cột mới cho
-- phép null nên các bài học cũ (chạy bằng html trong DB) không bị ảnh hưởng.

-- AlterTable
ALTER TABLE "lessons" ADD COLUMN     "slug" VARCHAR(120),
ADD COLUMN     "path" VARCHAR(300),
ADD COLUMN     "requiredSlots" JSONB,
ADD COLUMN     "published" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "user_items" (
    "userId" TEXT NOT NULL,
    "itemId" INTEGER NOT NULL,
    "equipped" BOOLEAN NOT NULL DEFAULT false,
    "obtainedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_items_pkey" PRIMARY KEY ("userId","itemId")
);

-- CreateTable
CREATE TABLE "lesson_results" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "result" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lesson_results_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "lessons_slug_key" ON "lessons"("slug");

-- CreateIndex
CREATE INDEX "lessons_published_slug_idx" ON "lessons"("published", "slug");

-- CreateIndex
CREATE INDEX "user_items_userId_equipped_idx" ON "user_items"("userId", "equipped");

-- CreateIndex
CREATE INDEX "lesson_results_userId_lessonId_idx" ON "lesson_results"("userId", "lessonId");

-- CreateIndex
CREATE INDEX "lesson_results_userId_lessonId_createdAt_idx" ON "lesson_results"("userId", "lessonId", "createdAt");

-- AddForeignKey
ALTER TABLE "user_items" ADD CONSTRAINT "user_items_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_results" ADD CONSTRAINT "lesson_results_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_results" ADD CONSTRAINT "lesson_results_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
