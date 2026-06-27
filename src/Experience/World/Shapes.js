import * as THREE from 'three/webgpu'
import Experience from '../Experience.js'

export default class Character {
    constructor({shape, color, position}) {
        this.experience = new Experience()
        this.world = this.experience.world
        this.scene = this.experience.scene
        this.resources = this.experience.resources
        this.time = this.experience.time
        this.debug = this.experience.debug
        this.shape = shape
        this.color = color
        this.position = position

        if (this.debug.active) {
            this.debugFolder = this.debug.ui.addFolder(
                {
                    title: `${this.shape[0].toUpperCase() + this.shape.slice(1)}`,
                    expanded: false,
                })
        }

        this.setGeometry()
        this.setMaterial()
        this.setMesh()
        this.setPosition()
        this.setBoundingBox()
    }

    setGeometry() {
        if (this.shape == 'box') {
            // this.geometry = new THREE.BoxGeometry(1.2, 1.2, 1.2)
            this.geometry = new THREE.BoxGeometry(0.2, 5, 0.2)
        }
        if (this.shape == 'sphere') {
            this.geometry = new THREE.SphereGeometry(1, 16, 16)
        }
        if (this.shape == 'torus') {
            this.geometry = new THREE.TorusGeometry(1, 0.5, 16, 32)
        }

    }

    setMaterial() {
        this.material = new THREE.MeshStandardNodeMaterial({
            color: this.color,
            // wireframe: true,
        })
    }


    setMesh() {
        this.mesh = new THREE.Mesh(this.geometry, this.material)
        if (this.shape == 'torus') {
            this.mesh.rotation.x = -Math.PI * 0.5
        }
        this.scene.add(this.mesh)

        this.mesh.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                child.castShadow = true
            }
        })

        console.log(`Loaded ${this.shape} shape`)
    }

    setPosition() {
        this.mesh.position.copy(this.position)
    }

    setBoundingBox() {
        this.boundingBox = new THREE.Box3()
        this.boundingBox.setFromObject(this.mesh)
        this.world.colliders.push(this.boundingBox)

        if (this.debug.active) {
            this.boundingBoxHelper = new THREE.Box3Helper(this.boundingBox, 0xffffff)
            this.scene.add(this.boundingBoxHelper)
            this.debugFolder.addBinding(this.boundingBoxHelper, 'visible', {label: 'boundingBox'})
        }
    }
}