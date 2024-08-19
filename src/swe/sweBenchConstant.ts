import { Enum } from './enum';

export interface VersionInstallation {
    python: string;
    packages?: string;
    install: string;
    pip_packages?: string[];
    pre_install?: string[];
    instance_image?: boolean;
    arch_specific_packages?: {
        aarch64: string
    };
    no_use_env?: boolean;
    pre_test?: string[];
    env_vars_test?: Record<string, string>;
}

export const PYTHON_ENVIRONMENT_VERSIONS: Record<string, string> = {
    "3.5": "3.5.10",
    "3.6": "3.6.15",
    "3.7": "3.7.17",
    "3.8": "3.8.19",
    "3.9": "3.9.19",
    "3.10": "3.10.14",
    "3.11": "3.11.9"
};

export const PYENV_REPOS: Set<string> = new Set([
    "astropy/astropy",
    "django/django",
    "psf/requests",
    "scikit-learn/scikit-learn"
]);


const MAP_VERSION_TO_INSTALL_SKLEARN: Record<string, VersionInstallation> = ["0.20", "0.21", "0.22"].reduce((acc, version) => {
    acc[version] = {
        instance_image: true,
        python: "3.6",
        packages: "numpy==1.19.2 scipy==1.5.2 cython==0.29.7 pytest==4.5.0 pandas matplotlib==3.1.0 joblib threadpoolctl",
        install: "pip install -v --no-build-isolation -e .",
        arch_specific_packages: {
            aarch64: "gxx_linux-aarch64 gcc_linux-aarch64 make",
        },
    };
    return acc;
}, {});



export const TEST_PYTEST = "pytest --no-header -rA --tb=no -p no:cacheprovider";
export const TEST_PYTEST_SKIP_NO_HEADER = "pytest -rA --tb=no -p no:cacheprovider";

export const MAP_REPO_TO_TEST_FRAMEWORK: Record<string, string> = {
    "astropy/astropy": TEST_PYTEST,
    "django/django": "./tests/runtests.py --verbosity 2",
    "marshmallow-code/marshmallow": TEST_PYTEST,
    "matplotlib/matplotlib": TEST_PYTEST,
    "mwaskom/seaborn": "pytest --no-header -rA",
    "pallets/flask": TEST_PYTEST,
    "psf/requests": TEST_PYTEST,
    "pvlib/pvlib-python": TEST_PYTEST,
    "pydata/xarray": TEST_PYTEST,
    "pydicom/pydicom": TEST_PYTEST_SKIP_NO_HEADER,
    "pylint-dev/astroid": TEST_PYTEST,
    "pylint-dev/pylint": TEST_PYTEST,
    "pytest-dev/pytest": "pytest -rA",
    "pyvista/pyvista": TEST_PYTEST,
    "scikit-learn/scikit-learn": TEST_PYTEST_SKIP_NO_HEADER,
    "sphinx-doc/sphinx": "tox -epy39 -v --",
    "sqlfluff/sqlfluff": TEST_PYTEST,
    "swe-bench/humaneval": "python",
    "sympy/sympy": "bin/test -C --verbose",
};

export const MAP_REPO_TO_REQS_PATHS: Record<string, string[]> = {
    "django/django": ["tests/requirements/py3.txt"],
    "matplotlib/matplotlib": ["requirements/dev/dev-requirements.txt", "requirements/testing/travis_all.txt"],
    "pallets/flask": ["requirements/dev.txt"],
    "pylint-dev/pylint": ["requirements_test.txt"],
    "pyvista/pyvista": ["requirements_test.txt", 'requirements.txt'],
    "sqlfluff/sqlfluff": ["requirements_dev.txt"],
    "sympy/sympy": ["requirements-dev.txt"],
};

export const MAP_REPO_TO_ENV_YML_PATHS: Record<string, string[]> = {
    "matplotlib/matplotlib": ["environment.yml"],
    "pydata/xarray": ["ci/requirements/environment.yml", "environment.yml"],
};

export const MAP_REPO_TO_DEB_PACKAGES: Record<string, string[]> = {
    "matplotlib/matplotlib": ["texlive", "texlive-xetex", "dvipng", "ghostscript", "libfreetype-dev", "libtiff-dev"],
    "pyvista/pyvista": ["libgl1", "libxrender1"]
};

export const KEY_INSTANCE_ID = "instance_id";
export const KEY_MODEL = "model_name_or_path";
export const KEY_PREDICTION = "model_patch";

export const APPLY_PATCH_FAIL = ">>>>> Patch Apply Failed";
export const APPLY_PATCH_PASS = ">>>>> Applied Patch";
export const INSTALL_FAIL = ">>>>> Init Failed";
export const INSTALL_PASS = ">>>>> Init Succeeded";
export const INSTALL_TIMEOUT = ">>>>> Init Timed Out";
export const RESET_FAILED = ">>>>> Reset Failed";
export const TESTS_ERROR = ">>>>> Tests Errored";
export const TESTS_FAILED = ">>>>> Some Tests Failed";
export const TESTS_PASSED = ">>>>> All Tests Passed";
export const TESTS_TIMEOUT = ">>>>> Tests Timed Out";

export enum PatchType {
    PATCH_GOLD = "gold",
    PATCH_PRED = "pred",
    PATCH_PRED_TRY = "pred_try",
    PATCH_PRED_MINIMAL = "pred_minimal",
    PATCH_PRED_MINIMAL_TRY = "pred_minimal_try",
    PATCH_TEST = "test"
}

export const NON_TEST_EXTS = [".json", ".png", "csv", ".txt", ".md", ".jpg", ".jpeg", ".pkl", ".yml", ".yaml", ".toml"];
export const SWE_BENCH_URL_RAW = "https://raw.githubusercontent.com/";
