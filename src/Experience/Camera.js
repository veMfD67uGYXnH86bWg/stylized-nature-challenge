import * as THREE from 'three/webgpu'
import Experience from './Experience.js'

export default class Camera {
    constructor() {
        this.experience = new Experience()
        this.sizes = this.experience.sizes
        this.scene = this.experience.scene
        this.canvas = this.experience.canvas
        this.debug = this.experience.debug

        // Debug
        if (this.debug.active) {
            this.debugFolder = this.debug.ui.addFolder({title: 'Camera'})
        }

        this.setInstance()
        // this.setControls

        const cameraDirection = new THREE.Vector3()
        this.instance.getWorldDirection(cameraDirection)
        // this.yAngle = Math.atan2(cameraDirection.x, cameraDirection.z)
        this.yAngle = Math.atan2(this.offset.x, this.offset.z)
    }

    setInstance() {
        this.params = {
            fov: 35,
            near: 0.1,
            far: 150,
            zoom: 1.5,
            lerpFactor: 0.08,
        }

        this.baseOffset = new THREE.Vector3(8.326, 8.791, 0.387)
        this.offset = this.baseOffset.clone().multiplyScalar(this.params.zoom)
        this.targetPosition = new THREE.Vector3()

        this.instance = new THREE.PerspectiveCamera(
            this.params.fov,
            this.sizes.width / this.sizes.height,
            this.params.near,
            this.params.far
        )
        // this.instance.position.set(8.326, 8.791, 0.387)
        this.instance.position.copy(this.offset)
        this.scene.add(this.instance)

        // FOV Debug
        if (this.debug.active) {
            this.debugFolder.addBinding(this.params, 'fov', {label: 'FOV', min: 10, max: 90, step: 0.5})
                .on('change', () => this.updateProjection())
        }

        // Zoom Debug
        if (this.debug.active) {
            this.debugFolder.addBinding(this.params, 'zoom', {label: 'Zoom', min: 1, max: 2, step: 0.01})
                .on('change', () => this.updateProjection())
        }
        // Lerp Debug
        if (this.debug.active) {
            this.debugFolder.addBinding(this.params, 'lerpFactor', {label: 'Lerp', min: 0.01, max: 0.1, step: 0.001})
        }
    }

    updateProjection() {

        this.instance.fov = this.params.fov
        this.instance.updateProjectionMatrix()
        
        this.offset.copy(this.baseOffset).multiplyScalar(this.params.zoom)
        // this.yAngle = Math.atan2(this.offset.x, this.offset.z)
        this.instance.updateProjectionMatrix()
    }

    /*setControls() {
        this.controls = new OrbitControls(this.instance, this.canvas)
        this.controls.enableDamping = true
        this.controls.enableRotate = false
        this.controls.mouseButtons = {
            LEFT: THREE.MOUSE.PAN,
            MIDDLE: THREE.MOUSE.DOLLY,
            RIGHT: THREE.MOUSE.PAN,
        }
        this.controls.target.set(0.3591, 0, -3.083)
        this.controls.update()
    }*/

    resize() {
        this.instance.aspect = this.sizes.width / this.sizes.height
        this.instance.updateProjectionMatrix()
    }

    update() {
        if (!this.character) {
            this.character = this.experience.world.character
        }

        if (this.character) {
            if (!this.lookAtTarget) this.lookAtTarget = new THREE.Vector3()

            const characterPos = this.character.model.position
            this.targetPosition.copy(characterPos).add(this.offset)
            this.instance.position.lerp(this.targetPosition, this.params.lerpFactor)
            this.lookAtTarget.lerp(characterPos, this.params.lerpFactor)
            this.instance.lookAt(this.lookAtTarget)
        }

        // this.controls.update()
    }
}
