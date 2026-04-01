# Jenkins Pipeline 基础语法

## Pipeline 结构

Jenkins Pipeline 使用 Groovy DSL 语法，主要有两种类型：

### 1. Declarative Pipeline（声明式，推荐）

```groovy
pipeline {
    agent any
    
    stages {
        stage('Build') {
            steps {
                echo 'Building...'
            }
        }
    }
}
```

### 2. Scripted Pipeline（脚本式）

```groovy
node {
    stage('Build') {
        echo 'Building...'
    }
}
```

## 基本结构组成

### pipeline 块

最外层容器，包含整个 Pipeline 定义。

```groovy
pipeline {
    // 所有配置都在这里
}
```

### agent

指定 Pipeline 或 stage 在哪里执行。

```groovy
pipeline {
    agent any  // 在任何可用的 agent 上执行
}
```

**常用 agent 类型：**

```groovy
// 1. 任何可用 agent
agent any

// 2. 不分配 agent（在 stage 中单独指定）
agent none

// 3. 指定标签
agent {
    label 'linux'
}

// 4. Docker 容器
agent {
    docker {
        image 'node:20'
        args '-v /tmp:/tmp'
    }
}

// 5. Kubernetes Pod
agent {
    kubernetes {
        yaml '''
apiVersion: v1
kind: Pod
spec:
  containers:
  - name: node
    image: node:20
'''
    }
}
```

### stages 和 stage

定义 Pipeline 的各个阶段。

```groovy
pipeline {
    agent any
    
    stages {
        stage('拉取代码') {
            steps {
                echo '拉取代码中...'
            }
        }
        
        stage('构建') {
            steps {
                echo '构建中...'
            }
        }
        
        stage('测试') {
            steps {
                echo '测试中...'
            }
        }
        
        stage('部署') {
            steps {
                echo '部署中...'
            }
        }
    }
}
```

### steps

定义在 stage 中执行的具体步骤。

```groovy
stage('Build') {
    steps {
        echo 'Hello World'
        sh 'npm install'
        sh 'npm run build'
    }
}
```

## 实际项目案例

从项目的 Jenkinsfile 看完整结构：

```groovy
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
                    pnpm install --frozen-lockfile
                '''
            }
        }

        stage('Build') {
            steps {
                sh 'pnpm run build'
            }
        }

        stage('部署') {
            steps {
                sh 'pm2 restart server-nest'
            }
        }
    }

    post {
        success {
            echo '✅ 部署成功'
        }
        failure {
            echo '❌ 部署失败'
        }
    }
}
```

## 常用指令

### echo

输出信息到控制台。

```groovy
steps {
    echo 'Hello World'
    echo "Environment: ${env.ENVIRONMENT}"
}
```

### sh

执行 Shell 命令（Linux/Mac）。

```groovy
steps {
    // 单行命令
    sh 'npm install'
    
    // 多行命令
    sh '''
        npm install
        npm run build
        npm test
    '''
    
    // 带返回值
    script {
        def result = sh(script: 'echo "test"', returnStdout: true).trim()
        echo "Result: ${result}"
    }
}
```

### bat

执行批处理命令（Windows）。

```groovy
steps {
    bat 'npm install'
    bat '''
        npm install
        npm run build
    '''
}
```

### script

执行 Groovy 脚本代码。

```groovy
steps {
    script {
        def version = readFile('package.json')
        echo "Version: ${version}"
        
        if (env.BRANCH_NAME == 'main') {
            echo 'Main branch'
        } else {
            echo 'Feature branch'
        }
    }
}
```

### checkout

拉取代码。

```groovy
steps {
    // 简单方式
    checkout scm
    
    // 详细配置
    checkout([
        $class: 'GitSCM',
        branches: [[name: '*/main']],
        userRemoteConfigs: [[
            url: 'https://github.com/user/repo.git',
            credentialsId: 'github-credentials'
        ]]
    ])
}
```

## 变量和参数

### 环境变量

