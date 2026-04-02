# Jenkins Docker 部署指南

## 概览

本文档介绍如何使用 Jenkins 和 `Jenkinsfile.docker` 部署 server-nest 项目。支持两种部署模式：
- **Docker Compose 模式**：使用 Docker 容器部署（推荐）
- **PM2 模式**：使用 PM2 进程管理器部署

---

## 前置条件

### 1. Jenkins 环境要求

- Jenkins 版本：2.x 或更高
- 已安装插件：
  - Git Plugin
  - Pipeline Plugin
  - NodeJS Plugin
  - Docker Pipeline Plugin（Docker Compose 模式需要）

### 2. Jenkins 节点要求

- **Docker Compose 模式**：
  - Docker 已安装并运行
  - Docker Compose 已安装
  - Jenkins 用户有 Docker 权限

- **PM2 模式**：
  - Node.js 24+ 已安装
  - pnpm 已安装（或自动安装）
  - PM2 已安装（或自动安装）

### 3. 依赖服务

确保以下服务已在宿主机上运行：

| 服务 | Dev 端口 | Staging 端口 | Prod 端口 |
|------|---------|-------------|-----------|
| MySQL | 3307 | 3308 | 3309 |
| Redis | 6383 | 6384 | 6382 |
| RustFS | 8121 | 8122 | 8123 |

---

## 操作步骤

### 步骤 1：配置 Jenkins

#### 1.1 配置 NodeJS

1. 进入 Jenkins 管理页面：`Manage Jenkins` → `Global Tool Configuration`
2. 找到 `NodeJS` 部分，点击 `Add NodeJS`
3. 配置：
   - Name: `NodeJS-24`
   - Version: 选择 Node.js 24.x
   - 勾选 `Install automatically`
4. 点击 `Save`

#### 1.2 配置 Git 凭证

1. 进入 `Manage Jenkins` → `Manage Credentials`
2. 选择合适的域（如 `Global`）
3. 点击 `Add Credentials`
4. 配置：
   - Kind: `Username with password` 或 `SSH Username with private key`
   - ID: `github-credentials`
   - Username: 你的 GitHub 用户名
   - Password/Private Key: 你的 GitHub 密码或私钥
5. 点击 `OK`

### 步骤 2：创建 Jenkins Pipeline 任务

#### 2.1 创建新任务

1. 在 Jenkins 首页点击 `New Item`
2. 输入任务名称：`server-nest-docker`
3. 选择 `Pipeline`
4. 点击 `OK`

#### 2.2 配置 Pipeline

1. 在任务配置页面，找到 `Pipeline` 部分
2. 选择 `Pipeline script from SCM`
3. 配置：
   - SCM: `Git`
   - Repository URL: `https://github.com/wenlong201807/server-nest.git`
   - Credentials: 选择 `github-credentials`
   - Branch Specifier: `*/main`（或其他分支）
   - Script Path: `Jenkinsfile.docker`
4. 点击 `Save`

### 步骤 3：准备环境配置文件

确保项目根目录下有以下环境配置文件：

```bash
.env.dev       # Dev 环境配置
.env.staging   # Staging 环境配置
.env.prod      # Prod 环境配置
```

**示例配置文件** (`.env.staging`):

```bash
# 环境标识
ENV=staging
NODE_ENV=staging

# 应用端口
APP_PORT=8125

# MySQL 配置
DB_HOST=localhost
DB_PORT=3308
DB_USERNAME=root
DB_PASSWORD=root123
DB_DATABASE=together_staging

# Redis 配置
REDIS_HOST=localhost
REDIS_PORT=6384
REDIS_PASSWORD=

# RustFS 配置
RUSTFS_PORT=8122

# JWT 配置
JWT_SECRET=staging-secret-key-PLEASE-CHANGE-THIS
JWT_EXPIRES_IN=7d
```

### 步骤 4：执行部署

#### 4.1 启动构建

1. 进入 `server-nester` 任务页面
2. 点击 `Build with Parameters`
3. 配置构建参数：

| 参数 | 说明 | 可选值 | 推荐值 |
|------|------|--------|--------|
| ENVIRONMENT | 部署环境 | dev / staging / prod | staging |
| DEPLOY_MODE | 部署模式 | docker-compose / pm2 | docker-compose |
| BRANCH | 部署分支 | 任意分支名 | main |
| REBUILD_IMAGE | 是否重新构建镜像 | true / false | false |
| CLEAR_CACHE | 是否清除 Redis 缓存 | true / false | false |

4. 点击 `Build` 开始部署

#### 4.2 查看构建日志

1. 点击构建编号（如 `#1`）
2. 点击 `Console Output` 查看实时日志
3. 等待部署完成

---

## 部署流程说明

### Docker Compose 模式流程

```
1. 清理工作空间
   ↓
2. 拉取代码
   ↓
3. 加载环境配置 (.env.{ENVIRONMENT})
   ↓
4. 停止旧容器 (docker-compose down)
   ↓
5. 构建镜像 (如果 REBUILD_IMAGE=true)
   ↓
6. 启动服务 (docker-compose up -d)
   ↓
7. 等待服务就绪 (10秒)
   ↓
8. 健康检查 (curl API 端点)
   ↓
9. 清除缓存 (如果 CLEAR_CACHE=true)
   ↓
10. 部署完成
```

### PM2 模式流程

```
1. 清理工作空间
   ↓
2. 拉取代码
   ↓
3. 加载环境配置
   ↓
4. 安装依赖 (pnpm install)
   ↓
5. 构建项目 (pnpm run build)
   ↓
6. 检查依赖服务 (MySQL/Redis/RustFS)
   ↓
7. 停止旧服务 (pm2 delete)
   ↓
8. 启动服务 (pm2 start)
   ↓
9. 健康检查 (curl API 端点)
   ↓
10. 清除缓存 (如果 CLEAR_CACHE=true)
   ↓
11. 部署完成
```

