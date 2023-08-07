import { Builder, Files } from "./builder";
import { Requirement } from "./hints";
import { PathMapper } from "./pathmapper";
import { RuntimeContext } from "./runtimecontext";
import { EnvDict } from "./types";
import { copyTo } from "./utils";

export type JobInitArgs = {
  
}
export type JobConstructor = new(pathmapper: PathMapper,
  builder: Builder,
  requirement: Requirement,
  outdir: string,
  tmpdir: string, 
  stagedir: string) => JobBase;

export type JobCommand ={
  basedir: string,
  command: string[],
  files: Files
}
export abstract class JobBase {
  private environment: EnvDict = {};
  prepare_environment(runtimeContext: RuntimeContext, envVarReq: EnvDict) {
    /* Set up environment variables.

    Here we prepare the environment for the job, based on any
    preserved variables and `EnvVarRequirement`. Later, changes due
    to `MPIRequirement`, `Secrets`, or `SoftwareRequirement` are
    applied (in that order).
    */
    // Start empty
    const env: EnvDict = {}

    // Preserve any env vars
    // if runtimeContext.preserve_entire_environment:
    //     self._preserve_environment_on_containers_warning()
    //     env.update(os.environ)
    // elif runtimeContext.preserve_environment:
    //     self._preserve_environment_on_containers_warning(runtimeContext.preserve_environment)
    //     for key in runtimeContext.preserve_environment:
    //         try:
    //             env[key] = os.environ[key]
    //         except KeyError:
    //             _logger.warning(
    //                 f"Attempting to preserve environment variable {key!r} which is not present"
    //             )

    // Set required env vars
    copyTo(this._required_env(),env)

    // Apply EnvVarRequirement
    copyTo(envVarReq,env)
    // Set on ourselves
    this.environment = env
}
  pathmapper: PathMapper;
  requirement: Requirement;
  outdir: string = "";
  tmpdir: string = "";
  stagedir: string = "";
  builder: Builder
  constructor(pathmapper: PathMapper,builder: Builder,requirement: Requirement,outdir: string, tmpdir: string, stagedir: string){
    this.pathmapper = pathmapper
    this.builder = builder
    this.requirement = requirement
    this.outdir = outdir
    this.tmpdir = tmpdir
    this.stagedir = stagedir
    this.builder = builder  
  }
  abstract run( runtimeContext: RuntimeContext):Promise<JobCommand>
  abstract _required_env(): EnvDict;
  
}
export class CommandLineJob extends JobBase {
  constructor(pathmapper: PathMapper,builder: Builder,requirement: Requirement,outdir: string, tmpdir: string, stagedir: string){
    super(pathmapper,builder,requirement,outdir,tmpdir,stagedir)
  }
  run( runtimeContext: RuntimeContext):Promise<JobCommand>{
    const commands:string[] = []
    for (const binding of this.builder.bindings) {
      commands.push(...this.builder.generate_arg(binding))
    }
    return Promise.resolve({
      basedir: runtimeContext.basedir??"",
      command:commands,
      files: this.builder.files
    })
  }

  _required_env(): EnvDict{
  const env:EnvDict = {}
  env["HOME"] = this.outdir
  env["TMPDIR"] = this.tmpdir
  env["PATH"] = process.env['PATH']??""
  for(const  extra of ["SYSTEMROOT", "QEMU_LD_PREFIX"]){
      if(process.env[extra]!==undefined){
          env[extra] = process.env[extra] as string
        }
  }
  return env
}
}