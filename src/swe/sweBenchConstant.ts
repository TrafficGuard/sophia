export interface VersionInstallation {
	python: string;
	packages?: string;
	install: string;
	pip_packages?: string[];
	pre_install?: string[];
	instance_image?: boolean;
	arch_specific_packages?: {
		aarch64?: string;
		x86_64?: string;
	};
	no_use_env?: boolean;
	pre_test?: string[];
	env_vars_test?: Record<string, string>;
}

export const PYTHON_ENVIRONMENT_VERSIONS: Record<string, string> = {
	'3.5': '3.5.10',
	'3.6': '3.6.15',
	'3.7': '3.7.17',
	'3.8': '3.8.19',
	'3.9': '3.9.19',
	'3.10': '3.10.14',
	'3.11': '3.11.9',
};

export const PYENV_REPOS: Set<string> = new Set(['astropy/astropy', 'django/django', 'psf/requests', 'scikit-learn/scikit-learn']);

export const MAP_VERSION_TO_INSTALL_SKLEARN: Record<string, VersionInstallation> = (() => {
	const baseConfig = {
		instance_image: true,
		python: '3.6',
		packages: 'numpy==1.19.2 scipy==1.5.2 cython==0.29.7 pytest==4.5.0 pandas matplotlib==3.1.0 joblib threadpoolctl',
		install: 'pip install -v --no-build-isolation -e .',
		arch_specific_packages: {
			aarch64: 'gxx_linux-aarch64 gcc_linux-aarch64 make',
		},
	};

	const newConfig = {
		instance_image: true,
		python: '3.9',
		pre_install: ['pip install setuptools wheel'],
		packages: 'numpy==1.26.4 scipy==1.13.0 cython==3.0.10 pytest==8.2.0 pandas==2.2.2 matplotlib==3.8.4 joblib==1.4.2 threadpoolctl==3.5.0',
		install: 'pip install -v --no-use-pep517 --no-build-isolation -e .',
		arch_specific_packages: {
			aarch64: 'gxx_linux-aarch64 gcc_linux-aarch64 make',
		},
	};

	return {
		'0.20': baseConfig,
		'0.21': baseConfig,
		'0.22': baseConfig,
		'1.3': newConfig,
		'1.4': newConfig,
	};
})();

export const MAP_VERSION_TO_INSTALL_FLASK: Record<string, VersionInstallation> = {
	'2.0': {
		python: '3.9',
		packages: 'requirements.txt',
		install: 'pip install -e .',
		pip_packages: ['Werkzeug==2.3.7', 'Jinja2==3.0.1', 'itsdangerous==2.1.2', 'click==8.0.1', 'MarkupSafe==2.1.3'],
	},
	'2.1': {
		python: '3.10',
		packages: 'requirements.txt',
		install: 'pip install -e .',
		pip_packages: ['click==8.1.3', 'itsdangerous==2.1.2', 'Jinja2==3.1.2', 'MarkupSafe==2.1.1', 'Werkzeug==2.3.7'],
	},
	...Object.fromEntries(
		['2.2', '2.3'].map((k) => [
			k,
			{
				python: '3.11',
				packages: 'requirements.txt',
				install: 'pip install -e .',
				pip_packages: ['click==8.1.3', 'itsdangerous==2.1.2', 'Jinja2==3.1.2', 'MarkupSafe==2.1.1', 'Werkzeug==2.3.7'],
			},
		]),
	),
};

export const MAP_VERSION_TO_INSTALL_DJANGO: Record<string, VersionInstallation> = {
	...Object.fromEntries(
		['1.7', '1.8', '1.9', '1.10', '1.11', '2.0', '2.1', '2.2'].map((k) => [
			k,
			{
				python: '3.5',
				packages: 'requirements.txt',
				install: 'python -m pip install -e .',
			},
		]),
	),
	...Object.fromEntries(
		['1.4', '1.5', '1.6'].map((k) => [
			k,
			{
				python: '3.5',
				install: 'python setup.py install',
			},
		]),
	),
	...Object.fromEntries(
		['3.0', '3.1', '3.2'].map((k) => [
			k,
			{
				python: '3.6',
				packages: 'requirements.txt',
				install: 'python -m pip install -e .',
			},
		]),
	),
	...Object.fromEntries(
		['4.0'].map((k) => [
			k,
			{
				python: '3.8',
				packages: 'requirements.txt',
				install: 'python -m pip install -e .',
			},
		]),
	),
	...Object.fromEntries(
		['4.1', '4.2'].map((k) => [
			k,
			{
				python: '3.9',
				packages: 'requirements.txt',
				install: 'python -m pip install -e .',
			},
		]),
	),
	...Object.fromEntries(
		['5.0'].map((k) => [
			k,
			{
				python: '3.11',
				packages: 'requirements.txt',
				install: 'python -m pip install -e .',
			},
		]),
	),
};

