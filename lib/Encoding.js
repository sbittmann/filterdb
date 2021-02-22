import charwise from "charwise"

export default class Encoding {
    static get LO() {
        return null;
    }

    static get HI() {
        return undefined;
    }
    static get encoding() {
        return charwise;
    }
}