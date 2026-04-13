const axios = require("axios");

// GraphQL Helper
async function gql(query, token) {
  const res = await axios.post(
    process.env.GRAPHQL_URI,
    { query },
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    },
  );

  return res.data;
}

// Find category by name
async function findCategory(categoryName, token) {
  const data = await gql(
    `
    query {
      listCategory {
        _id
        categoryName
      }
    }
  `,
    token,
  );

  const categories = data?.data?.listCategory || [];

  return (
    categories.find(
      (c) => c.categoryName.toLowerCase() === categoryName.toLowerCase(),
    ) || null
  );
}

// Create Category
async function createCategory(categoryName, token) {
  const categoryDescription = `${categoryName} related apps`;

  const data = await gql(
    `
    mutation {
      createCategory(input: {
        categoryName: "${categoryName}",
        categoryDescription: "${categoryDescription}"
      }) {
        _id
        categoryName
      }
    }
  `,
    token,
  );

  console.log("createCategory response:", JSON.stringify(data, null, 2));

  return data?.data?.createCategory || null;
}

// Resolve Category -find or create
async function resolveCategory(categoryName, token) {
  console.log(`Resolving category "${categoryName}"...`);

  const existing = await findCategory(categoryName, token);

  if (existing) {
    console.log(
      `Found category "${existing.categoryName}" (ID: ${existing._id})`,
    );
    return existing;
  }

  console.log(`Category "${categoryName}" not found. Creating...`);
  const created = await createCategory(categoryName, token);

  if (!created) {
    throw new Error(`Failed to create category "${categoryName}"`);
  }

  console.log(
    `Category "${created.categoryName}" created (ID: ${created._id})`,
  );
  return created;
}

// Create App
async function createApp(appName, categoryId, colors, token) {
  console.log(`Creating app "${appName}"...`);

  const data = await gql(
    `
    mutation {
      createApp(input: {
        appName: "${appName}"
        categoryId: "${categoryId}"
        fontColor: "${colors.fontColor}"
        primaryColor: "${colors.primaryColor}"
        secondaryColor: "${colors.secondaryColor}"
      }) {
        _id
        appName
        category {
          _id
        }
        fontColor
        primaryColor
        secondaryColor
      }
    }
  `,
    token,
  );

  return data?.data?.createApp || null;
}

module.exports = {
  resolveCategory,
  createApp,
};
