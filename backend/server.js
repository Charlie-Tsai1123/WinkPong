const express = require("express");
const socket = require("socket.io");
const fs = require("fs");
const https = require('https');
const path = require('path');
const { count } = require("console");

const app = express();
app.use(express.static(path.join(__dirname, "../frontend")));

const options = {
  key: fs.readFileSync(path.join(__dirname, "certs/key.pem")),
  cert: fs.readFileSync(path.join(__dirname, "certs/cert.pem")),
};

const server = https.createServer(options, app);
const io = socket(server);
let activeRooms = new Set();

server.listen(443, () => {
    console.log("WebSocket server is running at https://localhost:443");
})

io.on("connection", (socket) => {
    console.log("User connected: " + socket.id);

    socket.join("lobby");
    console.log(activeRooms);
    setTimeout(() => {
        io.to("lobby").emit("room-list", Array.from(activeRooms));
    }, 1000);
    

    socket.on("join", (roomName) => {
        const rooms = io.sockets.adapter.rooms;
        const room = rooms.get(roomName);
        
        if (room == undefined) {
            socket.join(roomName);
            socket.data.roomName = roomName;
            socket.leave("lobby");
            activeRooms.add(roomName);
            socket.emit('created');
        } else if (room.size == 1) {
            socket.join(roomName);
            socket.data.roomName = roomName;
            socket.leave("lobby");
            activeRooms.delete(roomName);
            socket.emit('joined');
        } else {
            socket.emit('full');
        }
        console.log(rooms);
        io.to("lobby").emit("room-list", Array.from(activeRooms));
        console.log(activeRooms);
    })

    socket.on("ready", (roomName) => {
        socket.broadcast.to(roomName).emit("ready");
    })

    socket.on("candidate", (candidate, roomName) => {
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
        if (roomName) {
            console.log(`Notifying others in room: ${roomName}`);
            socket.broadcast.to(roomName).emit("peer-disconnected", roomName);
        }
        socket.leave(roomName);
        rooms.delete(roomName);
        socket.join("lobby");
        io.to("lobby").emit("room-list", Array.from(activeRooms));
        console.log(rooms);
    })

    socket.on("send-ball-and-paddle", (ballX, ballY, userPaddleX, roomName) => {
        socket.broadcast.to(roomName).emit("receive-ball-and-paddle", ballX, ballY, userPaddleX);
    })

    socket.on("send-paddle", (paddleX, roomName) => {
        socket.broadcast.to(roomName).emit("receive-paddle", paddleX);
    })

    socket.on('peer-win', (roomName) => {
        socket.broadcast.to(roomName).emit("receive-win");
    })

    socket.on('peer-lose', (roomName) => {
        socket.broadcast.to(roomName).emit("receive-lose");
    })

    socket.on('count-down', (countDown, roomName) => {
        socket.broadcast.to(roomName).emit('receive-count-down', countDown);
    })

    socket.on('ready-next-round', (roomName) => {
        socket.broadcast.to(roomName).emit('receive-ready-next-round');
    })

    socket.on("disconnect", () => {
        socket.leave("lobby");
        console.log(`Client ${socket.id} disconnected, room ${socket.data.roomName} will be closed`);
        const roomName = socket.data.roomName;
        if (roomName) {
            console.log(`Notifying others in room: ${roomName}`);
            socket.broadcast.to(roomName).emit("peer-disconnected", roomName);
            socket.leave(roomName);
            activeRooms.delete(roomName);
        }
        io.to("lobby").emit("room-list", Array.from(activeRooms));
    })
})

