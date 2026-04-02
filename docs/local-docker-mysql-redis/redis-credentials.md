# Redis 服务连接信息

## 概览

本地 Docker 环境中运行了 3 个 Redis 实例，分别对应不同的部署环境。所有实例均**未设置密码**。

## 连接信息

### 1. 开发环境 (Dev)

**容器名称**: `together-redis-dev`

**连接参数**:
- **主机**: `127.0.0.1` 或 `localhost`
- **端口**: `6383`
- **密码**: *无密码*
- **数据库**: `0` (默认)

**Another Redis Desktop Manager 连接配置**:
```
连接名: Together Redis Dev
主机: 127.0.0.1
端口: 6383
密码: (留空)
```

**命令行测试**:
```bash
redis-cli -h 127.0.0.1 -p 6383 ping
# 输出: PONG
```

---

### 2. 预发布环境 (Staging)

**容器名称**: `together-redis-staging`

**连接参数**:
- **主机**: `127.0.0.1` 或 `localhost`
- **端口**: `6384`
- **密码**: *无密码*
- **数据库**: `0` (默认)

**Another Redis Desktop Manager 连接配置**:
```
连接名: Together Redis Staging
主机: 127.0.0.1
端口: 6384
密码: (留空)
```

**命令行测试**:
```bash
redis-cli -h 127.0.0.1 -p 6384 ping
# 输出: PONG
```

---

### 3. 生产环境 (Prod)

**容器名称**: `together-redis-prod`

**连接参数**:
- **主机**: `127.0.0.1` 或 `localhost`
- **端口**: `6382`
- **密码**: *无密码*
- **数据库**: `0` (默认)

**Another Redis Desktop Manager 连接配置**:
```
连接名: Together Redis Prod
主机: 127.0.0.1
端口: 6382
密码: (留空)
```

**命令行测试**:
```bash
redis-cli -h 127.0.0.1 -p 6382 ping
# 输出: PONG
```

---

## 连接验证结果

### ✅ 所有环境连接测试通过

| 环境 | 端口 | 密码 | 状态 | 测试结果 |
|------|------|------|------|---------|
| Dev | 6383 | 无 | ✅ 正常 | PONG |
| Staging | 6384 | 无 | ✅ 正常 | PONG |
| Prod | 6382 | 无 | ✅ 正常 | PONG |

---

## Another Redis Desktop Manager 连接步骤

### 1. 打开 Another Redis Desktop Manager

### 2. 新建连接
- 点击左上角 "+" 或 "New Connection"

### 3. 填写连接信息（以 Dev 为例）

**基本信息**:
```
Name: Together Redis Dev
Host: 127.0.0.1
Port: 6383
Auth: (留空，不填写密码)
```

**高级选项**（可选）:
```
Connection Timeout: 5000
Execution Timeout: 5000
Database Index: 0
```

### 4. 测试连接
- 点击 "Test Connection" 按钮
- 应该显示 "Connection successful" 或类似提示

### 5. 保存并连接
- 点击 "OK" 或 "Save" 保存连接
- 点击连接名即可连接到 Redis

### 6. 查看数据
- 连接成功后，可以看到所有 key
- 可以查看、编辑、删除 key
- 可以执行 Redis 命令

---

## 常见 Redis 命令

### 基本操作

```bash
# 查看所有 key
redis-cli -h 127.0.0.1 -p 6383 KEYS "*"

# 获取 key 的值
redis-cli -h 127.0.0.1 -p 6383 GET "your_key"

# 设置 key
redis-cli -h 127.0.0.1 -p 6383 SET "test_key" "test_value"

# 删除 key
redis-cli -h 127.0.0.1 -p 6383 DEL "test_key"

# 查看 key 的类型
redis-cli -h 127.0.0.1 -p 6383 TYPE "your_key"

# 查看 key 的过期时间
redis-cli -h 127.0.0.1 -p 6383 TTL "your_key"
```

### 清空数据库

```bash
# 清空当前数据库（谨慎使用！）
redis-cli -h 127.0.0.1 -p 6383 FLUSHDB

# 清空所有数据库（非常危险！）
redis-cli -h 127.0.0.1 -p 6383 FLUSHALL
```

### 查看信息

```bash
# 查看 Redis 信息
redis-cli -h 127.0.0.1 -p 6383 INFO

# 查看内存使用
redis-cli -h 127.0.0.1 -p 6383 INFO memory

# 查看客户端连接
redis-cli -h 127.0.0.1 -p 6383 CLIENT LIST

# 查看配置
redis-cli -h 127.0.0.1 -p 6383 CONFIG GET "*"
```

---

## Jenkins 部署中的 Redis 配置

### Jenkinsfile 中的配置

```groovy
// 开发环境
export REDIS_HOST=host.docker.internal
export REDIS_PORT=6383
export REDIS_PASSWORD=

// 预发布环境
export REDIS_HOST=host.docker.internal
export REDIS_PORT=6384
export REDIS_PASSWORD=

// 生产环境
export REDIS_HOST=host.docker.internal
export REDIS_PORT=6382
export REDIS_PASSWORD=
```

