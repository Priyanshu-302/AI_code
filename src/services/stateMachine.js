// Step order
const STEP_ORDER = [
  "ask_goal",
  "ask_app_name",
  "ask_category",
  "ask_workflow",
  "ask_tracking_entities",
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
  review: {
    type: "single_select",
    options: ["yes", "no"],
  },
};

const CATEGORY_KEYWORDS = [
  "category is",
  "category:",
  "category -",
  "category",
];
const WORKFLOW_KEYWORDS = [
  "workflow is",
  "workflow:",
  "workflow -",
  "workflow",
  "flow:",
];
const TRACKING_KEYWORDS = [
  "tracking entities are",
  "tracking entities:",
  "entities are",
  "entities:",
  "track:",
  "tracking:",
  "track -",
  "entities -",
];

const ALL_KEYWORDS = [
  ...CATEGORY_KEYWORDS,
  ...WORKFLOW_KEYWORDS,
  ...TRACKING_KEYWORDS,
];

// Extract value after a keyword, stopping at the next keyword
const extractKeyword = (text, startKeywords, stopKeywords) => {
  const lower = text.toLowerCase();
  let start = -1;

  for (const kw of startKeywords) {
    const idx = lower.indexOf(kw);
    if (idx !== -1) {
      start = idx + kw.length;
      break;
    }
  }

  if (start === -1) return null;

  let end = text.length;
  for (const kw of stopKeywords) {
    const idx = lower.indexOf(kw, start);
    if (idx !== -1 && idx < end) {
      end = idx;
    }
  }

  return text
    .slice(start, end)
    .replace(/,?\s*(the\s+)?$/i, "")
    .trim();
};

// Fill data as much as you can
const fillCollectedData = (message, collectedData) => {
  const updated = { ...collectedData };

  // Check if the message contains any field keywords
  const lower = message.toLowerCase();
  const hasKeyword = [
    "category",
    "workflow",
    "flow",
    "track",
    "entit",
  ].some((kw) => lower.includes(kw));

  // If no keywords — split by comma for simple multi-answer like "Attendance Tracker, HR"
  const parts = hasKeyword
    ? [message]
    : message
        .split(",")
        .map((p) => p.trim())
        .filter(Boolean);

  for (const part of parts) {
    // Try to fill goal
    if (!updated.goal) {
      updated.goal = part;
      if (!updated.appName) updated.appName = extractAppName(part);
      continue;
    }

    // Try to fill appName
    if (!updated.appName) {
      updated.appName = part;
      continue;
    }

    // Try to fill category
    if (!updated.category) {
      const fromKeyword = extractKeyword(part, CATEGORY_KEYWORDS, [
        ...WORKFLOW_KEYWORDS,
        ...TRACKING_KEYWORDS,
      ]);
      updated.category = (fromKeyword || part).trim();
    }

    // Try to fill workflowDescription
    if (!updated.workflowDescription) {
      const fromKeyword = extractKeyword(part, WORKFLOW_KEYWORDS, [
        ...TRACKING_KEYWORDS,
      ]);
      if (fromKeyword) {
        updated.workflowDescription = fromKeyword.trim();
      } else if (!hasKeyword) {
        updated.workflowDescription = part.trim();
      }
    }

    // Try to fill trackingEntities
    if (!updated.trackingEntities || updated.trackingEntities.length === 0) {
      const fromKeyword = extractKeyword(
        part,
        TRACKING_KEYWORDS,
        []
      );
      if (fromKeyword) {
        updated.trackingEntities = fromKeyword
          .split(/,|\band\b/i)
          .map((e) => e.trim())
          .filter(Boolean);
      } else if (!hasKeyword) {
        updated.trackingEntities = part
          .split(/,|\band\b/i)
          .map((e) => e.trim())
          .filter(Boolean);
      }
    } else {
      // No keyword mode — each comma-split part fills the next empty field in order
      if (!updated.category) {
        updated.category = part;
        continue;
      }
      if (!updated.workflowDescription) {
        updated.workflowDescription = part;
        continue;
      }
      if (!updated.trackingEntities || updated.trackingEntities.length === 0) {
        updated.trackingEntities = part
          .split(/,|\band\b/i)
          .map((e) => e.trim())
          .filter(Boolean);
        continue;
      }
    }
  }

  return updated;
};

// Get next unanswered step
const getNextUnansweredStep = (collectedData) => {
  if (!collectedData.goal) return "ask_goal";
  if (!collectedData.appName) return "ask_app_name";
  if (!collectedData.category) return "ask_category";
  if (!collectedData.workflowDescription) return "ask_workflow";
  if (
    !collectedData.trackingEntities ||
    collectedData.trackingEntities.length === 0
  )
    return "ask_tracking_entities";
  return "review";
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
    workflowDescription: collectedData.workflowDescription || null,
    trackingEntities: collectedData.trackingEntities || [],
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
    collectedData.trackingEntities.length > 0
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
  fillCollectedData,
  getNextUnansweredStep,
  updateCollectedData,
  isReadyToGenerateDraft,
  getAssistantMessage,
  getInputHint,
};
