// Step order
const STEP_ORDER = [
  "ask_goal",
  "ask_app_name",
  "ask_category",
  "ask_workflow",
  "ask_tracking_entities",
  "ask_pain_point",
  "review",
  "generating",
  "done",
];

// What question bot asks at each step
const STEP_MESSAGES = {
  ask_goal:
    "Hi! I'm Unify, your AI app builder. What would you like to build today?",
  ask_app_name: "Great idea! What would you like to name your app?",
  ask_category: "Which category best fits your app?",
  ask_workflow: "Describe the step-by-step workflow your app should support.",
  ask_tracking_entities:
    "What are the main things your app will track? (e.g. Students, Employees, Orders)",
  ask_pain_point: "What problem or pain point is this app solving for you?",
  review:
    "Thanks! I have everything I need. Type 'yes' to generate a draft or 'no' to cancel.",
};

// Input hint per step
const STEP_INPUT_HINTS = {
  ask_goal: {
    type: "text",
    placeholder: "e.g. I want to build an attendance tracker",
  },
  ask_app_name: {
    type: "text",
    placeholder: "e.g. Attendance Tracker",
  },
  ask_category: {
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
    allowCustom: true,
  },
  ask_workflow: {
    type: "textarea",
    placeholder:
      "Example: user submits request → manager reviews → status updated",
  },
  ask_tracking_entities: {
    type: "text",
    placeholder: "e.g. Students, Teachers, Employees",
  },
  ask_pain_point: {
    type: "textarea",
    placeholder:
      "e.g. We currently track attendance on paper and it's error-prone",
  },
  review: {
    type: "single_select",
    options: ["yes", "no"],
  },
};

// Get the next step
const getNextStep = (currentStep) => {
  const currentIndex = STEP_ORDER.indexOf(currentStep);
  if (currentIndex === -1 || currentIndex === STEP_ORDER.length - 1)
    return null;
  return STEP_ORDER[currentIndex + 1];
};

// Update collectedData based on current step and user message
const updateCollectedData = (currentStep, message, collectedData) => {
  const updated = {
    goal: collectedData.goal || null,
    appName: collectedData.appName || null,
    category: collectedData.category || null,
    workflowDescription:
      collectedData.workflowDescription || null,
    trackingEntities: collectedData.trackingEntities || [],
    painPoint: collectedData.painPoint || null,
  };

  switch (currentStep) {
    case "ask_goal":
      updated.goal = message;
      if (!updated.appName) {
        updated.appName = extractAppName(message);
      }
      break;
    case "ask_app_name":
      updated.appName = message;
      break;
    case "ask_category":
      updated.category = message;
      break;
    case "ask_workflow":
      updated.workflowDescription = message; // ← always use workflowDescription
      break;
    case "ask_tracking_entities":
      updated.trackingEntities = message
        .split(",")
        .map((e) => e.trim())
        .filter(Boolean);
      break;
    case "ask_pain_point":
      updated.painPoint = message;
      break;
  }

  return updated;
};

// Extract the app_name from the app_goal
const extractAppName = (goal) => {
  const lower = goal.toLowerCase();
  const keywords = ["build", "create", "make", "develop", "design"];

  for (const keyword of keywords) {
    const index = lower.indexOf(keyword);
    if (index !== -1) {
      const after = goal.slice(index + keyword.length).trim();
      // Capitalize each word
      return after
        .replace(/^(an?|the)\s+/i, "")
        .split(" ")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
    }
  }

  return null;
};

// Check if all data is collected and ready for draft
const isReadyToGenerateDraft = (collectedData) => {
  return (
    !!collectedData.goal &&
    !!collectedData.appName &&
    !!collectedData.category &&
    !!collectedData.workflowDescription &&
    collectedData.trackingEntities.length > 0 &&
    !!collectedData.painPoint
  );
};

// Get assistant message for next step
const getAssistantMessage = (nextStep) => {
  return STEP_MESSAGES[nextStep] || "Let's continue building your app.";
};

// Get input hint for next step
const getInputHint = (step) => {
  return STEP_INPUT_HINTS[step] || { type: "none" };
};

module.exports = {
  getNextStep,
  updateCollectedData,
  isReadyToGenerateDraft,
  getAssistantMessage,
  getInputHint,
};