['2.2', '3.0', '3.1'].forEach((k) => {
	if (MAP_VERSION_TO_INSTALL_DJANGO[k]) {
		MAP_VERSION_TO_INSTALL_DJANGO[k].env_vars_test = { LANG: 'en_US.UTF-8', LC_ALL: 'en_US.UTF-8' };
	}
});

export const MAP_VERSION_TO_INSTALL_REQUESTS: Record<string, VersionInstallation> = Object.fromEntries(
	[
		'0.7',
		'0.8',
		'0.9',
		'0.11',
		'0.13',
		'0.14',
		'1.1',
		'1.2',
		'2.0',
		'2.2',
		'2.3',
		'2.4',
		'2.5',
		'2.7',
		'2.8',
		'2.9',
		'2.10',
		'2.11',
		'2.12',
		'2.17',
		'2.18',
		'2.19',
		'2.22',
		'2.26',
		'2.25',
		'2.27',
		'3.0',
	].map((k) => [
		k,
		{
			python: '3.9',
			packages: 'pytest',
			install: 'python -m pip install .',
		},
	]),
);

export const MAP_VERSION_TO_INSTALL_SEABORN: Record<string, VersionInstallation> = {
	...Object.fromEntries(
		['0.11'].map((k) => [
			k,
			{
				python: '3.9',
				install: 'pip install -e .',
				pip_packages: [
					'contourpy==1.1.0',
					'cycler==0.11.0',
					'fonttools==4.42.1',
					'importlib-resources==6.0.1',
					'kiwisolver==1.4.5',
					'matplotlib==3.7.2',
					'numpy==1.25.2',
					'packaging==23.1',
					'pandas==2.1.0',
					'pillow==10.0.0',
					'pyparsing==3.0.9',
					'pytest',
					'python-dateutil==2.8.2',
					'pytz==2023.3.post1',
					'scipy==1.11.2',
					'six==1.16.0',
					'tzdata==2023.1',
					'zipp==3.16.2',
				],
			},
		]),
	),
	...Object.fromEntries(
		['0.12', '0.13'].map((k) => [
			k,
			{
				python: '3.9',
				install: 'pip install -e .[dev]',
				pip_packages: [
					'contourpy==1.1.0',
					'cycler==0.11.0',
					'fonttools==4.42.1',
					'importlib-resources==6.0.1',
					'kiwisolver==1.4.5',
					'matplotlib==3.7.2',
					'numpy==1.25.2',
					'packaging==23.1',
					'pandas==2.1.0',
					'pillow==10.0.0',
					'pyparsing==3.0.9',
					'python-dateutil==2.8.2',
					'pytz==2023.3.post1',
					'scipy==1.11.2',
					'six==1.16.0',
					'tzdata==2023.1',
					'zipp==3.16.2',
				],
			},
		]),
	),
};

export const MAP_VERSION_TO_INSTALL_PYTEST: Record<string, VersionInstallation> = {
	...Object.fromEntries(
		['4.4', '4.5', '4.6', '5.0', '5.1', '5.2', '5.3', '5.4', '6.0', '6.2', '6.3', '7.0', '7.1', '7.2', '7.4', '8.0'].map((k) => [
			k,
			{
				python: '3.9',
				install: 'pip install -e .',
			},
		]),
	),
};

MAP_VERSION_TO_INSTALL_PYTEST['4.4'] = {
	...MAP_VERSION_TO_INSTALL_PYTEST['4.4'],
	pip_packages: ['atomicwrites==1.4.1', 'attrs==23.1.0', 'more-itertools==10.1.0', 'pluggy==0.13.1', 'py==1.11.0', 'setuptools==68.0.0', 'six==1.16.0'],
};

MAP_VERSION_TO_INSTALL_PYTEST['4.5'] = {
	...MAP_VERSION_TO_INSTALL_PYTEST['4.5'],
	pip_packages: [
		'atomicwrites==1.4.1',
		'attrs==23.1.0',
		'more-itertools==10.1.0',
		'pluggy==0.11.0',
		'py==1.11.0',
		'setuptools==68.0.0',
		'six==1.16.0',
		'wcwidth==0.2.6',
	],
};