---

## 验证部署

### 1. 检查服务状态

**Docker Compose 模式**:
```bash
# 在 Jenkins 节点上执行
docker-compose ps

# 查看日志
docker-compose logs -f app
```

**PM2 模式**:
```bash
# 在 Jenkins 节点上执行
pm2 list

# 查看日志
pm2 logs server-nest-staging
```

### 2. 测试 API 访问

```bash
# Staging 环境
curl http://localhost:8125/api/v1

# 访问 Swagger 文档
curl http://localhost:8125/api/docs
```

### 3. 检查健康状态

**Docker Compose 模式**:
```bash
# 在项目目录执行
./deploy.sh staging health
```

---

## 常见问题

### 1. Docker 权限问题

**问题**: `permission denied while trying to connect to the Docker daemon socket`

**解决方案**:
```bash
# 将 Jenkins 用户添加到 docker 组
sudo usermod -aG docker j
# 重启 Jenkins
sudo systemctl restart jenkins
```

### 2. 端口冲突

**问题**: `port is already allocated`

**解决方案**:
```bash
# 检查端口占用
lsof -i :8125

# 停止占用端口的服务
docker-compose down
# 或
pm2 delete server-nest-staging
```

### 3. 依赖服务不可用

**问题**: `❌ MySQL 不可用` 或 `❌ Redis 不可用`

**解决方案**:
```bash
# 检查 MySQL 是否运行
docker ps | grep mysql

# 检查 Redis 是否运行
docker ps | grep redis

# 启动依赖服务
docker-compose -f docker-compose-deps.yml up -d
```

### 4. 健康检查失败

**问题**: `❌ 服务健康检查失败`

**解决方案**:
```bash
# 查看应用日志
docker-compose logs app --tail 100
# 或
pm2 logs server-nest-staging --lines 100

# 检查环境变量配置
cat .env.staging

# 检查数据库连接
mysql -h 127.0.0.1 -P 3308 -u root -proot123
```

### 5. 镜像构建失败

**问题**: Docker 镜像构建失败

**解决方案**:
```bash
# 清理 Docker 缓存
docker system prune -a

# 重新构建镜像
docker-compose build --no-cache
```

---

## 高级配置

### 1. 自定义 Docker Compose 文件

如果需要修改 Docker Compose 配置，编辑 `docker-compose.yml`:

```yaml
services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "${APP_PORT}:${APP_PORT}"
    environment:
      - NODE_ENV=${NODE_ENV}
      - _PORT}
    depends_on:
      mysql:
        condition: service_healthy
      redis:
        condition: service_healthy
```

### 2. 配置环境变量

在 Jenkins Pipeline 中添加额外的环境变量：

```groovy
environment {
    PROJECT_NAME = 'server-nest'
    DEPLOY_ENV = "${params.ENVIRONMENT}"
    CUSTOM_VAR = 'custom_value'
}
```

### 3. 添加部署通知

在 `Jenkinsfile.docker` 的 `post` 部分添加通知：

```groovy
post {
    success {
        // 发送成功通知（邮件、Slack 等）
        emailext (
            subject: "部署成功: ${PROJECT_NAME} - ${params.ENVIRONMENT}",
            body: "部署已成功完成",
            to: "team@example.com"
        )
    }
    failure {
        // 发送失败通知
        emailext (
            subject: "部署失败: ${PROJECT_NAME} - ${params.ENVIRONMENT}",
            body: "部署失败，请检查日志",
            to: "team@example.com"
        )
    }
}
```

---

## 部署最佳实践

### 1. 分支策略

- **dev 环境**: 部署 `develop` 分支
- **staging 环境**: 部署 `main` 或 `release` 分支
- **prod 环境**: 部署 `main` 分支的稳定版本或 tag

### 2. 镜像管理

- 首次部署时设置 `REBUILD_IMAGE=true`
- 代码变更后设置 `REBUILD_IMAGE=true`
- 配置变更时可以设置 `REBUILD_IMAGE=false`

### 3. 缓存管理

- 部署新功能时设置 `CLEAR_CACHE=true`
- 修复 bug 时根据情况决定是否清除缓存
- 配置变更时建议清除缓存

### 4. 回滚策略

如果部署失败需要回滚：

```bash
# Docker Compose 模式
git checkout <previous-commit>
docker-compose down
docker-compose up -d

# PM2 模式
pm2 delete server-nest-staging
git checkout <previous-commit>
pnpm install
pnpm run build
pm2 start dist/main.js --name server-nest-staging
```

---

## 监控和日志

### 1. 实时日志

**Docker Compose**:
```bash
docker-compose logs -f app
```

**PM2**:
```bash
pm2 logs server-nest-staging
```

### 2. 日志文件位置

**Docker Compose**:
- 容器日志：`docker logs together-app-staging`

**PM2**:
- 输出日志：`~/.pm2/logs/server-nest-staging-out.log`
- 错误日志：`~/.pm2/logs/server-nest-staging-error.log`

### 3. 性能监控

**PM2**:
```bash
# 查看进程监控
pm2 monit

# 查看进程详情
pm2 show server-nest-staging
```

---

## 相关文档

- [Docker Compose 部署指南](./docker-compose-deployment.md)
- [部署脚本使用说明](./README.md)
- [健康检查说明](./README.md#验证部署)
- [环境配置说明](../README.md)

---

**文档版本**: v1.0  
**最后更新**: 2026-04-02  
**维护者**: 开发团队
