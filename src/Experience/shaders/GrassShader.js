import * as THREE from 'three/webgpu'
import {
    attribute,
    color,
    cos,
    float,
    mix,
    mod,
    mx_noise_float,
    normalLocal,
    positionLocal,
    positionWorld,
    sin,
    smoothstep,
    texture,
    time,
    transformNormalToView,
    uniform,
    vec2,
    vec3
} from 'three/tsl'
import Experience from '../Experience.js'

export default class GrassShader {
    constructor() {
        this.experience = new Experience()
        this.scene = this.experience.scene
        this.resources = this.experience.resources
        this.debug = this.experience.debug
        this.input = this.experience.input

        this.params = {
            count: this.input.isTouch ? 12500 : 25000,
            spread: 15,
            tiltZ: 0.25,

            noiseScale: 0.01,
            smoothMin: 0.38,
            smoothMax: 0.83,
            colorA: '#522825',
            colorB: '#8c443f',

            hueSpan: 59,
            saturationSpan: 11,
            luminositySpan: 34,

            healthyCenter: {x: -48, y: 43.5},
            healthyInner: 13.5,
            healthyOuter: 23,
            healthyColor: '#4db54d',
            healthyStrength: 0.75,
        }

        if (this.debug.active) {
            this.debugFolder = this.debug.ui.addFolder({
                title: 'Grass Shader',
                expanded: false,
            })
        }

        this.setGeometry()
        this.bakeTerrainMask()
        this.setMaterial()
        this.setMesh()
        this.setDebug()

        console.log('Loaded GrassShader')
    }

    setGeometry() {
        let bladeGeometry = null
        this.resources.items.grassModel.scene.traverse((child) => {
            if (child.isMesh && !bladeGeometry) bladeGeometry = child.geometry
        })
        this.geometry = bladeGeometry

        this.geometry.computeBoundingBox()
        this.bladeMinY = this.geometry.boundingBox.min.y
        this.bladeHeight = this.geometry.boundingBox.max.y - this.bladeMinY

        const count = this.params.count
        const homeArray = new Float32Array(count * 2)
        const rotationArray = new Float32Array(count)

        for (let i = 0; i < count; i++) {
            homeArray[i * 2 + 0] = (Math.random() * 2 - 1) * this.params.spread
            homeArray[i * 2 + 1] = (Math.random() * 2 - 1) * this.params.spread
            rotationArray[i] = Math.random() * Math.PI * 2
        }

        this.colorArray = new Float32Array(count * 3)
        this.colorAttribute = new THREE.InstancedBufferAttribute(this.colorArray, 3)
        this.fillColors()

        this.geometry.setAttribute('aHome', new THREE.InstancedBufferAttribute(homeArray, 2))
        this.geometry.setAttribute('aRotation', new THREE.InstancedBufferAttribute(rotationArray, 1))
        this.geometry.setAttribute('aColor', this.colorAttribute)
    }

    fillColors() {
        const blade = new THREE.Color()
        for (let i = 0; i < this.params.count; i++) {
            const h = 90 + Math.random() * this.params.hueSpan
            const s = 40 + Math.random() * this.params.saturationSpan
            const l = 15 + Math.random() * this.params.luminositySpan
            blade.set(`hsl(${Math.round(h)}, ${Math.round(s)}%, ${Math.round(l)}%)`)
            this.colorArray[i * 3 + 0] = blade.r
            this.colorArray[i * 3 + 1] = blade.g
            this.colorArray[i * 3 + 2] = blade.b
        }
        this.colorAttribute.needsUpdate = true
    }

    bakeTerrainMask() {
        let terrainMesh = null
        this.experience.world.terrain.model.traverse((child) => {
            if (child.isMesh && !terrainMesh) terrainMesh = child
        })
        terrainMesh.updateWorldMatrix(true, false)
        const box = new THREE.Box3().setFromObject(terrainMesh)
        this.maskMin = new THREE.Vector2(box.min.x, box.min.z)
        this.maskSize = new THREE.Vector2(box.max.x - box.min.x, box.max.z - box.min.z)

        const img = this.resources.items.terrainSplatTexture.image
        const canvas = document.createElement('canvas')
        canvas.width = img.width
        canvas.height = img.height
        const context = canvas.getContext('2d')
        context.drawImage(img, 0, 0)
        const pixels = context.getImageData(0, 0, img.width, img.height).data

        const data = new Uint8Array(img.width * img.height)
        for (let p = 0; p < img.width * img.height; p++) {
            const r = pixels[p * 4]
            const g = pixels[p * 4 + 1]
            const b = pixels[p * 4 + 2]
            data[p] = (g >= r && g >= b) ? 255 : (r >= b ? 128 : 0)
        }

        this.maskTexture = new THREE.DataTexture(data, img.width, img.height, THREE.RedFormat, THREE.UnsignedByteType)
        this.maskTexture.magFilter = THREE.LinearFilter
        this.maskTexture.minFilter = THREE.LinearFilter
        this.maskTexture.needsUpdate = true
    }

