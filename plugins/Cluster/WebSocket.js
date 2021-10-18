import { nanoid } from "nanoid/async";
import { EventEmitter } from 'events';
import { default as WebSocketWS} from "ws";


export default class WebSocket extends EventEmitter {
    #ws;
    #address;
    #waitingMessages = {}
    constructor(address) {
        super();
        return (async () => {
            this.#address = address;
            try {
                await this.start()
            } catch (e) {
                
            }
            
            return this;
        })()
    }

    static get STATES() {
        return {
            CONNECTING: 0,
            OPEN: 1,
            CLOSING: 2,
            CLOSED: 3,
        }
    }

    get state() {
        return this.#ws.readyState
    }

    async send(event, data) {
        if(this.state !== WebSocket.STATES.OPEN) {
            throw new Error("Socket not open, cannot send")
        }
        let id = await nanoid();
        this.#ws.send(JSON.stringify({
            event,
            id,
            data
        }))
        return new Promise((res, rej) => {
            
            this.#waitingMessages[id] = res;
            setTimeout(() => {
                rej("Response from WebSocketServer timeout");
            }, 10000)
        })   
    }
    close() {
        this.#ws.close()
    }
    async start() {
        await new Promise((res, rej) => {
            let init = true;
            this.#ws = new WebSocketWS(this.#address, {
                handshakeTimeout: 5000
            })
            this.#ws.on('open', () => {
                init = false
                res()
            })
            this.#ws.on('error', async (e) => {
                if(init) {
                    res();
                }
                if([WebSocket.STATES.CLOSING, WebSocket.STATES.CLOSED].includes(this.state)) {
                    await this.start()
                }
            });
            this.#ws.on('message', (data) => {
                let msg = JSON.parse(data)
                if(msg.event == 'response') {
                    this.#waitingMessages[msg.id](msg.data);
                    delete this.#waitingMessages[msg.id];
                    return;
                }
                this.emit(msg.event, msg.data)
            });
        });

    }
}