const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const OpenAI = require("openai");

const app = express();
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const assistantId = process.env.ASSISTANT_ID; // Ensure you set this in your environment variables

app.use(cors());
app.use(bodyParser.json());

app.get("/start", async (req, res) => {
  try {
    const startTime = Date.now();
    const thread = await openai.beta.threads.create();
    const endTime = Date.now();
    console.log(`Thread creation took ${endTime - startTime} ms`);
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

  try {
    const createMessageStart = Date.now();
    await openai.beta.threads.messages.create(thread_id, {
      role: "user",
      content: message,
    });
    const createMessageEnd = Date.now();
    console.log(`Message creation took ${createMessageEnd - createMessageStart} ms`);

    const runStart = Date.now();
    const run = await openai.beta.threads.runs.createAndPoll(thread_id, {
      assistant_id: assistantId, // Use the assistant ID from environment variables
    });
    const runEnd = Date.now();
    console.log(`Run creation and polling took ${runEnd - runStart} ms`);

    const messagesStart = Date.now();
    const messages = await openai.beta.threads.messages.list(thread_id); // Check if the method name and usage are correct
    const messagesEnd = Date.now();
    console.log(`Messages listing took ${messagesEnd - messagesStart} ms`);

    const response = messages.data.length > 0 ? messages.data[0].content[0].text.value : "No response";
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