MAP_VERSION_TO_INSTALL_PYTEST['4.6'] = {
	...MAP_VERSION_TO_INSTALL_PYTEST['4.6'],
	pip_packages: [
		'atomicwrites==1.4.1',
		'attrs==23.1.0',
		'more-itertools==10.1.0',
		'importlib-metadata==1.6.0',
		'packaging==23.1',
		'pluggy==0.13.1',
		'py==1.11.0',
		'six==1.16.0',
		'wcwidth==0.2.6',
	],
};

['5.0', '5.1', '5.2'].forEach((k) => {
	MAP_VERSION_TO_INSTALL_PYTEST[k] = {
		...MAP_VERSION_TO_INSTALL_PYTEST[k],
		pip_packages: ['atomicwrites==1.4.1', 'attrs==23.1.0', 'more-itertools==10.1.0', 'packaging==23.1', 'pluggy==0.13.1', 'py==1.11.0', 'wcwidth==0.2.6'],
	};
});

MAP_VERSION_TO_INSTALL_PYTEST['5.3'] = {
	...MAP_VERSION_TO_INSTALL_PYTEST['5.3'],
	pip_packages: ['attrs==23.1.0', 'more-itertools==10.1.0', 'packaging==23.1', 'pluggy==0.13.1', 'py==1.11.0', 'wcwidth==0.2.6'],
};

MAP_VERSION_TO_INSTALL_PYTEST['5.4'] = {
	...MAP_VERSION_TO_INSTALL_PYTEST['5.4'],
	pip_packages: ['py==1.11.0', 'packaging==23.1', 'attrs==23.1.0', 'more-itertools==10.1.0', 'pluggy==0.13.1', 'wcwidth==0.2.6'],
	pre_test: ['pip install -e .'],
};

['6.0', '6.2', '6.3', '7.0', '7.1', '7.2', '7.4', '8.0'].forEach((version) => {
	if (version in MAP_VERSION_TO_INSTALL_PYTEST) {
		MAP_VERSION_TO_INSTALL_PYTEST[version] = {
			...MAP_VERSION_TO_INSTALL_PYTEST[version],
			pip_packages: [],
		};
	}
});

MAP_VERSION_TO_INSTALL_PYTEST['6.0'].pip_packages = [
	'attrs==23.1.0',
	'iniconfig==2.0.0',
	'more-itertools==10.1.0',
	'packaging==23.1',
	'pluggy==0.13.1',
	'py==1.11.0',
	'toml==0.10.2',
];

['6.2', '6.3'].forEach((version) => {
	MAP_VERSION_TO_INSTALL_PYTEST[version].pip_packages = [
		'attrs==23.1.0',
		'iniconfig==2.0.0',
		'packaging==23.1',
		'pluggy==0.13.1',
		'py==1.11.0',
		'toml==0.10.2',
	];
});

MAP_VERSION_TO_INSTALL_PYTEST['7.0'].pip_packages = ['attrs==23.1.0', 'iniconfig==2.0.0', 'packaging==23.1', 'pluggy==0.13.1', 'py==1.11.0'];

['7.1', '7.2'].forEach((version) => {
	MAP_VERSION_TO_INSTALL_PYTEST[version].pip_packages = [
		'attrs==23.1.0',
		'iniconfig==2.0.0',
		'packaging==23.1',
		'pluggy==0.13.1',
		'py==1.11.0',
		'tomli==2.0.1',
	];
});

MAP_VERSION_TO_INSTALL_PYTEST['7.4'].pip_packages = ['iniconfig==2.0.0', 'packaging==23.1', 'pluggy==1.3.0', 'exceptiongroup==1.1.3', 'tomli==2.0.1'];

MAP_VERSION_TO_INSTALL_PYTEST['8.0'].pip_packages = ['iniconfig==2.0.0', 'packaging==23.1', 'pluggy==1.3.0', 'exceptiongroup==1.1.3', 'tomli==2.0.1'];

// Conversion of the first part of MAP_VERSION_TO_INSTALL_MATPLOTLIB

const MATPLOTLIB_3_5_to_3_7 = {
	python: '3.11',
	packages: 'environment.yml',
	install: 'python -m pip install -e .',
	pip_packages: [
		'contourpy==1.1.0',
		'cycler==0.11.0',
		'fonttools==4.42.1',
		'kiwisolver==1.4.5',
		'numpy==1.25.2',
		'packaging==23.1',
		'pillow==10.0.0',
		'pyparsing==3.0.9',
		'python-dateutil==2.8.2',
		'six==1.16.0',
		'setuptools==66.1.1',
		'setuptools-scm==7.1.0',
		'typing-extensions==4.7.1',
	],
	arch_specific_packages: {
		aarch64: 'gxx_linux-aarch64 gcc_linux-aarch64 make',
	},
};
const MATPLOTLIB_3_1_to_3_4 = {
	python: '3.8',
	packages: 'requirements.txt',
	install: 'python -m pip install -e .',
	pip_packages: [],
	arch_specific_packages: {
		aarch64: 'gxx_linux-aarch64 gcc_linux-aarch64 make',
	},
};

