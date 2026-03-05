# /visual-audit — 3D Scene Visual Audit

自动跑 Playwright 视觉测试，读取截图，输出改进建议。

## 步骤

### Step 1: 确认前置条件
- 确认 `test-conquest-visual.mjs` 存在且语法正确
- 确认 dev server 在运行（curl http://localhost:3001/api/health）
- 如果 server 没跑，提示用户先 `npm run dev`

### Step 2: 运行测试
- 清理旧截图：`rm -rf screenshots/v1`
- 运行：`node test-conquest-visual.mjs`
- 预期：60+ 张截图 + 1 个 .webm 视频

### Step 3: 读取关键帧
按顺序读取以下截图（使用 Read tool）：
1. Intro: 01-intro-early, 03-intro-ready
2. Mode select: 04-mode-select
3. Agent select: 05-trolley-agent-select
4. Round start: 07-trolley-round1-start
5. Dilemma: 08-trolley-r1-dilemma
6. Decision 连拍（每隔 4 帧采样）: decision-f00, f04, f08, f12
7. Consequence 连拍（每隔 3 帧采样）: consequence-f00, f03, f06, f09
8. Round 2 dilemma + decision 连拍 + consequence 连拍（同样采样）
9. Final state: trolley-final-state

### Step 4: 分析并输出 Plan
对每张截图评估：
- **亮度/对比度**: 场景是否太暗？UI 文字是否可读？
- **动画连贯性**: 连拍帧间物体位移是否明显？（trolley、lever、figures）
- **撞击反馈**: consequence 帧是否有 camera shake、impact flash、figure hit 动画？
- **UI 布局**: 面板是否遮挡 3D 场景？文字是否溢出？
- **整体氛围**: 视觉风格是否一致？是否有渲染异常？

输出格式：
1. 每个问题配截图编号作为证据
2. 按优先级排列（P0 影响体验 > P1 影响观感 > P2 细节优化）
3. 给出具体改进建议 + 涉及文件
4. 进入 plan mode 等待用户确认后执行
