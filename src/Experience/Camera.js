import * as THREE from 'three/webgpu'
import Experience from './Experience.js'
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js'

export default class Camera {
    constructor() {
        this.experience = new Experience()
        this.sizes = this.experience.sizes
        this.scene = this.experience.scene
        this.canvas = this.experience.canvas
        this.debug = this.experience.debug

        // Debug
        // if (this.debug.active) {
        //     this.debugFolder = this.debug.ui.addFolder({title: 'Camera'})
        // }

        this.setInstance()
        this.setControls()
    }

    setInstance() {
        this.params = {
            fov: 35,
            near: 0.1,
            far: 150,
        }

        this.instance = new THREE.PerspectiveCamera(
            this.params.fov,
            this.sizes.width / this.sizes.height,
            this.params.near,
            this.params.far
        )
        this.instance.position.set(8.326, 8.791, 0.387)
        this.scene.add(this.instance)

        // if (this.debug.active) {
        //     this.debugFolder.addBinding(this.params, 'fov', {label: 'FOV', min: 10, max: 90, step: 0.5})
        //         .on('change', () => this.updateProjection())
        // }
    }

    // updateProjection() {
    //     this.instance.fov = this.params.fov
    //     this.instance.updateProjectionMatrix()
    // }

    setControls() {
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
    }

    resize() {
        this.instance.aspect = this.sizes.width / this.sizes.height
        this.instance.updateProjectionMatrix()
    }

    update() {
        this.controls.update()
    }
}
