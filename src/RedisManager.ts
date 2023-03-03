import { RedisDefaultModules } from 'redis'
import {
    RedisModules, RedisFunctions, RedisScripts,
    RedisClientOptions,
} from '@redis/client'
import { RedisConnection } from '@bemit/redis/RedisConnection'
import { ErrorDuplicateConnection } from '@bemit/redis/ErrorDuplicateConnection'
import { ErrorUnknownConnection } from '@bemit/redis/ErrorUnknownConnection'

export class RedisManager {
    protected connections: { [db: string]: RedisConnection } = {}

    constructor(connections: RedisConnection[]) {
        for(const connection of connections) {
            const id = String(connection.id)
            if(this.connections[id]) {
                throw new ErrorDuplicateConnection('RedisManager duplicate redis connections defined for database: `' + id + '`')
            }
            this.connections[id] = connection
        }
    }

    public static define<M extends RedisModules = RedisDefaultModules, F extends RedisFunctions = Record<string, never>, S extends RedisScripts = Record<string, never>>(
        id: string | number,
        init: RedisClientOptions<M, F, S> & { database: number },
    ) {
        return new RedisConnection<M, F, S>(init, id)
    }

    public connection<M extends RedisModules = RedisDefaultModules, F extends RedisFunctions = Record<string, never>, S extends RedisScripts = Record<string, never>>(
        id: string | number,
    ): RedisConnection<M, F, S> {
        const connection = this.connections[String(id)] as undefined | RedisConnection<M, F, S>
        if(!connection) {
            throw new ErrorUnknownConnection('RedisManager connection not known: ' + id)
        }
        return connection
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
