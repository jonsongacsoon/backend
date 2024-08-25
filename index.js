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

app.post("/chat", async (req, res) => {
  const startTime = Date.now();
  console.log(`Request received at ${new Date(startTime).toISOString()}`);

  const { thread_id, message } = req.body;

  if (!thread_id) {
    return res.status(400).json({ error: "Missing thread_id" });
  }

  console.log(`Received message: ${message} for thread ID: ${thread_id}`);

  try {
    const assistantStart = Date.now();
    if (!assistantCache) {
      assistantCache = await createAssistant(openai);  // Load/create assistant if not cached
    }
    console.log(`Assistant ready at ${new Date(assistantStart).toISOString()}, took ${assistantStart - startTime} ms`);

    const createMessageStart = Date.now();
    await openai.beta.threads.messages.create(thread_id, {
      role: "user",
      content: message,
    });
    console.log(`Message created at ${new Date(createMessageStart).toISOString()}, took ${createMessageStart - assistantStart} ms`);

    const runStart = Date.now();
    const run = await openai.beta.threads.runs.createAndPoll(thread_id, {
      assistant_id: assistantCache.id,
    });
    console.log(`Run created and polled at ${new Date(runStart).toISOString()}, took ${runStart - createMessageStart} ms`);

    const messagesStart = Date.now();
    const messages = await openai.beta.threads.messages.list(run.thread_id);
    console.log(`Messages listed at ${new Date(messagesStart).toISOString()}, took ${messagesStart - runStart} ms`);

    const response = messages.data[0].content[0].text.value;
    console.log(`Response sent at ${new Date().toISOString()}, total time ${Date.now() - startTime} ms`);

    return res.json({ response });
  } catch (error) {
    console.error("Error in chat processing:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

app.listen(8080, () => {
  console.log("Server running on port 8080");
});
