# Docker 本地服务连接指南

## 概览

本文档提供本地 Docker 环境中 MySQL 和 Redis 服务的完整连接信息和使用指南。

## 服务列表

### MySQL 服务

| 环境 | 容器名 | 端口 | 用户名 | 密码 | 数据库 | 状态 |
|------|--------|------|--------|------|--------|------|
| Dev | together-mysql-dev | 3307 | root | root123 | together_dev | ✅ 正常 |
| Staging | together-mysql-staging | 3308 | root | root123 | together_staging | ✅ 正常 |
| Prod | together-mysql-prod | 3309 | root | root123 | together_prod | ✅ 正常 |

### Redis 服务

| 环境 | 容器名 | 端口 | 密码 | 状态 |
|------|--------|------|------|------|
| Dev | together-redis-dev | 6383 | 无 | ✅ 正常 |
| Staging | together-redis-staging | 6384 | 无 | ✅ 正常 |
| Prod | together-redis-prod | 6382 | 无 | ✅ 正常 |

## 快速连接

### MySQL 连接（命令行）

```bash
# Dev 环境
mysql -h127.0.0.1 -P3307 -uroot -proot123 together_dev

# Staging 环境
mysql -h127.0.0.1 -P3308 -uroot -proot123 together_staging

# Prod 环境
mysql -h127.0.0.1 -P3309 -uroot -proot123 together_prod
```

### Redis 连接（命令行）

```bash
# Dev 环境
redis-cli -h 127.0.0.1 -p 6383

# Staging 环境
redis-cli -h 127.0.0.1 -p 6384

# Prod 环境
redis-cli -h 127.0.0.1 -p 6382
```

## GUI 工具连接

### Navicat (MySQL)

**Dev 环境配置**:
```
连接名: Together MySQL Dev
主机: 127.0.0.1
端口: 3307
用户名: root
密码: root123
数据库: together_dev
```

详细步骤请参考: [MySQL 连接信息](./mysql-credentials.md)

### Another Redis Desktop Manager (Redis)

**Dev 环境配置**:
```
连接名: Together Redis Dev
主机: 127.0.0.1
端口: 6383
密码: (留空)
```

详细步骤请参考: [Redis 连接信息](./redis-credentials.md)

## 验证结果

### ✅ 所有服务连接测试通过

**MySQL 测试结果**:
```bash
$ mysql -h127.0.0.1 -P3307 -uroot -proot123 -e "SELECT VERSION();"
VERSION()
8.0.42

$ mysql -h127.0.0.1 -P3308 -uroot -proot123 -e "SELECT VERSION();"
VERSION()
8.0.42

$ mysql -h127.0.0.1 -P3309 -uroot -proot123 -e "SELECT VERSION();"
VERSION()
8.0.42
```

**Redis 测试结果**:
```bash
$ redis-cli -h 127.0.0.1 -p 6383 ping
PONG

$ redis-cli -h 127.0.0.1 -p 6384 ping
PONG

$ redis-cli -h 127.0.0.1 -p 6382 ping
PONG
```

## 环境对应关系

| 环境 | MySQL 端口 | Redis 端口 | 应用端口 | 数据库名 |
|------|-----------|-----------|---------|---------|
| Dev | 3307 | 6383 | 8118 | together_dev |
| Staging | 3308 | 6384 | 8119 | together_staging |
| Prod | 3309 | 6382 | 8120 | together_prod |

## 常用操作

### 查看容器状态

```bash
# 查看所有 MySQL 容器
docker ps --filter "name=together-mysql"

# 查看所有 Redis 容器
docker ps --filter "name=together-redis"
```

### 启动/停止容器

```bash
# 启动 Dev 环境
docker start together-mysql-dev together-redis-de停止 Dev 环境
docker stop together-mysql-dev together-redis-dev

# 重启 Dev 环境
docker restart together-mysql-dev together-redis-dev
```

### 查看容器日志

