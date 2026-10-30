import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import {
  ContactShadows,
  Environment,
  MeshReflectorMaterial,
  OrbitControls,
  RoundedBox,
  SoftShadows,
  useCursor,
  useGLTF,
  useTexture,
} from '@react-three/drei'
import {
  Bloom,
  EffectComposer,
  N8AO,
  Outline,
  Select,
  Selection,
  SMAA,
  Vignette,
} from '@react-three/postprocessing'
import * as THREE from 'three'

export type ViewMode = 'design' | 'walk' | 'photo'

export interface SceneItem {
  id: string
  name: string
  category: string
  kind: 'sofa' | 'model' | 'pendant' | 'imported'
  modelUrl?: string
  importedObject?: THREE.Object3D
  targetSize?: number
  fit?: 'width' | 'height'
  position: [number, number, number]
  rotation: number
  finish: string
  dimensions: string
}

const FINISH_COLORS: Record<string, string> = {
  oat: '#b8a58f',
  moss: '#777b62',
  clay: '#8b5c49',
  graphite: '#484844',
}

const MODELS = {
  coffeeTable: '/assets/models/modern_coffee_table_01/modern_coffee_table_01_1k.gltf',
  plant: '/assets/models/potted_plant_02/potted_plant_02_1k.gltf',
  sheenChair: '/assets/models/sheen-chair/SheenChair.glb',
}

useGLTF.preload(MODELS.coffeeTable)
useGLTF.preload(MODELS.plant)
useGLTF.preload(MODELS.sheenChair)

interface StudioSceneProps {
  items: SceneItem[]
  selectedId: string
  onSelect: (id: string) => void
  viewMode: ViewMode
  quality: 'preview' | 'photo'
  exposure: number
  hour: number
  contactKey: string
  onReady: () => void
}

function WallMaterial({ color = "#ded8cc", repeat = [2.4, 1.8] as [number, number] }: { color?: string; repeat?: [number, number] }) {
  const [mapSource, normalSource, roughnessSource] = useTexture([
    '/assets/textures/plaster/color.jpg',
    '/assets/textures/plaster/normal.jpg',
    '/assets/textures/plaster/roughness.jpg',
  ])
  const [map, normalMap, roughnessMap] = useMemo(() => {
    const textures = [mapSource.clone(), normalSource.clone(), roughnessSource.clone()]
    for (const texture of textures) {
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping
      texture.repeat.set(repeat[0], repeat[1])
      texture.anisotropy = 8
      texture.needsUpdate = true
    }
    textures[0].colorSpace = THREE.SRGBColorSpace
    return textures
  }, [mapSource, normalSource, roughnessSource, repeat])
  return (
    <meshPhysicalMaterial
      map={map}
      normalMap={normalMap}
      normalScale={new THREE.Vector2(0.28, 0.28)}
      roughnessMap={roughnessMap}
      color={color}
      roughness={0.78}
      metalness={0}
      sheen={0.18}
      sheenColor="#fff9ef"
      envMapIntensity={0.44}
    />
  )
}

function FloorMaterial() {
  const [map, normalMap, roughnessMap] = useTexture([
    '/assets/textures/woodfloor/color.jpg',
    '/assets/textures/woodfloor/normal.jpg',
    '/assets/textures/woodfloor/roughness.jpg',
  ])

  useMemo(() => {
    for (const texture of [map, normalMap, roughnessMap]) {
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping
      texture.repeat.set(4.8, 4.3)
      texture.anisotropy = 8
      texture.needsUpdate = true
    }
    map.colorSpace = THREE.SRGBColorSpace
  }, [map, normalMap, roughnessMap])

  return (
    <meshPhysicalMaterial
      map={map}
      normalMap={normalMap}
      normalScale={new THREE.Vector2(0.62, 0.62)}
      roughnessMap={roughnessMap}
      color="#b89b78"
      roughness={0.72}
      metalness={0}
      clearcoat={0.14}
      clearcoatRoughness={0.54}
      envMapIntensity={0.68}
    />
  )
}

