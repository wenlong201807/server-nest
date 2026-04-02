# 构建阶段
FROM node:22-alpine AS builder

# 安装 pnpm
RUN npm install -g pnpm

# 设置工作目录
WORKDIR /app

# 复制 package.json 和 pnpm-lock.yaml
COPY package.json pnpm-lock.yaml ./

# 安装依赖
RUN pnpm install --frozen-lockfile

# 复制源代码
COPY . .

# 构建项目
RUN pnpm run build

# 生产环境镜像
FROM node:22-alpine AS production

# 安装 pnpm
RUN npm install -g pnpm

WORKDIR /app

# 复制 package.json 和 pnpm-lock.yaml
COPY package.json pnpm-lock.yaml ./

# 只安装生产依赖
RUN pnpm install --prod --frozen-lockfile

# 从构建阶段复制编译后的代码
COPY --from=builder /app/dist ./dist

# 暴露端口（使用环境变量）
EXPOSE 8118

# 健康检查（使用环境变量 PORT）
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "const port = process.env.PORT || 8118; require('http').get('http://localhost:' + port + '/api/v1', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# 使用 node 直接运行（不使用 pm2）
CMD ["node", "dist/main.js"]
