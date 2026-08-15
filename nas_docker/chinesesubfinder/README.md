# ChineseSubFinder - 中文字幕自动下载工具

ChineseSubFinder 能够自动扫描媒体库中的电影和电视剧，比对已有字幕，并通过各大字幕网站自动下载匹配的高清中文字幕（双语 / 简中 / 繁中）。

## 端口与访问 (Host 模式)

- **Web 管理界面**: `http://<NAS_IP>:19035` (默认 WebUI 端口)

## 目录结构

```text
chinesesubfinder/
├── docker-compose.yml
├── config/                # 配置文件与运行日志
└── /media                 # 媒体库目录 (读写挂载，字幕保存在视频文件同目录下)
```

## 注意事项

- 必须保证容器对 `/media` 目录拥有**写入权限**，以便保存字幕文件。
