import '#fastify/trace-init/trace-init';
import { initApp } from './app';

initApp().catch(console.error);
