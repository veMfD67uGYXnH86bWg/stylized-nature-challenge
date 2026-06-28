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
        this.setWind()
        this.setModel()
    }

    setModel() {
        const dummy = new THREE.Object3D()
        const bladeMesh = this.resource.scene.children[0]
        bladeMesh.material.side = THREE.DoubleSide

        this.params = {
            count: 8192,
            spread: 16,
            size: 1.3,
            hueSpan: 1,
            saturationSpan: 11,
            luminositySpan: 34,
            tiltZ: 0.25,
            posY: 0
        }
        const bladeParams = {}
        const colorParams = {}
        let mesh = null

        const rebuild = () => {
            if (mesh) this.scene.remove(mesh)

            const {count, spread, size} = this.params
            const cols = Math.ceil(Math.sqrt(count))
            const spacing = spread / cols

            mesh = new THREE.InstancedMesh(bladeMesh.geometry, this.material, count)

            const instancePosArray = new Float32Array(count * 3)
            const rotationArray = new Float32Array(count)

            for (let i = 0; i < count; i++) {
                dummy.position.set(
                    (i % cols) * spacing - spread / 2 + (Math.random() - 0.5) * spacing,
                    this.params.posY,
                    Math.floor(i / cols) * spacing - spread / 2 + (Math.random() - 0.5) * spacing
                )
                const rotationY = Math.random() * Math.PI * 2
                dummy.rotation.order = 'XZY'
                dummy.rotation.set(0, rotationY, this.params.tiltZ)
                dummy.scale.setScalar(size)
                dummy.updateMatrix()
                mesh.setMatrixAt(i, dummy.matrix)

                instancePosArray[i * 3 + 0] = dummy.position.x
                instancePosArray[i * 3 + 1] = dummy.position.y
                instancePosArray[i * 3 + 2] = dummy.position.z
                rotationArray[i] = rotationY

                const h = 90 + Math.random() * this.params.hueSpan
                const s = 40 + Math.random() * this.params.saturationSpan
                const l = 15 + Math.random() * this.params.luminositySpan
                mesh.setColorAt(i, new THREE.Color(`hsl(${h}, ${s}%, ${l}%)`))
            }

            bladeMesh.geometry.setAttribute('aInstancePos', new THREE.InstancedBufferAttribute(instancePosArray, 3))
            bladeMesh.geometry.setAttribute('aRotation', new THREE.InstancedBufferAttribute(rotationArray, 1))

            mesh.instanceMatrix.needsUpdate = true
            mesh.instanceColor.needsUpdate = true
            this.scene.add(mesh)
            mesh.receiveShadow = true
        }

        rebuild()

        console.log('Loaded Grass')

        if (this.debug.active) {
            this.bladesFolder.addBinding(this.params, 'posY', {
                label: 'Position Y',
                min: -1,
                max: 0,
                step: 0.01,
            }).on('change', () => rebuild())
            this.bladesFolder.addBinding(this.params, 'count', {
                label: 'Count',
                min: 4096,
                max: 20000,
                step: 100,
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
            }).on('change', () => {
                for (let i = 0; i < this.params.count; i++) {
                    mesh.getMatrixAt(i, dummy.matrix)
                    dummy.matrix.decompose(dummy.position, dummy.quaternion, dummy.scale)
                    dummy.scale.setScalar(this.params.size)
                    dummy.updateMatrix()
                    mesh.setMatrixAt(i, dummy.matrix)
                }
                mesh.instanceMatrix.needsUpdate = true
            })
            this.colorFolder.addBinding(this.params, 'hueSpan', {
                label: 'Hue',
                min: 1,
                max: 300,
                step: 1,
            }).on('change', () => rebuild())
            this.colorFolder.addBinding(this.params, 'saturationSpan', {
                label: 'Saturation',
                min: 1,
                max: 300,
                step: 1,
            }).on('change', () => rebuild())
            this.colorFolder.addBinding(this.params, 'luminositySpan', {
                label: 'Luminosity',
                min: 1,
                max: 300,
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
            noiseScale: 0.02,
            smoothMin: 0.3,
            smoothMax: 0.7,
            colorA: '#003b0f',
            colorB: '#396442'
        }

        const noiseScale = uniform(this.materialParams.noiseScale)
        const smoothMin = uniform(this.materialParams.smoothMin)
        const smoothMax = uniform(this.materialParams.smoothMax)

        const tiledUv = positionWorld.xz.mul(noiseScale)
        const noise = texture(this.resources.items.noiseTexture, tiledUv).r
        const noiseRemap = smoothstep(smoothMin, smoothMax, noise)

        const colorA = uniform(color("#021908"))
        const colorB = uniform(color("#044c13"))

        const grassColor = mix(colorA, colorB, noiseRemap)

        this.material = new THREE.MeshStandardNodeMaterial()
        this.material.colorNode = grassColor
        this.material.side = THREE.DoubleSide

        if (this.debug.active) {
            this.colorFolder.addBinding(this.materialParams, 'noiseScale', {min: 0.01, max: 0.2, step: 0.001})
                .on('change', () => {
                    noiseScale.value = this.materialParams.noiseScale
                })
            this.colorFolder.addBinding(this.materialParams, 'smoothMin', {min: 0.1, max: 0.5, step: 0.01})
                .on('change', () => {
                    smoothMin.value = this.materialParams.smoothMin
                })
            this.colorFolder.addBinding(this.materialParams, 'smoothMax', {min: 0.5, max: 1, step: 0.01})
                .on('change', () => {
                    smoothMax.value = this.materialParams.smoothMax
                })
            this.colorFolder.addBinding(this.materialParams, 'colorA').on('change', () => {
                colorA.value.set(this.materialParams.colorA)
            })
            this.colorFolder.addBinding(this.materialParams, 'colorB').on('change', () => {
                colorB.value.set(this.materialParams.colorB)
            })
        }
    }

    setWind() {
        this.windParams = {
            windWaveSpeed: 3.4,
            windWaveStrength: -0.7,
            windWaveTiling: {x: 0.11, y: 1.0, z: 0.13},
            windHeightPower: 2.0,
            windNoiseSpeed: 2.8,
            windNoiseStrength: 0.08,
            windNoiseTiling: {x: 0.8, y: 1.0, z: 0.8},
        }
        this.windWaveParams = {}
        this.windNoiseParams = {}

        const uWindWaveSpeed = uniform(this.windParams.windWaveSpeed)
        const uWindWaveStrength = uniform(this.windParams.windWaveStrength)
        const uWindWaveTiling = uniform(new THREE.Vector3(
            this.windParams.windWaveTiling.x,
            this.windParams.windWaveTiling.y,
            this.windParams.windWaveTiling.z
        ))

        const uHeightPower = uniform(this.windParams.windHeightPower)
        const bladeHeight = positionLocal.y.add(0.2).div(0.6).clamp(0, 1).pow(uHeightPower)

        const aInstancePos = attribute('aInstancePos', 'vec3')
        const aRotation = attribute('aRotation', 'float')

        const rawWave = (worldPos) => {
            const scroll = add(worldPos, vec3(0, 0, mul(uWindWaveSpeed, time)))
            const tiled = mul(scroll, uWindWaveTiling)
            return mx_noise_float(tiled).clamp(0, 1)
        }
        const sampleWave = (worldPos) => rawWave(worldPos).mul(uWindWaveStrength)

        const windWave = sampleWave(aInstancePos)

        const c = cos(aRotation)
        const s = sin(aRotation)
        const localWind = vec3(windWave.mul(s).negate(), 0, windWave.mul(c)).mul(bladeHeight)

        const uWindNoiseSpeed = uniform(this.windParams.windNoiseSpeed)
        const uWindNoiseStrength = uniform(this.windParams.windNoiseStrength)
        const uWindNoiseTiling = uniform(new THREE.Vector3(
            this.windParams.windNoiseTiling.x,
            this.windParams.windNoiseTiling.y,
            this.windParams.windNoiseTiling.z
        ))

        const rawNoise = (worldPos) => {
            const scroll = add(worldPos, vec3(mul(uWindNoiseSpeed, time), 0, mul(uWindNoiseSpeed, time)))
            const tiled = mul(scroll, uWindNoiseTiling)
            return mx_noise_float(tiled).mul(0.5).add(0.5)
        }
        const windNoise = rawNoise(aInstancePos).mul(uWindNoiseStrength)
        const localNoise = vec3(windNoise.mul(s).negate(), 0, windNoise.mul(c)).mul(bladeHeight)

        // Character push
        this.uCharPos = uniform(new THREE.Vector3())
        this.uCharDir = uniform(new THREE.Vector2())
        this.uCharSpeed = uniform(0)
        this.charParams = {radius: 0.7, strength: 0.4}
        const uCharRadius = uniform(this.charParams.radius)
        const uCharStrength = uniform(this.charParams.strength)

        const dist = aInstancePos.xz.sub(this.uCharPos.xz).length()
        const falloff = float(1).sub(smoothstep(float(0), uCharRadius, dist))

        const localPushX = this.uCharDir.x.mul(c).sub(this.uCharDir.y.mul(s))
        const localPushZ = this.uCharDir.x.mul(s).add(this.uCharDir.y.mul(c))
        const localPush = vec3(localPushX, 0, localPushZ)
            .mul(falloff).mul(this.uCharSpeed).mul(uCharStrength).mul(bladeHeight)

        this.material.positionNode = positionLocal.add(localWind).add(localNoise).add(localPush)

        if (this.debug.active) {
            const debugMat = new THREE.MeshBasicNodeMaterial()
            const windWaveDebug = rawWave(positionWorld)
            debugMat.colorNode = vec3(windWaveDebug, windWaveDebug, windWaveDebug)
            const debugPlane = new THREE.Mesh(new THREE.PlaneGeometry(100, 100), debugMat)
            debugPlane.rotation.x = -Math.PI * 0.5
            debugPlane.position.set(5, 0.1, 0)
            this.scene.add(debugPlane)
            debugPlane.visible = false

            const windFolder = this.debugFolder.addFolder({title: 'Wind'})
            windFolder.addBinding(this.windParams, 'windWaveSpeed', {min: 0, max: 10, step: 0.1})
                .on('change', () => {
                    uWindWaveSpeed.value = this.windParams.windWaveSpeed
                })
            windFolder.addBinding(this.windParams, 'windWaveStrength', {min: -2, max: 2, step: 0.01})
                .on('change', () => {
                    uWindWaveStrength.value = this.windParams.windWaveStrength
                })
            windFolder.addBinding(this.windParams, 'windHeightPower', {min: 0.5, max: 10, step: 0.1})
                .on('change', () => {
                    uHeightPower.value = this.windParams.windHeightPower
                })
            windFolder.addBinding(this.windParams, 'windWaveTiling', {
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
            windFolder.addBinding(debugPlane, 'visible', {label: 'Shader plane'})

            windFolder.addBinding(this.windParams, 'windNoiseSpeed', {min: 0, max: 20, step: 0.1})
                .on('change', () => {
                    uWindNoiseSpeed.value = this.windParams.windNoiseSpeed
                })
            windFolder.addBinding(this.windParams, 'windNoiseStrength', {min: 0, max: 1, step: 0.01})
                .on('change', () => {
                    uWindNoiseStrength.value = this.windParams.windNoiseStrength
                })
            windFolder.addBinding(this.windParams, 'windNoiseTiling', {
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
            charFolder.addBinding(this.charParams, 'radius', {min: 0.1, max: 5, step: 0.1})
                .on('change', () => {
                    uCharRadius.value = this.charParams.radius
                })
            charFolder.addBinding(this.charParams, 'strength', {min: 0, max: 3, step: 0.05})
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
        const speed = Math.sqrt(dx * dx + dz * dz)

        if (speed > 0.0001) {
            this.uCharDir.value.set(dx / speed, dz / speed)
        }

        const targetSpeed = Math.min(speed * 40, 1)
        const lerpFactor = targetSpeed > this.uCharSpeed.value ? 0.15 : 0.04
        this.uCharSpeed.value += (targetSpeed - this.uCharSpeed.value) * lerpFactor

        this.prevCharPos.copy(pos)
    }

    update() {
        this.handleGrassPush()
    }
}