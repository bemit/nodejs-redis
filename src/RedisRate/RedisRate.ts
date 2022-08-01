import { RedisManager } from '@bemit/redis/RedisManager'

export class RedisRate {
    private readonly redis: RedisManager

    constructor(redis: RedisManager) {
        this.redis = redis
    }

    public async rater(key: string, ex: number, limit: number): Promise<number> {
        const redis = await this.redis.client()
        const rateLast = await redis.get(key)
        let rateNext: number
        if(rateLast) {
            if((Number(rateLast) + 1) > limit) {
                return Promise.resolve(Number(rateLast) + 1)
            }
            rateNext = await redis.incr(key)
        } else {
            rateNext = await redis
                .multi()
                .incr(key)
                .expire(key, ex)
                .exec(true).then(rs => rs[0]) as number
        }
        return rateNext
    }
}
