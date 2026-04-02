# Docker Compose 多环境部署方案

## 概览

本方案使用 Docker Compose 将 NestJS 应用、MySQL、Redis、RustFS 服务容器化，并通过 Jenkins 实现多环境自动化部署。

## 架构设计

### 1. 服务架构

```
┌─────────────────────────────────────────────────────────────┐
│                    Docker Compose 网络                       │
│                    (app-network)                             │
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │    MySQL     │  │    Redis     │  │   RustFS     │      │
│  │   :3306      │  │   :6379      │  │   :8080      │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                 │                  │               │
│         └─────────────────┼──────────────────┘               │
│                           │                                  │
│                  ┌────────▼────────┐                         │
│                  │   NestJS App    │                         │
│                  │   (PM2 Runtime) │                         │
│                  │   :8118         │                         │
│                  └─────────────────┘                         │
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

### 2. 多环境隔离

| 环境 | 应用端口 | MySQL 端口 | Redis 端口 | RustFS 端口 | 数据库名 |
|------|---------|-----------|-----------|------------|---------|
| Dev | 8118 | 3307 | 6383 | 8121 | together_dev |
| Staging | 8125 | 3308 | 6384 | 8122 | together_staging |
| Prod | 8120 | 3309 | 6382 | 8123 | together_prod |

---

## 文件结构

```
server-nest/
├── Dockerfile                    # 应用镜像构建文件
├── docker-compose.yml            # Docker Compose 配置
├── Jenkinsfile.docker            # Jenkins 部署流水线
├── deploy.sh                     # 本地部署脚本
├── .env.dev                      # 开发环境配置
├── .env.staging                  # 预发布环境配置
├── .env.prod                     # 生产环境配置
├── .dockerignore                 # Docker 忽略文件
└── docs/
    └── deployment/
        ├── docker-compose-guide.md
        └── jenkins-deployment.md
```

---

## 核心配置文件

### 1. Dockerfile

**多阶段构建**:
- **Stage 1 (base)**: 安装依赖 + 构建应用
- **Stage 2 (production)**: 只包含生产依赖 + 构建产物

**特点**:
- 使用 Node.js 20 Alpine 镜像（体积小）
- 使用 pnpm 管理依赖
- 使用 PM2 Runtime 运行应用
- 内置健康检查

### 2. docker-compose.yml

**服务定义**:
- **mysql**: MySQL 8.0，使用 mysql_native_password 认证
- **redis**: Redis 7 Alpine，启用 AOF 持久化
- **rustfs**: RustFS 文件存储服务
- **app**: NestJS 应用，依赖其他三个服务

**关键特性**:
- 使用 Docker 网络 (app-network) 连接服务
- 服务间通过服务名访问（如 `mysql`, `redis`）
- 健康检查确保服务就绪后再启动应用
- 数据持久化到 Docker Volumes

### 3. 环境配置文件

**.env.dev / .env.staging / .env.prod**:
- 定义环境特定的端口、数据库名等
- 通过 `ENV` 变量区分环境
- Jenkins 部署时自动加载对应配置

---

## 部署方式

### 方式 1: 本地部署（推荐用于开发测试）

#### 使用部署脚本

```bash
# 启动开发环境
./deploy.sh dev start

# 启动预发布环境
./deploy.sh staging start

# 启动生产环境
./deploy.sh prod start

# 健康检查（⭐ 推荐：启动后 30 秒运行）
./deploy.sh dev health

# 查看日志
./deploy.sh dev logs

# 查看容器状态
./deploy.sh dev ps

# 停止服务
./deploy.sh dev stop

# 重启服务
./deploy.sh dev restart

# 重新构建镜像
./deploy.sh dev build
```

**健康检查功能**:

`./deploy.sh <env> health` 会自动检查：
- 📦 容器状态
- 🗄️ MySQL 连接和数据库
- 💾 Redis 连接和 key 数量
- 📁 RustFS 端口可访问性
- 🚀 应用 API 和 Swagger
- 🏥 容器健康状态
- 📊 资源使用情况

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

### 方式 2: Jenkins 自动化部署（推荐用于生产）

#### Jenkins 流水线配置

**Pipeline 参数**:
- **ENVIRONMENT**: 选择部署环境 (dev/staging/prod)
- **DEPLOY_MODE**: 选择部署模式 (docker-compose/pm2)
- **BRANCH**: 选择部署分支 (默认 main)
- **REBUILD_IMAGE**: 是否重新构建镜像
- **CLEAR_CACHE**: 是否清除 Redis 缓存

#### 部署流程

```
1. 清理工作空间
   ↓
