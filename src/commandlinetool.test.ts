import { describe, expect, it } from "vitest";
import { loadDocument } from "./cwlloader";
import fs from 'fs';
import { CommandLineTool} from "./commandlinetool";
import { defaultRuntimeContext } from "./runtimecontext";
import { load_job_order } from "./main";
import * as pathlib from 'path';

describe('two plus two is four', () => {
  
  it("with prefix",async ()=>{
    const doc = await loadDocument("tests/bwa-mem-tool.cwl")
    const [joborder,basedir] = load_job_order("tests/bwa-mem-job.json")
    const loadingContext = {};
    const commandlinetool = new CommandLineTool(doc,loadingContext);
    defaultRuntimeContext.basedir = basedir;
    const comandlineJob = commandlinetool.job(joborder,defaultRuntimeContext);
    const job = comandlineJob.run(defaultRuntimeContext)
    const command = job.command.map(element => {
      if (element.includes("/")) {
        let parsedPath = pathlib.parse(element);
        return parsedPath.base
      }else{
        return element
      }
    });
    expect(command).toStrictEqual([
      "python", 
      "args.py",
      "bwa", "mem", "-t", '2', "-I", '1,2,3,4', "-m", '3',
      "chr20.fa",
      "example_human_Illumina.pe_1.fastq",
      "example_human_Illumina.pe_2.fastq"])
  })
});