const MATPLOTLIB_3_0 = {
	python: '3.7',
	packages: 'requirements.txt',
	install: 'python -m pip install -e .',
	pip_packages: ['freetype'],
	arch_specific_packages: {
		aarch64: 'gxx_linux-aarch64 gcc_linux-aarch64 make',
	},
};

export const MAP_VERSION_TO_INSTALL_MATPLOTLIB: Record<string, VersionInstallation> = {
	'3.0': MATPLOTLIB_3_0,
	'3.1': MATPLOTLIB_3_1_to_3_4,
	'3.2': MATPLOTLIB_3_1_to_3_4,
	'3.3': MATPLOTLIB_3_1_to_3_4,
	'3.4': MATPLOTLIB_3_1_to_3_4,
	'3.5': MATPLOTLIB_3_5_to_3_7,
	'3.6': MATPLOTLIB_3_5_to_3_7,
	'3.7': MATPLOTLIB_3_5_to_3_7,
};

const SPHINX_VERSIONS_1_5_TO_2_4 = ['1.5', '1.6', '1.7', '1.8', '2.0', '2.1', '2.2', '2.3', '2.4'];
const SPHINX_VERSIONS_3_0_TO_4_4 = ['3.0', '3.1', '3.2', '3.3', '3.4', '3.5', '4.0', '4.1', '4.2', '4.3', '4.4'];
const SPHINX_VERSIONS_4_5_TO_7_2 = ['4.5', '5.0', '5.1', '5.2', '5.3', '6.0', '6.2', '7.0', '7.1', '7.2'];

const SPHINX_ADDITIONAL_PRE_INSTALL = [
	"sed -i 's/Jinja2>=2.3/Jinja2<3.0/' setup.py",
	"sed -i 's/sphinxcontrib-applehelp/sphinxcontrib-applehelp<=1.0.7/' setup.py",
	"sed -i 's/sphinxcontrib-devhelp/sphinxcontrib-devhelp<=1.0.5/' setup.py",
	"sed -i 's/sphinxcontrib-qthelp/sphinxcontrib-qthelp<=1.0.6/' setup.py",
	"sed -i 's/alabaster>=0.7,<0.8/alabaster>=0.7,<0.7.12/' setup.py",
	"sed -i \"s/'packaging',/'packaging', 'markupsafe<=2.0.1',/\" setup.py",
];

const SPHINX_ADDITIONAL_PRE_INSTALL_4_2_TO_4_4 = [
	"sed -i 's/sphinxcontrib-htmlhelp>=2.0.0/sphinxcontrib-htmlhelp>=2.0.0,<=2.0.4/' setup.py",
	"sed -i 's/sphinxcontrib-serializinghtml>=1.1.5/sphinxcontrib-serializinghtml>=1.1.5,<=1.1.9/' setup.py",
];

const SPHINX_ADDITIONAL_PRE_INSTALL_4_1 = [
	"grep -q 'sphinxcontrib-htmlhelp>=2.0.0' setup.py && " +
		"sed -i 's/sphinxcontrib-htmlhelp>=2.0.0/sphinxcontrib-htmlhelp>=2.0.0,<=2.0.4/' setup.py || " +
		"sed -i 's/sphinxcontrib-htmlhelp/sphinxcontrib-htmlhelp<=2.0.4/' setup.py",
	"grep -q 'sphinxcontrib-serializinghtml>=1.1.5' setup.py && " +
		"sed -i 's/sphinxcontrib-serializinghtml>=1.1.5/sphinxcontrib-serializinghtml>=1.1.5,<=1.1.9/' setup.py || " +
		"sed -i 's/sphinxcontrib-serializinghtml/sphinxcontrib-serializinghtml<=1.1.9/' setup.py",
];

const SPHINX_ADDITIONAL_PRE_INSTALL_OTHERS = [
	"sed -i 's/sphinxcontrib-htmlhelp/sphinxcontrib-htmlhelp<=2.0.4/' setup.py",
	"sed -i 's/sphinxcontrib-serializinghtml/sphinxcontrib-serializinghtml<=1.1.9/' setup.py",
];

