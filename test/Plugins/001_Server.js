import Database from "../../lib/Database.js";
import Server from "../../plugins/Server.js";
import fs from "fs/promises";
import axios from "axios";
import { expect } from "chai";

let dbname = "serverTest";
let port = 9091;

describe("Server (plugin)", () => {
    let db;
    before(async () => {
        try {
            await fs.rm(`./storage/${dbname}`, {
                recursive: true,
            });
        } catch {}

        db = await new Database(dbname, {
            plugins: [
                new Server({
                    port: port,
                }),
            ],
        });
        await db.table("persons").ensureIndex("name");
        await db.table("persons").save({ name: "Max Mustermann" });
    });
    after(async () => {
        await db.delete();
    });

    describe("/meta", () => {
        it("GET: should return database information", async () => {
            let { data } = await axios.get(`http://localhost:${port}/meta`);
            expect(data).to.be.eql(db.meta());
        });
    });

    describe("/table/:table/meta", () => {
        it("GET: should return table information", async () => {
            let { data } = await axios.get(`http://localhost:${port}/table/persons/meta`);
            expect(data).to.be.eql(db.table("persons").meta());
        });
    });

    describe("/table/:table/:id", () => {
        it("GET: should load db entry", async () => {
            let item = { name: "Max Mustermann" };
            let id = await db.table("persons").save(item);

            let { data } = await axios.get(`http://localhost:${port}/table/persons/data/${id}`);

            expect({ ...item, _id: id }).to.be.eql(data);
        });

        it("DELETE: should delete db entry", async () => {
            let item = { name: "Max Mustermann" };
            let id = await db.table("persons").save(item);

            await axios.delete(`http://localhost:${port}/table/persons/data/${id}`);

            expect(await db.table("persons").get(id)).to.be.equal(undefined);
        });
    });

    describe("/table/:table/", () => {
        it("PUT: should insert new db enrty", async () => {
            let item = { name: "Gerlinde Mustermann" };
            let { data } = await axios.put(`http://localhost:${port}/table/persons/data/`, item);

            let d = await db.table("persons").get(data);
            expect({ ...item, _id: data }).to.be.eql(d);
        });
        it("POST: should run filter query", async () => {
            let { data } = await axios.post(`http://localhost:${port}/table/persons/data/`, {
                type: "filter",
                query: "(row) => { return row.name == name }",
                context: {
                    name: "Gerlinde Mustermann",
                },
            });
            expect(data.length).to.be.gte(1);
        });

        it("POST: should run find query", async () => {
            let { data } = await axios.post(`http://localhost:${port}/table/persons/data/`, {
                type: "find",
                query: "(row) => { return row.name == name }",
                context: {
                    name: "Gerlinde Mustermann",
                },
            });
            expect(data.name).to.be.equal("Gerlinde Mustermann");
        });
    });
});