    setMaterial() {
        this.material = new THREE.MeshStandardNodeMaterial()
        this.material.side = THREE.DoubleSide

        this.uCenter = uniform(new THREE.Vector2(0, 0))

        const patchSize = this.params.spread * 2
        const half = this.params.spread

        const home = attribute('aHome', 'vec2')
        const rotation = attribute('aRotation', 'float')
        const bladeColor = attribute('aColor', 'vec3')

        const wrappedX = mod(home.x.sub(this.uCenter.x).add(half), patchSize).sub(half).add(this.uCenter.x).toVar()
        const wrappedZ = mod(home.y.sub(this.uCenter.y).add(half), patchSize).sub(half).add(this.uCenter.y).toVar()

        this.uTiltZ = uniform(this.params.tiltZ)
        const cosR = cos(rotation)
        const sinR = sin(rotation)
        const cosT = cos(this.uTiltZ)
        const sinT = sin(this.uTiltZ)

        const rotateBlade = (v) => {
            const yawed = vec3(
                v.x.mul(cosR).sub(v.z.mul(sinR)),
                v.y,
                v.x.mul(sinR).add(v.z.mul(cosR))
            )
            return vec3(
                yawed.x.mul(cosT).sub(yawed.y.mul(sinT)),
                yawed.x.mul(sinT).add(yawed.y.mul(cosT)),
                yawed.z
            )
        }

        const rotated = rotateBlade(positionLocal)

        this.material.normalNode = transformNormalToView(rotateBlade(normalLocal))

        this.uMaskMin = uniform(this.maskMin)
        this.uMaskSize = uniform(this.maskSize)
        const maskUv = vec2(wrappedX, wrappedZ).sub(this.uMaskMin).div(this.uMaskSize)
        const terrainScale = texture(this.maskTexture, maskUv).r.toVar()

        this.windParams = {
            windWaveSpeed: 6.2,
            windWaveStrength: -0.7,
            windWaveTiling: {x: 0.11, y: 1.0, z: 0.13},
            windNoiseSpeed: 2.8,
            windNoiseStrength: 0.08,
            windNoiseTiling: {x: 0.8, y: 1.0, z: 0.8},
        }

        this.uWindWaveSpeed = uniform(this.windParams.windWaveSpeed)
        this.uWindWaveStrength = uniform(this.windParams.windWaveStrength)
        this.uWindWaveTiling = uniform(new THREE.Vector3(
            this.windParams.windWaveTiling.x,
            this.windParams.windWaveTiling.y,
            this.windParams.windWaveTiling.z
        ))
        this.uWindNoiseSpeed = uniform(this.windParams.windNoiseSpeed)
        this.uWindNoiseStrength = uniform(this.windParams.windNoiseStrength)
        this.uWindNoiseTiling = uniform(new THREE.Vector3(
            this.windParams.windNoiseTiling.x,
            this.windParams.windNoiseTiling.y,
            this.windParams.windNoiseTiling.z
        ))

        this.windWaveAt = (worldPos) => {
            const scroll = worldPos.add(vec3(0, 0, this.uWindWaveSpeed.mul(time)))
            return mx_noise_float(scroll.mul(this.uWindWaveTiling)).clamp(0, 1).mul(this.uWindWaveStrength)
        }
        const windNoiseAt = (worldPos) => {
            const scroll = worldPos.add(vec3(this.uWindNoiseSpeed.mul(time), 0, this.uWindNoiseSpeed.mul(time)))
            return mx_noise_float(scroll.mul(this.uWindNoiseTiling)).mul(0.5).add(0.5).mul(this.uWindNoiseStrength)
        }

        const heightFactor = positionLocal.y.sub(this.bladeMinY).div(this.bladeHeight).clamp(0, 1)
        const anchor = vec3(wrappedX, 0, wrappedZ)
        const windWave = this.windWaveAt(anchor)
        const windNoise = windNoiseAt(anchor)
        const windOffset = vec3(
            sin(rotation.mul(2)).mul(windNoise),
            0,
            windWave.add(cos(rotation.mul(2)).mul(windNoise))
        ).mul(heightFactor)


        this.material.positionNode = rotated
            .add(windOffset)
            .mul(terrainScale)
            .add(vec3(wrappedX, 0, wrappedZ))


        const noiseTexture = this.resources.items.noiseTexture
        noiseTexture.wrapS = noiseTexture.wrapT = THREE.RepeatWrapping

        this.uNoiseScale = uniform(this.params.noiseScale)
        this.uSmoothMin = uniform(this.params.smoothMin)
        this.uSmoothMax = uniform(this.params.smoothMax)
        this.uColorA = uniform(color(this.params.colorA))
        this.uColorB = uniform(color(this.params.colorB))

        const totalityNoise = texture(noiseTexture, positionWorld.xz.mul(this.uNoiseScale)).r
        const totalityRemap = smoothstep(this.uSmoothMin, this.uSmoothMax, totalityNoise)

        const grassColor = mix(this.uColorA, this.uColorB, totalityRemap)

        this.uHealthyCenter = uniform(new THREE.Vector2(this.params.healthyCenter.x, this.params.healthyCenter.y))
        this.uHealthyInner = uniform(this.params.healthyInner)
        this.uHealthyOuter = uniform(this.params.healthyOuter)
        this.uHealthyColor = uniform(color(this.params.healthyColor))
        this.uHealthyStrength = uniform(this.params.healthyStrength)

        const healthyDelta = positionWorld.xz.sub(this.uHealthyCenter).abs()
        const healthyDist = healthyDelta.x.max(healthyDelta.y)
        const healthyFactor = float(1)
            .sub(smoothstep(this.uHealthyInner, this.uHealthyOuter, healthyDist))
            .mul(this.uHealthyStrength)

        this.material.colorNode = mix(grassColor, this.uHealthyColor, healthyFactor).mul(bladeColor)

        this.experience.world.corruption?.applyTo(this.material)
    }

