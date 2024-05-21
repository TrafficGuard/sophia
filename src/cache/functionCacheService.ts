/**
 * The scope of a cached result.
 */
export type CacheScope = 'global' | 'agent' | 'user';

/**
 * Interface for storing and retrieving cached function call results
 */
export interface FunctionCacheService {
	getValue(scope: CacheScope, className: string, method: string, params: any[]): Promise<any>;

	setValue(scope: CacheScope, className: string, method: string, params: any[], value: any): Promise<void>;

	/**
	 * Clears an agents cache
	 * @param agentId
	 * @return the number of items deleted
	 */
	clearAgentCache(agentId: string): Promise<number>;

	/**
	 * Clears a users cache
	 * @param userId
	 * @return the number of items deleted
	 */
	clearUserCache(userId: string): Promise<number>;
}
