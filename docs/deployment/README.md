# Docker Compose 多环境部署 - 快速开始

## 🚀 5 分钟快速部署

### 前置条件

- ✅ Docker 和 Docker Compose 已安装
- ✅ Git 已安装
- ✅ 代码已克隆到本地

### 快速启动

```bash
# 1. 进入项目目录
cd server-nest

# 2. 启动开发环境
./deploy.sh dev start

# 3. 查看服务状态
./deploy.sh dev ps

# 4. 访问 API
curl http://localhost:8118/api/v1
```

就这么简单！🎉

---

## 📋 部署方案概览

### 架构图

```
┌─────────────────────────────────────────────────────────────┐
│                Docker Compose 网络 (app-network)             │
│                                                               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │  MySQL   │  │  Redis   │  │  RustFS  │  │   App    │   │
│  │  :3306   │  │  :6379   │  │  :8080   │  │  :8118   │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘   │
│       │             │              │             │          │
│       └─────────────┴──────────────┴─────────────┘          │
│                                                               │
└─────────────────────────────────────────────────────────────┘
                           │
                    宿主机端口映射
                           │
                  ┌────────▼────────┐
                  │  Dev: 8118      │
                  │  Staging: 8119  │
                  │  Prod: 8120     │
                  └─────────────────┘
```

### 核心特性

- ✅ **完全容器化**: 所有服务运行在 Docker 容器中
- ✅ **多环境隔离**: Dev/Staging/Prod 独立运行
- ✅ **服务编排**: 自动管理服务依赖和启动顺序
- ✅ **数据持久化**: 使用 Docker Volumes 持久化数据
- ✅ **健康检查**: 自动检测服务健康状态
- ✅ **一键部署**: 通过脚本或 Jenkins 自动化部署

---

## 📁 文件结构

```
server-nest/
├── Dockerfile                    # 应用镜像构建文件
├── docker-compose.yml            # Docker Compose 配置
├── Jenkinsfile.docker            # Jenkins 部署流水线
├── deploy.sh                     # 本地部署脚本 ⭐
├── .env.dev                      # 开发环境配置
├── .env.staging                  # 预发布环境配置
├── .env.prod                     # 生产环境配置
└── .dockerignore                 # Docker 忽略文件
```

---

## 🎯 部署方式

### 方式 1: 本地部署（开发测试）

#### 使用部署脚本（推荐）

```bash
# 启动服务
./deploy.sh dev start        # 开发环境
./deploy.sh staging start    # 预发布环境
./deploy.sh prod start       # 生产环境

# 查看日志
./deploy.sh dev logs

# 查看状态
./deploy.sh dev ps

# 停止服务
./deploy.sh dev stop

# 重启服务
./deploy.sh dev restart

# 重新构建镜像
./deploy.sh dev build
```

#### 手动部署

```bash
# 1. 加载环境配置
cp .env.dev .env

# 2. 启动服务
docker-compose up -d

# 3. 查看状态
docker-compose ps

# 4. 查看日志
docker-compose logs -f app

# 5. 停止服务
docker-compose down
```

---

### 方式 2: Jenkins 自动化部署（生产环境）

#### Jenkins Pipeline 参数

| 参数 | 选项 | 说明 |
|------|------|------|
| ENVIRONMENT | dev/staging/prod | 部署环境 |
| DEPLOY_MODE | docker-compose/pm2 | 部署模式 |
| BRANCH | main/develop/... | 部署分支 |
| REBUILD_IMAGE | true/false | 是否重新构建镜像 |
| CLEAR_CACHE | true/false | 是否清除 Redis 缓存 |

#### 部署流程

```
1. 清理工作空间
   ↓
2. 拉取代码
   ↓
3. 加载环境配置
   ↓
4. Docker Compose 部署
   ├─ 停止旧容器
   ├─ 构建镜像（可选）
   ├─ 启动服务
   └─ 健康检查
   ↓
5. 部署成功 ✅
```

#### Jenkins 配置步骤

1. **创建 Pipeline 任务**
2. **配置 Git 仓库**:
   - Repository URL: `https://github.com/wenlong201807/server-nest.git`
   - Script Path: `Jenkinsfile.docker`
3. **保存并构建**

---

## 🌍 多环境配置

### 环境对应关系

| 环境 | 应用端口 | MySQL 端口 | Redis 端口 | RustFS 端口 | 数据库名 |
|------|---------|-----------|-----------|------------|---------|
| **Dev** | 8118 | 3307 | 6383 | 8121 | together_dev |
| **Staging** | 8119 | 3308 | 6384 | 8122 | together_staging |
| **Prod** | 8120 | 3309 | 6382 | 8123 | together_prod |

### 环境配置文件

**.env.dev** (开发环境):
```env
ENV=dev
NODE_ENV=development
APP_PORT=8118
DB_PORT=3307
DB_DATABASE=together_dev
REDIS_PORT=6383
RUSTFS_PORT=8121
```

**.env.staging** (预发布环境):
```env
ENV=staging
NODE_ENV=staging
APP_PORT=8119
DB_PORT=3308
DB_DATABASE=together_staging
REDIS_PORT=6384
RUSTFS_PORT=8122
```

**.env.prod** (生产环境):
```env
ENV=prod
NODE_ENV=production
APP_PORT=8120
DB_PORT=3309
DB_DATABASE=together_prod
REDIS_PORT=6382
RUSTFS_PORT=8123
```

---

## 🔧 常用命令

### 部署脚本命令

