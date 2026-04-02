#!/bin/bash

# Staging 环境测试脚本
# 用法: ./test-staging.sh [unit|integration|e2e|all]

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 默认参数
TEST_TYPE=${1:-all}

# 验证测试类型
if [[ ! "$TEST_TYPE" =~ ^(unit|integration|e2e|all)$ ]]; then
    echo -e "${RED}❌ 错误: 测试类型必须是 unit, integration, e2e 或 all${NC}"
    echo "用法: ./test-staging.sh [unit|integration|e2e|all]"
    exit 1
fi

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  🧪 Staging 环境测试${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# 1. 检查 staging 环境是否运行
echo -e "${YELLOW}📦 检查 staging 环境状态...${NC}"
if ! docker ps | grep -q "together-app-staging"; then
    echo -e "${RED}❌ Staging 环境未运行${NC}"
    echo -e "${YELLOW}💡 请先启动 staging 环境: ./deploy.sh staging start${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Staging 环境正在运行${NC}"
echo ""

# 2. 检查数据库连接
echo -e "${YELLOW}🗄️  检查数据库连接...${NC}"
if ! docker exec together-mysql-staging mysqladmin ping -h localhost -u root -proot123 2>/dev/null | grep -q "mysqld is alive"; then
    echo -e "${RED}❌ 数据库连接失败${NC}"
    exit 1
fi
echo -e "${GREEN}✅ 数据库连接正常${NC}"
echo ""

# 3. 检查 Redis 连接
echo -e "${YELLOW}💾 检查 Redis 连接...${NC}"
if ! docker exec together-redis-staging redis-cli ping 2>/dev/null | grep -q "PONG"; then
    echo -e "${RED}❌ Redis 连接失败${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Redis 连接正常${NC}"
echo ""

# 4. 加载测试环境配置
echo -e "${YELLOW}⚙️  加载测试环境配置...${NC}"
if [ -f "test/.env.test" ]; then
    export $(cat test/.env.test | grep -v '^#' | xargs)
    echo -e "${GREEN}✅ 测试环境配置已加载${NC}"
else
    echo -e "${RED}❌ 测试环境配置文件不存在${NC}"
    exit 1
fi
echo ""

# 5. 运行测试
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  🚀 开始运行测试${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

case $TEST_TYPE in
    unit)
        echo -e "${YELLOW}🔬 运行单元测试...${NC}"
        pnpm run test:staging:unit
        ;;

    integration)
        echo -e "${YELLOW}🔗 运行集成测试...${NC}"
        pnpm run test:staging:integration
        ;;

    e2e)
        echo -e "${YELLOW}🌐 运行端到端测试...${NC}"
        pnpm run test:staging:e2e
        ;;

    all)
        echo -e "${YELLOW}📋 运行所有测试...${NC}"
        echo ""
        
        echo -e "${BLUE}1/3 单元测试${NC}"
        pnpm run test:staging:unit
        echo ""
        
        echo -e "${BLUE}2/3 集成测试${NC}"
        pnpm run test:staging:integration
        echo ""
        
        echo -e "${BLUE}3/3 端到端测试${NC}"
        pnpm run test:staging:e2e
        ;;
esac

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  ✅ 测试完成${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
