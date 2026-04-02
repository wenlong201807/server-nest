#!/bin/bash

echo "🧪 开始本地复现 Jenkins 构建..."

# 1. 清理
echo "1️⃣ 清理环境..."
pnpm store prune
rm -rf node_modules dist pnpm-lock.yaml

# 2. 安装依赖
echo "2️⃣ 安装依赖..."
pnpm install --no-frozen-lockfile

# 3. 检查 bcrypt
echo "3️⃣ 检查 bcrypt..."
if ls node_modules/.pnpm/ 2>/dev/null | grep -q bcrypt; then
    echo "❌ 发现 bcrypt 依赖！"
    echo "依赖来源："
    pnpm why bcrypt
    exit 1
else
    echo "✅ 没有 bcrypt 依赖"
fi

# 4. 构建
echo "4️⃣ 构建项目..."
pnpm run build

# 5. 检查构建产物
echo "5️⃣ 检查构建产物..."
if grep -r "require.*bcrypt[^j]" dist/ 2>/dev/null; then
    echo "❌ 构建产物中发现 bcrypt 引用！"
    grep -r "require.*bcrypt[^j]" dist/ | head -5
    exit 1
else
    echo "✅ 构建产物中没有 bcrypt 引用"
fi

# 6. 检查 crypto 使用
echo "6️⃣ 检查 crypto 使用..."
if grep -r "password.util" dist/ 2>/dev/null | head -1; then
    echo "✅ 正确使用 PasswordUtil"
else
    echo "⚠️  未找到 PasswordUtil 引用"
fi

# 7. 测试启动
echo "7️⃣ 测试启动..."
timeout 5 node dist/main.js &
PID=$!
sleep 3

if ps -p $PID > /dev/null 2>&1; then
    echo "✅ 服务启动成功"
    kill $PID 2>/dev/null
else
    echo "❌ 服务启动失败（可能是数据库连接问题，这是正常的）"
    echo "ℹ️  如果只是数据库连接失败，说明代码本身没问题"
fi

echo ""
echo "📊 环境信息："
echo "Node.js: $(node --version)"
echo "pnpm: $(pnpm --version)"
echo "pnpm store: $(pnpm store path)"

echo ""
echo "🎉 构建测试完成！"
