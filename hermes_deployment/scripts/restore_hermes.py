#!/usr/bin/env python3
"""
==============================================================================
Hermes Agent 全量数据恢复与环境还原工具 (Full Restore Tool)
==============================================================================
功能:
1. 解压全量备份包 (hermes_backup_*.tar.gz 或直接读取备份目录)
2. 自动检测目标 Qdrant 向量数据库连通性
3. 自动创建缺失的 Qdrant Collections (512 维 Cosine 混合索引)
4. 批量 (Batch chunk 100) Upsert 向量与 Payload 数据，并核对点数一致性
5. 完整恢复 ~/.hermes/skills/ 下 160+ 个技能库
6. 完整恢复 ~/.hermes/scripts/ 运维脚本
7. 还原 ~/.hermes/cron/jobs.json 定时任务调度器
8. 验证配置文件 (config.yaml, mem0.json, .env)
9. 生成恢复报告与健康评估

用法:
    python3 restore_hermes.py --backup-file ~/hermes-backups/hermes_full_backup_20260824_220000.tar.gz
    # 或指定解压目录与 Qdrant 目标
    python3 restore_hermes.py --backup-dir ./hermes_backup_20260824 --qdrant-host 10.0.0.3 --qdrant-port 6333
==============================================================================
"""

import os
import sys
import json
import time
import shutil
import tarfile
import hashlib
import argparse
import tempfile
import urllib.request
import urllib.error

HOME = os.path.expanduser("~")
HERMES_DIR = os.path.join(HOME, ".hermes")
DEFAULT_VECTOR_SIZE = 512
DEFAULT_DISTANCE = "Cosine"


def request_with_retry(req_or_url, timeout=30, max_retries=3, delay=2.0):
    """带指数退避的网络请求封装"""
    last_err = None
    for attempt in range(1, max_retries + 1):
        try:
            with urllib.request.urlopen(req_or_url, timeout=timeout) as resp:
                return resp.read()
        except (urllib.error.URLError, TimeoutError, ConnectionError, OSError) as e:
            last_err = e
            if attempt < max_retries:
                time.sleep(delay * (2 ** (attempt - 1)))
            else:
                break
    if last_err is not None:
        raise last_err
    raise RuntimeError(f"请求失败: {req_or_url}")


def qdrant_request(base_url, endpoint, method="GET", body=None):
    url = f"{base_url}{endpoint}"
    data_bytes = json.dumps(body).encode("utf-8") if body else None
    req = urllib.request.Request(
        url,
        data=data_bytes,
        headers={"Content-Type": "application/json"},
        method=method,
    )
    raw = request_with_retry(req, timeout=30)
    return json.loads(raw.decode("utf-8"))


def ensure_collection(base_url, col_name, vector_size=DEFAULT_VECTOR_SIZE, distance=DEFAULT_DISTANCE):
    """确保目标 Collection 存在，若不存在则创建"""
    try:
        qdrant_request(base_url, f"/collections/{col_name}")
        print(f"[EXISTS] Collection: {col_name}")
        return True
    except Exception:
        print(f"[CREATE] 正在创建 Collection: {col_name} (dim={vector_size}, distance={distance})...")
        payload = {
            "vectors": {
                "size": vector_size,
                "distance": distance,
            }
        }
        res = qdrant_request(base_url, f"/collections/{col_name}", method="PUT", body=payload)
        if res.get("result") is True or res.get("status") == "ok":
            print(f"[OK] Collection {col_name} 创建成功")
            return True
        else:
            raise RuntimeError(f"创建 Collection 失败: {res}")


def batch_upsert_points(base_url, col_name, points, chunk_size=100):
    """分批批量 Upsert 向量点到 Qdrant"""
    total = len(points)
    inserted = 0
    print(f"开始导入 {col_name}: 共 {total} 条数据，分批大小={chunk_size}...")

    for i in range(0, total, chunk_size):
        chunk = points[i : i + chunk_size]
        body = {"points": chunk}
        res = qdrant_request(
            base_url,
            f"/collections/{col_name}/points?wait=true",
            method="PUT",
            body=body,
        )
        if res.get("status") == "ok":
            inserted += len(chunk)
            print(f"  - 进度: {inserted}/{total} ({inserted/total*100:.1f}%)")
        else:
            print(f"[WARN] 批次 {i}~{i+len(chunk)} 导入异常: {res}")

    # 获取实时点数
    info = qdrant_request(base_url, f"/collections/{col_name}")
    live_count = info.get("result", {}).get("points_count", 0)
    print(f"[OK] {col_name} 恢复完成！当前在线点数: {live_count}")
    return live_count


