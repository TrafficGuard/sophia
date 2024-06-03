import { appContext } from './app';
import { toolRegistry } from './toolRegistry';

// Pre-build the definitions for faster startup time
appContext(); // Init the in-memory context
toolRegistry();
