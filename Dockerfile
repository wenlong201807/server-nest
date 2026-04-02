# 生产环境镜像
FROM node:22-alpine AS production

WORKDIR /app

# 复制 package.json
COPY package.json ./

# 从宿主机复制已安装的依赖和构建产物
COPY node_modules ./node_modules
COPY dist ./dist

# 暴露端口（使用环境变量）
EXPOSE 8118

# 健康检查（使用环境变量 PORT）
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "const port = process.env.PORT || 8118; require('http').get('http://localhost:' + port + '/api/v1', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# 使用 node 直接运行（不使用 pm2）
CMD ["node", "dist/main.js"]
