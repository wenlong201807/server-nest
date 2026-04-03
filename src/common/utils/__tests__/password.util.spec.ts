import { PasswordUtil } from '../password.util';

describe('PasswordUtil', () => {
  describe('hash', () => {
    it('应该成功加密密码', async () => {
      const password = 'test123456';
      const hashed = await PasswordUtil.hash(password);

      expect(hashed).toBeDefined();
      expect(hashed).toContain('.');
      expect(hashed.split('.').length).toBe(2);
    });

    it('相同密码应该生成不同的哈希值（因为盐值不同）', async () => {
      const password = 'test123456';
      const hash1 = await PasswordUtil.hash(password);
      const hash2 = await PasswordUtil.hash(password);

      expect(hash1).not.toBe(hash2);
    });

    it('应该处理空密码', async () => {
      const password = '';
      const hashed = await PasswordUtil.hash(password);

      expect(hashed).toBeDefined();
      expect(hashed).toContain('.');
    });

    it('应该处理特殊字符密码', async () => {
      const password = '!@#$%^&*()_+-=[]{}|;:,.<>?';
      const hashed = await PasswordUtil.hash(password);

      expect(hashed).toBeDefined();
      expect(hashed).toContain('.');
    });

    it('应该处理长密码', async () => {
      const password = 'a'.repeat(1000);
      const hashed = await PasswordUtil.hash(password);

      expect(hashed).toBeDefined();
      expect(hashed).toContain('.');
    });
  });

  describe('compare', () => {
    it('应该验证正确的密码', async () => {
      const password = 'test123456';
      const hashed = await PasswordUtil.hash(password);
      const isValid = await PasswordUtil.compare(password, hashed);

      expect(isValid).toBe(true);
    });

    it('应该拒绝错误的密码', async () => {
      const password = 'test123456';
      const wrongPassword = 'wrong123456';
      const hashed = await PasswordUtil.hash(password);
      const isValid = await PasswordUtil.compare(wrongPassword, hashed);

      expect(isValid).toBe(false);
    });

    it('应该处理空密码验证', async () => {
      const password = '';
      const hashed = await PasswordUtil.hash(password);
      const isValid = await PasswordUtil.compare(password, hashed);

      expect(isValid).toBe(true);
    });

    it('应该处理格式错误的哈希值', async () => {
      const password = 'test123456';
      const invalidHash = 'invalid-hash';
      const isValid = await PasswordUtil.compare(password, invalidHash);

      expect(isValid).toBe(false);
    });

    it('应该处理缺少盐值的哈希', async () => {
      const password = 'test123456';
      const invalidHash = 'onlyonepart';
      const isValid = await PasswordUtil.compare(password, invalidHash);

      expect(isValid).toBe(false);
    });

    it('应该区分大小写', async () => {
      const password = 'Test123456';
      const hashed = await PasswordUtil.hash(password);
      const isValid1 = await PasswordUtil.compare('Test123456', hashed);
      const isValid2 = await PasswordUtil.compare('test123456', hashed);

      expect(isValid1).toBe(true);
      expect(isValid2).toBe(false);
    });
  });

  describe('hashSync', () => {
    it('应该同步加密密码', () => {
      const password = 'test123456';
      const hashed = PasswordUtil.hashSync(password);

      expect(hashed).toBeDefined();
      expect(hashed).toContain('.');
      expect(hashed.split('.').length).toBe(2);
    });

    it('相同密码应该生成不同的哈希值', () => {
      const password = 'test123456';
      const hash1 = PasswordUtil.hashSync(password);
      const hash2 = PasswordUtil.hashSync(password);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('compareSync', () => {
    it('应该同步验证正确的密码', () => {
      const password = 'test123456';
      const hashed = PasswordUtil.hashSync(password);
      const isValid = PasswordUtil.compareSync(password, hashed);

      expect(isValid).toBe(true);
    });

    it('应该同步拒绝错误的密码', () => {
      const password = 'test123456';
      const wrongPassword = 'wrong123456';
      const hashed = PasswordUtil.hashSync(password);
      const isValid = PasswordUtil.compareSync(wrongPassword, hashed);

      expect(isValid).toBe(false);
    });

    it('应该处理格式错误的哈希值', () => {
      const password = 'test123456';
      const invalidHash = 'invalid-hash';
      const isValid = PasswordUtil.compareSync(password, invalidHash);

      expect(isValid).toBe(false);
    });
  });

  describe('性能测试', () => {
    it('异步加密应该在合理时间内完成', async () => {
      const password = 'test123456';
      const startTime = Date.now();
      await PasswordUtil.hash(password);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(1000); // 应该在1秒内完成
    });

    it('同步加密应该在合理时间内完成', () => {
      const password = 'test123456';
      const startTime = Date.now();
      PasswordUtil.hashSync(password);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(1000);
    });
  });

  describe('边界测试', () => {
    it('应该处理 Unicode 字符', async () => {
      const password = '测试密码123';
      const hashed = await PasswordUtil.hash(password);
      const isValid = await PasswordUtil.compare(password, hashed);

      expect(isValid).toBe(true);
    });

    it('应该处理 Emoji', async () => {
      const password = '😀😁😂🤣';
      const hashed = await PasswordUtil.hash(password);
      const isValid = await PasswordUtil.compare(password, hashed);

      expect(isValid).toBe(true);
    });

    it('应该处理换行符', async () => {
      const password = 'test\n123\r\n456';
      const hashed = await PasswordUtil.hash(password);
      const isValid = await PasswordUtil.compare(password, hashed);

      expect(isValid).toBe(true);
    });
  });

  describe('错误处理', () => {
    it('hash 方法应该处理 crypto.pbkdf2 错误', async () => {
      const crypto = require('crypto');
      const originalPbkdf2 = crypto.pbkdf2;

      crypto.pbkdf2 = (password: any, salt: any, iterations: any, keylen: any, digest: any, callback: any) => {
        callback(new Error('Crypto error'));
      };

      await expect(PasswordUtil.hash('test')).rejects.toThrow('Crypto error');

      crypto.pbkdf2 = originalPbkdf2;
    });

    it('compare 方法应该处理 crypto.pbkdf2 错误', async () => {
      const crypto = require('crypto');
      const password = 'test123456';
      const hashed = await PasswordUtil.hash(password);

      const originalPbkdf2 = crypto.pbkdf2;
      crypto.pbkdf2 = (password: any, salt: any, iterations: any, keylen: any, digest: any, callback: any) => {
        callback(new Error('Crypto error'));
      };

      await expect(PasswordUtil.compare(password, hashed)).rejects.toThrow('Crypto error');

      crypto.pbkdf2 = originalPbkdf2;
    });

    it('应该处理损坏的哈希值', async () => {
      const password = 'test123456';
      const corruptedHash = 'salt.invalidhexvalue!@#';
      const isValid = await PasswordUtil.compare(password, corruptedHash);

      expect(isValid).toBe(false);
    });

    it('应该处理空字符串哈希值', async () => {
      const password = 'test123456';
      const emptyHash = '';
      const isValid = await PasswordUtil.compare(password, emptyHash);

      expect(isValid).toBe(false);
    });

    it('应该处理只有点号的哈希值', async () => {
      const password = 'test123456';
      const dotOnlyHash = '.';
      const isValid = await PasswordUtil.compare(password, dotOnlyHash);

      expect(isValid).toBe(false);
    });

    it('应该处理多个点号的哈希值', async () => {
      const password = 'test123456';
      const multiDotHash = 'salt.hash.extra';
      const isValid = await PasswordUtil.compare(password, multiDotHash);

      expect(isValid).toBe(false);
    });
  });
});
