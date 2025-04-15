import { Server } from "socket.io";
import OpenAI from "openai";
import { playAudio } from "openai/helpers/audio";

const openai = new OpenAI({
  apiKey: "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",
});

const io = new Server({
  cors: {
    origin: "http://localhost:5173"
  },
});

io.on("connection", (socket) => {
  console.log("a user connected"); 

  socket.on("disconnect", () => {
    console.log("user disconnected");
  });

  socket.on("Speak", async (model, input, voice, instructions, speed) => {
    const response = await openai.audio.speech.create({
      model,
      voice,
      input,
      instructions,
      speed: parseFloat(speed),
    });
    console.log("Playing message");
    await playAudio(response);
    console.log("Message played");
  });
});

console.log("Server running on port 8888");
io.listen(8888)