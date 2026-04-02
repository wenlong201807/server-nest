# MySQL 服务连接信息

## 概览

本地 Docker 环境中运行了 3 个 MySQL 8.0.42 实例，分别对应不同的部署环境。

## 连接信息

### 1. 开发环境 (Dev)

**容器名称**: `together-mysql-dev`

**连接参数**:
- **主机**: `127.0.0.1` 或 `localhost`
- **端口**: `3307`
- **用户名**: `root`
- **密码**: `root123`
- **数据库**: `together_dev`

**Navicat 连接配置**:
```
连接名: Together MySQL Dev
主机: 127.0.0.1
端口: 3307
用户名: root
密码: root123
```

**命令行测试**:
```bash
mysql -h127.0.0.1 -P3307 -uroot -proot123 -e "SELECT VERSION();"
```

**认证插件**:
- `root@%`: `mysql_native_password` ✅
- `root@172.23.0.1`: `mysql_native_password` ✅
- `root@localhost`: `caching_sha2_password`

---

### 2. 预发布环境 (Staging)

**容器名称**: `together-mysql-staging`

**连接参数**:
- **主机**: `127.0.0.1` 或 `localhost`
- **端口**: `3308`
- **用户名**: `root`
- **密码**: `root123`
- **数据库**: `together_staging`

**Navicat 连接配置**:
```
连接名: Together MySQL Staging
主机: 127.0.0.1
端口: 3308
用户名: root
密码: root123
```

**命令行测试**:
```bash
mysql -h127.0.0.1 -P3308 -uroot -proot123 -e "SELECT VERSION();"
```

**认证插件**:
- `root@%`: `caching_sha2_password`
- `root@localhost`: `caching_sha2_password`

---

### 3. 生产环境 (Prod)

**容器名称**: `together-mysql-prod`

**连接参数**:
- **主机**: `127.0.0.1` 或 `localhost`
- **端口**: `3309`
- **用户名**: `root`
- **密码**: `root123`
- **数据库**: `together_prod`

**Navicat 连接配置**:
```
连接名: Together MySQL Prod
主机: 127.0.0.1
端口: 3309
用户名: root
密码: root123
```

**命令行测试**:
```bash
mysql -h127.0.0.1 -P3309 -uroot -proot123 -e "SELECT VERSION();"
```

**认证插件**:
- `root@%`: `caching_sha2_password`
- `root@localhost`: `caching_sha2_password`

---

## 连接验证结果

### ✅ 所有环境连接测试通过

| 环境 | 端口 | 数据库 | 状态 | MySQL 版本 |
|------|------|--------|------|-----------|
| Dev | 3307 | together_dev | ✅ 正常 | 8.0.42 |
| Staging | 3308 | together_staging | ✅ 正常 | 8.0.42 |
| Prod | 3309 | together_prod | ✅ 正常 | 8.0.42 |

---

## Navicat 连接步骤

### 1. 打开 Navicat

### 2. 新建连接
- 点击左上角 "连接" → "MySQL"

### 3. 填写连接信息（以 Dev 为例）
```
连接名: Together MySQL Dev
主机: 127.0.0.1
端口: 3307
用户名: root
密码: root123
```

### 4. 测试连接
- 点击 "测试连接" 按钮
- 应该显示 "连接成功"

### 5. 保存并连接
- 点击 "确定" 保存连接
- 双击连接名即可连接到数据库

### 6. 查看数据库
- 展开连接，可以看到 `together_dev` 数据库
- 展开数据库，可以看到所有表

---

## 常见问题

### 1. 连接被拒绝 (Access Denied)

**问题**: `Access denied for user 'root'@'172.23.0.1' (using password: YES)`

**原因**: MySQL 8.0 默认使用 `caching_sha2_password` 认证插件，Node.js mysql2 驱动可能不兼容。

**解决方案**:
```bash
# 进入容器
docker exec -it together-mysql-dev bash

# 修改认证插件
mysql -uroot -proot123 -e "ALTER USER 'root'@'%' IDENTIFIED WITH mysql_native_password BY 'root123'; FLUSH PRIVILEGES;"
```

### 2. 端口被占用

**检查端口占用**:
ash
lsof -i :3307
lsof -i :3308
lsof -i :3309
```

### 3. 容器未启动

**检查容器状态**:
```bash
docker ps --filter "name=together-mysql"
```

**启动容器**:
```bash
docker start together-mysql-dev
docker start together-mysql-staging
docker start together-mysql-prod
```

---

## 安全建议

### ⚠️ 生产环境注意事项

1. **修改默认密码**: 生产环境不应使用 `root123` 这样的弱密码
2. **限制远程访问**: 生产环境应限制 root 用户的远程访问
3. **创建专用用户**: 应用程序应使用专用数据库用户，而非 root
4. **启用 SSL**: 生产环境应启用 SSL 加密连接

### 推荐配置（生产环境）

```sql
-- 创建专用用户
CREATE USER 'together_app'@'%' IDENTIFIED BY 'strong_password_here';

-- 授予权限
GRANT SELECT, INSERT, UPDATE, DELETE ON together_prod.* TO 'together_app'@'%';

-- 刷新权限
FLUSH PRIVILEGES;
```

---

## 数据库管理

### 备份数据库

```bash
# Dev 环境
docker exec together-mysql-dev mysqldump -uroot -proot123 together_dev > backup_dev.sql

# Staging 环境
docker exec together-mysql-staging mysqldump -uroot -proot123 together_staging > backup_staging.sql

# Prod 环境
docker exec together-mysql-prod mysqldump -uroot -proot123 together_prod > backup_prod.sql
```

### 恢复数据库

```bash
# Dev 环境
docker exec -i together-mysql-dev mysql -uroot -proot123 together_dev < backup_dev.sql

# Staging 环境
docker exec -i together-mysqlsql -uroot -proot123 together_staging < backup_staging.sql

# Prod 环境
docker exec -i together-mysql-prod mysql -uroot -proot123 together_prod < backup_prod.sql
```

---

## 相关文档

- [Redis 连接信息](./redis-credentials.md)
- [Jenkins 部署配置](../Jenkinsfile)
- [数据库初始化脚本](../../scripts/init-database.sh)

---

**文档版本**: v1.0  
**最后更新**: 2026-04-02  
**维护者**: 开发团队
