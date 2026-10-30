import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { useProgress } from '@react-three/drei'
import { GLTFLoader } from 'three-stdlib'
import {
  Armchair,
  Box,
  Camera,
  Check,
  ChevronDown,
  Download,
  Eye,
  FileImage,
  Footprints,
  Home,
  Lamp,
  Layers,
  Leaf,
  Menu,
  MousePointer2,
  Palette,
  Redo2,
  Rotate3D,
  SlidersHorizontal,
  Sparkles,
  Sun,
  Upload,
  Undo2,
  X,
} from 'lucide-react'
import * as THREE from 'three'
import { StudioScene, type PathTraceStatus, type SceneItem, type ViewMode } from './scene/StudioScene'

const FINISHES = [
  { id: 'oat', label: '燕麦织物', color: '#b8a58f' },
  { id: 'moss', label: '苔藓织物', color: '#777b62' },
  { id: 'clay', label: '陶土皮革', color: '#8b5c49' },
  { id: 'graphite', label: '石墨织物', color: '#484844' },
]

const INITIAL_ITEMS: SceneItem[] = [
  {
    id: 'sofa-main',
    name: '云栖三人沙发',
    category: '软体家具',
    kind: 'sofa',
    modelUrl: '/assets/models/glam-velvet-sofa/GlamVelvetSofa.glb',
    targetSize: 2.55,
    fit: 'width',
    position: [-0.55, 0, -0.2],
    rotation: 0,
    finish: 'oat',
    dimensions: '218 × 96 × 82 cm',
  },
  {
    id: 'chair-a',
    name: 'SHEEN 单椅',
    category: '单椅',
    kind: 'model',
    modelUrl: '/assets/models/sheen-chair/SheenChair.glb',
    targetSize: 1.02,
    fit: 'width',
    position: [1.45, 0, 0.65],
    rotation: -Math.PI / 2,
    finish: 'clay',
    dimensions: '70 × 84 × 73 cm',
  },
  {
    id: 'chair-b',
    name: 'SHEEN 单椅 · 伴侣',
    category: '单椅',
    kind: 'model',
    modelUrl: '/assets/models/sheen-chair/SheenChair.glb',
    targetSize: 1.02,
    fit: 'width',
    position: [1.45, 0, 2.25],
    rotation: -Math.PI / 2,
    finish: 'moss',
    dimensions: '70 × 84 × 73 cm',
  },
  {
    id: 'coffee-table',
    name: '玄武岩茶几',
    category: '桌几',
    kind: 'model',
    modelUrl: '/assets/models/modern_coffee_table_01/modern_coffee_table_01_1k.gltf',
    targetSize: 1.55,
    fit: 'width',
    position: [-0.45, 0, 1.22],
    rotation: -0.06,
    finish: 'graphite',
    dimensions: '140 × 70 × 42 cm',
  },
  {
    id: 'plant-main',
    name: '龟背竹 · 陶盆',
    category: '绿植',
    kind: 'model',
    modelUrl: '/assets/models/potted_plant_02/potted_plant_02_1k.gltf',
    targetSize: 1.3,
    fit: 'height',
    position: [2.65, 0, -2.15],
    rotation: 0.3,
    finish: 'moss',
    dimensions: '84 × 84 × 132 cm',
  },
  {
    id: 'pendant-main',
    name: '月蚀吊灯',
    category: '灯具',
    kind: 'pendant',
    position: [-0.5, 2.88, 0.85],
    rotation: 0,
    finish: 'graphite',
    dimensions: 'Ø 52 cm',
  },
]

type ImportMode = 'replace' | 'add'

function ProductMark() {
  return (
    <svg className="brand-mark" viewBox="0 0 34 34" aria-hidden="true">
      <path d="M5 26V9.5L16.8 3 29 9.5V26" />
      <path d="M10 26V15l6.7-3.7 7 3.7v11" />
      <circle cx="24.7" cy="8.4" r="2.2" />
    </svg>
  )
}

