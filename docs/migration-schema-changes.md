# 数据库结构变更安全指南

> 如何安全地修改列、字段、约束，保证不丢失数据的同时完成调整

---

## 📋 目录

1. [修改列名](#修改列名)
2. [修改列类型](#修改列类型)
3. [修改列约束](#修改列约束)
4. [添加/删除索引](#添加删除索引)
5. [修改外键约束](#修改外键约束)
6. [复杂场景示例](#复杂场景示例)

---

## 🔄 修改列名

### 场景：将 `email` 重命名为 `email_address`

**❌ 错误做法（会丢失数据）**：

```typescript
// 直接重命名会被识别为删除+新增
export class RenameEmail implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE users DROP COLUMN email`);
    await queryRunner.query(
      `ALTER TABLE users ADD COLUMN email_address VARCHAR(255)`,
    );
  }
}
// 结果：email 列的所有数据丢失！
```

**✅ 正确做法（分 4 个阶段）**：

#### 阶段 1：添加新列

```typescript
// Migration 1: 添加新列
export class AddEmailAddress1775230001000 implements MigrationInterface {
  name = 'AddEmailAddress1775230001000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 添加新列（可为空）
    await queryRunner.query(`
            ALTER TABLE \`users\` 
            ADD COLUMN \`email_address\` VARCHAR(255) NULL
        `);

    // 复制数据到新列
    await queryRunner.query(`
            UPDATE \`users\` 
            SET \`email_address\` = \`email\` 
            WHERE \`email_address\` IS NULL
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE \`users\` 
            DROP COLUMN \`email_address\`
        `);
  }
}
```

**部署应用代码（同时支持两个字段）**：

```typescript
// user.entity.ts
@Entity('users')
export class User {
  // 保留旧字段（向后兼容）
  @Column({ name: 'email', nullable: true })
  email?: string;

  // 新字段
  @Column({ name: 'email_address', nullable: true })
  emailAddress?: string;

  // Getter/Setter 优先使用新字段
  getEmail(): string {
    return this.emailAddress || this.email;
  }

  setEmail(value: string) {
    this.emailAddress = value;
    this.email = value; // 双写，保证兼容性
  }
}
```

**等待 1-2 周，确保所有实例更新...**

#### 阶段 2：设置非空约束

```typescript
// Migration 2: 设置非空约束
export class SetEmailAddressNotNull1775230002000 implements MigrationInterface {
  name = 'SetEmailAddressNotNull1775230002000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 确保所有数据已迁移
    await queryRunner.query(`
            UPDATE \`users\` 
            SET \`email_address\` = \`email\` 
            WHERE \`email_address\` IS NULL AND \`email\` IS NOT NULL
        `);

    // 设置非空约束
    await queryRunner.query(`
            ALTER TABLE \`users\` 
            MODIFY COLUMN \`email_address\` VARCHAR(255) NOT NULL
        `);

    // 添加唯一索引
    await queryRunner.query(`
            CREATE UNIQUE INDEX \`IDX_users_email_address\` 
            ON \`users\`(\`email_address\`)
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX \`IDX_users_email_address\` ON \`users\``,
    );
    await queryRunner.query(`
            ALTER TABLE \`users\` 
            MODIFY COLUMN \`email_address\` VARCHAR(255) NULL
        `);
  }
}
```

**部署应用代码（只使用新字段）**：

```typescript
// user.entity.ts
@Entity('users')
export class User {
  // 保留旧字段但标记为废弃
  @Column({ name: 'email', nullable: true })
  @Deprecated('使用 emailAddress 代替')
  email?: string;

  // 新字段（主要使用）
  @Column({ name: 'email_address', unique: true })
  emailAddress: string;
}
```

**再等待 1-2 周...**

#### 阶段 3：删除旧列

```typescript
// Migration 3: 删除旧列
export class DropOldEmail1775230003000 implements MigrationInterface {
  name = 'DropOldEmail1775230003000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 删除旧列
    await queryRunner.query(`
            ALTER TABLE \`users\` 
            DROP COLUMN \`email\`
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 回滚：重新添加旧列
    await queryRunner.query(`
            ALTER TABLE \`users\` 
            ADD COLUMN \`email\` VARCHAR(255) NULL
        `);

    // 恢复数据
    await queryRunner.query(`
            UPDATE \`users\` 
            SET \`email\` = \`email_address\`
        `);
  }
}
```

**最终应用代码**：

```typescript
// user.entity.ts
@Entity('users')
export class User {
  @Column({ name: 'email_address', unique: true })
  emailAddress: string;
}
```

---

## 🔧 修改列类型

### 场景 1：扩大字段长度（安全）

**从 VARCHAR(50) 改为 VARCHAR(255)**

```typescript
// ✅ 安全：扩大长度不会丢失数据
export class ExpandNicknameLength implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE \`users\` 
            MODIFY COLUMN \`nickname\` VARCHAR(255)
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 回滚时需要检查是否有数据超长
    await queryRunner.query(`
            ALTER TABLE \`users\` 
            MODIFY COLUMN \`nickname\` VARCHAR(50)
        `);
  }
}
```

### 场景 2：缩小字段长度（危险）

**从 VARCHAR(500) 改为 VARCHAR(50)**

```typescript
// ⚠️ 需要先检查数据
export class ShrinkBioLength implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. 检查是否有超长数据
    const result = await queryRunner.query(`
            SELECT COUNT(*) as count 
            FROM \`users\` 
            WHERE LENGTH(\`bio\`) > 50
        `);

    if (result[0].count > 0) {
      throw new Error(
        `有 ${result[0].count} 条记录的 bio 超过 50 字符，无法缩短字段`,
      );
    }

    // 2. 安全地修改
    await queryRunner.query(`
            ALTER TABLE \`users\` 
            MODIFY COLUMN \`bio\` VARCHAR(50)
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE \`users\` 
            MODIFY COLUMN \`bio\` VARCHAR(500)
        `);
  }
}
```

**或者使用截断策略**：

```typescript
export class ShrinkBioWithTruncate implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. 先截断超长数据
    await queryRunner.query(`
            UPDATE \`users\` 
            SET \`bio\` = LEFT(\`bio\`, 50) 
            WHERE LENGTH(\`bio\`) > 50
        `);

    // 2. 修改字段长度
    await queryRunner.query(`
            ALTER TABLE \`users\` 
            MODIFY COLUMN \`bio\` VARCHAR(50)
        `);
  }
}
```

### 场景 3：改变数据类型（需要转换）

**从 VARCHAR 改为 INT**

```typescript
// 示例：将 age 从 VARCHAR 改为 INT
export class ChangeAgeToInt implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // 1. 添加新列
        await queryRunner.query(`
            ALTER TABLE \`users\`
            ADD COLUMN \`age_new\` INT NULL
        `);

        // 2. 数据转换（处理无效数据）
        await queryRunner.query(`
            UPDATE \`users\`
            SET \`age_ne` = CAST(\`age\` AS SIGNED)
            WHERE \`age\` REGEXP '^[0-9]+$'
        `);

        // 3. 处理无效数据（设置默认值）
        await queryRunner.query(`
            UPDATE \`users\`
            SET \`age_new\` = 0
            WHERE \`age_new\` IS NULL
        `);

        // 4. 删除旧列
        await queryRunner.query(`
            ALTER TABLE \`users\`
            DROP COLUMN \`age\`
        `);

        // 5. 重命名新列
        await queryRunner.query(`
            ALTER TABLE \`users\`
            CHANGE COLUMN \`age_new\` \`age\` INT NOT NULL DEFAULT 0
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // 回滚：INT 转回 VARCHAR
        await queryRunner.query(`
            ALTER TABLE \`users\`
            MODIFY COLUMN \`age\` VARCHAR(10)
        `);
    }
}
```

**从 INT 改为 BIGINT（安全）**

```typescript
// ✅ 安全：扩大数值范围
export class ExpandPointsToBigInt implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE \`users\` 
            MODIFY COLUMN \`points\` BIGINT NOT NULL DEFAULT 0
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE \`users\` 
            MODIFY COLUMN \`points\` INT NOT NULL DEFAULT 0
        `);
  }
}
```

---

## 🔒 修改列约束

### 场景 1：添加 NOT NULL 约束

**❌ 错误做法（会失败）**：

```typescript
// 如果有 NULL 值，会报错
export class SetNicknameNotNull implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE \`users\` 
            MODIFY COLUMN \`nickname\` VARCHAR(50) NOT NULL
        `);
    // Error: Column 'nickname' cannot be null
  }
}
```

**✅ 正确做法**：

```typescript
export class SetNicknameNotNull implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // 1. 先填充 NULL 值
        await queryRunner.query(`
            UPDATE \`users\`
            SET \`nickname\` = CONCAT('用户', \`id\`)
            WHERE \`nickname\` IS NULL
        `);

        // 2. 再添加 NOT NULL 约束
        await queryRunner.query(`
            ALTER TABLE \`users\`
            MODIFY COLUMN \`nickname\` VARCHAR(50) NOT NULL
        `);
    }

    public async down(qu QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE \`users\`
            MODIFY COLUMN \`nickname\` VARCHAR(50) NULL
        `);
    }
}
```

### 场景 2：移除 NOT NULL 约束

```typescript
// ✅ 安全：放宽约束
export class RemoveNicknameNotNull implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE \`users\` 
            MODIFY COLUMN \`nickname\` VARCHAR(50) NULL
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 回滚时需要先填充 NULL 值
    await queryRunner.query(`
            UPDATE \`users\` 
            SET \`nickname\` = CONCAT('用户', \`id\`)
            WHERE \`nickname\` IS NULL
        `);

    await queryRunner.query(`
            ALTER TABLE \`users\` 
            MODIFY COLUMN \`nickname\` VARCHAR(50) NOT NULL
        `);
  }
}
```

### 场景 3：添加 UNIQUE 约束

```typescript
export class AddUniqueToMobile implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. 检查是否有重复数据
    const duplicates = await queryRunner.query(`
            SELECT \`mobile\`, COUNT(*) as count 
            FROM \`users\` 
            GROUP BY \`mobile\` 
            HAVING count > 1
        `);

    if (duplicates.length > 0) {
      console.log('发现重复数据：', duplicates);

      // 2. 处理重复数据（保留最早的记录）
      for (const dup of duplicates) {
        await queryRunner.query(
          `
                    DELETE FROM \`users\` 
                    WHERE \`mobile\` = ? 
                    AND \`id\` NOT IN (
                        SELECT MIN(\`id\`) 
                 M \`users\` 
                        WHERE \`mobile\` = ?
                    )
                `,
          [dup.mobile, dup.mobile],
        );
      }
    }

    // 3. 添加唯一约束
    await queryRunner.query(`
            CREATE UNIQUE INDEX \`IDX_users_mobile\` 
            ON \`users\`(\`mobile\`)
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            DROP INDEX \`IDX_users_mobile\` ON \`users\`
        `);
  }
}
```

### 场景 4：修改默认值

````typescript
// ✅ 安全：只影响新插入的数据
export class ChangePoault implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // 修改默认值（不影响现有数据）
        await queryRunner.query(`
            ALTER TABLE \`users\`
            ALTER COLUMN \`points\` SET DEFAULT 5000
        `);

        // 可选：更新现有数据
        // await queryRunner.query(`
        //     UPDATE \`users\`
        //     SET \`points\` = 5000
        //     WHERE \`points\` = 2000
        // `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE \`users\`
            ALTER COLUMN \`ps\` SET DEFAULT 2000
        `);
    }n---

