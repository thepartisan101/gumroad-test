export let assistantId = ""; // change assistant ID

if (assistantId === "") {
  assistantId = process.env.OPENAI_ASSISTANT_ID;
}
