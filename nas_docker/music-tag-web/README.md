# Music-Tag-Web - 在线音乐标签与封面刮削工具

Music-Tag-Web 是一款能在网页端批量编辑和自动刮削音频标签（ID3 Tag）的工具。支持 FLAC, MP3, M4A, DSD 等多种格式，自动从国内主流音乐平台补全歌曲名、歌手、专辑名、歌词及高清封面。

## 端口与访问

- **Web 访问地址**: `http://<NAS_IP>:8002`
- **默认账号/密码**: `admin` / `admin` (首次登录请在后台修改)

## 目录结构

```text
music-tag-web/
├── docker-compose.yml
├── config/                # 配置文件及数据缓存
└── /media/music           # 挂载宿主机音乐文件存储目录 (需写入权限)
```

## 配合 Navidrome 使用

在 Music-Tag-Web 中批量完成标签整理与封面写入后，Navidrome 即可自动重新扫描并呈现完美且完整的音乐库元数据。