function ReflectiveFloor({ quality }: { quality: 'preview' | 'photo' }) {
  const [map, normalMap, roughnessMap] = useTexture([
    '/assets/textures/woodfloor/color.jpg',
    '/assets/textures/woodfloor/normal.jpg',
    '/assets/textures/woodfloor/roughness.jpg',
  ])
  const textures = useMemo(() => {
    const cloned = [map.clone(), normalMap.clone(), roughnessMap.clone()]
    for (const texture of cloned) {
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping
      texture.repeat.set(4.8, 4.3)
      texture.anisotropy = 8
      texture.needsUpdate = true
    }
    cloned[0].colorSpace = THREE.SRGBColorSpace
    return cloned
  }, [map, normalMap, roughnessMap])
  return (
    <MeshReflectorMaterial
      map={textures[0]}
      normalMap={textures[1]}
      normalScale={new THREE.Vector2(0.4, 0.4)}
      roughnessMap={textures[2]}
      color="#b89b78"
      roughness={0.78}
      metalness={0}
      mirror={0.16}
      mixBlur={1}
      mixStrength={0.32}
      blur={[170, 46]}
      resolution={quality === 'photo' ? 768 : 384}
      depthScale={0.55}
      minDepthThreshold={0.2}
      maxDepthThreshold={1.35}
      depthToBlurRatioBias={0.24}
      reflectorOffset={0.002}
    />
  )
}

function FabricMaterial({ color, repeat = [2.4, 2.4] }: { color: string; repeat?: [number, number] }) {
  const [mapSource, normalSource, roughnessSource] = useTexture([
    '/assets/textures/fabric/color.jpg',
    '/assets/textures/fabric/normal.jpg',
    '/assets/textures/fabric/roughness.jpg',
  ])

  const [map, normalMap, roughnessMap] = useMemo(() => {
    const cloned = [mapSource.clone(), normalSource.clone(), roughnessSource.clone()]
    for (const texture of cloned) {
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping
      texture.repeat.set(repeat[0], repeat[1])
      texture.anisotropy = 8
      texture.needsUpdate = true
    }
    cloned[0].colorSpace = THREE.SRGBColorSpace
    return cloned
  }, [mapSource, normalSource, roughnessSource, repeat])

  return (
    <meshPhysicalMaterial
      map={map}
      normalMap={normalMap}
      normalScale={new THREE.Vector2(0.5, 0.5)}
      roughnessMap={roughnessMap}
      color={color}
      roughness={0.92}
      metalness={0}
      sheen={0.55}
      sheenRoughness={0.74}
      sheenColor="#f1dfc9"
      envMapIntensity={0.72}
    />
  )
}

function Sofa({ color }: { color: string }) {
  const legMaterial = <meshStandardMaterial color="#171614" metalness={0.58} roughness={0.32} />
  return (
    <group>
      <RoundedBox args={[2.72, 0.34, 1.04]} radius={0.1} smoothness={7} position={[0, 0.35, 0]} castShadow receiveShadow>
        <FabricMaterial color={color} />
      </RoundedBox>
      {[-0.78, 0, 0.78].map((x, index) => (
        <RoundedBox key={`seat-${x}`} args={[0.76, 0.21, 0.84]} radius={0.09} smoothness={8} position={[x, 0.58, 0.09]} rotation={[0.01, index === 1 ? 0.012 : 0, 0]} castShadow receiveShadow>
          <FabricMaterial color={color} repeat={[1.15, 1.2]} />
        </RoundedBox>
      ))}
      {[-0.38, 0.38].map((x) => (
        <mesh key={`seam-${x}`} position={[x, 0.684, 0.515]}>
          <boxGeometry args={[0.012, 0.012, 0.75]} />
          <meshStandardMaterial color="#756654" roughness={0.92} />
        </mesh>
      ))}
      <RoundedBox args={[2.45, 0.72, 0.27]} radius={0.11} smoothness={7} position={[0, 0.86, -0.39]} rotation={[-0.06, 0, 0]} castShadow receiveShadow>
        <FabricMaterial color={color} repeat={[2.2, 1.8]} />
      </RoundedBox>
      {[-0.82, 0, 0.82].map((x, index) => (
        <RoundedBox key={x} args={[0.72, 0.64, 0.22]} radius={0.1} smoothness={7} position={[x, 0.9, -0.28 - index * 0.005]} rotation={[-0.11, index === 0 ? 0.03 : index === 2 ? -0.03 : 0, 0]} castShadow receiveShadow>
          <FabricMaterial color={color} repeat={[1.25, 1.65]} />
        </RoundedBox>
      ))}
      {[-1.21, 1.21].map((x) => (
        <RoundedBox key={x} args={[0.3, 0.57, 1.02]} radius={0.12} smoothness={7} position={[x, 0.64, 0]} castShadow receiveShadow>
          <FabricMaterial color={color} repeat={[0.8, 1.4]} />
        </RoundedBox>
      ))}
      {[[-1.08, 0.83], [1.08, 0.83]].map(([x, z]) => (
        <mesh key={`${x}-${z}`} position={[x, 0.15, z]} castShadow>
          <cylinderGeometry args={[0.035, 0.026, 0.3, 20]} />
          {legMaterial}
        </mesh>
      ))}
      <RoundedBox args={[0.52, 0.5, 0.15]} radius={0.08} smoothness={6} position={[-0.78, 0.82, 0.01]} rotation={[0.08, 0.38, -0.11]} castShadow receiveShadow>
        <meshPhysicalMaterial color="#5b6250" roughness={0.96} sheen={0.6} sheenColor="#b6b59b" />
      </RoundedBox>
      <RoundedBox args={[0.48, 0.46, 0.14]} radius={0.08} smoothness={6} position={[0.7, 0.79, 0.02]} rotation={[0.03, -0.28, 0.08]} castShadow receiveShadow>
        <meshPhysicalMaterial color="#c5b6a6" roughness={0.95} sheen={0.5} sheenColor="#f3e4d2" />
      </RoundedBox>
      <RoundedBox args={[1.08, 0.07, 0.52]} radius={0.035} smoothness={5} position={[-0.3, 0.72, 0.46]} rotation={[-0.14, 0.1, 0.05]} castShadow receiveShadow>
        <meshPhysicalMaterial color="#6f7562" roughness={0.9} sheen={0.45} sheenColor="#d0ceb7" />
      </RoundedBox>
    </group>
  )
}

