# Node.js 基础镜像
FROM node:22-alpine AS base

# 设置工作目录
WORKDIR /app

# 复制 package.json 和 pnpm-lock.yaml
COPY package.json pnpm-lock.yaml ./

# 复制源代码
COPY . .

# 注意：不在这里安装依赖，因为网络问题
# 依赖应该在宿主机上预先安装好，然后复制进来

# 生产环境镜像
FROM node:22-alpine AS production

WORKDIR /app

# 从构建阶段复制所有文件（包括 node_modules 和 dist）
COPY --from=base /app ./

# 暴露端口（使用环境变量）
EXPOSE 8118

# 健康检查（使用环境变量 PORT）
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "const port = process.env.PORT || 8118; require('http').get('http://localhost:' + port + '/api/v1', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# 使用 node 直接运行（不使用 pm2）
CMD ["node", "dist/main.js"]
