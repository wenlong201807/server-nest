#!/bin/bash

# 健康检查脚本
# 用法: ./health-check.sh [dev|staging|prod]

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 默认参数
ENV=${1:-staging}

# 验证环境参数
if [[ ! "$ENV" =~ ^(dev|staging|prod)$ ]]; then
    echo -e "${RED}❌ 错误: 环境参数必须是 dev, staging 或 prod${NC}"
    echo "用法: ./health-check.sh [dev|staging|prod]"
    exit 1
fi

# 检查环境配置文件
if [ ! -f ".env.${ENV}" ]; then
    echo -e "${RED}❌ 错误: 环境配置文件 .env.${ENV} 不存在${NC}"
    exit 1
fi

# 加载环境配置
source .env.${ENV}

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  🏥 健康检查 - ${ENV} 环境${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# 1. 检查容器状态
echo -e "${YELLOW}📦 检查容器状态...${NC}"
echo ""
docker-compose ps
echo ""

# 2. 检查 MySQL
echo -e "${YELLOW}🗄️  检查 MySQL (端口 ${DB_PORT})...${NC}"
if docker exec together-mysql-${ENV} mysqladmin ping -h localhost -u root -p${DB_PASSWORD} 2>/dev/null | grep -q "mysqld is alive"; then
    echo -e "${GREEN}✅ MySQL 运行正常${NC}"

    # 检查数据库
    DB_EXISTS=$(docker exec together-mysql-${ENV} mysql -u root -p${DB_PASSWORD} -e "SHOW DATABASES LIKE '${DB_DATABASE}';" 2>/dev/null | grep -c "${DB_DATABASE}" || echo "0")
    if [ "$DB_EXISTS" -gt 0 ]; then
        echo -e "${GREEN}✅ 数据库 ${DB_DATABASE} 存在${NC}"

        # 检查表数量
        TABLE_COUNT=$(docker exec together-mysql-${ENV} mysql -u root -p${DB_PASSWORD} -D ${DB_DATABASE} -e "SHOW TABLES;" 2>/dev/null | wc -l)
        echo -e "${GREEN}✅ 数据库包含 $((TABLE_COUNT - 1)) 张表${NC}"
    else
        echo -e "${RED}❌ 数据库 ${DB_DATABASE} 不存在${NC}"
    fi
else
    echo -e "${RED}❌ MySQL 连接失败${NC}"
fi
echo ""

# 3. 检查 Redis
echo -e "${YELLOW}💾 检查 Redis (端口 ${REDIS_PORT})...${NC}"
if docker exec together-redis-${ENV} redis-cli ping 2>/dev/null | grep -q "PONG"; then
    echo -e "${GREEN}✅ Redis 运行正常${NC}"

    # 检查 Redis 信息
    REDIS_KEYS=$(docker exec together-redis-${ENV} redis-cli DBSIZE 2>/dev/null | grep -oE '[0-9]+')
    echo -e "${GREEN}✅ Redis 包含 ${REDIS_KEYS} 个 key${NC}"
else
    echo -e "${RED}❌ Redis 连接失败${NC}"
fi
echo ""

# 4. 检查 RustFS (宿主机)
echo -e "${YELLOW}📁 检查 RustFS (端口 ${RUSTFS_PORT})...${NC}"
if timeout 3 bash -c "</dev/tcp/localhost/${RUSTFS_PORT}" 2>/dev/null; then
    echo -e "${GREEN}✅ RustFS 端口可访问${NC}"
else
    echo -e "${RED}❌ RustFS 端口不可访问${NC}"
fi
echo ""

# 5. 检查应用
echo -e "${YELLOW}🚀 检查应用 (端口 ${APP_PORT})...${NC}"

# 检查根路径
if curl -sf http://localhost:${APP_PORT}/api/v1 >/dev/null 2>&1; then
    echo -e "${GREEN}✅ API 根路径可访问${NC}"

    # 获取响应内容
    RESPONSE=$(curl -s http://localhost:${APP_PORT}/api/v1/public/config)
    echo -e "${GREEN}   响应: ${RESPONSE}${NC}"
else
    echo -e "${RED}❌ API 根路径不可访问${NC}"
fi

# 检查 Swagger 文档
if curl -sf http://localhost:${APP_PORT}/api/docs >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Swagger 文档可访问${NC}"
else
    echo -e "${YELLOW}⚠️  Swagger 文档不可访问${NC}"
fi

# 检查健康检查端点（如果有）
if curl -sf http://localhost:${APP_PORT}/health >/dev/null 2>&1; then
    echo -e "${GREEN}✅ 健康检查端点可访问${NC}"
else
    echo -e "${YELLOW}⚠️  健康检查端点不可访问（可能未配置）${NC}"
fi
echo ""

# 6. 检查容器健康状态
echo -e "${YELLOW}🏥 检查容器健康状态...${NC}"

# MySQL 健康状态
MYSQL_HEALTH=$(docker inspect together-mysql-${ENV} --format='{{.State.Health.Status}}' 2>/dev/null || echo "unknown")
if [ "$MYSQL_HEALTH" == "healthy" ]; then
    echo -e "${GREEN}✅ MySQL 容器健康${NC}"
else
    echo -e "${RED}❌ MySQL 容器状态: ${MYSQL_HEALTH}${NC}"
fi

# Redis 健康状态
REDIS_HEALTH=$(docker inspect together-redis-${ENV} --format='{{.State.Health.Status}}' 2>/dev/null || echo "unknown")
if [ "$REDIS_HEALTH" == "healthy" ]; then
    echo -e "${GREEN}✅ Redis 容器健康${NC}"
else
    echo -e "${RED}❌ Redis 容器状态: ${REDIS_HEALTH}${NC}"
fi

# App 健康状态
APP_HEALTH=$(docker inspect together-app-${ENV} --format='{{.State.Health.Status}}' 2>/dev/null || echo "unknown")
if [ "$APP_HEALTH" == "healthy" ]; then
    echo -e "${GREEN}✅ App 容器健康${NC}"
elif [ "$APP_HEALTH" == "starting" ]; then
    echo -e "${YELLOW}⏳ App 容器正在启动...${NC}"
else
    echo -e "${RED}❌ App 容器状态: ${APP_HEALTH}${NC}"
fi
echo ""

# 7. 检查容器资源使用
echo -e "${YELLOW}📊 检查容器资源使用...${NC}"
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}" \
    together-mysql-${ENV} together-redis-${ENV} together-app-${ENV} 2>/dev/null || echo "无法获取资源使用情况"
echo ""

# 8. 测试 API 端点
echo -e "${YELLOW}🧪 测试 API 端点...${NC}"

# 测试公共配置接口
if curl -sf http://localhost:${APP_PORT}/api/v1/public/config >/dev/null 2>&1; then
    echo -e "${GREEN}✅ 公共配置接口可访问${NC}"
else
    echo -e "${YELLOW}⚠️  公共配置接口不可访问${NC}"
fi

# 测试认证类型接口
if curl -sf http://localhost:${APP_PORT}/api/v1/certification-types >/dev/null 2>&1; then
    echo -e "${GREEN}✅ 认证类型接口可访问${NC}"
else
    echo -e "${YELLOW}⚠️  认证类型接口不可访问${NC}"
fi
echo ""

# 9. 总结
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  📋 检查总结${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${GREEN}🌐 访问地址:${NC}"
echo -e "   API: ${GREEN}http://localhost:${APP_PORT}/api/v1${NC}"
echo -e "   Swagger: ${GREEN}http://localhost:${APP_PORT}/api/docs${NC}"
echo ""
echo -e "${GREEN}🔗 数据库连接:${NC}"
echo -e "   MySQL: ${GREEN}127.0.0.1:${DB_PORT}${NC} (用户: root, 密码: ${DB_PASSWORD}, 数据库: ${DB_DATABASE})"
echo -e "   Redis: ${GREEN}127.0.0.1:${REDIS_PORT}${NC} (无密码)"
echo ""
echo -e "${GREEN}📝 查看日志:${NC}"
echo -e "   所有服务: ${YELLOW}docker-compose logs -f${NC}"
echo -e "   应用日志: ${YELLOW}docker-compose logs -f app${NC}"
echo -e "   MySQL 日志: ${YELLOW}docker-compose logs -f mysql${NC}"
echo -e "   Redis 日志: ${YELLOW}docker-compose logs -f redis${NC}"
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
