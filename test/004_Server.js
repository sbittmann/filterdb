import Database from "../lib/Database.js";
import fs from "fs/promises";
import axios from "axios"
import { expect } from "chai";

let dbname = "serverTest";

describe("Server", () => {
    let db;
    before(async () => {
        try {
            await fs.rm(`./storage/${dbname}`, {
                recursive: true,
            });
        } catch {}

        db = await new Database(dbname, {
            server: {
                port: 8080
            }
        });
        await db.table("persons").ensureIndex("name");
        await db.table("persons").push({name: "Max Mustermann"})
    });
    after(async () => {
        try {
            db.close();
            await fs.rm(`./storage/${dbname}`, {
                recursive: true,
            });
        } catch {}
    });

    describe("/meta", () => {
        it("GET: should return database information", async () => {
            let { data } = await axios.get("http://localhost:8080/meta")
            expect(data).to.be.eql(db.meta);
        });
    });
    
    describe("/table/:table/meta", () => {
        it("GET: should return table information", async () => {
            let { data } = await axios.get("http://localhost:8080/table/persons/meta")
            expect(data).to.be.eql(db.table("persons").meta);
        });
    });

    describe("/table/:table/:id", () => {
        it("GET: should load db entry", async () => {
            let item = { name: "Max Mustermann" }
            let id = await db.table("persons").push(item);

            let { data } = await axios.get("http://localhost:8080/table/persons/" + id)
            
            expect({ ...item, _id: id}).to.be.eql(data);
        });

        it("DELETE: should delete db entry", async () => {
            let item = { name: "Max Mustermann" }
            let id = await db.table("persons").push(item);

            await axios.delete("http://localhost:8080/table/persons/" + id)
            
            expect(await db.table("persons").get(id)).to.be.equal(null);
        });
    });

    describe("/table/:table/", () => {
        it("PUT: should insert new db enrty", async () => {
            let item = { name: "Gerlinde Mustermann" }
            let { data } = await axios.put("http://localhost:8080/table/persons/", item)
             
             let d  = await db.table("persons").get(data)
            expect({... item, _id: data}).to.be.eql(d);
        });
        it("POST: should run filter query", async () => {
            let { data } = await axios.post("http://localhost:8080/table/persons/", {
                type: "filter",
                query: "(row) => { return row.name == name }",
                context: {
                    name: "Gerlinde Mustermann"
                },
            })
            expect(data.length).to.be.gte(1)
        });

        it("POST: should run find query", async () => {
            let { data } = await axios.post("http://localhost:8080/table/persons/", {
                type: "find",
                query: "(row) => { return row.name == name }",
                context: {
                    name: "Gerlinde Mustermann"
                },
            })
            expect(data.name).to.be.equal("Gerlinde Mustermann")
        });
    });
});
