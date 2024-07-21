import { DOMParser } from 'xmldom';
const fs = require('fs');
const path = require('path');
import { XMLBuilder, XMLParser, XMLValidator } from 'fast-xml-parser';
import { logger } from '#o11y/logger';
interface IExample {
	code: string;
	review_comment: string;
}

export interface ICodeReview {
	/** The source XML that was parsed to this object */
	xml: string;

	// The database data model

	description: string;
	file_extensions: {
		include: string[];
	};
	requires: {
		text: string[];
	};
	examples: IExample[];
}

function parseCodeReview(xml: string): ICodeReview {
	const alwaysArray = ['code_review.file_extensions.include', 'code_review.requires.text', 'code_review.examples.example'];

	const options = {
		ignoreAttributes: false,
		// name: is either tagname, or attribute name
		// jPath: upto the tag name
		isArray: (name, jpath, isLeafNode, isAttribute) => {
			if (alwaysArray.indexOf(jpath) !== -1) return true;
		},
	};

	const parser = new XMLParser(options);
	const doc: ICodeReview = parser.parse(xml).code_review;
	doc.xml = xml;
	return doc;
}

export function loadCodeReviews(): Promise<ICodeReview[]> {
	// list files in resources/codeReview
	const files = fs.readdirSync('./resources/codeReview');
	// read in each one
	const codeReviews: ICodeReview[] = [];
	for (const file of files) {
		if (!file.endsWith('.xml')) continue;
		try {
			const xml = fs.readFileSync(`./resources/codeReview/${file}`, 'utf-8');
			codeReviews.push(parseCodeReview(xml));
			logger.debug(`Parsed ${file}`);
		} catch (e) {
			logger.warn(`Could not parse ${file}`, e);
		}
	}
	return Promise.resolve(codeReviews);
}

export function loadCodeReviewsXml(): Promise<string[]> {
	// list files in resources/codeReview
	const files = fs.readdirSync('./resources/codeReview');
	// read in each one
	const codeReviews: string[] = [];
	for (const file of files) {
		const xml = fs.readFileSync(file, 'utf-8');
		codeReviews.push(xml);
	}
	return Promise.resolve(codeReviews);
}