function Pendant({ quality }: { quality: 'preview' | 'photo' }) {
  return (
    <group position={[0, -0.02, 0]}>
      <mesh position={[0, -0.18, 0]} castShadow>
        <cylinderGeometry args={[0.11, 0.11, 0.08, 32]} />
        <meshStandardMaterial color="#2c2a25" metalness={0.68} roughness={0.28} />
      </mesh>
      <mesh position={[0, -0.48, 0]}>
        <cylinderGeometry args={[0.012, 0.012, 0.58, 12]} />
        <meshStandardMaterial color="#171714" metalness={0.45} roughness={0.35} />
      </mesh>
      <mesh position={[0, -0.8, 0]} castShadow receiveShadow>
        <coneGeometry args={[0.36, 0.25, 64, 1, true]} />
        <meshPhysicalMaterial color="#403e37" metalness={0.28} roughness={0.42} clearcoat={0.2} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, -0.955, 0]}>
        <cylinderGeometry args={[0.18, 0.18, 0.018, 32]} />
        <meshStandardMaterial color="#ffe7bd" emissive="#ffc777" emissiveIntensity={quality === 'photo' ? 7 : 4} />
      </mesh>
      <pointLight position={[0, -1.0, 0]} color="#ffd5a0" intensity={quality === 'photo' ? 7.5 : 4.5} distance={7} decay={2} />
    </group>
  )
}

function WavyCurtain({ x, flip = false }: { x: number; flip?: boolean }) {
  const geometry = useMemo(() => {
    const width = 1.12
    const height = 2.58
    const segmentsX = 28
    const segmentsY = 2
    const positions: number[] = []
    const indices: number[] = []
    for (let y = 0; y <= segmentsY; y += 1) {
      for (let ix = 0; ix <= segmentsX; ix += 1) {
        const u = ix / segmentsX
        const px = (u - 0.5) * width
        const wave = Math.sin(u * Math.PI * 7) * 0.055 + Math.sin(u * Math.PI * 13) * 0.018
        positions.push(px, y * height, wave)
      }
    }
    for (let y = 0; y < segmentsY; y += 1) {
      for (let ix = 0; ix < segmentsX; ix += 1) {
        const a = y * (segmentsX + 1) + ix
        const b = a + 1
        const c = a + segmentsX + 1
        const d = c + 1
        indices.push(a, c, b, b, c, d)
      }
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    g.setIndex(indices)
    g.computeVertexNormals()
    return g
  }, [])

  return (
    <mesh geometry={geometry} position={[x, 0.12, -3.62]} rotation={[0, flip ? Math.PI : 0, 0]} castShadow receiveShadow>
      <meshPhysicalMaterial color="#ded7ca" roughness={0.92} transparent opacity={0.58} side={THREE.DoubleSide} depthWrite={false} sheen={0.35} sheenColor="#fff5e8" />
    </mesh>
  )
}

function TableVignette() {
  return (
    <group position={[-0.7, 0.545, 1.18]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.018, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.38, 0.26, 0.035]} />
        <meshPhysicalMaterial color="#d9cfbd" roughness={0.86} clearcoat={0.05} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0.16]} position={[0.03, 0.052, -0.01]} castShadow receiveShadow>
        <boxGeometry args={[0.32, 0.22, 0.03]} />
        <meshPhysicalMaterial color="#505b4d" roughness={0.88} clearcoat={0.04} />
      </mesh>
      <mesh position={[0.55, 0.09, 0.02]} castShadow receiveShadow>
        <cylinderGeometry args={[0.12, 0.09, 0.18, 32]} />
        <meshPhysicalMaterial color="#b9aa93" roughness={0.46} clearcoat={0.3} clearcoatRoughness={0.3} />
      </mesh>
      <mesh position={[0.55, 0.24, 0.02]} rotation={[0.2, 0, -0.18]} castShadow>
        <cylinderGeometry args={[0.006, 0.006, 0.28, 8]} />
        <meshStandardMaterial color="#4a3d2f" roughness={0.8} />
      </mesh>
      <mesh position={[0.6, 0.32, 0.02]} rotation={[0.3, 0, 0.5]} castShadow>
        <planeGeometry args={[0.16, 0.09]} />
        <meshStandardMaterial color="#596452" roughness={0.92} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