2. 拉取代码 (GitHub)
   ↓
3. 加载环境配置 (.env.dev/.env.staging/.env.prod)
   ↓
4. 选择部署模式
   ├─ Docker Compose 模式
   │  ├─ 停止旧容器
   │  ├─ 构建镜像 (可选)
   │  ├─ 启动服务
   │  ├─ 等待服务就绪
   │  └─ 健康检查
   │
   └─ PM2 模式
      ├─ 安装依赖
      ├─ 构建应用
      ├─ 检查依赖服务
      ├─ 停止旧服务
      ├─ 启动服务
      └─ 健康检查
   ↓
5. 清除缓存 (可选)
   ↓
6. 部署成功/失败通知
```

#### Jenkins 配置步骤

1. **创建 Pipeline 任务**:
   ```
   New Item → Pipeline → 命名为 "server-nest-docker-deploy"
   ```

2. **配置 Pipeline**:
   ```groovy
   Pipeline script from SCM
   SCM: Git
   Repository URL: https://github.com/wenlong201807/server-nest.git
   Credentials: github-credentials
   Branch: */main
   Script Path: Jenkinsfile.docker
   ```

3. **保存并构建**:
   - 点击 "Build with Parameters"
   - 选择环境和部署模式
   - 点击 "Build"

---

## Docker Compose 模式 vs PM2 模式

### Docker Compose 模式（推荐）

**优点**:
- ✅ 完全容器化，环境一致性好
- ✅ 服务间通过 Docker 网络通信，更安全\n- ✅ 支持服务编排和依赖管理
- ✅ 数据持久化到 Docker Volumes

**缺点**:
- ⚠️ 需要构建 Docker 镜像（首次较慢）
- ⚠️ 资源占用稍高

**适用场景**:
- 生产环境部署
- 需要完全隔离的环境
- 需要快速扩展和迁移

**服务访问方式**:
```javascript
// 应用内部通过服务名访问
DB_HOST=mysql          // 而不是 host.docker.internal
REDIS_HOST=redis       // 而不是 host.docker.internal
RUSTFS_URL=http://rustfs:8080
```

---

### PM2 模式

**优点**:
- ✅ 启动快，无需构建镜像
- ✅ 资源占用低
- ✅ 适合快速迭代开发

**缺点**:
- ⚠️ 应用运行在 Jenkins 容器内，不够隔离
- ⚠️ 需要通过 host.docker.internal 访问宿主机服务
- ⚠️ 环境一致性较差

**适用场景**:
- 开发环境快速测试
- 临时部署验证
- 资源受限的环境

**服务访问方式**:
```javascript
/host.docker.internal 访问宿主机服务
DB_HOST=host.docker.internal
REDIS_HOST=host.docker.internal
RUSTFS_URL=http://host.docker.internal:8121
```

---

## 网络通信

### Docker Compose 模式网络

```
┌─────────────────────────────────────────┐
│      Docker Network (app-network)       │
│                                         │
│  mysql:3306 ←─────┐                    │
│                    │                    │
│  redis:6379 ←──────┼─── app:8118       │
│                    │                    │
│  rustfs:8080 ←─────┘                    │
│                                         │
└────────────────────────────────┘
         │
    端口映射到宿主机
         │
    localhost:8118
```

**特点**:
- 服务间通过 Docker 内部网络通信
- 使用服务名作为主机名（DNS 解析）
- 不需要暴露内部端口到宿主机
- 只有应用端口映射到宿主机

---

### PM2 模式网络

```
┌─────────────────────────────────────────┐
│            宿主机 (macOS)               │
│                                         │
│  MySQL:3307 ←─────┐                    │
│  Redis:6383 ←─────┤                    │
│  RustFS:8121 ←────┤                    │
│                   │                    │
│  ┌────────────────┼──────────────┐    │
│  │ Jenkins 容器   │              │    │
│  │                │              │    │
│  │  app:8118 ─────┘              │    │
│  │  (通过 host.docker.internal)  │    │
│  └───────────────────────────────┘    │
│                                         │
└─────────────────────────────────────────┘
```

**特点**:
- 应用在 Jenkins 容器内
- 通过 host.docker.internal 访问宿主机服务
- 所有服务端口都暴露到宿主机

---

## 数据持久化

### Docker Volumes

```yaml
volumes:
  mysql-data:
    name: together-mysql-data-${ENV}
  redis-data:
    name: together-redis-data-${ENV}
  rustfs-data:
    name: together-rustfs-data-${ENV}
