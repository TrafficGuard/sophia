import { getFileSystem } from '#agent/agentContext';
import { logger } from '#o11y/logger';
import { execCommand } from '#utils/exec';
import { func } from '../../../functionDefinition/functions';
import { funcClass } from '../../../functionDefinition/metadata';
import { LanguageTools } from '../languageTools';

@funcClass(__filename)
export class TypescriptTools implements LanguageTools {
	/**
	 * Generates an outline of a TypeScript repository by running the tsc command with the emitDeclarationOnly flag
	 * and returning the contents of all the type definition files.
	 */
	@func()
	async generateProjectMap(): Promise<string> {
		// Note that the project needs to be in a compilable state otherwise this will fail
		logger.info('Generating TypeScript project map');
		const tempFolder = '.nous/dts';
		const tsConfigExists = await getFileSystem().fileExists('tsconfig.json');
		if (!tsConfigExists) throw new Error(`tsconfig.json not found in ${getFileSystem().getWorkingDirectory()}`);

		// TODO if .nous/dts exists move to backup location
		{
			const { exitCode, stdout, stderr } = await execCommand(`rm -rf ${tempFolder}`);
			if (exitCode > 1) throw new Error(stderr);
		}

		const { exitCode, stdout, stderr } = await execCommand(`npx tsc -d --declarationDir "./${tempFolder}" --emitDeclarationOnly`);
		// TODO if this fails because the code editor made a compile error, then restore the backup. Otherwise delete the backup
		if (exitCode > 0) throw new Error(`${stdout} ${stderr}`);
		logger.warn(`${stderr}`);

		const dtsFiles = new Map();
		const allFiles = await getFileSystem().getFileContentsRecursively(tempFolder);
		allFiles.forEach((value, key) => {
			logger.debug(key);
			dtsFiles.set(key.replace('.d.ts', '.ts').replace(tempFolder, 'src'), value);
		});
		return getFileSystem().formatFileContentsAsXml(dtsFiles);
	}

	async installPackage(packageName: string): Promise<void> {
		// TODO if lock files exists for other package managers, then use them
		// TODO check Snyk etc for any major vulnerability

		const result = await execCommand(`npm install ${packageName}`);
		if (result.exitCode > 0) throw new Error(`${result.stdout}\n${result.stderr}`);
	}
}
