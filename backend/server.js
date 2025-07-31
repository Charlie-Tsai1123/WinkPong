const express = require("express");
const socket = require("socket.io");
const fs = require("fs");
const https = require('https');
const path = require('path');

const app = express();
app.use(express.static(path.join(__dirname, "../frontend")));

const options = {
  key: fs.readFileSync(path.join(__dirname, "certs/key.pem")),
  cert: fs.readFileSync(path.join(__dirname, "certs/cert.pem")),
};

const server = https.createServer(options, app);
const io = socket(server);

server.listen(443, () => {
    console.log("WebSocket server is running at https://localhost:443");
})

io.on("connection", (socket) => {
    console.log("User connected: " + socket.id);

    socket.on("join", (roomName) => {
        const rooms = io.sockets.adapter.rooms;
        const room = rooms.get(roomName);
        
        if (room == undefined) {
            socket.join(roomName);
            socket.data.roomName = roomName;
            socket.emit('created');
        } else if (room.size == 1) {
            socket.join(roomName);
            socket.data.roomName = roomName;
            socket.emit('joined');
        } else {
            socket.emit('full');
        }
        console.log(rooms);
    })

    socket.on("ready", (roomName) => {
        socket.broadcast.to(roomName).emit("ready");
    })

    socket.on("candidate", (candidate, roomName) => {
        console.log("candidate");
        socket.broadcast.to(roomName).emit("sendCandidate", candidate); // send candidate to peer in the room
    })

    socket.on("offer", (offer, roomName) => {
        console.log("offer");
        socket.broadcast.to(roomName).emit("sendOffer", offer);
    })

    socket.on("answer", (answer, roomName) => {
        console.log("answer");
        socket.broadcast.to(roomName).emit("sendAnswer", answer);
    })

    socket.on("leave-room", (roomName) => {
        const rooms = io.sockets.adapter.rooms;
        rooms.delete(roomName);
        console.log(rooms);
    })

    socket.on("disconnect", () => {
        console.log(`Client ${socket.id} disconnected, room ${socket.data.roomName} will be closed`);
        const roomName = socket.data.roomName;
        if (roomName) {
            console.log(`Notifying others in room: ${roomName}`);
            socket.broadcast.to(roomName).emit("peer-disconnected", roomName);
        }
    })
})

