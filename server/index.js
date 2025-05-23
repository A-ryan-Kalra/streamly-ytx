import http from "http";
import express from "express";
import { Server } from "socket.io";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __direname = path.dirname(__filename);

dotenv.config();
const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*", // You can restrict this to your frontend URL
    methods: ["GET", "POST"],
  },
});

const PORT = process.env.PORT || 8001;

const clientPath = path.join(__direname, "../client/dist");
app.use(express.static(clientPath));

app.get("*splat", (req, res) => {
  res.sendFile(path.join(clientPath, "index.html"));
});

io.on("connection", (socket) => {
  socket.on("room:join", ({ name, room }) => {
    socket.join(room);

    io.to(room).emit("user:join", { name, id: socket.id });

    io.to(socket.id).emit("room:joined", {
      id: socket.id,
      success: true,
      room,
      name,
    });
  });

  socket.on("user:call", ({ to, offer }) => {
    io.to(to).emit("incomming:call", { from: socket.id, offer });
  });

  socket.on("call:accepted", ({ to, ans }) => {
    io.to(to).emit("call:accepted", { from: socket.id, ans });
  });

  socket.on("peer:nego:needed", ({ to, offer }) => {
    io.to(to).emit("peer:nego:needed", { from: socket.id, offer });
  });

  socket.on("peer:nego:done", ({ to, ans }) => {
    io.to(to).emit("peer:nego:final", { from: socket.id, ans });
  });

  socket.on("open:stream", ({ remoteSocketId }) => {
    io.to(remoteSocketId).emit("open:stream");
  });
});

app.get("/api/", (req, res) => {
  res.send("Socket server is up and running.");
});

// Start the server
server.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
