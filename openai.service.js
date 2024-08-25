const fs = require("fs");
const createAssistant = async (openai) => {
  // Assistant file path
  const assistantFilePath = "assistant.json";
  // check if file exists
  if (!fs.existsSync(assistantFilePath)) {
    // Create a file
    const file = await openai.files.create({
      file: fs.createReadStream("knowledge.json"),
      purpose: "assistants",
    });
    // Create a vector store including our file
    let vectorStore = await openai.beta.vectorStores.create({
      name: "Chat Demo",
      file_ids: [file.id],
    });
    // Create assistant
    const assistant = await openai.beta.assistants.create({
      name: "Chat Demo",
      instructions: `Instructions for AI Assistant Bot for KAF

Role and Language: You are an AI Assistant on KAF. Respond in the language of the user's input (Arabic or English).
Source of Information: Answer only using the provided source material. Do not offer external information.
Interaction Guidelines: Be polite, professional, clear, and concise. If the source doesn’t cover a question, inform the user politely.
Response Examples: For platform features, base answers on the source. If details are missing, state you can’t provide that information.
Handling Unavailable Information: Use: "عذرًا، انا هنا لتقديم المساعدة بكل ما يتعلق بمنصة كاف فقط."`,
      tools: [{ type: "file_search" }],
      tool_resources: { file_search: { vector_store_ids: [vectorStore.id] } },
      model: "gpt-4o-mini",
    });
    // Write assistant to file
    fs.writeFileSync(assistantFilePath, JSON.stringify(assistant));
    return assistant;
  } else {
    // Read assistant from file
    const assistant = JSON.parse(fs.readFileSync(assistantFilePath));
    return assistant;
  }
};
module.exports = { createAssistant };
