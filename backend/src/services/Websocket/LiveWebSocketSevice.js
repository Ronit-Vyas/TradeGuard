import { WebSocketServer, WebSocket } from "ws";

class LiveWebSocketService {

    constructor() {
        this.clients = new Map();
    }

    initialize(server) {

        this.wss = new WebSocketServer({
            server,
            path: "/ws/live"
        });

        this.wss.on("connection", (ws) => {

            console.log(
                "[LiveWS] Frontend connected"
            );

            ws.userId = null;

            ws.on("message", (message) => {

                try {

                    const data =
                        JSON.parse(message.toString());

                    if (data.type === "AUTH") {

                        ws.userId = data.userId;

                        if (!this.clients.has(ws.userId)) {
                            this.clients.set(
                                ws.userId,
                                new Set()
                            );
                        }

                        this.clients
                            .get(ws.userId)
                            .add(ws);

                        ws.send(JSON.stringify({
                            type: "AUTH_SUCCESS"
                        }));
                    }

                } catch (error) {

                    console.error(
                        "[LiveWS] Message error:",
                        error
                    );
                }
            });

            ws.on("close", () => {

                if (!ws.userId) {
                    return;
                }

                const userClients =
                    this.clients.get(ws.userId);

                if (!userClients) {
                    return;
                }

                userClients.delete(ws);

                if (userClients.size === 0) {
                    this.clients.delete(ws.userId);
                }
            });
        });
    }

    broadcast(userId, data) {

        const userClients =
            this.clients.get(userId);

        if (!userClients) {
            return;
        }

        const message =
            JSON.stringify(data);

        for (const client of userClients) {

            if (client.readyState === WebSocket.OPEN) {
                client.send(message);
            }
        }
    }
}

export default new LiveWebSocketService();