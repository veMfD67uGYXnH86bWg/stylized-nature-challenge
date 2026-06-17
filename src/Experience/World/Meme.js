import * as THREE from 'three/webgpu'
import Experience from '../Experience.js'

export default class Meme {
    constructor() {
        this.experience = new Experience()
        this.scene = this.experience.scene
        this.resources = this.experience.resources
        this.time = this.experience.time

        this.setGeometry()
        this.setTextures()
        this.setMaterial()
        this.setMesh()
    }

    setGeometry() {
        this.geometry = new THREE.PlaneGeometry(5, 5)
    }

    setTextures() {
        this.textures = {}

        this.textures.color = this.resources.items.memeColorTexture
        this.textures.color.colorSpace = THREE.SRGBColorSpace
        // this.textures.color.repeat.set(1.5, 1.5)
        this.textures.color.wrapS = THREE.RepeatWrapping
        this.textures.color.wrapT = THREE.RepeatWrapping
    }

    setMaterial() {
        this.material = new THREE.MeshBasicMaterial({
            // color: 0x338a24,
            map: this.textures.color,
            side: THREE.DoubleSide
            // normalMap: this.textures.normal
        })
    }

    setMesh() {
        this.mesh = new THREE.Mesh(this.geometry, this.material)
        this.mesh.rotation.y = Math.PI * 0.25
        this.mesh.position.set(0, 3, 0)
        this.mesh.receiveShadow = true
        this.scene.add(this.mesh)
    }

    update() {
        // if (this.animation)
        // this.mesh.rotation.y += (this.time.delta * 0.001)
    }
}