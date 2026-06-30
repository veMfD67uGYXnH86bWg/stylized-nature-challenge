import * as THREE from 'three/webgpu'
import {
    add,
    attribute,
    color,
    cos,
    div,
    float,
    mix,
    mul,
    mx_noise_float,
    positionLocal,
    positionWorld,
    sin,
    smoothstep,
    texture,
    time,
    uniform,
    vec3,
} from 'three/tsl'
import Experience from '../Experience.js'
import getWind from './Wind.js'

export default class Grass {
    constructor() {
        this.experience = new Experience()
        this.scene = this.experience.scene
        this.resources = this.experience.resources
        this.resource = this.resources.items.grassModel
        this.debug = this.experience.debug

        if (this.debug.active) {
            this.debugFolder = this.debug.ui.addFolder(
                {
                    title: `Grass`,
                    expanded: false,
                })
            this.bladesFolder = this.debugFolder.addFolder({title: 'Blades'})
            this.colorFolder = this.debugFolder.addFolder({title: 'Color'})
        }

        this.setMaterial()
        this.bakeTerrainMask()
        this.setModel()
        this.setWind()
    }

    bakeTerrainMask() {
        let terrainMesh = null
        this.experience.world.terrain.model.traverse((child) => {
            if (child.isMesh && !terrainMesh) terrainMesh = child
        })
        if (!terrainMesh) return

        terrainMesh.updateWorldMatrix(true, false)
        const box = new THREE.Box3().setFromObject(terrainMesh)
        this.terrainMaskMinX = box.min.x
        this.terrainMaskMinZ = box.min.z
        this.terrainMaskWidth = box.max.x - box.min.x
        this.terrainMaskDepth = box.max.z - box.min.z

        const splat = this.resources.items.terrainSplatTexture
        const img = splat.image
        const canvas = document.createElement('canvas')
        canvas.width = img.width
        canvas.height = img.height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0)
        const pixels = ctx.getImageData(0, 0, img.width, img.height).data

