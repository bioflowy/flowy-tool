import * as cwlTsAuto from 'cwl-ts-auto'
import url from 'url';
import path from 'path';

export type EnvDict = {[key:string]: string}
export class CWLFile {
  readonly name: string;
  readonly basename: string;
  path?: string;
  readonly location: string;
  constructor(name: string,location:string ) {
    this.name = name;
    this.location = location;
    this.basename = path.basename(location)
  }
}
export class CWLDirectory {
  readonly name: string;
  readonly location: string;
  path?: string;
  constructor(name: string,location:string ) {
    this.name = name;
    this.location = location;
  }
}
export type InputBinding = {
  datum?: string | number | boolean | object | object[]
  position?: (string|number)[],
  valueFrom?: string,
  prefix?: string,
  separate: boolean,
  itemSeparator?: string,
}
export type CWLOutputType = string | number | Object | Array<CWLOutputType>
export type CWLObjectType = {[key:string]:any}
// compare InputBinding by position
export function compareInputBinding(a:InputBinding,b:InputBinding):number{
  if (!a.position) {
    return -1
  }
  if (!b.position) {
    return 1
  }
  const maxIndex = Math.max(a.position.length,b.position.length)
  for (let index = 0; index < maxIndex; index++) {
    const i = index < a.position.length? a.position[index]:undefined;
    const j = index < b.position.length? b.position[index]:undefined;
    if(i === j){
      continue
    }
    if(i === undefined){
      return -1
    }
    if(j === undefined){
      return 1
    }
    if (typeof i === "string" || typeof j === "string"){
      return String(i) > String(j) ? 1 : -1
    }
    return i > j ? 1: -1
    
  }
  return 0
}
export function convertCommandLineBinding(input:cwlTsAuto.CommandLineBinding):InputBinding{
  return {
    position:input.position?[input.position]:undefined,
    prefix:input.prefix,
    separate:input.separate??true,
    itemSeparator:input.itemSeparator,
    valueFrom:input.valueFrom,
  }
}
export function convertType(value:cwlTsAuto.CWLType | cwlTsAuto.stdin | cwlTsAuto.CommandInputRecordSchema | cwlTsAuto.CommandInputEnumSchema | cwlTsAuto.CommandInputArraySchema | string | Array<cwlTsAuto.CWLType | cwlTsAuto.CommandInputRecordSchema | cwlTsAuto.CommandInputEnumSchema | cwlTsAuto.CommandInputArraySchema | string>):
    string | InputArray| InputRecord | string[]{
  if (typeof value === 'string') {
    return value
  }else if(value instanceof cwlTsAuto.CommandInputArraySchema){
    return convertToInputArray(value)
  }else if(value instanceof cwlTsAuto.CommandInputRecordSchema){
    return convertToInputRecord(value)
  }else if (value instanceof Array) {
    const vs = value.map((v) =>{
      if (typeof v !== 'string') {
        new Error("Unsupported type");
      }
      return v as string
    })
    return vs;
  }
  throw new Error("Unsupported type");
}
type InputParameterParams = {default_?: any,
  streamable?: boolean,
  type: string | string[] | InputArray | InputRecord,
  format?: string | string[],
  secondaryFiles?: string,
  name?: string,
  inputBinding?: InputBinding
}
export class InputParameter {
  hasType(type: string):boolean {
    if (this.type instanceof Array) {
      return this.type.includes(type)
    }else if (typeof this.type === 'string') {
      return this.type === type
    }
    return false
  }
  default?: any
  streamable: boolean
  format?: string | string[]
  secondaryFiles?: string
  type: string | string[] | InputArray | InputRecord
  name?: string
  inputBinding?: InputBinding
  constructor(d:InputParameterParams) {
      this.default = d.default_
      this.streamable = d.streamable??false
      this.format = d.format
      this.secondaryFiles = d.secondaryFiles
      this.type = d.type
      this.name = d.name
      this.inputBinding = d.inputBinding
  }
}
function shortname(inputId: string): string {
  let d = url.parse(inputId);
  if (d.hash) {
      return d.hash.replace('#','').split("/").pop() || "";
  }
  return (d.pathname || "").split("/").pop() || "";
}
export class InputArray extends InputParameter{
  copy() :InputArray{
    return new InputArray({
      streamable:this.streamable,
      format:this.format,
      secondaryFiles:this.secondaryFiles,
      type:this.type,
      name:this.name,
      inputBinding:this.inputBinding,
      items:this.items
      });
  }
  items:string
  constructor(input:InputParameterParams & {items: string}) {
    super(input)
    this.items = input.items
  }
}
export class InputRecord extends InputParameter{
  fields?: InputParameter[]
  constructor(input:InputParameterParams & {fields?: InputParameter[]}) {
    super(input)
    this.fields = input.fields
  }
}

function convertToInputArray(input :cwlTsAuto.CommandInputArraySchema):InputArray {
  if (typeof input.items !== 'string') {
    throw new Error("Unsupported type");
  }
  return new InputArray(
    {
     type:"array",
      name: input.name?shortname(input.name):undefined,
      inputBinding:input.inputBinding?convertCommandLineBinding(input.inputBinding):undefined,
      items: input.items
  })
}
function convertToInputRecord(input :cwlTsAuto.CommandInputRecordSchema):InputRecord {
  return new InputRecord({
    type:"record",
    name: input.name?shortname(input.name):undefined,
    inputBinding:input.inputBinding?convertCommandLineBinding(input.inputBinding):undefined,
    fields: input.fields?.map((field) => convertToInputParameter(field))})
}
export function convertToInputParameter(
  input:cwlTsAuto.CommandInputParameter|cwlTsAuto.CommandInputArraySchema|cwlTsAuto.CommandInputRecordSchema):InputParameter {
  if(input instanceof cwlTsAuto.CommandInputArraySchema){
      return convertToInputArray(input)
  }else if(input instanceof cwlTsAuto.CommandInputRecordSchema){
      return convertToInputRecord(input)
  }else if(input instanceof cwlTsAuto.CommandInputParameter){
    return new InputParameter( {
      default_:input.default_,
      streamable: input.streamable??false,
      type: convertType(input.type),
      format: input.format,
      name:input.id?shortname(input.id):undefined,
      inputBinding:input.inputBinding?convertCommandLineBinding(input.inputBinding):undefined})
    }
  throw new Error("Unsupported type");
}
