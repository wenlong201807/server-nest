# Jenkins Pipeline 高级语法

## tools 指令

指定构建过程中使用的工具。

```groovy
pipeline {
    agent any
    
    tools {
        // Node.js 工具
        nodejs 'NodeJS-20'
        
        // Maven 工具
        maven 'Maven-3.8'
        
        // JDK 工具
        jdk 'JDK-17'
        
        // Gradle 工具
        gradle 'Gradle-7.5'
    }
    
    stages {
        stage('Build') {
            steps {
                sh 'node --version'
                sh 'npm --version'
            }
        }
    }
}
```

**注意事项：**
- 工具名称必须在 Jenkins 全局工具配置中预先定义
- 路径：Jenkins 管理 → 全局工具配置 → 对应工具配置

## options 指令

配置 Pipeline 的全局选项。

```groovy
pipeline {
    agent any
    
    options {
        // 保留最近的构建记录
        buildDiscarder(logRotator(
            numToKeepStr: '10',        // 保留最近 10 个构建
            daysToKeepStr: '30',       // 保留 30 天内的构建
            artifactNumToKeepStr: '5'  // 保留 5 个构建的产物
        ))
        
        // 禁用并发构建
        disableConcurrentBuilds()
        
        // 设置超时时间
        timeout(time: 1, unit: 'HOURS')
        
        // 添加时间戳到控制台输出
        timestamps()
        
        // 跳过默认的 checkout
        skipDefaultCheckout()
        
        // 重试次数
        retry(3)
        
        // 静默期（防止频繁触发）
        quietPeriod(5)
        
        // 禁用自动触发
        disableResume()
        
        // 保留 stash
        preserveStashes(buildCount: 5)
    }
    
    stages {
        stage('Build') {
            steps {
                echo 'Building...'
            }
        }
    }
}
```

## triggers 指令

配置自动触发构建的条件。

```groovy
pipeline {
    agent any
    
    triggers {
        // 定时触发（Cron 语法）
        cron('H 2 * * *')  // 每天凌晨 2 点左右
        
        // 轮询 SCM
        pollSCM('H/5 * * * *')  // 每 5 分钟检查一次代码变更
        
        // 上游项目触发
        upstream(
            upstreamProjects: 'project-a,project-b',
            threshold: hudson.model.Result.SUCCESS
        )
        
        // GitHub webhook 触发
        githubPush()
    }
    
    stages {
        stage('Build') {
            steps {
                echo 'Building...'
            }
        }
    }
}
```

**Cron 语法说明：**
```
分钟 小时 日 月 星期
*    *   *  *  *

示例：
H 2 * * *           每天凌晨 2 点左右
H H(0-7) * * *      每天 0-7 点之间
H/15 * * * *        每 15 分钟
H H * * 1-5         工作日每天一次
```

## input 指令

在 Pipeline 执行过程中等待用户输入。

```groovy
pipeline {
    agent any
    
    stages {
        stage('Build') {
            steps {
                echo 'Building...'
            }
        }
        
        stage('Deploy to Production') {
            steps {
                // 简单确认
                input message: '是否部署到生产环境？', ok: '确认部署'
                
                // 带参数的输入
                script {
                    def userInput = input(
                        message: '选择部署选项',
                        parameters: [
                            choice(
                                name: 'ENVIRONMENT',
                                choices: ['staging', 'production'],
                                description: '选择环境'
                            ),
                            booleanParam(
                                name: 'BACKUP',
                                defaultValue: true,
                                description: '是否备份'
                            )
                        ]
                    )
                    
                    echo "Environment: ${userInput.ENVIRONMENT}"
                    echo "Backup: ${userInput.BACKUP}"
                }
                
                echo 'Deploying to production...'
            }
        }
    }
}
```

## post 指令

定义 Pipeline 或 stage 执行后的操作。

```groovy
pipeline {
    agent any
    
    stages {
        stage('Build') {
            steps {
                echo 'Building...'
            }
            post {
                success {
                    echo 'Build stage succeeded'
                }
                failure {
                    echo 'Build stage failed'
                }
            }
        }
    }
    
    post {
        // 总是执行
        always {
            echo 'Pipeline finished'
            cleanWs()  // 清理工作空间
        }
        
        // 成功时执行
        success {
            echo '✅ Pipeline succeeded'
            script {
                def port = ['dev': '8118', 'staging': '8119', 'prod': '8120'][params.ENVIRONMENT]
                echo "🌐 API 访问地址: http://localhost:${port}"
            }
        }
        
        // 失败时执行
        failure {
            echo '❌ Pipeline failed'
            sh 'pm2 logs --lines 100 --nostream || true'
        }
        
        // 不稳定时执行（测试失败但构建成功）
        unstable {
            echo '⚠️ Pipeline unstable'
        }
        
        // 状态改变时执行
        changed {
            echo 'Pipeline status changed'
        }
        
        // 从失败恢复时执行
        fixed {
            echo 'Pipeline fixed'
        }
        
        // 从成功变为失败时执行
        regression {
            echo 'Pipeline regressed'
        }
        
        // 被中止时执行
        aborted {
            echo 'Pipeline aborted'
        }
        
        // 清理操作
        cleanup {
            echo 'Cleaning up...'
        }
    }
}
```

## 实际项目案例：完整的 post 配置

```groovy
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
```

## 凭证管理

### 使用凭证

