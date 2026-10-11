-- AlterTable
ALTER TABLE "user_items" DROP CONSTRAINT "user_items_pkey",
ALTER COLUMN "itemId" SET DATA TYPE VARCHAR(80),
ADD CONSTRAINT "user_items_pkey" PRIMARY KEY ("userId", "itemId");