function FloorLamp({ quality }: { quality: 'preview' | 'photo' }) {
  return (
    <group position={[-2.8, 0, 0.2]} rotation={[0, 0.25, 0]}>
      <mesh position={[0, 0.025, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.18, 0.22, 0.05, 40]} />
        <meshStandardMaterial color="#2b2822" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.72, 0]} castShadow>
        <cylinderGeometry args={[0.012, 0.012, 1.36, 12]} />
        <meshStandardMaterial color="#5a4c39" metalness={0.75} roughness={0.28} />
      </mesh>
      <mesh position={[0.12, 1.44, 0]} rotation={[0, 0, -0.65]} castShadow>
        <cylinderGeometry args={[0.01, 0.01, 0.42, 12]} />
        <meshStandardMaterial color="#5a4c39" metalness={0.75} roughness={0.28} />
      </mesh>
      <mesh position={[0.28, 1.52, 0]} rotation={[0, 0, Math.PI]} castShadow receiveShadow>
        <coneGeometry args={[0.22, 0.24, 40, 1, true]} />
        <meshPhysicalMaterial color="#8a7358" roughness={0.7} metalness={0.2} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0.28, 1.41, 0]}>
        <sphereGeometry args={[0.06, 24, 16]} />
        <meshStandardMaterial color="#ffe7bd" emissive="#ffc777" emissiveIntensity={quality === 'photo' ? 5 : 3} />
      </mesh>
      <pointLight position={[0.28, 1.35, 0]} color="#ffc885" intensity={quality === 'photo' ? 4.5 : 2.4} distance={4.5} decay={2} />
    </group>
  )
}

function WindowWall() {
  const wallMaterial = <WallMaterial color="#ddd7cb" repeat={[2.1, 1.7]} />
  return (
    <group>
      <mesh position={[-4.38, 1.55, -4]} castShadow receiveShadow><boxGeometry args={[1.08, 3.1, 0.16]} />{wallMaterial}</mesh>
      <mesh position={[3.72, 1.55, -4]} castShadow receiveShadow><boxGeometry args={[1.35, 3.1, 0.16]} />{wallMaterial}</mesh>
      <mesh position={[0.35, 2.9, -4]} castShadow receiveShadow><boxGeometry args={[7.05, 0.4, 0.16]} />{wallMaterial}</mesh>
      <mesh position={[0.35, 0.18, -4]} castShadow receiveShadow><boxGeometry args={[7.05, 0.36, 0.16]} />{wallMaterial}</mesh>

      <mesh position={[0.35, 1.63, -3.93]}>
        <planeGeometry args={[6.86, 2.6]} />
        <meshPhysicalMaterial color="#dceef3" roughness={0.03} metalness={0} transparent opacity={0.07} transmission={0} ior={1.45} envMapIntensity={1.85} depthWrite={false} />
      </mesh>

      {[-3.08, -1.22, 0.64, 2.5, 3.7].map((x) => (
        <mesh key={x} position={[x, 1.63, -3.84]} castShadow>
          <boxGeometry args={[0.055, 2.66, 0.08]} />
          <meshStandardMaterial color="#24231f" metalness={0.48} roughness={0.33} />
        </mesh>
      ))}
      {[0.31, 1.63, 2.95].map((y) => (
        <mesh key={y} position={[0.35, y, -3.84]} castShadow>
          <boxGeometry args={[6.9, 0.045, 0.08]} />
          <meshStandardMaterial color="#24231f" metalness={0.48} roughness={0.33} />
        </mesh>
      ))}
      <WavyCurtain x={-3.13} />
      <WavyCurtain x={3.54} flip />
    </group>
  )
}

