# Jenkins 中为什么使用 host.docker.internal 而不是 127.0.0.1

## 问题背景

在 Jenkins 容器中部署应用时，需要连接宿主机上的 MySQL、Redis、RustFS 等服务。为什么使用 `host.docker.internal` 而不是 `127.0.0.1`？

## 核心原因：网络隔离

### 1. Docker 容器的网络隔离

```
┌─────────────────────────────────────────────────────────────┐
│                        宿主机 (macOS)                        │
│                                                               │
│  127.0.0.1 (localhost)                                       │
│  ├─ MySQL:3307                                               │
│  ├─ MySQL:3308                                               │
│  ├─ MySQL:3309                                               │
│  ├─ Redis:6382                                               │
│  ├─ Redis:6383                                               │
│  ├─ Redis:6384                                               │
│  └─ RustFS:8121                                              │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │         Jenkins 容器 (独立网络命名空间)             │    │
│  │                                                       │    │
│  │  127.0.0.1 (容器内部的 localhost)                   │    │
│  │  ├─ 只能访问容器内部的服务                          │    │
│  │  └─ 无法访问宿主机的 127.0.0.1                      │    │
│  │                                                       │    │
│  │  host.docker.internal (特殊 DNS)                    │    │
│  │  └─ 指向宿主机的 IP 地址                            │    │
│  │                                                       │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### 2. 127.0.0.1 在容器内的含义

**在宿主机上**:
```bash
# 127.0.0.1 指向宿主机本身
mysql -h127.0.0.1 -P3307 -uroot -proot123  # ✅ 可以连接
redis-cli -h 127.0.0.1 -p 6383 ping        # ✅ 可以连接
```

**在 Jenkins 容器内**:
```bash
# 127.0.0.1 指向容器本身，而不是宿主机
docker exec jenkins mysql -h127.0.0.1 -P3307 -uroot -proot123  # ❌ 连接失败
docker exec jenkins redis-cli -h 127.0.0.1 -p 6383 ping        # ❌ 连接失败
```

**原因**: 每个 Docker 容器都有自己的网络命名空间，`127.0.0.1` 只能访问容器内部的服务。

---

## host.docker.internal 的作用

### 1. 什么是 host.docker.internal

`host.docker.internal` 是 Docker 提供的**特殊 DNS 名称**，用于从容器内部访问宿主机。

**工作原理**:
```
容器内访问 host.docker.internal
    ↓
Docker DNS 解析
    ↓
宿主机的 IP 地址 (例如: 192.168.65.2)
    ↓
访问宿主机上的服务
```

### 2. 验证 host.docker.internal

```bash
# 在 Jenkins 容器内查看 host.docker.internal 的 IP
docker exec jenkins getent hosts host.docker.internal

# 输出示例:
# 192.168.65.2    host.docker.internal
```

### 3. 使用 host.docker.internal 连接服务

**在 Jenkins 容器内**:
```bash
# 连接宿主机的 MySQL
docker exec jenkins mysql -hhost.docker.internal -P3307 -uroot -proot123  # ✅ 成功

# 连接宿主机的 Redis
docker exec jenkins redis-cli -h host.docker.internal -p 6383 ping        # ✅ 成功
```

---

## 实际案例对比

### 场景 1: 本地开发（不使用 Docker）

**环境**: 直接在宿主机上运行 NestJS 应用

**配置** (.env):
```env
DB_HOST=127.0.0.1      # ✅ 正确
DB_PORT=3307
REDIS_HOST=127.0.0.1   # ✅ 正确
REDIS_PORT=6383
```

**原因**: 应用和服务都在宿主机上，`127.0.0.1` 指向宿主机本身。

---

### 场景 2: Jenkins 容器内部署

**环境**: 在 Jenkins 容器内运行 NestJS 应用

**错误配置** (Jenkinsfile):
```groovy
export DB_HOST=127.0.0.1      # ❌ 错误！指向容器内部
export DB_PORT=3307
export REDIS_HOST=127.0.0.1   # ❌ 错误！指向容器内部
export REDIS_PORT=6383
```

**错误原因**:
- `127.0.0.1` 指向 Jenkins 容器内部
- MySQL 和 Redis 运行在宿主机上，不在容器内
- 应用无法连接到服务

**正确配置** (Jenkinsfile):
```groovy
export DB_HOST=host.docker.internal      # ✅ 正确！指向宿主机
export DB_PORT=3307
export REDIS_HOST=host.docker.internal   # ✅ 正确！指向宿主机
export REDIS_PORT=6383
```

**正确原因**:
- `host.docker.internal` 指向宿主机
- MySQL 和 Redis 运行在宿主机上
- 应用可以通过宿主机 IP 连接到服务

---

## 技术细节

### 1. Docker 网络模式

Jenkins 容器使用的网络模式:
```bash
docker inspect jenkins | grep NetworkMode
# 输出: "NetworkMode": "jenkins_jenkins-net"
```

**网络模式说明**:
- **bridge** (默认): 容器有独立的网络命名空间
- **host**: 容器共享宿主机的网络命名空间 (可以使用 127.0.0.1)
- **自定义网络** (jenkins_jenkins-net): 容器在自定义网络中，需要 host.docker.internal

### 2. 为什么不使用 host 网络模式

**如果使用 host 模式**:
```yaml
# docker-compose.yml
services:
  jenkins:
    network_mode: host  # 共享宿主机网络
