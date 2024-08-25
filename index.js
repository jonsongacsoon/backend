const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const OpenAI = require("openai");

const app = express();
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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

    // Adjusting the polling approach for performance
    const runStart = Date.now();
    const run = await openai.beta.threads.runs.create(thread_id, {
      assistant_id: "asst_pe5TFV5zBJzlhqngKlCQ4Z2g",
    });
    
    // Consider polling the run status in a more efficient way
    // Example: Introduce a polling interval to check status periodically
    let runCompleted = false;
    let runResult = null;
    while (!runCompleted) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Adjust the polling interval as needed
      const runStatus = await openai.beta.threads.runs.getStatus(run.id);
      if (runStatus.status === "completed") {
        runResult = await openai.beta.threads.messages.list(run.thread_id);
        runCompleted = true;
      }
    }

    const runEnd = Date.now();
    console.log(`Run creation and polling took ${runEnd - runStart} ms`);

    const messagesStart = Date.now();
    const response = runResult.data[0].content[0].text.value;
    const messagesEnd = Date.now();
    console.log(`Messages listing took ${messagesEnd - messagesStart} ms`);

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