## 📊 添加/删除索引

### 添加索引（在线操作）

```typescript
export class AddIndexToUserStatus implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // ✅ 使用 ALGORITHM=INPLACE, LOCK=NONE 实现在线添加
        await queryRunner.query(`
            CREATE INDEX \`IDX_users_status\`
            ON \`users\`(\`status\`)
            ALGORITHM=INPLACE, LOCK=NONE
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DROP INDEX \`IDX_users_status\` ON \`users\`
        `);
    }
}
````

复合索引

```typescript
export class AddCompositeIndex implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE INDEX \`IDX_users_status_created\` 
            ON \`users\`(\`status\`, \`createdAt\`) 
            ALGORITHM=INPLACE, LOCK=NONE
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            DROP INDEX \`IDX_users_status_created\` ON \`users\`
        `);
  }
}
```

### 删除索引

```typeript
// ✅ 安全：删除索引不影响数据
export class DropUnusedIndex implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DROP INDEX \`IDX_old_index\` ON \`users\`
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // 回滚时重新创建
        await queryRunner.query(`
            CREATE INDEX \`IDX_old_index\`
            ON \`users\`(\`old_field\`)
        `);
    }
}
```

---

## 🔗 修改外键约束

### 添加外键

```typescript
export class AddForeignKeyToPost implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. 检查数据完整性
    const orphans = await queryRunner.query(`
            SELECT COUNT(*) as count 
            FROM \`square_posts\` p
            LEFT JOIN \`users\` u ON p.\`userId\` = u.\`id\`
            WHERE u.\`id\` IS NULL
        `);

    if (orphans[0].count > 0) {
      throw new Error(
        `有 ${orphans[0].count} 条帖子的用户不存在，无法添加外键`,
      );
    }

    // 2. 添加外键
    await queryRunner.query(`
            ALTER TABLE \`square_posts\` 
            ADD CONSTRAINT \`FK_posts_user\` 
            FOREIGN KEY (\`userId\`) 
            REFERENCES \`users\`(\`id\`) 
            ON DELETE CASCADE
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE \`square_posts\` 
            DROP FOREIGN KEY \`FK_posts_user\`
        `);
  }
}
```

### 修改外键行为

```typescript
// 从 ON DELETE RESTRICT 改为 ON DELETE CASCADE
export class ChangeForeignKeyBehavior implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. 删除旧外键
    await queryRunner.query(`
            ALTER TABLE \`square_posts\` 
            DROP FOREIGN KEY \`FK_posts_user\`
        `);

    // 2. 添加新外键
    await queryRunner.query(`
            ALTER TABLE \`square_posts\` 
            ADD CONSTRAINT \`FK_posts_user\` 
            FOREIGN KEY (\`userId\`) 
            REFERENCES \`users\`(\`id\`) 
            ON DELETE CASCADE
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE \`square_posts\` 
            DROP FOREIGN KEY \`FK_posts_user\`
        `);

    await queryRunner.query(`
            ALTER TABLE \`square_posts\` 
            ADD CONSTRAINT \`FK_posts_user\` 
            FOREIGN KEY (\`userId\`) 
            REFERENCES \`users\`(\`id\`) 
            ON DELETE RESTRICT
        `);
  }
}
```

---

## 🎯 复杂场景示例

### 场景：重构用户积分系统

**需求**：

1. 将 `points` 从 INT 改为 BIGINT
2. 添加 `points_frozen`（冻结积分）字段
3. 添加 `points_total`（总积分）字段
4. 迁移历史数据

**分 3 个 Migration 完成**：

#### Migration 1: 添加新字段

```typescript
export class RefactorPointsStep1 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // 1. 扩展 points 类型
        await queryRunner.query(`
            ALTER TABLE \`users\`
            MODIFY COLUMN \`points\` BIGT NULL DEFAULT 0
        `);

        // 2. 添加新字段
        await queryRunner.query(`
            ALTER TABLE \`users\`
            ADD COLUMN \`points_frozen\` BIGINT NOT NULL DEFAULT 0,
            ADD COLUMN \`points_total\` BIGINT NOT NULL DEFAULT 0
        `);

        // 3. 初始化数据
        await queryRunner.query(`
            UPDATE \`users\`
            SET \`points_total\` = \`points\`,
                \`points_frozen\` = 0
        `);
    }

    public async down(queryRunner: QueryRunnese<void> {
        await queryRunner.query(`
            ALTER TABLE \`users\`
            DROP COLUMN \`points_frozen\`,
            DROP COLUMN \`points_total\`
        `);

        await queryRunner.query(`
            ALTER TABLE \`users\`
            MODIFY COLUMN \`points\` INT NOT NULL DEFAULT 0
        `);
    }
}
```

#### Migration 2: 迁移历史积分记录

```typescript
export class RefactorPointsStep2 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 从积分日志重新计算总积分
    await queryRunner.query(`
            UPDATE \`users\` u
            SET \`points_total\` = (
         SELECT COALESCE(SUM(\`amount\`), 0)
                FROM \`points_logs\` 
                WHERE \`userId\` = u.\`id\`
            )
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 回滚：恢复为当前可用积分
    await queryRunner.query(`
            UPDATE \`users\` 
            SET \`points_total\` = \`points\`
        `);
  }
}
```

#### Migration 3: 添加约束和索引

```typescript
export class RefactorPointsStep3 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 添加检查约束（MySQL 8.0.16+）
    await queryRunner.query(`
            ALTER TABLE \`users\` 
            ADD CONSTRAINT \`CHK_points_valid\` 
            CHECK (\`points\` >= 0 AND \`points_frozen\` >= 0 AND \`points_total\` >= 0)
        `);

    // 添加索引
    await queryRunner.query(`
            CREATE INDEX \`IDX_users_points\` 
            ON \`users\`(\`points\`) 
            ALGORITHM=INPLACE, LOCK=NONE
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX \`IDX_users_points\` ON \`users\``);
    await queryRunner.query(
      `ALTER TABLE \`users\` DROP CHECK \`CHK_points_valid\``,
    );
  }
}
```

---

## ✅ 最佳实践总结

### 1. 分阶段部署原则

```
阶段 1: 添加新字段/列（可为空）
  ↓ 部署应用（双写）
  ↓ 观察 1-2 周
