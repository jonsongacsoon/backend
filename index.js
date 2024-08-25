const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { createAssistant } = require("./openai.service");
const fs = require("fs").promises;
const app = express();
const OpenAI = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.use(cors());
app.use(bodyParser.json());

let assistantCache = null;  // Cache the assistant object

app.get("/start", async (req, res) => {
  try {
    const thread = await openai.beta.threads.create();
    return res.json({ thread_id: thread.id });
  } catch (error) {
    console.error("Error creating thread:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post("/start-chat", async (req, res) => {
  const { thread_id, message } = req.body;

  if (!thread_id) {
    return res.status(400).json({ error: "Missing thread_id" });
  }

  console.log(`Received message: ${message} for thread ID: ${thread_id}`);

  try {
    if (!assistantCache) {
      assistantCache = await createAssistant(openai);  // Load/create assistant if not cached
    }

    // Create and start the run asynchronously
    const run = await openai.beta.threads.runs.create(thread_id, {
      assistant_id: assistantCache.id,
    });

    res.json({ status: "processing", run_id: run.id });
  } catch (error) {
    console.error("Error starting chat processing:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/get-chat-result", async (req, res) => {
  const { run_id } = req.query;

  try {
    // Poll for the result
    const run = await openai.beta.threads.runs.poll(run_id);
    if (run.status === "completed") {
      const messages = await openai.beta.threads.messages.list(run.thread_id);
      const response = messages.data[0].content[0].text.value;
      return res.json({ status: "completed", response });
    } else {
      return res.json({ status: "processing" });
    }
  } catch (error) {
    console.error("Error retrieving chat result:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

app.listen(8080, () => {
  console.log("Server running on port 8080");
});
