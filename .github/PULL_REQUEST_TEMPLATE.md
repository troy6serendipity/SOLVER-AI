<!--
感谢提交 Pull Request！请填写以下信息。
PR 标题建议遵循 Conventional Commits：feat: / fix: / docs: / refactor: / test: / chore: / ci:
-->

## 变更说明

<!-- 这个 PR 做了什么？为什么需要它？关联哪个 Issue（如 Closes #123）？ -->

## 变更类型

- [ ] 新功能（feat）
- [ ] 缺陷修复（fix）
- [ ] 文档（docs）
- [ ] 重构（refactor），不改变外部行为
- [ ] 测试（test）
- [ ] 工程化 / CI（ci / chore）
- [ ] 破坏性变更（需在下方说明迁移方案）

## 验收标准与自测

<!-- 描述你如何验证这次改动，包括手动验证路径 -->

- [ ] `npm run lint` 通过
- [ ] `npm run typecheck` 通过
- [ ] `npm run test:ci` 通过（新增逻辑已补充单元测试）
- [ ] `npm run build` 通过
- [ ] 已在本地手动验证核心业务路径

## 安全检查

- [ ] 所有新增 API 都包含登录校验与资源 owner 归属校验（防 IDOR）
- [ ] 未提交任何密钥、`.env`、用户数据或私有文件
- [ ] 用户输入均经过服务端校验，输出已做 XSS 防护
- [ ] 数据库变更已提供 Prisma migration，且不含破坏性迁移

## 截图 / 录屏（如涉及 UI）

<!-- 粘贴截图或录屏链接 -->

## 额外说明

<!-- 破坏性变更迁移方案、待确认事项、评审重点等 -->
