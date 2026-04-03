import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UserService } from '../user/user.service';
import { PointsService } from '../points/points.service';
import { RegisterDto, LoginDto, SmsDto } from './dto/auth.dto';
import { RedisService } from '../../common/redis/redis.service';
import { nanoid } from 'nanoid';
import { PasswordUtil } from '../../common/utils/password.util';
import { PointsSourceType } from '@common/constants';
import { User } from '../user/entities/user.entity';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private userService: UserService,
    private pointsService: PointsService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private redisService: RedisService,
  ) {}

  async sendSms(mobile: string) {
    // 检查发送频率
    const rateKey = `sms:rate:${mobile}`;
    const rate = await this.redisService.get(rateKey);
    if (rate) {
      throw new UnauthorizedException('发送过于频繁，请稍后再试');
    }

    // 生成验证码
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const key = `sms:code:${mobile}`;

    // 存储5分钟
    await this.redisService.setJson(key, { code, createdAt: Date.now() }, 300);

    // 设置频率限制 1分钟内只能发送1次
    await this.redisService.set(rateKey, '1', 60);

    // 发送短信验证码
    if (this.configService.get('NODE_ENV') === 'production') {
      // TODO: 集成短信服务（阿里云、腾讯云等）
      // await this.smsService.send(mobile, code);
      this.logger.warn('生产环境短信服务未配置');
    } else {
      // 开发环境打印
      this.logger.log(`验证码: ${code} (手机号: ${mobile})`);
    }

    return { message: '验证码已发送' };
  }

  async register(dto: RegisterDto) {
    // 验证验证码
    const key = `sms:code:${dto.mobile}`;
    const stored = await this.redisService.getJson<{
      code: string;
      createdAt: number;
    }>(key);
    if (!stored) {
      throw new UnauthorizedException('验证码已过期');
    }
    if (stored.code !== dto.code) {
      throw new UnauthorizedException('验证码错误');
    }

    // 检查手机号是否已注册
    const existUser = await this.userService.findByMobile(dto.mobile);
    if (existUser) {
      throw new UnauthorizedException('手机号已注册');
    }

    // 生成邀请码
    let inviteCode = nanoid(8).toUpperCase();
    while (await this.userService.findByInviteCode(inviteCode)) {
      inviteCode = nanoid(8).toUpperCase();
    }

    // 使用事务确保数据一致性
    const user = await this.userService.createWithTransaction({
      mobile: dto.mobile,
      password: dto.password,
      nickname: dto.nickname,
      gender: dto.gender,
      inviteCode,
      inviterCode: dto.inviteCode,
    });

    // 清除验证码
    await this.redisService.del(key);

    return this.generateToken(user);
  }

  async login(dto: LoginDto) {
    const user = await this.userService.findByMobile(dto.mobile);
    if (!user) {
      throw new UnauthorizedException('用户不存在');
    }

    if (user.status !== 0) {
      throw new UnauthorizedException('账号已被禁用');
    }

    const isValid = await PasswordUtil.compare(dto.password, user.password);
    if (!isValid) {
      throw new UnauthorizedException('密码错误');
    }

    return this.generateToken(user);
  }

  async refreshToken(refreshToken: string) {
    try {
      // 验证 refresh token
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get('JWT_REFRESH_SECRET') || this.configService.get('JWT_SECRET'),
      });

      // 检查 token 是否在黑名单中
      const isBlacklisted = await this.redisService.exists(
        `token:blacklist:${refreshToken}`
      );
      if (isBlacklisted) {
        throw new UnauthorizedException('Token 已失效');
      }

      // 查询用户
      const user = await this.userService.findById(payload.sub);
      if (!user) {
        throw new UnauthorizedException('用户不存在');
      }

      if (user.status !== 0) {
        throw new UnauthorizedException('账号已被禁用');
      }

      // 生成新的 access token
      return this.generateToken(user);
    } catch (error) {
      throw new UnauthorizedException('Token 无效或已过期');
    }
  }

  async logout(token: string) {
    try {
      const payload = this.jwtService.decode(token) as any;
      const expiresIn = payload.exp - Math.floor(Date.now() / 1000);

      if (expiresIn > 0) {
        await this.redisService.set(
          `token:blacklist:${token}`,
          '1',
          expiresIn
        );
      }

      return { message: '退出成功' };
    } catch (error) {
      return { message: '退出成功' };
    }
  }

  private async generateToken(user: User) {
    const payload = {
      sub: user.id,
      mobile: user.mobile,
      nickname: user.nickname,
    };

    // 生成 access token (7天)
    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_SECRET'),
      expiresIn: this.configService.get('JWT_EXPIRES_IN') || '7d',
    });

    // 生成 refresh token (30天)
    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_REFRESH_SECRET') || this.configService.get('JWT_SECRET'),
      expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN') || '30d',
    });

    const { password, ...userWithoutPassword } = user;

    return {
      token: accessToken,
      refreshToken,
      user: userWithoutPassword,
    };
  }
}
