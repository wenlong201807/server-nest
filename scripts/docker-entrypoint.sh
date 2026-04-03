#!/bin/sh

# Docker 容器启动脚本
# 在应用启动前自动运行数据库迁移

set -e

echo "=========================================="
echo "容器启动 - 准备运行应用"
echo "=========================================="

# 1. 检查环境变量
echo "检查环境变量..."
if [ -z "$DB_HOST" ] || [ -z "$DB_DATABASE" ]; then
    echo "❌ 缺少必要的数据库环境变量"
    exit 1
fi
echo "✅ 环境变量检查通过"

# 2. 等待数据库就绪
echo ""
echo "等待数据库就绪..."
MAX_RETRIES=30
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if node -e "
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
    process.exit(0);
  } catch (err) {
    process.exit(1);
  }
})();
" 2>/dev/null; then
        echo "✅ 数据库连接成功"
        break
    fi

    RETRY_COUNT=$((RETRY_COUNT + 1))
    echo "等待数据库... ($RETRY_COUNT/$MAX_RETRIES)"
    sleep 2
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    echo "❌ 数据库连接超时"
    exit 1
fi

# 3. 运行数据库迁移
echo ""
echo "执行数据库迁移..."
if npm run migration:run; then
    echo "✅ 数据库迁移完成"
else
    echo "⚠️  数据库迁移失败（可能已是最新状态）"
fi

# 4. 启动应用
echo ""
echo "=========================================="
echo "启动 NestJS 应用..."
echo "=========================================="
exec node dist/main.js
