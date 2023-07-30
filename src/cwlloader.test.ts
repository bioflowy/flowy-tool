import { describe, expect, it } from "vitest";
import { loadDocument } from "./cwlloader";
import { executeTool } from "./cwlexecutor";

describe("add", () => {
  it("1 + 2 = 3",async () => {
    const doc = await loadDocument("tests/bwa-mem-tool.cwl")
    expect(doc.cwlVersion).toBe("v1.2")
    executeTool(doc)
  });
});