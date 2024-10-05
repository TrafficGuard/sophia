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

    async summarizeTranscript1(transcript: string): Promise<string> {

        const prompt: string = '<transcript>\n${transcript}\n</transcript>\n'

        return await llms().medium.generateText(prompt, null, {})

    }

    async summarizeTranscript2(transcript: string): Promise<string> {

        const prompt: string = '<transcript>\n${transcript}\n</transcript>\n'

        return await llms().medium.generateText(prompt, null, {})

    }
}
