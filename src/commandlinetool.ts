import * as cwlTsAuto from 'cwl-ts-auto'
import { Process, avroize_type, fill_in_defaults } from "./process";
import { LoadingContext } from "./loadingcontext";
import { Builder } from './builder';
import { CWLObjectType } from './types';
import { PathMapper } from './pathmapper';
import * as pathlib from 'path';
import { CommandLineJob, JobBase, JobConstructor, } from './job';
import { RuntimeContext } from './runtimecontext';
import { DockerCommandLineJob } from './docker';
import { visit_class } from './utils';
import { getRandomDir } from './id_utils';


export class CommandLineTool extends Process {
  constructor(tool:cwlTsAuto.CommandLineTool,loadingContext:LoadingContext) {
    super(tool,loadingContext)
  }
  job(job_order_object:CWLObjectType, runtime_context:RuntimeContext):JobBase{
    const builder = this._init_job(job_order_object, runtime_context);
    const outdir = "/tmp/"+getRandomDir();
    const stagedir = "/tmp/"+getRandomDir();
    const tmpdir = "/tmp/"+getRandomDir();
    const pathmapper = new PathMapper(stagedir,true,builder.files,runtime_context.basedir??"");
    function _check_adjust(obj:CWLObjectType) {
      check_adjust(pathmapper,builder,obj)
    }
    visit_class([builder.files, builder.bindings], ["File"], _check_adjust)
    const job_runner = this.make_job_runner(runtime_context);
    const j = new job_runner(pathmapper,builder,this.requirement, outdir,tmpdir,stagedir)

    const required_env:{[key:string]:string} = {}
    if(this.requirement.envVarRequirement){
        for(const t3 of this.requirement.envVarRequirement.envDef){
            const env_value_field = t3.value
            let env_value:string =""
            if( env_value_field.includes("${") || env_value_field.includes("$(")){
                const env_value_eval = builder.do_eval(env_value_field)
                if(typeof env_value_eval === "string"){
                }else{
                    throw new Error("'envValue expression must evaluate to a str. ");
                }
                env_value = env_value_eval
              }else{
                env_value = env_value_field
            }
            required_env[t3.name] = env_value
        }
    }
    // Construct the env
    j.prepare_environment(runtime_context, required_env)

    return j
  }

  make_job_runner(runtimeContext: RuntimeContext): JobConstructor {

  const dockerReq = this.requirement.dockerRequirement;
  if(dockerReq){
      if(runtimeContext.use_container){
        return DockerCommandLineJob
      }else if(dockerReq.required){
          throw new  Error(
            "--no-container, but this CommandLineTool has " +
            "DockerRequirement under 'requirements'.")
        
        }
   }
   return CommandLineJob
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
