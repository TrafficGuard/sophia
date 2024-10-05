/*
<user1>
I’ve been using Claude for summarizing conversations, but I’ve noticed it often leaves out a lot of important details in longer texts. My use case involves summarizing complex conversations, but it forgets key information that I’d like to include.

Does anyone have tips on how to get more detailed and longer output without losing important context? Are there specific prompts or methods you’ve found helpful?
</user1>

<user2>
One way is doing multiple calls which can be optimised with caching. Two potential methods:
1.Do one generation with the cache marker, then do multiple generations from the cached input. Then concatenate all the outputs with a final instruction to merge all the details into one.
2. Do a cached generation, then ask it to expand on the output, adding details that were missed.
</user2>
 */



import {llms} from "#agent/agentContextLocalStorage";

export class SummarizerAgent {
    async summarizeTranscript(transcript: string): Promise<string> {
        // Step 1: Initial summary with cache marker
        const initialPrompt = `
            <transcript>
            ${transcript}
            </transcript>

            Please provide a concise summary of the above transcript. 
            Include the main points and key details.
            
            <response>
            [Your summary here]
            </response>
        `;

        const initialSummary = await llms().medium.generateText(initialPrompt, null, { cache: 'ephemeral' });

        // Step 2: Expand on the initial summary
        const expandPrompt = `
            Here's an initial summary of a transcript:

            ${initialSummary}

            Please expand on this summary, adding any important details that might have been missed. 
            Focus on including specific information, examples, or context that would be valuable 
            for a comprehensive understanding of the transcript.

            <response>
            [Your expanded summary here]
            </response>
        `;

        const expandedSummary = await llms().medium.generateText(expandPrompt, null, {});

        return expandedSummary;
    }
}