```

**特点**:
- 数据存储在 Docker 管理的 Volume 中
- 容器删除后数据不丢失
- 不同环境使用不同的 Volume（通过 ENV 变量区分）

### 查看和管理 Volumes

```bash
# 查看所有 Volumes
docker volume ls

# 查看特定 Volume 详情
docker volume inspect together-mysql-data-dev

# 备份 Volume
docker run --rm -v together-mysql-data-dev:/data -v $(pwd):/backup alpine tar czf /backup/mysql-dev-backup.tar.gz /data

# 恢复 Volume
docker run --rm -v together-mysql-data-dev:/data -v $(pwd):/backup alpine tar xzf /backup/mysql-dev-backup.tar.gz -C /

# 删除 Volume（危险操作！）
docker volume rm together-mysql-data-dev
```

---

## 健康检查

### 服务健康检查

**MySQL**:
```y
healthcheck:
  test: ["CMD", "mysqladmin", "ping", "-h", "localhost", "-u", "root", "-proot123"]
  interval: 10s
  timeout: 5s
  retries: 5
  start_period: 30s
```

**Redis**:
```yaml
healthcheck:
  test: ["CMD", "redis-cli", "ping"]
  interval: 10s
  timeout: 3s
  retries: 5
```

**RustFS**:
```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
  interval: 10s
  timeout: 3s
  retries: 5
```

**App**:
```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:8118/api/v1"]
  interval: 30s
  timeout: 3s
  retries: 3
  start_period: 40s
```

### 依赖管理

```yaml
app:
  depends_on:
    mysql:
      condition: service_healthy
    redis:
      condition: service_healthy
    rustfs:
      condition: service_healthy
```

**效果**: 应用只有在所有依赖服务健康后才会启动。

---

## 常用命令

### Docker Compose 命令

```bash
# 启动所有服务
docker-compose up -d

# 停止所有服务
docker-compose down

# 重启所有服务
docker-compose restart

# 查看服务状态
docker-compose ps

# 查看服务日志
docker-compose logs -f

# 查看特定服务日志
docker-compose logs -f app

# 进入容器
docker-compose exec app sh
docker-compose exec mysql bash

# 重新构建镜像
docker-compose build --no-cache

# 停止并删除所有容器、网络、镜像
docker-compose down --rmi all -``

### Docker 命令

```bash
# 查看运行中的容器
docker ps

# 查看所有容器（包括停止的）
docker ps -a

# 查看镜像
docker images

# 删除容器
docker rm -f together-app-dev

# 删除镜像
docker rmi server-nest:latest

# 查看容器日志
docker logs -f together-app-dev

# 进入容器
docker exec -it together-app-dev sh

# 查看容器资源使用
docker stats

# 清理未使用的资源
docker system prune -a
```

---

## 故障排查

### 1. 容器启动失败

**查看容器状态**:
```bash
docker-compose ps
```

**查看容器日志**:
```bash
docker-compose logs app
```

**常见原因**:
- 端口被占用
- 依赖服务未就绪
- 环境变量配置错误
- 镜像构建失败

### 2. 应用无法连接数据库

**检查网络连接**:
```bash
# 进入应用容器
docker-compose exec app sh

# 测试 MySQL 连接
nc -zv mysql 3306

# 测试 Redis 连接
nc -zv redis 6379
```

**检查环境变量**:
```bash
docker-compose exec app env | grep DB_
```

### 3. 健康检查失败

**查看健康检查日志**:
```bash
docker inspect together-app-dev | grep -A 10 Health
```

**手动测试健康检查**:
```bash
curl http://localhost:8118/api/v1
```

### 4. 数据丢失

**检查 Volume**:
```bash
docker volume ls | grep together
docker volume inspect together-mysql-data-dev
```

