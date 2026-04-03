# 生产环境增量部署方案

> 适用于：WeTogether 后端服务  
> 场景：MySQL、Redis、RustFS 在线运行，需要增量更新  
> 目标：零停机或最小停机时间部署

---

## 📋 目录

1. [部署策略概览](#部署策略概览)
2. [数据库增量部署](#数据库增量部署)
3. [应用代码部署](#应用代码部署)
4. [Redis 数据迁移](#redis-数据迁移)
5. [文件存储迁移](#文件存储迁移)
6. [回滚方案](#回滚方案)
7. [部署检查清单](#部署检查清单)

---

## 🎯 部署策略概览

### 部署原则

```
1. 向后兼容优先
2. 数据库先行
3. 灰度发布
4. 快速回滚
5. 监控告警
```

### 部署顺序

```
数据库迁移 → 应用部署 → 缓存更新 → 验证测试 → 流量切换
```

---

## 🗄️ 数据库增量部署

### 1. 使用 TypeORM Migration

#### 1.1 创建迁移文件

```bash
# 生成迁移文件
npm run migration:generate -- -n AddUserAvatarColumn

# 或手动创建
npm run typeorm migration:create -- -n AddUserAvatarColumn
```

#### 1.2 编写迁移脚本

```typescript
// src/database/migrations/1234567890-AddUserAvatarColumn.ts
import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddUserAvatarColumn1234567890 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 添加新列（向后兼容）
    await queryRunner.addColumn(
      'user',
      new TableColumn({
        name: 'avatar_url',
        type: 'varchar',
        length: '500',
        isNullable: true, // 重要：新列必须可为空
        default: null,
      }),
    );

    // 添加索引
    await queryRunner.query(`
      CREATE INDEX idx_user_avatar ON user(avatar_url)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 回滚操作
    await queryRunner.query(`DROP INDEX idx_user_avatar ON user`);
    await queryRunner.dropColumn('user', 'avatar_url');
  }
}
```

#### 1.3 执行迁移

```bash
# 1. 在测试环境验证
npm run migration:run

# 2. 查看待执行的迁移
npm run typeorm migration:show

# 3. 生产环境执行（建议在低峰期）
# 方式1：直接执行
NODE_ENV=production npm run migration:run

# 方式2：使用事务（推荐）
NODE_ENV=production npm run typeorm migration:run -- --transaction all

# 4. 验证迁移结果
mysql -u root -p -e "DESCRIBE together_prod.user;"
```

### 2. 数据库变更最佳实践

#### 2.1 向后兼容的变更（零停机）

✅ **可以直接执行的操作**：

```sql
-- 添加新列（可为空）
ALTER TABLE user ADD COLUMN new_field VARCHAR(100) NULL;

-- 添加新表
CREATE TABLE new_table (...);

-- 添加索引（使用 ALGORITHM=INPLACE）
ALTER TABLE user ADD INDEX idx_name (name) ALGORITHM=INPLACE, LOCK=NONE;

-- 添加外键（如果不影响现有数据）
ALTER TABLE order ADD CONSTRAINT fk_user 
  FOREIGN KEY (user_id) REFERENCES user(id);
```

#### 2.2 需要分步执行的变更

⚠️ **需要多阶段部署**：

**场景：重命名列**

```sql
-- 阶段1：添加新列
ALTER TABLE user ADD COLUMN email_address VARCHAR(255) NULL;

-- 部署应用代码（同时读写两个字段）
-- 等待一段时间，确保所有实例更新

-- 阶段2：数据迁移
UPDATE user SET email_address = email WHERE email_address IS NULL;

-- 阶段3：设置非空约束
ALTER TABLE user MODIFY COLUMN email_address VARCHAR(255) NOT NULL;

-- 部署应用代码（只使用新字段）
-- 等待一段时间

-- 阶段4：删除旧列
ALTER TABLE user DROP COLUMN email;
```

**场景：修改列类型**

```sql
-- 阶段1：添加新列
ALTER TABLE user ADD COLUMN age_new INT NULL;

-- 阶段2：数据迁移
UPDATE user SET age_new = CAST(age AS SIGNED);

-- 阶段3：应用代码切换到新字段
-- 部署新代码

-- 阶段4：删除旧列，重命名新列
ALTER TABLE user DROP COLUMN age;
ALTER TABLE user CHANGE COLUMN age_new age INT NOT NULL;
```

#### 2.3 大表变更策略

对于大表（百万级以上记录），使用 `pt-online-schema-change`：

```bash
# 安装 Percona Toolkit
apt-get install percona-toolkit

# 在线修改表结构
pt-online-schema-change \
  --alter "ADD COLUMN new_field VARCHAR(100)" \
  --execute \
  --no-drop-old-table \
  --chunk-size=1000 \
  --max-load="Threads_running=50" \
  D=together_prod,t=user

# 参数说明：
# --chunk-size: 每次处理的行数
# --max-load: 负载阈值，超过则暂停
# --no-drop-old-table: 保留旧表用于回滚
```

### 3. 数据库备份

```bash
# 部署前备份
mysqldump -u root -p \
  --single-transaction \
  --routines \
  --triggers \
  --events \
  together_prod > backup_$(date +%Y%m%d_%H%M%S).sql

# 压缩备份
gzip backup_$(date +%Y%m%d_%H%M%S).sql

# 验证备份
gunzip -c backup_20260403_120000.sql.gz | head -100
```

---

## 🚀 应用代码部署

### 1. 蓝绿部署（推荐）

```bash
#!/bin/bash
# deploy-blue-green.sh

# 配置
BLUE_PORT=8118
GREEN_PORT=8119
NGINX_UPSTREAM="backend"

# 1. 检查当前活跃环境
CURRENT=$(curl -s http://localhost/health | jq -r '.env')

if [ "$CURRENT" == "blue" ]; then
  DEPLOY_ENV="green"
  DEPLOY_PORT=$GREEN_PORT
else
  DEPLOY_ENV="blue"
  DEPLOY_PORT=$BLUE_PORT
fi

echo "当前环境: $CURRENT"
echo "部署目标: $DEPLOY_ENV (端口 $DEPLOY_PORT)"

# 2. 部署新版本到目标环境
cd /app/$DEPLOY_ENV
git pull origin main
npm install --production
npm run build

# 3. 启动新环境
NODE_ENV=production PORT=$DEPLOY_PORT pm2 start dist/main.js --name "app-$DEPLOY_ENV"

# 4. 健康检查
echo "等待服务启动..."
sleep 10

for i in {1..30}; do
  if curl -f http://localhost:$DEPLOY_PORT/health; then
    echo "健康检查通过"
    break
  fi
  echo "等待服务就绪... ($i/30)"
  sleep 2
done

# 5. 切换 Nginx 流量
echo "切换流量到 $DEPLOY_ENV 环境"
sed -i "s/server localhost:[0-9]*/server localhost:$DEPLOY_PORT/" /etc/nginx/conf.d/backend.conf
nginx -s reload

# 6. 验证新环境
sleep 5
if curl -f http://localhost/health; then
  echo "部署成功！"
  
  # 7. 停止旧环境（可选，保留用于快速回滚）
  # pm2 stop app-$CURRENT
else
  echo "部署失败，回滚..."
  sed -i "s/server localhost:$DEPLOY_PORT/server localhost:$CURRENT_PORT/" /etc/nginx/conf.d/backend.conf
  nginx -s reload
  pm2 stop app-$DEPLOY_ENV
  exit 1
fi
```

### 2. 滚动更新（多实例）

```bash
#!/bin/bash
# deploy-rolling.sh

INSTANCES=("server1" "server2" "server3")
HEALTH_CHECK_URL="http://localhost:8118/health"

for instance in "${INSTANCES[@]}"; do
  echo "部署到 $instance..."
  
  # 1. 从负载均衡器移除
  ssh $instance "nginx -s reload"  # 假设有健康检查配置
  
  # 2. 等待现有请求处理完成
  sleep 30
  
  # 3. 部署新代码
  ssh $instance "cd /app && git pull && npm install && npm run build"
  
  # 4. 重启服务
  ssh $instance "pm2 restart app"
  
  # 5. 健康检查
  for i in {1..10}; do
    if ssh $instance "curl -f $HEALTH_CHECK_URL"; then
      echo "$instance 健康检查通过"
      break
    fi
    sleep 3
  done
  
  # 6. 加回负载均衡器
  echo "$instance 部署完成，继续下一个实例"
  sleep 10
done

echo "所有实例部署完成"
```

### 3. 使用 PM2 Ecosystem

```javascript
// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'wertogether-api',
      script: './dist/main.js',
      instances: 4, // 多实例
      exec_mode: 'cluster',
      env_production: {
        NODE_ENV: 'production',
        PORT: 8118,
      },
      // 优雅重启配置
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,
      // 自动重启
      max_restarts: 10,
      min_uptime: '10s',
    },
  ],
};
```

```bash
# 部署命令
pm2 deploy ecosystem.config.js production

# 或手动部署
git pull
npm install --production
npm run build
pm2 reload ecosystem.config.js --env production

# 零停机重启（逐个重启实例）
pm2 reload wertogether-api

# 查看状态
pm2 status
pm2 logs wertogether-api --lines 100
```

### 4. Docker 容器部署

```bash
#!/bin/bash
# deploy-docker.sh

IMAGE_NAME="wertogether-api"
VERSION=$(git rev-parse --short HEAD)
CONTAINER_NAME="wertogether-api"

# 1. 构建新镜像
docker build -t $IMAGE_NAME:$VERSION .
docker tag $IMAGE_NAME:$VERSION $IMAGE_NAME:latest

# 2. 启动新容器（不同端口）
docker run -d \
  --name ${CONTAINER_NAME}-new \
  -p 8119:8118 \
  --env-file .env.production \
  $IMAGE_NAME:$VERSION

# 3. 健康检查
sleep 10
if curl -f http://localhost:8119/health; then
  echo "新容器健康检查通过"
  
  # 4. 切换流量（更新 Nginx 配置）
  # 或使用 Docker Swarm/Kubernetes 的服务更新
  
  # 5. 停止旧容器
  docker stop $CONTAINER_NAME
  docker rm $CONTAINER_NAME
  docker rename ${CONTAINER_NAME}-new $CONTAINER_NAME
  
  # 6. 清理旧镜像
  docker image prune -f
else
  echo "健康检查失败，回滚"
  docker stop ${CONTAINER_NAME}-new
  docker rm ${CONTAINER_NAME}-new
  exit 1
fi
```

---

## 💾 Redis 数据迁移

### 1. 缓存键变更

```typescript
// 版本化缓存键
const CACHE_VERSION = 'v2';

class CacheService {
  // 旧版本键
  private getOldKey(key: string): string {
    return `cache:v1:${key}`;
  }

  // 新版本键
  private getNewKey(key: string): string {
    return `cache:${CACHE_VERSION}:${key}`;
  }

  async get(key: string): Promise<any> {
    // 先尝试新键
    let value = await this.redis.get(this.getNewKey(key));
    
    if (!value) {
      // 回退到旧键
      value = await this.redis.get(this.getOldKey(key));
      
      if (value) {
        // 迁移到新键
        await this.redis.set(this.getNewKey(key), value, 'EX', 3600);
      }
    }
    
    return value;
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    // 只写入新键
    await this.redis.set(this.getNewKey(key), value, 'EX', ttl || 3600);
  }
}
```

### 2. 数据结构变更

```typescript
// 渐进式迁移
async migrateUserCache() {
  const cursor = '0';
  const pattern = 'user:*';
  
  do {
    const [newCursor, keys] = await this.redis.scan(
      cursor,
      'MATCH',
      pattern,
      'COUNT',
      100,
    );
    
    for (const key of keys) {
      const oldData = await this.redis.get(key);
      
      if (oldData) {
        const parsed = JSON.parse(oldData);
        
        // 转换数据结构
        const newData = {
          ...parsed,
          version: 2,
          newField: this.transformData(parsed),
        };
        
        // 写入新键
        await this.redis.set(
          key.replace('user:', 'user:v2:'),
          JSON.stringify(newData),
          'EX',
          3600,
        );
      }
    }
    
    cursor = newCursor;
  } while (cursor !== '0');
}
```

### 3. 清理旧缓存

```bash
# 部署后清理脚本
redis-cli --scan --pattern "cache:v1:*" | xargs redis-cli DEL

# 或使用 UNLINK（异步删除，不阻塞）
redis-cli --scan --pattern "cache:v1:*" | xargs redis-cli UNLINK

# 批量删除（Lua 脚本）
redis-cli --eval cleanup.lua 0 "cache:v1:*"
```

```lua
-- cleanup.lua
local cursor = "0"
local pattern = ARGV[1]
local deleted = 0

repeat
  local result = redis.call("SCAN", cursor, "MATCH", pattern, "COUNT", 1000)
  cursor = result[1]
  local keys = result[2]
  
  if #keys > 0 then
    deleted = deleted + redis.call("UNLINK", unpack(keys))
  end
until cursor == "0"

return deleted
```

---

## 📁 文件存储迁移

### 1. RustFS/MinIO 文件迁移

```typescript
// 文件迁移服务
@Injectable()
export class FileMigrationService {
  async migrateFiles() {
    const oldBucket = 'old-bucket';
    const newBucket = 'new-bucket';
    
    // 1. 创建新桶
    await this.minioClient.makeBucket(newBucket);
    
    // 2. 列出所有文件
    const stream = this.minioClient.listObjects(oldBucket, '', true);
    
    for await (const obj of stream) {
      try {
        // 3. 复制文件
        await this.minioClient.copyObject(
          newBucket,
          obj.name,
          `/${oldBucket}/${obj.name}`,
        );
        
        console.log(`Migrated: ${obj.name}`);
      } catch (error) {
        console.error(`Failed to migrate ${obj.name}:`, error);
      }
    }
  }
  
  // 双写策略（过渡期）
  async uploadFile(file: Buffer, filename: string) {
    // 写入新桶
    await this.minioClient.putObject('new-bucket', filename, file);
    
    // 同时写入旧桶（兼容性）
    await this.minioClient.putObject('old-bucket', filename, file);
  }
  
  // 读取时优先新桶
  async getFile(filename: string): Promise<Buffer> {
    try {
      return await this.minioClient.getObject('new-bucket', filename);
    } catch (error) {
      // 回退到旧桶
      return await this.minioClient.getObject('old-bucket', filename);
    }
  }
}
```

### 2. 文件路径变更

```typescript
// 数据库记录更新
async updateFilePaths() {
  const files = await this.fileRepository.find({
    where: { path: Like('old-path/%') },
  });
  
  for (const file of files) {
    file.path = file.path.replace('old-path/', 'new-path/');
    await this.fileRepository.save(file);
  }
}
```

---

## 🔄 回滚方案

### 1. 数据库回滚

```bash
# 查看迁移历史
npm run typeorm migration:show

# 回滚最后一次迁移
npm run migration:revert

# 回滚到指定版本
npm run typeorm migration:revert -- -t 1234567890

# 从备份恢复（最后手段）
mysql -u root -p together_prod < backup_20260403_120000.sql
```

### 2. 应用代码回滚

```bash
# Git 回滚
git revert HEAD
git push origin main

# PM2 回滚到上一个版本
pm2 deploy ecosystem.config.js production revert 1

# Docker 回滚
docker stop wertogether-api
docker run -d --name wertogether-api $IMAGE_NAME:previous-version

# 蓝绿部署回滚（切换流量）
nginx -s reload  # 切回旧配置
```

### 3. 快速回滚脚本

```bash
#!/bin/bash
# rollback.sh

echo "开始回滚..."

# 1. 切换 Nginx 到旧版本
cp /etc/nginx/conf.d/backend.conf.backup /etc/nginx/conf.d/backend.conf
nginx -s reload

# 2. 启动旧版本容器
docker start wertogether-api-old

# 3. 停止新版本
docker stop wertogether-api-new

# 4. 验证
if curl -f http://localhost/health; then
  echo "回滚成功"
else
  echo "回滚失败，需要人工介入"
  exit 1
fi
```

---

## ✅ 部署检查清单

### 部署前检查

```markdown
- [ ] 代码已通过所有测试（单元测试 + E2E测试）
- [ ] 数据库迁移脚本已在测试环境验证
- [ ] 已创建数据库备份
- [ ] 已准备回滚方案
- [ ] 已通知相关人员部署时间窗口
- [ ] 已检查依赖服务状态（MySQL、Redis、RustFS）
- [ ] 已准备监控和告警
- [ ] 已准备应急联系人
```

### 部署中检查

```markdown
- [ ] 数据库迁移执行成功
- [ ] 应用启动成功
- [ ] 健康检查通过
- [ ] 关键接口响应正常
- [ ] 日志无异常错误
- [ ] 性能指标正常（响应时间、CPU、内存）
```

### 部署后验证

```markdown
- [ ] 核心功能测试通过
  - [ ] 用户登录/注册
  - [ ] 数据查询
  - [ ] 数据写入
  - [ ] 文件上传/下载
- [ ] 监控指标正常
  - [ ] API 响应时间 < 200ms
  - [ ] 错误率 < 1%
  - [ ] CPU 使用率 < 70%
  - [ ] 内存使用率 < 80%
- [ ] 数据库连接池正常
- [ ] Redis 缓存命中率正常
- [ ] 文件存储访问正常
- [ ] 观察 30 分钟无异常
```

---

## 📊 监控和告警

### 1. 部署监控脚本

```bash
#!/bin/bash
# monitor-deployment.sh

API_URL="http://localhost:8118"
ALERT_WEBHOOK="https://your-alert-webhook.com"

while true; do
  # 健康检查
  if ! curl -f $API_URL/health > /dev/null 2>&1; then
    curl -X POST $ALERT_WEBHOOK \
      -H 'Content-Type: application/json' \
      -d '{"text":"⚠️ API健康检查失败！"}'
  fi
  
  # 检查错误率
  ERROR_RATE=$(curl -s $API_URL/metrics | grep error_rate | awk '{print $2}')
  if (( $(echo "$ERROR_RATE > 0.05" | bc -l) )); then
    curl -X POST $ALERT_WEBHOOK \
      -H 'Content-Type: application/json' \
      -d "{\"text\":\"⚠️ 错误率过高: $ERROR_RATE\"}"
  fi
  
  sleep 60
done
```

### 2. 关键指标

```typescript
// 部署后监控的关键指标
const METRICS = {
  // API 性能
  responseTime: '< 200ms (P95)',
  errorRate: '< 1%',
  requestRate: '正常波动范围',
  
  // 数据库
  dbConnections: '< 80% 连接池',
  dbQueryTime: '< 100ms (P95)',
  dbDeadlocks: '0',
  
  // Redis
  cacheHitRate: '> 80%',
  redisMemory: '< 80%',
  
  // 系统资源
  cpuUsage: '< 70%',
  memoryUsage: '< 80%',
  diskUsage: '< 85%',
};
```

---

## 🎯 最佳实践总结

### 1. 部署时间选择

```
✅ 推荐：
- 业务低峰期（凌晨 2-4 点）
- 工作日（周二-周四）
- 避开节假日和促销活动

⚠️ 避免：
- 业务高峰期
- 周五下午/周末
- 重大活动前后
```

### 2. 部署频率

```
- 小改动：每天部署（持续部署）
- 中等改动：每周部署
- 大改动：每月部署（充分测试）
- 紧急修复：随时部署（快速响应）
```

### 3. 灰度发布策略

```
阶段1: 5% 流量  → 观察 30 分钟
阶段2: 25% 流量 → 观察 1 小时
阶段3: 50% 流量 → 观察 2 小时
阶段4: 100% 流量 → 持续监控
```

---

## 📞 应急联系

```
- 技术负责人：xxx
- 运维负责人：xxx
- DBA：xxx
- 应急响应时间：< 15 分钟
```

---

*本文档应定期更新，确保与实际部署流程保持一致*  
*最后更新：2026-04-03*