function BalconyExterior() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.16, -6.4]} receiveShadow>
        <planeGeometry args={[9.4, 5.2]} />
        <meshStandardMaterial color="#b9b6ae" roughness={0.88} metalness={0.02} />
      </mesh>
      <mesh position={[0, 1.02, -8.72]} castShadow>
        <boxGeometry args={[8.8, 0.055, 0.055]} />
        <meshStandardMaterial color="#2f3332" metalness={0.55} roughness={0.35} />
      </mesh>
      {[-4.15, -2.8, -1.45, 0, 1.45, 2.8, 4.15].map((x) => (
        <mesh key={`post-${x}`} position={[x, 0.5, -8.72]} castShadow>
          <boxGeometry args={[0.032, 1.04, 0.032]} />
          <meshStandardMaterial color="#343735" metalness={0.62} roughness={0.32} />
        </mesh>
      ))}
      <mesh position={[0, 0.54, -8.7]}>
        <planeGeometry args={[8.65, 0.9]} />
        <meshPhysicalMaterial color="#bed0d2" transparent opacity={0.12} roughness={0.06} metalness={0} depthWrite={false} />
      </mesh>

    </group>
  )
}

function RoomShell({ quality }: { quality: 'preview' | 'photo' }) {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[10.2, 9.2]} />
        <ReflectiveFloor quality={quality} />
      </mesh>

      <mesh position={[-4.7, 1.56, -0.1]} receiveShadow castShadow>
        <boxGeometry args={[0.18, 3.12, 8.15]} />
        <WallMaterial color="#d8d1c5" repeat={[3.1, 2.2]} />
      </mesh>
      <mesh position={[-4.58, 0.07, -0.2]} castShadow receiveShadow>
        <boxGeometry args={[0.05, 0.14, 7.85]} />
        <meshStandardMaterial color="#f2ede5" roughness={0.62} />
      </mesh>

      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 3.12, -0.2]} receiveShadow>
        <planeGeometry args={[10, 8.3]} />
        <WallMaterial color="#e4dfd6" repeat={[3.4, 2.8]} />
      </mesh>

      <WindowWall />
      <BalconyExterior />

      <mesh position={[0, 0.12, 3.75]} receiveShadow>
        <boxGeometry args={[9.4, 0.24, 0.12]} />
        <meshStandardMaterial color="#b7a78f" roughness={0.72} />
      </mesh>

      <group position={[-4.57, 0, -1.15]}>
        {Array.from({ length: 28 }, (_, index) => (
          <mesh key={index} position={[0.02, 1.32, -1.35 + index * 0.1]} castShadow receiveShadow>
            <boxGeometry args={[0.1, 2.64, 0.035]} />
            <meshPhysicalMaterial color={index % 3 === 0 ? '#8f765a' : '#a08567'} roughness={0.58} clearcoat={0.12} clearcoatRoughness={0.48} />
          </mesh>
        ))}
      </group>

      <mesh position={[0.12, 2.99, -0.2]}>
        <boxGeometry args={[8.6, 0.035, 7.45]} />
        <meshStandardMaterial color="#f4efe7" emissive="#fff4df" emissiveIntensity={0.15} roughness={0.86} />
      </mesh>

      <group position={[-1.05, 1.68, -3.91]}>
        <mesh position={[0, 0, 0.02]} castShadow>
          <boxGeometry args={[1.64, 1.08, 0.05]} />
          <meshStandardMaterial color="#1e1b18" roughness={0.38} metalness={0.15} />
        </mesh>
        <mesh position={[0, 0, 0.055]}>
          <planeGeometry args={[1.48, 0.92]} />
          <meshStandardMaterial color="#8a745f" roughness={0.88} />
        </mesh>
        <mesh position={[-0.24, 0.03, 0.065]}>
          <circleGeometry args={[0.31, 48]} />
          <meshStandardMaterial color="#c49b70" roughness={0.94} />
        </mesh>
        <mesh position={[0.3, -0.12, 0.068]} rotation={[0, 0, -0.35]}>
          <planeGeometry args={[0.52, 0.22]} />
          <meshStandardMaterial color="#4d5146" roughness={0.92} />
        </mesh>
      </group>

      <group position={[3.15, 0, -2.4]}>
        <mesh position={[0, 0.48, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.3, 0.18, 0.48]} />
          <meshPhysicalMaterial color="#75634e" roughness={0.56} clearcoat={0.15} />
        </mesh>
        {[-0.52, 0.52].map((x) => (
          <mesh key={x} position={[x, 0.23, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.07, 0.46, 0.38]} />
            <meshStandardMaterial color="#27241f" metalness={0.55} roughness={0.36} />
          </mesh>
        ))}
        <mesh position={[-0.2, 0.68, 0]} castShadow>
          <sphereGeometry args={[0.14, 32, 24]} />
          <meshPhysicalMaterial color="#c9baa4" roughness={0.38} clearcoat={0.45} />
        </mesh>
        <mesh position={[0.26, 0.61, 0]} castShadow>
          <cylinderGeometry args={[0.06, 0.08, 0.22, 24]} />
          <meshPhysicalMaterial color="#5d6759" roughness={0.42} clearcoat={0.35} />
        </mesh>
      </group>
    </group>
  )
}

