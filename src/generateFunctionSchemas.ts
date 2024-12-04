import { appContext } from './applicationContext';
import { functionRegistry } from './functionRegistry';

// Pre-build the function schemas for faster startup time
appContext(); // Init the in-memory context
functionRegistry();
