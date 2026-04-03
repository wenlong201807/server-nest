#!/bin/bash

# TypeORM Migration 执行脚本
# 用于在部署时自动运行数据库迁移

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=========================================="
echo "TypeORM Migration 执行"
echo "=========================================="

# 检查环境变量
if [ -z "$DB_HOST" ] || [ -z "$DB_DATABASE" ]; then
    echo -e "${RED}❌ 缺少必要的环境变量${NC}"
    echo "需要: DB_HOST, DB_PORT, DB_USERNAME, DB_PASSWORD, DB_DATABASE"
    exit 1
fi

echo -e "${GREEN}数据库配置:${NC}"
echo "  Host: $DB_HOST"
echo "  Port: ${DB_PORT:-3306}"
echo "  Database: $DB_DATABASE"
echo ""

# 检查数据库连接
echo -e "${YELLOW}检查数据库连接...${NC}"
if ! node -e "
const mysql = require('mysql2/promise');
(async () => {
  try {
    const conn = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE
    });
    await conn.end();
    console.log('✅ 数据库连接成功');
  } catch (err) {
    console.error('❌ 数据库连接失败:', err.message);
    process.exit(1);
  }
})();
"; then
    echo -e "${RED}❌ 数据库连接失败${NC}"
    exit 1
fi

# 显示待执行的迁移
echo ""
echo -e "${YELLOW}查看待执行的迁移...${NC}"
npm run migration:show || true

# 执行迁移
echo ""
echo -e "${YELLOW}执行数据库迁移...${NC}"
if npm run migration:run; then
    echo ""
    echo -e "${GREEN}✅ 数据库迁移执行成功${NC}"
else
    echo ""
    echo -e "${RED}❌ 数据库迁移执行失败${NC}"
    exit 1
fi

# 再次显示迁移状态
echo ""
echo -e "${YELLOW}迁移执行后状态:${NC}"
npm run migration:show || true

echo ""
echo "=========================================="
echo -e "${GREEN}✅ Migration 执行完成${NC}"
echo "=========================================="
