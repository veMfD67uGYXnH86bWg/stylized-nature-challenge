import * as THREE from 'three/webgpu'
import {
    color,
    float,
    materialColor,
    mix,
    mx_noise_float,
    positionWorld,
    smoothstep,
    texture,
    time,
    uniform,
    uv,
    vec2,
    vec3,
    vec4
} from 'three/tsl'
import Experience from '../Experience.js'

export default class Corruption {
    constructor() {
        this.experience = new Experience()
        this.scene = this.experience.scene
        this.terrain = this.experience.world.terrain
        this.debug = this.experience.debug
        this.input = this.experience.input

        this.corruptionMode = this.input.isTouch ? 'rtt' : 'hybrid' // 'direct'

        if (this.debug.active) {
            this.debugFolder = this.debug.ui.addFolder({
                title: 'Corruption',
                expanded: false,
            })
        }

        this.setTexture()
        this.setMask()
        this.setShader()
        this.setTerrain()
        this.setDebugPlane()
        this.setDebug()

        console.log('Loaded Corruption')
    }


    setTexture() {
        this.canvasSize = 1024
        this.canvas = document.createElement('canvas')
        this.canvas.width = this.canvasSize
        this.canvas.height = this.canvasSize
        this.context = this.canvas.getContext('2d')

        this.textureParams = {
            background: '#0f0000',
            nebulaA: '#fb1267',
            nebulaB: '#7e0085',
            nebulaC: '#3aa58f',
            nebulaGold: '#6700cf',
        }

        this.generateLayout()
        const saved = this.experience.resources.items.corruptionInteriorTexture
        if (saved) {
            this.context.drawImage(saved.image, 0, 0, this.canvasSize, this.canvasSize)
        } else {
            this.paintCanvas()
        }

        this.texture = new THREE.CanvasTexture(this.canvas)
        this.texture.wrapS = this.texture.wrapT = THREE.RepeatWrapping
        this.texture.colorSpace = THREE.SRGBColorSpace
    }

    generateLayout() {
        const size = this.canvasSize
        this.layout = {nebulas: [], stars: []}

        for (let i = 0; i < 14; i++) {
            this.layout.nebulas.push({
                x: Math.random() * size,
                y: Math.random() * size,
                radius: size * (0.15 + Math.random() * 0.25),
                slot: Math.random() < 0.15 ? 'nebulaGold' : ['nebulaA', 'nebulaB', 'nebulaC'][Math.floor(Math.random() * 3)],
                alpha: 0.15 + Math.random() * 0.15,
            })
        }

        for (let i = 0; i < 400; i++) {
            const roll = Math.random()
            this.layout.stars.push({
                x: Math.random() * size,
                y: Math.random() * size,
                radius: Math.pow(Math.random(), 3) * 4 + 0.5,
                rgb: roll < 0.2 ? '255, 232, 192' : roll < 0.3 ? '192, 216, 255' : '255, 255, 255',
            })
        }
    }

    hexToRgb(hex) {
        const c = new THREE.Color(hex)
        return `${Math.round(c.r * 255)}, ${Math.round(c.g * 255)}, ${Math.round(c.b * 255)}`
    }

    paintCanvas() {
        const size = this.canvasSize
        const context = this.context

        context.globalCompositeOperation = 'source-over'
        context.fillStyle = this.textureParams.background
        context.fillRect(0, 0, size, size)

        for (const nebula of this.layout.nebulas) {
            const rgb = this.hexToRgb(this.textureParams[nebula.slot])
            this.drawWrapped(size, nebula.x, nebula.y, (wx, wy) => {
                const gradient = context.createRadialGradient(wx, wy, 0, wx, wy, nebula.radius)
                gradient.addColorStop(0, `rgba(${rgb}, ${nebula.alpha})`)
                gradient.addColorStop(1, `rgba(${rgb}, 0)`)
                context.fillStyle = gradient
                context.fillRect(wx - nebula.radius, wy - nebula.radius, nebula.radius * 2, nebula.radius * 2)
            })
        }

        context.globalCompositeOperation = 'lighter'
        for (const star of this.layout.stars) {
            this.drawWrapped(size, star.x, star.y, (wx, wy) => {
                const gradient = context.createRadialGradient(wx, wy, 0, wx, wy, star.radius)
                gradient.addColorStop(0, `rgba(${star.rgb}, 0.9)`)
                gradient.addColorStop(1, `rgba(${star.rgb}, 0)`)
                context.fillStyle = gradient
                context.fillRect(wx - star.radius, wy - star.radius, star.radius * 2, star.radius * 2)
            })
        }

        if (this.texture) this.texture.needsUpdate = true
    }

