import { Builder, Files } from "./builder";
import { PathMapper } from "./pathmapper";
import { RuntimeContext } from "./runtimecontext";

export type JobCommand ={
  basedir: string,
  command: string[],
  files: Files
}
export abstract class JobBase {
  pathmapper: PathMapper;
  outdir: string = "";
  tmpdir: string = "";
  stagedir: string = "";
  builder: Builder
  constructor(pathmapper: PathMapper,builder: Builder,basedir: string,outdir: string, tmpdir: string, stagedir: string){
    this.pathmapper = pathmapper
    this.outdir = outdir
    this.tmpdir = tmpdir
    this.stagedir = stagedir
    this.builder = builder  
  }
  abstract  run( runtimeContext: RuntimeContext):JobCommand
}
export class CommandLineJob extends JobBase {
  constructor(pathmapper: PathMapper,builder: Builder,basedir: string,outdir: string, tmpdir: string, stagedir: string){
    super(pathmapper,builder,basedir,outdir,tmpdir,stagedir)
  }
  run( runtimeContext: RuntimeContext):JobCommand{
    const commands:string[] = []
    for (const binding of this.builder.bindings) {
      commands.push(...this.builder.generate_arg(binding))
    }
    return {
      basedir: runtimeContext.basedir??"",
      command:commands,
      files: this.builder.files
    }
  }
}