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
        this.setWind()
        this.setModel()
    }

    setModel() {
        const dummy = new THREE.Object3D()
        const bladeMesh = this.resource.scene.children[0]
        bladeMesh.material.side = THREE.DoubleSide

        this.params = {
            posY: 0,
            count: 8192,
            spread: 16,
            size: 1.3,
            tiltZ: 0.25,
            hueSpan: 1,
            saturationSpan: 11,
            luminositySpan: 34,
        }

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
            noiseScale: 0.02,
            smoothMin: 0.3,
            smoothMax: 0.7,
            colorA: '#003b0f',
            colorB: '#396442'
        }

        const uNoiseScale = uniform(this.materialParams.noiseScale)
        const uSmoothMin = uniform(this.materialParams.smoothMin)
        const uSmoothMax = uniform(this.materialParams.smoothMax)

        const tiledUv = positionWorld.xz.mul(uNoiseScale)
        const noise = texture(this.resources.items.noiseTexture, tiledUv).r
        const noiseRemap = smoothstep(uSmoothMin, uSmoothMax, noise)

        const uColorA = uniform(color("#021908"))
        const uColorB = uniform(color("#044c13"))

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

        const aInstancePos = attribute('aInstancePos', 'vec3')
        const aRotation = attribute('aRotation', 'float')

        const windWaveFunction = (worldPos) => {
            const scroll = add(worldPos, vec3(0, 0, mul(uWindWaveSpeed, time)))
            const tiled = mul(scroll, uWindWaveTiling)
            return mx_noise_float(tiled).clamp(0, 1).mul(uWindWaveStrength)
        }
        const windWave = windWaveFunction(aInstancePos)

        const c = cos(aRotation)
        const s = sin(aRotation)
        // const windd = getWind()
        // const wavee = windd.sampleWave(aInstancePos)
        // const localWind = vec3(wavee.mul(s).negate(), 0, wwave.mul(c)).mul(bladeHeight)
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
        const windNoise = windNoiseFunction(aInstancePos)
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

        const dist = aInstancePos.xz.sub(this.uCharPos.xz).length()
        const falloff = float(1).sub(smoothstep(float(0), uCharRadius, dist))

        const localPushX = this.uCharDir.x.mul(c).sub(this.uCharDir.y.mul(s))
        const localPushZ = this.uCharDir.x.mul(s).add(this.uCharDir.y.mul(c))
        const localPush = vec3(localPushX, 0, localPushZ)
            .mul(falloff).mul(uCharStrength).mul(bladeHeight)

        this.material.positionNode = positionLocal.add(localWind).add(localNoise).add(localPush)

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

    update() {
        this.handleGrassPush()
    }
}