    drawWrapped(size, x, y, draw) {
        for (const ox of [-size, 0, size]) {
            for (const oy of [-size, 0, size]) {
                draw(x + ox, y + oy)
            }
        }
    }

    setMask() {
        const res = 256
        this.maskRes = res
        this.maskData = new Uint8Array(res * res)

        let terrainMesh = null
        this.terrain.model.traverse((child) => {
            if (child.isMesh && !terrainMesh) terrainMesh = child
        })
        terrainMesh.updateWorldMatrix(true, false)
        const box = new THREE.Box3().setFromObject(terrainMesh)
        this.maskMinX = box.min.x
        this.maskMinZ = box.min.z
        this.maskWidth = box.max.x - box.min.x
        this.maskDepth = box.max.z - box.min.z

        this.maskTexture = new THREE.DataTexture(this.maskData, res, res, THREE.RedFormat, THREE.UnsignedByteType)
        this.maskTexture.magFilter = THREE.LinearFilter
        this.maskTexture.minFilter = THREE.LinearFilter
        this.maskTexture.needsUpdate = true

        const authored = this.experience.resources.items.corruptionMaskTexture
        if (authored) {
            this.initMaskFromImage(authored.image)
        } else {
            const blobCount = 4
            for (let i = 0; i < blobCount; i++) {
                const x = this.maskMinX + (0.15 + Math.random() * 0.7) * this.maskWidth
                const z = this.maskMinZ + (0.15 + Math.random() * 0.7) * this.maskDepth
                const radius = 6 + Math.random() * 8
                this.corrupt(x, z, radius)
            }
        }
    }

    initMaskFromImage(img) {
        const readCanvas = document.createElement('canvas')
        readCanvas.width = img.width
        readCanvas.height = img.height
        const readContext = readCanvas.getContext('2d')
        readContext.drawImage(img, 0, 0)
        const pixels = readContext.getImageData(0, 0, img.width, img.height).data

        const res = this.maskRes
        for (let j = 0; j < res; j++) {
            for (let i = 0; i < res; i++) {
                const px = Math.min(img.width - 1, Math.floor(i / res * img.width))
                const py = Math.min(img.height - 1, Math.floor(j / res * img.height))
                this.maskData[j * res + i] = pixels[(py * img.width + px) * 4]
            }
        }

        this.maskTexture.needsUpdate = true
    }

    paintMask(worldX, worldZ, radius, isCorrupt) {
        const res = this.maskRes
        const toPxX = (x) => (x - this.maskMinX) / this.maskWidth * res
        const toPxZ = (z) => (z - this.maskMinZ) / this.maskDepth * res

        const cx = toPxX(worldX)
        const cz = toPxZ(worldZ)
        const pxRadius = radius / this.maskWidth * res

        const minI = Math.max(0, Math.floor(cx - pxRadius))
        const maxI = Math.min(res - 1, Math.ceil(cx + pxRadius))
        const minJ = Math.max(0, Math.floor(cz - pxRadius))
        const maxJ = Math.min(res - 1, Math.ceil(cz + pxRadius))

        const smoothstep = (x) => {
            const c = Math.min(1, Math.max(0, x))
            return c * c * (3 - 2 * c)
        }

        for (let j = minJ; j <= maxJ; j++) {
            for (let i = minI; i <= maxI; i++) {
                const d = Math.hypot(i - cx, j - cz)
                if (d >= pxRadius) continue

                const t = 1 - smoothstep((d / pxRadius - 0.6) / 0.4)

                const index = j * res + i
                if (isCorrupt) {
                    this.maskData[index] = Math.max(this.maskData[index], Math.round(t * 255))
                } else {
                    this.maskData[index] = Math.min(this.maskData[index], Math.round((1 - t) * 255))
                }
            }
        }

        this.maskTexture.needsUpdate = true

        const grass = this.experience.world.grass
        if (grass) grass.lastCenterX = null
    }

