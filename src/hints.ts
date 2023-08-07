import * as cwlTsAuto from 'cwl-ts-auto'

export type Requirement = {
    dockerRequirement?: DockerRequirement;
    envVarRequirement:EnvVarRequirement;
}
export type DockerRequirement = {
    dockerImport?: string;
    dockerPull?: string;
    dockerLoad?: string;
    dockerImageId?: string;
    dockerFile?: string;
    required: boolean;
}
type EnvEntry ={
    name:string,
    value:string
}
export type EnvVarRequirement = {
    envDef: EnvEntry[]
}
function updateRequestment(requestment: Requirement,reqs:any[],required:boolean){
    for (const req of reqs) {
        if(!("class" in req)){
            continue
        }
        const className = req['class']
        if(className==="DockerRequirement"){
            requestment.dockerRequirement = {
                required: required,
                dockerPull: req.dockerPull,
                dockerLoad: req.dockerLoad,
                dockerImageId: req.dockerImageId,
                dockerFile: req.dockerFile,
                dockerImport: req.dockerImport
            }
        }
        if(req instanceof cwlTsAuto.EnvVarRequirement){
            const envDef: EnvEntry[] = []
            for( const env of req.envDef){
                envDef.push({name:env.envName,value:env.envValue})
            }
            requestment.envVarRequirement = {
                envDef: envDef
            }
        }
    }
}
export function load_hints(tool:cwlTsAuto.CommandLineTool):Requirement{
    let requirement:Requirement = {}
    updateRequestment(requirement,tool.requirements??[],true)
    updateRequestment(requirement,tool.hints??[],false)
    return requirement
}
  