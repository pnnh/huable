# 使用官方 Node 镜像（dev 版本包含更多工具）
FROM node:22-bookworm-slim AS base

# 安装系统依赖（Next.js 常用）
RUN apt-get update && apt-get install -y \
    curl \
    git \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 复制 package 文件（利用 Docker 缓存）
COPY package*.json ./
COPY pnpm-lock.yaml* ./
COPY yarn.lock* ./

# 根据包管理器安装依赖
RUN if [ -f pnpm-lock.yaml ]; then \
        corepack enable pnpm && pnpm install --frozen-lockfile; \
    elif [ -f yarn.lock ]; then \
        corepack enable yarn && yarn install --frozen-lockfile; \
    else \
        npm ci --ignore-scripts; \
    fi

# 切换到非 root 用户
USER node

# 暴露端口
EXPOSE 3000

# 开发命令（docker-compose 中会覆盖）
CMD ["npm", "run", "dev"]