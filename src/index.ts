import '#fastify/trace-init/trace-init';
import { initApp } from './app';

process.on('uncaughtException', (err) => {
	console.error('There was an uncaught error', err);
	// Perform cleanup tasks if necessary
	// Example: closing database connections, logging, etc.
	// process.exit(1); // Exit the
});

initApp().catch(console.error);