```groovy
pipeline {
    agent any
    
    environment {
        // 全局环境变量
        PROJECT_NAME = 'my-project'
        VERSION = '1.0.0'
    }
    
    stages {
        stage('Build') {
            environment {
                // stage 级别环境变量
                BUILD_ENV = 'production'
            }
            steps {
                echo "Project: ${PROJECT_NAME}"
                echo "Version: ${VERSION}"
                echo "Build Env: ${BUILD_ENV}"
            }
        }
    }
}
```

### 内置环境变量

```groovy
steps {
    echo "Build Number: ${env.BUILD_NUMBER}"
    echo "Job Name: ${env.JOB_NAME}"
    echo "Workspace: ${env.WORKSPACE}"
    echo "Build URL: ${env.BUILD_URL}"
    echo "Node Name: ${env.NODE_NAME}"
}
```

### 参数化构建

```groovy
pipeline {
    agent any
    
    parameters {
        // 字符串参数
        string(
            name: 'BRANCH',
            defaultValue: 'main',
            description: '选择分支'
        )
        
        // 选择参数
        choice(
            name: 'ENVIRONMENT',
            choices: ['dev', 'staging', 'prod'],
            description: '选择环境'
        )
        
        // 布尔参数
        booleanParam(
            name: 'SKIP_TESTS',
            defaultValue: false,
            description: '是否跳过测试'
        )
        
        // 文本参数
        text(
            name: 'DESCRIPTION',
            defaultValue: '',
            description: '部署说明'
        )
        
        // 密码参数
        password(
            name: 'API_KEY',
            defaultValue: '',
            description: 'API密钥'
        )
    }
    
    stages {
        stage('Deploy') {
            steps {
                echo "Branch: ${params.BRANCH}"
                echo "Environment: ${params.ENVIRONMENT}"
                echo "Skip Tests: ${params.SKIP_TESTS}"
            }
        }
    }
}
```

## 条件执行

### when 指令

```groovy
stage('Deploy to Production') {
    when {
        branch 'main'
    }
    steps {
        echo 'Deploying to production'
    }
}

stage('Deploy to Staging') {
    when {
        branch 'develop'
    }
    steps {
        echo 'Deploying to staging'
    }
}

stage('Clear Cache') {
    when {
        expression { params.CLEAR_CACHE == true }
    }
    steps {
        echo 'Clearing cache'
    }
}
```

**when 条件类型：**

```groovy
// 1. 分支条件
when {
    branch 'main'
}

// 2. 环境条件
when {
    environment name: 'DEPLOY_ENV', value: 'production'
}

// 3. 表达式条件
when {
    expression { return params.SKIP_TESTS == false }
}

// 4. 多条件组合（AND）
when {
    allOf {
        branch 'main'
        environment name: 'DEPLOY_ENV', value: 'production'
    }
}

// 5. 多条件组合（OR）
when {
    anyOf {
        branch 'main'
        branch 'develop'
    }
}

// 6. 否定条件
when {
    not {
        branch 'main'
    }
}

// 7. 变更集条件
when {
    changeset "src/**/*.js"
}

// 8. 标签条件
when {
    tag "v*"
}
```

## 并行执行

```groovy
stage('Parallel Tests') {
    parallel {
        stage('Unit Tests') {
            steps {
                sh 'npm run test:unit'
            }
        }
        stage('Integration Tests') {
            steps {
                sh 'npm run test:integration'
            }
        }
        stage('E2E Tests') {
            steps {
                sh 'npm run test:e2e'
            }
        }
    }
}
```

## 错误处理

### try-catch

```groovy
steps {
    script {
        try {
            sh 'npm test'
        } catch (Exception e) {
            echo "Tests failed: ${e.message}"
            currentBuild.result = 'UNSTABLE'
        }
    }
}
```

### catchError

```groovy
steps {
    catchError(buildResult: 'SUCCESS', stageResult: 'FAILURE') {
        sh 'npm test'
    }
}
```

## 最佳实践

1. **使用声明式 Pipeline**：更易读、更易维护
2. **合理划分 stage**：每个 stage 做一件事
3. **使用环境变量**：避免硬编码
4. **参数化构建**：提高灵活性
5. **添加错误处理**：提高稳定性
6. **使用 when 条件**：避免不必要的执行
7. **添加日志输出**：便于调试
8. **使用 post 块**：处理构建后操作
