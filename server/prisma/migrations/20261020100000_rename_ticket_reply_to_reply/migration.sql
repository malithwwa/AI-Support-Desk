-- CreateEnum
CREATE TYPE "ReplySenderType" AS ENUM ('AGENT', 'CUSTOMER');

-- AlterTable
ALTER TABLE "ticket_reply" RENAME TO "reply";

-- AlterTable
ALTER TABLE "reply" RENAME COLUMN "authorId" TO "userId";

-- AlterTable
ALTER TABLE "reply" ADD COLUMN "senderType" "ReplySenderType" NOT NULL DEFAULT 'AGENT';

-- AlterTable
ALTER TABLE "reply" ALTER COLUMN "senderType" DROP DEFAULT;

-- RenameIndex
ALTER INDEX "ticket_reply_ticketId_idx" RENAME TO "reply_ticketId_idx";

-- RenameConstraint
ALTER TABLE "reply" RENAME CONSTRAINT "ticket_reply_pkey" TO "reply_pkey";

-- RenameConstraint
ALTER TABLE "reply" RENAME CONSTRAINT "ticket_reply_ticketId_fkey" TO "reply_ticketId_fkey";

-- RenameConstraint
ALTER TABLE "reply" RENAME CONSTRAINT "ticket_reply_authorId_fkey" TO "reply_userId_fkey";
