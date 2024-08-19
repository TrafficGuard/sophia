export interface VersionInstallation {
    python: string;
    packages?: string;
    install: string;
    pip_packages?: string[];
    pre_install?: string[];
    instance_image?: boolean;
    arch_specific_packages?: {
        aarch64: string
    }
}

export const MAP_VERSION_TO_INSTALL: Record<string, Record<string, VersionInstallation>> = {
    'huggingface/transformers': {
        '4.18.0': {
            python: '3.7',
            packages: 'torch torchvision torchaudio',
            install: 'pip install -e .',
            pip_packages: ['datasets'],
        },
        // Add more versions as needed
    },
    'pytorch/pytorch': {
        '1.11.0': {
            python: '3.7',
            packages: 'numpy ninja pyyaml setuptools cmake cffi typing_extensions future six requests dataclasses',
            install: 'pip install -e .',
            pre_install: ['pip install --upgrade pip'],
        },
        // Add more versions as needed
    },
    'scikit-learn/scikit-learn': {
        '0.20': {
            instance_image: true,
            python: '3.6',
            packages: 'numpy==1.19.2 scipy==1.5.2 cython==0.29.7 pytest==4.5.0 pandas matplotlib==3.1.0 joblib threadpoolctl',
            install: 'pip install -v --no-build-isolation -e .',
            arch_specific_packages: {
                aarch64: 'gxx_linux-aarch64 gcc_linux-aarch64 make',
            },
        },
        // Add more versions as needed
    },
    'django/django': {
        '1.7': {
            python: '3.5',
            packages: 'requirements.txt',
            install: 'python -m pip install -e .',
        },
        // Add more versions as needed
    },
    'matplotlib/matplotlib': {
        '3.5': {
            python: '3.11',
            packages: 'environment.yml',
            install: 'python -m pip install -e .',
            pip_packages: [
                'contourpy==1.1.0', 'cycler==0.11.0', 'fonttools==4.42.1',
                'kiwisolver==1.4.5', 'numpy==1.25.2', 'packaging==23.1',
                'pillow==10.0.0', 'pyparsing==3.0.9', 'python-dateutil==2.8.2',
                'six==1.16.0', 'setuptools==66.1.1', 'setuptools-scm==7.1.0',
                'typing-extensions==4.7.1',
            ],
            arch_specific_packages: {
                aarch64: 'gxx_linux-aarch64 gcc_linux-aarch64 make',
            }
        },
        // Add more versions as needed
    },
    'astropy/astropy': {
        '5.0': {
            python: '3.9',
            install: 'pip install -e .[test]',
            pre_install: ['pip install setuptools==68.0.0'],
            pip_packages: [
                'attrs==23.1.0', 'exceptiongroup==1.1.3', 'execnet==2.0.2', 'hypothesis==6.82.6',
                'iniconfig==2.0.0', 'numpy==1.23.4', 'packaging==23.1', 'pluggy==1.3.0',
                'psutil==5.9.5', 'pyerfa==2.0.0.3', 'pytest-arraydiff==0.5.0', 'pytest-astropy-header==0.2.2',
                'pytest-astropy==0.10.0', 'pytest-cov==4.1.0', 'pytest-doctestplus==1.0.0', 'pytest-filter-subpackage==0.1.2',
                'pytest-mock==3.11.1', 'pytest-openfiles==0.5.0', 'pytest-remotedata==0.4.0', 'pytest-xdist==3.3.1',
                'pytest==7.4.0', 'PyYAML==6.0.1', 'sortedcontainers==2.4.0', 'tomli==2.0.1',
            ],
        },
        // Add more versions as needed
    },
    'sympy/sympy': {
        '1.10': {
            python: '3.9',
            packages: 'mpmath flake8',
            pip_packages: ['mpmath==1.3.0', 'flake8-comprehensions'],
            install: 'pip install -e .',
        },
        // Add more versions as needed
    },
    // Add more repositories as needed
};