function Rug() {
  return (
    <group position={[-0.3, 0.028, 0.72]} rotation={[-Math.PI / 2, 0, 0]}>
      <mesh receiveShadow castShadow>
        <planeGeometry args={[5.1, 3.9, 48, 48]} />
        <FabricMaterial color="#a89c8a" repeat={[3.2, 2.5]} />
      </mesh>
      <mesh position={[0, 0, 0.005]}>
        <planeGeometry args={[4.75, 3.55]} />
        <meshPhysicalMaterial color="#b7ab98" roughness={0.98} sheen={0.7} sheenColor="#e0d4c2" transparent opacity={0.55} />
      </mesh>
    </group>
  )
}

function GltfObject({ url, targetSize = 1.4, fit = 'width', tint }: { url: string; targetSize?: number; fit?: 'width' | 'height'; tint: string }) {
  const { scene } = useGLTF(url)
  const clone = useMemo(() => {
    const object = scene.clone(true)
    object.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return
      child.castShadow = true
      child.receiveShadow = true
      const sourceMaterials = Array.isArray(child.material) ? child.material : [child.material]
      const materials = sourceMaterials.map((material) => {
        const copy = material.clone()
        if (copy instanceof THREE.MeshStandardMaterial) {
          copy.envMapIntensity = 1.35
          if (/fabric/i.test(copy.name)) {
            copy.color.set(tint)
            if (copy instanceof THREE.MeshPhysicalMaterial) {
              copy.sheenColor.set(new THREE.Color(tint).lerp(new THREE.Color("#f6e8d8"), 0.7))
              copy.sheen = 0.72
              copy.sheenRoughness = 0.68
            }
          }
          copy.needsUpdate = true
        }
        return copy
      })
      child.material = Array.isArray(child.material) ? materials : materials[0]
    })
    const initialBox = new THREE.Box3().setFromObject(object)
    const size = initialBox.getSize(new THREE.Vector3())
    const targetMetric = fit === 'height' ? size.y : Math.max(size.x, size.z)
    const scale = targetSize / Math.max(targetMetric, 0.001)
    object.scale.multiplyScalar(scale)
    object.updateMatrixWorld(true)
    const finalBox = new THREE.Box3().setFromObject(object)
    const center = finalBox.getCenter(new THREE.Vector3())
    object.position.x -= center.x
    object.position.z -= center.z
    object.position.y -= finalBox.min.y
    return object
  }, [scene, targetSize, fit, tint])

  return <primitive object={clone} />
}

function SceneObject({ item, selected, onSelect, setHovered, quality }: {
  item: SceneItem
  selected: boolean
  onSelect: (id: string) => void
  setHovered: (id: string | null) => void
  quality: 'preview' | 'photo'
}) {
  const tint = FINISH_COLORS[item.finish] ?? FINISH_COLORS.oat
  return (
    <Select enabled={selected}>
      <group
        position={item.position}
        rotation={[0, item.rotation, 0]}
        onPointerDown={(event) => {
          event.stopPropagation()
          onSelect(item.id)
        }}
        onPointerOver={(event) => {
          event.stopPropagation()
          setHovered(item.id)
        }}
        onPointerOut={() => setHovered(null)}
      >
        {item.kind === 'sofa' && <Sofa color={tint} />}
        {item.kind === 'pendant' && <Pendant quality={quality} />}
        {item.kind === 'model' && item.modelUrl && (
          <GltfObject url={item.modelUrl} targetSize={item.targetSize} fit={item.fit} tint={tint} />
        )}
        {item.kind === 'imported' && item.importedObject && <primitive object={item.importedObject} />}
      </group>
    </Select>
  )
}