**恢复数据**:
`份恢复
docker run --rm -v together-mysql-data-dev:/data -v $(pwd):/backup alpine tar xzf /backup/mysql-dev-backup.tar.gz -C /
```

---

## 性能优化

### 1. 镜像优化

**使用 Alpine 基础镜像**:
```dockerfile
FROM node:20-alpine
```

**多阶段构建**:
```dockerfile
FROM node:20-alpine AS base
# 构建阶段

FROM node:20-alpine AS production
# 生产阶段（只包含必要文件）
```

**减小镜像体积**:
```dockerfile
# 只安装生产依赖
RUN pnpm install --prod --frozen-lockfile

# 清理缓存
RUN pnpm store prune
```

### 2. 容器资源限制

```yaml
app:
  deploy:
    resources:
      limits:
        cpus: '1.0'
        memory: 1G
      reservations:
        cpus: '0.5'
        memory: 512M
```

### 3. 网络优化

**使用自定义网络**:
```yaml
networks:
  app-network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.25.0.0/16
```

---

## 安全建议

### 1. 生产环境配置

**修改默认密码**:
```env
DB_PASSWORD=strong_password_here
REDIS_PASSWORD=strong_password_here
JWT_SECRET=random_secret_key_here
```

**限制网络访问**:
```yaml
mysql:
  networks:
    - app-network
  # 不暴露端口到宿主机
  # ports:
  #   - "3307:3306"
```

**使用 secrets 管理敏感信息**:
```yaml
secrets:
  db_password:
    file: ./secrets/db_password.txt

services:
  app:
    secrets:
      - db_password
```

### 2. 镜像安全

**使用官方镜像**:
```yaml
mysql:
  image: mysql:8.0  # 官方镜像
```

**定期更新镜像**:
```bash
docker-compose pull
docker-compose up -d
```

**扫描镜像漏洞**:
```bash
docker scan server-nest:latest
```

---

## 监控和日志

### 1. 日志管理

**配置日志驱动**:
```yaml
app:
  logging:
    driver: "json-file"
    options:
      max-size: "10m"
      max-file: "3"
```

**查看日志**:
```bash
# 实时查看日志
docker-compose logs -f app

# 查看最近 100 行日志
docker-compose logs --tail=100 app

# 查看特定时间段日志
docker-compose logs --since 2026-04-02T10:00:00 app
``2. 监控

**使用 Docker Stats**:
```bash
docker stats together-app-dev
```

**集成 Prometheus + Grafana**:
```yaml
prometheus:
  image: prom/prometheus
  volumes:
    - ./prometheus.yml:/etc/prometheus/prometheus.yml

grafana:
  image: grafana/grafana
  ports:
    - "3000:3000"
```

---

## 备份和恢复

### 1. 数据库备份

**自动备份脚本**:
```bash
#!/bin/bash
# backup.sh

ENV=${1:-dev}
DATE=$(date +%Y%m%d_%H%M%S)

# 备份 MySQL
docker-compose exec -T mysql mysqldump -uroot -proot123 together_${ENV} > backup_mysql_${ENV}_${DATE}.sql

# 备份 Redis
docker-compose exec -T redis redis-cli SAVE
docker cp together-redis-${ENV}:/data/dump.rdb backup_redis_${ENV}_${DATE}.rdb

echo "✅ 备份完成: backup_*_${ENV}_${DATE}.*"
```

### 2. 数据恢复

```bash
#!/bin/bash
# restore.sh

ENV=${1:-dev}
BACKUP_FILE=$2

# 恢复 MySQL
docker-compose exec -T mysql mysql -uroot -proot123 together_${ENV} < ${BACKUP_FILE}

echo "✅ 恢复完成"
```

---

## 迁移指南

### 从 PM2 模式迁移到 Docker Compose 模式

**步骤**:

1. **备份数据**:
   ```bash
   # 备份 MySQL
   docker exec together-mysql-dev mysqldump -uroot -proot123 together_dev > backup.sql
   
   # 备份 Redis
   docker exec together-redis-dev redis-cli SAVE
   docker cp together-redis-dev:/data/dump.rdb backup.rdb
   ```

2. **停止 PM2 服务**:
   ```bash
   pm2 delete server-nest-dev
   ```

3. **启动 Docker Compose**:
   ```bash
   ./deploy.sh dev start
   ```

4. **恢复数据**:
   ```bash
   # 恢复 MySQL
   docker-compose exec -T mysql mysql -uroot -proot123 together_dev < backup.sql
   
   # 恢复 Redis
   docker cp backup.rdb together-redis-dev:/data/dump.rdb
   docker-compose restart redis
   ```

5. **验证服务**:
   ```bash
   curl http://localhost:8118/api/v1
   ```

---

## 常见问题

### 1. 端口冲突

**错误**: `Bind for 0.0.0.0:8118 failed: port is already allocated`

**解决**:
```bash
# 查找占用端口的进程
lsof -i :8118

