# Jenkins 部署 NestJS 项目操作手册

## 目录
- [1. 删除旧服务](#1-删除旧服务)
- [2. 清理工作空间](#2-清理工作空间)
- [3. 创建新流水线](#3-创建新流水线)
- [4. 首次构建](#4-首次构建)
- [5. 监控与验证](#5-监控与验证)
- [6. 常见问题](#6-常见问题)

---

## 1. 删除旧服务

### 1.1 停止并删除 PM2 服务

SSH 登录到 Jenkins 服务器，执行以下命令：

```bash
# 查看当前运行的服务
pm2 list

# 停止所有 server-nest 相关服务
pm2 delete server-nest-dev
pm2 delete server-nest-staging
pm2 delete server-nest-prod

# 或者一次性删除所有服务
pm2 delete all

# 保存 PM2 配置
pm2 save

# 验证已删除
pm2 list
```

**预期结果**：
```
┌─────┬──────┬─────────┬─────────┬─────────┬──────────┐
│ id  │ name │ status  │ restart │ uptime  │ cpu      │
└─────┴──────┴─────────┴─────────┴─────────┴──────────┘
```

---

## 2. 清理工作空间

### 2.1 清理 Jenkins 工作目录

```bash
# 进入 Jenkins 工作目录
cd /var/jenkins_home/workspace/server-nest

# 清理构建产物和依赖
rm -rf node_modules dist pnpm-lock.yaml

# 查看剩余文件
ls -la
```

### 2.2 完全删除工作空间（可选）

如果需要完全重新开始：

```bash
# 删除整个工作空间
cd /var/jenkins_home/workspace
rm -rf server-nest

# Jenkins 会在下次构建时自动重新创建
```

---

## 3. 创建新流水线

### 3.1 删除旧的 Jenkins Job（可选）

1. 打开 Jenkins 首页：`http://your-jenkins-url`
2. 找到 `server-nest` 项目
3. 点击项目名称进入详情页
4. 左侧菜单点击 **"删除项目"** (Delete Project)
5. 确认删除

### 3.2 创建新任务

1. Jenkins 首页点击 **"新建任务"** (New Item)
2. 输入任务名称：`server-nest`
3. 选择 **"流水线"** (Pipeline)
4. 点击 **"确定"**

### 3.3 配置流水线参数

在配置页面的 **General** 部分：

#### ✅ 勾选 "参数化构建过程"

添加以下参数：

**参数 1：环境选择**
- 类型：Choice Parameter
- 名称：`ENVIRONMENT`
- 选项：
  ```
  dev
  staging
  prod
  ```
- 描述：`选择部署环境`

**参数 2：分支选择**
- 类型：String Parameter
- 名称：`BRANCH`
- 默认值：`test5`
- 描述：`选择部署分支`

**参数 3：清除缓存**
- 类型：Boolean Parameter
- 名称：`CLEAR_CACHE`
- 默认值：`false`
- 描述：`是否强制清除缓存（Redis）`

### 3.4 配置 Pipeline

在 **Pipeline** 部分：

| 配置项 | 值 |
|--------|-----|
| Definition | Pipeline script from SCM |
| SCM | Git |
| Repository URL | `https://github.com/wenlong201807/server-nest.git` |
| Credentials | 选择你的 GitHub 凭据 |
| Branch Specifier | `*/${BRANCH}` |
| Script Path | `Jenkinsfile` |

### 3.5 保存配置

点击页面底部的 **"保存"** 按钮。

---

## 4. 首次构建

### 4.1 启动构建

1. 进入 `server-nest` 项目页面
2. 点击左侧菜单 **"Build with Parameters"**
3. 配置构建参数：
   - **ENVIRONMENT**: `staging`
   - **BRANCH**: `test5`
   - **CLEAR_CACHE**: ✅ `true` (首次构建建议勾选)
4. 点击 **"开始构建"** (Build)

### 4.2 查看构建进度

- 左下角 **"Build History"** 会显示构建任务
- 点击构建编号（如 `#1`）进入详情
- 点击 **"Console Output"** 查看实时日志

### 4.3 构建阶段说明

Jenkins 会依次执行以下阶段：

```
1. 清理工作空间
2. 拉取代码
3. 安装依赖
   - 安装 pnpm、pm2
   - 清理 node_modules
   - 移除 bcrypt 依赖
   - 重新安装依赖
4. 构建项目
   - pnpm run build
5. 检查依赖服务
   - MySQL
   - Redis
   - RustFS
6. 数据库初始化
7. 停止旧服务
8. 清除缓存（如果勾选）
9. 启动服务
10. 健康检查
```

---

## 5. 监控与验证

### 5.1 实时监控构建

在 Jenkins 服务器上执行：

```bash
# 查看 PM2 服务状态
pm2 list

# 实时查看服务日志
pm2 logs server-nest-staging --lines 50

# 只看错误日志
pm2 logs server-nest-staging --err --lines 50

# 停止查看日志（Ctrl+C）
```

### 5.2 验证服务运行

```bash
# 检查服务端口
netstat -tlnp | grep 8119

# 测试健康检查接口
curl http://localhost:8119/api/v1/health

# 测试 Swagger 文档
curl -I http://localhost:8119/api/docs

# 测试登录接口
curl -X POST http://localhost:8119/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"mobile":"13800138000","password":"password123"}'
```

### 5.3 查看服务详情

```bash
# 查看服务详细信息
pm2 show server-nest-staging

# 查看服务监控
pm2 monit

# 查看服务资源占用
pm2 status
```

---

## 6. 常见问题

### 6.1 构建失败：bcrypt 错误

**错误信息**：
```
Error: Cannot find module 'bcrypt/lib/binding/napi-v3/bcrypt_lib.node'
```

**解决方案**：
```bash
# 1. 确认代码已更新（使用 crypto 替换 bcrypt）
cd /var/jenkins_home/workspace/server-nest
git pull origin test5

# 2. 清理依赖
rm -rf node_modules pnpm-lock.yaml

# 3. 检查是否还有 bcrypt
pnpm why bcrypt
# 应该显示：No dependencies found

# 4. 重新构建
# 在 Jenkins 界面点击 "Build with Parameters"
```

---

### 6.2 服务启动失败

**错误信息**：
```
PM2 error: Process failed to start
```

**排查步骤**：

```bash
# 1. 查看错误日志
pm2 logs server-nest-staging --err --lines 100

# 2. 检查端口占用
netstat -tlnp | grep 8119
# 如果端口被占用，杀掉进程
kill -9 <PID>

# 3. 检查环境变量
pm2 show server-nest-staging | grep env

# 4. 手动启动测试
cd /var/jenkins_home/workspace/server-nest
NODE_ENV=staging PORT=8119 node dist/main.js

# 5. 检查依赖服务
# MySQL
timeout 3 bash -c "</dev/tcp/host.docker.internal/3308"
# Redis
timeout 3 bash -c "</dev/tcp/host.docker.inrnal/6384"
```

---

### 6.3 数据库连接失败

**错误信息**：
```
Error: connect ECONNREFUSED
```

**解决方案**：

```bash
# 1. 检查 MySQL 是否运行
docker ps | grep mysql

# 2. 测试数据库连接
mysql -h host.docker.internal -P 3308 -u root -p

# 3. 检查数据库是否存在
mysql -h host.docker.internal -P 3308 -u root -p -e "SHOW DATABASES;"

# 4. 手动创建数据库
mysql -h host.docker.internal -P 3308 -u root -p -e "CREATE DATABASE IF NOT EXISTS together_staging;"

# 5. 检查 .env 配置
cat /var/jenkins_home/workspace/server-nest/.env.staging
```

---

### 6.4 Redis 连接失败

**错误信息**：
```
Error: Redis connection failed
```

**解决方案**：

```bash
# 1. 检查 Redis 是否运行
docker ps | grep redis

# 2. 测试 Redis 连接
redis-cli -h host.docker.internal -p 6384 ping
# 应该返回：PONG

# 3. 清空 Redis 缓存
redis-cli -h host.docker.internal -p 6384 FLUSHDB

# 4. 检查 Redis 配置
cat /var/jenkins_home/workspace/server-nest/.env.staging | grep REDIS
```

---

### 6.5 健康检查失败

**错误信息**：
```
❌ 服务健康检查失败
```

**排查步骤**：

```bash
# 1. 检查服务是否真的启动了
pm2 list

# 2. 查看服务日志
pm2 logs server-nest-staging --lines 50

# 3. 手动测试健康检查接口
curl -v http://localhost:8119/api/v1/health

# 4. 检查防火墙
iptables -L -n | grep 8119

# 5. 增加等待时间
# 修改 Jenkinsfile 中的 sleep 时间
sleep 10  # 改为 sleep 15
```

---

### 6.6 pnpm 安装依赖慢

**问题**：依赖安装时间过长

**优化方案**：

```bash
# 1. 配置 pnpm 镜像源
pnpm config set registry https://registry.npmmirror.com

# 2. 使用 pnpm store
pnpm config set store-dir /var/jenkins_home/.pnpm-store

# 3. 启用并行安装
pnpm config set network-concurrency 10

# 4. 查看配置
pnpm config list
```

---

## 7. 部署流程图

```
┌─────────────────────────────────────────────────────────┐
│                   Jenkins Pipeline                      │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
              ┌───────────────────────┐
              │  1. 清理工作空间       │
              └───────────┬───────────┘
                          │
                          ▼
              ┌───────────────────────┐
              │  2. 拉取代码 (Git)     │
              └───────────┬───────────┘
                          │
                          ▼
              ┌───────────────────────┐
              │  3. 安装依赖 (pnpm)    │
              │  - 移除 bcrypt         │
              │  - 安装新依赖          │
              └───────────┬───────────┘
                          │
                          ▼
              ┌───────────────────────┐
              │  4. 构建项目 (build)   │
              └───────────┬───────────┘
                          │
                          ▼
              ┌───────────────────────┐
              │  5. 检查依赖服务       │
              │  - MySQL               │
              │  - Redis               │
              │  - RustFS              │
              └───────────┬───────────┘
                          │
                          ▼
              ┌───────────────────────┐
              │  6. 数据库初始化       │
              └───────────┬───────────┘
                          │
                          ▼
              ┌───────────────────────┐
              │  7. 停止旧服务 (PM2)   │
              └───────────┬───────────┘
                          │
                          ▼
              ┌───────────────────────┐
              │  8. 启动新服务 (PM2)   │
              └───────────┬───────────┘
                          │
                          ▼
              ┌───────────────────────┐
              │  9. 健康检查           │
              └───────────┬───────────┘
                          │
                ┌─────────┴─────────┐
                │                   │
                ▼                   ▼
        ┌───────────┐       ┌───────────┐
        │  ✅ 成功   │       │  ❌ 失败   │
        └───────────┘       └───────────┘
```

---

## 8. 环境配置对照表

| 环境 | 端口 | MySQL 端口 | Redis 端口 | RustFS 端口 | 数据库名 |
|------|------|-----------|-----------|------------|---------|
| dev | 8118 | 3307 | 6383 | 8121 | together_dev |
| staging | 8119 | 3308 | 6384 | 8122 | together_staging |
| prod | 8120 | 3309 | 6382 | 8123 | together_prod |

---

## 9. 快速命令参考

### PM2 常用命令

```bash
# 查看所有服务
pm2 list

# 查看服务详情
pm2 show server-nest-staging

# 查看日志
pm2 logs server-nest-staging

# 重启服务
pm2 restart server-nest-staging

# 停止服务
pm2 stop server-nest-staging

# 删除服务
pm2 delete server-nest-staging

# 保存配置
pm2 save

# 监控服务
pm2 monit
```

### Git 常用命令

```bash
# 查看当前分支
git branch

# 切换分支
git checkout test5

# 拉取最新代码
git pull origin test5

# 查看提交历史
git log --oneline -10

# 查看文更
git diff HEAD~1
```

### pnpm 常用命令

```bash
# 安装依赖
pnpm install

# 移除依赖
pnpm remove bcrypt

# 查看依赖树
pnpm list --depth=0

# 查看某个包的依赖
pnpm why bcrypt

# 清理缓存
pnpm store prune
```

---

## 10. 联系与支持

如遇到问题，请按以下顺序排查：

1. ✅ 查看本文档的 [常见问题](#6-常见问题) 部分
2. ✅ 查看 Jenkins 构建日志
3. ✅ 查看 PM2 服务日志
4. ✅ 检查依赖服务状态（MySQL、Redis、RustFS）
5. ✅ 查看项目 GitHub Issues

---

## 附录

### A. Jenkinsfile 关键配置

```groovy
stage('安装依赖') {
    steps {
        sh '''
            # 清理 node_modules 和锁文件
            rm -rf node_modules
            rm -f pnpm-lock.yaml

         确保移除 bcrypt 依赖
            pnpm remove bcrypt || true

            # 安装依赖（使用 crypto，无需编译）
            pnpm install
        '''
    }
}
```

### B. 密码加密方案变更

**旧方案** (bcrypt/bcryptjs):
- 需要 C++ 编译
- Jenkins 环境可能缺少编译工具
- 构建不稳定

**新方案** (Node.js crypto):
- 使用内置模块，无需编译
- PBKDF2 + SHA512 算法
- 10000 次迭代
- 安全性高，稳定性好

**密码格式**:
```
旧格式: $2a$10$hashedpassword...
新格式: salt.hash
```

⚠️ **注意**: 已有用户密码需要重置，因为加密格式不兼容。

---

**文档版本**: v1.0  
**最后更新**: 2026-04-02  
**维护者**: 开发团队
