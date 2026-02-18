import Groq from "groq-sdk";
import dotenv from 'dotenv'
dotenv.config();

const  groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
})

export async function main(){
    const response = await getGroqChatResponse();
    console.log("Response : ",response)
    console.log("actual reponse for user : ",response.choices[0]);
}

export async function getGroqChatResponse(){
    return groq.chat.completions.create({
        temperature:1,
        // top_p:0.2,
        // stop:'ga',
        // max_completion_tokens:1000,
        // frequency_penalty:1,
        // presence_penalty:1,
        messages:[
            {
                role:'user',
                content:'Hii'
            }
        ],
        model:'llama-3.3-70b-versatile'
    })
}

main()





//======================================OpenAI SDK====================================================

// import OpenAI from 'openai'
// import dotenv from 'dotenv'
// dotenv.config();

// const client = new OpenAI({
//     apiKey: process.env.GROQ_API_KEY,
//     baseURL: "https://api.groq.com/openai/v1",
// });


// const response = await client.responses.create({
//     model: 'llama-3.3-70b-versatile',
//     input:'Hii'
// });
// console.info("actual reponse for user : ",response.output_text);
// console.log("Response : ",response) 
