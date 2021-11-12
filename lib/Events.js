export default class Events {
    #eventsBefore = []
    #eventsAfter = []

    before(name, event) {
        this.#eventsBefore.push({
            name: name,
            event: event
        })
    }

    after(name, event) {
        this.#eventsAfter.push({
            name: name,
            event: event
        })
    }

    async emitBefore(event, payload) {
        return await sendEvent(this.#eventsBefore, event, payload)
    }

    async emitAfter(event, payload) {
        return await sendEvent(this.#eventsAfter, event, payload)
    }
}

async function sendEvent(array, event, payload) {
    for(let i = 0; i < array.length; i++) {
        if(event === array[i].name) {
            let result = await array[i].event(payload)
            if(result === false) {
                return false;
            }
        }
    }
    return true;
}