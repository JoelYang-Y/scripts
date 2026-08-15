# Qdrant-Mem0 - AI 长期记忆向量数据库

Qdrant 是专为 AI Agent（Hermes Agent / Mem0）提供长期记忆存储的向量搜索引擎。支持 Dense 密集向量与 BM25 稀疏向量的混合检索（Hybrid Search）。

## 端口与访问

- **REST API 端点**: `http://<NAS_IP>:6333`
- **Web Dashboard**: `http://<NAS_IP>:6333/dashboard`
- **gRPC 端口**: `6334`

## 目录结构

```text
qdrant-mem0/
├── docker-compose.yml
└── qdrant_data/           # 向量集合、段文件与 Payload 存储目录
    ├── aliases
    └── collections/
        └── hermes_memories_v2_hybrid/
```

## 健康检查与操作

```bash
# 检查 Collections 状态
curl -s http://10.0.0.3:6333/collections

# 查看集合详情
curl -s http://10.0.0.3:6333/collections/hermes_memories_v2_hybrid
```

## 注意事项

- 重启 Qdrant 容器会导致 Hermes Agent 短暂无法存取记忆，日常尽量保持容器常驻运行。
- 数据定期通过 Mac 端脚本备份至本地及每周自动冷备。
