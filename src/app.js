const express = require("express");
const sessionRoutes = require("../src/routes/sessionRoutes");

const app = express();
app.use(express.json());

// Health check
app.get("/", (req, res) => {
  res.json({ status: "Server is running" });
});

app.use("/api/unify", sessionRoutes);

module.exports = app;
