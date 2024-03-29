import { RedisConnection } from '@bemit/redis/RedisConnection'
import { nanoid } from 'nanoid'

/**
 * @deprecated will be removed or rewritten completely
 */
export class RedisCached {
    private readonly redis: RedisConnection

    constructor(redis: RedisConnection) {
        this.redis = redis
    }

    public async cache<D>(
        key: string,
        onMiss: () => Promise<{
            value: string
            ex: number
            raw: D
        } | undefined>,
        onHit: (value: string) => Promise<D>,
        clusterLock?: boolean,
        lockId?: string,
        lockMaxChecks: number = 30,
        lockCheckDelay: number = 60,
        lockMisses?: number,
    ): Promise<D | undefined> {
        const redis = await this.redis.client()
        let cached: any
        lockId = clusterLock ? lockId || nanoid(12) : undefined
        if(clusterLock) {
            const lock = await redis.SET('cached:' + key, '_lock.' + lockId, {
                NX: true,
                EX: 120,
            })
            if(lock === 'OK') {
                cached = '_lock.' + lockId
            } else {
                cached = await redis.get('cached:' + key)
            }
        } else {
            cached = await redis.get('cached:' + key)
        }

        if(cached && cached.startsWith('_lock.')) {
            if(cached !== '_lock.' + lockId) {
                cached = await new Promise((resolve) => {
                    let i = 0
                    // todo: using interval brings edge-cases in NodeJS which are not handleable like currently implemented,
                    //       e.g. regarding closing of server and blocking shutdown
                    const iVal = setInterval(async() => {
                        const tmpCached = await redis.get('cached:' + key)
                        if((!tmpCached || tmpCached.startsWith('_lock.')) && i >= lockMaxChecks) {
                            resolve(undefined)
                            clearInterval(iVal)
                            return
                        } else if(tmpCached && !tmpCached.startsWith('_lock.')) {
                            resolve(tmpCached)
                            clearInterval(iVal)
                            return
                        }
                        i++
                    }, lockCheckDelay)
                })
                if(typeof cached !== 'undefined') {
                    return await onHit(cached) as D
                }
            }
        } else if(cached === '_miss') {
            return Promise.resolve(undefined)
        } else if(cached && cached !== '_miss') {
            return await onHit(cached) as D
        }
        const next = await onMiss() as { value: string, ex: number, raw: D }
        if(!next) {
            if(lockMisses) {
                redis.set('cached:' + key, '_miss', {
                    EX: lockMisses,
                }).then().catch()
            }
            return undefined
        }
        redis.set('cached:' + key, next.value, {
            EX: next.ex,
        }).then().catch()
        return next.raw
    }
}