阶段 2: 数据迁移 + 添加约束
  ↓ 部署应用（只用新字段）
  ↓ 观察 1-2 周
阶段 3: 删除旧字段/列
```

### 2. 安全检查清单

```markdown
- [ ] 在测试环境完整验证
- [ ] 备份生产数据库
- [ ] 检查是否有数据不符合新约束
- [ ] 评估 Migration 执行时间（大表）
- [ ] 准备回滚方案
- [ ] 在低峰期执行
- [ ] 监控执行过程
- [ ] 验证数据完整性
```

### 3. 常用 SQL 模式

```sql
-- 检查 NULL 值
SELECT COUNT(*) FROM users WHERE field IS NULL;

-- 检查重复值
SELECT field, COUNT(*) FROM users GROUP BY field HAVING COUNT(*) > 1;

-- 检查超长数据
SELECT COUNT(*) FROM users WHERE LENGTH(field) > 50;

-- 检查数据范围
SELECT MIN(field), MAX(field) FROM users;

-- 检查外键完整性
SELECT COUNT(*) FROMle c
LEFT JOIN parent_table p ON c.parent_id = p.id
WHERE p.id IS NULL;
```

### 4. 大表变更策略

对于百万级以上的大表：

```bash
# 使用 pt-online-schema-change
pt-online-schema-change \
  --alter "MODIFY COLUMN points BIGINT" \
  --execute \
  --no-drop-old-table \
  --chunk-size=1000 \
  --max-load="Threads_running=50" \
  --critical-load="Threads_running=100" \
  D=together_prod,t=users
