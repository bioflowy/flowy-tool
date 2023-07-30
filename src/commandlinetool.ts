import * as cwlTsAuto from 'cwl-ts-auto'
import { Process, avroize_type, fill_in_defaults } from "./process";
import { LoadingContext } from "./loadingcontext";
import { Builder } from './builder';
import { CWLObjectType } from './types';
import { PathMapper } from './pathmapper';
import * as pathlib from 'path';

export class CommandLineTool extends Process {
  constructor(tool:cwlTsAuto.CommandLineTool,loadingContext:LoadingContext) {
    super(tool,loadingContext)
  }
  exportJson():string{
    return JSON.stringify(this,null,2)
  }

}

export function check_adjust(pathmapper:PathMapper, builder: Builder, file_o: CWLObjectType): CWLObjectType{
// """
// Map files to assigned path inside a container.

// We need to also explicitly walk over input, as implicit reassignment
// doesn't reach everything in builder.bindings
// """
  const path = pathmapper.mapper(file_o["location"]).target
  file_o["path"] = path
  let basename = file_o["basename"]
  let parsedPath = pathlib.parse(path);
  const dn = parsedPath.dir
  const bn = parsedPath.base
  if(file_o["dirname"] != dn){
      file_o["dirname"] = dn
  }
  if( basename != bn){
    basename = bn
    file_o["basename"] = bn
  }
  if(file_o["class"] == "File"){
    if( file_o["nameroot"] != parsedPath.name){
        file_o["nameroot"] = parsedPath.name
    }
    if(file_o["nameext"] != parsedPath.ext){
        file_o["nameext"] = parsedPath.ext
    }
  }
return file_o
}
