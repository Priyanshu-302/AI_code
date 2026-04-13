const { v4: uuidv4 } = require("uuid");
const UnifySession = require("../models/unifySessions");
const UnifyMessage = require("../models/unifyMessage");
const { generateApp } = require("../services/generateService");

// In memory job store in place of job queues
const jobs = {};

// POST /api/unify/sessions/:sessionId/generate
const triggerGeneration = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { confirmed } = req.body;
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Bearer token is required",
        },
      });
    }

    if (!confirmed) {
      return res.status(400).json({
        success: false,
        error: {
          code: "NOT_CONFIRMED",
          message: "confirmed must be true to trigger app generation.",
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

    if (!session.draftSpec) {
      return res.status(400).json({
        success: false,
        error: {
          code: "DRAFT_NOT_READY",
          message: "A validated draft must exist before generation can begin.",
        },
      });
    }

    if (session.status !== "draft_ready") {
      return res.status(400).json({
        success: false,
        error: {
          code: "DRAFT_NOT_READY",
          message: "A validated draft must exist before generation can begin.",
        },
      });
    }

    // Create a job
    const jobId = `job_${uuidv4()}`;
    jobs[jobId] = {
      jobId,
      sessionId,
      status: "queued",
      progress: [],
      error: null,
      appId: null,
    };

    // Update status
    session.status = "generating";
    session.currentStep = "generating";
    await session.save();

    // Run generation in background
    runGenerationJob(jobId, session);

    return res.status(200).json({
      success: true,
      data: {
        jobId,
        status: "queued",
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

// Background job runner
const runGenerationJob = async (jobId, session) => {
  const job = jobs[jobId];
  try {
    job.status = "running";

    // Progress: analyzing
    addProgress(jobId, {
      stage: "analyzing",
      message: "Understanding your app structure...",
      percent: 10,
    });

    await sleep(1000);

    // Progress: creating forms
    addProgress(jobId, {
      stage: "creating_forms",
      message: "Creating forms...",
      percent: 35,
    });

    await sleep(1000);

    // Progress: creating fields
    addProgress(jobId, {
      stage: "creating_fields",
      message: "Adding fields...",
      percent: 60,
    });

    await sleep(1000);

    // Progress: linking relationships
    addProgress(jobId, {
      stage: "linking_relationships",
      message: "Linking relationships...",
      percent: 82,
    });

    await sleep(1000);

    // Actual app creation via GraphQL
    const draftSpec = JSON.parse(session.draftSpec);
    const result = await generateApp(draftSpec, session.idToken);

    // Progress: finalizing
    addProgress(jobId, {
      stage: "finalizing",
      message: "Finalizing your app",
      percent: 95,
    });

    await sleep(500);

    // Done
    job.status = "done";
    job.appId = result.appId;

    // Update Session
    session.status = "completed";
    session.currentStep = "done";
    session.generatedAppId = result.appId;
    await session.save();

    await UnifyMessage.create({
      messageId: `msg_${uuidv4()}`,
      sessionId: session.sessionId,
      role: "assistant",
      content: `Your app "${draftSpec.appName}" has been created successfully!`,
    });

    console.log(`Job ${jobId} completed. App ID: ${result.appId}`);
  } catch (err) {
    console.error(`Job ${jobId} failed:`, err.message);
    job.status = "failed";
    job.error = err.message;
    session.status = "failed";
    await session.save();
  }
};

const addProgress = (jobId, event) => {
  if (jobs[jobId]) {
    jobs[jobId].progress.push(event);
    console.log(`Job ${jobId} progress:`, event);
  }
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// GET /api/unify/sessions/:sessionId/generate/stream
const streamProgress = async (req, res) => {
  try {
    const { sessionId } = req.params;

    const job = Object.values(jobs).find((j) => j.sessionId === sessionId);

    if (!job) {
      return res.status(404).json({
        success: false,
        error: {
          code: "JOB_NOT_FOUND",
          message: "No generation job found for this session.",
        },
      });
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    let sentIndex = 0;

    const interval = setInterval(() => {
      while (sentIndex < job.progress.length) {
        const event = job.progress[sentIndex];
        res.write(`event: progress\n`);
        res.write(`data: ${JSON.stringify(event)}\n\n`);
        sentIndex++;
      }

      if (job.status === "done") {
        res.write(`event: done\n`);
        res.write(
          `data: ${JSON.stringify({
            appId: job.appId,
            redirectUrl: `/apps/${job.appId}`,
          })}\n\n`,
        );
        clearInterval(interval);
        res.end();
      }

      if (job.status === "failed") {
        res.write(`event: error\n`);
        res.write(
          `data: ${JSON.stringify({
            code: "GENERATION_FAILED",
            message: job.error || "App generation failed.",
          })}\n\n`,
        );
        clearInterval(interval);
        res.end();
      }
    }, 500);

    req.on("close", () => {
      clearInterval(interval);
      res.end();
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      error: { code: "SERVER_ERROR", message: err.message },
    });
  }
};

module.exports = { triggerGeneration, streamProgress };
