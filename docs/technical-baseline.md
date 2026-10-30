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

## 2D/3D 视觉底座更新（2026-10-31）

上游实时 3D 视图经实际运行确认存在明显真实感缺陷：

- 实时 renderer 主要使用 Lambert 漫反射和固定环境色，没有完整 PBR/IBL
- GLB 导入会丢失 normal、roughness、metallic、AO、emissive 等材质语义
- 实时画面没有可靠阴影、AO 或接触阴影
- 颜色管线存在 sRGB 与线性空间混用，导致画面发白、层次不足
- CPU Path Tracing 仍以漫反射为主，且高画质渲染耗时过长

因此 AI Home Studio 的产品界面和实时预览不再直接沿用上游简化实时 renderer，改为独立 Three.js PBR 管线。详细改造见 [renderer-upgrade.md](renderer-upgrade.md)。

上游仍保留为场景模型、墙体/户型编辑和 AI MCP 能力的参考实现；正式照片渲染将另行接入独立 GPU Path Tracing 管线。
