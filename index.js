const express = require("express");
const cors = require("cors");
const OpenAI = require("openai");

const app = express();
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const assistantId = process.env.ASSISTANT_ID;

app.use(cors());
app.use(express.json()); // Built-in middleware to parse JSON

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

    // Ensure the required fields are present and valid
    if (!thread_id || typeof message !== 'string') {
      return res.status(400).json({ error: "Invalid input data" });
    }

    // Process the message
    await openai.beta.threads.messages.create(thread_id, {
      role: "user",
      content: message, // Already properly encoded by the frontend
    });

    const run = await openai.beta.threads.runs.createAndPoll(thread_id, {
      assistant_id: assistantId,
    });

    const messages = await openai.beta.threads.messages.list(thread_id);
    const response = messages.data.length > 0 ? messages.data[0].content[0].text.value : "No response";

    return res.json({ response });
  } catch (error) {
    console.error("Error in chat processing:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

app.listen(8080, () => {
  console.log("Server running on port 8080");
});
