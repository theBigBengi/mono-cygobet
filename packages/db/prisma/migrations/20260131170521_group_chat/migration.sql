-- CreateEnum
CREATE TYPE "group_message_type" AS ENUM ('user_message', 'system_event');

-- CreateTable
CREATE TABLE "group_messages" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "group_id" INTEGER NOT NULL,
    "sender_id" INTEGER,
    "type" "group_message_type" NOT NULL DEFAULT 'user_message',
    "body" TEXT NOT NULL,
    "meta" JSONB,

    CONSTRAINT "group_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "group_message_reads" (
    "id" SERIAL NOT NULL,
    "group_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "last_read_message_id" INTEGER NOT NULL,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "group_message_reads_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "group_messages_group_id_id_idx" ON "group_messages"("group_id", "id" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "group_message_reads_group_id_user_id_key" ON "group_message_reads"("group_id", "user_id");

-- AddForeignKey
ALTER TABLE "group_messages" ADD CONSTRAINT "group_messages_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_messages" ADD CONSTRAINT "group_messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_message_reads" ADD CONSTRAINT "group_message_reads_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_message_reads" ADD CONSTRAINT "group_message_reads_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
