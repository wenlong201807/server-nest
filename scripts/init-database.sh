#!/bin/bash

# 数据库初始化脚本
# 用于在 Jenkins Pipeline 中初始化数据库表结构

set -e

# 参数
ENVIRONMENT=${1:-dev}
DB_HOST=${2:-127.0.0.1}
DB_USER=${3:-root}
DB_PASSWORD=${4:-root123}

# 环境配置映射
case $ENVIRONMENT in
    dev)
        DB_PORT=3307
        DB_NAME=together_dev
        ;;
    staging)
        DB_PORT=3308
        DB_NAME=together_staging
        ;;
    prod)
        DB_PORT=3309
        DB_NAME=together_prod
        ;;
    *)
        echo "❌ 未知环境: $ENVIRONMENT"
        exit 1
        ;;
esac

echo "=========================================="
echo "数据库初始化 - $ENVIRONMENT 环境"
echo "=========================================="
echo "数据库: $DB_NAME"
echo "主机: $DB_HOST"
echo "端口: $DB_PORT"
echo ""

# 检查 mysql 客户端是否可用
if ! command -v mysql >/dev/null 2>&1; then
    echo "❌ mysql 客户端未安装"
    exit 1
fi

# 检查数据库连接
echo "检查数据库连接..."
if ! mysql -h$DB_HOST -P$DB_PORT -u$DB_USER -p$DB_PASSWORD -e "SELECT 1;" 2>&1 | grep -q "^1$"; then
    echo "❌ 无法连接到数据库 $DB_HOST:$DB_PORT"
    exit 1
fi
echo "✅ 数据库连接成功"

# 检查数据库是否存在
echo "检查数据库 $DB_NAME 是否存在..."
DB_EXISTS=$(mysql -h$DB_HOST -P$DB_PORT -u$DB_USER -p$DB_PASSWORD -e "SHOW DATABASES LIKE '$DB_NAME';" 2>/dev/null | grep -c "$DB_NAME" || echo "0")

if [ "$DB_EXISTS" -eq "0" ]; then
    echo "创建数据库 $DB_NAME..."
    mysql -h$DB_HOST -P$DB_PORT -u$DB_USER -p$DB_PASSWORD -e "CREATE DATABASE IF NOT EXISTS $DB_NAME CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" 2>/dev/null
    echo "✅ 数据库创建成功"
else
    echo "✅ 数据库已存在"
fi

# 检查表数量
echo "检查数据库表..."
TABLE_COUNT=$(mysql -h$DB_HOST -P$DB_PORT -u$DB_USER -p$DB_PASSWORD -e "SELECT COUNT(*) as cnt FROM information_schema.TABLES WHERE TABLE_SCHEMA = '$DB_NAME';" 2>/dev/null | tail -1)

echo "当前表数量: $TABLE_COUNT"

if [ "$TABLE_COUNT" -eq "0" ]; then
    echo ""
    echo "⚠️  数据库表为空，需要初始化"
    echo ""
    echo "方式 1: 使用 TypeORM synchronize (开发环境推荐)"
    echo "  - 应用启动时会自动创建表结构"
    echo "  - 配置: synchronize: true"
    echo ""
    echo "方式 2: 从其他环境导入表结构"

    # 如果是 staging 或 prod，尝试从 dev 导入
    if [ "$ENVIRONMENT" != "dev" ]; then
        echo ""
        echo "尝试从 dev 环境导入表结构..."

        # 检查 dev 数据库是否有表
        DEV_TABLE_COUNT=$(mysql -h$DB_HOST -P3307 -u$DB_USER -p$DB_PASSWORD -e "SELECT COUNT(*) as cnt FROM information_schema.TABLES WHERE TABLE_SCHEMA = 'together_dev';" 2>/dev/null | tail -1 || echo "0")

        if [ "$DEV_TABLE_COUNT" -gt "0" ]; then
            echo "从 dev 环境导出表结构..."
            mysqldump -h$DB_HOST -P3307 -u$DB_USER -p$DB_PASSWORD --no-data --skip-add-drop-table together_dev 2>/dev/null > /tmp/schema_export.sql

            echo "导入表结构到 $ENVIRONMENT 环境..."
            mysql -h$DB_HOST -P$DB_PORT -u$DB_USER -p$DB_PASSWORD $DB_NAME < /tmp/schema_export.sql 2>/dev/null

            # 验证导入
            NEW_TABLE_COUNT=$(mysql -h$DB_HOST -P$DB_PORT -u$DB_USER -p$DB_PASSWORD -e "SELECT COUNT(*) as cnt FROM information_schema.TABLES WHERE TABLE_SCHEMA = '$DB_NAME';" 2>/dev/null | tail -1)

            if [ "$NEW_TABLE_COUNT" -gt "0" ]; then
                echo "✅ 表结构导入成功，共 $NEW_TABLE_COUNT 张表"
                rm -f /tmp/schema_export.sql
            else
                echo "❌ 表结构导入失败"
                exit 1
            fi
        else
            echo "⚠️  dev 环境也没有表结构，将依赖 TypeORM synchronize 初始化"
        fi
    else
        echo "⚠️  dev 环境将在应用首次启动时通过 TypeORM synchronize 自动创建表"
    fi
else
    echo "✅ 数据库已有 $TABLE_COUNT 张表，跳过初始化"

    # 显示表列表
    echo ""
    echo "现有表列表:"
    mysql -h$DB_HOST -P$DB_PORT -u$DB_USER -p$DB_PASSWORD -e "SHOW TABLES FROM $DB_NAME;" 2>/dev/null | tail -n +2 | head -20
fi

echo ""
echo "=========================================="
echo "✅ 数据库初始化完成"
echo "=========================================="
