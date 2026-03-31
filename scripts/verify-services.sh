#!/bin/bash
# ============================================
# 服务连通性验证脚本
# 用法: ./verify-services.sh [dev|staging|prod]
# ============================================

set -euo pipefail

ENV="${1:-dev}"
PASS=0
FAIL=0

log_pass() { echo -e "\e[32m✅ PASS: $1\e[0m"; ((PASS++)); }
log_fail() { echo -e "\e[31m❌ FAIL: $1\e[0m"; ((FAIL++)); }

# 获取环境对应的端口
case $ENV in
    dev)    MYSQL_PORT=3307; REDIS_PORT=6383; RUSTFS_PORT=8121; APP_PORT=8118 ;;
    staging) MYSQL_PORT=3308; REDIS_PORT=6384; RUSTFS_PORT=8122; APP_PORT=8119 ;;
    prod)   MYSQL_PORT=3309; REDIS_PORT=6382; RUSTFS_PORT=8123; APP_PORT=8120 ;;
esac

echo "━━ 验证环境: $ENV ━━"

# ── 1. MySQL ──
echo -e "\n[1/5] MySQL (host.docker.internal:$MYSQL_PORT)..."
if timeout 3 bash -c "</dev/tcp/host.docker.internal/$MYSQL_PORT" 2>/dev/null; then
    log_pass "MySQL 端口可达"
    # 尝试连接
    if docker exec together-mysql-$ENV sh -c 'mysql -uroot -proot123 -e "SELECT 1"' &>/dev/null; then
        log_pass "MySQL 连接成功"
    else
        log_fail "MySQL 连接失败"
    fi
else
    log_fail "MySQL 端口不可达"
fi

# ── 2. Redis ──
echo -e "\n[2/5] Redis (host.docker.internal:$REDIS_PORT)..."
if timeout 3 bash -c "</dev/tcp/host.docker.internal/$REDIS_PORT" 2>/dev/null; then
    log_pass "Redis 端口可达"
else
    log_fail "Redis 端口不可达"
fi

# ── 3. RustFS ──
echo -e "\n[3/5] RustFS (host.docker.internal:$RUSTFS_PORT)..."
if timeout 3 bash -c "</dev/tcp/host.docker.internal/$RUSTFS_PORT" 2>/dev/null; then
    log_pass "RustFS 端口可达"
else
    log_fail "RustFS 端口不可达"
fi

# ── 4. 服务进程 ──
echo -e "\n[4/5] PM2 进程..."
if docker exec jenkins pm2 list 2>/dev/null | grep -q "server-nest-$ENV"; then
    log_pass "PM2 进程运行中"
else
    log_fail "PM2 进程未运行"
fi

# ── 5. 应用健康检查 ──
echo -e "\n[5/5] 应用健康检查 (localhost:$APP_PORT)..."
if curl -sf --max-time 5 "http://localhost:$APP_PORT/api/v1" &>/dev/null; then
    log_pass "应用响应正常"
else
    log_fail "应用无响应"
fi

# ── 汇总 ──
echo -e "\n━━━━━━━━━━━━━━━━━━━━━━"
echo "通过: $PASS | 失败: $FAIL"
echo "━━━━━━━━━━━━━━━━━━━━━━"
[ $FAIL -eq 0 ] && exit 0 || exit 1