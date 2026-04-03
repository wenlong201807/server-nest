# 生产环境镜像
FROM node:22-alpine AS production

WORKDIR /app

# 复制 package.json
COPY package.json ./

# 从宿主机复制已安装的依赖和构建产物
COPY node_modules ./node_modules
COPY dist ./dist

# 复制启动脚本和 migration 文件
COPY scripts/docker-entrypoint.sh ./scripts/
RUN chmod +x ./scripts/docker-entrypoint.sh

# 暴露端口（使用环境变量）
EXPOSE 8130

# 健康检查（使用环境变量 APP_PORT）
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "const port = process.env.APP_PORT || 8130; require('http').get('http://localhost:' + port + '/api/v1', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# 使用启动脚本（自动运行 migration）
CMD ["./scripts/docker-entrypoint.sh"]

# 快速验证配置是否正确
# ENV=prod docker-compose up -d app