```

**优点**:
- 可以直接使用 `127.0.0.1` 访问宿主机服务

**缺点**:
- 容器端口直接暴露在宿主机上，可能冲突
- 失去了 Docker 网络隔离的安全性
- 不推荐在生产环境使用

### 3. host.docker.internal 的平台支持

| 平台 | 支持情况 | 说明 |
|------|---------|------|
| macOS | ✅ 原生支持 | Docker Desktop 自动配置 |
| Windows | ✅ 原生支持 | Docker Desktop 自动配置 |
| Linux | ⚠️ 需要手动配置 | 需要添加 `--add-host` 参数 |

**Linux 上的配置**:
```bash
docker run --add-host=host.docker.internal:host-gateway ...
```

或在 docker-compose.yml 中:
```yaml
services:
  jenkins:
    extra_hosts:
      - "host.docker.internal:host-gateway"
```

---

## Jenkinsfile 中的配置

### 当前配置（正确）

```groovy
stage('启动服务') {
    steps {
        script {
            def envConfig = [
                'dev': [
                    port: '8118',
                    dbPort: '3307',
                    redisPort: '6383',
                    rustfsPort: '8121',
                    database: 'together_dev'
                ],
                // ...
            ][params.ENVIRONMENT]

            sh """
                export NODE_ENV=${params.ENVIRONMENT}
                export PORT=${envConfig.port}
                export DB_HOST=host.docker.internal      # ✅ 正确
                export DB_PORT=${envConfig.dbPort}
                export DB_USERNAME=root
                export DB_PASSWORD=root123
                export DB_DATABASE=${envConfig.database}
                export REDIS_HOST=host.docker.internal   # ✅ 正确
                export REDIS_PORT=${envConfig.redisPort}
                export REDIS_PASSWORD=
                export RUSTFS_URL=http://host.docker.internal:${envConfig.rustfsPort}  # ✅ 正确

                pm2 start dist/main.js --name ${PROJECT_NAME}-${params.ENVIRONMENT}
                pm2 save
            """
        }
    }
}
```

### 为什么这样配置

1. **Jenkins 容器内运行 PM2**:
   - PM2 进程在 Jenkins 容器内
   - 需要访问宿主机上的 MySQL、Redis、RustFS

2. **服务在宿主机上**:
   - MySQL 容器暴露端口到宿主机 (3307, 3308, 3309)
   - Redis 容器暴露端口到宿主机 (6382, 6383, 6384)
   - RustFS 运行在宿主机 (8121, 8122, 8123)

3. **使用 host.docker.internal**:
   - 从 Jenkins 容器访问宿主机服务
   - 相当于访问宿主机的 IP 地址

---

## 网络流程图

### 完整的网络访问流程

```
┌─────────────────────────────────────────────────────────────┐
│                        宿主机 (macOS)                        │
│                                                               │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│  │ MySQL Container │  │ Redis Container │  │   RustFS    │ │
│  │   (3307:3306)   │  │   (6383:6379)   │  │   :8121     │ │
│  └────────┬────────┘  └────────┬────────┘  └──────┬──────┘ │
│           │                    │                   │         │
│           └────────────────────┴───────────────────┘         │
│                              │                               │
│                    宿主机网络接口 (192.168.65.2)            │
│                              │                               │
│  ┌───────────────────────────┼─────────────────────────┐    │
│  │         Jenkins 容器      │                         │    │
│  │                           │                         │    │
│  │  ┌────────────────────────▼──────────────────────┐ │    │
│  │  │  NestJS 应用 (PM2)                            │ │    │
│  │  │                                                │ │    │
│  │  │  DB_HOST=host.docker.internal                 │ │    │
│  │  │  ↓                                             │ │    │
│  │  │  DNS 解析: 192.168.65.2                       │ │    │
│  │  │  ↓                                             │ │    │
│  │  │  连接: 192.168.65.2:3307                      │ │    │
│  │  └────────────────────────────────────────────────┘ │    │
│  │                                                       │    │
│  └───────────────────────────────────────────────────────┘    │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### 访问步骤

