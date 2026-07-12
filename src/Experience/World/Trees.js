import * as THREE from 'three/webgpu'
import {
    texture,
    positionLocal,
    positionWorld,
    normalLocal,
    mix,
    vec3,
    vec4,
    uniform,
    attribute,
    color,
    smoothstep,
    cos,
    sin,
    add,
    mul,
    time,
    mx_noise_float,
} from 'three/tsl'
import Experience from '../Experience.js'
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js'
import getWind from './Wind.js'

export default class Trees {
    constructor() {
        this.experience = new Experience()
        this.scene = this.experience.scene
        this.resources = this.experience.resources
        this.time = this.experience.time
        this.world = this.experience.world
        this.debug = this.experience.debug

        if (this.debug.active) {
            this.debugFolder = this.debug.ui.addFolder(
                {
                    title: 'Trees',
                    expanded: false,
                })
        }

        this.resource = this.resources.items.treeModel

        this.setLeaves()
        this.setModel()
    }

    setLeaves() {
        const leafGeos = []
        this.resources.items.leafModel.scene.traverse(obj => {
            if (obj.isMesh && obj.name.startsWith('leaf')) {
                obj.updateWorldMatrix(true, false)
                const g = obj.geometry.clone()
                g.applyMatrix4(obj.matrixWorld)
                const rnd = Math.random()
                const arr = new Float32Array(g.attributes.position.count).fill(rnd)
                g.setAttribute('aLeafRandom', new THREE.BufferAttribute(arr, 1))
                leafGeos.push(g)
            }
        })

        this.leafGeometry = mergeGeometries(leafGeos)

        const leafTexture = this.resources.items.leafTexture
        leafTexture.colorSpace = THREE.SRGBColorSpace

        this.leafGeometry.computeBoundingBox()
        const minY = this.leafGeometry.boundingBox.min.y
        const maxY = this.leafGeometry.boundingBox.max.y
        const heightFactor = positionLocal.y.sub(minY).div(maxY - minY).clamp(0, 1)

        const uBottom = uniform(0.45)
        const uTop = uniform(1.0)
        const shade = mix(uBottom, uTop, heightFactor)

        const uColorA = uniform(color('#04b209'))
        const uColorB = uniform(color('#96bc0e'))
        const leafRandom = attribute('aLeafRandom', 'float')
        const tint = mix(uColorA, uColorB, leafRandom)

        const noiseTexture = this.resources.items.noiseTexture
        noiseTexture.wrapS = noiseTexture.wrapT = THREE.RepeatWrapping
        const uNoiseScale = uniform(0.25)
        const uNoiseA = uniform(color('#cf93cb'))
        const uNoiseB = uniform(color('#030303'))
        const uSmoothMin = uniform(0.3)
        const uSmoothMax = uniform(0.7)
        const noise = texture(noiseTexture, positionWorld.xz.mul(uNoiseScale)).r
        const noiseColor = mix(uNoiseA, uNoiseB, smoothstep(uSmoothMin, uSmoothMax, noise))

        const tex = texture(leafTexture)
        this.leafMaterial = new THREE.MeshStandardNodeMaterial({
            alphaTest: 0.6,
            side: THREE.DoubleSide,
        })
        this.leafMaterial.colorNode = vec4(tex.rgb.mul(shade).mul(tint).mul(noiseColor), tex.a)

        this.experience.world.corruption?.applyTo(this.leafMaterial, {preserveAlpha: true})

        const wind = getWind()
        const aTreeRotation = attribute('aTreeRotation', 'float')
        const aTreePosition = attribute('aTreePosition', 'vec3')
        const cR = cos(aTreeRotation)
        const sR = sin(aTreeRotation)
        const wave = wind.sampleWave(aTreePosition)
        const windOffset = vec3(wave.mul(sR).negate(), 0, wave.mul(cR)).mul(heightFactor)

        // Wind Noise
        this.windParams = {
            windNoiseSpeed: 0.8,
            windNoiseStrength: 0.08,
            windNoiseTiling: {x: 0.8, y: 1.0, z: 0.8},
        }

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
        const windNoise = windNoiseFunction(aTreePosition)
        const localNoise = vec3(windNoise.mul(sR), 0, windNoise.mul(cR)).mul(heightFactor)


        this.leafMaterial.positionNode = positionLocal.add(windOffset).add(localNoise)

        const debugMat = new THREE.MeshBasicNodeMaterial()
        const windWaveDebug = wind.sampleWave(positionWorld).mul(-1) // mul(-1) because strength is negative
        debugMat.colorNode = vec3(windWaveDebug, windWaveDebug, windWaveDebug)
        const debugPlane = new THREE.Mesh(new THREE.PlaneGeometry(100, 100), debugMat)
        debugPlane.rotation.x = -Math.PI * 0.5
        debugPlane.position.set(5, 0.1, 0)
        this.scene.add(debugPlane)
        debugPlane.visible = false

        if (this.debug.active) {
            const params = {
                bottom: 0.45, top: 1.0, ColorA: '#04b209', ColorB: '#96bc0e',
                noiseScale: 0.25, noiseA: '#cf93cb', noiseB: '#030303', smoothMin: 0.3, smoothMax: 0.7,
            }
            this.treeColorFolder = this.debugFolder.addFolder({title: 'Color'})
            this.treeColorFolder.addBinding(params, 'bottom', {
                label: 'leafBottomBrightness',
                min: 0,
                max: 1,
                step: 0.01
            })
                .on('change', e => uBottom.value = e.value)
            this.treeColorFolder.addBinding(params, 'top', {label: 'leafTopBrightness', min: 0, max: 2, step: 0.01})
                .on('change', e => uTop.value = e.value)
            this.treeColorFolder.addBinding(params, 'ColorA', {label: 'leafColorA'})
                .on('change', e => uColorA.value.set(e.value))
            this.treeColorFolder.addBinding(params, 'ColorB', {label: 'leafColorB'})
                .on('change', e => uColorB.value.set(e.value))
            this.treeColorFolder.addBinding(params, 'noiseScale', {min: 0.005, max: 1.2, step: 0.001})
                .on('change', e => uNoiseScale.value = e.value)
            this.treeColorFolder.addBinding(params, 'noiseA', {label: 'leafNoiseA'})
                .on('change', e => uNoiseA.value.set(e.value))
            this.treeColorFolder.addBinding(params, 'noiseB', {label: 'leafNoiseB'})
                .on('change', e => uNoiseB.value.set(e.value))
            this.treeColorFolder.addBinding(params, 'smoothMin', {min: 0, max: 1, step: 0.01})
                .on('change', e => uSmoothMin.value = e.value)
            this.treeColorFolder.addBinding(params, 'smoothMax', {min: 0, max: 1, step: 0.01})
                .on('change', e => uSmoothMax.value = e.value)
            this.windFolder = getWind().setupDebug(this.debugFolder.addFolder({title: 'Wind'}))
            this.windFolder.addBinding(debugPlane, 'visible', {label: 'Shader Plane'})
            this.windFolder.addBinding(this.windParams, 'windNoiseSpeed', {
                label: 'Noise Speed',
                min: 0,
                max: 20,
                step: 0.1
            })
                .on('change', () => {
                    uWindNoiseSpeed.value = this.windParams.windNoiseSpeed
                })
            this.windFolder.addBinding(this.windParams, 'windNoiseStrength', {
                label: 'Noise Strength',
                min: 0,
                max: 1,
                step: 0.01
            })
                .on('change', () => {
                    uWindNoiseStrength.value = this.windParams.windNoiseStrength
                })
            this.windFolder.addBinding(this.windParams, 'windNoiseTiling', {
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
        }
    }

    setModel() {
        const trees = []
        this.resources.items.treesPositionModel.scene.traverse(obj => {
            if (obj.isMesh && obj.name.startsWith('tree_scatter')) {
                trees.push({
                    position: obj.getWorldPosition(new THREE.Vector3()),
                    rotationY: Math.random() * Math.PI * 2,
                    scale: obj.scale.x * (Math.random() * 0.4 + 1),
                })
            }
        })

        let trunkGeometry
        const trunkMaterial = new THREE.MeshStandardNodeMaterial({
            color: 0x1f1602,
        })
        this.resources.items.treeModel.scene.traverse(obj => {
            if (obj.isMesh) {
                trunkGeometry = obj.geometry
            }
        })

        const uOutline = uniform(0.01)
        const outlineMaterial = new THREE.MeshBasicNodeMaterial({side: THREE.BackSide})
        outlineMaterial.colorNode = color('#000000')
        outlineMaterial.positionNode = positionLocal.add(normalLocal.mul(uOutline))

        const trunkMesh = new THREE.InstancedMesh(trunkGeometry, trunkMaterial, trees.length)
        const outlineMesh = new THREE.InstancedMesh(trunkGeometry, outlineMaterial, trees.length)
        const leafMesh = new THREE.InstancedMesh(this.leafGeometry, this.leafMaterial, trees.length)
        const dummy = new THREE.Object3D()

        const treePositionArray = new Float32Array(trees.length * 3)
        const treeRotationArray = new Float32Array(trees.length)

        trees.forEach((tree, i) => {
            dummy.position.copy(tree.position)
            dummy.rotation.set(0, tree.rotationY, 0)
            dummy.scale.setScalar(tree.scale)
            dummy.updateMatrix()
            trunkMesh.setMatrixAt(i, dummy.matrix)
            outlineMesh.setMatrixAt(i, dummy.matrix)
            leafMesh.setMatrixAt(i, dummy.matrix)
            treeRotationArray[i] = tree.rotationY
            treePositionArray[i * 3 + 0] = dummy.position.x
            treePositionArray[i * 3 + 1] = dummy.position.y
            treePositionArray[i * 3 + 2] = dummy.position.z
        })

        this.leafGeometry.setAttribute('aTreeRotation', new THREE.InstancedBufferAttribute(treeRotationArray, 1))
        this.leafGeometry.setAttribute('aTreePosition', new THREE.InstancedBufferAttribute(treePositionArray, 3))

        trunkMesh.instanceMatrix.needsUpdate = true
        outlineMesh.instanceMatrix.needsUpdate = true
        leafMesh.instanceMatrix.needsUpdate = true
        trunkMesh.castShadow = true
        leafMesh.castShadow = true
        this.scene.add(trunkMesh, outlineMesh, leafMesh)

        // perf debug
        this.trunkMesh = trunkMesh
        this.outlineMesh = outlineMesh
        this.leafMesh = leafMesh

        if (this.debug.active) {
            this.debugFolder.addBinding({v: 0.01}, 'v', {
                label: 'trunkOutline',
                min: 0,
                max: 0.2,
                step: 0.005,
                index: 0
            })
                .on('change', e => uOutline.value = e.value)
        }

        console.log(`Loaded ${trees.length} trees`)
    }
}