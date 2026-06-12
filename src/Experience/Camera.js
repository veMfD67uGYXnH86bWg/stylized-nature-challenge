import * as THREE from 'three'
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
        //     this.debugFolder = this.debug.ui.addFolder(
        //         {
        //             title: 'Camera',
        //         })
        // }

        this.setInstance()
        this.setControls()
    }

    setInstance() {
        this.params = {}
        this.params.frustumSize = 10
        // this.params.frustumSize = 10
        const aspect = this.sizes.width / this.sizes.height
        this.instance = new THREE.OrthographicCamera(
            (this.params.frustumSize * aspect) / -2,
            (this.params.frustumSize * aspect) / 2,
            this.params.frustumSize / 2,
            this.params.frustumSize / -2,
            0.1,
            100
        )
        this.instance.position.set(8, 8, 8)
        this.instance.lookAt(0, 0, 0)
        this.scene.add(this.instance)

        // if (this.debug.active) {
        //     this.debugFolder.addBinding(this.params, 'frustumSize', {
        //         label: 'frustumSize',
        //         min: 10,
        //         max: 20,
        //         step: 1
        //     }).on('change', () => this.resize())
        // }
    }

    setControls() {
        this.controls = new OrbitControls(this.instance, this.canvas)
        this.controls.enableDamping = true
    }

    resize() {
        const aspect = this.sizes.width / this.sizes.height
        this.instance.left = (this.params.frustumSize * aspect) / -2
        this.instance.right = (this.params.frustumSize * aspect) / 2
        this.instance.top = this.params.frustumSize / 2
        this.instance.bottom = this.params.frustumSize / -2
        this.instance.updateProjectionMatrix()
    }

    update() {
        this.controls.update()
    }
}