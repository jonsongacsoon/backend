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

let assistantCache = null;  // Cache assistant object

app.get("/start", async (req, res) => {
  try {
    const thread = await openai.beta.threads.create();
    return res.json({ thread_id: thread.id });
  } catch (error) {
    console.error("Error creating thread:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post("/chat", async (req, res) => {
  try {
    const { thread_id, message } = req.body;

    if (!thread_id) {
      return res.status(400).json({ error: "Missing thread_id" });
    }

    console.log(`Received message: ${message} for thread ID: ${thread_id}`);

    if (!assistantCache) {
      assistantCache = await createAssistant(openai);  // Load/create assistant if not cached
    }

    const assistantId = assistantCache.id;
    await openai.beta.threads.messages.create(thread_id, {
      role: "user",
      content: message,
    });

    const run = await openai.beta.threads.runs.createAndPoll(thread_id, {
      assistant_id: assistantId,
    });

    const messages = await openai.beta.threads.messages.list(run.thread_id);
    const response = messages.data[0].content[0].text.value;

    return res.json({ response });
  } catch (error) {
    console.error("Error in chat processing:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

app.listen(8080, () => {
  console.log("Server running on port 8080");
});
