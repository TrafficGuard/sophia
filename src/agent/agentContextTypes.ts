import { LlmFunctions } from '#agent/LlmFunctions';
import { FileSystemService } from '#functions/storage/fileSystemService';
import { FunctionCall, FunctionCallResult, LLM, LlmMessage } from '#llm/llm';
import { User } from '#user/user';

/**
 * The difficulty of a LLM generative task. Used to select an appropriate model for the cost vs capability.
 * xeasy  LLama 8b
 * easy   Haiku 3.5/GPT4-mini/Llama 70b/Gemini Flash
 * medium Sonnet 3.5/GPT4-o/Llama 405b
 * hard   Opus 3.5/OpenAI o1
 * xhard  Ensemble (multi-gen with voting/merging of best answer)
 *
 */
export type TaskLevel = 'easy' | 'medium' | 'hard' | 'xhard';
export type AgentType = 'xml' | 'codegen';

export interface AgentCompleted {
	notifyCompleted(agentContext: AgentContext): Promise<void>;

	agentCompletedHandlerId(): string;
}

/**
 * agent - waiting for the agent LLM call(s) to generate control loop update
 * functions - waiting for the planned function call(s) to complete
 * error - the agent control loop has errored
 * hil - deprecated for humanInLoop_agent and humanInLoop_tool
 * hitl_threshold - If the agent has reached budget or iteration thresholds. At this point the agent is not executing any LLM/function calls.
 * hitl_tool - When a function has request HITL in the function calling part of the control loop
 * hitl_feedback - the agent has requested human feedback for a decision. At this point the agent is not executing any LLM/function calls.
 * hil - deprecated version of hitl_feedback
 * feedback - deprecated version of hitl_feedback
 * child_agents - waiting for child agents to complete
 * completed - the agent has called the completed function.
 * shutdown - if the agent has been instructed by the system to pause (e.g. for server shutdown)
 * timeout - for chat agents when there hasn't been a user input for a configured amount of time
 */
export type AgentRunningState =
	| 'workflow'
	| 'agent'
	| 'functions'
	| 'error'
	| 'hil'
	| 'hitl_threshold'
	| 'hitl_tool'
	| 'feedback'
	| 'hitl_feedback'
	| 'completed'
	| 'shutdown'
	| 'child_agents'
	| 'timeout';

/**
 * @param agent
 * @returns if the agent has a live execution thread
 */
export function isExecuting(agent: AgentContext): boolean {
	return agent.state !== 'completed' && agent.state !== 'feedback' && agent.state !== 'hil' && agent.state !== 'error';
}

/**
 * The LLMs for each Task Level
 */
export type AgentLLMs = Record<TaskLevel, LLM>;

/**
 * The state of an agent.
 */
export interface AgentContext {
	/** Primary Key - Agent instance id. Allocated when the agent is first starts */
	agentId: string;
	/** Child agent ids */
	childAgents?: string[];
	/** Id of the running execution. This changes after the agent restarts due to an error, pausing, human in loop, completion etc */
	executionId: string;
	/** Current OpenTelemetry traceId */
	traceId: string;
	/** Display name */
	name: string;
	/** Not used yet */
	parentAgentId?: string;
	/** The user who created the agent */
	user: User;
	/** The current state of the agent */
	state: AgentRunningState;
	/** Tracks what functions/spans we've called into */
	callStack: string[];
	/** Error message & stack */
	error?: string;
	/** Budget spend in $USD until a human-in-the-loop is required */
	hilBudget;
	/** Total cost of running this agent */
	cost: number;
	/** Budget remaining until human intervention is required */
	budgetRemaining: number;
	/** Pre-configured LLMs by task difficulty level for the agent. Specific LLMs can always be instantiated if required. */
	llms: AgentLLMs;
	/** Working filesystem */
	fileSystem?: FileSystemService | null;
	/** Memory persisted over the agent's executions */
	memory: Record<string, string>;
	/** Time of the last database write of the state */
	lastUpdate: number;
	/** Agent custom fields */
	metadata: Record<string, any>;

	/** The functions available to the agent */
	functions: LlmFunctions;
	completedHandler?: AgentCompleted;

	// ChatBot properties ----------------

	messages: LlmMessage[];
	/** Messages sent by users while the agent is still processing the last message */
	pendingMessages: string[];

	// Autonomous agent specific properties --------------------

	/** The type of autonomous agent function calling.*/
	type: AgentType;
	/** The number of completed iterations of the agent control loop */
	iterations: number;
	/** The function calls the agent is about to call (xml only) */
	invoking: FunctionCall[];
	/** Additional notes that tool functions can add to the response to the agent */
	notes: string[];
	/** The initial prompt provided by the user or parent agent */
	userPrompt: string;
	/** The prompt the agent execution started/resumed with */
	inputPrompt: string;
	/** Completed function calls with success/error output */
	functionCallHistory: FunctionCallResult[];
	/** How many iterations of the autonomous agent control loop to require human input to continue */
	hilCount;
}
