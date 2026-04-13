const router = require("express").Router();

const {
  createSession,
  getSession,
} = require("../controllers/sessionController");
const { sendMessage } = require("../controllers/messageController");
const {
  triggerGeneration,
  streamProgress,
} = require("../controllers/generateController");

router.post("/sessions", createSession);
router.get("/sessions/:sessionId", getSession);
router.post("/sessions/:sessionId/messages", sendMessage);
router.post("/sessions/:sessionId/generate", triggerGeneration);
router.get("/sessions/:sessionId/generate/stream", streamProgress);

module.exports = router;
