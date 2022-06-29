import fastify from "fastify";
import cors from "@fastify/cors";
import { actionTypes } from "../lib/utils.js";

export default class Server {
    #server;
    #port;
    #origin;
    constructor({ port = 8000, origin = "*" } = {}) {
        this.#port = port;
        this.#origin = origin;
    }
    async start(db) {
        this.#server = fastify();
        this.#server.register(cors, { origin: this.#origin });

        this.#server.addHook("onRequest", async (req) => {
            req.token = req.headers.authorization?.substring(7);
        });

        this.#server.get("/meta", async (req) => {
            return db.meta(req.token);
        });
        this.#server.post("/auth", async (req) => {
            return await db.auth(req.body.user, req.body.password);
        });
        //TABLE
        this.#server.get("/table/:table/meta", async (req) => {
            return db.table(req.params.table).meta(req.token);
        });

        //GET but with body
        this.#server.post("/table/:table/data/", async (req) => {
            if (req.body.type === "filter") {
                return await db.table(req.params.table).filter(req.body.query, req.body.context);
            }
            if (req.body.type === "chain") {
                let chain = db.table(req.params.table);
                for (let item of req.body.chain) {
                    if (item.type === actionTypes.FILTER) {
                        chain = chain.filter(item.data.query, item.data.context);
                    }
                    if (item.type === actionTypes.SORT) {
                        chain = chain.sort(item.data.query, item.data.context);
                    }
                    if (item.type === actionTypes.MAP) {
                        chain = chain.map(item.data.query, item.data.context);
                    }
                    if (item.type === actionTypes.REDUCE) {
                        chain = chain.reduce(item.data.query, item.data.initVal, item.data.context);
                    }
                }
                return await chain;
            }
            return await db.table(req.params.table).find(req.body.query, req.body.context);
        });

        this.#server.get("/table/:table/data/:id", async (req) => {
            return await db.table(req.params.table).get(req.params.id);
        });

        this.#server.put("/table/:table/data/", async (req) => {
            return await db.table(req.params.table).save(req.body);
        });

        this.#server.delete("/table/:table/data/:id", async (req) => {
            await db.table(req.params.table).remove(req.params.id);
            return true;
        });

        await new Promise((res, rej) => {
            this.#server.listen(
                {
                    port: this.#port,
                },
                (err, address) => {
                    if (err) {
                        rej(err);
                        return;
                    }
                    res();
                },
            );
        });
    }
    stop() {
        this.#server.close();
    }
}
