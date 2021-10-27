import fastify from "fastify"

export default class Server {
    #server
    #port
    constructor({port = 8000} = {}) {
        this.#port = port
    }
    async start(db) {
        this.#server = fastify()
        this.#server.get('/meta', async (req) => {
            console.log("meta")
            return db.meta;
        })
        //TABLE
        this.#server.get('/table/:table/meta', async (req) => {
            return db.table(req.params.table).meta
        })

        //GET but with body
        this.#server.post('/table/:table/', async (req) => {
            if(req.body.type === "filter") {
                return await db.table(req.params.table).filter(req.body.query, req.body.context)
            }
            return await db.table(req.params.table).find(req.body.query, req.body.context)
            
        })

        this.#server.get('/table/:table/:id', async (req) => {
            return await db.table(req.params.table).get(req.params.id)
        })

        this.#server.put('/table/:table/', async (req) => {
            return await db.table(req.params.table).save(req.body)
        })

        this.#server.delete('/table/:table/:id', async (req) => {
            await db.table(req.params.table).remove(req.params.id);
            return true
        })
        
        await new Promise((res, rej) => {
            this.#server.listen(this.#port, (err, address) => {
                if(err) {
                    rej(err);
                    return;
                }
                res();
            })
        })
    }
    stop() {
        this.#server.close();
    }
}