export const SPHINX_BASE_CONFIG: VersionInstallation = {
	python: '3.9',
	pip_packages: ['tox'],
	install: "pip install -e '.[test]'",
	pre_install: ["sed -i 's/pytest/pytest -rA/' tox.ini"],
	arch_specific_packages: {
		aarch64: 'gxx_linux-aarch64 gcc_linux-aarch64 make',
		x86_64: 'gxx_linux-64 gcc_linux-64 make',
	},
};

export const MAP_VERSION_TO_INSTALL_SPHINX: Record<string, VersionInstallation> = {};

[...SPHINX_VERSIONS_1_5_TO_2_4, ...SPHINX_VERSIONS_3_0_TO_4_4, ...SPHINX_VERSIONS_4_5_TO_7_2].forEach((version) => {
	MAP_VERSION_TO_INSTALL_SPHINX[version] = { ...SPHINX_BASE_CONFIG };
});

SPHINX_VERSIONS_3_0_TO_4_4.forEach((version) => {
	MAP_VERSION_TO_INSTALL_SPHINX[version].pre_install = [...(MAP_VERSION_TO_INSTALL_SPHINX[version].pre_install || []), ...SPHINX_ADDITIONAL_PRE_INSTALL];

	if (['4.2', '4.3', '4.4'].includes(version)) {
		MAP_VERSION_TO_INSTALL_SPHINX[version].pre_install = [
			...(MAP_VERSION_TO_INSTALL_SPHINX[version].pre_install || []),
			...SPHINX_ADDITIONAL_PRE_INSTALL_4_2_TO_4_4,
		];
	} else if (version === '4.1') {
		MAP_VERSION_TO_INSTALL_SPHINX[version].pre_install = [...(MAP_VERSION_TO_INSTALL_SPHINX[version].pre_install || []), ...SPHINX_ADDITIONAL_PRE_INSTALL_4_1];
	} else {
		MAP_VERSION_TO_INSTALL_SPHINX[version].pre_install = [
			...(MAP_VERSION_TO_INSTALL_SPHINX[version].pre_install || []),
			...SPHINX_ADDITIONAL_PRE_INSTALL_OTHERS,
		];
	}
});

Object.values(MAP_VERSION_TO_INSTALL_SPHINX).forEach((spec) => {
	spec.pre_test = spec.pre_install;
});

export const MAP_VERSION_TO_INSTALL_ASTROPY: Record<string, VersionInstallation> = (() => {
	const baseConfig: VersionInstallation = {
		python: '3.9',
		install: "pip install -e '.[test]'",
		pre_install: ['pip install setuptools==68.0.0'],
		pip_packages: [
			'attrs==23.1.0',
			'exceptiongroup==1.1.3',
			'execnet==2.0.2',
			'hypothesis==6.82.6',
			'iniconfig==2.0.0',
			'numpy==1.23.4',
			'packaging==23.1',
			'pluggy==1.3.0',
			'psutil==5.9.5',
			'pyerfa==2.0.0.3',
			'pytest-arraydiff==0.5.0',
			'pytest-astropy-header==0.2.2',
			'pytest-astropy==0.10.0',
			'pytest-cov==4.1.0',
			'pytest-doctestplus==1.0.0',
			'pytest-filter-subpackage==0.1.2',
			'pytest-mock==3.11.1',
			'pytest-openfiles==0.5.0',
			'pytest-remotedata==0.4.0',
			'pytest-xdist==3.3.1',
			'pytest==7.4.0',
			'PyYAML==6.0.1',
			'sortedcontainers==2.4.0',
			'tomli==2.0.1',
		],
	};

	const versions = ['0.1', '0.2', '0.3', '0.4', '1.1', '1.2', '1.3', '3.0', '3.1', '3.2', '4.1', '4.2', '4.3', '5.0', '5.1', '5.2'];

	return Object.fromEntries(versions.map((version) => [version, baseConfig]));
})();

export const MAP_VERSION_TO_INSTALL_SYMPY: Record<string, VersionInstallation> = {
	...Object.fromEntries(
		['1.10', '1.11', '1.12', '1.2', '1.4', '1.5', '1.6', '1.7', '1.8', '1.9'].map((k) => [
			k,
			{
				python: '3.9',
				packages: 'mpmath flake8',
				pip_packages: ['mpmath==1.3.0', 'flake8-comprehensions'],
				install: 'pip install -e .',
			},
		]),
	),
	...Object.fromEntries(
		['0.7', '1.0', '1.1'].map((k) => [
			k,
			{
				python: '3.7',
				packages: 'mpmath flake8',
				pip_packages: ['mpmath==1.3.0', 'flake8-comprehensions'],
				install: 'pip install -e .',
			},
		]),
	),
	'1.13': {
		python: '3.9',
		packages: 'requirements.txt',
		install: 'pip install -e .',
		pip_packages: ['mpmath==1.3.0'],
	},
};

