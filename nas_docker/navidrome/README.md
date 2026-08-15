# Navidrome - 个人音乐流媒体服务器

Navidrome 是一个轻量级、高性能的开源音乐流媒体服务器。界面现代简洁，完美兼容 Subsonic / Madsonic API，可在 iOS (音核 / 音律 / SubStreamer / Play:Sub)、Android (Symfonium)、macOS 与 Windows 客户端上畅听无损音乐。

## 端口与访问

- **Web 播放界面**: `http://<NAS_IP>:4533`
- **Subsonic API 地址**: `http://<NAS_IP>:4533/rest/`

## 目录结构

```text
navidrome/
├── docker-compose.yml
├── data/                  # Navidrome 数据库 navidrome.db、缓存与配置文件
└── /media/music           # 挂载宿主机音乐文件存储目录 (只读 :ro)
```

## 客户端推荐

- **iOS / iPadOS / macOS**: 音核 (Sonix), 音律, Substreamer, Play:Sub
- **Android**: Symfonium (强烈推荐), Ultrasonic, DSub
- **网页端**: 原生响应式现代 Web 界面
