# 贡献指南 (CONTRIBUTING.md)

首先感谢你有兴趣为 SOLVER AI 做贡献！我们欢迎各种形式的贡献，包括但不限于代码提交、文档完善、Bug 报告、功能建议等。

## 📋 行为准则
参与本项目的所有贡献者都需要遵守以下行为准则：
- 友好和尊重他人
- 接受建设性的批评
- 关注对社区最有利的事情
- 对其他社区成员表现出同理心

任何违反行为准则的行为都可能被项目维护者处理。

## 🚀 如何贡献
### 1. 报告 Bug
如果你发现了 Bug，请通过 GitHub Issue 报告：
- 搜索现有 Issue，确认是否已经有人报告过相同的问题
- 详细描述 Bug 复现步骤、预期行为、实际行为
- 提供运行环境信息（操作系统、Node.js版本、浏览器版本等）
- 如果可能，提供截图或错误日志

### 2. 提交功能建议
如果你有好的功能想法，也可以通过 GitHub Issue 提出：
- 清晰描述功能的使用场景和价值
- 尽可能提供实现思路和技术方案
- 说明该功能是否适合所有用户，还是特定场景使用

### 3. 代码贡献
如果你想贡献代码，请遵循以下流程：

#### 前置准备
- Node.js >= 20.0.0
- PostgreSQL >= 14.0
- Git

#### 开发流程
1. **Fork 仓库**
   点击 GitHub 页面右上角的 Fork 按钮，将仓库 Fork 到你的个人账号下。

2. **克隆代码**
   ```bash
   git clone https://github.com/your-username/SOLVER-AI.git
   cd SOLVER-AI
   ```

3. **安装依赖**
   ```bash
   npm install
   ```

4. **配置环境**
   ```bash
   cp .env.example .env
   # 编辑 .env 文件，配置数据库连接等信息
   ```

5. **初始化数据库**
   ```bash
   npx prisma generate
   npx prisma migrate dev
   ```

6. **创建功能分支**
   从 main 分支创建新的功能分支：
   ```bash
   git checkout -b feature/your-feature-name
   # 或修复Bug：git checkout -b fix/your-bug-fix
   ```

7. **开发代码**
   - 遵循项目的代码规范
   - 新增功能需要编写对应的单元测试
   - 修改现有功能需要确保所有测试通过
   - 提交代码前运行代码检查和测试：
     ```bash
     npm run lint
     npm run typecheck
     npm run test
     npm run build
     ```

8. **提交代码**
   提交信息遵循 [Conventional Commits](https://www.conventionalcommits.org/zh-hans/v1.0.0/) 规范：
   ```
   <类型>(<范围>): <描述>

   [可选的正文]

   [可选的页脚]
   ```
   类型包括：
   - `feat`: 新功能
   - `fix`: 修复Bug
   - `docs`: 文档更新
   - `style`: 代码格式调整（不影响代码运行的变动）
   - `refactor`: 重构（既不是新增功能，也不是修改bug的代码变动）
   - `perf`: 性能优化
   - `test`: 测试相关修改
   - `chore`: 构建过程或辅助工具的变动

   示例：
   ```
   feat(文献模块): 添加文献批量导入功能
   
   - 支持同时上传多个PDF文件
   - 自动解析文献元数据
   - 支持导入进度显示
   
   Closes #123
   ```

9. **推送代码**
   ```bash
   git push origin feature/your-feature-name
   ```

10. **创建 Pull Request**
    在 GitHub 上创建 Pull Request，目标分支为原仓库的 main 分支：
    - 清晰描述 PR 的内容和目的
    - 关联相关的 Issue（例如 `Closes #123`）
    - 确保 CI 检查全部通过

## 📝 代码规范
### TypeScript 规范
- 严格遵循 TypeScript 语法，避免使用 `any` 类型
- 使用 `interface` 定义对象类型，`type` 定义联合类型等
- 函数必须明确声明参数类型和返回值类型
- 所有导出的函数和类必须添加 JSDoc 注释

### React 规范
- 使用函数组件和 Hooks，避免使用类组件
- 组件文件名使用 PascalCase，例如 `MyComponent.tsx`
- 工具函数文件名使用 camelCase，例如 `myUtil.ts`
- 优先使用服务端组件，需要交互的部分使用客户端组件
- 避免不必要的 re-render，合理使用 memo、useCallback、useMemo

### 代码风格
- 使用 2 空格缩进
- 使用单引号，除非是模板字符串
- 语句末尾不加分号
- 逗号后面加空格
- 遵循 Prettier 配置，提交前自动格式化

## 🧪 测试规范
- 所有核心功能必须编写单元测试
- 测试文件与源码文件放在同一目录，命名为 `*.test.ts` 或 `*.test.tsx`
- 测试用例描述清晰，说明测试的场景和预期结果
- 公共工具库测试覆盖率必须达到 100%
- 业务代码测试覆盖率尽量达到 80% 以上

运行测试：
```bash
# 运行所有测试
npm run test

# 运行单个测试文件
npm run test -- src/lib/your-file.test.ts

# 生成覆盖率报告
npm run test:coverage
```

## 📚 文档贡献
文档也是项目的重要组成部分，我们同样欢迎文档贡献：
- 修复文档中的错别字、错误描述
- 完善功能说明、使用教程
- 新增最佳实践、常见问题解答
- 翻译文档到其他语言

文档位于 `docs/` 目录下，使用 Markdown 格式编写。

## 🔒 安全问题
如果你发现了安全漏洞，请不要通过公开的 Issue 报告，请直接发送邮件给项目维护者，我们会尽快处理。

## 🎉 贡献者名单
所有贡献者都会被记录在项目的贡献者名单中，感谢每一位贡献者的努力！

## ❓ 有问题？
如果你有任何疑问，可以通过以下方式获取帮助：
- 在 GitHub Discussions 中提问
- 提交 Issue 描述问题
- 联系项目维护者

再次感谢你的贡献！ 💖