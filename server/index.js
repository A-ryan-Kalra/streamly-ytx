import http from "http";
import express from "express";
import { Server } from "socket.io";
import dotenv from "dotenv";

dotenv.config();
const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: true,
});

const PORT = process.env.PORT || 8001;

io.on("connection", (socket) => {
  socket.on("user:join", ({ name, room }) => {
    console.log("scoketId", socket.id);
    console.log("data", { name, room });

    io.to(socket.id).emit("room:joined", {
      id: socket.id,
      success: true,
      room,
    });
  });
});

app.get("/api", (req, res) => {
  res.send("Socket server is up and running");
});

server.listen(PORT, () => {
  console.log("Server is running at ", PORT);
});
