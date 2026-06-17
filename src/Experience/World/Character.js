import * as THREE from 'three/webgpu'
import Experience from '../Experience.js'

export default class Character {
    constructor() {
        this.experience = new Experience()
        this.scene = this.experience.scene
        this.resources = this.experience.resources
        this.time = this.experience.time
        this.debug = this.experience.debug
        this.input = this.experience.input
        this.params = {}
        this.params.speed = 0.007

        this.camera = this.experience.camera
        this.direction = new THREE.Vector3()

        // Debug
        if (this.debug.active) {
            this.debugFolder = this.debug.ui.addFolder(
                {
                    title: 'Character',
                })
        }

        // Resource
        // this.resource = this.resources.items.characterModel

        this.setGeometry()
        this.setMaterial()
        this.setSpeed()
        this.setModel()
        this.setPosition()
        // this.setAnimation()
    }

    setGeometry() {
        this.geometry = new THREE.CapsuleGeometry(0.35, 1, 4, 8, 1)
    }

    setMaterial() {
        this.material = new THREE.MeshStandardMaterial({
            color: 0x42adf5,
            // wireframe: true,
        })
    }


    setSpeed() {
        // Speed Debug
        if (this.debug.active) {
            this.debugFolder.addBinding(this.params, 'speed', {
                label: 'Speed',
                min: 0.001,
                max: 0.05,
                step: 0.001
            })
        }
    }

    setModel() {
        this.model = new THREE.Mesh(this.geometry, this.material)
        // this.model = this.resource.scene
        // this.model.scale.set(0.02, 0.02, 0.02)
        this.scene.add(this.model)

        this.model.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                child.castShadow = true
            }
        })
    }

    setPosition() {
        this.model.position.set(0, .85, 0)
    }

    setAnimation() {
        this.animation = {}

        // Mixer
        this.animation.mixer = new THREE.AnimationMixer(this.model)

        // Actions
        this.animation.actions = {}

        this.animation.actions.idle = this.animation.mixer.clipAction(this.resource.animations[0])
        this.animation.actions.walking = this.animation.mixer.clipAction(this.resource.animations[1])
        this.animation.actions.running = this.animation.mixer.clipAction(this.resource.animations[2])

        this.animation.actions.current = this.animation.actions.idle
        this.animation.actions.current.play()

        // Play the action
        this.animation.play = (name) => {
            const newAction = this.animation.actions[name]
            const oldAction = this.animation.actions.current

            newAction.reset()
            newAction.play()
            newAction.crossFadeFrom(oldAction, 1)

            this.animation.actions.current = newAction
        }

        // Debug
        if (this.debug.active) {
            const debugObject = {
                playIdle: () => {
                    this.animation.play('idle')
                },
                playWalking: () => {
                    this.animation.play('walking')
                },
                playRunning: () => {
                    this.animation.play('running')
                }
            }
            this.debugFolder.add(debugObject, 'playIdle')
            this.debugFolder.add(debugObject, 'playWalking')
            this.debugFolder.add(debugObject, 'playRunning')
        }
    }

    update() {
        // if (this.animation)
        // this.animation.mixer.update(this.time.delta * 0.001)

        this.direction.set(0, 0, 0)

        if (this.input.isPressed('KeyW')) this.direction.z -= 1
        if (this.input.isPressed('KeyS')) this.direction.z += 1
        if (this.input.isPressed('KeyA')) this.direction.x -= 1
        if (this.input.isPressed('KeyD')) this.direction.x += 1

        this.direction.applyEuler(new THREE.Euler(0, this.camera.yAngle, 0))
        this.direction.normalize()
        this.direction.multiplyScalar(this.params.speed * this.time.delta)
        this.model.position.add(this.direction)


    }
}