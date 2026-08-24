#!/usr/bin/env bash
# ==============================================================================
# Hermes Agent 运行环境一键初始化脚本
# 适用系统: macOS (Darwin) / Linux (Ubuntu/Debian/CentOS)
# ==============================================================================

set -e

echo "=== [1/5] 检查基础系统依赖 ==="
OS_TYPE="$(uname -s)"
echo "当前操作系统: ${OS_TYPE}"

# 检查 Python 3.11+
if command -v python3 >/dev/null 2>&1; then
    PY_VER=$(python3 -c 'import sys; print(".".join(map(str, sys.version_info[:2])))')
    echo "发现 Python 版本: ${PY_VER}"
else
    echo "错误: 未检测到 Python3，请先安装 Python 3.11 或更高版本！"
    exit 1
fi

# 检查 Git
if ! command -v git >/dev/null 2>&1; then
    echo "错误: 未检测到 Git，请先安装 Git！"
    exit 1
fi

# 检查 Docker (可选但推荐)
if command -v docker >/dev/null 2>&1; then
    echo "发现 Docker: $(docker --version)"
else
    echo "提示: 未检测到 Docker。若在当前宿主机运行 Qdrant 记忆数据库，请先安装 Docker。"
fi

echo ""
echo "=== [2/5] 初始化 ~/.hermes 目录结构 ==="
HERMES_DIR="${HOME}/.hermes"
mkdir -p "${HERMES_DIR}/skills"
mkdir -p "${HERMES_DIR}/scripts"
mkdir -p "${HERMES_DIR}/cron"
mkdir -p "${HERMES_DIR}/logs"
mkdir -p "${HERMES_DIR}/backups"
mkdir -p "${HERMES_DIR}/memories"
echo "已建立 Hermes 基础目录: ${HERMES_DIR}"

echo ""
echo "=== [3/5] 安装 Python 核心依赖库 ==="
# 推荐使用 pip 或 uv
PIP_CMD="pip3"
if command -v uv >/dev/null 2>&1; then
    PIP_CMD="uv pip"
fi

echo "使用 ${PIP_CMD} 安装依赖..."
${PIP_CMD} install --upgrade \
    mem0ai \
    qdrant-client \
    pyyaml \
    requests \
    tavily-python \
    urllib3

echo ""
echo "=== [4/5] 安装 / 检查 Hermes Agent CLI ==="
if command -v hermes >/dev/null 2>&1; then
    echo "Hermes CLI 已安装: $(hermes --version || true)"
else
    echo "正在从官方安装脚本安装 Hermes Agent..."
    curl -fsSL https://raw.githubusercontent.com/NousResearch/hermes-agent/main/scripts/install.sh | bash
fi

echo ""
echo "=== [5/5] 初始化完成 ==="
echo "请继续执行以下步骤:"
echo "1. 运行 deploy_qdrant.sh 启动 Qdrant 向量数据库（或连接已有 NAS Qdrant）"
echo "2. 复制 config 目录下的配置模板至 ~/.hermes/ 并填入 API Key"
echo "3. 运行 restore_hermes.py 一键恢复记忆向量与 Skills 技能库"
echo "4. 运行 health_check.py 验证全系统健康度"
