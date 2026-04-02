# Node.js 基础镜像
FROM node:20-alpine AS base

# 安装 pnpm
RUN npm install -g pnpm pm2

# 设置工作目录
WORKDIR /app

# 复制依赖文件
COPY package.json pnpm-lock.yaml ./

# 安装依赖
RUN pnpm install --frozen-lockfile

# 复制源代码
COPY . .

# 构建应用
RUN pnpm run build

# 生产环境镜像
FROM node:20-alpine AS production

# 安装 pnpm 和 pm2
RUN npm install -g pnpm pm2

WORKDIR /app

# 复制依赖文件
COPY package.json pnpm-lock.yaml ./

# 只安装生产依赖
RUN pnpm install --prod --frozen-lockfile

# 从构建阶段复制构建产物
COPY --from=base /app/dist ./dist

# 暴露端口
EXPOSE 8118

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8118/api/v1', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# 启动应用
CMD ["pm2-runtime", "start", "dist/main.js", "--name", "server-nest"]
