const { resolveCategory, createApp } = require("../services/graphqlService");

const generateApp = async (draft, idToken) => {
  // Step 1 - Resolve or create category
  const category = await resolveCategory(draft.category, idToken);

  if (!category) {
    throw new Error(`Failed to resolve category "${draft.category}"`);
  }

  console.log(`Category resolved: ${category._id}`);

  // Step 2- Create the app
  console.log(`Creating app "${draft.appName}"...`);
  const app = await createApp(
    draft.appName,
    category._id,
    {
      primaryColor: "#7C3AED",
      secondaryColor: "#C4B5FD",
      fontColor: "#000000",
    },
    idToken,
  );

  console.log(app);
  

  if (!app) {
    throw new Error(`Failed to create app "${draft.appName}"`);
  }

  console.log(`App created: ${app._id}`);

  return {
    appId: app._id,
    appName: app.appName,
    categoryId: app.category?._id,
    primaryColor: app.primaryColor,
    secondaryColor: app.secondaryColor,
    fontColor: app.fontColor,
  };
};

module.exports = {
  generateApp,
};