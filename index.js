import Database from "./lib/Database.js"
import faker from "faker"



let start = process.hrtime();
(async () => {
    let db = await new Database("faker");
    ///*    
    let persons = [];
    for(let i = 0; i < 100000; i++) {
        persons.push(faker.helpers.userCard())
    }
    
    time("start pushing")
    for(let i = 0; i < persons.length; i++) {
        //console.log(i);
        await db.table("persons").push(persons[i])
    }
    time("stopped pushing") //*/
    await db.table("persons").ensureIndex("name");
    await db.table("persons").ensureIndex('username');
    await db.table("persons").ensureIndex('email');
    time("start reading")
    let r = await db.table("persons").find((row) => {
        return row.email === 'Taurean.Emmerich@yahoo.com';
    });
    //console.log(r);
    time("stopped reading")
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

    

})()


function time(note){
    let precision = 3; // 3 decimal places
    let elapsed = process.hrtime(start)[1] / 1000000; // divide by a million to get nano to milli
    console.log(process.hrtime(start)[0] + " s, " + elapsed.toFixed(precision) + " ms - " + note); // print message + time
    start = process.hrtime(); // reset the timer
}