### NestJS 应用中的配置

```typescript
// src/config/redis.config.ts
export default () => ({
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    db: 0,
  },
});
```

---

## 常见问题

### 1. 连接被拒绝 (Connection Refused)

**检查容器状态**:
```bash
docker ps --filter "name=together-redis"
```

**启动容器**:
```bash
docker start together-redis-dev
docker start together-redis-staging
docker start together-redis-prod
```

### 2. 端口被占用

**检查端口占用**:
```bash
lsof -i :6382
lsof -i :6383
lsof -i :6384
```

### 3. 无法连接到 Redis

**测试连接**:
```bash
# 测试 Dev 环境
redis-cli -h 127.0.0.1 -p 6383 ping

# 测试 Staging 环境
redis-cli -h 127.0.0.1 -p 6384 ping

# 测试 Prod 环境
redis-cli -h 127.0.0.1 -p 6382 ping
```

**查看容器日志**:
```bash
docker logs together-redis-dev
docker logs together-redis-staging
docker logs together-redis-prod
```

---

## 安全建议

### ⚠️ 生产环境注意事项

1. **设置密码**: 生产环境 Redis **必须**设置强密码
2. **限制访问**: 只允许应用服务器访问 Redis
3. **禁用危险命令**: 禁用 FLUSHDB、FLUSHALL、KEYS 等命令
4. **启用 SSL/TLS**: 生产环境应启用加密连接
5. **定期备份**: 配置 RDB 或 AOF 持久化

### 推荐配置（生产环境）

```bash
# 进入容器
docker exec -it together-redis-prod bash

# 编辑配置文件
vi /etc/redis/redis.conf

# 添加以下配置
requirepass your_strong_password_here
bind 127.0.0.1
protected-mode yes
rename-command FLUSHDB ""
rename-command FLUSHALL ""
rename-command CONFIG ""

# 重启 Redis
redis-cli shutdown
redis-server /etc/redis/redis.conf
```

### 设置密码后的连接方式

```bash
# 命令行连接
redis-cli -h 127.0.0.1 -p 6382 -a your_password

# Another Redis Desktop Manager
# 在 Auth 字段填写密码
```

---

## Redis 数据持久化

### RDB 快照

```bash
# 手动触发快照
redis-cli -h 127.0.0.1 -p 6383 SAVE

# 异步快照
redis-cli -h 127.0.0.1 -p 6383 BGSAVE

# 查看最后一次快照时间
redis-cli -h 127.0.0.1 -p 6383 LASTSAVE
```

### AOF 日志

```bash
# 查看 AOF 状态
redis-cli -h 127.0.0.1 -p 6383 CONFIG GET appendonly

# 启用 AOF
redis-cli -h 127.0.0.1 -p 6383 CONFIG SET appendonly yes

# 重写 AOF
redis-cli -h 127.0.0.1 -p 6383 BGREWRITEAOF
```

---

## 性能监控

### 实时监控

```bash
# 实时查看 Redis 命令
redis-cli -h 127.0.0.1 -p 6383 MONITOR

# 查看慢查询日志
redis-cli -h 127.0.0.1 -p 6383 SLOWLOG GET 10

# 查看统计信息
redis-cli -h 127.0.0.1 -p 6383 INFO stats
```

### 内存分析

```bash
# 查看内存使用
redis-cli -h 127.0.0.1 -p 6383 INFO memory

# 查看 key 占用内存
redis-cli -h 127.0.0.1 -p 6383 MEMORY USAGE "your_key"

# 查看内存碎片率
redis-cli -h 127.0.0.1 -p 6383 INFO memory | grep mem_fragmentation_ratio
```

---

## 数据备份与恢复

### 备份数据

```bash
# 方法 1: 复制 RDB 文件
docker exec together-redis-dev cat /data/dump.rdb > backup_dev.rdb

# 方法 2: 使用 redis-cli
redis-cli -h 127.0.0.1 -p 6383 --rdb backup_dev.rdb
```

### 恢复数据

```bash
# 停止 Redis
docker stop together-redis-dev

# 复制备份文件到容器
docker cp backup_dev.rdb together-redis-dev:/data/dump.rdb

# 启动 Redis
docker start together-redis-dev
```

---

## 环境对应关系

| 环境 | Redis 端口 | MySQL 端口 | 应用端口 | 数据库名 |
|------|-----------|-----------|---------|---------|
| Dev | 6383 | 3307 | 8118 |ether_dev |
| Staging | 6384 | 3308 | 8119 | together_staging |
| Prod | 6382 | 3309 | 8120 | together_prod |

---

## 相关文档

- [MySQL 连接信息](./mysql-credentials.md)
- [Jenkins 部署配置](../../Jenkinsfile)
- [应用配置说明](../../README.md)

---

**文档版本**: v1.0  
**最后更新**: 2026-04-02  
**维护者**: 开发团队
