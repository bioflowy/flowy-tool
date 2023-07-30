import * as path from 'path';
import * as tmp from 'tmp';

export function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value))
}
export function visit_class(rec: any, cls: any[], op: (args:any)=>void) :void {
    /// Apply a function to with "class" in cls."""
    if(Array.isArray(rec)){
      for(const d of rec){
        visit_class(d, cls, op)
      }
    }else if(rec instanceof Object){
        if("class" in rec && cls.includes(rec["class"])){
            op(rec)
        }
        for( const d of Object.keys(rec)){
            visit_class(rec[d], cls, op)
        }
      }
}
export function getRandomDir(): string {
  return '/' + makeId(6);
}

function makeId(length: number): string {
  let result = '';
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  const charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}
export function asList<T>(input: T | T[] | undefined): T[]|undefined {
  if (input === undefined) {
      return undefined;
  } else if (Array.isArray(input)) {
      return input;
  } else {
      return [input];
  }
}

export function createTmpDir(tmpdirPrefix: string): string {
  let tmpDir = path.dirname(tmpdirPrefix);
  let tmpPrefix = path.basename(tmpdirPrefix);
  let tempDirObj = tmp.dirSync({ tmpdir: tmpDir, prefix: tmpPrefix });

  return tempDirObj.name;
}