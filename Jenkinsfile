pipeline {
    agent any

    tools {
        nodejs 'NodeJS-24'
    }

    parameters {
        choice(name: 'ENVIRONMENT', choices: ['dev', 'staging', 'prod'], description: '选择部署环境')
        string(name: 'BRANCH', defaultValue: 'main', description: '选择部署分支')
    }

    environment {
        PROJECT_NAME = 'server-nest'
    }

    stages {
        stage('拉取代码') {
            steps {
                script {
                    checkout([
                        $class: 'GitSCM',
                        branches: [[name: "${BRANCH}"]],
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

        stage('停止旧服务') {
            steps {
                sh 'pm2 delete ${PROJECT_NAME}-${params.ENVIRONMENT} || true'
            }
        }

        stage('启动服务') {
            steps {
                sh '''
                    set -a
                    export NODE_ENV=$ENVIRONMENT
                    case $ENVIRONMENT in
                        dev)
                            export PORT=8118
                            export DB_HOST=host.docker.internal
                            export DB_PORT=3307
                            export DB_USERNAME=root
                            export DB_PASSWORD=root123
                            export DB_DATABASE=together_dev
                            export REDIS_HOST=host.docker.internal
                            export REDIS_PORT=6383
                            export REDIS_PASSWORD=
                            export RUSTFS_URL=http://host.docker.internal:8121
                            ;;
                        staging)
                            export PORT=8119
                            export DB_HOST=host.docker.internal
                            export DB_PORT=3308
                            export DB_USERNAME=root
                            export DB_PASSWORD=root123
                            export DB_DATABASE=together_staging
                            export REDIS_HOST=host.docker.internal
                            export REDIS_PORT=6384
                            export REDIS_PASSWORD=
                            export RUSTFS_URL=http://host.docker.internal:8122
                            ;;
                        prod)
                            export PORT=8120
                            export DB_HOST=host.docker.internal
                            export DB_PORT=3309
                            export DB_USERNAME=root
                            export DB_PASSWORD=root123
                            export DB_DATABASE=together_prod
                            export REDIS_HOST=host.docker.internal
                            export REDIS_PORT=6382
                            export REDIS_PASSWORD=
                            export RUSTFS_URL=http://host.docker.internal:8123
                            ;;
                    esac
                    set +a
                    pm2 start dist/main.js --name ${PROJECT_NAME}-${params.ENVIRONMENT}
                    pm2 save
                '''
            }
        }

        stage('健康检查') {
            steps {
                sleep 5
                sh '''
                    PORT=$ENVIRONMENT
                    case $ENVIRONMENT in
                        dev) PORT=8118 ;;
                        staging) PORT=8119 ;;
                        prod) PORT=8120 ;;
                    esac
                    
                    for i in 1 2 3 4 5; do
                        if curl -sf http://localhost:$PORT/api/v1 >/dev/null 2>&1; then
                            echo "✅ 服务健康检查通过"
                            exit 0
                        fi
                        echo "等待服务启动... ($i/5)"
                        sleep 2
                    done
                    echo "❌ 服务健康检查失败"
                    exit 1
                '''
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
            }
        }
        failure {
            echo "❌ 部署失败: ${PROJECT_NAME} - ${params.ENVIRONMENT}"
        }
    }
}