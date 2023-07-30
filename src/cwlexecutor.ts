import * as cwlTsAuto from 'cwl-ts-auto'

export async function executeTool(tool:cwlTsAuto.CommandLineTool) {
  if (tool.hints) {
    for(const hint of tool.hints){
      if(hint.class == "DockerRequirement"){
        console.log("DockerRequirement:", hint)
      }
    }
  }
}