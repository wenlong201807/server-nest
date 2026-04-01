# Redis 短信验证码查询指南

## 验证码存储规则

根据 `src/modules/auth/auth.service.ts` 的实现，短信验证码存储在 Redis 中：

- **Key 格式**：`sms:code:{手机号}`
- **Value 格式**：JSON 字符串 `{"code":"123456","createdAt":1234567890}`
- **有效期**：5分钟（300秒）
- **验证码格式**：6位数字（100000-999999）
- **发送频率限制**：1分钟内只能发送1次

## 查询方法

### 方法 1：使用 redis-cli 命令行（推荐）

```bash
# 1. 连接 Redis
redis-cli

# 2. 查看所有短信相关的 key
KEYS "sms:*"

# 3. 查看特定手机号的验证码（假设手机号是 13800138000）
GET "sms:code:13800138000"

# 输出示例：
# "{\"code\":\"123456\",\"createdAt\":1711987200000}"

# 4. 退出
exit
```

### 方法 2：一键查询所有验证码

```bash
# 查看所有短信验证码
redis-cli --scan --pattern "sms:code:*" | while read key; do
    echo "Key: $key"
    redis-cli GET "$key"
    echo "---"
done
```

**输出示例：**
```
Key: sms:code:13800138000
{"code":"123456","createdAt":1711987200000}
---
Key: sms:code:13900139000
{"code":"789012","createdAt":1711987300000}
---
```

### 方法 3：简化版查询

```bash
# 列出所有验证码（只显示值）
redis-cli KEYS "sms:code:*" | xargs -I {} redis-cli GET {}
```

### 方法 4：实时监控 Redis 操作

```bash
# 监控所有 Redis 命令
redis-cli MONITOR

# 然后在另一个终端发送短信
# 会看到类似输出：
# 1711987200.123456 [0 127.0.0.1:12345] "SET" "sms:code:13800138000" "{\"code\":\"123456\",\"createdAt\":1711987200000}" "EX" "300"
```

### 方法 5：查看控制台日志（最简单）

代码中有打印验证码：

```typescript
console.log(`验证码: ${code}`); // 开发环境打印
```

**发送短信后，直接在后端控制台查看：**

```bash
# 启动服务
pnpm run start:dev

# 发送短信后，控制台会输出：
# 验证码: 123456
```

### 方法 6：使用 Redis 图形化工具

#### RedisInsight（官方推荐）

1. 下载安装：https://redis.io/insight/
2. 连接到 `localhost:6379`
3. 在搜索框输入：`sms:code:*`
4. 点击对应的 key 查看值

#### Another Redis Desktop Manager

1. 下载安装：https://github.com/qishibo/AnotherRedisDesktopManager
2. 添加连接：`localhost:6379`
3. 搜索 `sms:code:*`
4. 双击查看验证码

## 常用 Redis 命令

### 查询相关

```bash
# 查看所有短信相关的 key
KEYS "sms:*"

# 查看特定手机号的验证码
GET "sms:code:13800138000"

# 查看 key 的剩余过期时间（秒）
TTL "sms:code:13800138000"

# 查看 key 是否存在
EXISTS "sms:code:13800138000"

# 查看 key 的类型
TYPE "sms:code:13800138000"
```

### 管理相关

```bash
# 删除特定验证码
DEL "sms:code:13800138000"

# 删除所有短信验证码
redis-cli KEYS "sms:code:*" | xargs redis-cli DEL

# 设置新的过期时间（秒）
EXPIRE "sms:code:13800138000" 300

# 移除过期时间（永不过期）
PERSIST "sms:code:13800138000"
```

### 调试相关

```bash
# 查看 Redis 信息
INFO

# 查看当前数据库的 key 数量
DBSIZE

# 清空当前数据库（慎用！）
FLB

# 清空所有数据库（慎用！）
FLUSHALL
```

## 验证码数据结构

### JSON 格式

```json
{
  "code": "123456",
  "createdAt": 1711987200000
}
```

### 字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| code | string | 6位数字验证码 |
| createdAt | number | 创建时间戳（毫秒） |

## 频率限制

除了验证码，还有频率限制的 key：

```bash
# Key 格式
sms:rate:{手机号}

# 查看频率限制
GET "sms:rate:13800138000"

# 输出：1（表示1分钟内已发送）

# 查看剩余限制时间
TTL "sms:rate:13800138000"
```

