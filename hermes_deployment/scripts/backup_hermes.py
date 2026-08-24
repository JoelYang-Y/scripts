#!/usr/bin/env python3
"""
==============================================================================
Hermes Agent 全量备份与数据导出工具 (Full Backup Tool)
==============================================================================
功能:
1. 记忆系统: 从 Qdrant REST API 导出全量向量集合 (含 Dense 向量与完整 Payload)
2. 技能系统: 全量递归打包 ~/.hermes/skills/ 下所有技能
3. 运维脚本: 全量打包 ~/.hermes/scripts/
4. 任务调度: 导出 ~/.hermes/cron/jobs.json
5. 核心配置: 备份 config.yaml, mem0.json, .env
6. 生成标准归档包 hermes_backup_<TIMESTAMP>.tar.gz 及 SHA256 校验清单

用法:
    python3 backup_hermes.py [--qdrant-host 10.0.0.3] [--qdrant-port 6333] [--out-dir ~/hermes-backups]
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
import datetime
import urllib.request
import urllib.error

HOME = os.path.expanduser("~")
HERMES_DIR = os.path.join(HOME, ".hermes")
DEFAULT_COLLECTIONS = [
    "hermes_memories_v2_hybrid",
    "hermes_memories_v2_hybrid_entities",
]


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


def scroll_all_points(base_url, collection_name):
    """全量 Scroll 导出集合内全部点 (向量 + Payload)"""
    points = []
    offset = None
    while True:
        body = {"limit": 100, "with_payload": True, "with_vector": True}
        if offset is not None:
            body["offset"] = offset
        req = urllib.request.Request(
            f"{base_url}/collections/{collection_name}/points/scroll",
            data=json.dumps(body).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        raw_data = request_with_retry(req, timeout=30)
        data = json.loads(raw_data.decode("utf-8"))
        result = data.get("result", {})
        batch = result.get("points", [])
        points.extend(batch)
        offset = result.get("next_page_offset")
        if offset is None or not batch:
            break
    return points


def get_file_sha256(filepath):
    h = hashlib.sha256()
    with open(filepath, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def main():
    parser = argparse.ArgumentParser(description="Hermes Agent 全量数据备份与导出工具")
    parser.add_argument("--qdrant-host", default="10.0.0.3", help="Qdrant 数据库主机地址 (默认: 10.0.0.3)")
    parser.add_argument("--qdrant-port", type=int, default=6333, help="Qdrant REST API 端口 (默认: 6333)")
    parser.add_argument("--out-dir", default=os.path.join(HOME, "hermes-backups"), help="备份输出根目录")
    parser.add_argument("--skip-qdrant", action="store_true", help="跳过 Qdrant 向量数据库备份")
    args = parser.parse_args()

    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_temp_dir = os.path.join(args.out_dir, f"hermes_raw_{timestamp}")
    os.makedirs(backup_temp_dir, exist_ok=True)

    manifest = {
        "version": "1.0",
        "created_at": timestamp,
        "platform": sys.platform,
        "collections": {},
        "skills_count": 0,
        "cron_jobs_count": 0,
        "files": {},
    }

    print(f"=== [1/5] 开始导出记忆系统 (Qdrant) ===")
    qdrant_base = f"http://{args.qdrant_host}:{args.qdrant_port}"
    qdrant_out_dir = os.path.join(backup_temp_dir, "qdrant")
    os.makedirs(qdrant_out_dir, exist_ok=True)

    if not args.skip_qdrant:
        for col in DEFAULT_COLLECTIONS:
            try:
                print(f"正在从 {qdrant_base} 导出集合: {col} ...")
                info_raw = request_with_retry(f"{qdrant_base}/collections/{col}", timeout=15)
                info = json.loads(info_raw.decode("utf-8"))
                live_count = info.get("result", {}).get("points_count", 0)

                points = scroll_all_points(qdrant_base, col)
                col_file = os.path.join(qdrant_out_dir, f"{col}.json")
                with open(col_file, "w", encoding="utf-8") as f:
                    json.dump(
                        {
                            "collection": col,
                            "points_count": len(points),
                            "exported_at": timestamp,
                            "points": points,
                        },
                        f,
                        ensure_ascii=False,
                    )
                manifest["collections"][col] = {
                    "live_count": live_count,
                    "backed_up_count": len(points),
                    "file": f"qdrant/{col}.json",
                    "sha256": get_file_sha256(col_file),
                }
                print(f"[OK] {col}: 在线点数={live_count}, 导出点数={len(points)}")
            except Exception as e:
                print(f"[WARN] 导出集合 {col} 异常: {e}")
                manifest["collections"][col] = {"error": str(e)}
    else:
        print("[SKIP] 用户指定跳过 Qdrant 备份")

    print(f"\n=== [2/5] 备份 Skills 技能库 ===")
    skills_src = os.path.join(HERMES_DIR, "skills")
    skills_dst = os.path.join(backup_temp_dir, "skills")
    if os.path.exists(skills_src):
        shutil.copytree(skills_src, skills_dst, dirs_exist_ok=True)
        # 统计 skills 数量
        skills_count = sum(len(files) for _, _, files in os.walk(skills_dst) if "SKILL.md" in files)
        manifest["skills_count"] = skills_count
        print(f"[OK] 已备份 Skills 目录 (共包含 {skills_count} 个 SKILL.md 技能)")
    else:
        print(f"[WARN] 未发现 Skills 目录: {skills_src}")

    print(f"\n=== [3/5] 备份 Cron 任务与自定义脚本 ===")
    scripts_src = os.path.join(HERMES_DIR, "scripts")
    scripts_dst = os.path.join(backup_temp_dir, "scripts")
    if os.path.exists(scripts_src):
        shutil.copytree(scripts_src, scripts_dst, dirs_exist_ok=True)
        print(f"[OK] 已备份 Scripts 目录: {len(os.listdir(scripts_dst))} 个文件")

    cron_jobs_file = os.path.join(HERMES_DIR, "cron", "jobs.json")
    if os.path.exists(cron_jobs_file):
        cron_dst_dir = os.path.join(backup_temp_dir, "cron")
        os.makedirs(cron_dst_dir, exist_ok=True)
        shutil.copy2(cron_jobs_file, os.path.join(cron_dst_dir, "jobs.json"))
        with open(cron_jobs_file, "r", encoding="utf-8") as f:
            cron_data = json.load(f)
            manifest["cron_jobs_count"] = len(cron_data.get("jobs", []))
        print(f"[OK] 已备份 Cron 任务 (共 {manifest['cron_jobs_count']} 个任务)")

    print(f"\n=== [4/5] 备份配置文件与环境 ===")
    config_files = ["config.yaml", "mem0.json", ".env"]
    configs_dst_dir = os.path.join(backup_temp_dir, "config")
    os.makedirs(configs_dst_dir, exist_ok=True)
    for cf in config_files:
        src = os.path.join(HERMES_DIR, cf)
        if os.path.exists(src):
            dst = os.path.join(configs_dst_dir, cf)
            shutil.copy2(src, dst)
            manifest["files"][cf] = {
                "size": os.path.getsize(dst),
                "sha256": get_file_sha256(dst),
            }
            print(f"[OK] 配置已归档: {cf}")

    # 写入清单
    manifest_file = os.path.join(backup_temp_dir, "manifest.json")
    with open(manifest_file, "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)

    print(f"\n=== [5/5] 打包压缩归档文件 ===")
    tar_filename = f"hermes_full_backup_{timestamp}.tar.gz"
    tar_filepath = os.path.join(args.out_dir, tar_filename)
    with tarfile.open(tar_filepath, "w:gz") as tar:
        tar.add(backup_temp_dir, arcname=f"hermes_backup_{timestamp}")

    # 清理临时目录
    shutil.rmtree(backup_temp_dir)
    final_sha256 = get_file_sha256(tar_filepath)
    file_size_mb = os.path.getsize(tar_filepath) / (1024 * 1024)

    print("=" * 60)
    print(f"✅ 全量备份完成！")
    print(f"归档路径: {tar_filepath}")
    print(f"文件大小: {file_size_mb:.2f} MB")
    print(f"SHA256: {final_sha256}")
    print("=" * 60)


if __name__ == "__main__":
    main()
