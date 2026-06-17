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
        this.params.speed = 3
        this.floor = this.experience.world.floor
        this.camera = this.experience.camera

        // Movement
        this.direction = new THREE.Vector3()
        this.shapes = this.experience.world.shapes
        this.raycaster = new THREE.Raycaster()
        this.downVector = new THREE.Vector3(0, -1, 0)
        this.targetRotation = 0 // smooth rotation LERP
        this.isRunning = false

        // Debug
        if (this.debug.active) {
            this.debugFolder = this.debug.ui.addFolder(
                {
                    title: 'Character',
                })
        }

        // Resource
        this.resource = this.resources.items.characterModel

        this.setGeometry()
        this.setMaterial()
        this.setSpeed()
        this.setModel()
        this.setPosition()
        this.setBoundingBox()
        this.setAnimation()

        window.addEventListener('keydown', (e) => {
            if (e.code === 'ShiftLeft') this.isRunning = !this.isRunning
        })
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
                min: 1,
                max: 5,
                step: 0.1
            })
        }
    }

    setModel() {
        // this.model = new THREE.Mesh(this.geometry, this.material)
        this.model = this.resource.scene
        // this.model.scale.set(0.02, 0.02, 0.02)
        this.scene.add(this.model)

        this.model.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                child.castShadow = true
            }
        })
    }

    setPosition() {
        this.model.position.set(0, 0, 0)
        this.model.rotation.set(0, Math.PI / 2, 0)
    }

    setBoundingBox() {
        this.boundingBoxSize = new THREE.Vector3(0.5, 1.8, 0.5)
        this.halfHeight = this.boundingBoxSize.y * 0.5

        this.boundingBox = new THREE.Box3()
        this.boundingBoxHelper = new THREE.Box3Helper(this.boundingBox, 0xffffff)
        this.scene.add(this.boundingBoxHelper)

        if (this.debug.active) {
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

        // Mixer
        this.animation.mixer = new THREE.AnimationMixer(this.model)

        // Actions
        this.animation.actions = {}

        this.animation.actions.idle = this.animation.mixer.clipAction(this.resource.animations[0])
        this.animation.actions.running = this.animation.mixer.clipAction(this.resource.animations[1])
        this.animation.actions.walking = this.animation.mixer.clipAction(this.resource.animations[2])

        this.animation.actions.current = this.animation.actions.idle
        this.animation.actions.current.play()

        // Play the action
        this.playAnimation()
    }

    update() {
        if (this.animation)
            this.animation.mixer.update(this.time.delta * 0.001)

        const previousPosition = this.model.position.clone()
        this.direction.set(0, 0, 0)

        if (this.input.isPressed('KeyW')) this.direction.z -= 1
        if (this.input.isPressed('KeyS')) this.direction.z += 1
        if (this.input.isPressed('KeyA')) this.direction.x -= 1
        if (this.input.isPressed('KeyD')) this.direction.x += 1

        if (this.direction.length() > 0) {
            this.direction.applyEuler(new THREE.Euler(0, this.camera.yAngle, 0)) // Adjusts direction depending on camera angle
            this.direction.normalize()

            // Character rotation animation smoothing
            // this.model.rotation.y = Math.atan2(this.direction.x, this.direction.z)
            this.targetRotation = Math.atan2(this.direction.x, this.direction.z)
            const delta = ((this.targetRotation - this.model.rotation.y + Math.PI * 3) % (Math.PI * 2)) - Math.PI
            this.model.rotation.y += delta * 0.1

            this.direction.multiplyScalar(this.params.speed * this.time.delta * (this.isRunning ? 2 : 1) * 0.001)
            this.model.position.add(this.direction)
            this.animation.play(this.isRunning ? 'running' : 'walking')
        } else {
            this.animation.play('idle')
        }

        const movedPosition = this.model.position.clone()
        this.boundingBox.setFromCenterAndSize(this.model.position, this.boundingBoxSize)

        // Collision detection
        this.shapes.forEach(shape => {
            if (this.boundingBox.intersectsBox(shape)) {
                this.model.position.x = previousPosition.x
                this.boundingBox.setFromCenterAndSize(this.model.position, this.boundingBoxSize)
                if (this.boundingBox.intersectsBox(shape)) {
                    this.model.position.x = movedPosition.x
                    this.model.position.z = previousPosition.z
                    this.boundingBox.setFromCenterAndSize(this.model.position, this.boundingBoxSize)
                    if (this.boundingBox.intersectsBox(shape)) {
                        this.model.position.copy(previousPosition)
                    }
                }
            }
        })

        // Floor collision
        this.raycaster.set(this.model.position, this.downVector)
        const hits = this.raycaster.intersectObject(this.floor.mesh)
        if (hits.length > 0) {
            this.model.position.y = hits[0].point.y + this.halfHeight
        }
    }
}