    setMesh() {
        this.mesh = new THREE.InstancedMesh(this.geometry, this.material, this.params.count)
        this.mesh.frustumCulled = false

        this.mesh.receiveShadow = true
        this.scene.add(this.mesh)
    }

    setDebug() {
        if (!this.debug.active) return

        this.debugParams = {freezeCenter: false}
        this.debugFolder.addBinding(this.debugParams, 'freezeCenter', {label: 'Freeze Center'})
        this.debugFolder.addBinding(this.params, 'tiltZ', {label: 'Tilt Z', min: 0, max: Math.PI * 0.5, step: 0.01})
            .on('change', e => this.uTiltZ.value = e.value)

        const colorFolder = this.debugFolder.addFolder({title: 'Color'})
        colorFolder.addBinding(this.params, 'noiseScale', {label: 'Totality Scale', min: 0.01, max: 0.2, step: 0.001})
            .on('change', e => this.uNoiseScale.value = e.value)
        colorFolder.addBinding(this.params, 'smoothMin', {label: 'Smooth Min', min: 0.1, max: 0.5, step: 0.01})
            .on('change', e => this.uSmoothMin.value = e.value)
        colorFolder.addBinding(this.params, 'smoothMax', {label: 'Smooth Max', min: 0.5, max: 1, step: 0.01})
            .on('change', e => this.uSmoothMax.value = e.value)
        colorFolder.addBinding(this.params, 'colorA')
            .on('change', e => this.uColorA.value.set(e.value))
        colorFolder.addBinding(this.params, 'colorB')
            .on('change', e => this.uColorB.value.set(e.value))

        colorFolder.addBinding(this.params, 'hueSpan', {label: 'Hue Span', min: 0, max: 270, step: 1})
            .on('change', () => this.fillColors())
        colorFolder.addBinding(this.params, 'saturationSpan', {label: 'Saturation Span', min: 0, max: 100, step: 1})
            .on('change', () => this.fillColors())
        colorFolder.addBinding(this.params, 'luminositySpan', {label: 'Luminosity Span', min: 0, max: 100, step: 1})
            .on('change', () => this.fillColors())

        const planeMaterial = new THREE.MeshBasicNodeMaterial()
        const planeWave = this.windWaveAt(positionWorld).mul(-1) // mul(-1) because the wave strength is negative
        planeMaterial.colorNode = vec3(planeWave, planeWave, planeWave)
        this.windDebugPlane = new THREE.Mesh(new THREE.PlaneGeometry(100, 100), planeMaterial)
        this.windDebugPlane.rotation.x = -Math.PI * 0.5
        this.windDebugPlane.position.set(0, 0.1, 0)
        this.windDebugPlane.visible = false
        this.scene.add(this.windDebugPlane)

        const windFolder = this.debugFolder.addFolder({title: 'Wind'})
        windFolder.addBinding(this.windDebugPlane, 'visible', {label: 'Shader Plane'})
        windFolder.addBinding(this.windParams, 'windWaveSpeed', {label: 'Wave Speed', min: 0, max: 20, step: 0.1})
            .on('change', e => this.uWindWaveSpeed.value = e.value)
        windFolder.addBinding(this.windParams, 'windWaveStrength', {
            label: 'Wave Strength',
            min: -3,
            max: 3,
            step: 0.05
        })
            .on('change', e => this.uWindWaveStrength.value = e.value)
        windFolder.addBinding(this.windParams, 'windWaveTiling', {
            label: 'Wave Tiling',
            x: {min: 0.01, max: 4, step: 0.01},
            y: {min: 0.01, max: 4, step: 0.01},
            z: {min: 0.01, max: 4, step: 0.01},
        }).on('change', () => {
            this.uWindWaveTiling.value.set(
                this.windParams.windWaveTiling.x,
                this.windParams.windWaveTiling.y,
                this.windParams.windWaveTiling.z
            )
        })
        windFolder.addBinding(this.windParams, 'windNoiseSpeed', {label: 'Noise Speed', min: 0, max: 20, step: 0.1})
            .on('change', e => this.uWindNoiseSpeed.value = e.value)
        windFolder.addBinding(this.windParams, 'windNoiseStrength', {
            label: 'Noise Strength',
            min: 0,
            max: 1,
            step: 0.01
        })
            .on('change', e => this.uWindNoiseStrength.value = e.value)
        windFolder.addBinding(this.windParams, 'windNoiseTiling', {
            label: 'Noise Tiling',
            x: {min: 0.01, max: 4, step: 0.01},
            y: {min: 0.01, max: 4, step: 0.01},
            z: {min: 0.01, max: 4, step: 0.01},
        }).on('change', () => {
            this.uWindNoiseTiling.value.set(
                this.windParams.windNoiseTiling.x,
                this.windParams.windNoiseTiling.y,
                this.windParams.windNoiseTiling.z
            )
        })

        const healthyFolder = this.debugFolder.addFolder({title: 'Healthy Patch'})
        healthyFolder.addBinding(this.params, 'healthyCenter', {
            label: 'Center (x, z)',
            x: {min: -100, max: 100, step: 0.5},
            y: {min: -100, max: 100, step: 0.5},   // world Z
        }).on('change', () => {
            this.uHealthyCenter.value.set(this.params.healthyCenter.x, this.params.healthyCenter.y)
        })
        healthyFolder.addBinding(this.params, 'healthyInner', {label: 'Inner', min: 0, max: 30, step: 0.5})
            .on('change', e => this.uHealthyInner.value = e.value)
        healthyFolder.addBinding(this.params, 'healthyOuter', {label: 'Outer', min: 0, max: 40, step: 0.5})
            .on('change', e => this.uHealthyOuter.value = e.value)
        healthyFolder.addBinding(this.params, 'healthyColor', {label: 'Color'})
            .on('change', e => this.uHealthyColor.value.set(e.value))
        healthyFolder.addBinding(this.params, 'healthyStrength', {label: 'Strength', min: 0, max: 1, step: 0.01})
            .on('change', e => this.uHealthyStrength.value = e.value)
    }

    update() {
        if (this.debugParams?.freezeCenter) return

        const character = this.experience.world.character
        if (!character) return

        this.uCenter.value.set(character.model.position.x, character.model.position.z)
    }
}
