# 本地构建测试脚本

## 快速使用

```bash
# 运行测试
./scripts/test-build.sh
```

## 脚本功能

该脚本会模拟 Jenkins 的构建流程，包括：

1. **清理环境** - 清理 pnpm 缓存、node_modules、dist、pnpm-lock.yaml
2. **安装依赖** - 使用 `pnpm install --no-frozen-lockfile`
3. **检查 bcrypt** - 确认没有 bcrypt 依赖
4. **构建项目** - 运行 `pnpm run build`
5. **检查构建产物** - 确认 dist 中没有 bcrypt 引用
6. **检查 crypto 使用** - 确认正确使用 PasswordUtil
7. **测试启动** - 尝试启动服务（可能因数据库连接失败，这是正常的）

## 预期输出

```
🧪 开始本地复现 Jenkins 构建...
1️⃣ 清理环境...
2️⃣ 安装依赖...
3️⃣ 检查 bcrypt...
✅ 没有 bcrypt 依赖
4️⃣ 构建项目...
5️⃣ 检查构建产物...
✅ 构建产物中没有 bcrypt 引用
6️⃣ 检查 crypto 使用...
✅ 正确使用 PasswordUtil
7️⃣ 测试启动...
❌ 服务启动失败（可能是数据库连接问题，这是正常的）
ℹ️  如果只是数据库连接失败，说明代码本身没问题

📊 环境信息：
Node.js: v20.x.x
pnpm: 10.x.x
pnpm store: /Users/xxx/.pnpm-store

🎉 构建测试完成！
```

## 故障排查

### 如果发现 bcrypt 依赖

脚本会显示：
```
❌ 发现 bcrypt 依赖！
依赖来源：
<依赖树信息>
```

**解决方案**：
1. 检查是否有包间接依赖了 bcrypt
2. 使用 `pnpm why bcrypt` 查看依赖来源
3. 考虑替换或移除该依赖包

### 如果构建产物中有 bcrypt 引用

脚本会显示：
```
❌ 构建产物中发现 bcrypt 引用！
<文件路径和行号>
```

**解决方案**：
1. 检查源代码是否还有 `import/require bcrypt`
2. 确认是否正确使用 `PasswordUtil`
3. 清理 dist 目录后重新构建

### 服务启动失败

如果错误是数据库连接失败，这是正常的（本地可能没有运行 MySQL/Redis）。

如果是其他错误，检查：
```bash
# 查看详细错误
node dist/main.js
```

## 与 Jenkins 对比

| 项目 | 本地 | Jenkins |
|------|------|---------|
| Node.js | 本地版本 | NodeJS-24 |
| pnpm | 本地版本 | 全局安装 |
| pnpm store | `~/.pnpm-store` | `/var/jenkins_home/.pnpm-store` |
| 工作目录 | 项目根目录 | `/var/jenkins_home/workspace/server-nest` |

## 手动测试步骤

如果需要手动测试：

```bash
# 1. 清理
pnpm store prune
rm -rf node_modules dist pnpm-lock.yaml

# 2. 安装
pnpm install --no-frozen-lockfile

# 3. 检查
ls node_modules/.pnpm/ | grep bcrypt

# 4. 构建
pnpm run build

# 5. 检查构建产物
grep -r "bcrypt" dist/

# 6. 启动
node dist/main.js
```

## 相关文档

- [Jenkins 部署操作手册](./jenkins-nestjs-exec.md)
- [架构分析](./architecture-analysis.md)
- [重构方案](./refactor-plan.md)
