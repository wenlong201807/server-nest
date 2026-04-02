# 部署方案更新日志

## v1.1.0 - 2026-04-02

### ✨ 新增功能

#### 1. 集成健康检查到部署脚本

**新增命令**:
```bash
./deploy.sh <env> health
```

**功能说明**:
- 📦 检查所有容器运行状态
- 🗄️ 验证 MySQL 连接、数据库和表数量
- 💾 验证 Redis 连接和 key 数量
- 📁 检查 RustFS 端口可访问性
- 🚀 测试应用 API 端点和 Swagger 文档
- 🏥 显示容器健康检查状态
- 📊 展示容器资源使用情况（CPU、内存）

**使用示例**:
```bash
# 启动服务
./deploy.sh staging start

# 等待 30 秒后运行健康检查
./deploy.sh staging health
```

**输出示例**:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  🏥 健康检查 - staging 环境
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ MySQL 运行正常
✅ 数据库 together_staging 存在
✅ 数据库包含 17 张表
✅ Redis 运行正常
✅ API 根路径可访问
✅ Swagger 文档可访问
✅ MySQL 容器健康
✅ Redis 容器健康
✅ App 容器健康
```

### 🔧 修复问题

#### 1. 端口映射配置错误

**问题**: 应用监听端口与容器端口映射不一致

**修复前**:
```yaml
# docker-compose.yml
ports:
  - "${APP_PORT:-8118}:8118"  # 错误：固定映射到 8118
```

**修复后**:
```yaml
# docker-compose.yml
ports:
  - "${APP_PORT:-8118}:${APP_PORT:-8118}"  # 正确：动态映射
```

**影响**: 
- Staging 环境端口从 8119 改为 8125（避免与 nginx-vue-deploy 冲突）
- 健康检查现在可以正确检测应用状态

#### 2. 健康检查端口硬编码

**问题**: Dockerfile 中健康检查使用固定端口 8118

**修复前**:
```dockerfile
HEALTHCHECK ... CMD node -e "require('http').get('http://localhost:8118/api/v1', ...)"
```

**修复后**:
```dockerfile
HEALTHCHECK ... CMD node -e "const port = process.env.PORT || 8118; require('http').get('http://localhost:' + port + '/api/v1', ...)"
```

**影响**: 健康检查现在使用环境变量 PORT，支持多环境部署

#### 3. Docker 镜像构建网络问题

**问题**: 容器内无法访问 npm registry

**解决方案**: 
- 在宿主机上预先构建（pnpm install + pnpm build）
- Dockerfile 直接复制 node_modules 和 dist
- 避免在容器内安装依赖

**优势**:
- ✅ 避免网络超时问题
- ✅ 构建速度更快（利用宿主机缓存）
- ✅ 镜像体积更小

### 📝 文档更新

#### 1. 快速开始指南更新

**文件**: `docs/deployment/README.md`

**更新内容**:
- 添加健康检查命令说明
- 更新快速启动步骤（包含健康检查）
- 添加健康检查详细说明和示例输出
- 更新验证部署章节（推荐使用健康检查）

#### 2. 完整部署文档更新

**文件**: `docs/deployment/docker-compose-deployment.md`

**更新内容**:
- 更新 Staging 环境端口为 8125
- 添加健康检查功能说明
- 更新部署脚本使用示例

### 🎯 部署命令总览

```bash
./deploy.sh <env> start    # 启动服务
./deploy.sh <env> stop     # 停止服务
./deploy.sh <env> restart  # 重启服务
./deploy.sh <env> logs     # 查看日志
./deploy.sh <env> ps       # 查看容器状态
./deploy.sh <env> build    # 构建镜像
./deploy.sh <env> health   # 健康检查 ⭐ 新增
```

### 📊 环境端口配n
| 环境 | 应用端口 | MySQL 端口 | Redis 端口 | RustFS 端口 |
|------|---------|-----------|-----------|------------|
| Dev | 8118 | 3307 | 6383 | 8121 |
| Staging | 8125 ⭐ | 3308 | 6384 | 8122 |
| Prod | 8120 | 3309 | 6382 | 8123 |

**注**: Staging 端口从 8119 改为 8125，避免与其他服务冲突

---

## v1.0.0 - 2026-04-02

### 🎉 初始版本

- ✅ Docker Compose 多环境部署方案
- ✅ 支持 Dev/Staging/Prod 三个环境
- ✅ MySQL、Redis 容器化
- ✅ 应用容器化（Node.js + NestJS）
- ✅ 数据持久化（Docker Volumes）
- ✅ 健康检查（容器级别）
- ✅ 部署脚本（deploy.sh）
- ✅ Jenkins 自动化部署支持
- ✅ 完整文档

---

**维护者**: 开发团队  
**最后更新**: 2026-04-02
