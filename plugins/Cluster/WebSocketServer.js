import { nanoid } from "nanoid/async";
import { EventEmitter } from 'events';
import { WebSocketServer as WebSocketServerWS, default as WebSocketWS } from "ws";


export default class WebSocketServer extends EventEmitter {
    #wss;
    constructor(port) {
        super();
        return (async () => {
            this.#wss = new WebSocketServerWS({ port });
            this.#wss.on('connection', (ws) => {
                ws.on('message', (data) => {
                    let msg = JSON.parse(data);
                    if(msg.id) {
                        this.emit(msg.event, msg.data, (data) => {
                            ws.send(
                                JSON.stringify({
                                    event: "response",
                                    id: msg.id,
                                    data: data
                                })
                            )
                        })
                        return;
                    }
                    this.emit(msg.event, msg.data)
                });
            })
            return this;
        })()
    }

    close() {
        this.#wss.close();
        this.#wss.clients.forEach((client) => {
            client.close();
        });
        
    }

    send2All(event, data) {
        let d = JSON.stringify({
            event: event,
            data: data,
        })
        this.#wss.clients.forEach((client) => {
            if (client.readyState === WebSocketWS.OPEN) {
                client.send(d);
            }
        });
    }
}