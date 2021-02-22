let modules = {

}

let active = false;

export default class PerformanceCounter {
    #start
    #module
    #sub
    #active
    constructor(module, sub) {
        if(active) {
            this.#active = true
            this.#module = module;
            this.#sub = sub;

            if(!modules[module]) {
                modules[module] = {
                    subs: {},
                    times: []
                }
            }
            if(!modules[module].subs[sub]) {
                modules[module].subs[sub] = {
                    times: []
                }
            }

            this.#start = process.hrtime(); 
        } else {
            this.#active = false
        }
    }
    finish(extendData) {
        if(this.#active === true) {
            let time = process.hrtime(this.#start);
            let ms = (time[0]* 1000000000 + time[1]) / 1000000;
            modules[this.#module].times.push(ms);
            modules[this.#module].subs[this.#sub].times.push(ms);
        }
    }

    static get active() {
        return active;
    }

    static set active(val) {
        if(val === true && active === false) {
            modules = {}
        }
        active = val
    }
    
    static get data() {
        return modules
    }
}

function time(note){
    let precision = 3; // 3 decimal places
    let elapsed = process.hrtime(start)[1] / 1000000; // divide by a million to get nano to milli
    console.log(process.hrtime(start)[0] + " s, " + elapsed.toFixed(precision) + " ms - " + note); // print message + time
    start = process.hrtime(); // reset the timer
}