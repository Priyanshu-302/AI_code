const model = require("../config/gemini");

const generateDraftSpec = async (collectedData) => {
  const prompt = `
You are an AI app builder. Based on the following collected data, generate a draft app specification.

Collected Data:
- Goal: ${collectedData.goal}
- App Name: ${collectedData.appName}
- Category: ${collectedData.category}
- Workflow: ${collectedData.workflowDescription}
- Tracking Entities: ${collectedData.trackingEntities.join(", ")}
- Pain Point: ${collectedData.painPoint}

Generate a draft app specification in the following JSON format ONLY. No extra text, no markdown, no backticks:
{
  "appName": "string",
  "category": "string",
  "summary": "string",
  "forms": [
    {
      "name": "string",
      "key": "string",
      "description": "string",
      "fields": [
        {
          "name": "string",
          "key": "string",
          "type": "text | textarea | number | phone | email | date | datetime | singleSelect | multiSelect | boolean | link",
          "required": true | false,
          "options": ["option1", "option2"],
          "linkedFormKey": "string (only for link type)"
        }
      ]
    }
  ],
  "warnings": []
}

Rules:
- key must be snake_case
- options array only for singleSelect and multiSelect types
- linkedFormKey only for link type fields
- warnings array should contain any issues or suggestions
- Generate at least 2 forms based on the tracking entities
- Each form must have at least 3 fields
`;

  const result = await model.generateContent(prompt);
  const reply = result.response.text();

  const cleaned = reply
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .trim();

  const parsed = JSON.parse(cleaned);
  
  return parsed;
};

const validateDraft = async (draft) => {
  const warnings = [];

  const SUPPORTED_TYPES = [
    "text",
    "textarea",
    "number",
    "phone",
    "email",
    "date",
    "datetime",
    "singleSelect",
    "multiSelect",
    "boolean",
    "link",
  ];

  const MAX_FORMS = 10;
  const MAX_FIELDS_PER_FORM = 20;

  // Check the limit
  if (draft.forms.length > MAX_FORMS) {
    warnings.push(`Too many forms. Maximum allowed is ${MAX_FORMS}.`);
    draft.forms = draft.forms.slice(0, MAX_FORMS);
  }

  draft.forms = draft.forms.map((form) => {
    // Check field limit
    if (form.fields.length > MAX_FIELDS_PER_FORM) {
      warnings.push(
        `Form "${form.name}" has too many fields. Maximum allowed is ${MAX_FIELDS_PER_FORM}.`,
      );
      form.fields = form.fields.slice(0, MAX_FIELDS_PER_FORM);
    }

    form.fields = form.fields.map((field) => {
      // Check field type
      if (!SUPPORTED_TYPES.includes(field.type)) {
        warnings.push(
          `Field "${field.name}" in form "${form.name}" has unsupported type "${field.type}". Defaulting to "text".`,
        );
        field.type = "text";
      }

      // Check options only for singleSelect and multiSelect
      if (
        ["singleSelect", "multiSelect"].includes(field.type) &&
        (!field.options || field.options.length === 0)
      ) {
        warnings.push(
          `Field "${field.name}" in form "${form.name}" is type "${field.type}" but has no options.`,
        );
      }

      // Check linkedFormKey only for link type
      if (field.type === "link" && !field.linkedFormKey) {
        warnings.push(
          `Field "${field.name}" in form "${form.name}" is type "link" but has no linkedFormKey.`,
        );
      }

      // Remove options from non-select fields
      if (!["singleSelect", "multiSelect"].includes(field.type)) {
        delete field.options;
      }

      // Remove linkedFormKey from non-link fields
      if (field.type !== "link") {
        delete field.linkedFormKey;
      }

      return field;
    });

    return form;
  });

  // Add warnings to draft
  draft.warnings = warnings;

  return draft;
};

module.exports = {
  generateDraftSpec,
  validateDraft,
};