```bash
# MySQL 日志
docker logs together-mysql-dev
docker logs together-mysql-staging
docker logs together-mysql-prod

# Redis 日志
docker logs together-redis-dev
docker logs together-redis-staging
docker logs together-redis-prod
```

### 进入容器

```bash
# 进入 MySQL 容器
docker exec -it together-mysql-dev bash

# 进入 Redis 容器
docker exec -it together-redis-dev bash
```

## 常见问题

### 1. MySQL 连接被拒绝

**错误信息**: `Access denied for user 'root'@'172.23.0.1' (using password: YES)`

**解决方案**:
```bash
# 修改认证插件为 mysql_native_password
docker exec together-mysql-dev mysql -uroot -proot123 -e "ALTER USER 'root'@'%' IDENTIFIED WITH mysql_native_password BY 'root123'; FLUSH PRIVILEGES;"
```

详细说明请参考: [MySQL 连接信息 - 常见问题](./mysql-credentials.md#常见问题)

### 2. Redis 连接失败

**检查容器状态**:
```bash
docker ps --filter "name=together-redis"
```

**启动容器**:
```bash
docker start together-redis-dev
```

详细说明请参考: [Redis 连接信息 - 常见问题](./redis-credentials.md#常见问题)

### 3. 端口被占用

**检查端口占用**:
```bash
# MySQL 端口
lsof -i :3307
lsof -i :3308
lsof -i :3309

# Redis 端口
lsof -i :6382
lsof -i :6383
lsof -i :6384
```

## 安全建议

### ⚠️ 当前配置仅适用于开发环境

**存在的安全问题**:
1. MySQL 使用弱密码 `root123`
2. Redis 未设置密码
3. 所有服务允许远程访问

### 生产环境建议

1. **MySQL**:
   - 使用强密码
   - 创建专用应用用户
   - 限制 root 用户远程访问
   - 启用 SSL 连接

2. **Redis**:
   - 设置强密码
   - 限制访问 IP
   - 禁用危险命令
   - 启用 SSL/TLS

详细配置请参考:
- [MySQL 安全建议](./mysql-credentials.md#安全建议)
- [Redis 安全建议](./redis-credentials.md#安全建议)

## 数据备份

### MySQL 备份

```bash
# 备份 Dev 环境
docker exec together-mysql-dev mysqldump -uroot -proot123 together_dev > backup_dev_$(date +%Y%m%d).sql

# 备份 Staging 环境
docker exec together-mysql-staging mysqldump -uroot -proot123 together_staging > backup_staging_$(date +%Y%m%d).sql

# 备份 Prod 环境
docker exec together-mysql-prod mysqldump -uroot -proot123 together_prod > backup_prod_$(date +%Y%m%d).sql
```

### Redis 备份

```bash
# 备份 Dev 环境
docker exec together-redis-dev cat /data/dump.rdb > backup_redis_dev_$(date +%Y%m%d).rdb

# 备份 Staging 环境
docker exec together-redis-staging cat /data/dump.rdb > backup_redis_staging_$(date +%Y%m%d).rdb

# 备份 Prod 环境
docker exec together-redis-prod cat /data/dump.rdb > backup_redis_prod_$(date +%Y%m%d).rdb
```

## 相关文档

- [MySQL 详细连接信息](./mysql-credentials.md)
- [Redis 详细连接信息](./redis-credentials.md)
- [Jenkins 部署配置](../../Jenkinsfile)
- [数据库初始化脚本](../../scripts/init-database.sh)

## 技术支持

如有问题，请联系开发团队或查看以下资源:

- [MySQL 8.0 官方文档](https://dev.mysql.com/doc/refman/8.0/en/)
- [Redis 官方文档](https://redis.io/documentation)
- [Docker 官方文档](https://docs.docker.com/)

---

**文档版本**: v1.0  
**最后更新**: 2026-04-02  
**维护者**: 开发团队
