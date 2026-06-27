import * as THREE from 'three/webgpu'
import Experience from '../Experience.js'

export default class Environment {
    constructor() {
        this.experience = new Experience()
        this.scene = this.experience.scene
        this.resources = this.experience.resources
        this.debug = this.experience.debug

        // Debug
        if (this.debug.active) {
            this.debugFolder = this.debug.ui.addFolder(
                {
                    title: 'Environment',
                    expanded: false,
                })
        }

        this.setSunLight()
        this.setAmbientLight()
        this.setEnvironmentMap()
    }

    setSunLight() {
        this.sunLight = new THREE.DirectionalLight('#ffffff', 4.0)
        this.sunLight.castShadow = true
        this.sunLight.shadow.camera.near = 0.1
        this.sunLight.shadow.camera.far = 20.5
        this.sunLight.shadow.mapSize.set(1024, 1024)
        this.sunLight.shadow.normalBias = 0.05
        this.scene.add(this.sunLight)

        this.shadowHelper = new THREE.CameraHelper(this.sunLight.shadow.camera)
        this.scene.add(this.shadowHelper)
        this.shadowHelper.visible = false
        this.sunLight.shadow.camera.top = 7.2
        this.sunLight.shadow.camera.bottom = -10
        this.sunLight.shadow.camera.left = -12
        this.sunLight.shadow.camera.right = 16.5


        this.minMaxStepNegative = {min: -20, max: 0, step: 0.1}
        this.minMaxStepPositive = {min: 0, max: 20, step: 0.1}
        this.minMaxLightOffset = {min: -10, max: 10, step: 0.01}

        const minMaxNearFar = {min: 0.1, max: 50, step: 0.5}
        this.params = {left: 0, right: 1, bottom: 0, top: 1}
        this.lightParams = {
            offsetX: 6.74,
            offsetY: 4,
            offsetZ: -2,
        }

        if (this.debug.active) {
            this.lightFolder = this.debugFolder.addFolder({title: 'Light'})
            this.lightFolder.addBinding(this.sunLight, 'intensity', {
                label: 'Sun Intensity',
                min: 0,
                max: 10,
                step: 0.001
            })

            this.shadowFolder = this.debugFolder.addFolder({title: 'Shadow Camera'})
            this.shadowFolder.addBinding(this.shadowHelper, 'visible', {label: 'Helper'})


            Object.keys(this.params).forEach(key => {
                this.shadowFolder.addBinding(this.sunLight.shadow.camera, key, {
                    label: `${key}`,
                    ...(this.params[key] ? this.minMaxStepPositive : this.minMaxStepNegative)
                }).on('change', () => {
                    this.sunLight.shadow.camera.updateProjectionMatrix()
                })
            })

            ;['near', 'far'].forEach(key => {
                this.shadowFolder.addBinding(this.sunLight.shadow.camera, key, {
                    label: key.charAt(0).toUpperCase() + key.slice(1),
                    ...minMaxNearFar
                }).on('change', () => this.sunLight.shadow.camera.updateProjectionMatrix())
            })

            Object.keys(this.lightParams).forEach(key => {
                this.lightFolder.addBinding(this.lightParams, key, {
                    label: key,
                    ...this.minMaxLightOffset
                }).on('change', () => {
                    this.sunLight.shadow.camera.updateProjectionMatrix()
                })
            })
        }
    }

    setAmbientLight() {
        this.ambientLight = new THREE.AmbientLight(0xffffff, 0.1)
        this.scene.add(this.ambientLight)

        console.log('Loaded Environment')
        if (this.debug.active) {
            this.lightFolder.addBinding(this.ambientLight, 'intensity', {
                label: 'Abient Intensity',
                min: 0,
                max: 10,
                step: 0.001
            })
        }

    }

    setEnvironmentMap() {
        this.environmentMap = {}
        this.environmentMap.intensity = 0.4
        this.environmentMap.texture = this.resources.items.environmentMapTexture
        this.environmentMap.texture.colorSpace = THREE.SRGBColorSpace

        this.scene.environment = this.environmentMap.texture

        this.environmentMap.updateMaterials = () => {
            this.scene.traverse((child) => {
                if (child instanceof THREE.Mesh &&
                    (child.material instanceof THREE.MeshStandardMaterial ||
                        child.material instanceof THREE.MeshStandardNodeMaterial)) {
                    child.material.envMap = this.environmentMap.texture
                    child.material.envMapIntensity = this.environmentMap.intensity
                    child.material.needsUpdate = true
                }
            })
        }
        this.environmentMap.updateMaterials()

        if (this.debug.active) {
            this.envMapFolder = this.debugFolder.addFolder({title: 'Environment Map'})
            this.envMapFolder.addBinding(this.environmentMap, 'intensity', {
                label: 'Intensity',
                min: 0,
                max: 4,
                step: 0.001,
            }).on('change', () => this.environmentMap.updateMaterials())
        }
    }

    update() {
        if (!this.character) this.character = this.experience.world.character
        if (this.character) {
            const pos = this.character.model.position
            this.sunLight.position.set(pos.x + this.lightParams.offsetX, pos.y + this.lightParams.offsetY, pos.z + this.lightParams.offsetZ)
            this.sunLight.target.position.copy(pos)
            this.sunLight.target.updateMatrixWorld()
        }
    }
}