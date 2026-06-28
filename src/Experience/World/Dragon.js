import * as THREE from 'three/webgpu'
import Experience from '../Experience.js'
import Outline from './Outline.js'

export default class Dragon {
    constructor() {
        this.experience = new Experience()
        this.scene = this.experience.scene
        this.resources = this.experience.resources
        this.time = this.experience.time
        this.world = this.experience.world
        this.debug = this.experience.debug
        this.resource = this.resources.items.dragonModel

        if (this.debug.active) {
            this.debugFolder = this.debug.ui.addFolder(
                {
                    title: 'Dragon',
                })
        }

        this.setModel()
        this.setPosition()
        this.setAnimation()
        this.setBoundingBox()
    }


    setModel() {
        this.params = {
            scale: 0.018,
            outline: 1.5,
        }
        this.model = this.resource.scene
        this.model.scale.set(this.params.scale, this.params.scale, this.params.scale)
        this.scene.add(this.model)

        this.model.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                child.castShadow = true
            }
        })

        this.outline = new Outline({thickness: this.params.outline}).add(this.model)
        console.log('Loaded Dragon Model (Placeholder)')

        if (this.debug.active) {
            this.debugFolder.addBinding(this.params, 'outline', {label: 'Outline', min: 0.05, max: 3, step: 0.01})
                .on('change', e => this.outline.uThickness.value = e.value)
            this.debugFolder.addBinding(this.params, 'scale', {
                label: 'Scale',
                min: 0.01,
                max: 0.03,
                step: 0.001,
            }).on('change', () => {
                this.model.scale.set(this.params.scale, this.params.scale, this.params.scale)
            })
        }
    }

    setPosition() {
        this.model.position.set(-41.6, 0, -8.67)
        this.model.rotation.set(0, Math.PI, 0)
    }

    setBoundingBox() {
        this.params.x = 3.5
        this.params.y = 1.7
        this.params.z = 5.7
        this.params.offsetX = 0
        this.params.offsetY = 0.9
        this.params.offsetZ = 0.7
        this.boundingBoxSize = new THREE.Vector3(this.params.x, this.params.y, this.params.z)
        this.boundingBoxCenter = new THREE.Vector3()

        this.boundingBox = new THREE.Box3()
        this.boundingBoxSize.set(this.params.x, this.params.y, this.params.z)
        this.boundingBoxCenter.copy(this.model.position).add(
            new THREE.Vector3(this.params.offsetX, this.params.offsetY, this.params.offsetZ)
        )
        this.boundingBox.setFromCenterAndSize(this.boundingBoxCenter, this.boundingBoxSize)
        this.world.colliders.push(this.boundingBox)

        if (this.debug.active) {
            this.boundingBoxHelper = new THREE.Box3Helper(this.boundingBox, 0xffffff)
            this.scene.add(this.boundingBoxHelper)
            this.debugFolder.addBinding(this.boundingBoxHelper, 'visible', {label: 'boundingBox'})
        }
    }

    playAnimation() {
        this.animation.play = (name) => {
            const newAction = this.animation.actions[name]
            const oldAction = this.animation.current

            if (oldAction === newAction) return

            newAction.reset().play()
            if (oldAction) newAction.crossFadeFrom(oldAction, 0.3, false)

            this.animation.current = newAction
        }
    }

    setAnimation() {
        this.animation = {}
        this.animation.mixer = new THREE.AnimationMixer(this.model)

        this.animation.actions = {}
        this.animation.actions.idle = this.animation.mixer.clipAction(this.resource.animations[0])

        this.animation.actions.current = this.animation.actions.idle
        this.animation.actions.current.play()

        this.playAnimation()
    }

    update() {
        if (this.animation)
            this.animation.mixer.update(this.time.delta * 0.001)
    }
}