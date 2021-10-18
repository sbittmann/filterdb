export default class Events {
    #eventsBefore = []
    #eventsAfter = []

    before(name, event) {
        this.#eventsBefore.push({
            name: name, //.split("."), 
            event: event
        })
    }

    after(name, event) {
        this.#eventsAfter.push({
            name: name, //.split("."), 
            event: event
        })
    }

    async emitBefore(event, payload) {
        for(let i = 0; i < this.#eventsBefore; i++) {
            if(event == this.#eventsBefore[i].name) {
                let result = await this.#eventsBefore[i].event(payload)
                if(result === false) {
                    return false;
                }
            }
        }
    }

    async emitAfter(event, payload) {
        for(let i = 0; i < this.#eventsAfter; i++) {
            if(event == this.#eventsAfter[i].name) {
                let result = await this.#eventsAfter[i].event(payload)
                if(result === false) {
                    return false;
                }
            }
        }
    }
}