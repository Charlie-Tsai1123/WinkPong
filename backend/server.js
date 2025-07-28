const express = require('express');
const { WebSocketServer } = require('ws');
const https = require('https');
const path = require('path');
const fs = require('fs');

const options = {
    key: fs.readFileSync(path.join(__dirname, './certs/key.pem')),
    cert: fs.readFileSync(path.join(__dirname, './certs/cert.pem'))
};

// create server
const app = express();
const server = https.createServer(options, app);
const wss = new WebSocketServer({ server });

// frontend static file
app.use(express.static(path.join(__dirname, '../frontend')));

const clients = new Set(); // store clients who enter this server

wss.on("connection", ws => {
    console.log("New client connected!");
    clients.add(ws);

    ws.on("message", data => {
        // send data to others
        clients.forEach(client => {
            if (client != ws) {
                client.send(data.toString());
            }
        })
    })

    ws.on("close", () => {
        console.log("Client diesconnected~");
        clients.delete(ws);
    })
})

server.listen(443, () => {
    console.log("WebSocket server is running at https://localhost:443");
})