import { ValidationException } from "cwl-ts-auto"
import { CWLDirectory, CWLFile, InputArray, InputRecord, InputBinding, InputParameter} from "./types"
import ivm from 'isolated-vm';

type CWLObjectType = object
export type Files = (CWLFile | CWLDirectory)[]

type CWLValue = boolean | Array<any> | object | CWLFile | CWLDirectory | number
function isMutableSequence(value:any) :value is Array<any> {
  if (Array.isArray(value)){
    return true;
  }else{
    return false;
  }
}
function tostr(value:any):string {
  return String(value);
}
export class Builder {
  job : CWLObjectType
  files : Files
  bindings: InputBinding[]
  constructor(job: CWLObjectType, files: Files, bindings: InputBinding[]){
    this.job = job
    this.files = files
    this.bindings = bindings
  }
  
  generate_arg(binding: InputBinding):string[]{
    let value = binding.datum
    // debug = _logger.isEnabledFor(logging.DEBUG)
    if(binding.valueFrom){
      const result = do_eval(binding.valueFrom)
      value = result
    }
    const prefix = binding.prefix
    if(prefix === null && binding.separate){
      throw new Error("'separate' option can not be specified without prefix");
      
    }

    let argl: Array<any> = []
    if(isMutableSequence(value)){
        if(binding.itemSeparator && value){
            argl = [value.map((v)=>String(v)).join(binding.itemSeparator)]
        }else if(binding.valueFrom){
          // Todo
            // value = [self.tostr(v) for v in value]
            // return cast(List[str], ([prefix] if prefix else [])) + cast(List[str], value)
        }else if(prefix && value){
            return [prefix]
        }else{
            return []
        }
    }else if(value instanceof Object){
      if ('class' in value && 'path' in value &&
       (value['class'] === 'File' || value['class'] === 'Directory')) {
        argl = [value['path']]   
      }else{
        return prefix?[prefix] : []
      }
    }else if(value === true && prefix){
        return [prefix]
    }else if( value === false || value === undefined || (value == true && !prefix)){
        return []
    }else{
        argl = [value]
    }

    const args:Array<string | undefined> = []
    for(const j of argl){
        if(binding.separate){
            args.push(prefix)
            args.push(tostr(j))
        }else{
            args.push(binding.prefix?prefix + tostr(j):tostr(j))
      }
    }
    return args.filter((e)=>(e !== undefined)) as string[]
  }
}
export function do_eval2(expr: string) {
  // 新しいIsolateを作成する
  const isolate = new ivm.Isolate({ memoryLimit: 128 });

  // 新しいContextを作成する
  const context = isolate.createContextSync();

  // Contextに基本的なconsole.log関数を注入する
  context.global.setSync('runtime',new ivm.ExternalCopy( {cores:2}).copyInto());

  // Contextにスクリプトを実行する
  const script = isolate.compileScriptSync(expr);
  return script.runSync(context);
}
 export function do_eval(expr: String):string{
  let newStr = expr.replace(/\$\((.*?)\)/g, (r, expr) => {
    // ここで特定の処理を行います。この例ではp1を大文字に変換します
    const result = do_eval2(expr)
    return String(result)
  });
  return newStr
}
function asList(value: any): (string|number)[] {
  if (value === undefined){
    return [];
  }else if(Array.isArray(value)){
    return value;
  }else{
    return [value];
  }
}
function asListForTail(value: string | number[] | undefined): (number | string)[] {
  if (value === undefined){
    return [];
  }else if(Array.isArray(value)){
    return value;
  }else{
    return [value];
  }
}

