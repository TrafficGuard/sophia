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
    async summarizeTranscript(transcript: string, expandIterations: number = 1): Promise<string> {
        // Step 1: Initial summary with cache marker
        const initialPrompt = `
            You are an expert summarizer tasked with creating a concise yet comprehensive summary of a transcript.

            <transcript>
            ${transcript}
            </transcript>

            Please follow these steps to summarize the transcript:
            1. Identify the main topic or purpose of the conversation.
            2. List the key participants and their roles (if applicable).
            3. Outline the main points discussed, in chronological order.
            4. Highlight any important decisions, conclusions, or action items.
            5. Note any significant disagreements or unresolved issues.

            Format your summary as follows:
            <response>
            Topic: [Main topic or purpose]
            Participants: [List of key participants and roles]
            
            Summary:
            1. [First main point]
            2. [Second main point]
            3. [Third main point]
            ...

            Key Decisions/Conclusions:
            - [Decision/Conclusion 1]
            - [Decision/Conclusion 2]
            ...

            Action Items:
            - [Action item 1]
            - [Action item 2]
            ...

            Unresolved Issues:
            - [Issue 1]
            - [Issue 2]
            ...
            </response>
        `;

        let currentSummary = await llms().medium.generateText(initialPrompt, null);

        // Step 2: Expand on the summary for the specified number of iterations
        for (let i = 0; i < expandIterations; i++) {
            const expandPrompt = `
                You are an expert analyst tasked with expanding and enriching a summary of a transcript. Here's the current summary:
                <current-summary>
                ${currentSummary}
                </current-summary>

                Please enhance this summary by following these steps:
                1. Identify any important details, examples, or context that might have been missed in the previous summary.
                2. Add nuance to the main points, explaining any complex ideas or concepts.
                3. Provide additional context for key decisions or conclusions.
                4. Elaborate on the potential implications of unresolved issues.
                5. Include any relevant quotes that support the main points (if applicable).

                Format your expanded summary as follows:
                <response>
                [Include the original summary structure, but expand each section with additional details and context]

                Additional Insights:
                - [Insight 1: Explanation and importance]
                - [Insight 2: Explanation and importance]
                ...

                Key Quotes:
                - "[Quote 1]" - [Speaker] (Context: [Brief explanation])
                - "[Quote 2]" - [Speaker] (Context: [Brief explanation])
                ...

                Implications and Next Steps:
                - [Implication/Next step 1: Explanation]
                - [Implication/Next step 2: Explanation]
                ...
                </response>
            `;

            currentSummary = await llms().medium.generateText(expandPrompt, null, {});
        }

        return currentSummary;
    }
}
