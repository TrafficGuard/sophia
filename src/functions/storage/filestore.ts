import { GetToolType } from '#functions/toolType';

export interface FileMetadata {
	filename: string;
	description: string;
	sizeKb: string;
	lastUpdated: string;
}

export interface FileStore extends GetToolType {
	/**
	 * Saves the contents to a file with the given filename and updates metadata.
	 * @param {string} filename - The name of the file to save.
	 * @param {string} contents - The contents to save to the file.
	 * @param {string} description - A description of the file.
	 * @returns {Promise<void>}
	 */
	saveFile(filename: string, contents: string, description: string): Promise<void>;

	/**
	 * Retrieves the contents of a file.
	 * @param {string} filename - The name of the file to read.
	 * @returns {Promise<string>}
	 */
	getFile(filename: string): Promise<string>;

	/**
	 * Lists all files in the current directory with their metadata.
	 * @returns {Promise<FileMetadata[]>}
	 */
	listFiles(): Promise<FileMetadata[]>;
}