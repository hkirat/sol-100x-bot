/*
  Warnings:

  - A unique constraint covering the columns `[tgUserId]` on the table `Users` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Users_tgUserId_key" ON "public"."Users"("tgUserId");

-- AddForeignKey
ALTER TABLE "public"."TransactionHistory" ADD CONSTRAINT "TransactionHistory_tgUserId_fkey" FOREIGN KEY ("tgUserId") REFERENCES "public"."Users"("tgUserId") ON DELETE RESTRICT ON UPDATE CASCADE;
