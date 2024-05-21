import { expect } from 'chai';

import { extractJsonResult, extractStringResult, parseFunctionCallsXml } from './responseParsers';

describe('responseParsers', () => {
	describe('extractJsonResult', () => {
		// TODO handle when the json is indented

		it('Should extract when only JSON', async () => {
			const object = extractJsonResult('{ "foo": "bar" }');
			expect(object).to.deep.equal({ foo: 'bar' });
		});

		it('Should extract when there is some chat before', async () => {
			const object = extractJsonResult('Here is your JSON: { "foo": "bar" }');
			expect(object).to.deep.equal({ foo: 'bar' });
		});

		it('Should extract the Markdown formatted JSON when there is other text preceding it', async () => {
			const object = extractJsonResult(`something. reasoning from the LLM
\`\`\`json
{ "foo": "bar" }
\`\`\``);
			expect(object).to.deep.equal({ foo: 'bar' });
		});

		it('Should extract the JSON when there is other text preceding it and Markdown type is uppercase JSON', async () => {
			const object = extractJsonResult(`reasoning from the LLM
\`\`\`JSON
{ "foo": "bar" }
\`\`\``);
			expect(object).to.deep.equal({ foo: 'bar' });
		});

		it('Should extract the JSON when its wrapped in <json></json> elements', async () => {
			const object = extractJsonResult(`reasoning from the LLM
<json>
{ "foo": "bar" }
</json>`);
		});

		it('Should extract the JSON when its wrapped in <json></json> elements', async () => {
			const object = extractJsonResult(`<json>
[
	{
	"url": "https://cloud.google.com/vertex-ai/generative-ai/docs/model-reference/gemini",
	"title": "Gemini API | Generative AI on Vertex AI"
	},
	{
	"url": "https://www.googlecloudcommunity.com/gc/AI-ML/Are-AI-Studio-s-1-0-pro-vision-001-and-API-s-gemini-1-0-pro/m-p/728894",
	"title": "Re: Are AI Studio's 1.0-pro-vision-001 and API's g..."
	},
	{
	"url": "https://m.facebook.com/groups/gaitech/posts/1114669493050598/",
	"title": "Generative AI 技術交流中心| 愛好AI Engineer 週報#09 期"
	}
]
</json>`);
			expect(object[0].url).to.equal('https://cloud.google.com/vertex-ai/generative-ai/docs/model-reference/gemini');
		});
	});

	describe('extractStringResult', () => {
		it('Should extract contents in <result></result> tag', async () => {
			const result = `<result>
							Some result
							</result>`;
			const object = extractStringResult(result);
			expect(object).to.deep.equal('Some result');
		});
	});

	describe('parseFunctionCallsXml', () => {
		it('Should parse XML string and return a function call object with parameters as either ', async () => {
			const xmlString = `<function_calls>
                <invoke>
                    <tool_name>testTool</tool_name>
                    <parameters>
                        <param1>value1</param1>
                        <param2>value2</param2>
                    </parameters>
                </invoke>
                <invoke>
                    <tool_name>testTool2</tool_name>
                    <parameters>
                        <param1>value3</param1>
                    </parameters>
                </invoke>
            </function_calls>`;

			const parsedData = parseFunctionCallsXml(xmlString);

			expect(parsedData.invoke).to.have.lengthOf(2);

			expect(parsedData.invoke[0]).to.deep.equal({
				tool_name: 'testTool',
				parameters: {
					param1: 'value1',
					param2: 'value2',
				},
			});

			expect(parsedData.invoke[1]).to.deep.equal({
				tool_name: 'testTool2',
				parameters: {
					param1: 'value3',
				},
			});
		});

		it('Should ignore prior <function_calls>', async () => {
			const xmlString = `
			<planning_output>
				<!-- this is ignored -->
				<function_calls>
					<invoke>
						<tool_name>testTool</tool_name>
						<parameters>
							<abc>xyz</abc>
						</parameters>
					</invoke>
				</function_calls>
			</planning_output>
			
			<function_calls>
                <invoke>
                    <tool_name>testTool</tool_name>
                    <parameters>
                        <param1>value1</param1>
                        <param2>value2</param2>
                    </parameters>
                </invoke>
                <invoke>
                    <tool_name>testTool2</tool_name>
                    <parameters>
                        <param1>value3</param1>
                    </parameters>
                </invoke>
            </function_calls>`;

			const parsedData = parseFunctionCallsXml(xmlString);

			expect(parsedData.invoke).to.have.lengthOf(2);

			expect(parsedData.invoke[0]).to.deep.equal({
				tool_name: 'testTool',
				parameters: {
					param1: 'value1',
					param2: 'value2',
				},
			});

			expect(parsedData.invoke[1]).to.deep.equal({
				tool_name: 'testTool2',
				parameters: {
					param1: 'value3',
				},
			});
		});
	});
});