1. **NestJS 应用启动**:
   ```javascript
   // 读取环境变量
   const dbHost = process.env.DB_HOST; // 'host.docker.internal'
   const dbPort = process.env.DB_PORT; // '3307'
   ```

2. **DNS 解析**:
   ```
   host.docker.internal → 192.168.65.2 (宿主机 IP)
   ```

3. **建立连接**:
   ```
   连接到: 192.168.65.2:3307
   ↓
   宿主机端口转发: 3307 → MySQL 容器的 3306
   ↓
   成功连接到 MySQL
   ```

---

## 常见问题

### 1. 为什么本地开发可以用 127.0.0.1，Jenkins 不行？

**本地开发**:
- 应用直接运行在宿主机上
- `127.0.0.1` 指向宿主机本身
- 可以访问宿主机上的所有服务

**Jenkins 部署**:
- 应用运行在 Jenkins 容器内
- `127.0.0.1` 指向容器本身
- 无法访问宿主机上的服务

### 2. 能否在 Jenkins 中也使用 127.0.0.1？

**方案 1**: 使用 host 网络模式（不推荐）
```yaml
services:
  jenkins:
    network_mode: host
```

**方案 2**: 将所有服务放在同一个 Docker 网络中（推荐）
```yaml
services:
  jenkins:
    networks:
      - app-network
  mysql:
    networks:
      - app-network
  redis:
    networks:
      - app-network
```

然后使用服务名访问:
```env
DB_HOST=mysql
REDIS_HOST=redis
```

### 3. host.docker.internal 在 Linux 上不工作怎么办？

**解决方案**:
```bash
# 启动容器时添加 host-gateway
docker run --add-host=host.docker.internal:host-gateway ...
```

或在 docker-compose.yml 中:
```yaml
services:
  jenkins:
    extra_hosts:
      - "host.docker.internal:host-gateway"
```

---

## 最佳实践

### 1. 开发环境

**本地开发** (.env):
```env
DB_HOST=127.0.0.1
DB_PORT=3307
REDIS_HOST=127.0.0.1
REDIS_PORT=6383
```

### 2. Jenkins 部署

**Jenkinsfile**:
```groovy
export DB_HOST=host.docker.internal
export DB_PORT=3307
export REDIS_HOST=host.docker.internal
export REDIS_PORT=6383
```

### 3. Docker Compose 部署

**docker-compose.yml**:
```yaml
services:
  app:
    environment:
      DB_HOST: mysql          # 使用服务名
      REDIS_HOST: redis       # 使用服务名
    networks:
      - app-network
  
  mysql:
    networks:
      - app-network
  
  redis:
    networks:
      - app-network

networks:
  app-network:
```

### 4. Kubernetes 部署

**deployment.yaml**:
```yaml
env:
  - name: DB_HOST
    value: mysql-service.default.svc.cluster.local
  - name: REDIS_HOST
    value: redis-service.default.svc.cluster.local
```

---

## 总结

| 场景 | 使用 | 原因 |
|------|------|------|
| 本地开发 | `127.0.0.1` | 应用和服务都在宿主机 |
| Jenkins 容器 | `host.docker.internal` | 应用在容器，服务在宿主机 |
| Docker Compose | 服务名 (如 `mysql`) | 应用和服务在同一网络 |
| Kubernetes | Service 名称 | 使用 K8s 服务发现 |

**核心原则**: 
- 容器内的 `127.0.0.1` 只能访问容器本身
- 使用 `host.docker.internal` 从容器访问宿主机
- 使用服务名从容器访问同一网络中的其他容器

---

## 相关文档

- [MySQL 连接信息](./mysql-credentials.md)
- [Redis 连接信息](./redis-credentials.md)
- [Jenkins 部署配置](../../Jenkinsfile)
- [Docker 网络文档](https://docs.docker.com/network/)

---

**文档版本**: v1.0  
**最后更新**: 2026-04-02  
**维护者**: 开发团队
