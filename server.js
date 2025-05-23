const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const helmet = require("helmet");
const cors = require('cors')
const app = express();

app.use(
    cors({
        origin: "*", // ⚠️ Use specific origins in production for security
        methods: ["GET", "POST"]
    })
);
// Use Helmet to set proper Content-Security-Policy
app.use(
    helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                connectSrc: ["'self'", "wss://wsserver-production-96ea.up.railway.app"]
            }
        }
    })
);

const PORT = process.env.PORT || 5001;
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const clients = {}; // Store clients by clientId

wss.on("connection", (ws) => {
    console.log("New client connected!");

    ws.on("message", (message) => {
        try {
            const data = JSON.parse(message);
            console.log("Received:", data);

            if (data.type === "register") {
                clients[data.clientId] = ws;
                console.log(`Client registered: ${data.clientId}`);
            } else if (data.type === "shareData") {
                if (!data.clientId) {
                    console.warn("Missing clientId in shareData request.");
                    return;
                }

                const targetClient = clients[data.clientId];

                if (targetClient && targetClient.readyState === WebSocket.OPEN) {
                    targetClient.send(
                        JSON.stringify({
                            type: "receivedData",
                            payload: data.payload
                        })
                    );
                    console.log(`Data sent to ${data.clientId}:`, data.payload);
                } else {
                    console.warn(`Client ${data.clientId} not found or disconnected.`);
                }
            }
        } catch (error) {
            console.error("Error processing WebSocket message:", error);
        }
    });

    ws.on("close", () => {
        for (const clientId in clients) {
            if (clients[clientId] === ws) {
                console.log(`Client ${clientId} disconnected.`);
                delete clients[clientId];
                break;
            }
        }
    });
    ws.on("error", (error) => {
        console.error("❌ WebSocket error:", error);
    });
});


server.listen(PORT, () => {
    console.log(`WebSocket server running on ws://localhost:${PORT}`);
});