## 实战示例

### 场景 1：用户反馈收不到验证码

```bash
# 1. 检查验证码是否存在
redis-cli GET "sms:code:13800138000"

# 2. 如果不存在，检查是否被频率限制
redis-cli GET "sms:rate:13800138000"

# 3. 如果被限制，查看剩余时间
redis-cli TTL "sms:rate:13800138000"

# 4. 如果需要，手动删除限制
redis-cli DEL "sms:rate:13800138000"
```

### 场景 2：测试环境快速获取验证码

```bash
# 方法 1：查看控制台日志
# 后端启动后，发送短信，控制台会打印验证码

# 方法 2：直接查询 Redis
redis-cli GET "sms:code:13800138000"

# 方法 3：手动设置验证码（测试用）
redis-cli SET "sms:code:13800138000" '{"code":"888888","createdAt":1711987200000}' EX 300
```

### 场景 3：批量查看所有验证码

```bash
# 创建查询脚本
cat > check-sms.sh <<'EOF'
#!/bin/bash
echo "=== 当前所有短信验证码 ==="
redis-cli KEYS "sms:code:*" | while read key; do
    mobile=$(echo $key | sed 's/sms:code://')
    code=$(redis-cli GET "$key" | jq -r '.code')
    ttl=$(redis-cli TTL "$key")
    echo "手机号: $mobile | 验证码: $code | 剩余时间: ${ttl}秒"
done
EOF

chmod +x check-sms.sh
./check-sms.sh
```

**输出示例：**
```
=== 当前所有短信验证码 ===
手机号: 13800138000 | 验证码: 123456 | 剩余时间: 245秒
手机号: 13900139000 | 验证码: 789012 | 剩余时间: 180秒
```

## 开发环境配置

### 方法 1：禁用验证码验证（仅开发环境）

修改 `auth.service.ts`：

```typescript
async register(dto: RegisterDto) {
  // 开发环境跳过验证码验证
  if (process.env.NODE_ENV !== 'development') {
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
  }
  
  // ... 其他逻辑
}
```

### 方法 2：使用固定验证码（仅开发环境）

```typescript
async sendSms(mobile: string) {
  // 开发环境使用固定验证码
  const code = process.env.NODE_ENV === 'development' 
    ? '888888' 
    : Math.floor(100000 + Math.random() * 900000).toString();
  
  // ... 其他逻辑
}
```

## 故障排查

### 问题 1：Redis 连接失败

```bash
# 检查 Redis 是否运行
redis-cli ping

# 如果返回 PONG，说明 Redis 正常
# 如果报错，启动 Redis
redis-server
```

### 问题 2：找不到验证码

```bash
# 1. 确认手机号格式正确
redis-cli KEYS "sms:code:*"

# 2. 检查是否过期
redis-cli TTL "sms:code:13800138000"
# 返回 -2 表示 key 不存在
# 返回 -1 表示永不过期
# 返回正数表示剩余秒数

# 3. 查看 Redis 日志
tail -f /var/log/redis/redis-server.log
```

### 问题 3：验证码格式错误

```bash
# 查看原始数据
redis-cli GET "sms:code:13800138000"

# 如果不是 JSON 格式，可能是数据损坏
# 删除并重新发送
redis-cli DEL "sms:code:13800138000"
```

## 安全建议

1. **生产环境不要打印验证码到控制台**
2. **限制 Redis 访问权限**，设置密码
3. **监控异常发送频率**，防止恶意攻击
4. **定期清理过期数据**（Redis 会自动清理）
5. **使用 SSL/TLS 加密 Redis 连接**（生产环境）

## 相关文件

- 验证码发送逻辑：`src/modules/auth/auth.service.ts`
- Redis 服务封装：`src/common/redis/redis.service.ts`
- 环境配置：`.env`

## 参考命令速查表

| 操作 | 命令 |
|------|------|
| 查看所有验证码 | `redis-cli KEYS "sms:code:*"` |
| 查看特定验证码 | `redis-cli GET "sms:code:手机号"` |
| 查看剩余时间 | `redis-cli TTL "sms:code:手机号"` |
| 删除验证码 | `redis-cli DEL "sms:code:手机号"` |
| 删除频率限制 | `redis-cli DEL "sms:rate:手机号"` |
| 实时监控 | `redis-cli MONITOR` |
| 查看 Redis 状态 | `redis-cli INFO` |