    corrupt(x, z, radius) {
        this.paintMask(x, z, radius, true)
    }

    cleanse(x, z, radius) {
        this.paintMask(x, z, radius, false)
    }

    getCorruptionAt(x, z) {
        const i = Math.floor((x - this.maskMinX) / this.maskWidth * this.maskRes)
        const j = Math.floor((z - this.maskMinZ) / this.maskDepth * this.maskRes)
        if (i < 0 || i >= this.maskRes || j < 0 || j >= this.maskRes) return 0
        return this.maskData[j * this.maskRes + i] / 255
    }


    setShader() {
        this.params = {
            scale: 0.183,
            warpFrequency: 0.43,
            warpStrength: 1.9,
            warpSpeed: 0.332,
            driftSpeed: 0.665,
            jitterFrequency: 1.61,
            jitterStrength: 1.86,
            jitterSpeed: 0.15,
            starBoost: 2.0,

            edgeWarpFrequency: 0.25,
            edgeWarpStrength: 2.0,
            edgeWarpSpeed: 0.03,

            strandInfluence: 0.5,
            strandScale: 0.5,
            strandWidth: 0.32,
            strandSpeed: 0.064,

            rimLow: 0.55,
            rimMid: 0.57,
            rimHigh: 0.62,
            rimColor: '#ffdd55',
            rimIntensity: 7.9,
            unlit: 0.7,
        }

        this.uScale = uniform(this.params.scale)
        this.uWarpFrequency = uniform(this.params.warpFrequency)
        this.uWarpStrength = uniform(this.params.warpStrength)
        this.uWarpSpeed = uniform(this.params.warpSpeed)
        this.uDriftSpeed = uniform(this.params.driftSpeed)
        this.uStarBoost = uniform(this.params.starBoost)

        this.uJitterFrequency = uniform(this.params.jitterFrequency)
        this.uJitterStrength = uniform(this.params.jitterStrength)
        this.uJitterSpeed = uniform(this.params.jitterSpeed)

        this.uEdgeWarpFrequency = uniform(this.params.edgeWarpFrequency)
        this.uEdgeWarpStrength = uniform(this.params.edgeWarpStrength)
        this.uEdgeWarpSpeed = uniform(this.params.edgeWarpSpeed)

        this.uStrandInfluence = uniform(this.params.strandInfluence)
        this.uStrandScale = uniform(this.params.strandScale)
        this.uStrandWidth = uniform(this.params.strandWidth)
        this.uStrandSpeed = uniform(this.params.strandSpeed)

        this.uRimLow = uniform(this.params.rimLow)
        this.uRimMid = uniform(this.params.rimMid)
        this.uRimHigh = uniform(this.params.rimHigh)
        this.uRimColor = uniform(color(this.params.rimColor))
        this.uRimIntensity = uniform(this.params.rimIntensity)
        this.uUnlit = uniform(this.params.unlit)

        this.uMaskMin = uniform(new THREE.Vector2(this.maskMinX, this.maskMinZ))
        this.uMaskSize = uniform(new THREE.Vector2(this.maskWidth, this.maskDepth))

        if (this.corruptionMode === 'rtt') {
            this.setShaderRTT()
        } else if (this.corruptionMode === 'hybrid') {
            this.setShaderHybrid()
        } else {
            this.setShaderDirect()
        }
    }

