import * as fs from 'fs';
import * as path from 'path';
import { OAuth2Client } from 'google-auth-library';
import { drive_v3, google } from 'googleapis';

/**
 * AI generated. Not tested at all.
 */
export class GoogleDrive {
	private readonly driveClient: drive_v3.Drive;

	constructor(credentials: Record<string, string>) {
		const oauth2Client = new google.auth.OAuth2(credentials.client_id, credentials.client_secret, credentials.redirect_uris[0]);
		oauth2Client.setCredentials({
			access_token: credentials.access_token,
			refresh_token: credentials.refresh_token,
		});
		this.driveClient = google.drive({ version: 'v3', auth: oauth2Client });
	}

	public async list(): Promise<drive_v3.Schema$File[]> {
		const res = await this.driveClient.files.list({
			pageSize: 10,
			fields: 'nextPageToken, files(id, name)',
		});
		return res.data.files || [];
	}

	public async createTextFile(filePath: string, contents: string): Promise<string> {
		const res = await this.driveClient.files.create({
			requestBody: {
				name: path.basename(filePath),
				mimeType: 'text/plain',
			},
			media: {
				mimeType: 'text/plain',
				body: fs.createReadStream(contents),
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
}
