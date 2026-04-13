const mongoose = require("mongoose");

const collectedDataSchema = new mongoose.Schema(
  {
    goal: {
      type: String,
      default: null,
    },
    appName: {
      type: String,
      default: null,
    },
    category: {
      type: String,
      default: null,
    },
    workflowDescription: {
      type: String,
      default: null,
    },
    trackingEntities: {
      type: [String],
      default: null,
    },
    painPoint: {
      type: String,
      default: null,
    },
  },
  {
    _id: false,
  },
);

const unifySessionSchema = new mongoose.Schema(
  {
    sessionId: {
      type: String,
      required: true,
      unique: true,
    },
    organizationId: {
      type: String,
      required: true,
    },
    userId: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: [
        "active",
        "draft_ready",
        "generating",
        "completed",
        "cancelled",
        "failed",
      ],
      default: "active",
    },
    currentStep: {
      type: String,
      enum: [
        "ask_goal",
        "ask_app_name",
        "ask_category",
        "ask_workflow",
        "ask_tracking_entities",
        "ask_pain_point",
        "review",
        "generating",
        "done",
      ],
      default: "ask_goal",
    },
    collectedData: {
      type: collectedDataSchema,
      default: () => ({}),
    },
    draftSpec: {
      type: String,
      default: null,
    },
    generateAppId: {
      type: String,
      default: null,
    },
    idToken: {
      type: String,
      required: true,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("UnifySession", unifySessionSchema);