# 停止占用端口的容器
docker stop $(doq --filter "publish=8118")

# 或修改 .env 文件中的端口
APP_PORT=8119
```

### 2. 镜像构建失败

**错误**: `failed to solve with frontend dockerfile.v0`

**解决**:
```bash
# 清理 Docker 缓存
docker builder prune -a

# 重新构建
docker-compose build --no-cache
```

### 3. 容器无法启动

**错误**: `container exited with code 1`

**解决**:
```bash
# 查看详细日志
docker-compose logs app

# 检查环境变量
docker-compose config

# 检查健康检查
docker inspect together-app-dev | grep -A 10 Health
```

---

## 最佳实践

### 1. 开发流程

```bash
# 1. 本地开发（不使用 Docker）
pnpm run start:dev

# 2. 本地测试（使用 Docker Compose）
./deploy.sh dev start

# 3. 提交代码
git add .
git commit -m "feat: add new feature"
git push origin main

# 4. Jenkins 自动部署到 Staging
# (Jenkins 自动触发)

# 5. 验证 Staging 环境
curl http://localhost:8119/api/v1

# 6. 手动部署到 Prod
# (Jenkins 手动触发)
```

### 2. 环境管理

- **Dev**: 开发环境，频繁更新，数据可随时清空
- **Staging**: 预发布环境，模拟生产环境，数据定期同步生产
- **Prod**: 生产环境，稳定版本，数据严格保护

### 3. 版本管理

**使用 Git Tag**:
```bash
# 创建版本标签
git tag -a v1.0.0 -m "Release version 1.0.0"
git push origin v1.0.0

# Jenkins 部署特定版本
# BRANCH 参数填写: v1.0.0
```

**使用 Docker 镜像标签**:
```bash
# 构建带版本号的镜像
docker build -t server-nest:v1.0.0 .

# 推送到镜像仓库
docker tag server-nest:v1.0.0.example.com/server-nest:v1.0.0
docker push registry.example.com/server-nest:v1.0.0
```

---

## 相关文档

- [MySQL 连接信息](../local-docker-mysql-redis/mysql-credentials.md)
- [Redis 连接信息](../local-docker-mysql-redis/redis-credentials.md)
- [为什么使用 host.docker.internal](../local-docker-mysql-redis/why-host-docker-internal.md)
- [Jenkins 原始配置](../../Jenkinsfile)

---

## 总结

### 方案优势

1. **完全容器化**: 所有服务运行在 Docker 容器中，环境一致性好
2. **多环境隔离**: 通过环境变量和 Docker Volumes 实现环境隔离
3. **自动化部署**: Jenkins 流水线自动化部署，支持多种部署模式
4. **易于扩展**: 可轻松添加新服务（如 Nginx、Elasticsearch 等）
5. **数据持久化**: 使用 Docker Volumes 持久化数据，容器重启不丢失
6. **健康检查**: 自动检测服务健康状态，确保服务可用
7. **灵活部署**: 支持 Docker Compose 和 PM2 两种部署模式

### 适用场景

- ✅ 中小型项目的生产环境部署
- ✅ 需要快速搭建多环境的场景
- ✅ 团队协作开发，需要环境一致性
- ✅ 需要快速迁移和扩展的项目

### 下一步

1. **集成 CI/CD**: 配置 GitHub Actions 或 GitLab CI
2. **添加监控**: 集成 Prometheus + Grafana
3. **日志聚合**: 使用 ELK Stack 或 Loki
4. **服务网格**: 迁移到 Kubernetes + Istio
5. **自动扩缩容**: 配置 HPA (Horizontal Pod Autoscaler)

---

**文档版本**: v1.0  
**最后更新**: 2026-04-02  
**维护者**: 开发团队
