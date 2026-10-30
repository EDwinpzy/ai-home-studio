# 构建与验收记录

验收日期：2026-10-31
环境：Windows / PowerShell / Chrome Headless / Node.js / Vite 8

## 可复现命令

```powershell
npm install
npm run lint
npm run build
npm run preview -- --port 4174

# 另一个终端
npm run test:ui -- http://127.0.0.1:4174/ public/assets/models/sheen-chair/SheenChair.glb work/ui-validation-final-3
```

## 结果

- `npm run lint`：通过，退出码 0。
- `npm run build`：通过，退出码 0。
- Vite 提示主 JavaScript chunk 大于 500 kB；这是性能优化提示，不阻断构建。
- `npm run test:ui`：通过，退出码 0，覆盖设计视图、W/A/S/D、材质替换、浏览器 GLB 替换、照片构图和 PNG 导出。
- 验收生成 9 张截图；W/A/S/D 四个方向截图哈希均不同，确认相机移动产生真实画面变化。
- GLB 替换后当前对象名称变为 `SheenChair`，对象位置、选中关系和后续交互保持可用。
- PNG 导出生成 `ai-home-studio-*.png`，文件大小约 1.28 MB。
- 浏览器控制台错误为 0；仅有 Three.js `Clock` 弃用提示。
- `npm audit --omit=dev --registry=https://registry.npmjs.org`：0 个已知漏洞。
- 设计检查覆盖 1440、768、390 三种宽度，无横向溢出，`findings` 为 0。

## 2026-10-31 真实感与路径追踪更新

- 沙发已由基础几何体替换为 Khronos `GlamVelvetSofa` PBR 资产。
- 木饰面增加贴图法线与粗糙度，窗帘增加织物纹理。
- 新增“照片 → 路径追踪”实验入口，使用独立 BVH 与渐进采样。
- 无头浏览器烟测已成功构建追踪场景并累计到至少 2 个采样，无控制台异常。
- 当前 1–2 采样结果仍为原始噪点，尚未接入 OIDN 降噪，因此不作为正式效果图验收。

## 当前边界

- 默认“照片”模式仍是高质量实时 WebGL 构图；路径追踪实验模式已可启动和采样，但尚未降噪。
- 当前没有 GPU Path Tracing、墙体碰撞、后端项目持久化、账号、商品 SKU 和真实库存。
- 手机端以查看与选中为主，不提供完整三维编辑。
- 当前预览是本地验证地址，不是已部署的公网服务。
