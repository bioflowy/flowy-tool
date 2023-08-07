import { Builder } from "./builder";
import { generateUuid } from "./id_utils";
import { DEFAULT_TMP_PREFIX } from "./utils";
import path from 'path'
export class RuntimeContext  {
  outdir: string | null = null;
  tmpdir: string = "";
  tmpdir_prefix: string = DEFAULT_TMP_PREFIX;
  tmp_outdir_prefix: string = "";
  stagedir: string = "";
  user_space_docker_cmd: string | null = null;
  // secret_store: SecretStore | null = null;
  no_read_only: boolean = false;
  custom_net: string | null = null;
  no_match_user: boolean = false;
  preserve_environment: Iterable<string> | null = null;
  preserve_entire_environment: boolean = false;
  use_container: boolean = true;
  force_docker_pull: boolean = false;
  rm_tmpdir: boolean = true;
  pull_image: boolean = true;
  rm_container: boolean = true;
  move_outputs: "move" | "leave" | "copy" = "move";
  log_dir: string = "";
  streaming_allowed: boolean = false;
  singularity: boolean = false;
  podman: boolean = false;
  debug: boolean = false;
  compute_checksum: boolean = true;
  name: string = "";
  default_container: string | null = null;
  cachedir: string | null = null;
  part_of: string = "";
  basedir: string = "";
  toplevel: boolean = false;
  builder: Builder | null = null;
  docker_outdir: string = "";
  docker_tmpdir: string = "";
  docker_stagedir: string = "";
  js_console: boolean = false;
  eval_timeout: number = 60;
  on_error: "stop" | "continue" = "stop";
  strict_memory_limit: boolean = false;
  strict_cpu_limit: boolean = false;
  cidfile_dir: string | null = null;
  cidfile_prefix: string | null = null;
  orcid: string = "";
  cwl_full_name: string = "";
  process_run_id: string | null = null;

  get_outdir(): string {
    if (this.outdir) {
      return this.outdir;
    }
    return this.generate_dirname(this.tmp_outdir_prefix);
  }

  get_tmpdir(): string {
    if (this.tmpdir) {
      return this.tmpdir;
    }
    return this.generate_dirname(this.tmpdir_prefix);
  }

  get_stagedir(): string {
    if (this.stagedir) {
      return this.stagedir;
    }
    return this.generate_dirname(this.tmpdir_prefix);
  }

  generate_dirname(dirPrefix:string): string {
    const { dir, name } = path.parse(dirPrefix);
    const tmpdir = path.join(dir,name+generateUuid())
    return tmpdir;
  }

}
export const defaultRuntimeContext: RuntimeContext = {
  tmpdir_prefix: "/tmp",
  rm_container: true,
  use_container: true,
  debug: false,
  user_space_docker_cmd: null,
  pull_image:true,
  force_docker_pull:false,
  tmp_outdir_prefix:"test"
}