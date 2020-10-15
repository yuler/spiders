# Some Spiders

记录一些自己写的爬虫脚本

## TechStacks

- Nodejs

## 极客时间专栏

复制 `.env.example` 文件到 `.env`

```bash
cp .env.example .env
```

设置 `GEEKBANG_COOKIE` 和 `GEEKBANG_COLUMN_ID`(可选) 环境变量

```bash
yarn
node geekbang [专栏 ID]
# or
OUTPUT=~/Books/左耳听风 GEEKBANG_COLUMN_ID=48 node geekbang
```