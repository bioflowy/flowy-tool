import { beforeEach, describe, expect, it, vitest } from "vitest";
import { loadDocument } from "./cwlloader";
import { CommandLineTool} from "./commandlinetool";
import { defaultRuntimeContext } from "./runtimecontext";
import { load_job_order } from "./main";
import * as pathlib from 'path';
import { setMockNumber } from "./id_utils";

describe('two plus two is four', () => {
  beforeEach(()=>{
    setMockNumber(0)
  })
    
  it("bwa-mem-tool",async ()=>{
    const doc = await loadDocument("tests/bwa-mem-tool.cwl")
    const [joborder,basedir] = load_job_order("tests/bwa-mem-job.json")
    const loadingContext = {};
    const commandlinetool = new CommandLineTool(doc,loadingContext);
    defaultRuntimeContext.basedir = basedir;
    const comandlineJob = commandlinetool.job(joborder,defaultRuntimeContext);
    const job = await comandlineJob.run(defaultRuntimeContext)
    expect(job.command).toStrictEqual([
      "python", 
      "/tmp/000001/stg00000000-0000-4000-8000-000000000006/args.py",
      "bwa", "mem", "-t", '2', "-I", '1,2,3,4', "-m", '3',
      "/tmp/000001/stg00000000-0000-4000-8000-000000000003/chr20.fa",
      "/tmp/000001/stg00000000-0000-4000-8000-000000000004/example_human_Illumina.pe_1.fastq",
      "/tmp/000001/stg00000000-0000-4000-8000-000000000005/example_human_Illumina.pe_2.fastq"])
  })
  it("binding-test",async ()=>{
    const doc = await loadDocument("tests/binding-test.cwl")
    const [joborder,basedir] = load_job_order("tests/bwa-mem-job.json")
    const loadingContext = {};
    const commandlinetool = new CommandLineTool(doc,loadingContext);
    defaultRuntimeContext.basedir = basedir;
    const comandlineJob = await commandlinetool.job(joborder,defaultRuntimeContext);
    const job = await comandlineJob.run(defaultRuntimeContext)
    expect(job.command).toStrictEqual([
      "docker",
      "run",
      "-i",
      "--mount=type=bind,source=/tmp/000000,target=/000007",
      "--mount=type=bind,source=/tmp/000002,target=/tmp",
      "--mount=type=bind,source=/home/uehara/flowy-tool/tests/chr20.fa,target=/tmp/000001/stg00000000-0000-4000-8000-000000000003/chr20.fa,readonly",
      "--mount=type=bind,source=/home/uehara/flowy-tool/tests/example_human_Illumina.pe_1.fastq,target=/tmp/000001/stg00000000-0000-4000-8000-000000000004/example_human_Illumina.pe_1.fastq,readonly",
      "--mount=type=bind,source=/home/uehara/flowy-tool/tests/example_human_Illumina.pe_2.fastq,target=/tmp/000001/stg00000000-0000-4000-8000-000000000005/example_human_Illumina.pe_2.fastq,readonly",
      "--mount=type=bind,source=/home/uehara/flowy-tool/tests/args.py,target=/tmp/000001/stg00000000-0000-4000-8000-000000000006/args.py,readonly",
      "--rm",
      "docker.io/python:3-slim",
      "python",
      "/tmp/000001/stg00000000-0000-4000-8000-000000000006/args.py",
      "bwa",
      "mem",
      "/tmp/000001/stg00000000-0000-4000-8000-000000000003/chr20.fa",
      "-XXX",
      "-YYY",
      "/tmp/000001/stg00000000-0000-4000-8000-000000000004/example_human_Illumina.pe_1.fastq",
      "-YYY",
      "/tmp/000001/stg00000000-0000-4000-8000-000000000005/example_human_Illumina.pe_2.fastq",
    ])
  })
},60*1000);
