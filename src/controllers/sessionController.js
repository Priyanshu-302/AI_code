const { v4: uuidv4 } = require("uuid");
const UnifySession = require("../models/unifySessions");
const UnifyMessage = require("../models/unifyMessage");

// Create Session + message persistence

// POST /api/unify/sessions
const createSession = async (req, res) => {
  try {
    const { organizationId, userId, entryPoint } = req.body;
    const token = req.headers.authorization?.split(" ")[1];

    if (!organizationId || !userId || !entryPoint) {
      return res.status(400).json({
        success: false,
        error: {
          code: "MISSING_FIELDS",
          message: "organizationId, userId and entryPoint are required",
        },
      });
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Bearer token is required",
        },
      });
    }

    const sessionId = `sess_${uuidv4()}`;
    const messageId = `msg_${uuidv4()}`;

    // Initial assistant message
    const initialMessage =
      "Hi! I'm Unify AI, your AI app builder. What would you like to build today?";

    // Create Session
    const session = await UnifySession.create({
      sessionId,
      organizationId,
      userId,
      idToken: token,
      status: "active",
      currentStep: "ask_goal",
      collectedData: {
        goal: null,
        appName: null,
        category: null,
        workflow: null,
        trackingEntities: [],
        painPoint: null,
      },
    });

    // Persist initial assistant message
    const message = await UnifyMessage.create({
      messageId,
      sessionId,
      role: "assistant",
      content: initialMessage,
    });

    return res.status(201).json({
      success: true,
      data: {
        sessionId: session.sessionId,
        status: session.status,
        currentStep: session.currentStep,
        messages: [
          {
            id: message.messageId,
            sessionId: message.sessionId,
            role: message.role,
            content: message.content,
            createdAt: message.createdAt,
          },
        ],
        collectedData: session.collectedData,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      error: { code: "SERVER_ERROR", message: err.message },
    });
  }
};

// GET /api/unify/sessions/:sessionId
const getSession = async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await UnifySession.findOne({ sessionId });

    if (!session) {
      return res.status(404).json({
        success: false,
        error: {
          code: "SESSION_NOT_FOUND",
          message: "No Unify session exists for the given sessionId.",
        },
      });
    }

    // Get all messages
    const messages = await UnifyMessage.find({ sessionId }).sort({
      createdAt: 1,
    });

    // Input hint based on current step
    const inputHint = getInputHint(session.currentStep);

    return res.status(200).json({
      success: true,
      data: {
        sessionId: session.sessionId,
        status: session.status,
        currentStep: session.currentStep,
        messages: messages.map((m) => ({
          id: m.messageId,
          sessionId: m.sessionId,
          role: m.role,
          content: m.content,
          createdAt: m.createdAt,
        })),
        collectedData: session.collectedData,
        inputHint,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      error: { code: "SERVER_ERROR", message: err.message },
    });
  }
};

// Input hint per step
const getInputHint = (step) => {
  switch (step) {
    case "ask_goal":
      return {
        type: "text",
        placeholder: "e.g. I want to build an attendance tracker",
      };
    case "ask_app_name":
      return { type: "text", placeholder: "e.g. Attendance Tracker" };
    case "ask_category":
      return {
        type: "single_select",
        options: [
          "CRM",
          "Project Management",
          "HR",
          "Finance",
          "Inventory",
          "Sales",
          "Marketing",
          "Support",
          "Operations",
          "Other",
        ],
      };
    case "ask_workflow":
      return {
        type: "textarea",
        placeholder:
          "Example: user submits request → manager reviews → status updated",
      };
    case "ask_tracking_entities":
      return {
        type: "text",
        placeholder: "e.g. Students, Teachers, Employees",
      };
    case "ask_pain_point":
      return {
        type: "textarea",
        placeholder:
          "e.g. We currently track attendance on paper and it's error-prone",
      };
    case "review":
      return { type: "single_select", options: ["yes", "no"] };
    default:
      return { type: "none" };
  }
};

module.exports = {
  createSession,
  getSession,
};
