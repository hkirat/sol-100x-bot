-- CreateTable
CREATE TABLE "public"."TransactionHistory" (
    "tId" TEXT NOT NULL,
    "tgUserId" TEXT NOT NULL,
    "timeStamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "transType" TEXT NOT NULL,
    "inputTokenMint" TEXT NOT NULL,
    "outputTokenMint" TEXT NOT NULL,
    "inputAmount" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL,
    "explorerLink" TEXT NOT NULL,
    "outputAmount" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "TransactionHistory_pkey" PRIMARY KEY ("tId")
);