function Lighting({ hour, quality }: { hour: number; quality: 'preview' | 'photo' }) {
  const daylight = Math.max(0, Math.min(1, (hour - 7) / 12))
  const warm = Math.max(0, 1 - Math.abs(hour - 15.5) / 5)
  const sunAngle = ((hour - 6) / 13) * Math.PI
  const sunX = Math.cos(sunAngle) * 8
  const sunY = Math.max(2.5, Math.sin(sunAngle) * 9)
  return (
    <>
      <ambientLight intensity={quality === 'photo' ? 0.09 : 0.18} color="#d9e4e8" />
      <hemisphereLight args={["#c7dbe8", "#5d4b35", quality === 'photo' ? 0.2 : 0.34]} />
      <directionalLight
        castShadow
        position={[sunX, sunY, -3.4]}
        target-position={[-0.8, 0, 0.3]}
        intensity={quality === 'photo' ? 4.8 * (0.42 + daylight * 0.78) : 3.1}
        color={hour < 10 || hour > 17 ? '#ffb36d' : `rgb(${255}, ${226 - warm * 12}, ${196 + warm * 20})`}
        shadow-mapSize-width={quality === 'photo' ? 2048 : 1024}
        shadow-mapSize-height={quality === 'photo' ? 2048 : 1024}
        shadow-bias={-0.0003}
        shadow-normalBias={0.035}
        shadow-camera-left={-7}
        shadow-camera-right={7}
        shadow-camera-top={7}
        shadow-camera-bottom={-7}
        shadow-camera-near={0.2}
        shadow-camera-far={28}
      />
      <spotLight
        position={[0.9, 2.82, 1.2]}
        color="#ffd2a2"
        intensity={quality === 'photo' ? 26 : 14}
        angle={0.72}
        penumbra={1}
        distance={8}
        decay={2}
        castShadow={quality === 'photo'}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-bias={-0.0002}
      />
      <pointLight position={[2.9, 2.35, -2.1]} color="#ffb871" intensity={quality === 'photo' ? 5.5 : 3} distance={5} decay={2} />
      <pointLight position={[-2.8, 1.9, -1.2]} color="#ffd8b1" intensity={quality === 'photo' ? 3.2 : 1.8} distance={5} decay={2} />
    </>
  )
}

function WalkMovement({ enabled }: { enabled: boolean }) {
  const { camera } = useThree()
  const keys = useRef<Record<string, boolean>>({})
  const forward = useRef(new THREE.Vector3())
  const right = useRef(new THREE.Vector3())
  const up = useRef(new THREE.Vector3(0, 1, 0))

  useEffect(() => {
    if (!enabled) return
    const down = (event: KeyboardEvent) => {
      if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ShiftLeft', 'ShiftRight'].includes(event.code)) {
        keys.current[event.code] = true
      }
    }
    const upHandler = (event: KeyboardEvent) => { keys.current[event.code] = false }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', upHandler)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', upHandler)
    }
  }, [enabled])

  useFrame((_, delta) => {
    if (!enabled) return
    const speed = keys.current.ShiftLeft || keys.current.ShiftRight ? 3.6 : 1.65
    camera.getWorldDirection(forward.current)
    forward.current.y = 0
    forward.current.normalize()
    right.current.crossVectors(forward.current, up.current).normalize()
    if (keys.current.KeyW) camera.position.addScaledVector(forward.current, speed * delta)
    if (keys.current.KeyS) camera.position.addScaledVector(forward.current, -speed * delta)
    if (keys.current.KeyD) camera.position.addScaledVector(right.current, speed * delta)
    if (keys.current.KeyA) camera.position.addScaledVector(right.current, -speed * delta)
    camera.position.y = 1.62
  })
  return null
}

function WalkLook({ enabled }: { enabled: boolean }) {
  const { gl, camera } = useThree()
  useEffect(() => {
    if (!enabled) return
    const element = gl.domElement
    const perspective = camera as THREE.PerspectiveCamera
    perspective.rotation.order = 'YXZ'
    let dragging = false
    let lastX = 0
    let lastY = 0
    const down = (event: PointerEvent) => {
      if (event.button !== 0) return
      dragging = true
      lastX = event.clientX
      lastY = event.clientY
      element.setPointerCapture(event.pointerId)
    }
    const move = (event: PointerEvent) => {
      if (!dragging) return
      const dx = event.clientX - lastX
      const dy = event.clientY - lastY
      lastX = event.clientX
      lastY = event.clientY
      perspective.rotation.y -= dx * 0.0032
      perspective.rotation.x = THREE.MathUtils.clamp(perspective.rotation.x - dy * 0.0028, -1.25, 1.25)
    }
    const up = (event: PointerEvent) => {
      dragging = false
      if (element.hasPointerCapture(event.pointerId)) element.releasePointerCapture(event.pointerId)
    }
    element.addEventListener('pointerdown', down)
    element.addEventListener('pointermove', move)
    element.addEventListener('pointerup', up)
    element.addEventListener('pointercancel', up)
    return () => {
      element.removeEventListener('pointerdown', down)
      element.removeEventListener('pointermove', move)
      element.removeEventListener('pointerup', up)
      element.removeEventListener('pointercancel', up)
    }
  }, [gl, camera, enabled])
  return null
}

