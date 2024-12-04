import '#fastify/trace-init/trace-init'; // leave an empty line next so this doesn't get sorted from the first line

import { initServer } from './server';

process.on('uncaughtException', (err) => {
	console.error('There was an uncaught error', err);
	// Perform cleanup tasks if necessary
	// Example: closing database connections, logging, etc.
	// process.exit(1); // Exit the
});

initServer().catch(console.error);