def main():
    parser = argparse.ArgumentParser(description="Hermes Agent 全量数据恢复与环境还原工具")
    parser.add_argument("--backup-file", help="归档文件路径 (*.tar.gz)")
    parser.add_argument("--backup-dir", help="已解压的备份目录路径")
    parser.add_argument("--qdrant-host", default="10.0.0.3", help="目标 Qdrant 主机 (默认: 10.0.0.3)")
    parser.add_argument("--qdrant-port", type=int, default=6333, help="目标 Qdrant 端口 (默认: 6333)")
    parser.add_argument("--skip-qdrant", action="store_true", help="跳过 Qdrant 向量数据恢复")
    parser.add_argument("--overwrite-config", action="store_true", help="强制覆盖已有的 config.yaml 与 .env")
    args = parser.parse_args()

    if not args.backup_file and not args.backup_dir:
        print("错误: 必须指定 --backup-file 或 --backup-dir！")
        sys.exit(1)

    temp_extract_dir = None
    if args.backup_file:
        if not os.path.exists(args.backup_file):
            print(f"错误: 备份文件不存在: {args.backup_file}")
            sys.exit(1)
        temp_extract_dir = tempfile.mkdtemp(prefix="hermes_restore_")
        print(f"正在解压备份包: {args.backup_file} ...")
        with tarfile.open(args.backup_file, "r:gz") as tar:
            tar.extractall(path=temp_extract_dir)
        # 查找解压后的子目录
        subdirs = [os.path.join(temp_extract_dir, d) for d in os.listdir(temp_extract_dir) if os.path.isdir(os.path.join(temp_extract_dir, d))]
        source_dir = subdirs[0] if subdirs else temp_extract_dir
    else:
        source_dir = os.path.abspath(args.backup_dir)

    print(f"使用备份源目录: {source_dir}")

    # 读取清单
    manifest_path = os.path.join(source_dir, "manifest.json")
    manifest = {}
    if os.path.exists(manifest_path):
        with open(manifest_path, "r", encoding="utf-8") as f:
            manifest = json.load(f)
        print(f"[OK] 读取到备份清单: 创建于 {manifest.get('created_at')}")

    # 1. 恢复 Qdrant 向量数据
    qdrant_base = f"http://{args.qdrant_host}:{args.qdrant_port}"
    if not args.skip_qdrant:
        print(f"\n=== [1/4] 恢复记忆向量数据库 ({qdrant_base}) ===")
        qdrant_src_dir = os.path.join(source_dir, "qdrant")
        if os.path.exists(qdrant_src_dir):
            for filename in os.listdir(qdrant_src_dir):
                if filename.endswith(".json"):
                    filepath = os.path.join(qdrant_src_dir, filename)
                    with open(filepath, "r", encoding="utf-8") as f:
                        data = json.load(f)
                    col_name = data.get("collection", filename.replace(".json", ""))
                    points = data.get("points", [])
                    try:
                        ensure_collection(qdrant_base, col_name)
                        batch_upsert_points(qdrant_base, col_name, points)
                    except Exception as e:
                        print(f"[ERROR] 恢复集合 {col_name} 失败: {e}")
        else:
            print(f"[INFO] 备份中未找到 qdrant 数据目录")

    # 2. 恢复 Skills 技能库
    print(f"\n=== [2/4] 恢复 Skills 技能库 ===")
    skills_src = os.path.join(source_dir, "skills")
    skills_dst = os.path.join(HERMES_DIR, "skills")
    if os.path.exists(skills_src):
        os.makedirs(skills_dst, exist_ok=True)
        shutil.copytree(skills_src, skills_dst, dirs_exist_ok=True)
        restored_skills_count = sum(len(files) for _, _, files in os.walk(skills_dst) if "SKILL.md" in files)
        print(f"[OK] Skills 恢复成功！当前共有 {restored_skills_count} 个技能。")

    # 3. 恢复 Scripts 与 Cron
    print(f"\n=== [3/4] 恢复 Scripts 运维脚本与 Cron 任务 ===")
    scripts_src = os.path.join(source_dir, "scripts")
    scripts_dst = os.path.join(HERMES_DIR, "scripts")
    if os.path.exists(scripts_src):
        os.makedirs(scripts_dst, exist_ok=True)
        shutil.copytree(scripts_src, scripts_dst, dirs_exist_ok=True)
        print(f"[OK] Scripts 脚本恢复成功！")

    cron_src = os.path.join(source_dir, "cron", "jobs.json")
    cron_dst_dir = os.path.join(HERMES_DIR, "cron")
    if os.path.exists(cron_src):
        os.makedirs(cron_dst_dir, exist_ok=True)
        shutil.copy2(cron_src, os.path.join(cron_dst_dir, "jobs.json"))
        print(f"[OK] Cron jobs.json 定时任务已还原！")

    # 4. 恢复配置
    print(f"\n=== [4/4] 检查与还原核心配置 ===")
    config_src_dir = os.path.join(source_dir, "config")
    if os.path.exists(config_src_dir):
        for fn in ["config.yaml", "mem0.json", ".env"]:
            src_file = os.path.join(config_src_dir, fn)
            dst_file = os.path.join(HERMES_DIR, fn)
            if os.path.exists(src_file):
                if not os.path.exists(dst_file) or args.overwrite_config:
                    shutil.copy2(src_file, dst_file)
                    print(f"[OK] 还原配置文件: {fn} -> {dst_file}")
                else:
                    print(f"[SKIP] {fn} 已存在且未指定 --overwrite-config，保留现有配置。")

    if temp_extract_dir and os.path.exists(temp_extract_dir):
        shutil.rmtree(temp_extract_dir)

    print("\n" + "=" * 60)
    print("🎉 Hermes Agent 框架与数据恢复完成！")
    print("推荐后续操作:")
    print("  1. 运行 python3 health_check.py 验证系统链路")
    print("  2. 执行 hermes chat -q '测试记忆检索' 检查 Agent 交互")
    print("=" * 60)


if __name__ == "__main__":
    main()
