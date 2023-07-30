export type RuntimeContext = {
  basedir?: string;
  tmpdir_prefix: string;
  rm_container: boolean;
  debug: boolean;
  user_space_docker_cmd?: string[];
}
export const defaultRuntimeContext: RuntimeContext = {
  tmpdir_prefix: "/tmp",
  rm_container: true,
  debug: false,
  user_space_docker_cmd: undefined
}