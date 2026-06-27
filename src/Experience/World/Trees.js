import * as THREE from 'three/webgpu'
import {texture, positionLocal, mix, vec4, uniform, attribute, color} from 'three/tsl'
import Experience from '../Experience.js'
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js'

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

        const uColorA = uniform(color('#b84e4e'))
        const uColorB = uniform(color('#81a208'))
        const leafRandom = attribute('aLeafRandom', 'float')
        const tint = mix(uColorA, uColorB, leafRandom)

        const tex = texture(leafTexture)
        this.leafMaterial = new THREE.MeshStandardNodeMaterial({
            alphaTest: 0.6,
            side: THREE.DoubleSide,
        })
        this.leafMaterial.colorNode = vec4(tex.rgb.mul(shade).mul(tint), tex.a)

        if (this.debug.active) {
            const p = {bottom: 0.45, top: 1.0, ColorA: '#b84e4e', ColorB: '#81a208'}
            this.debugFolder.addBinding(p, 'bottom', {label: 'leafBottom', min: 0, max: 1, step: 0.01})
                .on('change', e => uBottom.value = e.value)
            this.debugFolder.addBinding(p, 'top', {label: 'leafTop', min: 0, max: 2, step: 0.01})
                .on('change', e => uTop.value = e.value)
            this.debugFolder.addBinding(p, 'ColorA', {label: 'leafTintA'})
                .on('change', e => uColorA.value.set(e.value))
            this.debugFolder.addBinding(p, 'ColorB', {label: 'leafTintB'})
                .on('change', e => uColorB.value.set(e.value))
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
            color: 0x382f1d,
        })
        this.resources.items.treeModel.scene.traverse(obj => {
            if (obj.isMesh) {
                trunkGeometry = obj.geometry
            }
        })

        const trunkMesh = new THREE.InstancedMesh(trunkGeometry, trunkMaterial, trees.length)
        const leafMesh = new THREE.InstancedMesh(this.leafGeometry, this.leafMaterial, trees.length)
        const dummy = new THREE.Object3D()

        trees.forEach((tree, i) => {
            dummy.position.copy(tree.position)
            dummy.rotation.set(0, tree.rotationY, 0)
            dummy.scale.setScalar(tree.scale)
            dummy.updateMatrix()
            trunkMesh.setMatrixAt(i, dummy.matrix)
            leafMesh.setMatrixAt(i, dummy.matrix)
        })

        trunkMesh.instanceMatrix.needsUpdate = true
        leafMesh.instanceMatrix.needsUpdate = true
        trunkMesh.castShadow = true
        leafMesh.castShadow = true
        this.scene.add(trunkMesh, leafMesh)
        console.log(`Loaded ${trees.length} trees`)
    }
}