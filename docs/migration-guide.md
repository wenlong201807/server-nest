# TypeORM Migration 管理指南

> 本文档介绍如何使用 TypeORM Migration 管理数据库变更，实现安全的增量部署

---

## 📋 目录

1. [为什么使用 Migration](#为什么使用-migration)
2. [Migration 工作流程](#migration-工作流程)
3. [常用命令](#常用命令)
4. [创建 Migration](#创建-migration)
5. [执行 Migration](#执行-migration)
6. [回滚 Migration](#回滚-migration)
7. [最佳实践](#最佳实践)
8. [部署集成](#部署集成)
9. [常见问题](#常见问题)

---

## 🎯 为什么使用 Migration

### 问题场景

在生产环境中，直接使用 `synchronize: true` 会导致：

```typescript
// ❌ 危险：生产环境自动同步
TypeOrmModule.forRoot({
  synchronize: true, // 可能导致数据丢失！
})
```

**风险**：
- 删除列会导致数据丢失
- 重命名列会被识别为删除+新增
- 无法回滚变更
- 无法追踪变更历史

### Migration 的优势

```typescript
// ✅ 安全：使用 Migration 管理变更
TypeOrmModule.forRoot({
  synchronize: false,
  migrations: ['dist/database/migrations/*.js'],
  migrationsRun: false, // 由部署脚本控制
})
```

**优势**：
- 版本化管理数据库变更
- 可追溯的变更历史
- 支持回滚操作
- 团队协作友好
- 生产环境安全

---

## 🔄 Migration 工作流程

```
1. 修改 Entity 定义
   ↓
2. 生成/创建 Migration 文件
   ↓
3. 审查 Migration SQL
   ↓
4. 在开发环境测试
   ↓
5. 提交到版本控制
   ↓
6. 部署时自动执行
   ↓
7. 验证数据库状态
```

---

## 📝 常用命令

### 查看 Migration 状态

```bash
# 查看所有 migration 及其执行状态
npm run migration:show

# 输出示例：
# [X] InitialSchema1775229513411
# [ ] AddUserLastLoginAt1775230000000
```

### 生成 Migration

```bash
# 自动生成（对比 Entity 和数据库差异）
npm run migration:generate src/database/migrations/AddUserAvatar

# 手动创建空白 migration
npm run migration:create src/database/migrations/AddUserAvatar
```

### 执行 Migration

```bash
# 执行所有待执行的 migration
npm run migration:run

# 在特定环境执行
NODE_ENV=production npm run migration:run
```

### 回滚 Migration

```bash
# 回滚最后一次 migration
npm run migration:revert

# 回滚多次（需要多次执行）
npm run migration:revert
npm run migration:revert
```

---

## 🆕 创建 Migration

### 方式 1：自动生成（推荐）

适用于修改 Entity 后自动生成变更 SQL。

```bash
# 1. 修改 Entity
# src/modules/user/entities/user.entity.ts
@Entity('users')
export class User {
  // ... 其他字段
  
  @Column({ type: 'varchar', length: 500, nullable: true })
  avatarUrl?: string; // 新增字段
}

# 2. 生成 migration
npm run migration:generate src/database/migrations/AddUserAvatar

# 3. 查看生成的文件
cat src/database/migrations/*-AddUserAvatar.ts
```

生成的文件示例：

```typescript
import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUserAvatar1775230000000 implements MigrationInterface {
    name = 'AddUserAvatar1775230000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE \`users\` 
            ADD COLUMN \`avatarUrl\` varchar(500) NULL
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE \`users\` 
            DROP COLUMN \`avatarUrl\`
        `);
    }
}
```

### 方式 2：手动创建

适用于复杂变更、数据迁移、性能优化等场景。

```bash
# 创建空白 migration
npm run migration:create src/database/migrations/MigrateUserData
```

手动编写示例：

```typescript
import { MigrationInterface, QueryRunner } from "typeorm";

export class MigrateUserData1775230000000 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // 1. 添加新列
        await queryRunner.query(`
            ALTER TABLE \`users\` 
            ADD COLUMN \`email_address\` varchar(255) NULL
        `);

        // 2. 数据迁移
        await queryRunner.query(`
            UPDATE \`users\` 
            SET \`email_address\` = \`email\` 
         WHERE \`email_address\` IS NULL
        `);

        // 3. 设置非空约束
        await queryRunner.query(`
            ALTER TABLE \`users\` 
            MODIFY COLUMN \`email_address\` varchar(255) NOT NULL
        `);

        // 4. 删除旧列（可选，建议分阶段）
        // await queryRunner.query(`ALTER TABLE \`users\` DROP COLUMN \`email\``);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // 回滚操作
        await queryRunner.query(`
            ALTER TABLE \`users\` 
            DROP COLUMN \`email_address\`
        `);
    }
}
```

---

## ▶️ 执行 Migration

### 开发环境

```bash
# 1. 查看待执行的 migration
npm run migration:show

# 2. 执行 migration
npm run migration:run

# 3. 验证结果
mysql -u root -p -e "DESCRIBE together_dev.users;"
```

### 生产环境

生产环境通过部署脚本自动执行，无需手动操作。

```bash
# 部署时自动执行（见 scripts/docker-entrypoint.sh）
docker-compose up -d app
```

---

## ⏪ 回滚 Migration

### 回滚最后一次变更

```bash
# 1. 查看当前状态
npm run migration:show

# 2. 回滚
npm run migration:revert

# 3. 验证
npm run migration:show
```

### 回滚到指定版本

```bash
# 回滚多次直到目标版本
npm run migration:revert  # 回滚第一次
npm run migration:revert  # 回滚第二次
# ... 继续直到目标版本
```

### 紧急回滚（生产环境）

```bash
# 1. 进入容器
docker exec -it together-app-prod sh

# 2. 回滚 migration
npm run migration:revert

# 3. 重启应用
exit
docker restart together-app-prod
```

---

## ✅ 最佳实践

### 1. Migration 命名规范

```bash
# ✅ 好的命名
AddUserAvatarColumn
CreatePostsTable
AddIndexToUserEmail
MigrateUserDataToNewFormat

# ❌ 不好的命名
Update
Fix
Change
Migration1
```

### 2. 向后兼容原则

```typescript
// ✅ 向后兼容：新列可为空
await queryRunner.query(`
    ALTER TABLE \`users\` 
    ADD COLUMN \`new_field\` varchar(100) NULL
`);

// ❌ 不兼容：新列不可为空（旧代码会报错）
await queryRunner.query(`
    ALTER TABLE \`users\` 
    ADD COLUMN \`new_field\` varchar(100) NOT NULL
`);
```

### 3. 分阶段部署

对于破坏性变更，采用多阶段部署：

```typescript
// 阶段 1：添加新列
export class AddEmailAddress1 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE \`users\` 
            ADD COLUMN \`email_address\` varchar(255) NULL
        `);
    }
}

// 部署应用（同时读写两个字段）
// 等待一段时间...

// 阶段 2：数据迁移
export class MigrateEmailData2 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            UPDATE \`users\` 
            SET \`email_address\` = \`email\` 
            WHERE \`email_address\` IS NULL
        `);
    }
}

