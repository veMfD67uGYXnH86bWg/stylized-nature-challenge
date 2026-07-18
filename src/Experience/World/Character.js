import * as THREE from 'three/webgpu'
import Experience from '../Experience.js'
import Outline from './Outline.js'
import Silhouette, {RENDER_ORDER} from './Silhouette.js'

export default class Character {
    constructor() {
        this.experience = new Experience()
        this.scene = this.experience.scene
        this.resources = this.experience.resources
        this.time = this.experience.time
        this.debug = this.experience.debug
        this.input = this.experience.input
        this.terrain = this.experience.world.terrain
        this.camera = this.experience.camera

        this.direction = new THREE.Vector3()
        this.colliders = this.experience.world.colliders
        this.raycaster = new THREE.Raycaster()
        this.downVector = new THREE.Vector3(0, -1, 0)
        this.targetRotation = 0 // smooth rotation LERP
        this.isRunning = false

        if (this.debug.active) {
            this.debugFolder = this.debug.ui.addFolder(
                {
                    title: 'Character',
                    expanded: false,
                })
        }

        this.resource = this.resources.items.characterModel

        this.setSpeed()
        this.setModel()
        this.setPosition()
        this.setBoundingBox()
        this.setAnimation()
        this.setSounds()

        window.addEventListener('keydown', (e) => {
            if (e.code === 'ShiftLeft') this.isRunning = !this.isRunning
        })

        console.log('Loaded Character')
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
        this.params = {
            speed: 2.5,
            speedFactor: 2.5,
        }

        if (this.debug.active) {
            this.debugFolder.addBinding(this.params, 'speed', {
                label: 'Speed',
                min: 1,
                max: 5,
                step: 0.1
            })
            this.debugFolder.addBinding(this.params, 'speedFactor', {
                label: 'Speed Factor',
                min: 1,
                max: 5,
                step: 0.1
            })
        }
    }

