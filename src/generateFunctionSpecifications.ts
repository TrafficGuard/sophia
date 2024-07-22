import { appContext } from './app';
import { functionRegistry } from './functionRegistry';

// Pre-build the function schemas for faster startup time
appContext(); // Init the in-memory context
functionRegistry();
