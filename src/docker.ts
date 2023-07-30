import { CommandLineTool } from "./commandlinetool"
import { JobBase } from "./job"
import { MapperEnt, PathMapper } from "./pathmapper";
import { RuntimeContext } from "./runtimecontext"
import { createTmpDir, getRandomDir } from "./utils"
import path from 'path';
import fs from 'fs';

function append_volume(runtime: string[], source: string, target: string, writable: boolean = false){
  // Add binding arguments to the runtime list."""
  const options = [
      "type=bind",
      "source=" + source,
      "target=" + target,
  ]
  if(!writable){
      options.push("readonly")
  }
  runtime.push(`--mount=${options.join}`)
  // Unlike "--volume", "--mount" will fail if the volume doesn't already exist.
  // if not os.path.exists(source):
  //     os.makedirs(source)
}

export class DockerCommandLineJob extends JobBase{
  containerOutdir: string;
  CONTAINER_TMPDIR: string = "/tmp"
    inplaceUpdate: any;
  constructor(pathmapper: PathMapper){
    super(pathmapper)
    this.containerOutdir = getRandomDir()
  }
  addVolumes(
    pathmapper: PathMapper,
    runtime: string[],
    tmpdirPrefix: string,
    // secretStore?: SecretStore,
    anyPathOkay: boolean = false,
): void {
    let containerOutdir = this.containerOutdir;
    for (let [key, vol] of pathmapper.items().filter(itm => itm[1].staged)) {
        let hostOutdirTgt: string | null = null;
        if (vol.target.startsWith(containerOutdir + "/")) {
            hostOutdirTgt = path.join(this.outdir, vol.target.slice(containerOutdir.length + 1));
        }
        if (!hostOutdirTgt && !anyPathOkay) {
            throw new Error(
                "No mandatory DockerRequirement, yet path is outside " +
                "the designated output directory, also know as " +
                "$(runtime.outdir): " + vol
            );
        }
        if (vol.type === "File" || vol.type === "Directory") {
            this.addFileOrDirectoryVolume(runtime, vol, hostOutdirTgt);
        }
        // currently supported only File and Directory
        //  else if (vol.type === "WritableFile") {
        //     this.addWritableFileVolume(runtime, vol, hostOutdirTgt, tmpdirPrefix);
        // } else if (vol.type === "WritableDirectory") {
        //     this.addWritableDirectoryVolume(runtime, vol, hostOutdirTgt, tmpdirPrefix);
        // } else if (vol.type === "CreateFile" || vol.type === "CreateWritableFile") {
        //     let newPath = this.createFileAndAddVolume(
        //         runtime, vol, hostOutdirTgt, secretStore, tmpdirPrefix
        //     );
        //     pathmapper.update(key, newPath, vol.target, vol.type, vol.staged);
        // }
    }
}
    addFileOrDirectoryVolume(
        runtime: string[],
        volume: MapperEnt,
        hostOutdirTgt: string | null,
    ): void {
        if (!volume.resolved.startsWith("_:")) {
            //checkDockerMachinePath(volume.resolved);
            append_volume(runtime, volume.resolved, volume.target);
        }
    }

    addWritableFileVolume(
        runtime: string[],
        volume: MapperEnt,
        hostOutdirTgt: string | null,
        tmpdirPrefix: string,
    ): void {
    if (this.inplaceUpdate) {
        append_volume(runtime, volume.resolved, volume.target, true);
    } else {
        if (hostOutdirTgt) {
            let hostOutdirTgtDir = path.dirname(hostOutdirTgt);
            if (!fs.existsSync(hostOutdirTgtDir)) {
                fs.mkdirSync(hostOutdirTgtDir, { recursive: true });
            }
            fs.copyFileSync(volume.resolved, hostOutdirTgt);
        } else {
            let tmpdir = createTmpDir(tmpdirPrefix);
            let fileCopy = path.join(tmpdir, path.basename(volume.resolved));
            fs.copyFileSync(volume.resolved, fileCopy);
            append_volume(runtime, fileCopy, volume.target, true);
        }
        // you should also implement `ensureWritable` in TypeScript.
        // ensureWritable(hostOutdirTgt || fileCopy);
    }
}

