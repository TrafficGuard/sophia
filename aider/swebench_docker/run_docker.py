import asyncio
import base64
import json
import tempfile
import logging
import subprocess
import time
import os

from swebench_docker.constants import MAP_VERSION_TO_INSTALL

logger = logging.getLogger(__name__)


async def run_docker_evaluation(task_instance: dict, namespace: str, log_dir: str, timeout: int = 900, log_suffix: str = "", verbose: bool = False, base64_instance: bool = True):
    repo_name = task_instance['repo'].replace("/", "_")

    specifications = MAP_VERSION_TO_INSTALL[task_instance["repo"]][task_instance["version"]]
    image_prefix = "swe-bench"

    # TODO: Change this when deciding
    if "packages" in specifications and specifications["packages"] == "environment.yml":
        container_log_dir = '/home/swe-bench/logs'
    else:
        container_log_dir = '/opt/logs'

    if specifications.get("instance_image", False):
        docker_image = f"{namespace}/{image_prefix}-{repo_name}-instance:{task_instance['instance_id']}"
    else:
        docker_image = f"{namespace}/{image_prefix}-{repo_name}-testbed:{task_instance['version']}"

    swebench_docker_fork_dir = os.environ.get("SWEBENCH_DOCKER_FORK_DIR")

    if swebench_docker_fork_dir:
        # Create a temporary file to store the task_instance JSON
        tmpfile_path = tempfile.mktemp(suffix='.json')
        with open(tmpfile_path, 'w+') as f:
            json.dump(task_instance, f)

        docker_command = [
            'docker', 'run',
            '--rm',
            '-u', 'root',
            '-v', f"{log_dir}:{container_log_dir}",
            # Map the swebench_docker fork dir to the container
            # for some reason, swebench_docker has different locations for the different containers :(
            # so we need to map all of them to make it work
            '-v', f"{swebench_docker_fork_dir}/swebench_docker:/opt/swebench_docker:ro",
            '-v', f"{swebench_docker_fork_dir}/swebench_docker:/home/swe-bench/swebench_docker:ro",
            '-v', f"{swebench_docker_fork_dir}/swebench_docker:/home/swe-bench/swebench:ro",
            # =======
            # Map file instead pass the instance as env var to avoid "Argument list too long" error
            '-v', f"{tmpfile_path}:/home/swe-bench/task_instance.json:ro",
            '-e', f"LOG_DIR={container_log_dir}",
            '-e', f"TIMEOUT={timeout}",
            '-e', f"LOG_SUFFIX={log_suffix}",
            docker_image
        ]
    else:
        # Base64 encode the instance JSON to be sure it can be passed as an environment variable
        instance_b64 = base64.b64encode(json.dumps(task_instance).encode('utf-8')).decode('utf-8')
        docker_command = [
            'docker', 'run',
            '--rm',
            '-v', f"{log_dir}:{container_log_dir}",
            '-e', f"INSTANCE={instance_b64}",
            '-e', f"LOG_DIR={container_log_dir}",
            '-e', f"TIMEOUT={timeout}",
            '-e', f"LOG_SUFFIX={log_suffix}",
            docker_image
        ]

    cmd_string = ' '.join(docker_command)

    if verbose:
        logger.info(cmd_string)

    start_time = time.time()

    try:
        process = await asyncio.create_subprocess_shell(cmd_string, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
        stdout, stderr = await process.communicate()
        stdout = stdout.decode()
        if stderr:
            stderr = stderr.decode()

        elapsed_time = time.time() - start_time

        if process.returncode != 0:
            logger.warning(
                f"[{task_instance['instance_id']}][{docker_image}]  Error running container:")
            logger.warning(f"Command: {cmd_string}")
            logger.warning(f"Stdout - {stdout}")
            logger.warning(f"Stderr - {stderr}")

        elif "Evaluation succeeded" not in stdout:
            logger.warning(f"[{task_instance['instance_id']}][{docker_image}] \
                           Container ran successfully in {elapsed_time} seconds, but evaluation failed.")
            logger.warning(f"Command: {cmd_string}")
            logger.warning(f"stdout - {stdout}")
        else:
            logger.info(f"[{task_instance['instance_id']}][{docker_image}] \
                        Container ran successfully in {elapsed_time} seconds.")
    except Exception as e:
        logger.warning(f"[{task_instance['instance_id']}][{docker_image}]  Error running container: {e}")
    finally:
        if swebench_docker_fork_dir:
            # Ensure the temporary file is deleted after the Docker process completes
            os.unlink(tmpfile_path)
