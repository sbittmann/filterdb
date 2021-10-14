import fastify from "fastify"

export default class Server {
    #server
    constructor(db, {port = 8000} = {}) {
        return (async () => {
            this.#server = fastify()
            //DB
            this.#server.get('/meta', async (req) => {
                return db.meta;
            })
            //TABLE
            this.#server.get('/table/:table/meta', async (req) => {
                return db.table(req.params.table).meta
            })

            //GET but with body
            this.#server.post('/table/:table/', async (req) => {
                reply.send(db.meta)
            })

            this.#server.put('/table/:table/', async (req) => {
                return await db.table(req.params.table).push(req.body)
            })

            this.#server.delete('/table/:table/', async (req) => {
                return await db.table(req.params.table).remove(req.body._id)
            })
            

            await new Promise((res, rej) => {
                this.#server.listen(port, '0.0.0.0', (err, address) => {
                    if(err) {
                        rej(err);
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