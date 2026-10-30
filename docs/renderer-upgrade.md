# 真实感渲染升级说明

## 结论

上游 3D New Era AI 的原实时视图不是物理一致的 PBR 渲染器。它主要使用简化方向光、固定环境色与 Lambert 漫反射；GLB 导入还会丢失大部分 PBR 语义。仅提高 Path Tracing 采样数不能解决实时预览的真实感问题。

因此本原型采用：

- React + Vite 负责产品界面和交互
- Three.js / React Three Fiber 负责实时三维场景
- PBR 材质、HDRI/IBL、建筑灯光、阴影和 AO 负责基础真实感
- 已接入实验性 GPU Path Tracing 作为独立“成片”入口

## 当前渲染管线

```text
PBR 资产
→ HDRI 环境光与反射
→ 太阳主光 + 室内实用灯
→ 方向光软阴影 + 接触阴影
→ N8AO
→ Bloom
→ ACES 色调映射
→ SMAA
→ sRGB 输出
```

## 材料组成

- 木地板：ambientCG WoodFloor051 的 Color / Normal / Roughness
- 织物：ambientCG Fabric030 的 Color / Normal / Roughness + sheen
- 墙面：ambientCG Plaster001 的 Color / Normal / Roughness
- 家具：Poly Haven CC0 glTF；SHEEN 单椅使用 Khronos CC0 模型；GlamVelvetSofa 使用 Khronos CC BY 4.0 模型
- 环境：Poly Haven CC0 HDRI

## 为什么不用 Bloom 掩盖问题

Bloom 只负责高亮灯具附近的镜头散射。真实感主要来自：

1. 正确的 sRGB/线性颜色管线
2. 完整 PBR 材质通道
3. 方向明确的采光
4. 家具与地面的接触关系
5. 墙角和家具下方的 AO
6. 合理粗糙度造成的反射宽度
7. 建筑摄影机位

## 与照片级成图的关系

实时管线适合编辑、选择、材质调整和 WASD 漫游，不负责最终照片。

照片成片模式采用独立 Path Tracing：

- BVH 加速
- 多 bounce 全局光照
- GGX 金属/粗糙反射
- 真实玻璃折射
- 渐进采样与进度显示
- 可取消、固定随机种子
- 降噪与高分辨率 PNG 导出

Path Tracing 不得运行在 WASD 实时帧循环内，也不应在场景编辑时继续采样。

## Path Tracing 实验模式（2026-10-31）

- 基于 `three-gpu-pathtracer` 的 WebGL 2 路径追踪器。
- 从“照片”视图进入“路径追踪”，使用独立 BVH 场景和渐进采样，最多累计 64 次。
- 已能生成真实光线弹射结果并导出当前画布；当前原始采样仍有噪点，尚未接入 OIDN 降噪。
- 当前环境仍为 1K HDRI，正式成片需升级到 2K/4K HDRI 并增加高分辨率离线渲染队列。


## 当前验收

- 生产构建通过
- 浏览器运行时无应用异常
- 对象选择、材质替换、GLB 替换、WASD 和 PNG 导出通过
- 桌面与移动端布局通过设计检查
- 下一阶段需补：路径追踪降噪与高分辨率成片、真实 GPU 性能数据、碰撞、项目持久化和真实商品 SKU
