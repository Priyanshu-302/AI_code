const { v4: uuidv4 } = require("uuid");
const UnifySession = require("../models/unifySessions");
const UnifyMessage = require("../models/unifyMessage");
const {
  isReadyToGenerateDraft,
  getAssistantMessage,
  getInputHint,
  fillCollectedData,
  getNextUnansweredStep,
} = require("../services/stateMachine");
const {
  generateDraftSpec,
  validateDraft,
} = require("../services/generateDraftService");

// POST /api/unify/sessions/:sessionId/messages
const sendMessage = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { message, clientMessageId } = req.body;
    const token = req.headers.authorization?.split(" ")[1];

    if (!message) {
      return res.status(400).json({
        success: false,
        error: {
          code: "MISSING_FIELDS",
          message: "message is required",
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

    if (session.status !== "active") {
      return res.status(400).json({
        success: false,
        error: {
          code: "SESSION_NOT_ACTIVE",
          message: `Session is in '${session.status}' state and cannot accept messages.`,
        },
      });
    }

    if (clientMessageId) {
      const existing = await UnifyMessage.findOne({
        metadata: { clientMessageId },
      });
      if (existing) {
        return res.status(200).json({
          success: true,
          data: { message: "Duplicate message ignored" },
        });
      }
    }

    const currentStep = session.currentStep;

    if (token !== session.idToken) {
      session.idToken = token;
    }

    // Step 1 - Update collectedData based on current step
    const currentData = session.collectedData.toObject();

    const updatedData = fillCollectedData(message, currentData);

    session.collectedData.goal = updatedData.goal;
    session.collectedData.appName = updatedData.appName;
    session.collectedData.category = updatedData.category;
    session.collectedData.workflowDescription = updatedData.workflowDescription;
    session.collectedData.trackingEntities = updatedData.trackingEntities;
    session.markModified("collectedData");

    // Step 2 - Get next step
    const nextStep = getNextUnansweredStep(updatedData);
    session.currentStep = nextStep;

    // Step 3 - Save user message
    const userMessageId = clientMessageId || `msg_${uuidv4()}`;
    const userMessage = await UnifyMessage.create({
      messageId: userMessageId,
      sessionId,
      role: "user",
      content: message,
      metadata: clientMessageId ? { clientMessageId } : null,
    });

    // Step 4 - Check if ready to generate draft
    const readyToGenerateDraft = isReadyToGenerateDraft(updatedData);

    let draft = null;

    if (readyToGenerateDraft) {
      console.log("All data collected. Auto-generating draft...");

      draft = await generateDraftSpec(updatedData);
      draft = await validateDraft(draft);

      session.draftSpec = JSON.stringify(draft);
      session.status = "draft_ready";
      session.currentStep = "review";
    }

    // Step 5 - Generate the assistant response
    const assistantContent = getAssistantMessage(nextStep);
    const assistantMessage = await UnifyMessage.create({
      messageId: `msg_${uuidv4()}`,
      sessionId,
      role: "assistant",
      content: assistantContent,
    });

    // Step 6 - Save session using findOneAndUpdate
    const updatePayload = {
      currentStep: readyToGenerateDraft ? "review" : nextStep,
      status: readyToGenerateDraft ? "draft_ready" : session.status,
      idToken: token,
      "collectedData.goal": updatedData.goal,
      "collectedData.appName": updatedData.appName,
      "collectedData.category": updatedData.category,
      "collectedData.workflowDescription": updatedData.workflowDescription,
      "collectedData.trackingEntities": updatedData.trackingEntities
    };

    // Only add draftSpec if draft was generated
    if (draft) {
      updatePayload.draftSpec = JSON.stringify(draft);
    }

    const updatedSession = await UnifySession.findOneAndUpdate(
      { sessionId },
      { $set: updatePayload },
      { new: true },
    );

    // Step 7 - Input hint for next step
    const inputHint = getInputHint(readyToGenerateDraft ? "review" : nextStep);

    return res.status(200).json({
      success: true,
      data: {
        sessionId,
        status: session.status,
        currentStep: readyToGenerateDraft ? "review" : nextStep,
        userMessage: {
          id: userMessage.messageId,
          sessionId: userMessage.sessionId,
          role: userMessage.role,
          content: userMessage.content,
          createdAt: userMessage.createdAt,
        },
        assistantMessage: {
          id: assistantMessage.messageId,
          sessionId: assistantMessage.sessionId,
          role: assistantMessage.role,
          content: assistantMessage.content,
          createdAt: assistantMessage.createdAt,
        },
        collectedData: updatedData,
        inputHint,
        isReadyToGenerateDraft: readyToGenerateDraft,
        draft: draft || null,
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

module.exports = { sendMessage };
