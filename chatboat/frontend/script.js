const input = document.querySelector("#input");
const chatContainer = document.querySelector("#chat-container");
const askBtn = document.querySelector("#ask");


/**
 * generate threadId for each conversation session,
 * this allows us to maintain conversation history
 * for each session in the cache on the server side.
 * */
const threadId = Date.now().toString(36) + Math.random().toString(36).substring(2,8); 
input?.addEventListener("keyup", handleEnter);
askBtn?.addEventListener("click", handleAsk);

// loading element
const loading = document.createElement("div");
loading.className = "my-6 animate-pulse text-neutral-500";
loading.textContent = "Thinking...";


/**
 * 1. append message UIs
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

  // add loading element
  chatContainer?.appendChild(loading);

  //2. send it to the LLM
  const assistanMessage = await callServer(text,threadId);
  // console.log(assistanMessage);

  //3. append response to the UI
  const assistantMsgEle = document.createElement("div");
  assistantMsgEle.className = `max-w-fit`;
  assistantMsgEle.textContent = assistanMessage;

  // remove loading element
  loading.remove();
  
  // add assistant message element
  chatContainer?.appendChild(assistantMsgEle);
}

// call server
async function callServer(inputText,threadId) {
  const response = await fetch("http://localhost:3000/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ message: inputText, threadId: threadId }),
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
