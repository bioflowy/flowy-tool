import * as path from 'path';
import * as tmp from 'tmp';
import fs from 'fs'
import os from 'os'
import { exec,ExecException,spawn } from 'child_process';

export const DEFAULT_TMP_PREFIX = path.join(os.tmpdir(), path.sep,"flowy-tool-");

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
export function asList<T>(input: T | T[] | undefined): T[]|undefined {
  if (input === undefined) {
      return undefined;
  } else if (Array.isArray(input)) {
      return input;
  } else {
      return [input];
  }
}
export function copyTo<T>(src:{[key:string]:T},dist:{[key:string]:T}) {
  for (const key in src) {
    if (Object.prototype.hasOwnProperty.call(src, key)) {
      dist[key] = src[key];
    }
  }
}
export function check_call(command:string[]): Promise<{error:ExecException | null, stdout:string, stderr:string}> {
  return new Promise((resolve)=> {
    exec(command.join(" "),(err, stdout, stderr) => {
      resolve({error:err, stdout:stdout, stderr:stderr})
    })
  })
}
export async function pathExists(filePath: string): Promise<boolean> {
  try {
      await fs.promises.access(filePath);
      return true;
  } catch {
      return false;
  }
}

export function createTmpDir(tmpdirPrefix: string): string {
  const tmpDir = path.dirname(tmpdirPrefix);
  const tmpPrefix = path.basename(tmpdirPrefix);
  const tmp2 = tmp.dirSync({ dir: tmpDir, prefix: tmpPrefix, unsafeCleanup: true });
  return tmp2.name
}
export async function* executeCommand(command: string, args: string[] = []): AsyncGenerator<string> {
  const cmd = spawn(command, args);

  let dataBuffer = "";

  for await (const data of cmd.stdout) {
      dataBuffer += data;
      let lineEnd;

      while ((lineEnd = dataBuffer.indexOf('\n')) >= 0) {
          const line = dataBuffer.slice(0, lineEnd);
          dataBuffer = dataBuffer.slice(lineEnd + 1);
          yield line;
      }
  }

  if (dataBuffer.length > 0) {
      yield dataBuffer;
  }
}