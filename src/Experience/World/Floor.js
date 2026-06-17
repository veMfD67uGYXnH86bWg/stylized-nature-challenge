import * as THREE from 'three/webgpu'
import {uv, fract, step, vec4} from 'three/tsl'
import Experience from '../Experience.js'

export default class Floor {
    constructor() {
        this.experience = new Experience()
        this.scene = this.experience.scene
        this.resources = this.experience.resources

        this.setGeometry()
        this.setTextures()
        this.setMaterial()
        this.setMesh()
    }

    setGeometry() {
        this.geometry = new THREE.PlaneGeometry(100, 100)
    }

    setTextures() {
        this.textures = {}

        this.textures.color = this.resources.items.grassColorTexture
        this.textures.color.colorSpace = THREE.SRGBColorSpace
        this.textures.color.repeat.set(1.5, 1.5)
        this.textures.color.wrapS = THREE.RepeatWrapping
        this.textures.color.wrapT = THREE.RepeatWrapping

        this.textures.normal = this.resources.items.grassNormalTexture
        this.textures.normal.repeat.set(1.5, 1.5)
        this.textures.normal.wrapS = THREE.RepeatWrapping
        this.textures.normal.wrapT = THREE.RepeatWrapping
    }

    setMaterial() {
        // this.material = new THREE.MeshStandardNodeMaterial({
        //     map: this.textures.color,
        //     normalMap: this.textures.normal,
        //     side: THREE.DoubleSide,
        // })

        const gridUv = uv().mul(100)
        const cell = fract(gridUv)
        const lineX = step(cell.x, 0.05)
        const lineY = step(cell.y, 0.05)
        const line = lineX.add(lineY).clamp(0, 1)
        // const color = vec4(line.oneMinus(), line.oneMinus(), line.oneMinus(), 1.0)
        const color = vec4(line, line, line, 1.0)

        this.material = new THREE.MeshStandardNodeMaterial({
            // side: THREE.DoubleSide
        })
        this.material.colorNode = color
    }

    setMesh() {
        this.mesh = new THREE.Mesh(this.geometry, this.material)
        this.mesh.rotation.z = Math.PI * 0.1
        this.mesh.rotation.x = -Math.PI * 0.5
        this.mesh.receiveShadow = true
        this.scene.add(this.mesh)
    }
}