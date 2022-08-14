import {
    RedisModules, RedisFunctions, RedisScripts,
    RedisClientOptions,
} from '@redis/client'
import { RedisConnection } from '@bemit/redis/RedisConnection'

export class RedisManager {
    protected connections: { [db: string]: RedisConnection } = {}

    constructor(connections: RedisConnection[]) {
        for(const connection of connections) {
            const dbId = String(connection.database)
            if(this.connections[dbId]) {
                throw new Error('RedisManager duplicate redis connections defined for database: `' + dbId + '`')
            }
            this.connections[dbId] = connection
        }
    }

    public static create<M extends RedisModules = RedisModules, F extends RedisFunctions = RedisFunctions, S extends RedisScripts = RedisScripts>(
        init: RedisClientOptions<M, F, S> & { database: number },
    ) {
        return new RedisConnection<M, F, S>(init)
    }

    public database<M extends RedisModules = RedisModules, F extends RedisFunctions = RedisFunctions, S extends RedisScripts = RedisScripts>(database: number): RedisConnection<M, F, S> {
        const dbId = String(database)
        if(!this.connections[dbId]) {
            throw new Error('RedisManager missing database: `' + dbId + '`')
        }
        return this.connections[dbId] as RedisConnection<M, F, S>
    }

    /**
     * Gracefully closes all client connections to redis.
     */
    public async quit(): Promise<void> {
        const connections = Object.values(this.connections)
        for(const connection of connections) {
            await connection.quit()
        }
    }

    /**
     * Forcibly closes all client connections to redis immediately.
     */
    public async disconnect(): Promise<void> {
        const connections = Object.values(this.connections)
        for(const connection of connections) {
            await connection.disconnect()
        }
    }
}
