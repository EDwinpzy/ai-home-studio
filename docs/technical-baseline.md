# 技术基线

## 3D New Era AI

- 仓库：https://github.com/leandrodaf/3d-new-era-ai
- 评估提交：`404a32385b7a5e4c28c51ebdf5d6ff529e6d55dd`
- 许可证：MIT OR Apache-2.0
- 技术栈：Rust、egui/eframe、wgpu、WebAssembly

### 已核对能力

- 桌面端支持 OBJ、glTF、GLB 家具模型导入
- 浏览器编辑器支持户型图背景导入与比例校准
- 第一人称控制包含 W/A/S/D、方向键、鼠标视角和 Esc 退出
- 渲染器包含 CPU 路径追踪和 Draft/Good/Best 质量档位

### 已知边界

- 浏览器编辑器当前将 3D 模型导入入口标记为仅桌面端可用
- 户型图背景导入与自动墙体识别不是同一能力，需分别验证
- 上游能力评估不等同于 AI Home Studio 产品验收

### 集成原则

优先参考或复用经过许可证核验的模块；不直接继承上游提交历史，不静默覆盖上游文件，也不将未经实际运行的源码阅读结论作为验收结果。
