interface IExample {
	code: string;
	review_comment: string;
}

export interface CodeReviewConfig {
	id: string;
	title: string;
	description: string;
	fileExtensions: {
		include: string[];
	};
	requires: {
		text: string[];
	};
	tags: string[];
	projectPaths: string[];
	examples: IExample[];
}

export function codeReviewToXml(codeReview: CodeReviewConfig): string {
	let xml = '<code-review-config>';

	xml += `<title>${codeReview.title}</title>`;
	xml += `<description>\n${codeReview.description}\n</description>`;

	xml += '<examples>';
	for (const example of codeReview.examples) {
		xml += '<example>';
		xml += `<code><![CDATA[\n${example.code}\n]]></code>`;
		xml += `<review_comment><![CDATA[\n${example.review_comment}\n]]></review_comment>`;
		xml += '</example>';
	}
	xml += '</examples>\n</code-review-config>';

	return xml;
}
