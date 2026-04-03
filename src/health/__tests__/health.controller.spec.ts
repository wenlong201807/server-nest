import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from '../health.controller';

describe('HealthController', () => {
  let controller: HealthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  describe('check', () => {
    it('应该返回健康检查状态', () => {
      const result = controller.check();

      expect(result).toHaveProperty('status', 'ok');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('uptime');
      expect(typeof result.timestamp).toBe('string');
      expect(typeof result.uptime).toBe('number');
    });

    it('应该返回有效的 ISO 时间戳', () => {
      const result = controller.check();
      const timestamp = new Date(result.timestamp);

      expect(timestamp.toString()).not.toBe('Invalid Date');
    });

    it('应该返回正数的运行时间', () => {
      const result = controller.check();

      expect(result.uptime).toBeGreaterThanOrEqual(0);
    });
  });
});
