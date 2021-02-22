import CodeParser from "./lib/CodeParser.js"
import Database from "./lib/Database.js"

run((row) => {
    return true //row.test == '1'
})

/*run(row => {
    return row.test == '1'
})

run(function(row) { 
    return row.test == '1' 
});

run(function(row) { 
    if(row.test == '1') {
        return true;
    }
    return false;
})

run(function(row) { 
    return row.test == '1' && row.test2 == '2' && row.test2 == '2'
});*/

//new Database().table("cases");


function run(func) {
    let str = "let func = " + func.toString();
    let cp = new CodeParser(str);
    console.log(func({ test: '2', test2: '1'}))
    let parsed = cp.parse();
    console.log(parsed)
}