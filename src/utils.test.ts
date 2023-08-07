import { describe, expect, it } from "vitest";
import { createTmpDir, executeCommand } from "./utils";

describe('executeCommand',async  () => {
    it("exec command and get lines of stdout",async () => {
        const rslt = []
        for await (const line of executeCommand('seq', ['2'])) {
            rslt.push(line)
        }
        expect(rslt).toStrictEqual(["1","2"])            
    })
    it("createTmpDir",async () => {
        const mkdir = createTmpDir("/tmp/flowy-tool-")
        expect(mkdir).toStrictEqual("/tmp/flowy-tool-")            
    })

})  