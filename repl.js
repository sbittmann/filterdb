import repl from "repl";

const state = {
    printSomething() {
        console.log("That's awesome!");
    },
};

const myRepl = repl.start("stefan's repl > ");

Object.assign(myRepl.context, state);