export const MAP_VERSION_TO_INSTALL_PYLINT: Record<string, VersionInstallation> = {
	...Object.fromEntries(
		['2.10', '2.11', '2.13', '2.14', '2.15', '2.16', '2.17', '2.8', '2.9', '3.0'].map((k) => [
			k,
			{
				python: '3.9',
				packages: 'requirements.txt',
				install: 'pip install -e .',
				pip_packages: ['pytest'],
			},
		]),
	),
};

MAP_VERSION_TO_INSTALL_PYLINT['2.15'].pre_test = ['pip install -e .'];

MAP_VERSION_TO_INSTALL_PYLINT['2.13'] = {
	...MAP_VERSION_TO_INSTALL_PYLINT['2.13'],
	pip_packages: ['toml', 'pytest'],
};

MAP_VERSION_TO_INSTALL_PYLINT['3.0'] = {
	...MAP_VERSION_TO_INSTALL_PYLINT['3.0'],
	pip_packages: ['astroid==3.0.0a6', 'pytest'],
};

export const MAP_VERSION_TO_INSTALL_XARRAY: Record<string, VersionInstallation> = {
	...Object.fromEntries(
		['0.12', '0.18', '0.19', '0.20', '2022.03', '2022.06', '2022.09'].map((k) => [
			k,
			{
				python: '3.10',
				packages: 'environment.yml',
				install: 'pip install -e .',
				pip_packages: ['numpy==1.25.2', 'packaging==23.1', 'pandas==1.5.3', 'pytest==8.1.1', 'python-dateutil==2.8.2', 'pytz==2023.3', 'six==1.16.0'],
				no_use_env: true,
			},
		]),
	),
};

export const MAP_VERSION_TO_INSTALL_SQLFLUFF: Record<string, VersionInstallation> = {
	...Object.fromEntries(
		['0.10', '0.11', '0.12', '0.13', '0.4', '0.6', '0.8', '0.9', '1.1', '1.2', '1.3', '1.4', '2.0', '2.1', '2.2'].map((k) => [
			k,
			{
				python: '3.9',
				packages: 'requirements.txt',
				install: 'pip install -e .',
			},
		]),
	),
};

export const MAP_VERSION_TO_INSTALL_PYVISTA: Record<string, VersionInstallation> = {
	...Object.fromEntries(
		['0.20', '0.21', '0.22', '0.23'].map((k) => [
			k,
			{
				python: '3.9',
				install: 'pip install -e .',
				pip_packages: ['pytest'],
			},
		]),
	),
	...Object.fromEntries(
		[
			'0.24',
			'0.25',
			'0.26',
			'0.27',
			'0.28',
			'0.29',
			'0.30',
			'0.31',
			'0.32',
			'0.33',
			'0.34',
			'0.35',
			'0.36',
			'0.37',
			'0.38',
			'0.39',
			'0.40',
			'0.41',
			'0.42',
			'0.43',
		].map((k) => [
			k,
			{
				python: '3.9',
				packages: 'requirements.txt',
				install: 'pip install -e .',
				pip_packages: ['pytest'],
			},
		]),
	),
};

export const MAP_VERSION_TO_INSTALL_ASTROID: Record<string, VersionInstallation> = {
	...Object.fromEntries(
		['2.10', '2.12', '2.13', '2.14', '2.15', '2.5', '2.6', '2.7', '2.9', '3.0'].map((k) => [
			k,
			{
				python: '3.9',
				install: 'pip install -e .',
				pip_packages: ['pytest'],
			},
		]),
	),
};

// Add additional pip packages for specific versions
['2.5', '2.6'].forEach((version) => {
	if (MAP_VERSION_TO_INSTALL_ASTROID[version]) {
		MAP_VERSION_TO_INSTALL_ASTROID[version].pip_packages?.push('lazy_object_proxy==1.9.0', 'wrapt==1.12.1');
	}
});

['2.9', '2.10'].forEach((version) => {
	if (MAP_VERSION_TO_INSTALL_ASTROID[version]) {
		MAP_VERSION_TO_INSTALL_ASTROID[version].pip_packages?.push('lazy_object_proxy==1.9.0', 'wrapt==1.13.3', 'typing-extensions==4.8.0', 'setuptools==68.0.0');
	}
});