        this.terrainMaskPxWidth = img.width
        this.terrainMaskPxHeight = img.height
        this.terrainMask = new Uint8Array(img.width * img.height)
        for (let p = 0; p < img.width * img.height; p++) {
            const r = pixels[p * 4]
            const g = pixels[p * 4 + 1]
            const b = pixels[p * 4 + 2]
            this.terrainMask[p] = (g >= r && g >= b) ? 1 : 0
        }
    }

    isGrassArea(x, z) {
        if (!this.terrainMask) return true

        const i = Math.floor((x - this.terrainMaskMinX) / this.terrainMaskWidth * this.terrainMaskPxWidth)
        const j = Math.floor((z - this.terrainMaskMinZ) / this.terrainMaskDepth * this.terrainMaskPxHeight)

        if (i < 0 || i >= this.terrainMaskPxWidth || j < 0 || j >= this.terrainMaskPxHeight) return false

        return this.terrainMask[j * this.terrainMaskPxWidth + i] === 1
    }

    setModel() {
        this.dummy = new THREE.Object3D()
        const bladeMesh = this.resource.scene.children[0]
        bladeMesh.material.side = THREE.DoubleSide

        this.params = {
            posY: 0,
            count: 30000,
            spread: 30,
            size: 1.3,
            tiltZ: 0.25,
            hueSpan: 59,
            saturationSpan: 11,
            luminositySpan: 34,
        }

        const rebuild = () => {
            if (this.mesh) this.scene.remove(this.mesh)

            const {count, spread, size} = this.params

            this.mesh = new THREE.InstancedMesh(bladeMesh.geometry, this.material, count)

            this.homeX = new Float32Array(count)
            this.homeZ = new Float32Array(count)
            this.rotationY = new Float32Array(count)

            const instancePosArray = new Float32Array(count * 3)
            const rotationArray = new Float32Array(count)
            const wrappedPosArray = new Float32Array(count * 2)
            const cols = Math.ceil(Math.sqrt(count))
            const spacing = spread / cols

            for (let i = 0; i < count; i++) {
                const x = (i % cols) * spacing - spread / 2 + (Math.random() - 0.5) * spacing
                const z = Math.floor(i / cols) * spacing - spread / 2 + (Math.random() - 0.5) * spacing
                const rotationY = Math.random() * Math.PI * 2

                this.homeX[i] = x
                this.homeZ[i] = z
                this.rotationY[i] = rotationY

                instancePosArray[i * 3 + 0] = x
                instancePosArray[i * 3 + 1] = this.params.posY
                instancePosArray[i * 3 + 2] = z
                rotationArray[i] = rotationY
                wrappedPosArray[i * 2 + 0] = x
                wrappedPosArray[i * 2 + 1] = z

                this.dummy.position.set(x, this.params.posY, z)
                this.dummy.rotation.order = 'XZY'
                this.dummy.rotation.set(0, rotationY, this.params.tiltZ)
                this.dummy.scale.setScalar(size)
                this.dummy.updateMatrix()
                this.mesh.setMatrixAt(i, this.dummy.matrix)

                const h = 90 + Math.random() * this.params.hueSpan
                const s = 40 + Math.random() * this.params.saturationSpan
                const l = 15 + Math.random() * this.params.luminositySpan
                this.mesh.setColorAt(i, new THREE.Color(`hsl(${h}, ${s}%, ${l}%)`))
            }

            bladeMesh.geometry.setAttribute('aInstancePos', new THREE.InstancedBufferAttribute(instancePosArray, 3))
            bladeMesh.geometry.setAttribute('aRotation', new THREE.InstancedBufferAttribute(rotationArray, 1))
            this.wrappedPosArray = wrappedPosArray
            this.wrappedPosAttribute = new THREE.InstancedBufferAttribute(wrappedPosArray, 2)
            bladeMesh.geometry.setAttribute('aWrappedPos', this.wrappedPosAttribute)

            this.mesh.instanceMatrix.needsUpdate = true
            this.mesh.instanceColor.needsUpdate = true

            this.mesh.frustumCulled = false
            this.scene.add(this.mesh)
            this.mesh.receiveShadow = true
        }

        this.rebuildGrass = rebuild
        rebuild()

        console.log('Loaded Grass')

        if (this.debug.active) {
            this.colorSingleFolder = this.colorFolder.addFolder({title: 'Individual Color (Per Blade)'})
            this.bladesFolder.addBinding(this.params, 'posY', {
                label: 'Position Y',
                min: -1,
                max: 0,
                step: 0.01,
            }).on('change', () => rebuild())
            this.bladesFolder.addBinding(this.params, 'count', {
                label: 'Count',
                min: 4096,
                max: 32768,
                step: 128,
            }).on('change', () => rebuild())
            this.bladesFolder.addBinding(this.params, 'spread', {
                label: 'Spread',
                min: 1,
                max: 50,
                step: 0.5,
            }).on('change', () => rebuild())
            this.bladesFolder.addBinding(this.params, 'size', {
                label: 'Size',
                min: 0.1,
                max: 2,
                step: 0.01
            }).on('change', () => rebuild())
            this.colorSingleFolder.addBinding(this.params, 'hueSpan', {
                label: 'Hue Randomness Span',
                min: 0,
                max: 270,
                step: 1,
            }).on('change', () => rebuild())
            this.colorSingleFolder.addBinding(this.params, 'saturationSpan', {
                label: 'Saturation Randomness Span',
                min: 0,
                max: 60,
                step: 1,
            }).on('change', () => rebuild())
            this.colorSingleFolder.addBinding(this.params, 'luminositySpan', {
                label: 'Luminosity Randomness Span',
                min: 0,
                max: 85,
                step: 1,
            }).on('change', () => rebuild())
            this.bladesFolder.addBinding(this.params, 'tiltZ', {
                label: 'Tilt Z',
                min: 0,
                max: Math.PI * 0.5,
                step: 0.01
            }).on('change', () => rebuild())
        }
    }

    setMaterial() {
        this.resources.items.noiseTexture.wrapS = THREE.RepeatWrapping
        this.resources.items.noiseTexture.wrapT = THREE.RepeatWrapping
        this.materialParams = {
            noiseScale: 0.01,
            smoothMin: 0.38,
            smoothMax: 0.83,
            colorA: '#522825',
            colorB: '#8c443f'
        }

        const uNoiseScale = uniform(this.materialParams.noiseScale)
        const uSmoothMin = uniform(this.materialParams.smoothMin)
        const uSmoothMax = uniform(this.materialParams.smoothMax)

        const tiledUv = positionWorld.xz.mul(uNoiseScale)
        const noise = texture(this.resources.items.noiseTexture, tiledUv).r
        const noiseRemap = smoothstep(uSmoothMin, uSmoothMax, noise)

        const uColorA = uniform(color("#522825"))
        const uColorB = uniform(color("#8c443f"))

        const grassColor = mix(uColorA, uColorB, noiseRemap)

        this.material = new THREE.MeshStandardNodeMaterial()
        this.material.colorNode = grassColor
        this.material.side = THREE.DoubleSide

        if (this.debug.active) {
            this.colorTotalityFolder = this.colorFolder.addFolder({title: 'Grass Color (Totality)'})
            this.colorTotalityFolder.addBinding(this.materialParams, 'noiseScale', {min: 0.01, max: 0.2, step: 0.001})
                .on('change', () => {
                    uNoiseScale.value = this.materialParams.noiseScale
                })
            this.colorTotalityFolder.addBinding(this.materialParams, 'smoothMin', {min: 0.1, max: 0.5, step: 0.01})
                .on('change', () => {
                    uSmoothMin.value = this.materialParams.smoothMin
                })
            this.colorTotalityFolder.addBinding(this.materialParams, 'smoothMax', {min: 0.5, max: 1, step: 0.01})
                .on('change', () => {
                    uSmoothMax.value = this.materialParams.smoothMax
                })
            this.colorTotalityFolder.addBinding(this.materialParams, 'colorA').on('change', () => {
                uColorA.value.set(this.materialParams.colorA)
            })
            this.colorTotalityFolder.addBinding(this.materialParams, 'colorB').on('change', () => {
                uColorB.value.set(this.materialParams.colorB)
            })
        }
    }

    setWind() {
        this.windParams = {
            windWaveSpeed: 6.2,
            windWaveStrength: -0.7,
            windWaveTiling: {x: 0.11, y: 1.0, z: 0.13},
            windHeightPower: 1.0,
            windNoiseSpeed: 2.8,
            windNoiseStrength: 0.08,
            windNoiseTiling: {x: 0.8, y: 1.0, z: 0.8},
        }

        // Wind Wave
        const uWindWaveSpeed = uniform(this.windParams.windWaveSpeed)
        const uWindWaveStrength = uniform(this.windParams.windWaveStrength)
        const uWindWaveTiling = uniform(new THREE.Vector3(
            this.windParams.windWaveTiling.x,
            this.windParams.windWaveTiling.y,
            this.windParams.windWaveTiling.z
        ))

        const uHeightPower = uniform(this.windParams.windHeightPower)
        const bladeHeight = positionLocal.y.pow(uHeightPower)

        const anchor = attribute('aInstancePos', 'vec3').toVar('grassAnchor')
        const rotation = attribute('aRotation', 'float').toVar('grassRotation')
        const c = cos(rotation)
        const s = sin(rotation)

        const windWaveFunction = (worldPos) => {
            const scroll = add(worldPos, vec3(0, 0, mul(uWindWaveSpeed, time)))
            const tiled = mul(scroll, uWindWaveTiling)
            return mx_noise_float(tiled).clamp(0, 1).mul(uWindWaveStrength)
        }
        const windWave = windWaveFunction(anchor)
        const localWind = vec3(windWave.mul(s).negate(), 0, windWave.mul(c)).mul(bladeHeight)

        // Wind Noise
        const uWindNoiseSpeed = uniform(this.windParams.windNoiseSpeed)
        const uWindNoiseStrength = uniform(this.windParams.windNoiseStrength)
        const uWindNoiseTiling = uniform(new THREE.Vector3(
            this.windParams.windNoiseTiling.x,
            this.windParams.windNoiseTiling.y,
            this.windParams.windNoiseTiling.z
        ))

        const windNoiseFunction = (worldPos) => {
            const scroll = add(worldPos, vec3(mul(uWindNoiseSpeed, time), 0, mul(uWindNoiseSpeed, time)))
            const tiled = mul(scroll, uWindNoiseTiling)
            return mx_noise_float(tiled).mul(0.5).add(0.5).mul(uWindNoiseStrength)
        }
        const windNoise = windNoiseFunction(anchor)
        const localNoise = vec3(windNoise.mul(s), 0, windNoise.mul(c)).mul(bladeHeight)

        // Character push
        this.uCharPos = uniform(new THREE.Vector3())
        this.uCharDir = uniform(new THREE.Vector2())
        this.uCharSpeed = uniform(0)
        this.charParams = {
            radius: 0.7,
            strength: 0.4
        }
        const uCharRadius = uniform(this.charParams.radius)
        const uCharStrength = uniform(this.charParams.strength)

        const wrappedPos = attribute('aWrappedPos', 'vec2').toVar('grassWrappedPos')
        const dist = wrappedPos.sub(this.uCharPos.xz).length()
        const falloff = float(1).sub(smoothstep(float(0), uCharRadius, dist))

        const localPushX = this.uCharDir.x.mul(c).sub(this.uCharDir.y.mul(s))
        const localPushZ = this.uCharDir.x.mul(s).add(this.uCharDir.y.mul(c))
        const localPush = vec3(localPushX, 0, localPushZ)
            .mul(falloff).mul(uCharStrength).mul(bladeHeight)

        this.material.positionNode = positionLocal
            .add(localWind)
            .add(localNoise)
            .add(localPush)

        if (this.debug.active) {
            const debugMat = new THREE.MeshBasicNodeMaterial()
            const windWaveDebug = windWaveFunction(positionWorld).mul(-1) // mul(-1) because strength is negative
            debugMat.colorNode = vec3(windWaveDebug, windWaveDebug, windWaveDebug)
            const debugPlane = new THREE.Mesh(new THREE.PlaneGeometry(100, 100), debugMat)
            debugPlane.rotation.x = -Math.PI * 0.5
            debugPlane.position.set(5, 0.1, 0)
            this.scene.add(debugPlane)
            debugPlane.visible = false

            const windFolder = this.debugFolder.addFolder({title: 'Wind'})
            windFolder.addBinding(this.windParams, 'windWaveSpeed', {label: 'Wave Speed', min: 0, max: 10, step: 0.1})
                .on('change', () => {
                    uWindWaveSpeed.value = this.windParams.windWaveSpeed
                })
            windFolder.addBinding(this.windParams, 'windWaveStrength', {
                label: 'Wave Strength',
                min: -2,
                max: 0,
                step: 0.01
            })
                .on('change', () => {
                    uWindWaveStrength.value = this.windParams.windWaveStrength
                })
            windFolder.addBinding(this.windParams, 'windHeightPower', {
                label: 'Height Power',
                min: 0.5,
                max: 10,
                step: 0.1
            })
                .on('change', () => {
                    uHeightPower.value = this.windParams.windHeightPower
                })
            windFolder.addBinding(this.windParams, 'windWaveTiling', {
                label: 'Wave Tiling',
                x: {min: 0.01, max: 2, step: 0.01},
                y: {min: 0.01, max: 2, step: 0.01},
                z: {min: 0.01, max: 2, step: 0.01},
            }).on('change', () => {
                uWindWaveTiling.value.set(
                    this.windParams.windWaveTiling.x,
                    this.windParams.windWaveTiling.y,
                    this.windParams.windWaveTiling.z
                )
            })
            windFolder.addBinding(debugPlane, 'visible', {label: 'Shader Plane'})

            windFolder.addBinding(this.windParams, 'windNoiseSpeed', {label: 'Noise Speed', min: 0, max: 20, step: 0.1})
                .on('change', () => {
                    uWindNoiseSpeed.value = this.windParams.windNoiseSpeed
                })
            windFolder.addBinding(this.windParams, 'windNoiseStrength', {
                label: 'Noise Strength',
                min: 0,
                max: 1,
                step: 0.01
            })
                .on('change', () => {
                    uWindNoiseStrength.value = this.windParams.windNoiseStrength
                })
            windFolder.addBinding(this.windParams, 'windNoiseTiling', {
                label: 'Noise Tiling',
                x: {min: 0.01, max: 4, step: 0.01},
                y: {min: 0.01, max: 4, step: 0.01},
                z: {min: 0.01, max: 4, step: 0.01},
            }).on('change', () => {
                uWindNoiseTiling.value.set(
                    this.windParams.windNoiseTiling.x,
                    this.windParams.windNoiseTiling.y,
                    this.windParams.windNoiseTiling.z
                )
            })

            const charFolder = this.debugFolder.addFolder({title: 'Character Push'})
            charFolder.addBinding(this.charParams, 'radius', {label: 'Radius', min: 0.1, max: 5, step: 0.1})
                .on('change', () => {
                    uCharRadius.value = this.charParams.radius
                })
            charFolder.addBinding(this.charParams, 'strength', {label: 'Strength', min: 0, max: 3, step: 0.05})
                .on('change', () => {
                    uCharStrength.value = this.charParams.strength
                })
        }
    }

    handleGrassPush() {
        const character = this.experience.world.character
        if (!character) return
        const pos = character.model.position
        this.uCharPos.value.copy(pos)

        if (!this.prevCharPos) {
            this.prevCharPos = pos.clone()
            return
        }

        const dx = pos.x - this.prevCharPos.x
        const dz = pos.z - this.prevCharPos.z

        if (character.isMoving) {
            this.uCharDir.value.set(character.direction.z, -character.direction.x)
        }

        this.prevCharPos.copy(pos)
    }

    updateGrassRecycling() {
        if (!this.mesh) return

        const character = this.experience.world.character
        if (!character) return

        const centerX = character.model.position.x
        const centerZ = character.model.position.z
        const patchSize = this.params.spread
        const half = patchSize * 0.5
        const flooredMod = (a, b) => a - b * Math.floor(a / b)

        for (let i = 0; i < this.params.count; i++) {
            const homeX = this.homeX[i]
            const homeZ = this.homeZ[i]

            const wrapX = flooredMod(homeX - centerX + half, patchSize) - half + centerX
            const wrapZ = flooredMod(homeZ - centerZ + half, patchSize) - half + centerZ

            const scale = this.isGrassArea(wrapX, wrapZ) ? this.params.size : 0

            this.dummy.position.set(wrapX, this.params.posY, wrapZ)
            this.dummy.rotation.order = 'XZY'
            this.dummy.rotation.set(0, this.rotationY[i], this.params.tiltZ)
            this.dummy.scale.setScalar(scale)
            this.dummy.updateMatrix()
            this.mesh.setMatrixAt(i, this.dummy.matrix)

            this.wrappedPosArray[i * 2 + 0] = wrapX
            this.wrappedPosArray[i * 2 + 1] = wrapZ
        }

        this.mesh.instanceMatrix.needsUpdate = true
        this.wrappedPosAttribute.needsUpdate = true
    }

    update() {
        this.handleGrassPush()
        this.updateGrassRecycling()
    }
}