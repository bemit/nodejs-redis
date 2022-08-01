import { createClient } from 'redis'
import {
    RedisModules, RedisFunctions, RedisScripts,
    RedisClientOptions, RedisClientType,
} from '@redis/client'

export class RedisManager<M extends RedisModules = RedisModules, F extends RedisFunctions = RedisFunctions, S extends RedisScripts = RedisScripts> {
    private readonly redis: RedisClientType<M, F, S>
    protected connected: boolean = false

    constructor(init: RedisClientOptions<M, F, S>) {
        this.redis = createClient(init)

        this.redis.on('error', (err) => console.log('Redis Client Error', err))
    }

    private async connect() {
        if(this.connected) return
        this.connected = true
        await this.redis.connect()
    }

    public async client(): Promise<RedisClientType<M, F, S>> {
        await this.connect()
        return this.redis
    }
}
