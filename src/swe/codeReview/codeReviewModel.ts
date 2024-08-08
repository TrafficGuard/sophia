import { DOMParser } from 'xmldom';
const fs = require('fs');
const path = require('path');
import { XMLBuilder, XMLParser, XMLValidator } from 'fast-xml-parser';
import { logger } from '#o11y/logger';
interface IExample {
	code: string;
	review_comment: string;
}

export interface CodeReviewConfig {
	id: string;
	description: string;
	file_extensions: {
		include: string[];
	};
	requires: {
		text: string[];
	};
	tags: string[];
	projectPathGlobs: string[];
	examples: IExample[];
}

//
// function parseCodeReview(xml: string): CodeReviewConfig {
// 	const alwaysArray = ['code_review.file_extensions.include', 'code_review.requires.text', 'code_review.examples.example'];
//
// 	const options = {
// 		ignoreAttributes: false,
// 		// name: is either tagname, or attribute name
// 		// jPath: upto the tag name
// 		isArray: (name, jpath, isLeafNode, isAttribute) => {
// 			if (alwaysArray.indexOf(jpath) !== -1) return true;
// 		},
// 	};
//
// 	const parser = new XMLParser(options);
// 	const doc: CodeReviewConfig = parser.parse(xml).code_review;
// 	doc.xml = xml;
// 	return doc;
// }
//
// export function loadCodeReviews(): Promise<CodeReviewConfig[]> {
// 	// list files in resources/codeReview
// 	const files = fs.readdirSync('./resources/codeReview');
// 	// read in each one
// 	const codeReviews: CodeReviewConfig[] = [];
// 	for (const file of files) {
// 		if (!file.endsWith('.xml')) continue;
// 		try {
// 			const xml = fs.readFileSync(`./resources/codeReview/${file}`, 'utf-8');
// 			codeReviews.push(parseCodeReview(xml));
// 			logger.debug(`Parsed ${file}`);
// 		} catch (e) {
// 			logger.warn(`Could not parse ${file}`, e);
// 		}
// 	}
// 	return Promise.resolve(codeReviews);
// }
//
// export function loadCodeReviewsXml(): Promise<string[]> {
// 	// list files in resources/codeReview
// 	const files = fs.readdirSync('./resources/codeReview');
// 	// read in each one
// 	const codeReviews: string[] = [];
// 	for (const file of files) {
// 		const xml = fs.readFileSync(file, 'utf-8');
// 		codeReviews.push(xml);
// 	}
// 	return Promise.resolve(codeReviews);
// }

export interface CodeReviewConfig {
	description: string;
	file_extensions: {
		include: string[];
	};
	requires: {
		text: string[];
	};
	tags: string[];
	projectPathGlobs: string[];
	examples: IExample[];
}

export function codeReviewToXml(json: CodeReviewConfig): string {
	let xml = '<code-review-config>';

	xml += `<description>\n${json.description}\n</description>`;

	xml += '<examples>';
	for (const example of json.examples) {
		xml += '<example>';
		xml += `<code><![CDATA[\n${example.code}\n]]></code>`;
		xml += `<review_comment><![CDATA[\n${example.review_comment}\n]]></review_comment>`;
		xml += '</example>';
	}
	xml += '</examples>\n</code-review-config>';

	return xml;
}