// 阶段 3：设置非空约束
export class SetEmailNotNull3 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE \`users\` 
            MODIFY COLUMN \`email_address\` varchar(255) NOT NULL
        `);
    }
}

// 部署应用（只使用新字段）
// 等待一段时间...

// 阶段 4：删除旧列
export class DropOldEmail4 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE \`users\` 
            DROP COLUMN \`email\`
        `);
    }
}
```

### 4. 大表变更策略

对于大表（百万级以上），使用在线变更工具：

```bash
# 使用 pt-online-schema-change
pt-online-schema-change \
  --alter "ADD COLUMN new_field VARCHAR(100)" \
  --execute \
  --no-drop-old-table \
  --chunk-size=1000 \
  D=together_prod,t=users
```

### 5. 事务控制

```typescript
// ✅ 使用事务（推荐）
export class UpdateUserData implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.startTransaction();
        try {
            await queryRunner.query(`UPDATE users SET status = 1`);
            await queryRunner.query(`UPDATE profiles SET verified = 1`);
            await queryRunner.commitTransaction();
        } catch (err) {
            await queryRunner.rollbackTransaction();
            throw err;
        }
    }
}
```

### 6. 添加索引

```typescript
// ✅ 在线添加索引（不锁表）
await queryRunner.query(`
    CREATE INDEX idx_user_email 
    ON users(email) 
    ALGORITHM=INPLACE, LOCK=NONE
`);

