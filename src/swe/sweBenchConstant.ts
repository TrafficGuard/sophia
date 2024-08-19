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


export const MAP_VERSION_TO_INSTALL_SKLEARN: Record<string, VersionInstallation> = (() => {
    const baseConfig = {
        instance_image: true,
        python: "3.6",
        packages: "numpy==1.19.2 scipy==1.5.2 cython==0.29.7 pytest==4.5.0 pandas matplotlib==3.1.0 joblib threadpoolctl",
        install: "pip install -v --no-build-isolation -e .",
        arch_specific_packages: {
            aarch64: "gxx_linux-aarch64 gcc_linux-aarch64 make",
        },
    };

    const newConfig = {
        instance_image: true,
        python: "3.9",
        pre_install: ["pip install setuptools wheel"],
        packages: "numpy==1.26.4 scipy==1.13.0 cython==3.0.10 pytest==8.2.0 pandas==2.2.2 matplotlib==3.8.4 joblib==1.4.2 threadpoolctl==3.5.0",
        install: "pip install -v --no-use-pep517 --no-build-isolation -e .",
        arch_specific_packages: {
            aarch64: "gxx_linux-aarch64 gcc_linux-aarch64 make",
        },
    };

    return {
        "0.20": baseConfig,
        "0.21": baseConfig,
        "0.22": baseConfig,
        "1.3": newConfig,
        "1.4": newConfig,
    };
})();

export const MAP_VERSION_TO_INSTALL_FLASK: Record<string, VersionInstallation> = {
    "2.0": {
        python: "3.9",
        packages: "requirements.txt",
        install: "pip install -e .",
        pip_packages: [
            "Werkzeug==2.3.7",
            "Jinja2==3.0.1",
            "itsdangerous==2.1.2",
            "click==8.0.1",
            "MarkupSafe==2.1.3",
        ],
    },
    "2.1": {
        python: "3.10",
        packages: "requirements.txt",
        install: "pip install -e .",
        pip_packages: [
            "click==8.1.3",
            "itsdangerous==2.1.2",
            "Jinja2==3.1.2",
            "MarkupSafe==2.1.1",
            "Werkzeug==2.3.7",
        ],
    },
    ...Object.fromEntries(["2.2", "2.3"].map(k => [k, {
        python: "3.11",
        packages: "requirements.txt",
        install: "pip install -e .",
        pip_packages: [
            "click==8.1.3",
            "itsdangerous==2.1.2",
            "Jinja2==3.1.2",
            "MarkupSafe==2.1.1",
            "Werkzeug==2.3.7",
        ],
    }])),
};

export const MAP_VERSION_TO_INSTALL_DJANGO: Record<string, VersionInstallation> = {
    ...Object.fromEntries(["1.7", "1.8", "1.9", "1.10", "1.11", "2.0", "2.1", "2.2"].map(k => [k, {
        python: "3.5",
        packages: "requirements.txt",
        install: "python -m pip install -e .",
    }])),
    ...Object.fromEntries(["1.4", "1.5", "1.6"].map(k => [k, {
        python: "3.5",
        install: "python setup.py install",
    }])),
    ...Object.fromEntries(["3.0", "3.1", "3.2"].map(k => [k, {
        python: "3.6",
        packages: "requirements.txt",
        install: "python -m pip install -e .",
    }])),
    ...Object.fromEntries(["4.0"].map(k => [k, {
        python: "3.8",
        packages: "requirements.txt",
        install: "python -m pip install -e .",
    }])),
    ...Object.fromEntries(["4.1", "4.2"].map(k => [k, {
        python: "3.9",
        packages: "requirements.txt",
        install: "python -m pip install -e .",
    }])),
    ...Object.fromEntries(["5.0"].map(k => [k, {
        python: "3.11",
        packages: "requirements.txt",
        install: "python -m pip install -e .",
    }])),
};

["2.2", "3.0", "3.1"].forEach(k => {
    if (MAP_VERSION_TO_INSTALL_DJANGO[k]) {
        MAP_VERSION_TO_INSTALL_DJANGO[k].env_vars_test = { "LANG": "en_US.UTF-8", "LC_ALL": "en_US.UTF-8" };
    }
});

export const MAP_VERSION_TO_INSTALL_REQUESTS: Record<string, VersionInstallation> = Object.fromEntries(
    [
        "0.7", "0.8", "0.9", "0.11", "0.13", "0.14", "1.1", "1.2", "2.0", "2.2",
        "2.3", "2.4", "2.5", "2.7", "2.8", "2.9", "2.10", "2.11", "2.12", "2.17",
        "2.18", "2.19", "2.22", "2.26", "2.25", "2.27", "3.0"
    ].map(k => [k, {
        python: "3.9",
        packages: "pytest",
        install: "python -m pip install .",
    }])
);

export const MAP_VERSION_TO_INSTALL_SEABORN: Record<string, VersionInstallation> = {
    ...Object.fromEntries(["0.11"].map(k => [k, {
        python: "3.9",
        install: "pip install -e .",
        pip_packages: [
            "contourpy==1.1.0",
            "cycler==0.11.0",
            "fonttools==4.42.1",
            "importlib-resources==6.0.1",
            "kiwisolver==1.4.5",
            "matplotlib==3.7.2",
            "numpy==1.25.2",
            "packaging==23.1",
            "pandas==2.1.0",
            "pillow==10.0.0",
            "pyparsing==3.0.9",
            "pytest",
            "python-dateutil==2.8.2",
            "pytz==2023.3.post1",
            "scipy==1.11.2",
            "six==1.16.0",
            "tzdata==2023.1",
            "zipp==3.16.2",
        ],
    }])),
    ...Object.fromEntries(["0.12", "0.13"].map(k => [k, {
        python: "3.9",
        install: "pip install -e .[dev]",
        pip_packages: [
            "contourpy==1.1.0",
            "cycler==0.11.0",
            "fonttools==4.42.1",
            "importlib-resources==6.0.1",
            "kiwisolver==1.4.5",
            "matplotlib==3.7.2",
            "numpy==1.25.2",
            "packaging==23.1",
            "pandas==2.1.0",
            "pillow==10.0.0",
            "pyparsing==3.0.9",
            "python-dateutil==2.8.2",
            "pytz==2023.3.post1",
            "scipy==1.11.2",
            "six==1.16.0",
            "tzdata==2023.1",
            "zipp==3.16.2",
        ],
    }])),
};

export const MAP_VERSION_TO_INSTALL_PYTEST: Record<string, VersionInstallation> = {
    ...Object.fromEntries(['4.4','4.5','4.6','5.0','5.1','5.2','5.3','5.4','6.0','6.2','6.3','7.0','7.1','7.2','7.4','8.0'].map(k => [k, {
        python: "3.9",
        install: "pip install -e ."
    }])),
};

MAP_VERSION_TO_INSTALL_PYTEST["4.4"].pip_packages = [
    "atomicwrites==1.4.1", "attrs==23.1.0", "more-itertools==10.1.0",
    "pluggy==0.13.1", "py==1.11.0", "setuptools==68.0.0", "six==1.16.0",
];

MAP_VERSION_TO_INSTALL_PYTEST["4.5"].pip_packages = [
    "atomicwrites==1.4.1", "attrs==23.1.0", "more-itertools==10.1.0",
    "pluggy==0.11.0", "py==1.11.0", "setuptools==68.0.0", "six==1.16.0", "wcwidth==0.2.6"
];

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
