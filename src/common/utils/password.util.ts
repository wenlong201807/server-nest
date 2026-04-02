import * as crypto from 'crypto';

/**
 * 密码加密工具类
 * 使用 Node.js 内置 crypto 模块，无需第三方依赖
 * 使用 PBKDF2 算法，安全性高
 */
export class PasswordUtil {
  // 迭代次数
  private static readonly ITERATIONS = 10000;
  // 密钥长度
  private static readonly KEY_LENGTH = 64;
  // 摘要算法
  private static readonly DIGEST = 'sha512';
  // 盐值长度
  private static readonly SALT_LENGTH = 16;

  /**
   * 加密密码
   * @param password 明文密码
   * @returns 加密后的密码（格式：salt.hash）
   */
  static async hash(password: string): Promise<string> {
    return new Promise((resolve, reject) => {
      // 生成随机盐值
      const salt = crypto.randomBytes(this.SALT_LENGTH).toString('hex');

      // 使用 PBKDF2 加密
      crypto.pbkdf2(
        password,
        salt,
        this.ITERATIONS,
        this.KEY_LENGTH,
        this.DIGEST,
        (err, derivedKey) => {
          if (err) reject(err);
          // 返回格式：salt.hash
          resolve(`${salt}.${derivedKey.toString('hex')}`);
        },
      );
    });
  }

  /**
   * 验证密码
   * @param password 明文密码
   * @param hashedPassword 加密后的密码（格式：salt.hash）
   * @returns 是否匹配
   */
  static async compare(
    password: string,
    hashedPassword: string,
  ): Promise<boolean> {
    return new Promise((resolve, reject) => {
      // 分离盐值和哈希值
      const [salt, hash] = hashedPassword.split('.');

      if (!salt || !hash) {
        return resolve(false);
      }

      // 使用相同的盐值加密输入的密码
      crypto.pbkdf2(
        password,
        salt,
        this.ITERATIONS,
        this.KEY_LENGTH,
        this.DIGEST,
        (err, derivedKey) => {
          if (err) reject(err);
          // 比较哈希值
          resolve(hash === derivedKey.toString('hex'));
        },
      );
    });
  }

  /**
   * 同步版本 - 加密密码
   * @param password 明文密码
   * @returns 加密后的密码
   */
  static hashSync(password: string): string {
    const salt = crypto.randomBytes(this.SALT_LENGTH).toString('hex');
    const hash = crypto
      .pbkdf2Sync(
        password,
        salt,
        this.ITERATIONS,
        this.KEY_LENGTH,
        this.DIGEST,
      )
      .toString('hex');
    return `${salt}.${hash}`;
  }

  /**
   * 同步版本 - 验证密码
   * @param password 明文密码
   * @param hashedPassword 加密后的密码
   * @returns 是否匹配
   */
  static compareSync(password: string, hashedPassword: string): boolean {
    const [salt, hash] = hashedPassword.split('.');

    if (!salt || !hash) {
      return false;
    }

    const derivedKey = crypto
      .pbkdf2Sync(
        password,
        salt,
        this.ITERATIONS,
        this.KEY_LENGTH,
        this.DIGEST,
      )
      .toString('hex');

    return hash === derivedKey;
  }
}