['2.12', '2.13', '2.14', '2.15'].forEach((version) => {
	if (MAP_VERSION_TO_INSTALL_ASTROID[version]) {
		MAP_VERSION_TO_INSTALL_ASTROID[version].pip_packages?.push('lazy_object_proxy==1.9.0', 'wrapt==1.15.0', 'typing-extensions==4.8.0');
	}
});

if (MAP_VERSION_TO_INSTALL_ASTROID['2.7']) {
	MAP_VERSION_TO_INSTALL_ASTROID['2.7'].pip_packages?.push('lazy_object_proxy==1.9.0', 'wrapt==1.12.1', 'typing-extensions==4.8.0');
}

if (MAP_VERSION_TO_INSTALL_ASTROID['3.0']) {
	MAP_VERSION_TO_INSTALL_ASTROID['3.0'].pip_packages?.push('typing-extensions==4.8.0');
}

export const MAP_VERSION_TO_INSTALL_MARSHMALLOW: Record<string, VersionInstallation> = {
	...Object.fromEntries(
		['2.18', '2.19', '2.20', '3.0', '3.12', '3.19', '3.9'].map((k) => [
			k,
			{
				python: '3.9',
				install: "pip install -e '.[dev]'",
			},
		]),
	),
};

export const MAP_VERSION_TO_INSTALL_PVLIB: Record<string, VersionInstallation> = {
	...Object.fromEntries(
		['0.5', '0.6', '0.7', '0.8', '0.9'].map((k) => [
			k,
			{
				python: '3.9',
				install: 'pip install -e .[all]',
				packages: 'pandas scipy',
				pip_packages: ['jupyter', 'ipython', 'matplotlib', 'pytest', 'flake8'],
			},
		]),
	),
};

export const MAP_VERSION_TO_INSTALL_PYDICOM: Record<string, VersionInstallation> = {
	...Object.fromEntries(
		['1.2', '1.3'].map((k) => [
			k,
			{
				python: '3.6',
				install: 'pip install -e .',
				packages: 'numpy==1.26.4',
				pip_packages: ['pytest'],
			},
		]),
	),
	...Object.fromEntries(
		['1.4', '2.0'].map((k) => [
			k,
			{
				python: '3.8',
				install: 'pip install -e .',
				packages: 'numpy==1.26.4',
				pip_packages: ['pytest==4.6.11'],
			},
		]),
	),
	...Object.fromEntries(
		['2.1', '2.2'].map((k) => [
			k,
			{
				python: '3.9',
				install: 'pip install -e .',
				packages: 'numpy==1.26.4',
				pip_packages: ['pytest==4.6.11'],
			},
		]),
	),
	'2.3': {
		python: '3.10',
		install: 'pip install -e .',
		packages: 'numpy==1.26.4',
		pip_packages: ['pytest'],
	},
};

export const MAP_VERSION_TO_INSTALL_HUMANEVAL = { '1.0': { python: '3.9' } };

// Constants - Task Instance Instllation Environment
export const MAP_VERSION_TO_INSTALL = {
	'astropy/astropy': MAP_VERSION_TO_INSTALL_ASTROPY,
	'django/django': MAP_VERSION_TO_INSTALL_DJANGO,
	'matplotlib/matplotlib': MAP_VERSION_TO_INSTALL_MATPLOTLIB,
	'marshmallow-code/marshmallow': MAP_VERSION_TO_INSTALL_MARSHMALLOW,
	'mwaskom/seaborn': MAP_VERSION_TO_INSTALL_SEABORN,
	'pallets/flask': MAP_VERSION_TO_INSTALL_FLASK,
	'psf/requests': MAP_VERSION_TO_INSTALL_REQUESTS,
	'pvlib/pvlib-python': MAP_VERSION_TO_INSTALL_PVLIB,
	'pydata/xarray': MAP_VERSION_TO_INSTALL_XARRAY,
	'pydicom/pydicom': MAP_VERSION_TO_INSTALL_PYDICOM,
	'pylint-dev/astroid': MAP_VERSION_TO_INSTALL_ASTROID,
	'pylint-dev/pylint': MAP_VERSION_TO_INSTALL_PYLINT,
	'pytest-dev/pytest': MAP_VERSION_TO_INSTALL_PYTEST,
	'pyvista/pyvista': MAP_VERSION_TO_INSTALL_PYVISTA,
	'scikit-learn/scikit-learn': MAP_VERSION_TO_INSTALL_SKLEARN,
	'sphinx-doc/sphinx': MAP_VERSION_TO_INSTALL_SPHINX,
	'sqlfluff/sqlfluff': MAP_VERSION_TO_INSTALL_SQLFLUFF,
	'swe-bench/humaneval': MAP_VERSION_TO_INSTALL_HUMANEVAL,
	'sympy/sympy': MAP_VERSION_TO_INSTALL_SYMPY,
};

