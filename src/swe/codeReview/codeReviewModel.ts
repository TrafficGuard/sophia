interface IExample {
	code: string;
	reviewComment: string;
}

// The code review fastify route schema and angular form group names must match the interface property names
export interface CodeReviewConfig {
	id: string;
	title: string;
	enabled: boolean;
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
		xml += `<review_comment><![CDATA[\n${example.reviewComment}\n]]></review_comment>`;
		xml += '</example>';
	}
	xml += '</examples>\n</code-review-config>';

	return xml;
}
