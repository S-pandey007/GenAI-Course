import Groq from "groq-sdk/index.mjs";
import { tavily } from "@tavily/core";
import dotenv from "dotenv";
import NodeCache from "node-cache";

dotenv.config();

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const tvly = tavily({ apiKey: process.env.WEB_CALLING });

const cache = new NodeCache({ stdTTL: 60 * 60 * 24 }); //24 hours cache

/**
 * TOOL FUNCTION: webSearch
 *
 * This function acts as an external tool that use LLM can call.
 * The LLM does not execute this directly.
 * Insted :
 *  1. LLM decides to call the tool
 *  2. Our backend execute this function
 *  3. We send the result backe to the LLM
 */
async function webSearch({ query }) {
  //   console.log("web Search Calling....");

  const response = await tvly.search(query);
  //   console.log("web search api response : ", response);

  /**
   * Extract content from all search results
   * respose.results is an array of search results
   * we map each result's content and join them into one string
   */
  const finalResult = response.results
    .map((result) => result.content)
    .join("\n\n");
  //   console.log("Final string after joining results:", finalResult);

  return finalResult;
}

/**
 * MAIN AGENT LOOP
 *
 * This function implements a  ReAct agent pattern:
 *
 * 1. send user message to LLM
 * 2. if LLM wants to call a tool -> excute tool
 * 3. send tool result back to LLM
 * 4. repeat until LLM produces final answer
 */
export async function generateAgent(userMessage, threadId) {
  /**
   * conversation history array.
   * this keeps full chat memory b/w user, assistant and tools
   */
  const baseMessages = [
    {
      role: "system",
      content: `You are a smart personal assistant.
                    If you know the answer to a question, answer it directly in plain English.
                    If the answer requires real-time, local, or up-to-date information, or if you don’t know the answer, use the available tools to find it.
                    You have access to the following tool:
                    webSearch(query: string): Use this to search the internet for current or unknown information.
                    Decide when to use your own knowledge and when to use the tool.
                    Do not mention the tool unless needed.

                    Examples:
                    Q: What is the capital of France?
                    A: The capital of France is Paris.

                    Q: What’s the weather in Mumbai right now?
                    A: (use the search tool to find the latest weather)

                    Q: Who is the Prime Minister of India?
                    A: The current Prime Minister of India is Narendra Modi.

                    Q: Tell me the latest IT news.
                    A: (use the search tool to get the latest news)

                    current date and time: ${new Date().toUTCString()}`,
    },
    // {
    //   role: "user",
    //   content: "what's the current weather update in Mumbai ?",
    //   //   content: "Hii ! How are you ?",
    // },
  ];

  /**
   * Load conversation history from cache if exists.
   * This allows the agent to have memory of past interactions in the same thread.
   */
  const messages = cache.get(threadId) ?? baseMessages;

  /**
   * Infinite loop for agent reasoning cycle
   * Loop continues until LLM gives final response.
   */

  messages.push({
    role: "user",
    content: userMessage,
  });

  const MAX_RETRIES = 10; // to prevent infinite loops in case of issues
  let count=0;
  while (true) {

    if(count>=MAX_RETRIES){
        return "Sorry, I'm having trouble finding the answer right now. please try again later."
    }
    count++;


    /**
     * step 1 : send conversation tool
     *
     * LLM decides:
     *  - answer directly
     *  - or call a tool
     */
    // console.info("Debug messages 1: ",messages)
    const response = await groq.chat.completions.create({
      // model: "llama-3.3-70b-versatile",
      model: "meta-llama/llama-4-scout-17b-16e-instruct",

      // Full conversation history sent every time
      messages: messages,

      /**
       * Tools definiation.
       * This tells the LLM what tools are available.
       * LLM can choose to call webSearch if needed.
       */
      tools: [
        {
          type: "function",
          function: {
            name: "webSearch",
            description: "Search latest info from internet",
            parameters: {
              type: "object",
              properties: {
                query: {
                  type: "string",
                },
              },
              required: ["query"],
            },
          },
        },
      ],

      // Let modek automatically decide wheather to call tool
      tool_choice: "auto",
    });

    /**
     * Push assistant response into converstation history
     * This response may:
     *  - contain tool_calls
     *  - or contain final text answer
     */
    // console.log("Debug response ; ",response.choices[0].message);

    messages.push(response.choices[0].message);
    //   const message = response.choices[0].message;
    // console.info("Debug message 2 : ",messages)
    /**
     * Extract tool calls from LLM response.
     * If tool_calls exists-> model wants to use tool.
     * If null/undefined -? model has final answer.
     */
    const toolCalls = response.choices[0].message.tool_calls;

    /**
     * step 2: If no tool calls-> final answer
     */
    if (!toolCalls) {
      /**
       * Cache the conversation history with threadId as key.
       * This allows us to maintain context in future interactions in the same thread.
       */
      cache.set(threadId, messages);
      return response.choices[0].message.content;
      //   console.log("Assistant : ", response.choices[0].message.content);
    }

    /**
     * step 3: Excute tools
     *
     * loopthrough tool calls
     */
    for (const tool of toolCalls) {
      // console.log("Tool Called:", tool);

      // extract function name requested by LLM
      const functionName = tool.function.name;

      // extract agrument as JSON string
      const functionParams = tool.function.arguments;

      /**
       * If LLM requested webSearch,
       * parse agrgument and execute tool
       */
      if (functionName === "webSearch") {
        // convert JSON string into JS object
        const toolResult = await webSearch(JSON.parse(functionParams));
        //   console.log("Tool Result:", toolResult);

        /**
         * push tool result into converstion
         * role must be 'tool'.
         * tool_call_id must match LLM request
         */
        messages.push({
          tool_call_id: tool.id,
          role: "tool",
          name: functionName,
          content: toolResult,
        });
      }
    }

    /**
     * Loop repeats :
     * Now LLM sees tool result in conversation.
     * It will either:
     * - Produce final answer
     * - or call another tool
     */
  }
}