function AssetLine({ item, selected, onClick }: { item: SceneItem; selected: boolean; onClick: () => void }) {
  const Icon = item.category.includes('绿植') ? Leaf : item.kind === 'pendant' ? Lamp : item.kind === 'sofa' ? Armchair : item.kind === 'model' ? Box : Home
  return (
    <button className={`asset-line ${selected ? 'is-selected' : ''}`} onClick={onClick} data-testid={`asset-${item.id}`}>
      <span className="asset-icon"><Icon size={17} strokeWidth={1.6} /></span>
      <span className="asset-copy">
        <span>{item.name}</span>
        <small>{item.category}</small>
      </span>
      {selected ? <Check size={15} className="selected-check" /> : <span className="asset-dot" />}
    </button>
  )
}

function App() {
  const [items, setItems] = useState<SceneItem[]>(INITIAL_ITEMS)
  const [selectedId, setSelectedId] = useState('sofa-main')
  const [viewMode, setViewMode] = useState<ViewMode>('design')
  const [quality, setQuality] = useState<'preview' | 'photo'>('photo')
  const [exposure, setExposure] = useState(0.82)
  const [hour, setHour] = useState(15.6)
  const [importMode, setImportMode] = useState<ImportMode>('replace')
  const [pathTracing, setPathTracing] = useState(false)
  const [pathTraceStatus, setPathTraceStatus] = useState<PathTraceStatus>({ stage: '准备物理场景', samples: 0, maxSamples: 64, progress: 0 })
  const [status, setStatus] = useState('方案已保存')
  const [sceneReady, setSceneReady] = useState(false)
  const [mobilePanel, setMobilePanel] = useState<'none' | 'assets' | 'inspector'>('none')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { active, progress } = useProgress()

  const selected = items.find((item) => item.id === selectedId) ?? items[0]
  const finish = FINISHES.find((entry) => entry.id === selected?.finish) ?? FINISHES[0]

  useEffect(() => {
    if (!status) return
    const timer = window.setTimeout(() => setStatus('方案已保存'), 3200)
    return () => window.clearTimeout(timer)
  }, [status])

  const importKey = useMemo(() => items.map((item) => `${item.id}:${item.kind}:${item.modelUrl ?? ''}`).join('|'), [items])

  const handlePickFile = (mode: ImportMode) => {
    setImportMode(mode)
    fileInputRef.current?.click()
  }

  const handleFile = async (file: File | undefined) => {
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.glb')) {
      setStatus('请选择内嵌纹理的 .glb 文件')
      return
    }
    try {
      const buffer = await file.arrayBuffer()
      const loader = new GLTFLoader()
      const gltf = await loader.parseAsync(buffer, '')
      const object = gltf.scene
      const box = new THREE.Box3().setFromObject(object)
      const size = box.getSize(new THREE.Vector3())
      const horizontal = Math.max(size.x, size.z, 0.01)
      const scale = 1.55 / horizontal
      object.scale.multiplyScalar(scale)
      object.updateMatrixWorld(true)
      const grounded = new THREE.Box3().setFromObject(object)
      object.position.y -= grounded.min.y
      object.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.castShadow = true
          child.receiveShadow = true
          const materials = Array.isArray(child.material) ? child.material : [child.material]
          materials.forEach((material) => {
            if (material instanceof THREE.MeshStandardMaterial) {
              material.envMapIntensity = 1.35
              material.needsUpdate = true
            }
          })
        }
      })

      if (importMode === 'replace' && selected) {
        setItems((current) => current.map((item) => item.id === selected.id
          ? { ...item, kind: 'imported', importedObject: object, name: file.name.replace(/\.glb$/i, ''), category: '导入模型', dimensions: '按 GLB 实际包围盒适配' }
          : item))
        setStatus(`已将 ${file.name} 应用到当前家具`)
      } else {
        const id = `imported-${Date.now()}`
        const item: SceneItem = {
          id,
          name: file.name.replace(/\.glb$/i, ''),
          category: '导入模型',
          kind: 'imported',
          importedObject: object,
          position: [2.7, 0, 2.6],
          rotation: 0,
          finish: 'oat',
          dimensions: '按 GLB 实际包围盒适配',
        }
        setItems((current) => [...current, item])
        setSelectedId(id)
        setStatus(`已导入 ${file.name}`)
      }
    } catch (error) {
      setStatus(`GLB 导入失败：${error instanceof Error ? error.message : String(error)}`)
    }
  }

  const changeFinish = (finishId: string) => {
    setItems((current) => current.map((item) => item.id === selected.id ? { ...item, finish: finishId } : item))
    setStatus('材质已更新，阴影与反射已重新计算')
  }

  const modeLabel = viewMode === 'design' ? '设计视角' : viewMode === 'walk' ? '空间漫游' : '照片构图'
  const switchView = (mode: ViewMode) => {
    setPathTracing(false)
    setViewMode(mode)
  }
  const startPathTracing = () => {
    setViewMode('photo')
    setPathTraceStatus({ stage: '准备物理场景', samples: 0, maxSamples: 64, progress: 0 })
    setPathTracing(true)
    setStatus('正在生成路径追踪渲染图')
  }

  return (
    <div className={`app-shell mode-${viewMode}`} data-testid="app-shell">
      <header className="topbar">
        <div className="brand-area">
          <ProductMark />
          <h1 className="brand-name">AI Home Studio</h1>
          <span className="topbar-rule" />
          <button className="project-name" aria-label="切换项目">
            云栖公寓 / 客餐厅
            <ChevronDown size={14} />
          </button>
          <span className="save-state" data-testid="save-state"><span className="save-dot" />{status}</span>
        </div>
        <div className="top-actions">
          <button className="icon-button" aria-label="撤销"><Undo2 size={17} /></button>
          <button className="icon-button" aria-label="重做"><Redo2 size={17} /></button>
          <button className="mobile-menu" aria-label="打开资产面板" onClick={() => setMobilePanel(mobilePanel === 'assets' ? 'none' : 'assets')}><Menu size={18} /></button>
          <button className="secondary-button" onClick={() => handlePickFile('replace')} data-testid="replace-glb"><Upload size={15} />替换模型</button>
          <button className="primary-button" onClick={() => { if (viewMode !== 'photo') { setViewMode('photo'); setStatus('已进入照片构图，再次点击导出 PNG'); return } window.dispatchEvent(new Event('ai-home-capture')); setStatus('照片已导出') }} data-testid="export-photo"><Download size={15} />{viewMode === 'photo' ? '导出 PNG' : '照片构图'}</button>
        </div>
      </header>

      <main className="workspace">
        <aside className={`palette-panel ${mobilePanel === 'assets' ? 'mobile-open' : ''}`} aria-label="场景与资产">
          <div className="panel-heading">
            <div>
              <h2>客厅 · 光影方案 C</h2>
            </div>
            <button className="icon-button slim" aria-label="关闭面板" onClick={() => setMobilePanel('none')}><X size={16} /></button>
          </div>

          <div className="project-meta">
            <div><span>46.8</span><small>m²</small></div>
            <p>南向落地窗 · 午后自然光<br />层高 3.1 m · 已布置 6 件</p>
          </div>

          <nav className="panel-tabs" aria-label="资产分类">
            <button className="is-active"><Layers size={15} />对象</button>
            <button><Palette size={15} />材质</button>
            <button><SlidersHorizontal size={15} />光线</button>
          </nav>

          <div className="list-meta"><span>场景对象</span><span>{items.length}</span></div>
          <div className="asset-list">
            {items.map((item) => (
              <AssetLine key={item.id} item={item} selected={item.id === selectedId} onClick={() => { setSelectedId(item.id); setMobilePanel('none') }} />
            ))}
          </div>

          <div className="palette-import">
            <button onClick={() => handlePickFile('add')} className="import-button" data-testid="import-glb"><Upload size={15} />导入 GLB 家具</button>
            <p>内嵌纹理，自动按实际包围盒落地。</p>
          </div>

          <div className="palette-footer">
            <div className="avatar-stack"><span>林</span><span>AI</span></div>
            <span>方案协作中</span>
            <button aria-label="更多操作">···</button>
          </div>
        </aside>

        <section className="canvas-panel" id="walk-lock-surface">
          <Canvas
            shadows
            frameloop={pathTracing ? 'never' : 'always'}
            dpr={viewMode === 'photo' ? [1.25, 2] : [1, 1.5]}
            gl={{ antialias: true, alpha: false, preserveDrawingBuffer: true, powerPreference: 'high-performance', toneMapping: THREE.ACESFilmicToneMapping }}
            camera={{ position: [4.05, 1.82, 6.05], fov: 36, near: 0.04, far: 90 }}
            onCreated={({ gl }) => {
              gl.toneMappingExposure = exposure
              gl.shadowMap.type = THREE.PCFShadowMap
              gl.domElement.setAttribute('data-testid', 'viewport-canvas')
            }}
            data-testid="canvas-wrap"
          >
            <StudioScene
              items={items}
              selectedId={selectedId}
              onSelect={setSelectedId}
              viewMode={viewMode}
              quality={quality}
              exposure={exposure}
              hour={hour}
              contactKey={importKey}
              pathTracing={pathTracing}
              onPathTraceStatus={setPathTraceStatus}
              onReady={() => setSceneReady(true)}
            />
          </Canvas>

          <div className="canvas-top">
            <div className="canvas-heading">
              <div className="view-switcher" role="group" aria-label="视图模式">
                <button data-testid="view-design" className={viewMode === 'design' && !pathTracing ? 'is-active' : ''} onClick={() => switchView('design')}><Rotate3D size={15} />设计</button>
                <button data-testid="view-walk" className={viewMode === 'walk' && !pathTracing ? 'is-active' : ''} onClick={() => switchView('walk')}><Footprints size={15} />漫游</button>
                <button data-testid="view-photo" className={viewMode === 'photo' && !pathTracing ? 'is-active' : ''} onClick={() => switchView('photo')}><Camera size={15} />照片</button>
              </div>
              <div className="canvas-title-block">
                <h2>客厅 · 光影方案 C</h2>
                <p>自然光研究 / 南向落地窗 / 46.8 m²</p>
              </div>
            </div>
            <div className="canvas-top-actions">
              {viewMode === 'photo' && !pathTracing && (
                <button className="path-trace-action" onClick={startPathTracing} data-testid="start-path-trace"><Sparkles size={15} />路径追踪</button>
              )}
              <div className="render-badge"><span className="live-dot" />{quality === 'photo' ? 'PBR · HDRI · AO' : '流畅预览'}</div>
            </div>
          </div>

          {viewMode === 'walk' && (
            <div className="walk-hint"><Footprints size={16} /><span>W A S D 移动 · 鼠标拖拽观察 · Shift 加速</span></div>
          )}

          {viewMode === 'photo' && (
            <div className="photo-frame" aria-hidden="true"><span>32 mm</span><span>f/4.0</span><span>ACES</span></div>
          )}

          <div className="canvas-bottom">
            <div className="light-control">
              <Sun size={16} />
              <span>{hour < 12 ? '上午' : hour < 17 ? '午后' : '傍晚'} {Math.floor(hour)}:{String(Math.round((hour % 1) * 60)).padStart(2, '0')}</span>
              <input aria-label="日照时间" data-testid="hour-slider" type="range" min="8" max="19" step="0.1" value={hour} onChange={(event) => setHour(Number(event.target.value))} />
            </div>
            <div className="exposure-control">
              <span>曝光</span>
              <input aria-label="曝光" data-testid="exposure-slider" type="range" min="0.65" max="1.55" step="0.01" value={exposure} onChange={(event) => setExposure(Number(event.target.value))} />
              <span className="mono">{exposure >= 1 ? '+' : ''}{(Math.log2(exposure)).toFixed(1)} EV</span>
            </div>
            <button className="quality-button" aria-label={quality === 'photo' ? '切换到流畅预览' : '切换到照片级预览'} onClick={() => setQuality(quality === 'photo' ? 'preview' : 'photo')} data-testid="quality-toggle">
              <SlidersHorizontal size={15} />{quality === 'photo' ? '照片级' : '流畅'}
            </button>
          </div>

          <div className="canvas-status">
            <span><MousePointer2 size={13} />{modeLabel}</span>
            <span><span className="mono">x</span> 0.0 · <span className="mono">y</span> 0.0</span>
            <span>点击家具选择 · 拖拽旋转视角</span>
          </div>

          {pathTracing && (
            <div className="path-trace-overlay" data-testid="path-trace-overlay">
              <div className="path-trace-card" data-testid="path-trace-card">
                <div className="path-trace-copy">
                  <span className="path-trace-kicker"><Sparkles size={13} />GPU PATH TRACING</span>
                  <h3>{pathTraceStatus.stage}</h3>
                  <p>{pathTraceStatus.error ?? `${pathTraceStatus.samples} / ${pathTraceStatus.maxSamples} 累计采样`}</p>
                </div>
                <div className="path-trace-progress"><span style={{ width: `${pathTraceStatus.progress}%` }} /></div>
                <div className="path-trace-actions">
                  <button className="secondary-button" onClick={() => { setPathTracing(false); setStatus('已退出路径追踪') }}>停止并返回</button>
                  <button className="primary-button" disabled={pathTraceStatus.samples < 1} onClick={() => { window.dispatchEvent(new Event('ai-home-capture')); setStatus('路径追踪图已导出') }}>保存渲染图</button>
                </div>
              </div>
            </div>
          )}

          {(active || !sceneReady) && (
            <div className="loading-overlay" data-testid="scene-loading">
              <ProductMark />
              <span>正在建立高保真场景</span>
              <div className="loading-track"><span style={{ width: `${progress}%` }} /></div>
            </div>
          )}
        </section>

        <aside className={`inspector ${mobilePanel === 'inspector' ? 'mobile-open' : ''}`} aria-label="选中对象">
          <div className="inspector-heading">
            <div><span className="selection-context">当前对象</span><h2 data-testid="selected-name">{selected?.name}</h2></div>
            <button className="icon-button slim" aria-label="对象选项">···</button>
          </div>

          <div className="object-preview" aria-label="家具材质预览">
            <div className="object-preview-shape" style={{ backgroundColor: finish.color }} />
            <div className="object-preview-caption"><span>{selected?.category}</span><span>{selected?.id.startsWith('imported') ? 'GLB' : 'PBR'}</span></div>
          </div>

          <div className="inspector-section">
            <div className="section-title">尺寸与位置</div>
            <dl className="property-grid">
              <div><dt>宽</dt><dd>{selected?.dimensions.split(' × ')[0] ?? '—'}</dd></div>
              <div><dt>深 / 高</dt><dd>{selected?.dimensions.split(' × ').slice(1).join(' × ') || '—'}</dd></div>
              <div><dt>楼层</dt><dd>1F · 客厅</dd></div>
              <div><dt>对象 ID</dt><dd className="mono">{selected?.id.slice(0, 12)}</dd></div>
            </dl>
          </div>

          <div className="inspector-section">
            <div className="section-title">主材</div>
            <div className="finish-grid">
              {FINISHES.map((entry) => (
                <button key={entry.id} className={selected?.finish === entry.id ? 'is-active' : ''} onClick={() => changeFinish(entry.id)} title={entry.label} data-testid={`finish-${entry.id}`}>
                  <span style={{ backgroundColor: entry.color }} />
                  <small>{entry.label}</small>
                </button>
              ))}
            </div>
            <button className="wide-control"><FileImage size={15} />替换面料与贴图<ChevronDown size={14} /></button>
          </div>

          <div className="inspector-section">
            <div className="section-title">模型资产</div>
            <button className="wide-control" onClick={() => handlePickFile('replace')} data-testid="replace-current-glb"><Upload size={15} />用 GLB 替换当前对象</button>
            <p className="small-note">支持 .glb 内嵌纹理；替换时保留对象位置、旋转和选中关系。</p>
          </div>

          <div className="inspector-section checks">
            <div><span>阴影与接触暗角</span><span className="check-state"><Check size={13} />开启</span></div>
            <div><span>HDRI 环境反射</span><span className="check-state"><Check size={13} />开启</span></div>
            <div><span>ACES 色调映射</span><span className="check-state"><Check size={13} />开启</span></div>
          </div>

          <div className="inspector-footer">
            <Eye size={15} /><span>当前为 {quality === 'photo' ? '照片级预览' : '交互预览'}</span>
          </div>
        </aside>
      </main>

      <nav className="mobile-toolbar" aria-label="移动端工具">
        <button className={mobilePanel === 'assets' ? 'is-active' : ''} onClick={() => setMobilePanel(mobilePanel === 'assets' ? 'none' : 'assets')}><Layers size={18} /><span>对象</span></button>
        <button onClick={() => setMobilePanel('none')}><MousePointer2 size={18} /><span>选择</span></button>
        <button className={mobilePanel === 'inspector' ? 'is-active' : ''} onClick={() => setMobilePanel(mobilePanel === 'inspector' ? 'none' : 'inspector')}><SlidersHorizontal size={18} /><span>属性</span></button>
      </nav>

      <input
        ref={fileInputRef}
        type="file"
        accept=".glb,model/gltf-binary"
        hidden
        data-testid="glb-file-input"
        onChange={(event) => handleFile(event.target.files?.[0])}
      />
    </div>
  )
}

export default App
