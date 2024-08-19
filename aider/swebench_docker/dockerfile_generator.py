import logging
import os
from typing import List

from jinja2 import FileSystemLoader, Environment
from swebench import get_eval_refs, get_instances

from swebench_docker.constants import MAP_VERSION_TO_INSTALL, MAP_REPO_TO_DEB_PACKAGES, PYTHON_ENVIRONMENT_VERSIONS, \
    MAP_REPO_TO_ENV_YML_PATHS, PYENV_REPOS
from swebench_docker.utils import get_requirements, get_environment_yml

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("build_docker")


class DockerfileGenerator:

    def __init__(
        self,
        swe_bench_tasks: str,
        namespace: str = "aorwall",
        docker_dir: str = "docker",
        predictions_path: str = None,
    ):
        self.namespace = namespace
        self.docker_dir = docker_dir
        self.task_instances = list(get_eval_refs(swe_bench_tasks).values())

        self.image_prefix = "swe-bench"

        self.dockerfiles_to_build = [
            ("docker/Dockerfile", f"{self.namespace}/{self.image_prefix}-conda:bookworm-slim"),
            ("docker/pyenv/Dockerfile", f"{self.namespace}/{self.image_prefix}-pyenv:bookworm-slim"),
            ("docker/pyenv/Dockerfile-pyenvs", f"{self.namespace}/{self.image_prefix}-pyenvs:bookworm-slim"),
        ]

        env = Environment(loader=FileSystemLoader("templates"))
        self.conda_testbed_template = env.get_template(f"Dockerfile.conda_testbed")
        self.pyenv_testbed_template = env.get_template(f"Dockerfile.pyenv_testbed")
        self.conda_repository_template = env.get_template(f"Dockerfile.conda_repository")
        self.pyenv_repository_template = env.get_template(f"Dockerfile.pyenv_repository")
        self.instance_template = env.get_template("Dockerfile.pyenv_instance")

        if predictions_path:
            predictions = get_instances(predictions_path)
            self.instance_ids = set([p["instance_id"] for p in predictions])
            logger.info(f"Found {len(self.instance_ids)} in predictions file")
        else:
            self.instance_ids = None

    def generate(self):
        testbeds = set()
        task_instances_grouped = self.group_task_instances(self.task_instances)

        for repo, map_version_to_instances in task_instances_grouped.items():
            logger.info(f"Repo {repo}: {len(map_version_to_instances)} versions")

            # Determine instances to use for environment installation
            for version, instances in map_version_to_instances.items():
                if self.instance_ids:
                    instances = [
                        instance
                        for instance in instances
                        if instance["instance_id"] in self.instance_ids
                    ]
                    if not instances:
                        logger.info(f"No instances for {repo} {version}")
                        continue

                logger.info(f"\tVersion {version}: {len(instances)} instances")

                repo_name = _repo_name(repo)

                specifications = MAP_VERSION_TO_INSTALL[repo][version]

                use_conda = repo not in PYENV_REPOS

                if repo_name not in testbeds:
                    deb_packages = None
                    if repo in MAP_REPO_TO_DEB_PACKAGES:
                        deb_packages = MAP_REPO_TO_DEB_PACKAGES[repo]

                    if use_conda:
                        self.generate_conda_repository_dockerfile(repo, deb_packages)
                    else:
                        self.generate_pyenv_repository_dockerfile(repo, deb_packages)

                    testbeds.add(repo_name)

                self.generate_testbed_dockerfile(
                    repo=repo,
                    version=version,
                    setup_ref_instance=instances[0],
                    specifications=specifications,
                    use_conda=use_conda,
                )

                if (
                        "instance_image" in specifications
                        and specifications["instance_image"]
                ):
                    for instance in instances:
                        install_cmd = specifications["install"]
                        self.generate_instance_dockerfile(
                            instance=instance,
                            install_cmd=install_cmd,
                        )

        self.create_makefile()

        for dockerfile, image_name in self.dockerfiles_to_build:
            print(f"docker build -t {image_name} -f {dockerfile} .")

    def create_makefile(self):
        with open(f"Makefile", "w") as f:
            f.write("all:\n")
            for dockerfile, image_name in self.dockerfiles_to_build:
                f.write(f"\tdocker build -t {image_name} -f {dockerfile} .\n")

    def group_task_instances(self, task_instances):
        task_instances_grouped = {}
        for instance in task_instances:

            # Group task instances by repo, version
            repo = instance["repo"]
            version = instance["version"] if "version" in instance else None
            if repo not in task_instances_grouped:
                task_instances_grouped[repo] = {}
            if version not in task_instances_grouped[repo]:
                task_instances_grouped[repo][version] = []
            task_instances_grouped[repo][version].append(instance)

        return task_instances_grouped

    def generate_conda_repository_dockerfile(
        self, repo: str, deb_packages: List[str]
    ):
        repo_name = _repo_name(repo)

        base_image = f"{self.namespace}/{self.image_prefix}-conda:bookworm-slim"

        dockerfile_content = self.conda_repository_template.render(
            base_image=base_image,
            deb_packages=" ".join(deb_packages) if deb_packages else None,
            repo_name=repo_name,
        )

        repo_dir = f"{self.docker_dir}/{repo_name}"
        if not os.path.exists(repo_dir):
            os.makedirs(repo_dir)

        output_file = f"{repo_dir}/Dockerfile"
        with open(output_file, "w") as f:
            f.write(dockerfile_content)

        print(f"Dockerfile generated: {output_file}")

        repo_image_name = repo.replace("/", "_")

        self.dockerfiles_to_build.append((output_file, f"{self.namespace}/{self.image_prefix}-{repo_image_name}:bookworm-slim"))

    def generate_pyenv_repository_dockerfile(
            self, repo: str, deb_packages: List[str]
    ):

        repo_name = _repo_name(repo)

        base_image = f"{self.namespace}/{self.image_prefix}-pyenv:bookworm-slim"
        pyenv_image = f"{self.namespace}/swe-bench-pyenvs:bookworm-slim"

        dockerfile_content = self.pyenv_repository_template.render(
            base_image=base_image,
            pyenv_image=pyenv_image,
            deb_packages=" ".join(deb_packages) if deb_packages else None,
            repo_name=repo_name,
        )

        repo_dir = f"{self.docker_dir}/{repo_name}"
        if not os.path.exists(repo_dir):
            os.makedirs(repo_dir)

        output_file = f"{repo_dir}/Dockerfile"
        with open(output_file, "w") as f:
            f.write(dockerfile_content)

        print(f"Dockerfile generated: {output_file}")

        repo_image_name = repo.replace("/", "_")

        self.dockerfiles_to_build.append(
            (output_file, f"{self.namespace}/{self.image_prefix}-{repo_image_name}:bookworm-slim"))

    def generate_testbed_dockerfile(
        self,
        repo: str,
        version: str,
        specifications: dict,
        setup_ref_instance: dict,
        use_conda: bool = False
    ):

        repo_name = _repo_name(repo)
        repo_image_name = repo.replace("/", "_")

        env_name = f"{repo_name}__{version}"

        test_bed_dir = f"{self.docker_dir}/{repo_name}/{version}"

        environment_setup_commit = setup_ref_instance.get(
            "environment_setup_commit", setup_ref_instance["base_commit"]
        )

        path_to_reqs = None
        path_to_env_file = None
        install_cmds = []

        testbed_dir = f"{self.docker_dir}/{repo_name}/{version}"
        if not os.path.exists(testbed_dir):
            os.makedirs(testbed_dir)

        pre_install_cmds = specifications.get("pre_install", None)

        pip_packages = specifications.get("pip_packages", [])

        # Create conda environment according to install instructinos
        pkgs = (
            specifications["packages"] if "packages" in specifications else ""
        )
        if pkgs == "requirements.txt":
            # Create environment
            conda_create_cmd = f"conda create -n {env_name} python={specifications['python']} -y"

            path_to_reqs = get_requirements(
                setup_ref_instance, save_path=test_bed_dir
            )

            if specifications["python"] == "3.5":
                install_cmds.append("pip install --trusted-host pypi.python.org --trusted-host files.pythonhosted.org --trusted-host pypi.org -r requirements.txt")
            else:
                install_cmds.append("pip install -r requirements.txt")
        elif pkgs == "environment.yml":
            #if not use_conda:
            #    raise ValueError(f"Can't create non conda docker image with environment.yml set")

            if "no_use_env" in specifications and specifications["no_use_env"]:
                # Create environment from yml
                path_to_env_file = get_environment_yml(
                    setup_ref_instance, env_name, save_path=test_bed_dir
                )
                conda_create_cmd = f"conda create -c conda-forge -n {env_name} python={specifications['python']} -y"

                # Install dependencies
                install_cmds.append(f"conda env update -f environment.yml")
            else:
                # Create environment from yml
                path_to_env_file = get_environment_yml(
                    setup_ref_instance,
                    env_name,
                    save_path=test_bed_dir,
                    python_version=specifications["python"],
                )

                conda_create_cmd = f"conda env create -f environment.yml"
        elif use_conda:
            conda_create_cmd = f"conda create -n {env_name} python={specifications['python']} {pkgs} -y"
        else:
            conda_create_cmd = None
            pip_packages.extend(pkgs.split())

        # Install additional packages if specified
        if pip_packages:
            pip_packages = " ".join(pip_packages)
            install_cmds.append(f"pip install {pip_packages}")

        if "install" in specifications and (
                "instance_image" not in specifications
                or not specifications["instance_image"]
        ):
            install_cmds.append(specifications["install"])

        repo_name = _repo_name(repo)

        base_image = f"{self.namespace}/{self.image_prefix}-{repo_image_name}:bookworm-slim"
        pyenv_image = f"{self.namespace}/swe-bench-pyenvs:bookworm-slim"

        python_version = specifications["python"]
        if use_conda:
            template = self.conda_testbed_template
        else:
            python_version = PYTHON_ENVIRONMENT_VERSIONS[python_version]
            template = self.pyenv_testbed_template

        dockerfile_content = template.render(
            base_image=base_image,
            pyenv_image=pyenv_image,
            docker_dir=self.docker_dir,
            repo_name=repo_name,
            version=version,
            testbed=repo_name + "__" + version,
            python_version=python_version,
            conda_create_cmd=conda_create_cmd,
            pre_install_cmds=pre_install_cmds,
            install_cmds=install_cmds,
            path_to_reqs=path_to_reqs,
            environment_setup_commit=environment_setup_commit,
            path_to_env_file=path_to_env_file,
        )

        testbed_dir = f"{self.docker_dir}/{repo_name}/{version}"
        if not os.path.exists(testbed_dir):
            os.makedirs(testbed_dir)

        output_file = f"{testbed_dir}/Dockerfile"
        with open(output_file, "w") as f:
            f.write(dockerfile_content)

        print(f"Dockerfile generated: {output_file}")

        self.dockerfiles_to_build.append((output_file, f"{self.namespace}/{self.image_prefix}-{repo_image_name}-testbed:{version}"))

    def generate_instance_dockerfile(
        self,
        instance: dict,
        install_cmd: str,
    ):
        """
        Build one Docker image per benchmark instance to not have to build the environment each time before testing in
        repositories using Cython.
        """
        repo = instance["repo"]
        version = instance["version"]
        repo_name = _repo_name(repo)
        repo_image_name = repo.replace("/", "_")

        base_image = (
            f"{self.namespace}/{self.image_prefix}-{repo_image_name}-testbed:{instance['version']}"
        )

        dockerfile_content = self.instance_template.render(
            base_image=base_image,
            repo_name=repo_name,
            install_cmd=install_cmd,
            base_commit=instance["base_commit"],
        )

        instance_dir = (
            f"{self.docker_dir}/{repo_name}/{version}/{instance['instance_id']}"
        )
        if not os.path.exists(instance_dir):
            os.makedirs(instance_dir)

        output_file = f"{instance_dir}/Dockerfile"
        with open(output_file, "w") as f:
            f.write(dockerfile_content)

        print(f"Dockerfile generated: {output_file}")

        self.dockerfiles_to_build.append((output_file, f"{self.namespace}/{self.image_prefix}-{repo_image_name}-instance:{instance['instance_id']}"))


def _repo_name(repo: str) -> str:
    return repo.replace("/", "__")
