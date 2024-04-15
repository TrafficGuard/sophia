import { func } from '#agent/functions';
import { funcClass } from '#agent/metadata';

import { Dropbox } from 'dropbox';
import { envVar } from '#utils/env-var';

/**
 * AI generated. Not tested.
 */
@funcClass(__filename)
class DropboxClient {
	private dbx: Dropbox;

	constructor() {
		this.dbx = new Dropbox({ accessToken: envVar('DROPBOX_ACCESS_TOKEN') });
	}

	@func()
	async list(): Promise<string[]> {
		const response = await this.dbx.filesListFolder({ path: '' });
		return response.result.entries.map((entry) => `${entry.path_lower}/${entry.name}`);
	}

	@func()
	async createTextFile(filePath: string, contents: string): Promise<string> {
		const response = await this.dbx.filesUpload({
			path: filePath,
			contents: contents,
			mode: { '.tag': 'overwrite' },
		});
		return response.result.id;
	}

	@func()
	async createBinaryFile(filePath: string, contents: Uint8Array): Promise<string> {
		const response = await this.dbx.filesUpload({
			path: filePath,
			contents,
			mode: { '.tag': 'overwrite' },
		});
		return response.result.id;
	}
}

export default DropboxClient;
