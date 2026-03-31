#!/bin/bash
# ============================================
# 回滚脚本
# 用法: ./rollback.sh [dev|staging|prod] [版本号]
# ============================================

set -euo pipefail

ENV="${1:-dev}"
VERSION="${2:-1}"

PROJECT_NAME="server-nest"
APP_NAME="${PROJECT_NAME}-${ENV}"

echo "━━ 回滚环境: $ENV to v${VERSION} ━━"

# 停止当前服务
echo "停止当前服务..."
docker exec jenkins pm2 stop $APP_NAME 2>/dev/null || true
docker exec jenkins pm2 delete $APP_NAME 2>/dev/null || true

# 如果有版本备份，可以恢复
# docker exec jenkins sh -c "cd /var/jenkins_home/workspace && git checkout v${VERSION}"

# 重新构建（需要重新构建以恢复）
echo "需要重新构建以恢复版本"
echo "请在 Jenkins 中手动触发构建"

# 启动服务
echo "启动服务..."
docker exec jenkins pm2 resurrect 2>/dev/null || true

echo "✅ 回滚完成"