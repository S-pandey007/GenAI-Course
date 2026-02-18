const input = document.querySelector("#input");
const chatContainer = document.querySelector("#chat-container");
const askBtn = document.querySelector("#ask");

input?.addEventListener("keyup", handleEnter);
askBtn?.addEventListener("click", handleAsk);

/**
 * 1. append message UI
 * 2. send it to the LLM
 * 3. append response to the UI
 */
async function generateMessageUIAndSendLLM(text) {
  //1. append message UI
  const msg = document.createElement("div");
  msg.className = `my-6 bg-neutral-800 p-3 rounded-xl ml-auto max-w-fit`;
  msg.textContent = text;
  chatContainer?.appendChild(msg);
  input.value = "";

  //2. send it to the LLM
  const assistanMessage = await callServer(text);
  console.log(assistanMessage);

  //3. append response to the UI
  const assistantMsgEle = document.createElement("div");
  assistantMsgEle.className = `max-w-fit`;
  assistantMsgEle.textContent = assistanMessage;
  chatContainer?.appendChild(assistantMsgEle);
}

// call server
async function callServer(inputText) {
  const response = await fetch("http://localhost:3000/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ message: inputText }),
  });

  if (!response.ok) {
    throw new Error("Error generating the response");
  }

  const result = await response.json();
  return result.message;
}

async function handleEnter(e) {
  if (e.key === "Enter") {
    const text = input?.value.trim();
    if (!text) {
      return;
    }
    console.log(text);
    await generateMessageUIAndSendLLM(text);
  }
}

async function handleAsk(e) {
  const text = input?.value.trim();
  if (!text) {
    return;
  }
  console.log(text);
  await generateMessageUIAndSendLLM(text);
}
