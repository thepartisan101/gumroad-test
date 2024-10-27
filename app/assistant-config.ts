export let assistantId = ""; // change assistant ID back to gumroad after test

if (assistantId === "") {
  assistantId = process.env.OPENAI_ASSISTANT_ID;
}
