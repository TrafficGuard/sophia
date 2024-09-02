import { AgentContext, AgentRunningState } from '#agent/agentContext';

export interface ChatBotService {
	sendMessage(agent: AgentContext, message: string): Promise<void>;
}
