import * as THREE from 'three/webgpu'
import Experience from './Experience.js'
import {OrbitControls} from 'three/addons/controls/OrbitControls.js'

export default class Camera {
    constructor() {
        this.experience = new Experience()
        this.sizes = this.experience.sizes
        this.scene = this.experience.scene
        this.canvas = this.experience.canvas
        this.debug = this.experience.debug

        if (this.debug.active) {
            this.debugFolder = this.debug.ui.addFolder({title: 'Camera'})
        }

        this.setCamera()
        this.setControls()

        const cameraDirection = new THREE.Vector3()
        this.instance.getWorldDirection(cameraDirection)
        this.yAngle = Math.atan2(this.offset.x, this.offset.z)
    }

    setCamera() {
        this.params = {
            fov: 35,
            near: 0.1,
            far: 150,
            zoom: 1.5,
            lerpFactor: 0.08,
            isOrbit: false,
        }

        this.baseOffset = new THREE.Vector3(6.6, 8.791, 0)
        this.offset = this.baseOffset.clone().multiplyScalar(this.params.zoom)
        this.targetPosition = new THREE.Vector3()

        this.instance = new THREE.PerspectiveCamera(
            this.params.fov,
            this.sizes.width / this.sizes.height,
            this.params.near,
            this.params.far
        )
        this.instance.position.copy(this.offset)
        this.scene.add(this.instance)

        if (this.debug.active) {
            this.debugFolder.addBinding(this.params, 'fov', {label: 'FOV', min: 10, max: 90, step: 0.5})
                .on('change', () => this.updateProjection())
            this.debugFolder.addBinding(this.params, 'zoom', {label: 'Zoom', min: 1, max: 2, step: 0.01})
                .on('change', () => this.updateProjection())
            this.debugFolder.addBinding(this.params, 'lerpFactor', {label: 'Lerp', min: 0.01, max: 0.1, step: 0.001})
            this.debugFolder.addBinding(this.params, 'isOrbit', {label: 'OrbitControls'})
                .on('change', () => this.switchCamera())
        }

    }

    switchCamera() {
        if (this.params.isOrbit) {
            this.controls.enabled = true
            this.controls.target.copy(this.character.model.position)
            this.controls.update()
        } else {
            this.controls.enabled = false
        }
    }

    updateProjection() {
        this.instance.fov = this.params.fov
        this.instance.updateProjectionMatrix()

        this.offset.copy(this.baseOffset).multiplyScalar(this.params.zoom)
        this.instance.updateProjectionMatrix()
    }

    setControls() {
        this.controls = new OrbitControls(this.instance, this.canvas)
        this.controls.enableDamping = true
        this.controls.enableRotate = true
        this.controls.enabled = false
    }

    resize() {
        this.instance.aspect = this.sizes.width / this.sizes.height
        this.instance.updateProjectionMatrix()
    }

    update() {
        if (!this.character) {
            this.character = this.experience.world.character
        } else {
            if (!this.params.isOrbit) {
                if (!this.lookAtTarget) this.lookAtTarget = new THREE.Vector3()

                const characterPos = this.character.model.position
                this.targetPosition.copy(characterPos).add(this.offset)
                this.instance.position.lerp(this.targetPosition, this.params.lerpFactor)
                this.lookAtTarget.lerp(characterPos, this.params.lerpFactor)
                this.instance.lookAt(this.lookAtTarget)
            } else {
                this.controls.update()
            }
        }
    }
}
