import { Test, TestingModule } from '@nestjs/testing';
import { RedisService } from '../redis.service';
import { ConfigService } from '@nestjs/config';

jest.mock('ioredis', () => {
  const mockConstructor = jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
    setex: jest.fn(),
    del: jest.fn(),
    keys: jest.fn(),
    exists: jest.fn(),
    quit: jest.fn(),
    expire: jest.fn(),
    incr: jest.fn(),
    decr: jest.fn(),
    incrby: jest.fn(),
    decrby: jest.fn(),
    hset: jest.fn(),
    hget: jest.fn(),
    hgetall: jest.fn(),
    hdel: jest.fn(),
    zadd: jest.fn(),
    zrange: jest.fn(),
    zrevrange: jest.fn(),
    zscore: jest.fn(),
    zrem: jest.fn(),
    sadd: jest.fn(),
    srem: jest.fn(),
    smembers: jest.fn(),
    sismember: jest.fn(),
  }));

  return {
    __esModule: true,
    default: mockConstructor,
  };
});

describe('RedisService', () => {
  let service: RedisService;
  let mockRedisClient: any;

  beforeEach(async () => {
    mockRedisClient = {
      on: jest.fn(),
      get: jest.fn(),
      set: jest.fn(),
      setex: jest.fn(),
      del: jest.fn(),
      keys: jest.fn(),
      exists: jest.fn(),
      quit: jest.fn(),
      expire: jest.fn(),
      incr: jest.fn(),
      decr: jest.fn(),
      incrby: jest.fn(),
      decrby: jest.fn(),
      hset: jest.fn(),
      hget: jest.fn(),
      hgetall: jest.fn(),
      hdel: jest.fn(),
      zadd: jest.fn(),
      zrange: jest.fn(),
      zrevrange: jest.fn(),
      zscore: jest.fn(),
      zrem: jest.fn(),
      sadd: jest.fn(),
      srem: jest.fn(),
      smembers: jest.fn(),
      sismember: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedisService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config: any = {
                REDIS_HOST: 'localhost',
                REDIS_PORT: 6379,
                REDIS_PASSWORD: '',
              };
              return config[key];
            }),
          },
        },
      ],
    }).compile();

    service = module.get<RedisService>(RedisService);
    // 替换内部 client
    (service as any).client = mockRedisClient;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('set', () => {
    it('应该设置键值对（无过期时间）', async () => {
      mockRedisClient.set.mockResolvedValue('OK');

      await service.set('test-key', 'test-value');

      expect(mockRedisClient.set).toHaveBeenCalledWith('test-key', 'test-value');
    });

    it('应该设置键值对（带过期时间）', async () => {
      mockRedisClient.setex.mockResolvedValue('OK');

      await service.set('test-key', 'test-value', 60);

      expect(mockRedisClient.setex).toHaveBeenCalledWith('test-key', 60, 'test-value');
    });

    it('应该处理数字值', async () => {
      mockRedisClient.set.mockResolvedValue('OK');

      await service.set('test-key', 123);

      expect(mockRedisClient.set).toHaveBeenCalledWith('test-key', 123);
    });
  });

  describe('get', () => {
    it('应该获取存在的键', async () => {
      mockRedisClient.get.mockResolvedValue('test-value');

      const result = await service.get('test-key');

      expect(result).toBe('test-value');
      expect(mockRedisClient.get).toHaveBeenCalledWith('test-key');
    });

    it('应该返回 null 当键不存在', async () => {
      mockRedisClient.get.mockResolvedValue(null);

      const result = await service.get('non-existent-key');

      expect(result).toBeNull();
    });
  });

  describe('del', () => {
    it('应该删除键', async () => {
      mockRedisClient.del.mockResolvedValue(1);

      const result = await service.del('test-key');

      expect(result).toBe(1);
      expect(mockRedisClient.del).toHaveBeenCalledWith('test-key');
    });

    it('应该返回 0 当键不存在', async () => {
      mockRedisClient.del.mockResolvedValue(0);

      const result = await service.del('non-existent-key');

      expect(result).toBe(0);
    });
  });

  describe('delPattern', () => {
    it('应该删除匹配模式的所有键', async () => {
      mockRedisClient.keys.mockResolvedValue(['key1', 'key2', 'key3']);
      mockRedisClient.del.mockResolvedValue(3);

      const result = await service.delPattern('key*');

      expect(mockRedisClient.keys).toHaveBeenCalledWith('key*');
      expect(mockRedisClient.del).toHaveBeenCalledWith('key1', 'key2', 'key3');
      expect(result).toBe(3);
    });

    it('应该返回 0 当没有匹配的键', async () => {
      mockRedisClient.keys.mockResolvedValue([]);

      const result = await service.delPattern('non-existent*');

      expect(result).toBe(0);
      expect(mockRedisClient.del).not.toHaveBeenCalled();
    });
  });

  describe('exists', () => {
    it('应该返回 1 当键存在', async () => {
      mockRedisClient.exists.mockResolvedValue(1);

      const result = await service.exists('test-key');

      expect(result).toBe(1);
      expect(mockRedisClient.exists).toHaveBeenCalledWith('test-key');
    });

    it('应该返回 0 当键不存在', async () => {
      mockRedisClient.exists.mockResolvedValue(0);

      const result = await service.exists('non-existent-key');

      expect(result).toBe(0);
    });
  });

  describe('setJson', () => {
    it('应该存储 JSON 对象', async () => {
      mockRedisClient.setex.mockResolvedValue('OK');

      const data = { name: 'test', age: 25 };
      await service.setJson('test-key', data, 60);

      expect(mockRedisClient.setex).toHaveBeenCalledWith(
        'test-key',
        60,
        JSON.stringify(data)
      );
    });

    it('应该存储 JSON 数组', async () => {
      mockRedisClient.set.mockResolvedValue('OK');

      const data = [1, 2, 3, 4, 5];
      await service.setJson('test-key', data);

      expect(mockRedisClient.set).toHaveBeenCalledWith(
        'test-key',
        JSON.stringify(data)
      );
    });
  });

  describe('getJson', () => {
    it('应该获取并解析 JSON 对象', async () => {
      const data = { name: 'test', age: 25 };
      mockRedisClient.get.mockResolvedValue(JSON.stringify(data));

      const result = await service.getJson('test-key');

      expect(result).toEqual(data);
    });

    it('应该返回 null 当键不存在', async () => {
      mockRedisClient.get.mockResolvedValue(null);

      const result = await service.getJson('non-existent-key');

      expect(result).toBeNull();
    });

    it('应该处理 JSON 解析错误', async () => {
      mockRedisClient.get.mockResolvedValue('invalid-json');

      const result = await service.getJson('test-key');

      expect(result).toBeNull();
    });

    it('应该获取并解析 JSON 数组', async () => {
      const data = [1, 2, 3, 4, 5];
      mockRedisClient.get.mockResolvedValue(JSON.stringify(data));

      const result = await service.getJson('test-key');

      expect(result).toEqual(data);
    });
  });

  describe('getClient', () => {
    it('应该返回 Redis 客户端实例', () => {
      const client = service.getClient();

      expect(client).toBe(mockRedisClient);
    });
  });

  describe('connect', () => {
    let RedisMock: jest.Mock;
    let mockRedisInstance: any;

    beforeEach(() => {
      // Get the mocked Redis constructor
      RedisMock = require('ioredis').default;

      // Create a fresh mock instance for each test
      mockRedisInstance = {
        on: jest.fn(),
        get: jest.fn(),
        set: jest.fn(),
        setex: jest.fn(),
        del: jest.fn(),
        keys: jest.fn(),
        exists: jest.fn(),
        quit: jest.fn(),
        expire: jest.fn(),
        incr: jest.fn(),
        decr: jest.fn(),
        incrby: jest.fn(),
        decrby: jest.fn(),
        hset: jest.fn(),
        hget: jest.fn(),
        hgetall: jest.fn(),
        hdel: jest.fn(),
        zadd: jest.fn(),
        zrange: jest.fn(),
        zrevrange: jest.fn(),
        zscore: jest.fn(),
        zrem: jest.fn(),
        sadd: jest.fn(),
        srem: jest.fn(),
        smembers: jest.fn(),
        sismember: jest.fn(),
      };

      // Clear and reconfigure the mock
      RedisMock.mockClear();
      RedisMock.mockImplementation(() => mockRedisInstance);
    });

    it('应该创建 Redis 客户端并传入正确的配置选项', () => {
      const options = {
        host: 'test-host',
        port: 6380,
        password: 'test-password',
      };

      service.connect(options);

      expect(RedisMock).toHaveBeenCalledWith({
        host: 'test-host',
        port: 6380,
        password: 'test-password',
        db: 0,
        retryStrategy: expect.any(Function),
      });
    });

    it('应该创建 Redis 客户端（不带密码）', () => {
      const options = {
        host: 'localhost',
        port: 6379,
      };

      service.connect(options);

      expect(RedisMock).toHaveBeenCalledWith({
        host: 'localhost',
        port: 6379,
        password: undefined,
        db: 0,
        retryStrategy: expect.any(Function),
      });
    });

    it('应该注册 error 事件处理器', () => {
      const options = {
        host: 'localhost',
        port: 6379,
      };

      service.connect(options);

      expect(mockRedisInstance.on).toHaveBeenCalledWith('error', expect.any(Function));
    });

    it('应该注册 connect 事件处理器', () => {
      const options = {
        host: 'localhost',
        port: 6379,
      };

      service.connect(options);

      expect(mockRedisInstance.on).toHaveBeenCalledWith('connect', expect.any(Function));
    });

    it('应该在 error 事件触发时记录错误', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const options = {
        host: 'localhost',
        port: 6379,
      };

      service.connect(options);

      // 获取 error 事件处理器并触发
      const errorHandler = mockRedisInstance.on.mock.calls.find(
        (call: any) => call[0] === 'error'
      )?.[1];
      expect(errorHandler).toBeDefined();

      const testError = new Error('Connection failed');
      errorHandler(testError);

      expect(consoleErrorSpy).toHaveBeenCalledWith('Redis Error:', testError);
      consoleErrorSpy.mockRestore();
    });

    it('应该在 connect 事件触发时记录日志', () => {
      const loggerSpy = jest.spyOn((service as any).logger, 'log');
      const options = {
        host: 'localhost',
        port: 6379,
      };

      service.connect(options);

      // 获取 connect 事件处理器并触发
      const connectHandler = mockRedisInstance.on.mock.calls.find(
        (call: any) => call[0] === 'connect'
      )?.[1];
      expect(connectHandler).toBeDefined();

      connectHandler();

      expect(loggerSpy).toHaveBeenCalledWith('Redis Connected');
    });

    it('应该测试 retryStrategy 函数返回正确的延迟', () => {
      const options = {
        host: 'localhost',
        port: 6379,
      };

      service.connect(options);

      // 获取传递给 Redis 构造函数的配置
      const redisConfig = RedisMock.mock.calls[0][0];
      const retryStrategy = redisConfig.retryStrategy;

      expect(retryStrategy).toBeDefined();

      // 测试不同的重试次数
      expect(retryStrategy(1)).toBe(50);   // 1 * 50 = 50
      expect(retryStrategy(10)).toBe(500); // 10 * 50 = 500
      expect(retryStrategy(40)).toBe(2000); // 40 * 50 = 2000 (达到最大值)
      expect(retryStrategy(100)).toBe(2000); // 100 * 50 = 5000, 但限制为 2000
    });

    it('应该更新内部 client 实例', () => {
      const options = {
        host: 'localhost',
        port: 6379,
      };

      service.connect(options);

      const client = service.getClient();
      expect(client).toBe(mockRedisInstance);
    });
  });

  describe('expire', () => {
    it('应该设置键的过期时间', async () => {
      mockRedisClient.expire.mockResolvedValue(1);

      const result = await service.expire('test-key', 60);

      expect(result).toBe(1);
      expect(mockRedisClient.expire).toHaveBeenCalledWith('test-key', 60);
    });

    it('应该返回 0 当键不存在', async () => {
      mockRedisClient.expire.mockResolvedValue(0);

      const result = await service.expire('non-existent-key', 60);

      expect(result).toBe(0);
    });
  });

  describe('incr', () => {
    it('应该递增键的值', async () => {
      mockRedisClient.incr.mockResolvedValue(1);

      const result = await service.incr('counter');

      expect(result).toBe(1);
      expect(mockRedisClient.incr).toHaveBeenCalledWith('counter');
    });
  });

  describe('decr', () => {
    it('应该递减键的值', async () => {
      mockRedisClient.decr.mockResolvedValue(9);

      const result = await service.decr('counter');

      expect(result).toBe(9);
      expect(mockRedisClient.decr).toHaveBeenCalledWith('counter');
    });
  });

  describe('incrBy', () => {
    it('应该按指定值递增', async () => {
      mockRedisClient.incrby.mockResolvedValue(15);

      const result = await service.incrBy('counter', 5);

      expect(result).toBe(15);
      expect(mockRedisClient.incrby).toHaveBeenCalledWith('counter', 5);
    });
  });

  describe('decrBy', () => {
    it('应该按指定值递减', async () => {
      mockRedisClient.decrby.mockResolvedValue(5);

      const result = await service.decrBy('counter', 5);

      expect(result).toBe(5);
      expect(mockRedisClient.decrby).toHaveBeenCalledWith('counter', 5);
    });
  });

  describe('Hash 操作', () => {
    describe('hSet', () => {
      it('应该设置哈希字段', async () => {
        mockRedisClient.hset.mockResolvedValue(1);

        const result = await service.hSet('user:1', 'name', 'John');

        expect(result).toBe(1);
        expect(mockRedisClient.hset).toHaveBeenCalledWith('user:1', 'name', 'John');
      });
    });

    describe('hGet', () => {
      it('应该获取哈希字段值', async () => {
        mockRedisClient.hget.mockResolvedValue('John');

        const result = await service.hGet('user:1', 'name');

        expect(result).toBe('John');
        expect(mockRedisClient.hget).toHaveBeenCalledWith('user:1', 'name');
      });

      it('应该返回 null 当字段不存在', async () => {
        mockRedisClient.hget.mockResolvedValue(null);

        const result = await service.hGet('user:1', 'age');

        expect(result).toBeNull();
      });
    });

    describe('hGetAll', () => {
      it('应该获取所有哈希字段', async () => {
        const userData = { name: 'John', age: '30', city: 'NYC' };
        mockRedisClient.hgetall.mockResolvedValue(userData);

        const result = await service.hGetAll('user:1');

        expect(result).toEqual(userData);
        expect(mockRedisClient.hgetall).toHaveBeenCalledWith('user:1');
      });

      it('应该返回空对象当哈希不存在', async () => {
        mockRedisClient.hgetall.mockResolvedValue({});

        const result = await service.hGetAll('user:999');

        expect(result).toEqual({});
      });
    });

    describe('hDel', () => {
      it('应该删除哈希字段', async () => {
        mockRedisClient.hdel.mockResolvedValue(1);

        const result = await service.hDel('user:1', 'age');

        expect(result).toBe(1);
        expect(mockRedisClient.hdel).toHaveBeenCalledWith('user:1', 'age');
      });

      it('应该返回 0 当字段不存在', async () => {
        mockRedisClient.hdel.mockResolvedValue(0);

        const result = await service.hDel('user:1', 'non-existent');

        expect(result).toBe(0);
      });
    });
  });

  describe('有序集合操作', () => {
    describe('zAdd', () => {
      it('应该添加成员到有序集合', async () => {
        mockRedisClient.zadd.mockResolvedValue(1);

        const result = await service.zAdd('leaderboard', 100, 'player1');

        expect(result).toBe(1);
        expect(mockRedisClient.zadd).toHaveBeenCalledWith('leaderboard', 100, 'player1');
      });
    });

    describe('zRange', () => {
      it('应该获取有序集合范围内的成员', async () => {
        mockRedisClient.zrange.mockResolvedValue(['player1', 'player2', 'player3']);

        const result = await service.zRange('leaderboard', 0, 2);

        expect(result).toEqual(['player1', 'player2', 'player3']);
        expect(mockRedisClient.zrange).toHaveBeenCalledWith('leaderboard', 0, 2);
      });

      it('应该返回空数组当范围无效', async () => {
        mockRedisClient.zrange.mockResolvedValue([]);

        const result = await service.zRange('leaderboard', 100, 200);

        expect(result).toEqual([]);
      });
    });

    describe('zRevRange', () => {
      it('应该按降序获取有序集合成员', async () => {
        mockRedisClient.zrevrange.mockResolvedValue(['player3', 'player2', 'player1']);

        const result = await service.zRevRange('leaderboard', 0, 2);

        expect(result).toEqual(['player3', 'player2', 'player1']);
        expect(mockRedisClient.zrevrange).toHaveBeenCalledWith('leaderboard', 0, 2);
      });
    });

    describe('zScore', () => {
      it('应该获取成员的分数', async () => {
        mockRedisClient.zscore.mockResolvedValue('100.5');

        const result = await service.zScore('leaderboard', 'player1');

        expect(result).toBe(100.5);
        expect(mockRedisClient.zscore).toHaveBeenCalledWith('leaderboard', 'player1');
      });

      it('应该返回 null 当成员不存在', async () => {
        mockRedisClient.zscore.mockResolvedValue(null);

        const result = await service.zScore('leaderboard', 'non-existent');

        expect(result).toBeNull();
      });
    });

    describe('zRem', () => {
      it('应该从有序集合中删除成员', async () => {
        mockRedisClient.zrem.mockResolvedValue(1);

        const result = await service.zRem('leaderboard', 'player1');

        expect(result).toBe(1);
        expect(mockRedisClient.zrem).toHaveBeenCalledWith('leaderboard', 'player1');
      });

      it('应该返回 0 当成员不存在', async () => {
        mockRedisClient.zrem.mockResolvedValue(0);

        const result = await service.zRem('leaderboard', 'non-existent');

        expect(result).toBe(0);
      });
    });
  });

  describe('集合操作', () => {
    describe('sAdd', () => {
      it('应该添加单个成员到集合', async () => {
        mockRedisClient.sadd.mockResolvedValue(1);

        const result = await service.sAdd('tags', 'javascript');

        expect(result).toBe(1);
        expect(mockRedisClient.sadd).toHaveBeenCalledWith('tags', 'javascript');
      });

      it('应该添加多个成员到集合', async () => {
        mockRedisClient.sadd.mockResolvedValue(3);

        const result = await service.sAdd('tags', 'javascript', 'typescript', 'nodejs');

        expect(result).toBe(3);
        expect(mockRedisClient.sadd).toHaveBeenCalledWith('tags', 'javascript', 'typescript', 'nodejs');
      });
    });

    describe('sRem', () => {
      it('应该从集合中删除单个成员', async () => {
        mockRedisClient.srem.mockResolvedValue(1);

        const result = await service.sRem('tags', 'javascript');

        expect(result).toBe(1);
        expect(mockRedisClient.srem).toHaveBeenCalledWith('tags', 'javascript');
      });

      it('应该从集合中删除多个成员', async () => {
        mockRedisClient.srem.mockResolvedValue(2);

        const result = await service.sRem('tags', 'javascript', 'typescript');

        expect(result).toBe(2);
        expect(mockRedisClient.srem).toHaveBeenCalledWith('tags', 'javascript', 'typescript');
      });
    });

    describe('sMembers', () => {
      it('应该获取集合的所有成员', async () => {
        mockRedisClient.smembers.mockResolvedValue(['javascript', 'typescript', 'nodejs']);

        const result = await service.sMembers('tags');

        expect(result).toEqual(['javascript', 'typescript', 'nodejs']);
        expect(mockRedisClient.smembers).toHaveBeenCalledWith('tags');
      });

      it('应该返回空数组当集合不存在', async () => {
        mockRedisClient.smembers.mockResolvedValue([]);

        const result = await service.sMembers('non-existent-set');

        expect(result).toEqual([]);
      });
    });

    describe('sIsMember', () => {
      it('应该返回 1 当成员存在于集合中', async () => {
        mockRedisClient.sismember.mockResolvedValue(1);

        const result = await service.sIsMember('tags', 'javascript');

        expect(result).toBe(1);
        expect(mockRedisClient.sismember).toHaveBeenCalledWith('tags', 'javascript');
      });

      it('应该返回 0 当成员不存在于集合中', async () => {
        mockRedisClient.sismember.mockResolvedValue(0);

        const result = await service.sIsMember('tags', 'python');

        expect(result).toBe(0);
      });
    });
  });

  describe('边界测试', () => {
    it('应该处理空字符串键', async () => {
      mockRedisClient.set.mockResolvedValue('OK');

      await service.set('', 'value');

      expect(mockRedisClient.set).toHaveBeenCalledWith('', 'value');
    });

    it('应该处理空字符串值', async () => {
      mockRedisClient.set.mockResolvedValue('OK');

      await service.set('key', '');

      expect(mockRedisClient.set).toHaveBeenCalledWith('key', '');
    });

    it('应该处理大对象', async () => {
      mockRedisClient.set.mockResolvedValue('OK');

      const largeObject = { data: 'x'.repeat(10000) };
      await service.setJson('large-key', largeObject);

      expect(mockRedisClient.set).toHaveBeenCalledWith(
        'large-key',
        JSON.stringify(largeObject)
      );
    });

    it('应该处理特殊字符键', async () => {
      mockRedisClient.set.mockResolvedValue('OK');

      await service.set('key:with:colons', 'value');

      expect(mockRedisClient.set).toHaveBeenCalledWith('key:with:colons', 'value');
    });
  });
});
