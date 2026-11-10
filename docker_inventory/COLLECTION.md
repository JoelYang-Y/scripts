# 采集方法与复现步骤

> 本文件记录 `docker_inventory/` 的数据是怎么来的，便于下次增量刷新。
> **全程只读**：不启停容器、不改配置、不拉镜像。
> **凭据**：脚本从环境变量取值，仓库内不出现任何真实口令。

---

## 1. 前提

| 目标 | 通道 | 备注 |
|---|---|---|
| NAS `10.0.0.3` | SSH **10000** 端口 + 普通账号，`sudo -S` 提权跑 docker | 22 端口未开；账号口令存 `~/.hermes/.nas_backup.env`（600 权限），**不入库** |
| VM100 `10.0.0.6` | SSH 22 + `root` 公钥（`~/.ssh/id_ed25519`） | 容器即 root 运行，无需 sudo |
| PVE `10.0.0.4` | SSH 22 + 统一口令 | 仅用于确认无 Docker（`pct list` / `qm list`） |

---

## 2. 步骤一：确认哪些主机有 Docker

```bash
# 1) 存活主机（ICMP）
seq 1 254 | xargs -P 64 -I{} sh -c 'ping -c1 -W 400 10.0.0.{} >/dev/null 2>&1 && echo 10.0.0.{}' | sort -t. -k4 -n

# 2) 对未知主机探端口（Docker API 2375/2376 若开放可直接枚举，无需登录）
for h in <未知主机列表>; do
  for p in 22 2375 2376 3000 8080 9443; do
    timeout 1 bash -c "</dev/tcp/$h/$p" 2>/dev/null && echo "$h:$p open"
  done
done

# 3) 有 SSH 的主机逐个确认 docker 是否存在
ssh root@<host> 'command -v docker && docker ps --format "{{.Names}}" | wc -l'
```

本次结论：17 台存活，仅 `10.0.0.3`、`10.0.0.6` 有 Docker；`10.0.0.4`/`10.0.0.5` 无 docker 二进制；`10.0.0.7`/`10.0.0.37`/`10.0.0.44` 无法认证且未暴露 Docker API。

---

## 3. 步骤二：远程采集脚本（POSIX sh，Alpine 可用）

保存为 `collect.sh`，在目标主机以 root（或 sudo）执行，输出为 base64 的 tar.gz：

```sh
#!/bin/sh
# 远程只读采集：容器 / inspect / 卷 / 网络 / compose 文件
set -u
OUT=/tmp/dscan_out
rm -rf "$OUT"; mkdir -p "$OUT/files"

docker ps -aq > "$OUT/all_ids.txt" 2>/dev/null || true
docker ps -a --format '{{json .}}' > "$OUT/ps.jsonl" 2>/dev/null || true
if [ -s "$OUT/all_ids.txt" ]; then
  docker inspect $(cat "$OUT/all_ids.txt") > "$OUT/inspect.json" 2>/dev/null || echo '[]' > "$OUT/inspect.json"
else
  echo '[]' > "$OUT/inspect.json"
fi
docker volume ls --format '{{json .}}' > "$OUT/volumes.jsonl" 2>/dev/null || true
docker network ls --format '{{json .}}' > "$OUT/networks.jsonl" 2>/dev/null || true
docker compose ls > "$OUT/compose_ls.txt" 2>/dev/null || true
docker version --format '{"server":"{{.Server.Version}}","client":"{{.Client.Version}}"}' > "$OUT/version.json" 2>/dev/null || echo '{}' > "$OUT/version.json"
{ uname -a; grep -E '^(PRETTY_NAME|VERSION_ID)=' /etc/os-release 2>/dev/null; } > "$OUT/host.txt"

# 由 compose 标签得到配置文件路径（无需 jq）
grep -o '"com\.docker\.compose\.project\.config_files": *"[^"]*"' "$OUT/inspect.json" 2>/dev/null \
  | sed -E 's/.*: *"//; s/"$//' | tr ',' '\n' | sed 's/^ *//; s/ *$//' | grep -v '^$' | sort -u > "$OUT/compose_paths.txt"

# 未被容器引用的遗留 compose 文件（限定常见目录）
for d in /opt /root /home /srv /mnt /volume1 /volume2 /volume3 /var/lib/docker/compose /usr/local; do
  [ -d "$d" ] && find "$d" -maxdepth 5 \( -name 'docker-compose*.yml' -o -name 'docker-compose*.yaml' -o -name 'compose*.yml' -o -name 'compose*.yaml' \) -not -path '*/node_modules/*' 2>/dev/null
done | sort -u > "$OUT/found_paths.txt"

cat "$OUT/compose_paths.txt" "$OUT/found_paths.txt" 2>/dev/null | awk '!seen[$0]++' > "$OUT/all_paths.txt"
while IFS= read -r p; do
  [ -n "$p" ] || continue
  [ -f "$p" ] || continue
  { echo "###FILE### $p"; cat "$p" 2>/dev/null; echo; } >> "$OUT/files/compose_dump.txt"
done < "$OUT/all_paths.txt"

cd /tmp && tar czf dscan.tgz dscan_out 2>/dev/null && base64 dscan.tgz
rm -rf "$OUT" /tmp/dscan.tgz
```

