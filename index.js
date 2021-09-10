import Database from "./lib/Database.js";
import faker from "faker";

(async () => {
    let db = await new Database("faker");
    let persons = [];
    //Perf.active = true;

    await db.table("persons").ensureIndex("name");
    await db.table("persons").ensureIndex("username");
    await db.table("persons").ensureIndex("email");

    for (let i = 0; i < 1; i++) {
        persons.push(faker.helpers.userCard());
    }

    for (let i = 0; i < persons.length; i++) {
        //console.log(persons[i].name);
        await db.table("persons").push(persons[i]);
    }

    let val = "Dr. Bernice Schaefer";
    let r = await db.table("persons").filter((row) => {
        return row.name === val; //&& row.name === "TEST";
    },{
        val,
    });
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

    /*
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

    console.table(modulesTable);*/
})();