```

---

## 📝 快速参考

| 操作          | 安全性  | 是否丢失数据 | 建议方案                   |
| ------------- | ------- | ------------ | -------------------------- |
| 添加列        | ✅ 安全 | 否           | 直接添加（可为空）         |
| 删除列        | ⚠️ 危险 | 是           | 分阶段，先废弃后删除       |
| 重命名列      | ⚠️ 危险 | 可能         | 添加新列→迁移数据→删除旧列 |
| 扩大字段长度  | ✅ 安全 | 否           | 直接修改                   |
| 缩小字段长度  | ⚠️ 危险 | 可能         | 先检查数据，再修改         |
| 改变数据类型  | ⚠️ 危险 | 可能         | 添加新列→转换数据→删除旧列 |
| 添加 NOT NULL | ⚠️ 危险 | 否           | 先填充 NULL，再添加约束    |
| 移除 NOT NULL | ✅ 安全 | 否           | 直接修改                   |
| 添加 UNIQUE   | ⚠️ 危险 | 可能         | 先处理重复数据，再添加约束 |
| 添加索引      | ✅ 安全 | 否           | 使用在线 DDL               |
| 删除索引      | ✅ 安全 | 否           | 直接删除                   |
| 添加外键      | ⚠️ 危险 | 否           | 先检查数据完整性           |
| 修改默认值    | ✅ 安全 | 否           | 直接修改（不影响现有数据） |

---

- 核心思想：通过分阶段部署和双写策略，确保在任何时刻都不会丢失数据，同时保持系统的可用性。

_最后更新：2026-04-03_
