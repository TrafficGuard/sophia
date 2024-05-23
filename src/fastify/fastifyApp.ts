import * as http from 'node:http';
import { join } from 'node:path';
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import fastify, {
	FastifyBaseLogger,
	FastifyInstance,
	FastifyReply,
	FastifyRequest as FastifyRequestBase,
	RawReplyDefaultExpression,
	RawRequestDefaultExpression,
} from 'fastify';
import { User } from '#user/user';

interface FastifyRequest extends FastifyRequestBase {
	currentUser?: User;
}
import fastifyPlugin from 'fastify-plugin';
import * as HttpStatus from 'http-status-codes';
import { googleIapMiddleware, singleUserMiddleware } from '#fastify/userMiddleware';
import { logger } from '#o11y/logger';
import { loadOnRequestHooks } from './hooks';

const NODE_ENV = process.env.NODE_ENV ?? 'local';

export type TypeBoxFastifyInstance = FastifyInstance<
	http.Server,
	RawRequestDefaultExpression<http.Server>,
	RawReplyDefaultExpression<http.Server>,
	FastifyBaseLogger,
	TypeBoxTypeProvider
>;

export type RouteDefinition = (fastify: TypeBoxFastifyInstance) => Promise<void>;

export const fastifyInstance: TypeBoxFastifyInstance = fastify({
	maxParamLength: 256,
}).withTypeProvider<TypeBoxTypeProvider>();

export interface FastifyConfig {
	/** The port to listen on. If not provided looks up from process.env.PORT or else process.env.SERVER_PORT */
	port?: number;
	routes: RouteDefinition[];
	authenticatedRoutes: RouteDefinition[];
	instanceDecorators?: { [key: string]: any };
	requestDecorators?: { [key: string]: any };
	/** Overrides the default url of /health-check */
	healthcheckUrl?: string;
}

export async function initFastify(config: FastifyConfig): Promise<void> {
	/*
   	 To guarantee a consistent and predictable behaviour of your application, we highly recommend to always load your code as shown below:
      └── plugins (from the Fastify ecosystem)
      └── your plugins (your custom plugins)
      └── decorators
      └── hooks and middlewares
      └── your services
 	*/
	await loadPlugins(config);
	loadHooks();
	if (config.instanceDecorators) registerInstanceDecorators(config.instanceDecorators);
	if (config.requestDecorators) registerRequestDecorators(config.requestDecorators);
	registerRoutes(config.routes);
	registerAuthenticatedRoutes(config.authenticatedRoutes);
	fastifyInstance.register(require('@fastify/static'), {
		root: join(process.cwd(), 'public'),
		prefix: '/ui/', // optional: default '/'
		// constraints: { host: 'example.com' } // optional: default {}
	});
	setErrorHandler();
	let port = config.port;
	// If not provided autodetect from PORT or SERVER_PORT
	// https://cloud.google.com/run/docs/container-contract#port
	if (!port) {
		const envVars = ['PORT', 'SERVER_PORT'];
		for (const envVar of envVars) {
			try {
				port = parseInt(process.env[envVar] ?? '');
				break;
			} catch (e) {}
		}
		if (!port) throw new Error('Could not autodetect the server port to use from either the PORT or SERVER_PORT environment variables');
	}
	listen(port);
}

function listen(port: number): void {
	fastifyInstance.listen(
		{
			host: '0.0.0.0',
			port,
		},
		(err: any) => {
			if (err) {
				throw err;
			}
			logger.info(`Listening on ${port}`);
		},
	);
}

async function loadPlugins(config: FastifyConfig) {
	fastifyInstance.register(require('fastify-healthcheck'), {
		healthcheckUrl: config.healthcheckUrl ?? '/health-check',
	});
	await fastifyInstance.register(import('fastify-raw-body'), {
		field: 'rawBody',
		global: false,
		encoding: 'utf8',
		runFirst: true,
		routes: [],
	});
	await fastifyInstance.register(import('@fastify/cors'), {
		origin: '*', // Allow requests from all origins
		methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // Allow these HTTP methods
		allowedHeaders: ['content-type', 'authorization'], // Allow these headers
	});
}

function loadHooks() {
	loadOnRequestHooks(fastifyInstance);
	// loadPreHandlerHooks(this.app);

	// this.app.after(() => {
	//   this.app.addHook(
	//     'preHandler',
	//     this.app.auth(
	//       [
	//         // this.app.facebookAdAuthentication,
	//         this.app.staticTokenAuthentication,
	//         this.app.jwtTokenAuthentication,
	//         this.app.roleBasedRoutePermissionAuthentication,
	//       ],
	//       { relation: 'and' }
	//     )
	//   );
	// });
}

function registerInstanceDecorators(decorators: { [key: string]: any }) {
	fastifyInstance.register(
		fastifyPlugin(async (instance: FastifyInstance) => {
			for (const [key, value] of Object.entries(decorators)) {
				instance.decorate(key, value);
			}
		}),
	);
}

function registerRequestDecorators(decorators: { [key: string]: any }) {
	fastifyInstance.register(
		fastifyPlugin(async (instance: FastifyInstance) => {
			for (const [key, value] of Object.entries(decorators)) {
				instance.decorateReply(key, value);
			}
		}),
	);
}

function registerRoutes(routes: RouteDefinition[]) {
	for (const route of routes) {
		fastifyInstance.register(route);
	}
}

function registerAuthenticatedRoutes(routes: RouteDefinition[]) {
	let authenticationMiddleware = null;
	if (process.env.AUTH === 'gcloud_iap') {
		authenticationMiddleware = googleIapMiddleware;
		logger.info('Configured Google IAP authentication middleware');
	} else if (process.env.SINGLE_USER === 'true') {
		authenticationMiddleware = singleUserMiddleware;
		logger.info('Configured Single User authentication middleware');
	} else {
		throw new Error('No authentication configured. Either set SINGLE_USER=true or provide a valid AUTH env var');
	}

	for (const route of routes) {
		fastifyInstance.register(async (fastifyInstance) => {
			if (authenticationMiddleware) fastifyInstance.addHook('preHandler', authenticationMiddleware);
			fastifyInstance.register(route);
		});
	}
}

function setErrorHandler() {
	fastifyInstance.setErrorHandler((error: any, req: FastifyRequest, reply: FastifyReply) => {
		logger.error({
			message: `Error handler: ${error.message}`,
			error,
			request: req.query,
		});
		reply.header('Content-Type', 'application/json; charset=utf-8');

		if (error.validation) {
			reply.status(HttpStatus.BAD_REQUEST).send({
				statusCode: HttpStatus.BAD_REQUEST,
				message: error.message,
			});
			return;
		}

		if (error.code === 'FST_ERR_CTP_INVALID_MEDIA_TYPE') {
			reply.status(HttpStatus.BAD_REQUEST).send({
				statusCode: HttpStatus.BAD_REQUEST,
				message: 'Invalid media type',
			});
			return;
		}

		// TODO reportError(error);
		logger.error(error);

		reply.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
			statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
			message: NODE_ENV === 'production' ? 'An internal server error occurred. Please try again later.' : error.message,
		});
	});
}
