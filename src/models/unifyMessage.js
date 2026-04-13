const mongoose = require("mongoose");

const unifyMessageSchema = new mongoose.Schema(
  {
    messageId: { type: String, required: true, unique: true },
    sessionId: { type: String, required: true },
    role: {
      type: String,
      enum: ["user", "assistant", "system"],
      required: true,
    },
    content: { type: String, required: true },
    metadata: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: true },
);

module.exports = mongoose.model("UnifyMessage", unifyMessageSchema);