### 执行方式

```bash
# A. 有公钥的机器（VM100）
ssh root@10.0.0.6 'cat > /tmp/collect.sh' < collect.sh
ssh root@10.0.0.6 'sh /tmp/collect.sh' | base64 -d > agd.tgz

# B. 需要口令 + sudo 的机器（NAS）
set -a; . ~/.hermes/.nas_backup.env; set +a          # 提供 NAS_USER/NAS_HOST/NAS_PORT/NAS_PASS
sshpass -p "$NAS_PASS" scp -P "$NAS_PORT" collect.sh "$NAS_USER@$NAS_HOST:/tmp/collect.sh"
printf '%s\n' "$NAS_PASS" | sshpass -p "$NAS_PASS" \
  ssh -p "$NAS_PORT" "$NAS_USER@$NAS_HOST" 'sudo -S -p "" sh /tmp/collect.sh' | base64 -d > nas.tgz

tar xzf nas.tgz -C nas && cat nas/dscan_out/all_paths.txt
```

> 口令只经 stdin 传给 `sudo -S`，不出现在 ssh 命令行参数里（避免同机其他用户从 `ps` 看到）。

---

## 4. 步骤三：结构化与脱敏

`inventory.json` 的字段来自 `docker inspect`，只保留运维必需项：

| 字段 | 来源 | 处理 |
|---|---|---|
| `name` / `image` / `created` | `inspect` | 原样 |
| `restart` / `privileged` / `network` | `HostConfig` | 原样 |
| `ports` | `HostConfig.PortBindings` | 统一成 `IP:宿主端口->容器端口/协议` |
| `mounts` | `Mounts` | 保留 source/dest/读写位 |
| `env_keys` | `Config.Env` | **只保留键名**，值一律丢弃 |
| `compose_project` / `config_files` | 容器标签 | 用于判定部署方式 |
| `healthcheck` | `Config.Healthcheck` | 布尔 |

**脱敏规则**（发布前必须过一遍）：

```bash
grep -rniE '(pass(word)?|secret|token|api[_-]?key)\s*[:=]\s*[^ "]{6,}' docker_inventory/ \
  | grep -v '<[A-Z_]*>' | grep -v 'REDACTED'
```

---

## 5. 已知限制

- NAS 的 Docker 以 `disabled` 状态由极空间 ZOS 托管，`systemctl` 视角与容器实际运行状态不一致，判断运行态只看 `docker ps`。
- `docker compose ls` 只列出用 Compose 创建的系统；8 个 `docker run` 容器的 compose 文件是**反推**的，字段已与实机逐一核对（端口/挂载/网络/特权），但未在生产切换到该文件。
- 端口探测只覆盖 22/2375/2376/3000/8080/9443；未开这些端口的主机不会被发现，如需更全的覆盖应改用 `nmap -sS -p-`（本次未使用，避免对家用网络做全端口扫描）。
