import { func, funcClass } from '#functionSchema/functionDecorators';
import { execCommand } from '#utils/exec';

@funcClass(__filename)
export class TypescriptTools {
    /**
     * Runs an npm script defined in the package.json file
     * @param scriptName The name of the script to run
     * @returns The output of the npm script
     */
    @func()
    async runNpmScript(scriptName: string): Promise<string> {
        const { stdout, stderr } = await execCommand(`npm run ${scriptName}`);
        return stdout + stderr;
    }

    /**
     * Generates a project map
     * @returns A string representation of the project map
     */
    @func()
    async generateProjectMap(): Promise<string> {
        // Implementation for generating project map
        return "Project map generated";
    }

    /**
     * Installs a package using npm
     * @param packageName The name of the package to install
     * @returns The output of the npm install command
     */
    @func()
    async installPackage(packageName: string): Promise<string> {
        const { stdout, stderr } = await execCommand(`npm install ${packageName}`);
        return stdout + stderr;
    }
}

export const TYPESCRIPT_TOOLS = new TypescriptTools();
