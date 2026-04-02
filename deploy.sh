#!/bin/bash

# Docker Compose 部署脚本
# 用法: ./deploy.sh [dev|staging|prod] [start|stop|restart|logs|ps|health]

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 默认参数
ENV=${1:-dev}
ACTION=${2:-start}

# 验证环境参数
if [[ ! "$ENV" =~ ^(dev|staging|prod)$ ]]; then
    echo -e "${RED}❌ 错误: 环境参数必须是 dev, staging 或 prod${NC}"
    echo "用法: ./deploy.sh [dev|staging|prod] [start|stop|restart|logs|ps]"
    exit 1
fi

# 验证操作参数
if [[ ! "$ACTION" =~ ^(start|stop|restart|logs|ps|build|health)$ ]]; then
    echo -e "${RED}❌ 错误: 操作参数必须是 start, stop, restart, logs, ps, build 或 health${NC}"
    echo "用法: ./deploy.sh [dev|staging|prod] [start|stop|restart|logs|ps|build|health]"
    exit 1
fi

# 检查环境配置文件
if [ ! -f ".env.${ENV}" ]; then
    echo -e "${RED}❌ 错误: 环境配置文件 .env.${ENV} 不存在${NC}"
    exit 1
fi

# 加载环境配置
cp .env.${ENV} .env
echo -e "${GREEN}✅ 已加载 ${ENV} 环境配置${NC}"

# 执行操作
case $ACTION in
    start)
        echo -e "${YELLOW}🚀 启动 ${ENV} 环境服务...${NC}"
        docker-compose up -d
        echo -e "${GREEN}✅ 服务启动成功${NC}"
        echo ""
        docker-compose ps
        ;;

    stop)
        echo -e "${YELLOW}🛑 停止 ${ENV} 环境服务...${NC}"
        docker-compose down
        echo -e "${GREEN}✅ 服务已停止${NC}"
        ;;

    restart)
        echo -e "${YELLOW}🔄 重启 ${ENV} 环境服务...${NC}"
        docker-compose restart
        echo -e "${GREEN}✅ 服务重启成功${NC}"
        echo ""
        docker-compose ps
        ;;

    logs)
        echo -e "${YELLOW}📋 查看 ${ENV} 环境日志...${NC}"
        docker-compose logs -f --tail=100
        ;;

    ps)
        echo -e "${YELLOW}📊 查看 ${ENV} 环境容器状态...${NC}"
        docker-compose ps
        ;;

    build)
        echo -e "${YELLOW}🔨 构建 ${ENV} 环境镜像...${NC}"
        docker-compose build --no-cache
        echo -e "${GREEN}✅ 镜像构建成功${NC}"
        ;;

    health)
        # 健康检查
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
            echo -e "${YELLOW}⚠️  RustFS 端口不可访问（可选服务）${NC}"
        fi
        echo ""

        # 5. 检查应用
        echo -e "${YELLOW}🚀 检查应用 (端口 ${APP_PORT})...${NC}"

        # 检查根路径
        if curl -sf http://localhost:${APP_PORT}/api/v1 >/dev/null 2>&1; then
            echo -e "${GREEN}✅ API 根路径可访问${NC}"
            RESPONSE=$(curl -s http://localhost:${APP_PORT}/api/v1)
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

        # 8. 总结
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
        echo -e "   所有服务: ${YELLOW}./deploy.sh ${ENV} logs${NC}"
        echo -e "   应用日志: ${YELLOW}docker-compose logs -f app${NC}"
        echo ""
        echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        ;;
esac

# 显示访问地址和健康检查提示
if [[ "$ACTION" == "start" || "$ACTION" == "restart" ]]; then
    APP_PORT=$(grep APP_PORT .env | cut -d'=' -f2)
    echo ""
    echo -e "${GREEN}🌐 API 访问地址: http://localhost:${APP_PORT}/api/v1${NC}"
    echo ""
    echo -e "${YELLOW}💡 提示: 等待 30 秒后运行健康检查${NC}"
    echo -e "${YELLOW}   命令: ./deploy.sh ${ENV} health${NC}"
fi
