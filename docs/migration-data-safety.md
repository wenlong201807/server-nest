# TypeORM Migration 数据安全说明

## ❓ 数据库中已有数据，迁移会导致数据丢失吗？

**答案：不会！Migration 是增量变更，不会丢失现有数据。**

---

## 🛡️ Migration 如何保护现有数据

### 1. 增量变更原则

Migration 只执行**增量变更**，不会重建整个数据库：

```typescript
// ✅ 安全：只添加新列
public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE \`users\` 
        ADD COLUMN \`avatarUrl\` varchar(500) NULL
    `);
}
```

**结果**：
- ✅ 表中原有的 1000 条用户数据保持不变
- ✅ 只是每条记录新增了一个 `avatarUrl` 字段（值为 NULL）
- ✅ 所有其他字段（id、mobile、nickname 等）完全不受影响

### 2. 初始 Migration 的特殊处理

我们创建的初始 Migration 使用了 `CREATE TABLE IF NOT EXISTS`：

```typescript
// InitialSchema1775229513411
public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS \`users\` (
            \`id\` int NOT NULL AUTO_INCREMENT,
            \`mobile\` varchar(20) NOT NULL,
            -- ... 其他字段
        )
    `);
}
```

**关键点**：
- `IF NOT EXISTS` 表示：如果表已存在，则跳过创建
- **不会删除现有表**
- **不会清空现有数据**
- 只在表不存在时才创建

### 3. Migration 执行记录

TypeORM 会在数据库中创建一个 `migrations` 表来记录已执行的 migration：

```sql
SELECT * FROM migrations;

+----+---------------+---------------------------+
| id | timestamp     | name                      |
+----+---------------+---------------------------+
|  1 | 1775229513411 | InitialSchema1775229513411|
+----+---------------+---------------------------+
```

**执行逻辑**：
1. 检查 `migrations` 表，看哪些 migration 已执行
2. 只执行**未执行过**的 migration
3. 执行后记录到 `migrations` 表

**结果**：
- ✅ 已执行的 migration 不会重复执行
- ✅ 不会重复创建表
- ✅ 不会影响现有数据

---

## 📊 实际场景演示

### 场景 1：数据库已有数据，首次运行 Migration

**当前状态**：
```sql
-- together_prod 数据库已存在
-- users 表已存在，有 100 条用户数据
SELECT COUNT(*) FROM users;  -- 100
```

**执行 Migration**：
```bash
npm run migration:run
```

**执行过程**：
```
query: SELECT * FROM `migrations`  -- 检查已执行的 migration
query: CREATE TABLE IF NOT EXISTS `users` (...)  -- 表已存在，跳过
query: CREATE TABLE IF NOT EXISTS `user_profiles` (...)  -- 表已存在，跳过
-- ... 其他表同样跳过
query: INSERT INTO `migrations` VALUES (1775229513411, 'InitialSchema1775229513411')
Migration InitialSchema1775229513411 has been executed successfully.
```

**结果**：
```sql
SELECT COUNT(*) FROM users;  -- 仍然是 100
SELECT * FROM users WHERE id = 1;  -- 数据完全一致
```

✅ **数据完全保留，没有任何丢失！**

### 场景 2：添加新列

**当前状态**：
```sql
-- users 表有 100 条数据
-- 没有 avatarUrl 字段
```

**创建 Migration**：
```typescript
export class AddUserAvatar1775230000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE \`users\` 
            ADD COLUMN \`avatarUrl\` varchar(500) NULL
        `);
    }
}
```

**执行后**：
```sql
-- 原有 100 条数据保持不变
SELECT id, mobile, nickname, avatarUrl FROM users LIMIT 3;

+----+-------------+----------+-----------+
| id | mobile      | nickname | avatarUrl |
+----+-------------+----------+-----------+
|  1 | 13800000001 | 用户A    | NULL      |
|  2 | 13800000002 | 用户B    | NULL      |
|  3 | 13800000003 | 用户C    | NULL      |
+----+-------------+----------+-----------+
```

✅ **原有数据完整保留，新字段默认为 NULL**

### 场景 3：修改列类型（需要数据转换）

**当前状态**：
```sql
-- points 字段是 INT 类型，有数据
SELECT id, points FROM users LIMIT 3;

+----+--------+
| id | points |
+----+--------+
|  1 | 5000   |
|  2 | 3000   |
|  3 | 8000   |
+----+--------+
```

**安全的 Migration**：
```typescript
export class ChangePointsType implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // 1. 添加新列
        await queryRunner.query(`
            ALTER TABLE \`users\` 
            ADD COLUMN \`points_new\` BIGINT NULL
        `);
        
        // 2. 数据迁移
        await queryRunner.query(`
            UPDATE \`users\` 
            SET \`points_new\` = \`points\`
        `);
        
        // 3. 删除旧列
        await queryRunner.query(`
            ALTER TABLE \`users\` 
            DROP COLUMN \`points\`
        `);
        
        // 4. 重命名新列
        await queryRunner.query(`
            ALTER TABLE \`users\` 
            CHANGE COLUMN \`points_new\` \`points\` BIGINT NOT NULL DEFAULT 0
        `);
    }
}
```

**执行后**：
```sql
SELECT id, points FROM users LIMIT 3;

