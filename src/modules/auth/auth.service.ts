import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UserService } from '../user/user.service';
import { PointsService } from '../points/points.service';
import { RegisterDto, LoginDto, SmsDto } from './dto/auth.dto';
import { RedisService } from '../../common/redis/redis.service';
import { nanoid } from 'nanoid';
import * as bcrypt from 'bcryptjs';
import { PointsSourceType } from '@common/constants';

@Injectable()
export class AuthService {
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

    // TODO: 调用短信服务发送验证码
    console.log(`验证码: ${code}`); // 开发环境打印

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

    // 创建用户
    const user = await this.userService.create({
      mobile: dto.mobile,
      password: dto.password,
      nickname: dto.nickname,
      gender: dto.gender,
      inviteCode,
      inviterCode: dto.inviteCode,
    });

    // 初始积分
    await this.pointsService.addPoints(
      user.id,
      2000,
      PointsSourceType.REGISTER,
      0,
      '注册赠送',
    );

    // 邀请人奖励
    if (dto.inviteCode) {
      const inviter = await this.userService.findByInviteCode(dto.inviteCode);
      if (inviter) {
        await this.pointsService.addPoints(
          inviter.id,
          100,
          PointsSourceType.INVITE,
          user.id,
          '邀请用户注册',
        );
      }
    }

    // 清除验证码
    await this.redisService.del(key);

    return this.generateToken(user);
  }

  // TODO ok
  async login(dto: LoginDto) {
    const user = await this.userService.findByMobile(dto.mobile);
    if (!user) {
      throw new UnauthorizedException('用户不存在');
    }

    if (user.status !== 0) {
      throw new UnauthorizedException('账号已被禁用');
    }

    const isValid = await bcrypt.compare(dto.password, user.password);
    if (!isValid) {
      throw new UnauthorizedException('密码错误');
    }

    return this.generateToken(user);
  }

  async refreshToken(refreshToken: string) {
    // TODO: 实现refresh token逻辑
    return { token: 'new_token' };
  }

  private async generateToken(user: any) {
    const payload = {
      sub: user.id,
      mobile: user.mobile,
      nickname: user.nickname,
    };

    const token = this.jwtService.sign(payload);
    const userWithoutPassword = { ...user };
    delete userWithoutPassword.password;

    return {
      token,
      user: userWithoutPassword,
    };
  }
}
