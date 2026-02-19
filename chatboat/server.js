import express from 'express'
import cors from 'cors'
import { generateAgent } from './chatboat.js'
const app = express()
const port = 3000
app.use(express.json())
app.use(cors())

app.get('/', (req, res) => {
  res.send('Hello World!')
})


app.post('/chat',async(req,res)=>{
    const {message,threadId}=req.body;

    if(!message || !threadId){
        return res.status(400).json({error:"message and threadId are required"})
    }
    const response=await generateAgent(message,threadId)
    res.json({message:response})

})

app.listen(port, () => {
  console.log(`Server is running on port http://localhost:${port}`)
})

