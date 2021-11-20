import { getProp } from "../lib/utils.js";
import { expect } from "chai";

describe("Utils (module)", () => {
    it("should return undefined if no Object provided", () => {
        expect(getProp(undefined, "test")).to.be.equal(undefined)
    })
    it("should return undefined if Object Property not there", () => {
        expect(getProp({}, "test")).to.be.equal(undefined)
    })
    it("should return Property on neseted input", () => {
        expect(getProp({test: {value: true}}, "test.value")).to.be.equal(true)
    })
})