export function bind_input(
  schema: InputParameter,
  datum: CWLObjectType | CWLObjectType[],
  discover_secondaryFiles: boolean,
  lead_pos: number | number[] = [],
  tail_pos: string | number[] = [],
): [InputBinding[],Files] {
  // Bind an input object to the command line.

  // :raises ValidationException: in the event of an invalid type union
  // :raises WorkflowException: if a CWL Expression ("position", "required",
  //   "pattern", "format") evaluates to the wrong type or if a required
  //   secondary file is missing
  // """
  // debug = _logger.isEnabledFor(logging.DEBUG)


  const bindings: InputBinding[] = []
  let binding: InputBinding | undefined = undefined
  let value_from_expression = false
  const files:(CWLFile|CWLDirectory)[] = []
  if (schema.inputBinding){
      binding = {...schema.inputBinding}
       const bp  = [...asList(lead_pos) as (string|number)[]]
       if (binding && binding.position){
          const position = binding.position
           if (typeof position === 'string'){  // no need to test the CWL Version
               // TODO evaluate the expression
               // the schema for v1.0 only allow ints
              //  result = self.do_eval(position, context=datum)
              //  if not isinstance(result, int):
              //      raise SourceLine(
              //          schema["inputBinding"], "position", WorkflowException, debug
              //      ).makeError(
              //          "'position' expressions must evaluate to an int, "
              //          f"not a {type(result)}. Expression {position} "
              //          f"resulted in {result!r}."
              //      )
              //  binding["position"] = result
              //  bp.append(result)
           }else{
               bp.push(...asList(binding.position))
           }
      }else{
           bp.push(0)
      }
       const t = asListForTail(tail_pos)
       bp.push(...t)
       binding.position = bp

      binding.datum = datum
      if(binding.valueFrom){
          value_from_expression = true
      }
  }
  // # Handle union types
  if(schema.type instanceof Array){
      let bound_input = false
      for(const t in schema.type){
          let avsc:InputRecord | undefined = undefined
          // TODO
          // if(isinstance(t, str) && self.names.has_name(t, None)){
          //     avsc = self.names.get_name(t, None)
          // }else if (
          //     isinstance(t, MutableMapping)
          //     and "name" in t
          //     and self.names.has_name(cast(str, t["name"]), None)
          // ){
          //     avsc = self.names.get_name(cast(str, t["name"]), None)
          // }
          // if(!avsc){
          //     avsc = make_avsc_object(convert_to_dict(t), self.names)
          // }
          // if(validate(avsc, datum, vocab=INPUT_OBJ_VOCAB)){
          //     schema = deepClone(schema)
          //     schema["type"] = t
          //     if(!value_from_expression){
          //         return bind_input(
          //             schema,
          //             datum,
          //             lead_pos=lead_pos,
          //             tail_pos=tail_pos,
          //             discover_secondaryFiles=discover_secondaryFiles,
          //         )
          //         }else{
          //         bind_input(
          //             schema,
          //             datum,
          //             lead_pos=lead_pos,
          //             tail_pos=tail_pos,
          //             discover_secondaryFiles=discover_secondaryFiles,
          //         )
          //         bound_input = true
          }
      if(!bound_input){
          throw new ValidationException(
              `'${datum}' is not a valid union ${schema.type}`
          )
      }
    }else if(schema.type instanceof InputArray){
      if (
          binding
          && schema.type.inputBinding == undefined
          && binding.itemSeparator == undefined
      ){
        const st = schema.type.copy()
        st.inputBinding = {separate:false}
        st.streamable = schema.streamable
        st.format = schema.format
        st.secondaryFiles = schema.secondaryFiles
          // TODO
          // if value_from_expression:
          //     self.bind_input(
          //         st,
          //         datum,
          //         lead_pos=lead_pos,
          //         tail_pos=tail_pos,
          //         discover_secondaryFiles=discover_secondaryFiles,
          //     )
          //     }else{
            const [bis, fs] = bind_input(
              st,
              datum,
              discover_secondaryFiles=discover_secondaryFiles,
              lead_pos = lead_pos,
              tail_pos=tail_pos,
          )
            bindings.push(...bis)
            files.push(...fs)
      }
    }
  // else:
  //     if schema["type"] == "org.w3id.cwl.salad.Any":
  //         if isinstance(datum, dict):
  //             if datum.get("class") == "File":
  //                 schema["type"] = "org.w3id.cwl.cwl.File"
  //             elif datum.get("class") == "Directory":
  //                 schema["type"] = "org.w3id.cwl.cwl.Directory"
  //             else:
  //                 schema["type"] = "record"
  //                 schema["fields"] = [
  //                     {"name": field_name, "type": "Any"} for field_name in datum.keys()
  //                 ]
  //         elif isinstance(datum, list):
  //             schema["type"] = "array"
  //             schema["items"] = "Any"

  //     if schema["type"] in self.schemaDefs:
  //         schema = self.schemaDefs[cast(str, schema["type"])]

      if(schema instanceof InputRecord){
          const datum1 = datum as {[object:string]:any}
          for(const f of schema.fields??[]){
              const name = f.name
              if(name){
                if(name in datum1 && datum1[name] !== undefined){
                  const [bis, fs] = bind_input(
                    f,
                    datum1[name],
                    discover_secondaryFiles=discover_secondaryFiles,
                    lead_pos=lead_pos,
                    tail_pos=name,
                )
                  bindings.push(...bis)
                  files.push(...fs)
                }else{
                  datum1[name] = f.default
                }

              }
            }
          }else if(schema instanceof InputArray){
        const array = datum as any[]
        for (let n = 0; n < array.length; n++) {
          const item = array[n];
          let b2:InputBinding | undefined = undefined
          if(binding){
              b2 = {...binding}
              b2["datum"] = item
              const itemschema: InputParameter = new InputParameter(
                { format: schema.format,
                  inputBinding: b2 as InputBinding,
                streamable: schema.streamable,
                type: schema.items,
              })
              const [new_binding,fs] = bind_input(
                itemschema,
                item,
                discover_secondaryFiles,
                lead_pos=[n],
                tail_pos=tail_pos,
              )
              bindings.push(...new_binding)
              files.push(...fs)
          }
          }   
          binding = undefined
        }

  //     def _capture_files(f: CWLObjectType) -> CWLObjectType:
  //         self.files.append(f)
  //         return f

      if(schema.type == "org.w3id.cwl.cwl.File"){
          const file:CWLFile =  datum as CWLFile;
          files.push(file)

          // loadContents_sourceline: Union[
          //     None, MutableMapping[str, Union[str, List[int]]], CWLObjectType
          // ] = None
          // if binding and binding.get("loadContents"):
          //     loadContents_sourceline = binding
          // elif schema.get("loadContents"):
          //     loadContents_sourceline = schema

          // if loadContents_sourceline and loadContents_sourceline["loadContents"]:
          //     with SourceLine(
          //         loadContents_sourceline,
          //         "loadContents",
          //         WorkflowException,
          //         debug,
          //     ):
          //         try:
          //             with self.fs_access.open(cast(str, datum["location"]), "rb") as f2:
          //                 datum["contents"] = content_limit_respected_read(f2)
          //         except Exception as e:
          //             raise Exception("Reading {}\n{}".format(datum["location"], e)) from e

  //         if "secondaryFiles" in schema:
  //             if "secondaryFiles" not in datum:
  //                 datum["secondaryFiles"] = []
  //                 sf_schema = aslist(schema["secondaryFiles"])
  //             elif not discover_secondaryFiles:
  //                 sf_schema = []  # trust the inputs
  //             else:
  //                 sf_schema = aslist(schema["secondaryFiles"])

  //             for num, sf_entry in enumerate(sf_schema):
  //                 if "required" in sf_entry and sf_entry["required"] is not None:
  //                     required_result = self.do_eval(sf_entry["required"], context=datum)
  //                     if not (isinstance(required_result, bool) or required_result is None):
  //                         if sf_schema == schema["secondaryFiles"]:
  //                             sf_item: Any = sf_schema[num]
  //                         else:
  //                             sf_item = sf_schema
  //                         raise SourceLine(
  //                             sf_item, "required", WorkflowException, debug
  //                         ).makeError(
  //                             "The result of a expression in the field "
  //                             "'required' must "
  //                             f"be a bool or None, not a {type(required_result)}. "
  //                             f"Expression {sf_entry['required']!r} resulted "
  //                             f"in {required_result!r}."
  //                         )
  //                     sf_required = required_result
  //                 else:
  //                     sf_required = True

  //                 if "$(" in sf_entry["pattern"] or "${" in sf_entry["pattern"]:
  //                     sfpath = self.do_eval(sf_entry["pattern"], context=datum)
  //                 else:
  //                     sfpath = substitute(cast(str, datum["basename"]), sf_entry["pattern"])

  //                 for sfname in aslist(sfpath):
  //                     if not sfname:
  //                         continue
  //                     found = False

  //                     if isinstance(sfname, str):
  //                         d_location = cast(str, datum["location"])
  //                         if "/" in d_location:
  //                             sf_location = (
  //                                 d_location[0 : d_location.rindex("/") + 1] + sfname
  //                             )
  //                         else:
  //                             sf_location = d_location + sfname
  //                         sfbasename = sfname
  //                     elif isinstance(sfname, MutableMapping):
  //                         sf_location = sfname["location"]
  //                         sfbasename = sfname["basename"]
  //                     else:
  //                         raise SourceLine(
  //                             sf_entry, "pattern", WorkflowException, debug
  //                         ).makeError(
  //                             "Expected secondaryFile expression to "
  //                             "return type 'str', a 'File' or 'Directory' "
  //                             "dictionary, or a list of the same. Received "
  //                             f"{type(sfname)!r} from {sf_entry['pattern']!r}."
  //                         )

  //                     for d in cast(
  //                         MutableSequence[MutableMapping[str, str]],
  //                         datum["secondaryFiles"],
  //                     ):
  //                         if not d.get("basename"):
  //                             d["basename"] = d["location"][d["location"].rindex("/") + 1 :]
  //                         if d["basename"] == sfbasename:
  //                             found = True

  //                     if not found:

  //                         def addsf(
  //                             files: MutableSequence[CWLObjectType],
  //                             newsf: CWLObjectType,
  //                         ) -> None:
  //                             for f in files:
  //                                 if f["location"] == newsf["location"]:
  //                                     f["basename"] = newsf["basename"]
  //                                     return
  //                             files.append(newsf)

  //                         if isinstance(sfname, MutableMapping):
  //                             addsf(
  //                                 cast(
  //                                     MutableSequence[CWLObjectType],
  //                                     datum["secondaryFiles"],
  //                                 ),
  //                                 sfname,
  //                             )
  //                         elif discover_secondaryFiles and self.fs_access.exists(sf_location):
  //                             addsf(
  //                                 cast(
  //                                     MutableSequence[CWLObjectType],
  //                                     datum["secondaryFiles"],
  //                                 ),
  //                                 {
  //                                     "location": sf_location,
  //                                     "basename": sfname,
  //                                     "class": "File",
  //                                 },
  //                             )
  //                         elif sf_required:
  //                             raise SourceLine(
  //                                 schema,
  //                                 "secondaryFiles",
  //                                 WorkflowException,
  //                                 debug,
  //                             ).makeError(
  //                                 "Missing required secondary file '%s' from file object: %s"
  //                                 % (sfname, json_dumps(datum, indent=4))
  //                             )

  //             normalizeFilesDirs(
  //                 cast(MutableSequence[CWLObjectType], datum["secondaryFiles"])
  //             )

  //         if "format" in schema:
  //             eval_format: Any = self.do_eval(schema["format"])
  //             if isinstance(eval_format, str):
  //                 evaluated_format: Union[str, List[str]] = eval_format
  //             elif isinstance(eval_format, MutableSequence):
  //                 for index, entry in enumerate(eval_format):
  //                     message = None
  //                     if not isinstance(entry, str):
  //                         message = (
  //                             "An expression in the 'format' field must "
  //                             "evaluate to a string, or list of strings. "
  //                             "However a non-string item was received: "
  //                             f"{entry!r} of type {type(entry)!r}. "
  //                             f"The expression was {schema['format']!r} and "
  //                             f"its fully evaluated result is {eval_format!r}."
  //                         )
  //                     if expression.needs_parsing(entry):
  //                         message = (
  //                             "For inputs, 'format' field can either "
  //                             "contain a single CWL Expression or CWL Parameter "
  //                             "Reference, a single format string, or a list of "
  //                             "format strings. But the list cannot contain CWL "
  //                             "Expressions or CWL Parameter References. List "
  //                             f"entry number {index+1} contains the following "
  //                             "unallowed CWL Parameter Reference or Expression: "
  //                             f"{entry!r}."
  //                         )
  //                     if message:
  //                         raise SourceLine(
  //                             schema["format"], index, WorkflowException, debug
  //                         ).makeError(message)
  //                 evaluated_format = cast(List[str], eval_format)
  //             else:
  //                 raise SourceLine(schema, "format", WorkflowException, debug).makeError(
  //                     "An expression in the 'format' field must "
  //                     "evaluate to a string, or list of strings. "
  //                     "However the type of the expression result was "
  //                     f"{type(eval_format)}. "
  //                     f"The expression was {schema['format']!r} and "
  //                     f"its fully evaluated result is {eval_format!r}."
  //                 )
  //             try:
  //                 check_format(
  //                     datum,
  //                     evaluated_format,
  //                     self.formatgraph,
  //                 )
  //             except ValidationException as ve:
  //                 raise WorkflowException(
  //                     f"Expected value of {schema['name']!r} to have "
  //                     f"format {schema['format']!r} but\n {ve}"
  //                 ) from ve

  //         visit_class(
  //             datum.get("secondaryFiles", []),
  //             ("File", "Directory"),
  //             _capture_files,
  //         )
      }
      if (schema.type == "org.w3id.cwl.cwl.Directory"){
          const directory = datum as CWLDirectory
          // ll = schema.get("loadListing") or self.loadListing
          // if ll and ll != "no_listing":
          //     get_listing(
          //         self.fs_access,
          //         datum,
          //         (ll == "deep_listing"),
          //     )
          files.push(directory)
      }

  //     if schema["type"] == "Any":
  //         visit_class(datum, ("File", "Directory"), _capture_files)

  // # Position to front of the sort key
  if(binding){
      for(const bi of bindings){
          bi.position = (binding["position"] as number[]).concat(bi.position as number[])
        }
      bindings.push(binding)
    }
  return [bindings,files]
}
