import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import { softDeletePlugin, type SoftDeleteStatics } from "@/lib/soft-delete";
import { MESSAGE_STATUS_KEYS } from "@/lib/messages/statuses";

/**
 * Contact message (008-contact-messages) — data-model.md "Message →
 * `messages`". Append-only: one document per submission, no unique
 * index on purpose (a person can write in more than once) — see
 * research §1 and ADR-0001's "Boundary" for why this does NOT follow
 * signup's upsert-by-email rule.
 */
const messageSchema = new Schema(
  {
    name: { type: String, required: true, maxlength: 100 },
    email: { type: String, required: true, maxlength: 254 },
    phone: { type: String, default: null },
    subject: { type: String, required: true, maxlength: 150 },
    body: { type: String, required: true, maxlength: 5000 },
    status: { type: String, enum: MESSAGE_STATUS_KEYS, default: "new", required: true },
    statusChangedAt: { type: Date, default: null },
  },
  { timestamps: true, collection: "messages" },
);

messageSchema.plugin(softDeletePlugin);

messageSchema.index({ createdAt: -1 });
messageSchema.index({ status: 1, createdAt: -1 });

export type MessageDoc = InferSchemaType<typeof messageSchema> & {
  _id: mongoose.Types.ObjectId;
};

type MessageModel = Model<MessageDoc> & SoftDeleteStatics<MessageDoc>;

export const Message: MessageModel =
  (mongoose.models.Message as MessageModel | undefined) ??
  (mongoose.model<MessageDoc>("Message", messageSchema) as MessageModel);
