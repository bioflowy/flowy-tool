import { describe, expect, it } from "vitest";
import { bind_input, generate_arg } from "./builder";
import { InputArray, InputParameter, InputRecord } from "./types";

describe('two plus two is four', () => {
  
  it("with prefix",()=>{
    expect(generate_arg({datum:2,prefix:"-m",separate:true})).toStrictEqual(["-m","2"])
  })
});

describe('input bind', () => {
  
  it("with prefix",()=>{
    const inputSchema = new InputRecord({
      type:"record",
      fields: [
        new InputParameter(
        {
          type:"org.w3id.cwl.cwl.File",
          name:"reference",
          inputBinding:{position:[2],separate:true}
        })
      ]
    })
    const datum = {
      reference:{
      class:"File",location:"/test.txt"
    },
    }
    const [binding,files] = bind_input(inputSchema,datum,true)
    console.log(binding)
    console.log(files)
    expect(binding[0]).toStrictEqual(
      {
        position:[2,'reference'],
        datum:{class:"File",location:"/test.txt"},
        separate:true
      })
  })
  it("with array",()=>{
    const inputSchema = new InputRecord({
      type:"record",
      name :"input_record",
      fields:[new InputParameter({
        name: "reads",
      type: new InputArray({
        type: "array",
        items: "org.w3id.cwl.cwl.File",
      })
    })
    ],
      inputBinding: { position: [3] ,separate:true}
    })
    const reads  = [
      {
          "class": "File",
          "location": "example_human_Illumina.pe_1.fastq"
      },
      {
          "class": "File",
          "location": "example_human_Illumina.pe_2.fastq"
      }
  ]
    const [binding,files] = bind_input(inputSchema,{reads:reads},true)
    expect(binding).toStrictEqual(
      [
        {datum:reads[0],position:[3,'reads',0,0,'reads','reads'],separate:true},
        {datum:reads[1],position:[3,'reads',1,0,'reads','reads'],separate:true},
        {datum:reads,position:[3,'reads'],separate:true},
      ]
    )
    expect(files.length).toBe(2)
    })
  });