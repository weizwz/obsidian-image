# 插件发布流程

## 分支策略

- `dev`：日常开发分支，每次 `push` 自动触发 `lint.yml` 进行构建与代码检查。
- `master`：主分支（发布分支），当 `manifest.json` 发生变更并推送至 `master` 时，自动触发 `release.yml` 完成构建、打 Tag、生成 Release Notes 并正式发布。

## 发布步骤

### 1. 在 `dev` 分支升级版本号

根据更新内容选择版本级别（`patch` / `minor` / `major`），自动同步更新 `package.json`、`manifest.json` 和 `versions.json`：

```bash
npm version patch --no-git-tag-version
git commit -am "chore: release $(node -p "require('./manifest.json').version")"
git push origin dev
```

### 2. 合并到 `master` 并触发自动发布

```bash
git checkout master
git merge dev
git push origin master
git checkout dev
```

## GitHub Actions 自动化说明

推送 `master` 后，`.github/workflows/release.yml` 会自动执行：

1. 安装依赖并执行 `pnpm run build` 生成 `dist/main.js`。
2. 对构建产物生成构建溯源证明（Attest build provenance）。
3. 读取 `manifest.json` 中的 `version` 字段作为 Tag 名称（不带 `v` 前缀，符合 Obsidian 官方要求）。
4. 若该版本 Release 不存在，则自动创建 Tag、生成 Release Notes，并上传 `main.js`、`manifest.json`、`styles.css` 正式发布。
