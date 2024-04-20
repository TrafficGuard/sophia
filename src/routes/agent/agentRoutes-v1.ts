import { Type } from '@sinclair/typebox';
import { FastifyReply } from 'fastify';
import { AgentContext, serializeContext } from '#agent/agentContext';
import { runAgent } from '#agent/agentRunner';
import { send, sendSuccess } from '#fastify/index';
import { sendHTML } from '#fastify/responses';
import { logger } from '#o11y/logger';
import { AppFastifyInstance } from '../../app';

const basePath = '/agent/v1';
export async function agentRoutesV1(fastify: AppFastifyInstance) {
	fastify.post(
		`${basePath}/resume`,
		{
			schema: {
				body: Type.Object({
					executionId: Type.String(),
				}),
			},
		},
		async (req: any, reply) => {
			const ctx: AgentContext = await fastify.agentStateService.load(req.body.executionId);

			runAgent({
				agentName: ctx.name,
				initialPrompt: ctx.inputPrompt,
				llms: ctx.llms,
				systemPrompt: ctx.systemPrompt,
				toolbox: ctx.toolbox,
			});

			send(reply, 200);
			// try {
			//     send(reply, 200, reservation);
			//     sendSuccess(reply, "No reservation found.");
			// } catch (e: any) {
			//     logger.error(e);
			//     sendBadRequest(reply, e);
			// }
		},
	);

	fastify.get(`${basePath}/list`, {}, async (req, reply) => {
		// const ctxs: AgentContext[] = await fastify.agentStateService.list();
		const ctxs: AgentContext[] = await fastify.agentStateService.listRunning();

		let html = `<html><head></head><body><table><tr>
			<th>Name</th>
			<th>State</th>
			<th>Func call #</th>
			<th>Error</th>
			<th>Tools</th>
			<th>Cost</th>
			<th>LLMS</th>
			</tr>`;
		for (const ctx of ctxs) {
			html += `<tr>
			<td><a href="details/${ctx.executionId}">${ctx.name}</a></td>
			<td>${ctx.state}</td>
			<td>${ctx.functionCallHistory.length}</td>
			<td>${ctx.error?.slice(0, 50)}</td>
			<td>${ctx.toolbox
				.getToolDefinitions()
				.map((def) => def.name)
				.join(',')}</td>
			<td>$${ctx.cost.toFixed(2)}</td>
			<td>${ctx.llms.easy.getModelName()},${ctx.llms.medium.getModelName()},${ctx.llms.hard.getModelName()}</td>
			</tr>`;
		}
		html += '</table></body></html>';

		sendHTML(reply, html);
	});

	fastify.get(`${basePath}/list/humanInLoop`, {}, async (req, reply) => {
		const ctxs: AgentContext[] = await fastify.agentStateService.listRunning();
		const response = ctxs.filter((ctx) => ctx.state === 'hil').map(serializeContext);
		send(reply as FastifyReply, 200, response);
		/*
			let html = `<html><head></head><body><table><tr>
			<th>Name</th>
			<th>State</th>
			<th>Func call #</th>
			<th>Error</th>
			<th>Tools</th>
			<th>Cost</th>
			<th>LLMS</th>
			<th>Resume</th>
			</tr>`
			for (const ctx of ctxs) {
				html += `<tr>
			<td><a href="details/${ctx.executionId}">${ctx.name}</a></td>
			<td>${ctx.state}</td>
			<td>${ctx.functionCallHistory.length}</td>
			<td>${ctx.error?.slice(0, 50)}</td>
			<td>${ctx.toolbox.getToolDefinitions().map(def => def.name).join(',')}</td>
			<td>$${ctx.cost.toFixed(2)}</td>
			<td>${ctx.llms.easy.getModelName()},${ctx.llms.medium.getModelName()},${ctx.llms.hard.getModelName()}</td>
			<td><a href="${basePath}/resume?executionId=${ctx.executionId}">Resume</a></td>
			</tr>`
			}
			html += "</table></body></html>"

			sendHTML(reply as FastifyReply, html);

 */
	});

	fastify.get(`${basePath}/details/:executionId`, {}, async (req: any, reply) => {
		const executionId = req.params.executionId;
		const ctx: AgentContext = await fastify.agentStateService.load(executionId);

		send(reply, 200, ctx);

		// try {
		//     send(reply, 200, reservation);
		//     sendSuccess(reply, "No reservation found.");
		// } catch (e: any) {
		//     logger.error(e);
		//     sendBadRequest(reply, e);
		// }
	});
}
