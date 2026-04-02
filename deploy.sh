#!/bin/bash

# Docker Compose 部署脚本
# 用法: ./deploy.sh [dev|staging|prod] [start|stop|restart|logs|ps]

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
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
if [[ ! "$ACTION" =~ ^(start|stop|restart|logs|ps|build)$ ]]; then
    echo -e "${RED}❌ 错误: 操作参数必须是 start, stop, restart, logs, ps 或 build${NC}"
    echo "用法: ./deploy.sh [dev|staging|prod] [start|stop|restart|logs|ps|build]"
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
esac

# 显示访问地址
if [[ "$ACTION" == "start" || "$ACTION" == "restart" ]]; then
    APP_PORT=$(grep APP_PORT .env | cut -d'=' -f2)
    echo ""
    echo -e "${GREEN}🌐 API 访问地址: http://localhost:${APP_PORT}/api/v1${NC}"
fi
