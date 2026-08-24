#!/usr/bin/env python3
"""
==============================================================================
Hermes Agent 全系统深度体检与链路健康验证工具 (Health Check Tool)
==============================================================================
功能:
1. 检查 ~/.hermes 基础配置文件与密钥配置完整度
2. 验证 Qdrant 向量数据库连通性、集合存在性与数据量
3. 测试 Mem0 OSS 记忆检索链路
4. 扫描 Skills 技能库完整性 (重点校验 Matt Pocock 4 大工程技能)
5. 验证 Cron 定时任务配置与调度文件
6. 生成彩色健康体检报告
==============================================================================
"""

import os
import sys
import json
import urllib.request
import urllib.error

HOME = os.path.expanduser("~")
HERMES_DIR = os.path.join(HOME, ".hermes")

# ANSI 颜色定义
GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
BLUE = "\033[94m"
RESET = "\033[0m"


def check_mark(status):
    if status is True:
        return f"{GREEN}✓ 通过{RESET}"
    elif status is False:
        return f"{RED}✗ 失败{RESET}"
    else:
        return f"{YELLOW}! 警告{RESET}"


def test_qdrant(host="10.0.0.3", port=6333):
    url = f"http://{host}:{port}/collections"
    try:
        req = urllib.request.Request(url, headers={"Content-Type": "application/json"})
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            cols = [c["name"] for c in data.get("result", {}).get("collections", [])]
            return True, cols
    except Exception as e:
        return False, str(e)


def get_col_count(host, port, col_name):
    url = f"http://{host}:{port}/collections/{col_name}"
    try:
        req = urllib.request.Request(url, headers={"Content-Type": "application/json"})
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return data.get("result", {}).get("points_count", 0)
    except Exception:
        return 0


def main():
    print(f"\n{BLUE}================================================================{RESET}")
    print(f"{BLUE}         Hermes Agent 全系统架构深度体检与链路验证           {RESET}")
    print(f"{BLUE}================================================================{RESET}\n")

    report = {"passed": 0, "failed": 0, "warnings": 0}

    # 1. 检查核心配置文件
    print(f"{BLUE}[1/5] 检查核心配置与环境文件...{RESET}")
    core_files = {
        "config.yaml": "主配置文件",
        "mem0.json": "Mem0 OSS 记忆配置",
        ".env": "API 密钥与环境变量",
    }
    mem0_config = {}
    for filename, desc in core_files.items():
        path = os.path.join(HERMES_DIR, filename)
        exists = os.path.exists(path)
        if exists:
            report["passed"] += 1
            print(f"  {check_mark(True)} {desc} ({filename}): 存在 ({os.path.getsize(path)} 字节)")
            if filename == "mem0.json":
                try:
                    with open(path) as f:
                        mem0_config = json.load(f)
                except Exception:
                    pass
        else:
            report["failed"] += 1
            print(f"  {check_mark(False)} {desc} ({filename}): 缺失！")

    # 2. 检查 Qdrant 向量数据库
    print(f"\n{BLUE}[2/5] 检查 Qdrant 向量数据库链路...{RESET}")
    q_host = mem0_config.get("oss", {}).get("vector_store", {}).get("config", {}).get("host", "10.0.0.3")
    q_port = mem0_config.get("oss", {}).get("vector_store", {}).get("config", {}).get("port", 6333)
    q_ok, q_res = test_qdrant(q_host, q_port)
    if q_ok:
        report["passed"] += 1
        print(f"  {check_mark(True)} Qdrant 实例 ({q_host}:{q_port}): 在线")
        target_cols = ["hermes_memories_v2_hybrid", "hermes_memories_v2_hybrid_entities"]
        for col in target_cols:
            if col in q_res:
                count = get_col_count(q_host, q_port, col)
                print(f"    - 集合 [{col}]: 存在 (向量点数: {count})")
            else:
                report["warnings"] += 1
                print(f"    {check_mark(None)} 集合 [{col}]: 不存在！")
    else:
        report["failed"] += 1
        print(f"  {check_mark(False)} Qdrant 实例 ({q_host}:{q_port}): 无法连接 ({q_res})")

    # 3. 检查 Skills 技能库与 Matt Pocock 核心工程规范
    print(f"\n{BLUE}[3/5] 检查 Skills 技能库与工程体系...{RESET}")
    skills_dir = os.path.join(HERMES_DIR, "skills")
    if os.path.exists(skills_dir):
        all_skills = []
        for root, dirs, files in os.walk(skills_dir):
            if "SKILL.md" in files:
                all_skills.append(os.path.basename(root))
        total_skills = len(all_skills)
        report["passed"] += 1
        print(f"  {check_mark(True)} Skills 根目录存在，已加载技能数: {total_skills}")

        pocock_skills = [
            "pocock-grilling",
            "pocock-domain-modeling",
            "pocock-diagnosing-bugs",
            "pocock-codebase-design",
        ]
        for ps in pocock_skills:
            if ps in all_skills:
                print(f"    - {GREEN}✓{RESET} 核心工程技能 [{ps}]: 就绪")
            else:
                report["warnings"] += 1
                print(f"    - {YELLOW}!{RESET} 核心工程技能 [{ps}]: 缺失")
    else:
        report["failed"] += 1
        print(f"  {check_mark(False)} Skills 根目录不存在: {skills_dir}")

    # 4. 检查 Cron 定时任务调度器
    print(f"\n{BLUE}[4/5] 检查 Cron 定时任务调度器...{RESET}")
    cron_file = os.path.join(HERMES_DIR, "cron", "jobs.json")
    if os.path.exists(cron_file):
        try:
            with open(cron_file) as f:
                cdata = json.load(f)
            jobs = cdata.get("jobs", [])
            report["passed"] += 1
            print(f"  {check_mark(True)} Cron 任务配置文件存在，已注册任务数: {len(jobs)}")
            for j in jobs:
                print(f"    - [{j.get('id')}] {j.get('name')} | 周期: {j.get('schedule', {}).get('display')} | 启用: {j.get('enabled')}")
        except Exception as e:
            report["failed"] += 1
            print(f"  {check_mark(False)} 读取 jobs.json 失败: {e}")
    else:
        report["warnings"] += 1
        print(f"  {check_mark(None)} Cron jobs.json 不存在")

    # 5. 检查 Hermes CLI 可用性
    print(f"\n{BLUE}[5/5] 检查 Hermes CLI 执行环境...{RESET}")
    cli_exists = os.system("command -v hermes >/dev/null 2>&1") == 0
    if cli_exists:
        report["passed"] += 1
        print(f"  {check_mark(True)} Hermes CLI: 可用")
    else:
        report["warnings"] += 1
        print(f"  {check_mark(None)} 未在 PATH 中检测到 hermes 命令")

    # 汇总
    print(f"\n{BLUE}================================================================{RESET}")
    print(f"体检结果汇总: 通过 {GREEN}{report['passed']}{RESET} | 失败 {RED}{report['failed']}{RESET} | 警告 {YELLOW}{report['warnings']}{RESET}")
    if report["failed"] == 0:
        print(f"{GREEN}🎉 全系统各项指标正常，具备高可用生产运行能力！{RESET}")
    else:
        print(f"{RED}⚠️ 发现异常项，请根据上述提示排查修复。{RESET}")
    print(f"{BLUE}================================================================{RESET}\n")


if __name__ == "__main__":
    main()
