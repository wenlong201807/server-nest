# server-nest/Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

# 复制依赖文件
COPY package*.json ./
RUN npm ci --only=production

# 复制源代码
COPY . .

# 构建
RUN npm run build

# 运行镜像
FROM node:18-alpine

WORKDIR /app

# 复制依赖
COPY --from=builder /app/node_modules ./node_modules
# 复制构建产物
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./

# 创建上传目录
RUN mkdir -p uploads

EXPOSE 3000

CMD ["node", "dist/main"]
