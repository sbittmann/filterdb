import fastify from "fastify"

export default class Server {
    #server
    constructor({port = 8000} = {}) {
        return (async () => {
            this.#server = fastify()
            await new Promise((res, rej) => {
                this.#server.listen(port, (err) => {
                    if(err) {
                        rej();
                        return;
                    }
                    res();
                })
            })
            return this
        })()
    }
    close() {
        this.#server.close();
    }
}