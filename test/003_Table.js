import Database from "../lib/Database.js";
import fs from "fs/promises";
import { shouldThrow } from "./utils.js";
import { expect } from "chai";

let dbname = "tableTest";
let tableName = "test";

describe("Table (class)", () => {
    let db;

    before(async () => {
        try {
            await fs.rm(`./storage/${dbname}`, {
                recursive: true,
            });
        } catch {}
        db = await new Database(dbname, {
            user: "admin",
            password: "admin",
        });
    });
    after(async () => {
        await db.delete();
    });

    describe("#constructor(name)", () => {
        it("should not allow empty name", async () => {
            expect(() => {
                db.table();
            }).to.throw();

            expect(() => {
                db.table(null);
            }).to.throw();

            expect(() => {
                db.table("");
            }).to.throw();
        });
    });
    describe(".meta", () => {
        it("should return correct meta info", async () => {
            let meta = db.table(tableName).meta();
            expect(meta.name).to.be.equal(tableName);
        });
    });
    describe(".ensureIndex(name)", () => {
        let id;
        before(async () => {
            await db.table(tableName).ensureIndex("name");
            await db.table(tableName).ensureIndex("test");

            id = await db.table(tableName).save({ title: "Mr." });
            await db.table(tableName).ensureIndex("title");
        });
        it("should create an Index", async () => {
            let meta = db.table(tableName).meta();
            expect(meta.indexes.name.build).to.be.equal(true);
            expect(meta.indexes.test.build).to.be.equal(true);
        });

        it("should create an Index on already inserted data", async () => {
            let data = await db.table(tableName).find((row) => {
                return row.title === "Mr.";
            });
            expect(data.title).to.be.equal("Mr.");
            expect(data._id).to.be.equal(id);
            expect(data.getQuery().indexes.title).to.be.gte(0);
        });
    });
    describe(".removeIndex(name)", () => {
        before(async () => {
            await db.table(tableName).removeIndex("title");
        });

        it("should delete an Index", async () => {
            let meta = db.table(tableName).meta();
            expect(meta.indexes.title).to.be.equal(undefined);
        });

        it("shouldn't use deleted index", async () => {
            let data = await db.table(tableName).find((row) => {
                return row.title === "Mr.";
            });
            let q = data.getQuery();
            expect(q.indexes.title).to.be.equal(undefined);
            expect(q.interpreterNeeded).to.be.equal(true);
        });
    });
    describe(".save(value)", () => {
        let id;

        it("should insert value and return id", async () => {
            id = await db.table(tableName).save({ test: true });
            expect(id).to.be.a("string");
        });
        it("should update object", async () => {
            let updateId = await db.table(tableName).save({ _id: id, test: false });
            expect(updateId).to.be.equal(id);
        });
    });
    describe(".get(id)", () => {
        it("should return object by id", async () => {
            let id = "testId123456789";
            await db.table(tableName).save({ _id: id, test: true });
            let val = await db.table(tableName).get(id);
            expect(val).to.be.a("object");
            expect(val.test).to.be.equal(true);
        });
    });
    describe(".remove(id)", () => {
        it("should delete object", async () => {
            let id = await db.table(tableName).save({ test: true });
            await db.table(tableName).remove(id);
            let val = await db.table(tableName).get(id);
            expect(val).to.be.equal(undefined);
        });
    });
    describe(".find(query, context)", () => {
        it("should find inserted object", async () => {
            let name = "Max Mustermann";
            let id = await db.table(tableName).save({ name: name });
            let result = await db.table(tableName).find(
                (l) => {
                    return l.name === name;
                },
                {
                    name,
                },
            );

            expect(result).to.be.a("object");
            expect(result.name).to.be.equal(name);
            expect(result._id).to.be.equal(id);
        });

        it("should use simple index", async () => {
            let name = "Max Mustermann";
            let name2 = "Maxi Mustermann";
            await db.table(tableName).save({ name: name });
            await db.table(tableName).save({ name: name2 });

            let result = await db.table(tableName).find(
                (l) => {
                    return l.name === name;
                },
                {
                    name,
                },
            );

            expect(result.name).to.be.equal(name);
            expect(result.getQuery().indexes.name).to.be.a("number");
        });

        it("should use index with AND syntax", async () => {
            let name = "Maxi Mustermann";
            await db.table(tableName).save({ name: name, test: true });

            let result = await db.table(tableName).find(
                (l) => {
                    return l.name === name && l.test === true;
                },
                {
                    name,
                },
            );

            let q = result.getQuery();

            expect(result.name).to.be.equal(name);
            expect(q.indexes.name).to.be.a("number");
            expect(q.indexes.test).to.be.a("number");
        });

        it("should use index with OR syntax", async () => {
            let name = "Maxi Mustermann";
            await db.table(tableName).save({ name: name, test: true });

            let result = await db.table(tableName).find(
                (l) => {
                    return l.name === name || l.test === true;
                },
                {
                    name,
                },
            );

            let q = result.getQuery();

            expect(result.name).to.be.equal(name);
            expect(q.indexes.name).to.be.a("number");
            expect(q.indexes.test).to.be.a("number");
        });

        it("should work without index", async () => {
            let notIndexed = "123";
            let id = await db.table(tableName).save({ notIndexed, test: true });

            let result = await db.table(tableName).find(
                (l) => {
                    return l.notIndexed === notIndexed;
                },
                {
                    notIndexed,
                },
            );

            expect(result).to.be.a("object");
            expect(result.notIndexed).to.be.equal(notIndexed);
            expect(result._id).to.be.equal(id);
        });

        it("should work with Object Property", async () => {
            let name = "Max Musterfrau";
            let id = await db.table(tableName).save({ name });

            let result = await db.table(tableName).find(
                (l) => {
                    return l.name === obj.test;
                },
                {
                    obj: {
                        test: name,
                    },
                },
            );

            expect(result).to.be.a("object");
            expect(result.name).to.be.equal(name);
            expect(result._id).to.be.equal(id);
        });

        it("should work on complex Query without index usage", async () => {
            let id = await db.table(tableName).save({ complexQuery: true });

            let result = await db.table(tableName).find((l) => {
                if (l.complexQuery === true) {
                    return true;
                }
                return false;
            });

            expect(result).to.be.a("object");
            expect(result.complexQuery).to.be.equal(true);
            expect(result._id).to.be.equal(id);
        });

        it("should throw Error on unkown var", async () => {
            await shouldThrow(async () => {
                let result = await db.table(tableName).find((l) => {
                    return name;
                });
            });
        });

        it("should throw Error on interpreter Error", async () => {
            await shouldThrow(async () => {
                let result = await db.table(tableName).find(`(l) => { return l.nested.nested.not.there}`);
            });
        });

        it("should throw Error on interpreter Error with index", async () => {
            await db.table(tableName).ensureIndex("throwTest");
            await db.table(tableName).save({ throwTest: true });

            await shouldThrow(async () => {
                let result = await db.table(tableName).find(`(l) => { return l.throwTest === true && l.nested.nested.not.there === false}`);
                console.dir(result.getQuery(), { depth: null });
            });
        });

        it("should throw Error on not correct JS-code", async () => {
            await shouldThrow(async () => {
                let result = await db.table(tableName).find(`(l => { return l.name }`);
            });
        });

        it("should throw Error on Query not a function", async () => {
            await shouldThrow(async () => {
                let result = await db.table(tableName).find(`{test: true}`);
            });
        });
    });
});
