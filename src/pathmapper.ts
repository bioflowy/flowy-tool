import path from "path";
import fs from "fs";
import { CWLObjectType } from "./types";
import { generateUuid } from "./id_utils";
export type PathType = "File" | "Directory" | "CreateFile" | "WritableFile"| "WritableDirectory" | "CreateWritableFile"

export type MapperEnt = {
  // The "real" path on the local file system 
  // (after resolving relative paths and traversing symlinks
  resolved: string, 
  // The path on the target file system (under stagedir)
  target: string, 
  // The object type.
  type: PathType, 
  // If the File has been staged yet
  staged: boolean,
}

export class PathMapper {
  mapper(src: string) :MapperEnt {
    // TODO implement this
  // if(src.includes("#")){
  //     const i = src.indexOf("#")
  //     p = self._pathmap[src[:i]]
  //     return MapperEnt(p.resolved, p.target + src[i:], p.type, p.staged)
  // }
  return this._pathmap[src]
}
  _pathmap: {[key:string]: MapperEnt}
  stagedir: string
  separateDirs: boolean
  basedir: string
  constructor(stagedir: string, separateDirs: boolean, referenced_files: {[key:string]:any}[], basedir: string){
    this._pathmap = {}
    this.stagedir = stagedir
    this.basedir = basedir
    this.separateDirs = separateDirs
    this.setup(referenced_files, basedir)

  }

  setup(referenced_files: {[key:string]:any}[], basedir: string){
  // Go through each file and set the target to its own directory along
  // with any secondary files.
  let stagedir = this.stagedir
  for(const fob of referenced_files){
      if(this.separateDirs){
          stagedir = path.join(this.stagedir, "stg" + generateUuid())
      }
      const cp = fob["writable"] === true?? false
      this.visit(
          fob,
          stagedir,
          basedir,
          cp,
          true,
      )
    }
  }
    visit(
      obj: CWLObjectType,
      stagedir_def: string,
      basedir: string,
      copy: boolean = false,
      staged: boolean = false,
  ){
      const stagedir = obj["dirname"]??stagedir_def
      const location = obj["location"]
      const basename = "basename" in obj? obj["basename"]: path.basename(location)
      const tgt = path.join(
          stagedir,
          basename)
      if(location in this._pathmap){
          return
      }
      const class_ = obj["class"];
      if(obj["class"] === "Directory"){
        let resolved = ""
          if(location.startswith("file://")){
              resolved = location
          }else{
              resolved = location
              this._pathmap[location] = {
                resolved,
                target: tgt, 
                type: copy? "WritableDirectory":"Directory",
                staged: staged
              }
          if(location.startswith("file://")){
              staged = false
            this.visitlisting(
                obj["listing"]??[],
                tgt,
                basedir,
                copy=copy,
                staged=staged,
            )
          }
        }
      }else if(class_ === "File"){
          const lpath = location as string
            const ab = path.join(basedir,lpath)
            if("contents" in obj && lpath.startsWith("_:")){
              this._pathmap[lpath] = {
                resolved:obj["contents"],
                target:  tgt,
                type:  copy?"CreateWritableFile":"CreateFile",
                  staged,
                }
              }else{
              // with SourceLine(
              //     obj,
              //     "location",
              //     ValidationException,
              //     _logger.isEnabledFor(logging.DEBUG),
              // ):
                  let deref = ab
                  // TODO http not supported now
                  // if(urllib.parse.urlsplit(deref).scheme in ["http", "https"]){
                  //     deref, _last_modified = downloadHttpFile(path)
                  // }else{
                  let st = fs.lstatSync(deref);
                  while (st.isSymbolicLink()) {
                      let rl = fs.readlinkSync(deref);
                      deref = path.isAbsolute(rl) ? rl : path.join(path.dirname(deref), rl);
                      st = fs.lstatSync(deref);
                  }
                  this._pathmap[lpath] = {
                    resolved:deref,
                    target: tgt,
                    type :copy? "WritableFile":"File",
                    staged: staged,
                  }
                  
          this.visitlisting(
              obj["secondaryFiles"]??[],
              stagedir,
              basedir,
              copy=copy,
              staged=staged,
          )
              }
            }
    }
    visitlisting(
      listing: CWLObjectType[],
      stagedir: string,
      basedir: string,
      copy: boolean = false,
      staged: boolean = false,
  ) {
      for(const ld of listing){
          this.visit(
              ld,
              stagedir,
              basedir,
              copy=ld["writable"]??copy,
              staged=staged,
          )
        }
      }
  items(): [string, MapperEnt][]{
    return Object.entries(this._pathmap)
  }

}