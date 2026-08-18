#!/bin/bash
# =============================================================================
# 一键编译并部署导航站到甲骨文 VPS 生产环境 (https://jhsweetheart.com)
# =============================================================================

set -e

ORACLE_IP="129.146.122.202"
ORACLE_PORT="59421"
ORACLE_USER="root"
REMOTE_PATH="/usr/share/nginx/html/startpage"
LOCAL_DIR="/Users/macmini/scripts/startpage-v2"

echo "🚀 [1/3] 开始本地静态产物编译构建..."
cd "${LOCAL_DIR}"
npm run build

echo "📦 [2/3] 正在同步构建产物到甲骨文 VPS (${ORACLE_IP})..."
# 同步 dist/ 产物至生产环境静态目录
rsync -avz --delete -e "ssh -p ${ORACLE_PORT} -o StrictHostKeyChecking=no" \
  "${LOCAL_DIR}/dist/" "${ORACLE_USER}@${ORACLE_IP}:${REMOTE_PATH}/" || {
    echo "⚠️ rsync 同步出现提示，尝试 scp 备用方式传输..."
    ssh -p "${ORACLE_PORT}" "${ORACLE_USER}@${ORACLE_IP}" "mkdir -p ${REMOTE_PATH}"
    scp -P "${ORACLE_PORT}" -r "${LOCAL_DIR}/dist/"* "${ORACLE_USER}@${ORACLE_IP}:${REMOTE_PATH}/"
}

echo "🔄 [3/3] 检查并重载甲骨文 VPS Nginx 生产服务..."
ssh -p "${ORACLE_PORT}" "${ORACLE_USER}@${ORACLE_IP}" "nginx -t && systemctl reload nginx || service nginx reload"

echo "✅ 部署完成！请访问 https://jhsweetheart.com 验证！"
