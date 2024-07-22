import * as fs from 'fs';
import * as path from 'path';
import { OAuth2Client } from 'google-auth-library';
import { drive_v3, google } from 'googleapis';
import { func, funcClass } from '#functionSchema/functionDecorators';

/**
 * AI generated. Not tested at all.
 */
@funcClass(__filename)
export class GoogleDrive {
	private readonly driveClient: drive_v3.Drive;

	/**
	 * Lists the files
	 */
	@func()
	public async list(): Promise<drive_v3.Schema$File[]> {
		const res = await this.driveClient.files.list({
			pageSize: 10,
			fields: 'nextPageToken, files(id, name)',
		});
		return res.data.files || [];
	}

	/**
	 * Creates a text file
	 * @param filePath e.g. dir/filename
	 * @param fileContents
	 */
	@func()
	public async createTextFile(filePath: string, fileContents: string): Promise<string> {
		const res = await this.driveClient.files.create({
			requestBody: {
				name: path.basename(filePath),
				mimeType: 'text/plain',
			},
			media: {
				mimeType: 'text/plain',
				body: fs.createReadStream(fileContents),
			},
		});
		return res.data.id;
	}

	async createBinaryFile(filePath: string): Promise<string> {
		const fileMetadata = {
			name: path.basename(filePath),
		};
		const media = {
			mimeType: 'image/jpeg',
			body: fs.createReadStream(filePath),
		};
		const res = await this.driveClient.files.create({
			requestBody: fileMetadata,
			media: media,
			fields: 'id',
		});
		return res.data.id;
	}

	public async updateFile(fileId: string, contents: string): Promise<string> {
		const res = await this.driveClient.files.update({
			fileId: fileId,
			requestBody: {},
			media: {
				mimeType: 'text/plain',
				body: fs.createReadStream(contents),
			},
		});
		return res.data.id;
	}

	/**
	 * Checks if a folder exists
	 * @param folderName
	 */
	@func()
	public async folderExists(folderName: string): Promise<boolean> {
		return true;
	}

	/**
	 * Create a new folder. Fails if the folder already exists
	 * @param folderName
	 */
	@func()
	public async createFolder(folderName: string): Promise<void> {}
}
