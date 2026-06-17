import * as THREE from 'three/webgpu'
import Experience from '../Experience.js'

export default class Character {
    constructor({shape, color, position}) {
        this.experience = new Experience()
        this.scene = this.experience.scene
        this.resources = this.experience.resources
        this.time = this.experience.time
        this.debug = this.experience.debug
        this.shape = shape
        this.color = color
        this.position = position

        // Debug
        if (this.debug.active) {
            this.debugFolder = this.debug.ui.addFolder(
                {
                    title: `${this.shape[0].toUpperCase() + this.shape.slice(1)}`,
                })
        }

        this.setGeometry()
        this.setMaterial()
        this.setModel()
        this.setPosition()
        this.setBoundingBox()
        // this.setAnimation()
    }

    setGeometry() {
        if (this.shape == 'box') {
            this.geometry = new THREE.BoxGeometry(1.2, 1.2, 1.2)
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


    setModel() {
        this.model = new THREE.Mesh(this.geometry, this.material)
        if (this.shape == 'torus') {
            this.model.rotation.x = -Math.PI * 0.5
        }
        // this.model = this.resource.scene
        // this.model.position.copy(this.position)
        // this.model.scale.set(0.02, 0.02, 0.02)
        this.scene.add(this.model)

        this.model.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                child.castShadow = true
            }
        })
    }

    setPosition() {
        this.model.position.copy(this.position)
    }

    setAnimation() {

    }

    setBoundingBox() {
        this.boundingBox = new THREE.Box3()
        this.boundingBoxHelper = new THREE.Box3Helper(this.boundingBox, 0xffffff)
        this.scene.add(this.boundingBoxHelper)
        // this.boundingBoxHelper.visible = false
        this.boundingBox.setFromObject(this.model)

        if (this.debug.active) {
            this.debugFolder.addBinding(this.boundingBoxHelper, 'visible', {label: 'boundingBox'})
        }
    }

    update() {
        // this.boundingBox.setFromObject(this.model)
    }
}