    setModel() {
        this.model = this.resource.scene
        this.scene.add(this.model)

        this.model.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                child.castShadow = true
                child.receiveShadow = true
            }
        })

        this.params.outline = 0.02
        this.outline = new Outline({thickness: this.params.outline}).add(this.model)
        if (this.debug.active) {
            this.debugFolder.addBinding(this.params, 'outline', {label: 'Outline', min: 0, max: 0.1, step: 0.001})
                .on('change', e => this.outline.uThickness.value = e.value)
        }

        this.model.traverse((child) => {
            if (child.isMesh) child.renderOrder = RENDER_ORDER.CHARACTER
        })

        this.params.silhouetteColor = '#94d4db'
        this.params.silhouetteDarken = 0.55
        this.params.silhouetteContour = 0.012
        this.silhouette = new Silhouette({
            silhouetteColor: this.params.silhouetteColor,
            contourDarken: this.params.silhouetteDarken,
            contourThickness: this.params.silhouetteContour,
        }).add(this.model)
        if (this.debug.active) {
            this.debugFolder.addBinding(this.params, 'silhouetteColor', {label: 'Silhouette Color'})
                .on('change', e => this.silhouette.uColor.value.set(e.value))
            this.debugFolder.addBinding(this.params, 'silhouetteDarken', {
                label: 'Contour Darken',
                min: 0,
                max: 1,
                step: 0.01
            })
                .on('change', e => this.silhouette.uDarken.value = e.value)
            this.debugFolder.addBinding(this.params, 'silhouetteContour', {
                label: 'Contour Thickness',
                min: 0,
                max: 0.05,
                step: 0.001
            })
                .on('change', e => this.silhouette.uThickness.value = e.value)
        }
    }

    setPosition() {
        this.model.position.set(0, 0, 0)
        this.model.rotation.set(0, Math.PI / 2, 0)

        if (this.debug.active) {
            const btn = this.debugFolder.addButton({
                title: 'Print position',
                label: 'Print position',
            })
            btn.on('click', () => {
                console.log(this.model.position)
            })
        }
    }

    setBoundingBox() {
        this.boundingBoxSize = new THREE.Vector3(0.5, 1.8, 0.5)
        this.halfHeight = this.boundingBoxSize.y * 0.5

        this.boundingBox = new THREE.Box3()

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
        this.animation.actions.running = this.animation.mixer.clipAction(this.resource.animations[1])
        this.animation.actions.walking = this.animation.mixer.clipAction(this.resource.animations[2])

        this.animation.actions.current = this.animation.actions.idle
        this.animation.actions.current.play()

        this.playAnimation()
    }

    setSounds() {
        this.stepBuffers = [1, 2, 3, 4, 5, 6, 7].map(i => this.resources.items[`step${i}Sound`])
        this.stepSound = new THREE.PositionalAudio(this.experience.listener)
        this.stepSound.setRefDistance(2)

        this.params.stepVolume = 2.45
        this.stepSound.setVolume(this.params.stepVolume)
        this.model.add(this.stepSound)

        this.stepAccumulator = 0
        this.params.stepDistance = 1.35
        this.params.strideRunFactor = 2.0

        if (this.debug.active) {
            this.debugFolder.addBinding(this.params, 'stepDistance', {
                label: 'Step Distance',
                min: 0.2,
                max: 3,
                step: 0.05,
            })
            this.debugFolder.addBinding(this.params, 'strideRunFactor', {
                label: 'Run Stride Factor',
                min: 1,
                max: 4,
                step: 0.05,
            })
            this.debugFolder.addBinding(this.params, 'stepVolume', {
                label: 'Step Volume',
                min: 0,
                max: 3,
                step: 0.01,
            }).on('change', (e) => this.stepSound.setVolume(e.value))
        }
    }

    playStep() {
        const buffer = this.stepBuffers[Math.floor(Math.random() * this.stepBuffers.length)]
        if (this.stepSound.isPlaying) this.stepSound.stop()
        this.stepSound.setBuffer(buffer)
        this.stepSound.setPlaybackRate(0.9 + Math.random() * 0.2)   // 10% pitch
        this.stepSound.play()
    }

    update() {
        if (this.animation)
            this.animation.mixer.update(this.time.delta * 0.001)

        this.handleMovement()
        this.handleCollision()

        const dx = this.model.position.x - this.previousPosition.x
        const dz = this.model.position.z - this.previousPosition.z
        this.stepAccumulator += Math.hypot(dx, dz)

        const stride = this.params.stepDistance * (this.running ? this.params.strideRunFactor : 1)
        if (this.stepAccumulator >= stride) {
            this.stepAccumulator = 0
            this.playStep()
        }
    }

    handleMovement() {
        this.previousPosition = this.model.position.clone()

        const move = this.input.getMove()
        this.direction.set(move.x, 0, move.z)
        const running = move.forceRun !== null ? move.forceRun : this.isRunning

        this.running = running // strides

        if (this.direction.length() > 0) {

            this.direction2 = this.direction.clone()
            this.direction2.applyEuler(new THREE.Euler(0, this.camera.yAngle, 0)) // Adjusts direction depending on camera angle
            this.direction2.normalize()

            this.targetRotation = Math.atan2(this.direction2.x, this.direction2.z)
            const TWO_PI = Math.PI * 2
            let delta = (this.targetRotation - this.model.rotation.y) % TWO_PI
            if (delta > Math.PI) delta -= TWO_PI
            else if (delta < -Math.PI) delta += TWO_PI
            this.model.rotation.y += delta * 0.1

            if (this.model.rotation.y > Math.PI) this.model.rotation.y -= TWO_PI
            else if (this.model.rotation.y < -Math.PI) this.model.rotation.y += TWO_PI

            this.direction2.multiplyScalar(this.params.speed * this.time.delta * (running ? this.params.speedFactor : 1) * 0.001)
            this.model.position.add(this.direction2)
            this.animation.play(running ? 'running' : 'walking')
            this.isMoving = true
        } else {
            this.animation.play('idle')
            this.isMoving = false
        }

        this.movedPosition = this.model.position.clone()
        this.boundingBox.setFromCenterAndSize(this.model.position, this.boundingBoxSize)
    }

    handleCollision() {
        // Objects Collision
        this.colliders.forEach(collider => {
            if (this.boundingBox.intersectsBox(collider)) {
                this.model.position.x = this.previousPosition.x
                this.boundingBox.setFromCenterAndSize(this.model.position, this.boundingBoxSize)
                if (this.boundingBox.intersectsBox(collider)) {
                    this.model.position.x = this.movedPosition.x
                    this.model.position.z = this.previousPosition.z
                    this.boundingBox.setFromCenterAndSize(this.model.position, this.boundingBoxSize)
                    if (this.boundingBox.intersectsBox(collider)) {
                        this.model.position.copy(this.previousPosition)
                    }
                }
            }
        })

        // Floor (terrain) collision
        this.raycaster.set(this.model.position, this.downVector)
        const hits = this.raycaster.intersectObject(this.terrain.model)
        if (hits.length > 0) {
            this.model.position.y = hits[0].point.y + this.halfHeight
        }
    }
}