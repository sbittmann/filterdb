import { nanoid } from "nanoid/async";
import WebSocketServer from "./WebSocketServer.js"
import WebSocket from "./WebSocket.js"


export default class Cluster {
    #id;
    #weight;
    #address;
    #port;
    #peers;
    #nodes = []
    #leader
    #isLeader = false
    #leaderTimeout
    #leaderDeadTimeout
    #server
    #electing = false;
    #voters = [];
    #votePromise

    constructor({ id , peers = [], port, address} = {}) {
        return (async () => {
            if(!id) {
                id = await nanoid()
            }
            this.#id = id;
            this.#port = port;
            this.#weight = Math.random() * Date.now()
            this.#peers = peers
            this.#address = address;

            await this.start()

            return this;
        })()
    }

    async join(data) {
        if(data.id !== this.#id) {
            let i = this.#nodes.findIndex(node => node.id == data.id) 
            if(i >= 0) {
                this.#nodes[i].socket.close();
                this.#nodes[i] = data;
            } else {
                i = this.#nodes.push(data) - 1;   
            }

            this.#nodes[i].socket = await new WebSocket(`ws://${this.#nodes[i].address}`);
        }
        if(this.#isLeader) {
            this.#server.send2All('joined', data)
            return true;
        }
        return false;
    }

    async #loadNodes(peers) {
        let connected = false;
        let data;
        while(!connected) {
            for(let i = 0; i < peers.length; i++) {
                let ws = await new WebSocket(`ws://${peers[i]}`);
                try {
                    data = await ws.send('nodes');
                    connected = true;
                    ws.close();
                    break;
                } catch {}
                ws.close();
            }
        }
        let rejoin = data.find((node) => { return this.#id == node.id});
        for(let i = 0; i < data.length; i++) {
            await this.join(data[i]);
            if(rejoin) {
                let n = this.#nodes.find((node) => { return node.id === data[i].id});
                if(n && n.socket.state == WebSocket.STATES.OPEN) {
                    n.socket.send('rejoin', this.getConfig())
                }
            }
        }
    }

    async #connect2Leader() {
        let leader = this.#nodes.find(node => node.leader === true);
        if(leader) {
            this.#leader = await new WebSocket(`ws://${leader.address}`);
            let joined = await this.#leader.send('join', this.getConfig())
            if(joined) {
                this.#leader.on('alive', () => {
                    console.log(this.#id, "ALIVE")
                    this.#resetLeaderAlive()
                })
            }
            this.#leader.on('joined', async (data) => {
                await this.join(data)
            })
            this.#leader.on('append', async (data) => {
                console.log(this.#id, data)
            })
            this.#resetLeaderAlive()
            return;
        }
        this.#holdElection();
    }

    async #sendAlive() {
        this.#server.send2All('alive')
        this.#leaderTimeout = setTimeout(() => {
            this.#sendAlive()
        }, 500)
    }

    get #majority() {
        return this.#nodes.length > 2 ? parseInt(this.getNodes().length / 2) + 1 : 2;
    }

    async #holdElection() {
        if(this.#electing) {
            return;
        }
        
        this.#voters = [];
        this.#votePromise = null;
        this.#electing = true;
        if(this.#leader) {
            this.#isLeader = false;
            this.#leader.close();
        }

        let n = this.#nodes.find((node) => { return node.leader === true })
        if(n) {
            n.leader = false;
        }
        
        let results = [];
        this.#nodes.forEach((node) => {
            if(node.socket.state == WebSocket.STATES.OPEN) {
                results.push(node.socket.send('votable'))
            }
        })
        let r = await Promise.all(results)
        let myCandidate = this.getConfig();
        r.forEach((candidate) => {
            if(candidate.lastEntry > myCandidate.lastEntry) {
                myCandidate = candidate;
                return;
            }
            if(candidate.weight > myCandidate.weight) {
                myCandidate = candidate
            }
        })

        let hasWinner = false;
        if(myCandidate.id === this.#id) {
            console.log(this.#id, "VOTEDFORMYSELF")
            hasWinner = await this.#votedForMe(this.#id);
            console.log(this.#id, "VOTEDFORMYSELF RESULT", hasWinner)
        } else {
            let c = this.#nodes.find((node) => { return node.id === myCandidate.id });
            hasWinner = await c.socket.send('vote', this.getConfig());
        }

        this.#electing = false;
        if(hasWinner) {
            if( myCandidate.id === this.#id) {
                this.#startLeader();
                return;
            }
            
            let winner = this.#nodes.find((node) => { return node.id === myCandidate.id });
            if(winner) {
                winner.leader = true;
                this.#connect2Leader();
            }
            this.#nodes.forEach((node) => {
                if(node.socket.state == WebSocket.STATES.OPEN) {
                    node.socket.send('leader', myCandidate)
                }
            })
        } else {
            console.log(this.#id, "NOWINNER")
            this.#holdElection()
        }
    }

    #resetLeaderAlive() {
        let leaderDead = () => {
            this.#holdElection()
        }

        clearTimeout(this.#leaderDeadTimeout)
        this.#leaderDeadTimeout = setTimeout(leaderDead, 1500)
    }

    async #votedForMe(id) {
        this.#voters.push(id);
        if(!this.#votePromise) {
            this.#votePromise = new Promise((res) => {
                setTimeout(() => {
                    if(this.#voters.length >= this.#majority) {
                        res(true);
                        return
                    }
                    res(false)
                }, 1500)
            });
        }
        
        let won = await this.#votePromise
        return won;
        
    }

    #startLeader() {
        this.#isLeader = true;
        this.#sendAlive()
    }

    getNodes() {
        return [... this.#nodes, this.getConfig()]
    }

    getConfig() {
        return {
            id: this.#id,
            weight: this.#weight,
            address: this.#address,
            leader: this.#isLeader,
            lastEntry: 0
        }
    }

    close() {
        this.#server.close();
        clearTimeout(this.#leaderDeadTimeout);

        if(this.#isLeader) {
            this.#isLeader = false;
            clearTimeout(this.#leaderTimeout);
        }
        let n = this.#nodes.find((node) => { return node.leader === true })
        if(n) {
            n.leader = false;
        }
    }

    async start() {
        this.#server = await new WebSocketServer(this.#port)

        this.#server.on('votable', (data, send) => {
            if(!this.#electing) {
                this.#holdElection()
            }
            send(this.getConfig())
        })

        this.#server.on('vote', async (data, send) => {
            let won = await this.#votedForMe(data.id)
            send(won)
        })

        this.#server.on('leader', async (data, send) => {
            let leader = this.#nodes.find(node => node.leader === true);
            console.log(this.#id, leader?.id)
            send(true)
        })

        this.#server.on('join', async (data, send) => {
            send(await this.join(data));
        });

        this.#server.on('rejoin', async (data, send) => {
            if(this.#nodes.find((node) => { return node.id == data.id })) {
                send(await this.join(data));
                return;
            }
            send(false);
        })

        this.#server.on('append', async (data, send) => {
            send(await this.append(data))
        })

        this.#server.on('nodes', (data, send) => {
            send(this.getNodes());
        });
        let nodes = this.#nodes.length == 0 ? this.#peers : this.#nodes.map(node => node.address);
        if(nodes.length == 0) {
            this.#startLeader();
        } else {
            await this.#loadNodes(nodes);
            await this.#connect2Leader();
        }
    }

    async append(data) {
        if(this.#isLeader) {
            this.#server.send2All('append', data)
            return;    
        }
        return await this.#leader.send('append', data)
    }
}