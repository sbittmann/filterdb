import Database from "./lib/Database.js";
import Perf from "./lib/PerformanceCounter.js";
import faker from "faker";

(async () => {
    let db = await new Database("faker");
    db.backup.import();
    let persons = [];
    Perf.active = true;

    await db.table("persons").ensureIndex("name");
    await db.table("persons").ensureIndex("username");
    await db.table("persons").ensureIndex("email");

    for (let i = 0; i < 1; i++) {
        persons.push(faker.helpers.userCard());
    }

    for (let i = 0; i < persons.length; i++) {
        let w = await db.table("persons").push(persons[i]);
        console.log(w);
        console.log(persons[i]);
    }

    let val = "abel.net";
    let r = await db.table("persons").find(
        (row) => {
            console.log(row);
            return row.website === val;
        },
        {
            val,
        },
    );
    console.log(r);
    /*
    let r2 = await db.table("persons").filter((row) => {
        return row.website === 'sherwood.biz';
    });

    let r3 = db.table("persons").filter((row) => {
        return row.website === 'sherwood.biz';
    });
    for await(let row of r3) {
        //console.log(row)
    }
    //*/

    Perf.active = false;

    let d = Perf.data;

    let modulesTable = {};

    for (let [key, value] of Object.entries(d)) {
        let sum = value.times.reduce((pv, cv) => pv + cv, 0);
        let newKey = key + "                               ";
        modulesTable[newKey.substr(0, 31)] = {
            sum: sum,
            called: value.times.length,
            avg: sum / value.times.length,
            min: value.times.reduce((min, v) => (min <= v ? min : v), Infinity),
            max: value.times.reduce(
                (max, v) => (max >= v ? max : v),
                -Infinity,
            ),
        };
        let subs = value.subs;
        for (let [key, value] of Object.entries(subs)) {
            let sum = value.times.reduce((pv, cv) => pv + cv, 0);
            let newKey = "    " + key + "                           ";
            modulesTable[newKey.substr(0, 31)] = {
                sum: sum,
                called: value.times.length,
                avg: sum / value.times.length,
                min: value.times.reduce(
                    (min, v) => (min <= v ? min : v),
                    Infinity,
                ),
                max: value.times.reduce(
                    (max, v) => (max >= v ? max : v),
                    -Infinity,
                ),
            };
        }
    }

    /*let s = db.db.createReadStream();

    s.on("data", (data) => {
        console.log(data);
    })*/

    console.table(modulesTable);

    //console.log(r)

    /*
    let id = await db.table("cases").push({test: "test"});
    console.log("ID: ", id);

    let values = await db.table("cases").get(id);
    console.log("GOT:", values);
    

    let r = await db.table("cases").find((row) => {
        return row.test === 'test'
    });

    console.log(r);
    //db.table("cases").remove(r._id);
    

    let r2 = await db.table("cases").filter((row) => {
        return row.test === 'test' && row.test2 === 2
    });

    console.log(r2);*/
})();
