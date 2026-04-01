pipeline {
    agent any

    tools {
        nodejs 'NodeJS-24'
    }

    parameters {
        choice(name: 'ENVIRONMENT', choices: ['dev', 'staging', 'prod'], description: '选择部署环境')
        string(name: 'BRANCH', defaultValue: 'main', description: '选择部署分支')
        booleanParam(name: 'CLEAR_CACHE', defaultValue: false, description: '是否强制清除缓存（Redis）')
    }

    environment {
        PROJECT_NAME = 'server-nest'
        DEPLOY_ENV = "${params.ENVIRONMENT}"
    }

    stages {
        stage('清理工作空间') {
            steps {
                cleanWs()
            }
        }

        stage('拉取代码') {
            steps {
                script {
                    checkout([
                        $class: 'GitSCM',
                        branches: [[name: "${params.BRANCH}"]],
                        extensions: [[$class: 'CloneOption', depth: 1, shallow: true]],
                        userRemoteConfigs: [[
                            url: "https://github.com/wenlong201807/server-nest.git",
                            credentialsId: 'github-credentials'
                        ]]
                    ])
                }
            }
        }

        stage('安装依赖') {
            steps {
                sh '''
                    if ! command -v pnpm >/dev/null 2>&1; then
                        npm install -g pnpm
                    fi

                    if ! command -v pm2 >/dev/null 2>&1; then
                        npm install -g pm2
                    fi

                    if ! command -v mysql >/dev/null 2>&1; then
                        apt-get update -qq && apt-get install -y -qq default-mysql-client
                    fi

                    # 安装依赖（不跳过脚本，确保 bcrypt 等原生模块正确安装）
                    pnpm install --frozen-lockfile
                '''
            }
        }

        stage('Build') {
            steps {
                sh 'pnpm run build'
            }
        }

        stage('检查依赖服务') {
            steps {
                script {
                    def mysqlPort = ['dev': '3307', 'staging': '3308', 'prod': '3309'][params.ENVIRONMENT]
                    def redisPort = ['dev': '6383', 'staging': '6384', 'prod': '6382'][params.ENVIRONMENT]
                    def rustfsPort = ['dev': '8121', 'staging': '8122', 'prod': '8123'][params.ENVIRONMENT]

                    sh """
                        echo "检查 MySQL (host.docker.internal:${mysqlPort})..."
                        timeout 3 bash -c "</dev/tcp/host.docker.internal/${mysqlPort}" || (echo "❌ MySQL 不可用" && exit 1)

                        echo "检查 Redis (host.docker.internal:${redisPort})..."
                        timeout 3 bash -c "</dev/tcp/host.docker.internal/${redisPort}" || (echo "❌ Redis 不可用" && exit 1)

                        echo "检查 RustFS (host.docker.internal:${rustfsPort})..."
                        timeout 3 bash -c "</dev/tcp/host.docker.internal/${rustfsPort}" || (echo "❌ RustFS 不可用" && exit 1)

                        echo "✅ 所有依赖服务检查通过"
                    """
                }
            }
        }

        stage('数据库初始化') {
            steps {
                sh """
                    chmod +x scripts/init-database.sh
                    bash scripts/init-database.sh ${params.ENVIRONMENT} host.docker.internal root root123
                """
            }
        }

        stage('停止旧服务') {
            steps {
                sh "pm2 delete ${PROJECT_NAME}-${params.ENVIRONMENT} || true"
            }
        }

        stage('清除缓存') {
            when {
                expression { params.CLEAR_CACHE == true }
            }
            steps {
                script {
                    def redisPort = ['dev': '6383', 'staging': '6384', 'prod': '6382'][params.ENVIRONMENT]

                    sh """
                        echo "🗑️  开始清除 Redis 缓存..."

                        # 使用 redis-cli 清空缓存
                        if command -v redis-cli >/dev/null 2>&1; then
                            redis-cli -h host.docker.internal -p ${redisPort} FLUSHDB
                            echo "✅ Redis 缓存已清除"
                        else
                            echo "⚠️  redis-cli 未安装，跳过缓存清除"
                        fi
                    """
                }
            }
        }

        stage('启动服务') {
            steps {
                script {
                    def envConfig = [
                        'dev': [
                            port: '8118',
                            dbPort: '3307',
                            redisPort: '6383',
                            rustfsPort: '8121',
                            database: 'together_dev'
                        ],
                        'staging': [
                            port: '8119',
                            dbPort: '3308',
                            redisPort: '6384',
                            rustfsPort: '8122',
                            database: 'together_staging'
                        ],
                        'prod': [
                            port: '8120',
                            dbPort: '3309',
                            redisPort: '6382',
                            rustfsPort: '8123',
                            database: 'together_prod'
                        ]
                    ][params.ENVIRONMENT]

                    sh """
                        export NODE_ENV=${params.ENVIRONMENT}
                        export PORT=${envConfig.port}
                        export DB_HOST=host.docker.internal
                        export DB_PORT=${envConfig.dbPort}
                        export DB_USERNAME=root
                        export DB_PASSWORD=root123
                        export DB_DATABASE=${envConfig.database}
                        export REDIS_HOST=host.docker.internal
                        export REDIS_PORT=${envConfig.redisPort}
                        export REDIS_PASSWORD=
                        export RUSTFS_URL=http://host.docker.internal:${envConfig.rustfsPort}

                        pm2 start dist/main.js --name ${PROJECT_NAME}-${params.ENVIRONMENT}
                        pm2 save
                    """
                }
            }
        }

        stage('健康检查') {
            steps {
                script {
                    def port = ['dev': '8118', 'staging': '8119', 'prod': '8120'][params.ENVIRONMENT]

                    sh """
                        echo "等待服务启动..."
                        sleep 5

                        for i in 1 2 3 4 5; do
                            if curl -sf http://localhost:${port}/api/v1 >/dev/null 2>&1; then
                                echo "✅ 服务健康检查通过"
                                exit 0
                            fi
                            echo "等待服务启动... (\$i/5)"
                            sleep 2
                        done

                        echo "❌ 服务健康检查失败"
                        pm2 logs ${PROJECT_NAME}-${params.ENVIRONMENT} --lines 50 --nostream
                        exit 1
                    """
                }
            }
        }
    }

    post {
        success {
            script {
                def accessUrl = [
                    'dev': 'http://localhost:8118',
                    'staging': 'http://localhost:8119',
                    'prod': 'http://localhost:8120'
                ][params.ENVIRONMENT]

                echo "✅ 部署成功: ${PROJECT_NAME} - ${params.ENVIRONMENT} - ${params.BRANCH}"
                echo "🌐 API 访问地址: ${accessUrl}"

                sh "pm2 list"
            }
        }
        failure {
            echo "❌ 部署失败: ${PROJECT_NAME} - ${params.ENVIRONMENT}"
            sh """
                echo "查看 PM2 进程状态:"
                pm2 list || true

                echo "查看最近日志:"
                pm2 logs ${PROJECT_NAME}-${params.ENVIRONMENT} --lines 100 --nostream || true
            """
        }
    }
}