```groovy
pipeline {
    agent any
    
    stages {
        stage('Deploy') {
            steps {
                // 使用用户名密码凭证
                withCredentials([
                    usernamePassword(
                        credentialsId: 'github-credentials',
                        usernameVariable: 'USERNAME',
                        passwordVariable: 'PASSWORD'
                    )
                ]) {
                    sh '''
                        git config user.name "$USERNAME"
                        git config user.password "$PASSWORD"
                    '''
                }
                
                // 使用 SSH 密钥
                withCredentials([
                    sshUserPrivateKey(
                        credentialsId: 'ssh-key',
                        keyFileVariable: 'SSH_KEY'
                    )
                ]) {
                    sh 'ssh -i $SSH_KEY user@server "deploy.sh"'
                }
                
                // 使用 Secret Text
                withCredentials([
                    string(
                        credentialsId: 'api-token',
                        variable: 'API_TOKEN'
                    )
                ]) {
                    sh 'curl -H "Authorization: Bearer $API_TOKEN" https://api.example.com'
                }
                
                // 使用 Secret File
                withCredentials([
                    file(
                        credentialsId: 'config-file',
                        variable: 'CONFIG_FILE'
                    )
                ]) {
                    sh 'cp $CONFIG_FILE /etc/app/config.json'
                }
            }
        }
    }
}
```

## 工作空间管理

### stash 和 unstash

在不同 agent 之间共享文件。

```groovy
pipeline {
    agent none
    
    stages {
        stage('Build') {
            agent { label 'linux' }
            steps {
                sh 'npm run build'
                
                // 保存构建产物
                stash(
                    name: 'build-artifacts',
                    includes: 'dist/**/*'
                )
            }
        }
        
        stage('Test') {
            agent { label 'test-server' }
            steps {
                // 恢复构建产物
                unstash 'build-artifacts'
                
                sh 'npm test'
            }
        }
        
        stage('Deploy') {
            agent { label 'production' }
            steps {
                unstash 'build-artifacts'
                
                sh 'pm2 restart app'
            }
        }
    }
}
```

### archiveArtifacts

归档构建产物。

```groovy
stage('Archive') {
    steps {
        // 归档文件
        archiveArtifacts(
            artifacts: 'dist/**/*',
            allowEmptyArchive: false,
            fingerprint: true,
            onlyIfSuccessful: true
        )
    }
}
```

### cleanWs

清理工作空间。

```groovy
post {
    always {
        cleanWs(
            deleteDirs: true,
            patterns: [
                [pattern: 'node_modules', type: 'INCLUDE'],
                [pattern: '.git', type: 'EXCLUDE']
            ]
        )
    }
}
```

## 通知

### 邮件通知

```groovy
post {
    success {
        emailext(
            subject: "✅ 构建成功: ${env.JOB_NAME} - ${env.BUILD_NUMBER}",
            body: """
                <p>构建成功！</p>
                <p>项目: ${env.JOB_NAME}</p>
                <p>构建号: ${env.BUILD_NUMBER}</p>
                <p>查看详情: ${env.BUILD_URL}</p>
            """,
            to: 'team@example.com',
            mimeType: 'text/html'
        )
    }
    
    failure {
        emailext(
            subject: "❌ 构建失败: ${env.JOB_NAME} - ${env.BUILD_NUMBER}",
            body: """
                <p>构建失败！</p>
                <p>项目: ${env.JOB_NAME}</p>
                <p>构建号: ${env.BUILD_NUMBER}</p>
                <p>查看详情: ${env.BUILD_URL}</p>
            """,
            to: 'team@example.com',
            mimeType: 'text/html'
        )
    }
}
```

### Slack 通知

```groovy
post {
    success {
        slackSend(
            color: 'good',
            message: "✅ 构建成功: ${env.JOB_NAME} - ${env.BUILD_NUMBER}\n查看: ${env.BUILD_URL}"
        )
    }
    
    failure {
        slackSend(
            color: 'danger',
            message: "❌ 构建失败: ${env.JOB_NAME} - ${env.BUILD_NUMBER}\n查看: ${env.BUILD_URL}"
        )
    }
}
```

## 矩阵构建

在多个配置下并行执行。

```groovy
pipeline {
    agent none
    
    stages {
        stage('Test') {
            matrix {
                agent any
                axes {
                    axis {
                        name 'NODE_VERSION'
                        values '18', '20', '22'
                    }
                    axis {
                        name 'OS'
                        values 'linux', 'windows', 'mac'
                    }
                }
                stages {
                    stage('Build and Test') {
                        steps {
                            echo "Testing on Node ${NODE_VERSION} - ${OS}"
                            sh "nvm use ${NODE_VERSION}"
                            sh 'npm test'
                        }
                    }
                }
            }
        }
    }
}
```

## 共享库

使用共享库复用代码。

### 定义共享库

```groovy
// vars/deployApp.groovy
def call(String environment) {
    echo "Deploying to ${environment}"
    
    sh """
        pm2 restart app-${environment}
    """
}
```

### 使用共享库

```groovy
@Library('my-shared-library') _

pipeline {
    agent any
    
    stages {
        stage('Deploy') {
            steps {
                deployApp('production')
            }
        }
    }
}
```

## 最佳实践

1. **使用 options 限制构建历史**：避免占用过多磁盘空间
2. **添加超时设置**：防止构建无限期挂起
3. **使用 post 清理资源**：确保工作空间干净
4. **合理使用 stash**：在不同 agent 间共享文件
5. **使用凭证管理**：不要在代码中硬编码密码
6. **添加通知**：及时了解构建状态
7. **使用 input 确认关键操作**：防止误操作
8. **合理使用并行执行**：提高构建速度