function CameraRig({ viewMode }: { viewMode: ViewMode }) {
  const perspectiveCamera = useThree((state) => state.camera) as THREE.PerspectiveCamera
  useEffect(() => {
    const camera = perspectiveCamera
    if (viewMode === 'design') {
      camera.position.set(4.45, 2.65, 5.5)
      camera.lookAt(-0.2, 1.05, -0.1)
      camera.fov = 36
    } else if (viewMode === 'walk') {
      camera.position.set(2.55, 1.62, 3.3)
      camera.lookAt(-0.2, 1.42, -0.4)
      camera.fov = 58
    } else {
      camera.position.set(3.35, 1.58, 4.32)
      camera.lookAt(-0.2, 1.15, -0.1)
      camera.fov = 29
    }
    camera.updateProjectionMatrix()
  }, [perspectiveCamera, viewMode])
  return null
}

function SceneReady({ onReady }: { onReady: () => void }) {
  const frames = useRef(0)
  const announced = useRef(false)
  useFrame(() => {
    frames.current += 1
    if (frames.current >= 5 && !announced.current) {
      announced.current = true
      window.setTimeout(onReady, 250)
    }
  })
  return null
}

function CaptureBridge() {
  const { gl } = useThree()
  useEffect(() => {
    const capture = () => {
      const url = gl.domElement.toDataURL('image/png')
      const a = document.createElement('a')
      a.href = url
      a.download = `ai-home-studio-${new Date().toISOString().replace(/[:.]/g, '-')}.png`
      document.body.appendChild(a)
      a.click()
      a.remove()
    }
    window.addEventListener('ai-home-capture', capture)
    return () => window.removeEventListener('ai-home-capture', capture)
  }, [gl])
  return null
}

function SceneContent({ items, selectedId, onSelect, viewMode, quality, exposure, hour, contactKey, onReady }: StudioSceneProps) {
  const { gl } = useThree()
  const renderQuality = viewMode === 'photo' ? quality : 'preview'
  const [hovered, setHovered] = useState<string | null>(null)
  useCursor(Boolean(hovered))

  useEffect(() => { gl.toneMappingExposure = exposure }, [gl, exposure])

  return (
    <Selection>
      <SoftShadows size={renderQuality === 'photo' ? 22 : 12} samples={renderQuality === 'photo' ? 14 : 8} focus={0.55} />
      <Environment files="/assets/hdri/venice_sunset_1k.hdr" background backgroundBlurriness={0.18} backgroundIntensity={0.76} backgroundRotation={[0.02, Math.PI * 0.42, 0]} environmentIntensity={quality === 'photo' ? 0.55 : 0.42} />
      <Lighting hour={hour} quality={renderQuality} />
      <RoomShell quality={renderQuality} />
      <Rug />
      <TableVignette />
      <FloorLamp quality={quality} />
      {items.map((item) => (
        <SceneObject key={item.id} item={item} selected={viewMode !== 'photo' && selectedId === item.id} onSelect={onSelect} setHovered={setHovered} quality={renderQuality} />
      ))}
      <ContactShadows key={contactKey} position={[0, 0.012, 0.4]} opacity={renderQuality === 'photo' ? 0.62 : 0.42} scale={10.5} blur={renderQuality === 'photo' ? 2.6 : 1.8} far={4.5} resolution={renderQuality === 'photo' ? 1024 : 512} color="#241a13" frames={1} />
      <CameraRig viewMode={viewMode} />
      <WalkMovement enabled={viewMode === 'walk'} />
      {viewMode !== 'walk' && <OrbitControls makeDefault target={viewMode === 'photo' ? [-0.2, 1.1, -0.1] : [-0.15, 1.02, 0]} enablePan={false} minDistance={2.3} maxDistance={8.5} minPolarAngle={0.62} maxPolarAngle={1.48} />}
      <WalkLook enabled={viewMode === 'walk'} />
      <EffectComposer multisampling={0} enableNormalPass={false} autoClear={false}>
        <N8AO halfRes={false} quality={renderQuality === 'photo' ? 'high' : 'performance'} aoRadius={1.35} aoSamples={16} denoiseSamples={8} denoiseRadius={12} distanceFalloff={1.5} intensity={renderQuality === 'photo' ? 2.5 : 1.6} color="#2d241d" />
        <Outline blur visibleEdgeColor="#1d5fbf" hiddenEdgeColor="#1d5fbf" edgeStrength={4.5} width={1200} />
        <Bloom intensity={renderQuality === 'photo' ? 0.18 : 0.08} luminanceThreshold={1.5} luminanceSmoothing={0.2} mipmapBlur />
        <Vignette eskil={false} offset={0.14} darkness={renderQuality === 'photo' ? 0.31 : 0.2} />
        <SMAA />
      </EffectComposer>
      <CaptureBridge />
      <SceneReady onReady={onReady} />
    </Selection>
  )
}

export function StudioScene(props: StudioSceneProps) {
  return (
    <Suspense fallback={null}>
      <SceneContent {...props} />
    </Suspense>
  )
}