    buildInterior(p) {
        const warpX = mx_noise_float(vec3(p.mul(this.uWarpFrequency), time.mul(this.uWarpSpeed)))
        const warpY = mx_noise_float(vec3(p.mul(this.uWarpFrequency).add(100), time.mul(this.uWarpSpeed)))
        const warp = vec2(warpX, warpY).mul(this.uWarpStrength)

        const sampleLayer = (worldPos, scale, driftDir) => {
            const drift = vec2(driftDir[0], driftDir[1]).mul(time.mul(this.uDriftSpeed))
            return texture(this.texture, worldPos.add(drift).add(warp).mul(scale)).rgb
        }

        const jitterX = mx_noise_float(vec3(p.mul(this.uJitterFrequency), time.mul(this.uJitterSpeed)))
        const jitterZ = mx_noise_float(vec3(p.mul(this.uJitterFrequency).add(73), time.mul(this.uJitterSpeed).add(7)))
        const pJittered = p.add(vec2(jitterX, jitterZ).mul(this.uJitterStrength))

        const layerA = sampleLayer(pJittered, this.uScale, [1, 0.3])
        const layerB = sampleLayer(pJittered, this.uScale.mul(2.3), [-0.5, -1])
        return layerA.add(layerB.mul(0.5))
    }

    buildCoverage(p) {
        const fbm = (pos, octaves) => {
            let result = null
            let frequency = 1
            let amplitude = 0.5
            for (let i = 0; i < octaves; i++) {
                const octave = mx_noise_float(pos.mul(frequency)).mul(amplitude)
                result = result ? result.add(octave) : octave
                frequency *= 2
                amplitude *= 0.5
            }
            return result
        }

        const edgeWarpX = mx_noise_float(vec3(p.mul(this.uEdgeWarpFrequency), time.mul(this.uEdgeWarpSpeed)))
        const edgeWarpZ = mx_noise_float(vec3(p.mul(this.uEdgeWarpFrequency).add(50), time.mul(this.uEdgeWarpSpeed).add(13)))
        const pWarped = p.add(vec2(edgeWarpX, edgeWarpZ).mul(this.uEdgeWarpStrength))

        const maskUv = pWarped.sub(this.uMaskMin).div(this.uMaskSize)
        const maskValue = texture(this.maskTexture, maskUv).r

        const ridge = float(1).sub(fbm(vec3(p.mul(this.uStrandScale), time.mul(this.uStrandSpeed)), 1).abs().mul(2))
        const strandField = smoothstep(float(1).sub(this.uStrandWidth), 1, ridge)
        return maskValue.mul(mix(float(1), strandField, this.uStrandInfluence))
    }

    finishNodes(nebula, m) {
        this.nebulaNode = nebula
        this.interiorNode = nebula
        this.emissiveNode = nebula.mul(nebula).mul(this.uStarBoost)

        this.insideNode = smoothstep(this.uRimMid, this.uRimHigh, m)
        this.rimNode = smoothstep(this.uRimLow, this.uRimMid, m).sub(this.insideNode)

        this.rimEmissiveNode = this.uRimColor.mul(this.rimNode).mul(this.uRimIntensity)
    }

    setShaderDirect() {
        this.finishNodes(this.buildInterior(positionWorld.xz), this.buildCoverage(positionWorld.xz))
    }

    setupBake(makeOutput, {needsAlpha = false} = {}) {
        this.rttSize = 1024
        this.renderTarget = new THREE.RenderTarget(this.rttSize, this.rttSize, {
            type: THREE.HalfFloatType,
        })

        this.rttScene = new THREE.Scene()
        this.rttCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)

        const quadMaterial = needsAlpha
            ? new THREE.MeshBasicNodeMaterial({transparent: true, blending: THREE.NoBlending})
            : new THREE.MeshBasicNodeMaterial()

        const bakeUv = vec2(uv().x, float(1).sub(uv().y))
        const worldP = bakeUv.mul(this.uMaskSize).add(this.uMaskMin)
        quadMaterial.colorNode = makeOutput(worldP)

