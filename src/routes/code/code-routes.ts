import { RouteOptions } from 'fastify';
import { Type } from '@sinclair/typebox';
import { CodeEditingAgent } from '../../swe/codeEditingAgent';
import { codebaseQuery } from '../../swe/codebaseQuery';

export const codeRoutes: RouteOptions[] = [
  {
    method: 'POST',
    url: '/code/edit',
    schema: {
      body: Type.Object({
        workingDirectory: Type.String(),
        requirements: Type.String(),
      }),
      response: {
        200: Type.Any(),
      },
    },
    handler: async (request, reply) => {
      const { workingDirectory, requirements } = request.body as { workingDirectory: string; requirements: string };
      const agent = new CodeEditingAgent();
      try {
        await agent.runCodeEditWorkflow(requirements, { 
          baseDir: workingDirectory,
          language: '',
          languageTools: null,
          devBranch: '',
          fileSelection: '',
          initialise: '',
          compile: '',
          staticAnalysis: '',
          test: ''
        });
        reply.send({ success: true, message: 'Code edit workflow completed successfully' });
      } catch (error) {
        reply.status(500).send({ success: false, message: error.message });
      }
    },
  },
  {
    method: 'POST',
    url: '/code/query',
    schema: {
      body: Type.Object({
        workingDirectory: Type.String(),
        query: Type.String(),
      }),
      response: {
        200: Type.String(),
      },
    },
    handler: async (request, reply) => {
      const { workingDirectory, query } = request.body as { workingDirectory: string; query: string };
      try {
        const result = await codebaseQuery(query);
        reply.send(result);
      } catch (error) {
        reply.status(500).send(error.message);
      }
    },
  },
];