```bash
# 启动服务
./deploy.sh <env> start

# 停止服务
./deploy.sh <env> stop

# 重启服务
./deploy.sh <env> restart

# 查看日志
./deploy.sh <env> logs

# 查看状态
./deploy.sh <env> ps

# 重新构建
./deploy.sh <env> build
```

### Docker Compose 命令

```bash
# 启动所有服务
docker-compose up -d

# 停止所有服务
docker-compose down

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f

# 重启服务
docker-compose restart

# 进入容器
docker-compose exec app sh
```

---

## 🔍 验证部署

### 1. 检查容器状态

```bash
docker-compose ps
```

**期望输出**:
```
NAME                    STATUS              PORTS
together-app-dev        Up (healthy)        0.0.0.0:8118->8118/tcp
together-mysql-dev      Up (healthy)        0.0.0.0:3307->3306/tcp
together-redis-dev      Up (healthy)        0.0.0.0:6383->6379/tcp
together-rustfs-dev     Up (healthy)        0.0.0.0:8121->8080/tcp
```

### 2. 测试 API

```bash
# 测试根路径
curl http://localhost:8118/api/v1

# 测试健康检查
curl http://localhost:8118/health
```

### 3. 查看日志

```bash
# 查看应用日志
docker-compose logs -f app

# 查看所有服务日志
docker-compose logs -f
```

---

## 🐛 故障排查

### 问题 1: 端口被占用

**错误**: `Bind for 0.0.0.0:8118 failed: port is already allocated`

**解决**:
```bash
# 查找占用端口的进程
lsof -i :8118

# 停止占用端口的容器
docker stop $(docker ps -q --filter "publish=8118")
```

### 问题 2: 容器启动失败

**错误**: `container exited with code 1`

**解决**:
```bash
# 查看详细日志
docker-compose logs app

# 检查环境变量
docker-compose config

# 重新构建镜像
docker-compose build --no-cache
```

### 问题 3: 健康检查失败

**错误**: `unhealthy`

**解决**:
```bash
# 查看健康检查日志
docker inspect together-app-dev | grep -A 10 Health

# 手动测试健康检查
curl http://localhost:8118/api/v1

# 进入容器排查
docker-compose exec app sh
```

---

## 📊 监控和日志

### 查看容器资源使用

```bash
docker stats
```

### 查看日志

```bash
# 实时查看日志
docker-compose logs -f app

# 查看最近 100 行日志
docker-compose logs --tail=100 app

# 查看特定时间段日志
docker-compose logs --since 2026-04-02T10:00:00 app
```

---

## 💾 数据备份

### 备份数据库

```bash
# 备份 MySQL
docker-compose exec -T mysql mysqldump -uroot -proot123 together_dev > backup_$(date +%Y%m%d).sql

# 备份 Redis
docker-compose exec redis redis-cli SAVE
docker cp together-redis-dev:/data/dump.rdb backup_redis_$(date +%Y%m%d).rdb
```

### 恢复数据库

```bash
# 恢复 MySQL
docker-compose exec -T mysql mysql -uroot -proot123 together_dev < backup_20260402.sql

# 恢复 Redis
docker cp backup_redis_20260402.rdb together-redis-dev:/data/dump.rdb
docker-compose restart redis
```

---

## 🔐 安全建议

### 生产环境配置

1. **修改默认密码**:
   ```env
   DB_PASSWORD=strong_password_here
   JWT_SECRET=random_secret_key_here
   ```

2. **限制网络访问**:
   ```yaml
   mysql:
     networks:
       - app-network
     # 不暴露端口到宿主机
   ```

3. **使用 HTTPS**:
   - 配置 Nginx 反向代理
   - 申请 SSL 证书

---

## 📚 相关文档

- [完整部署文档](./docker-compose-deployment.md)
- [MySQL 连接信息](../local-docker-mysql-redis/mysql-credentials.md)
- [Redis 连接信息](../local-docker-mysql-redis/redis-credentials.md)
- [为什么使用 host.docker.internal](../local-docker-mysql-redis/why-host-docker-internal.md)

---

## ❓ 常见问题

### Q1: Docker Compose 和 PM2 模式有什么区别？

**Docker Compose 模式**:
- ✅ 完全容器化，环境一致性好
- ✅ 服务间通过 Docker 网络通信
- ✅ 适合生产环境

**PM2 模式**:
- ✅ 启动快，无需构建镜像
- ✅ 适合开发环境快速测试
- ⚠️ 需要通过 host.docker.internal 访问服务

### Q2: 如何切换环境？

```bas止当前环境
./deploy.sh dev stop

# 启动新环境
./deploy.sh staging start
```

### Q3: 如何查看容器内部？

```bash
# 进入应用容器
docker-compose exec app sh

# 进入 MySQL 容器
docker-compose exec mysql bash

# 进入 Redis 容器
docker-compose exec redis sh
```

### Q4: 数据会丢失吗？

不会！数据存储在 Docker Volumes 中，容器删除后数据依然保留。

```bash
# 查看 Volumes
docker volume ls | grep together

# 查看 Volume 详情
docker volume inspect together-mysql-data-dev
```

---

## 🎉 总结

### 核心优势

1. **一键部署**: 通过脚本或 Jenkins 快速部署
2. **环境隔离**: Dev/Staging/Prod 完全隔离
3. **数据持久化**: 容器重启数据不丢失
4. **健康检查**: 自动检测服务状态
5. **易于维护**: 统一的容器化管理

### 下一步

- ✅ 本地测试 Docker Compose 部署
- ✅ 配置 Jenkins Pipeline
- ✅ 部署到 Staging 环境验证
- ✅ 部署到 Prod 环境

---

**文档版本**: v1.0  
**最后更新**: 2026-04-02  
**维护者**: 开发团队
