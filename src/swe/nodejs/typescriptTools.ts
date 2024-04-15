import { func } from '#agent/functions';
import { funcClass } from '#agent/metadata';
import { getFileSystem } from '#agent/workflows';
import { execCommand } from '#utils/exec';
import { LanguageTools } from '../lang/languageTools';

@funcClass(__filename)
export class TypescriptTools implements LanguageTools {
	/**
	 * Generates an outline of a TypeScript repository by running the tsc command with the emitDeclarationOnly flag
	 * and returning the contents of all the type definition files.
	 */
	@func()
	async generateProjectMap(): Promise<string> {
		console.log('Generating TypeScript project map');
		const tempFolder = 'temp/dts';
		const tsConfigExists = await getFileSystem().fileExists('tsconfig.json');
		if (!tsConfigExists) throw new Error(`tsconfig.json not found in ${getFileSystem().getWorkingDirectory()}`);

		{
			const { exitCode, stdout, stderr } = await execCommand(`rm -rf ${tempFolder}`);
			if (exitCode > 1) throw new Error(stderr);
		}

		const { exitCode, stdout, stderr } = await execCommand(`npx tsc -d --declarationDir "./${tempFolder}" --emitDeclarationOnly`);
		if (exitCode > 0) throw new Error(`${stdout} ${stderr}`);

		const dtsFiles = new Map();
		const allFiles = await getFileSystem().getFileContentsRecursively(tempFolder);
		allFiles.forEach((value, key) => {
			console.log(key);
			dtsFiles.set(key.replace('.d.ts', '.ts').replace(tempFolder, 'src'), value);
		});
		const fileContents: string = getFileSystem().formatFileContentsAsXml(dtsFiles);

		// TODO create FileSystem.deleteFolder()
		await execCommand(`rm -rf ${tempFolder}`);

		return fileContents;
	}
}
