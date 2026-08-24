#!/usr/bin/env bash
# ==============================================================================
# Qdrant 向量数据库一键部署与健康检查脚本
# 架构: 专为 Mem0 / Hermes Agent 长期记忆提供 Dense+BM25 混合向量检索
# ==============================================================================

set -e

WORK_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
QDRANT_DIR="${WORK_DIR}/../qdrant_service"

echo "=== [1/3] 准备 Qdrant 运行目录 ==="
mkdir -p "${QDRANT_DIR}/qdrant_data"

cat << 'EOF' > "${QDRANT_DIR}/docker-compose.yml"
services:
  qdrant:
    image: qdrant/qdrant:latest
    container_name: qdrant-mem0
    restart: unless-stopped
    user: "0:0"
    ports:
      - "6333:6333"
      - "6334:6334"
    volumes:
      - ./qdrant_data:/qdrant/storage
    environment:
      - TZ=Asia/Shanghai
      - RUN_MODE=production
EOF

echo "已生成 Docker Compose 配置: ${QDRANT_DIR}/docker-compose.yml"

echo ""
echo "=== [2/3] 启动 Qdrant 服务 ==="
cd "${QDRANT_DIR}"
docker compose up -d

echo ""
echo "=== [3/3] 健康检查与连通性验证 ==="
echo "等待服务就绪..."
for i in {1..15}; do
    if curl -s http://127.0.0.1:6333/readyz >/dev/null 2>&1 || curl -s http://127.0.0.1:6333/collections >/dev/null 2>&1; then
        echo "[OK] Qdrant 向量数据库已就绪！"
        echo "REST API 端点: http://127.0.0.1:6333"
        echo "Web 控制台: http://127.0.0.1:6333/dashboard"
        exit 0
    fi
    sleep 1
done

echo "[WARN] Qdrant 启动超时，请检查 docker logs qdrant-mem0"
exit 1