// Constants - Repository Specific Installation Instructions
export const MAP_REPO_TO_INSTALL = {};

export const TEST_PYTEST = 'pytest --no-header -rA --tb=no -p no:cacheprovider';
export const TEST_PYTEST_SKIP_NO_HEADER = 'pytest -rA --tb=no -p no:cacheprovider';

export const MAP_REPO_TO_TEST_FRAMEWORK: Record<string, string> = {
	'astropy/astropy': TEST_PYTEST,
	'django/django': './tests/runtests.py --verbosity 2',
	'marshmallow-code/marshmallow': TEST_PYTEST,
	'matplotlib/matplotlib': TEST_PYTEST,
	'mwaskom/seaborn': 'pytest --no-header -rA',
	'pallets/flask': TEST_PYTEST,
	'psf/requests': TEST_PYTEST,
	'pvlib/pvlib-python': TEST_PYTEST,
	'pydata/xarray': TEST_PYTEST,
	'pydicom/pydicom': TEST_PYTEST_SKIP_NO_HEADER,
	'pylint-dev/astroid': TEST_PYTEST,
	'pylint-dev/pylint': TEST_PYTEST,
	'pytest-dev/pytest': 'pytest -rA',
	'pyvista/pyvista': TEST_PYTEST,
	'scikit-learn/scikit-learn': TEST_PYTEST_SKIP_NO_HEADER,
	'sphinx-doc/sphinx': 'tox -epy39 -v --',
	'sqlfluff/sqlfluff': TEST_PYTEST,
	'swe-bench/humaneval': 'python',
	'sympy/sympy': 'bin/test -C --verbose',
};

export const MAP_REPO_TO_REQS_PATHS: Record<string, string[]> = {
	'django/django': ['tests/requirements/py3.txt'],
	'matplotlib/matplotlib': ['requirements/dev/dev-requirements.txt', 'requirements/testing/travis_all.txt'],
	'pallets/flask': ['requirements/dev.txt'],
	'pylint-dev/pylint': ['requirements_test.txt'],
	'pyvista/pyvista': ['requirements_test.txt', 'requirements.txt'],
	'sqlfluff/sqlfluff': ['requirements_dev.txt'],
	'sympy/sympy': ['requirements-dev.txt'],
};

export const MAP_REPO_TO_ENV_YML_PATHS: Record<string, string[]> = {
	'matplotlib/matplotlib': ['environment.yml'],
	'pydata/xarray': ['ci/requirements/environment.yml', 'environment.yml'],
};

export const MAP_REPO_TO_DEB_PACKAGES: Record<string, string[]> = {
	'matplotlib/matplotlib': ['texlive', 'texlive-xetex', 'dvipng', 'ghostscript', 'libfreetype-dev', 'libtiff-dev'],
	'pyvista/pyvista': ['libgl1', 'libxrender1'],
};

export const KEY_INSTANCE_ID = 'instance_id';
export const KEY_MODEL = 'model_name_or_path';
export const KEY_PREDICTION = 'model_patch';

export const APPLY_PATCH_FAIL = '>>>>> Patch Apply Failed';
export const APPLY_PATCH_PASS = '>>>>> Applied Patch';
export const INSTALL_FAIL = '>>>>> Init Failed';
export const INSTALL_PASS = '>>>>> Init Succeeded';
export const INSTALL_TIMEOUT = '>>>>> Init Timed Out';
export const RESET_FAILED = '>>>>> Reset Failed';
export const TESTS_ERROR = '>>>>> Tests Errored';
export const TESTS_FAILED = '>>>>> Some Tests Failed';
export const TESTS_PASSED = '>>>>> All Tests Passed';
export const TESTS_TIMEOUT = '>>>>> Tests Timed Out';

export enum PatchType {
	PATCH_GOLD = 'gold',
	PATCH_PRED = 'pred',
	PATCH_PRED_TRY = 'pred_try',
	PATCH_PRED_MINIMAL = 'pred_minimal',
	PATCH_PRED_MINIMAL_TRY = 'pred_minimal_try',
	PATCH_TEST = 'test',
}

export const NON_TEST_EXTS = ['.json', '.png', 'csv', '.txt', '.md', '.jpg', '.jpeg', '.pkl', '.yml', '.yaml', '.toml'];
export const SWE_BENCH_URL_RAW = 'https://raw.githubusercontent.com/';
