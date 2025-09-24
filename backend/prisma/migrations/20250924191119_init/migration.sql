-- CreateTable
CREATE TABLE "public"."Users" (
    "id" TEXT NOT NULL,
    "tgUserId" TEXT NOT NULL,
    "publicKey" TEXT NOT NULL,
    "privateKey" TEXT NOT NULL,

    CONSTRAINT "Users_pkey" PRIMARY KEY ("id")
);