+----+--------+
| id | points |
+----+--------+
|  1 | 5000   |  -- 数据保留
|  2 | 3000   |  -- 数据保留
|  3 | 8000   |  -- 数据保留
+----+--------+
```

✅ **数据完整迁移，没有丢失**

---

## ⚠️ 什么情况下会丢失数据？

### 危险操作 1：直接删除列

```typescript
// ❌ 危险：会丢失该列的所有数据
public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE \`users\` 
        DROP COLUMN \`old_field\`
    `);
}
```

**后果**：`old_field` 列的所有数据永久丢失

**安全做法**：
1. 先确认该列不再使用
2. 备份数据
3. 分阶段删除（先标记废弃，观察一段时间，再删除）

### 危险操作 2：删除表

```typescript
// ❌ 危险：会丢失整个表的数据
public async up(queryRunn QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE \`old_table\``);
}
```

**后果**：整个表的数据永久丢失

### 危险操作 3：不当的数据转换

```typescript
// ❌ 危险：可能导致数据截断
public async up(queryRunner: QueryRunner): Promise<void> {
    // 将 VARCHAR(500) 改为 VARCHAR(50)
    await queryRunner.query(`
        ALTER TABLE \`users\` 
        MODIFY COLUMN \`bio\` VARCHAR(50)
    `);
}
```

**后果**：超过 50 字符的 bio 会被截断

---

## ✅ 安全最佳实践

### 1. 部署前备份

```bash
# 执行 migration 前先备份
mysqldump -u root -p \
  --single-transaction \
  together_prod > backup_$(date +%Y%m%d_%H%M%S).sql
```

### 2. 在测试环境验证

```bash
# 1. 在 dev 环境测试
npmration:run

# 2. 验证数据完整性
mysql -u root -p -e "SELECT COUNT(*) FROM together_dev.users;"

# 3. 在 staging 环境测试
ENV=staging npm run migration:run

# 4. 最后在 prod 执行
ENV=prod npm run migration:run
```

### 3. 使用事务

```typescript
// ✅ 使用事务保证原子性
public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.startTransaction();
    try {
        await queryRunner.query(`ALTER TABLE users ADD COLUMN new_field VARCHAR(100)`);
        await queryRunner.query(`UPDATE users SET new_field = 'default'`);
        await queryRunner.commitTransaction();
    } catch (err) {
        await queryRunner.rollbackansaction();
        throw err;
    }
}
```

### 4. 新列设置为可空

```typescript
// ✅ 新列设置为 NULL，不影响现有数据
await queryRunner.query(`
    ALTER TABLE \`users\` 
    ADD COLUMN \`new_field\` VARCHAR(100) NULL
`);

// ❌ 新列设置为 NOT NULL，现有数据会报错
await queryRunner.query(`
    ALTER TABLE \`users\` 
    ADD COLUMN \`new_field\` VARCHAR(100) NOT NULL
`);
```

### 5. 分阶段部署

对于破坏性变更，分多个 migration 执行：

```typescript
// Migration 1: 添加新列
export class AddNewField1 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        Runner.query(`ALTER TABLE useCOLUMN new_field VARCHAR(100) NULL`);
    }
}

// 部署应用，观察一段时间...

// Migration 2: 数据迁移
export class MigrateData2 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`UPDATE users SET new_field = old_field`);
    }
}

// 再次部署，观察...

// Migration 3: 删除旧列
export class DropOldField3 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE users DROP COLUMN old_field`);
    }
}
```

---

## 🔍 如何验证数据完整性

### 部署前

```bash
# 记录数据量
mysql -u root -p -e "
SELECT 
    'users' as table_name, COUNT(*) as count FROM users
UNION ALL
SELECT 'posts', COUNT(*) FROM square_posts
UNION ALL
SELECT 'comments', COUNT(*) FROM square_comments;
"
```

### 部署后

```bash
# 对比数据量
mysql -u root -p -e "
SELECT 
    'users' as table_name, COUNT(*) as count FROM users
UNION ALL
SELECT 'posts', COUNT(*) FROM square_posts
UNION ALL
SELECT 'comments', COUNT(*) FROM square_comments;
"

# 抽查数据
mysql -u root -p -e "
SELECT * FROM users WHERE id IN (1, 100, 500) \G
"
```

---

## 📝 总结

### ✅ Migration 是安全的

1. **增量变更**：只修改结构，不删除数据
2. **幂等性**：重复执行不会有副作用
3. **可回滚**：支持 down 操作恢复
4. **有记录**：migrations 表追踪执行历史

### ⚠️ 需要注意的操作

1. **删除列/表**：会丢失数据，需谨慎
2. **修改列类型**：可能导致数据截断
3. **添加非空约束**：现有数据可能不满足

### 🛡️ 保护措施

1. **部署前备份**
2. **测试环境验证**
3. **使用事务**
4. **分阶段部署**
5. **监控数据完整性**

---

**结论**：只要遵循最佳实践，TypeORM Migration 是非常安全的，不会导致数据丢失。我们的初始 Migration 使用了 `CREATE TABLE IF NOT EXISTS`，对现有数据完全无影响。

---

*最后更新：2026-04-03*
