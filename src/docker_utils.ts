import winston from 'winston';
import { DockerRequirement } from './hints';
import { check_call, createTmpDir, executeCommand, pathExists } from './utils';
import fs from 'fs';
import path from 'path';
const _IMAGES: { [key: string]: string } = {};
const _logger = winston.createLogger({
    level: 'info',
    format: winston.format.simple(),
    transports: [new winston.transports.Console()]
});

export async function get_image(
    docker_exec: string,
    docker_requirement: DockerRequirement,
    pull_image: boolean,
    force_pull: boolean,
    tmp_outdir_prefix: string
): Promise<boolean> {
    // Retrieve the relevant Docker container image.

    // :returns: True upon success

    let found = false;

    if (!docker_requirement.dockerImageId && docker_requirement.dockerPull) {
        docker_requirement.dockerImageId = docker_requirement.dockerPull;
    }
    if (!docker_requirement.dockerImageId) {
        throw new Error('dockerImageId is null');
    }
    // with _IMAGES_LOCK:
    if (docker_requirement.dockerImageId in _IMAGES) {
        return true;
    }

    for await (const line of executeCommand(docker_exec, ['images', '--no-trunc', '--all'])) {
        // nosec
        try {
            const match = line.match(/^([^ ]+)\s+([^ ]+)\s+([^ ]+)/);
            const split = docker_requirement.dockerImageId.split(':');
            if (split.length == 1) {
                split.push('latest');
            } else if (split.length == 2) {
                //  if split[1] doesn't  match valid tag names, it is a part of repository
                if (split[1].match(/[\w][\w.-]{0,127}/)) {
                    split[0] = split[0] + ':' + split[1];
                    split[1] = 'latest';
                }
            } else if (split.length == 3) {
                if (split[2].match(/[\w][\w.-]{0,127}/)) {
                    split[0] = split[0] + ':' + split[1];
                    split[1] = split[2];
                }
            }
            // check for repository:tag match or image id match
            if (
                match &&
                ((split[0] == match[1] && split[1] == match[2]) || docker_requirement.dockerImageId === match[3])
            ) {
                found = true;
                break;
            }
        } catch {}
    }

    if ((force_pull || !found) && pull_image) {
        if (docker_requirement.dockerPull) {
            const cmd = [docker_exec, 'pull', docker_requirement.dockerPull];
            _logger.info(cmd.join(' '));
            check_call(cmd); // nospullec
            found = true;
        } else if (docker_requirement.dockerFile) {
            const dockerfile_dir = createTmpDir(tmp_outdir_prefix);
            await fs.promises.writeFile(path.join(dockerfile_dir, 'Dockerfile'), docker_requirement.dockerFile);
            const cmd = [docker_exec, 'build', '--tag=' + docker_requirement.dockerImageId, dockerfile_dir];
            _logger.info(cmd.join(' '));
            check_call(cmd); // nosec
            found = true;
        } else if (docker_requirement.dockerLoad) {
        } else if (docker_requirement.dockerImport) {
            const cmd = [docker_exec, 'import', docker_requirement.dockerImport, docker_requirement['dockerImageId']];
            _logger.info(cmd.join(' '));
            check_call(cmd); // nosec
            found = true;
        }
    }
    if (found) {
        _IMAGES[docker_requirement.dockerImageId] = docker_requirement.dockerImageId;
    }
    return found;
}