  create_runtime(
  env: {[key:string]:string}, runtimeContext: RuntimeContext,tool: CommandLineTool
) :[string[], string | undefined]{
  // any_path_okay = self.builder.get_requirement("DockerRequirement")[1] or False
  const user_space_docker_cmd = runtimeContext.user_space_docker_cmd
  const runtime :string[] = []
  if(user_space_docker_cmd){
      if(user_space_docker_cmd.includes("udocker")){
          if(runtimeContext.debug){
              runtime.push(...user_space_docker_cmd, "run", "--nobanner")
          }else{}
              runtime.push(...user_space_docker_cmd, "--quiet", "run", "--nobanner")
        }else{}
          runtime.push(...user_space_docker_cmd, "run")
    }else{
      runtime.push("docker", "run", "-i")
    }
  // if runtimeContext.podman:
  //     runtime.append("--userns=keep-id")
  append_volume(
      runtime, path.resolve(this.outdir), this.containerOutdir, true
  )
  append_volume(
      runtime, path.resolve(this.tmpdir), this.CONTAINER_TMPDIR, true
  )
  this.addVolumes(
      this.pathmapper,
      runtime,
      runtimeContext.tmpdir_prefix,
      true,
    //   secret_store=runtimeContext.secret_store,
  )
//   if self.generatemapper is not None:
//       self.add_volumes(
//           self.generatemapper,
//           runtime,
//           any_path_okay=any_path_okay,
//           secret_store=runtimeContext.secret_store,
//           tmpdir_prefix=runtimeContext.tmpdir_prefix,
//       )

//   if user_space_docker_cmd:
//       runtime = [x.replace(":ro", "") for x in runtime]
//       runtime = [x.replace(":rw", "") for x in runtime]

//   runtime.append("--workdir=%s" % (self.builder.outdir))
//   if not user_space_docker_cmd:
//       if not runtimeContext.no_read_only:
//           runtime.append("--read-only=true")

//       if self.networkaccess:
//           if runtimeContext.custom_net:
//               runtime.append(f"--net={runtimeContext.custom_net}")
//       else:
//           runtime.append("--net=none")

//       if self.stdout is not None:
//           runtime.append("--log-driver=none")

//       euid, egid = docker_vm_id()
//       euid, egid = euid or os.geteuid(), egid or os.getgid()

//       if runtimeContext.no_match_user is False and (euid is not None and egid is not None):
//           runtime.append("--user=%d:%d" % (euid, egid))

  if(runtimeContext.rm_container){
      runtime.push("--rm")
    }
  // TODO cuda is not supported currently
  // if self.builder.resources.get("cudaDeviceCount"):
  //     runtime.append("--gpus=" + str(self.builder.resources["cudaDeviceCount"]))

//   cidfile_path: Optional[str] = None
  // add parameters to docker to write a container ID file
//   if runtimeContext.user_space_docker_cmd is None:
//       if runtimeContext.cidfile_dir:
//           cidfile_dir = runtimeContext.cidfile_dir
//           if not os.path.exists(str(cidfile_dir)):
//               _logger.error(
//                   "--cidfile-dir %s error:\n%s",
//                   cidfile_dir,
//                   "directory doesn't exist, please create it first",
//               )
//               exit(2)
//           if not os.path.isdir(cidfile_dir):
//               _logger.error(
//                   "--cidfile-dir %s error:\n%s",
//                   cidfile_dir,
//                   cidfile_dir + " is not a directory, please check it first",
//               )
//               exit(2)
//       else:
//           cidfile_dir = runtimeContext.create_tmpdir()

//       cidfile_name = datetime.datetime.now().strftime("%Y%m%d%H%M%S-%f") + ".cid"
//       if runtimeContext.cidfile_prefix is not None:
//           cidfile_name = str(runtimeContext.cidfile_prefix + "-" + cidfile_name)
//       cidfile_path = os.path.join(cidfile_dir, cidfile_name)
//       runtime.append("--cidfile=%s" % cidfile_path)
//   for key, value in self.environment.items():
//       runtime.append(f"--env={key}={value}")

//   res_req, _ = self.builder.get_requirement("ResourceRequirement")

//   if runtimeContext.strict_memory_limit and not user_space_docker_cmd:
//       ram = self.builder.resources["ram"]
//       runtime.append("--memory=%dm" % ram)
//   elif not user_space_docker_cmd:
//       if res_req and ("ramMin" in res_req or "ramMax" in res_req):
//           _logger.warning(
//               "[job %s] Skipping Docker software container '--memory' limit "
//               "despite presence of ResourceRequirement with ramMin "
//               "and/or ramMax setting. Consider running with "
//               "--strict-memory-limit for increased portability "
//               "assurance.",
//               self.name,
//           )
//   if runtimeContext.strict_cpu_limit and not user_space_docker_cmd:
//       cpus = math.ceil(self.builder.resources["cores"])
//       runtime.append(f"--cpus={cpus}")
//   elif not user_space_docker_cmd:
//       if res_req and ("coresMin" in res_req or "coresMax" in res_req):
//           _logger.warning(
//               "[job %s] Skipping Docker software container '--cpus' limit "
//               "despite presence of ResourceRequirement with coresMin "
//               "and/or coresMax setting. Consider running with "
//               "--strict-cpu-limit for increased portability "
//               "assurance.",
//               self.name,
//           )

  return [runtime, undefined]
   }
}