        const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), quadMaterial)
        quad.position.z = -0.5
        this.rttScene.add(quad)

        return texture(
            this.renderTarget.texture,
            positionWorld.xz.sub(this.uMaskMin).div(this.uMaskSize)
        )
    }

    setShaderRTT() {
        const field = this.setupBake(
            (worldP) => vec4(this.buildInterior(worldP), this.buildCoverage(worldP)),
            {needsAlpha: true}
        )
        this.finishNodes(field.rgb, field.a)
    }

    setShaderHybrid() {
        const field = this.setupBake((worldP) => vec4(this.buildCoverage(worldP), 0, 0, 1))
        this.finishNodes(this.buildInterior(positionWorld.xz), field.r)
    }

    update() {
        if (!this.renderTarget) return

        const renderer = this.experience.renderer.instance
        renderer.setRenderTarget(this.renderTarget)
        renderer.render(this.rttScene, this.rttCamera)
        renderer.setRenderTarget(null)
    }

    applyTo(material, {preserveAlpha = false} = {}) {
        const base = material.colorNode ?? materialColor
        const litInterior = this.interiorNode.mul(float(1).sub(this.uUnlit))
        const unlitInterior = this.interiorNode.mul(this.uUnlit)

        if (preserveAlpha) {
            material.colorNode = vec4(mix(base.rgb, litInterior, this.insideNode), base.a)
        } else {
            material.colorNode = mix(base, litInterior, this.insideNode)
        }

        material.emissiveNode = this.rimEmissiveNode
            .add(unlitInterior.mul(this.insideNode))
            .add(this.emissiveNode.mul(this.insideNode))
    }

    setTerrain() {
        this.terrain.model.traverse((child) => {
            if (child.isMesh) this.applyTo(child.material)
        })
    }


    setDebugPlane() {
        const material = new THREE.MeshBasicNodeMaterial()
        material.colorNode = this.interiorNode.add(this.emissiveNode)

        this.debugPlane = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), material)
        this.debugPlane.rotation.x = -Math.PI * 0.5
        this.debugPlane.position.set(0, 0.2, 0)
        this.debugPlane.visible = false
        this.scene.add(this.debugPlane)
    }

    setDebug() {
        if (!this.debug.active) return

        this.debugParams = {cleanseRadius: 5}

        this.debugFolder.addBinding(this, 'corruptionMode', {label: 'Mode', readonly: true})

        this.debugFolder.addButton({title: 'Cleanse at character', label: 'Cleanse'}).on('click', () => {
            const pos = this.experience.world.character.model.position
            this.cleanse(pos.x, pos.z, this.debugParams.cleanseRadius)
        })
        this.debugFolder.addButton({title: 'Corrupt at character', label: 'Corrupt'}).on('click', () => {
            const pos = this.experience.world.character.model.position
            this.corrupt(pos.x, pos.z, this.debugParams.cleanseRadius)
        })
        this.debugFolder.addBinding(this.debugParams, 'cleanseRadius', {label: 'Radius', min: 1, max: 20, step: 0.5})

        const strandFolder = this.debugFolder.addFolder({title: 'Strands'})
        strandFolder.addBinding(this.params, 'strandInfluence', {min: 0, max: 1, step: 0.01})
            .on('change', e => this.uStrandInfluence.value = e.value)
        strandFolder.addBinding(this.params, 'strandScale', {min: 0.01, max: 1.5, step: 0.005})
            .on('change', e => this.uStrandScale.value = e.value)
        strandFolder.addBinding(this.params, 'strandWidth', {min: 0.05, max: 1, step: 0.01})
            .on('change', e => this.uStrandWidth.value = e.value)
        strandFolder.addBinding(this.params, 'strandSpeed', {min: 0, max: 0.1, step: 0.001})
            .on('change', e => this.uStrandSpeed.value = e.value)

        const edgeFolder = this.debugFolder.addFolder({title: 'Edge'})
        edgeFolder.addBinding(this.params, 'edgeWarpFrequency', {min: 0.02, max: 1, step: 0.01})
            .on('change', e => this.uEdgeWarpFrequency.value = e.value)
        edgeFolder.addBinding(this.params, 'edgeWarpStrength', {min: 0, max: 8, step: 0.1})
            .on('change', e => this.uEdgeWarpStrength.value = e.value)
        edgeFolder.addBinding(this.params, 'edgeWarpSpeed', {min: 0, max: 0.3, step: 0.001})
            .on('change', e => this.uEdgeWarpSpeed.value = e.value)
        edgeFolder.addBinding(this.params, 'rimLow', {min: 0, max: 1, step: 0.01})
            .on('change', e => this.uRimLow.value = e.value)
        edgeFolder.addBinding(this.params, 'rimMid', {min: 0, max: 1, step: 0.01})
            .on('change', e => this.uRimMid.value = e.value)
        edgeFolder.addBinding(this.params, 'rimHigh', {min: 0, max: 1, step: 0.01})
            .on('change', e => this.uRimHigh.value = e.value)
        edgeFolder.addBinding(this.params, 'rimColor', {label: 'Rim Color'})
            .on('change', e => this.uRimColor.value.set(e.value))
        edgeFolder.addBinding(this.params, 'rimIntensity', {label: 'Rim Intensity', min: 0, max: 10, step: 0.1})
            .on('change', e => this.uRimIntensity.value = e.value)
        edgeFolder.addBinding(this.params, 'unlit', {label: 'Unlit', min: 0, max: 1, step: 0.01})
            .on('change', e => this.uUnlit.value = e.value)

        const interiorFolder = this.debugFolder.addFolder({title: 'Interior', expanded: false})
        interiorFolder.addBinding(this.debugPlane, 'visible', {label: 'Debug Plane'})
        interiorFolder.addButton({title: 'Regenerate', label: 'Texture'}).on('click', () => {
            this.generateLayout()
            this.paintCanvas()
        })
        interiorFolder.addButton({title: 'Download', label: 'Save PNG'}).on('click', () => {
            this.canvas.toBlob((blob) => {
                const link = document.createElement('a')
                link.href = URL.createObjectURL(blob)
                link.download = 'corruptionInterior.png'
                link.click()
                URL.revokeObjectURL(link.href)
            })
        })

        const paletteFolder = interiorFolder.addFolder({title: 'Texture Palette'})
        for (const key of ['background', 'nebulaA', 'nebulaB', 'nebulaC', 'nebulaGold']) {
            paletteFolder.addBinding(this.textureParams, key)
                .on('change', () => this.paintCanvas())
        }
        interiorFolder.addBinding(this.params, 'scale', {min: 0.01, max: 0.3, step: 0.001})
            .on('change', e => this.uScale.value = e.value)
        interiorFolder.addBinding(this.params, 'warpFrequency', {min: 0.02, max: 2, step: 0.01})
            .on('change', e => this.uWarpFrequency.value = e.value)
        interiorFolder.addBinding(this.params, 'warpStrength', {min: 0, max: 8, step: 0.05})
            .on('change', e => this.uWarpStrength.value = e.value)
        interiorFolder.addBinding(this.params, 'warpSpeed', {min: 0, max: 0.5, step: 0.001})
            .on('change', e => this.uWarpSpeed.value = e.value)
        interiorFolder.addBinding(this.params, 'driftSpeed', {min: 0, max: 1, step: 0.005})
            .on('change', e => this.uDriftSpeed.value = e.value)
        interiorFolder.addBinding(this.params, 'jitterFrequency', {min: 0.02, max: 2, step: 0.01})
            .on('change', e => this.uJitterFrequency.value = e.value)
        interiorFolder.addBinding(this.params, 'jitterStrength', {min: 0, max: 3, step: 0.01})
            .on('change', e => this.uJitterStrength.value = e.value)
        interiorFolder.addBinding(this.params, 'jitterSpeed', {min: 0, max: 1, step: 0.005})
            .on('change', e => this.uJitterSpeed.value = e.value)
        interiorFolder.addBinding(this.params, 'starBoost', {min: 0, max: 8, step: 0.1})
            .on('change', e => this.uStarBoost.value = e.value)

    }
}
