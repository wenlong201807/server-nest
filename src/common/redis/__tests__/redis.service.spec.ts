import { Test, TestingModule } from '@nestjs/testing';
import { RedisService } from '../redis.service';
import { ConfigService } from '@nestjs/config';

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
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedisService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config = {
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
    it('应该返回 true 当键存在', async () => {
      mockRedisClient.exists.mockResolvedValue(1);

      const result = await service.exists('test-key');

      expect(result).toBe(true);
      expect(mockRedisClient.exists).toHaveBeenCalledWith('test-key');
    });

    it('应该返回 false 当键不存在', async () => {
      mockRedisClient.exists.mockResolvedValue(0);

      const result = await service.exists('non-existent-key');

      expect(result).toBe(false);
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

      await expect(service.getJson('test-key')).rejects.toThrow();
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
