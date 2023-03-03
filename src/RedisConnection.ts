import { createClient, RedisDefaultModules } from 'redis'
import {
    RedisModules, RedisFunctions, RedisScripts,
    RedisClientOptions, RedisClientType,
} from '@redis/client'

export class RedisConnection<M extends RedisModules = RedisDefaultModules, F extends RedisFunctions = Record<string, never>, S extends RedisScripts = Record<string, never>> {
    protected readonly redis: RedisClientType<M, F, S>
    protected connected: boolean = false
    public readonly id: string | number

    constructor(
        init: RedisClientOptions<M, F, S> & { database: number },
        id?: string | number,
    ) {
        this.id = typeof id === 'undefined' ? init.database : id
        this.redis = createClient(init)
    }

    public get isConnected(): boolean {
        return this.connected
    }

    public on(eventName: string, listener: (...args: any[]) => void): RedisConnection<M, F, S> {
        this.redis.on(eventName, listener)
        return this
    }

    public off(eventName: string, listener: (...args: any[]) => void): RedisConnection<M, F, S> {
        this.redis.off(eventName, listener)
        return this
    }

    private async connect(): Promise<void> {
        if(this.isConnected) return
        this.connected = true
        await this.redis.connect()
    }

    public async client(): Promise<RedisClientType<M, F, S>> {
        await this.connect()
        return this.redis
    }

    /**
     * Gracefully close a client's connection to redis.
     */
    public async quit(): Promise<void> {
        if(!this.isConnected) return
        await this.redis.quit()
        this.connected = false
    }

    /**
     * Forcibly close a client's connection to redis immediately.
     */
    public async disconnect(): Promise<void> {
        if(!this.isConnected) return
        await this.redis.disconnect()
        this.connected = false
    }
}