// ❌ 默认方式（可能锁表）
await queryRunner.query(`
    CREATE INDEX idx_user_email ON users(email)
`);
```

---

## 🚀 部署集成

### Docker 自动执行

部署时自动运行 migration（已集成到 `scripts/docker-entrypoint.sh`）：

```bash
# 1. 构建镜像
docker build -t server-nest-app .

# 2. 启动容器（自动执行 migration）
ENV=prod docker-compose up -d app

# 3. 查看日志
docker logs together-app-prod
```

输出示例：

```
==========================================
容器启动 - 准备运行应用
==========================================
检查环境变量...
✅ 环境变量检查通过

等待数据库就绪...
✅ 数据库连接成功

执行数据库迁移...
query: SELECT * FROM `together_prod`.`migrations`
query: ALTER TABLE `users` ADD COLUMN `lastLoginAt` timestamp(6) NULL
Migration AddUserLastLoginAt1775230000000 has been executed successfully.
✅ 数据库迁移完成

==========================================
启动 NestJS 应用...
==========================================
```

### 手动执行（生产环境）

```bash
# 1. 进入服务器
ssh user@production-server

# 2. 进入项目目录
cd /app/server-nest

# 3. 执行 migration 脚本
./scripts/run-migrations.sh

# 4. 重启应用
pm2 restart wertogether-api
```

---

## ❓ 常见问题

### Q1: Migration 执行失败怎么办？

```bash
# 1. 查看错误日志
docker logs together-app-prod

# 2. 手动回滚
docker exec -it together-app-prod npm run migration:revert

# 3. 修复 migration 文件后重新部署
```

### Q2: 如何跳过某个 Migration？

```bash
# 不推荐跳过，但如果必须：
# 1. 手动插入 migration 记录
docker exec -it together-mysql-prod mysql -uroot -proot123 -e "
INSERT INTO together_prod.migrations (timestamp, name) 
VALUES (1775230000000, 'AddUserAvatar1775230000000');
"

# 2. 验证
npm run migration:show
```

### Q3: Migration 表在哪里？

```bash
# 查看 migration 表
docker exec together-mysql-prod mysql -uroot -proot123 -e "
SELECT * FROM together_prod.migrations;
"

# 输出：
# +----+-------------+---------------------------+
# | id | timestamp   | name                      |
# +----+-------------+---------------------------+
# |  1 | 1775229513411 | InitialSchema1775229513411 |
# +----+-------------+---------------------------+
```

### Q4: 如何在多个环境同步 Migration？

```bash
# 1. 在 dev 环境创建 migration
npm run migration:generate src/database/migrations/AddFeature

# 2. 提交到 Git
git add src/database/migrations/
git commit -m "feat: add new feature migration"
git push

# 3. 在 staging/prod 环境拉取代码
git pull

# 4. 部署时自动执行
docker-compose up -d app
```

### Q5: 如何处理 Migration 冲突？

```bash
# 场景：两个开发者同时创建了 migration

# 1. 重命名冲突的 migration 文件（修改时间戳）
mv src/database/migrations/1775230000000-FeatureA.ts \
   src/database/migrations/1775230000001-FeatureA.ts

# 2. 更新类名
export class FeatureA1775230000001 implements MigrationInterface {
    name = 'FeatureA1775230000001'
    // ...
}

# 3. 按顺序执行
npm run migration:run
```

---

## 📚 参考资料

- [TypeORM Migration 官方文档](https://typeorm.io/migrations)
- [部署指南](./deployment-guide.md)
- [数据库最佳实践](./database-best-practices.md)

---

*最后更新：2026-04-03*
