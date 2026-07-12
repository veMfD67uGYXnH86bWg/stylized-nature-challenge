import * as THREE from 'three/webgpu'
import {
    color,
    float,
    mix,
    mx_noise_float,
    positionLocal,
    smoothstep,
    texture,
    time,
    uv,
    vec2,
    vec3,
    vec4,
    uniform
} from 'three/tsl'
import Experience from '../Experience.js'

export default class LightBeam {
    constructor() {
        this.experience = new Experience()
        this.debug = this.experience.debug
        this.scene = this.experience.scene
        this.camera = this.experience.camera
        this.input = this.experience.input
        this.sizes = this.experience.sizes
        this.time = this.experience.time
        this.resources = this.experience.resources

        this.params = {
            maxDistance: 6,
            radius: 0.20,
            chestHeight: 0.5,
            startOffset: 0.5,
            color: '#aef7ff',
            growDuration: 0.35,
            shrinkDuration: 0.05,

            intensity: 2.0,
            lightIntensity: 8,
            lightRange: 6,

            cleanseRadius: 1.0,
            cleanseInterval: 0.1,

            scrollSpeed: 3.0,
            textureLength: 4,

            haloScale: 1.8,
            haloAlpha: 0.15,

            noiseShellScale: 2.2,
            noiseScale: 1.0,
            noiseSpeed: 15.0,
            noiseThreshold: 0.15,
            noiseAlpha: 0.4,
            noiseTiling: {x: 1, y: 1, z: 5},
            shellOffset: 0.25,

            baseSphereSize: 0.52,
            baseSphereAlpha: 0.8,

            coreSphereSize: 0.33,
            coreSphereAlpha: 0.5,
            corePulseAmount: 0.12,
            corePulseSpeed: 4,

            twist: 0.4,
            twistWave: 0,
            twistWaveFrequency: 0,
            twistSpeed: 2.0,
        }

        this.activatedAt = null
        this.releasedAt = null
        this.growAtRelease = 1
        this.lastCleanseAt = 0

        this.mouseNdc = new THREE.Vector2()
        window.addEventListener('pointermove', (event) => {
            this.mouseNdc.x = (event.clientX / this.sizes.width) * 2 - 1
            this.mouseNdc.y = -(event.clientY / this.sizes.height) * 2 + 1
        })

        this.raycaster = new THREE.Raycaster()

        this.origin = new THREE.Vector3()
        this.target = new THREE.Vector3()
        this.direction = new THREE.Vector3()
        this.up = new THREE.Vector3(0, 1, 0)
        this.cleansePoint = new THREE.Vector3()

        this.downDirection = new THREE.Vector3(0, -1, 0)
        this.aimOrigin = new THREE.Vector3()
        this.toCamera = new THREE.Vector3()
        this.quadRight = new THREE.Vector3()
        this.quadNormal = new THREE.Vector3()
        this.basisMatrix = new THREE.Matrix4()

        if (this.debug.active) {
            this.debugFolder = this.debug.ui.addFolder({
                title: 'Light Beam',
                expanded: false,
            })
        }

        this.setMesh()
        this.setSound()

        console.log('Loaded Lightbeam')
    }

    normalizeHaloGeometry(geometry) {
        geometry.computeBoundingBox()
        const size = new THREE.Vector3()
        geometry.boundingBox.getSize(size)

        if (size.x >= size.y && size.x >= size.z) geometry.rotateZ(Math.PI * 0.5)
        else if (size.z >= size.y && size.z >= size.x) geometry.rotateX(-Math.PI * 0.5)

        geometry.computeBoundingBox()
        const bb = geometry.boundingBox
        const height = bb.max.y - bb.min.y
        const halfWidth = Math.max(bb.max.x - bb.min.x, bb.max.z - bb.min.z) * 0.5
        geometry.translate(
            -(bb.min.x + bb.max.x) * 0.5,
            -(bb.min.y + bb.max.y) * 0.5,
            -(bb.min.z + bb.max.z) * 0.5
        )
        geometry.scale(this.params.radius / halfWidth, 1 / height, this.params.radius / halfWidth)

        const position = geometry.attributes.position
        const slab = 0.05
        let bottomRadius = 0
        let topRadius = 0
        for (let i = 0; i < position.count; i++) {
            const radial = Math.hypot(position.getX(i), position.getZ(i))
            const y = position.getY(i)
            if (y < -0.5 + slab) bottomRadius = Math.max(bottomRadius, radial)
            if (y > 0.5 - slab) topRadius = Math.max(topRadius, radial)
        }
        if (topRadius < bottomRadius) geometry.rotateX(Math.PI)
    }

    setMesh() {
        const geometry = new THREE.PlaneGeometry(this.params.radius * 2, 1)
        let haloGeometry = null
        this.experience.resources.items.beamModel.scene.traverse((child) => {
            if (child.isMesh && !haloGeometry) haloGeometry = child.geometry.clone()
        })
        this.normalizeHaloGeometry(haloGeometry)

        const material = new THREE.MeshBasicNodeMaterial({
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            side: THREE.DoubleSide,
        })
        const endFade = smoothstep(0, 0.15, uv().y).mul(smoothstep(1, 0.85, uv().y))

        const beamTexture = this.experience.resources.items.beamMiddleTexture
        beamTexture.wrapS = beamTexture.wrapT = THREE.RepeatWrapping
        beamTexture.colorSpace = THREE.SRGBColorSpace

        this.uScrollSpeed = uniform(this.params.scrollSpeed)
        this.uBeamLength = uniform(1)

        const worldAlong = uv().y.mul(this.uBeamLength).div(this.params.textureLength)
        const scrollUv = vec2(
            worldAlong.sub(time.mul(this.uScrollSpeed)),
            uv().x
        )
        const tex = texture(beamTexture, scrollUv)
        const luminance = tex.r.max(tex.g).max(tex.b)
        material.colorNode = vec4(tex.rgb.mul(this.params.intensity), luminance.mul(endFade))

        this.uCoreWidth = uniform(2)
        material.positionNode = positionLocal.mul(vec3(this.uCoreWidth, 1, 1))

        this.mesh = new THREE.Mesh(geometry, material)
        this.mesh.visible = false
        this.mesh.frustumCulled = false
        this.scene.add(this.mesh)

        const haloMaterial = new THREE.MeshBasicNodeMaterial({
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            side: THREE.DoubleSide,
        })
        const alongBeam = positionLocal.y.add(0.5)
        const haloFade = smoothstep(1, 0.85, alongBeam)
        haloMaterial.colorNode = vec4(color(this.params.color), haloFade.mul(this.params.haloAlpha))

        this.halo = new THREE.Mesh(haloGeometry, haloMaterial)
        this.halo.scale.set(this.params.haloScale, 1, this.params.haloScale)
        this.halo.frustumCulled = false
        this.mesh.add(this.halo)

        const shellMaterial = new THREE.MeshBasicNodeMaterial({
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            side: THREE.DoubleSide,
        })

        this.uNoiseScale = uniform(this.params.noiseScale)
        this.uNoiseSpeed = uniform(this.params.noiseSpeed)
        this.uNoiseThreshold = uniform(this.params.noiseThreshold)
        this.uNoiseTiling = uniform(new THREE.Vector3(
            this.params.noiseTiling.x,
            this.params.noiseTiling.y,
            this.params.noiseTiling.z
        ))

        this.uTwist = uniform(this.params.twist)
        this.uTwistWave = uniform(this.params.twistWave)
        this.uTwistWaveFrequency = uniform(this.params.twistWaveFrequency)
        this.uTwistSpeed = uniform(this.params.twistSpeed)

        const twistedNoiseMask = (x, z, along) => {
            const twistAngle = along.mul(this.uTwist)
                .add(along.mul(this.uTwistWaveFrequency).sub(time.mul(this.uTwistSpeed)).sin().mul(this.uTwistWave))
            const twistCos = twistAngle.cos()
            const twistSin = twistAngle.sin()
            const twistedX = x.mul(twistCos).sub(z.mul(twistSin))
            const twistedZ = x.mul(twistSin).add(z.mul(twistCos))

            const noisePos = vec3(
                twistedX,
                along.sub(time.mul(this.uNoiseSpeed)),
                twistedZ
            ).mul(this.uNoiseTiling).mul(this.uNoiseScale)
            return smoothstep(this.uNoiseThreshold, this.uNoiseThreshold.add(0.05), mx_noise_float(noisePos))
        }

        const shellMask = twistedNoiseMask(
            positionLocal.x.div(this.params.radius),
            positionLocal.z.div(this.params.radius),
            positionLocal.y.add(0.5).mul(this.uBeamLength)
        )
        shellMaterial.colorNode = vec4(color(this.params.color), shellMask.mul(haloFade).mul(this.params.noiseAlpha))

        const shellGeometry = new THREE.CylinderGeometry(this.params.radius, this.params.radius, 1, 12, 1, true)
        this.noiseShell = new THREE.Mesh(shellGeometry, shellMaterial)
        this.noiseShell.scale.set(this.params.noiseShellScale, 1, this.params.noiseShellScale)
        this.noiseShell.frustumCulled = false
        this.mesh.add(this.noiseShell)

        const sphereMaterial = new THREE.MeshBasicNodeMaterial({
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            side: THREE.DoubleSide,
        })
        this.uBaseSphereSize = uniform(this.params.baseSphereSize)
        this.uBaseSphereAlpha = uniform(this.params.baseSphereAlpha)
        this.uSphereDebugSolid = uniform(0)
        const sphereMask = twistedNoiseMask(
            positionLocal.x,
            positionLocal.z,
            positionLocal.y.mul(this.uBaseSphereSize)
        )
        const sphereColor = mix(color(this.params.color), color('#ff0000'), this.uSphereDebugSolid)
        const sphereAlpha = mix(sphereMask.mul(this.uBaseSphereAlpha), float(1), this.uSphereDebugSolid)
        sphereMaterial.colorNode = vec4(sphereColor, sphereAlpha)

        this.baseSphere = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), sphereMaterial)
        this.baseSphere.visible = false
        this.baseSphere.frustumCulled = false
        this.scene.add(this.baseSphere)

        const coreSphereMaterial = new THREE.MeshBasicNodeMaterial({
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            side: THREE.DoubleSide,
        })
        this.uCoreSphereAlpha = uniform(this.params.coreSphereAlpha)
        coreSphereMaterial.colorNode = vec4(color(this.params.color), this.uCoreSphereAlpha)

        this.coreSphere = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), coreSphereMaterial)
        this.coreSphere.visible = false
        this.coreSphere.frustumCulled = false
        this.scene.add(this.coreSphere)

        this.light = new THREE.PointLight(this.params.color, 0, this.params.lightRange)
        this.scene.add(this.light)

        if (this.debug.active) {
            this.debugFolder.addBinding(this.params, 'scrollSpeed', {
                min: 0,
                max: 10,
                step: 0.01
            }).on('change', e => this.uScrollSpeed.value = e.value)
            this.debugFolder.addBinding({coreWidth: 2}, 'coreWidth', {
                label: 'Core Width',
                min: 0.1,
                max: 4,
                step: 0.05
            }).on('change', e => this.uCoreWidth.value = e.value)
            this.debugFolder.addBinding(this.params, 'cleanseRadius', {
                label: 'Cleanse Radius',
                min: 0.5,
                max: 10,
                step: 0.1
            })
            this.debugFolder.addBinding(this.params, 'startOffset', {
                label: 'Start Offset',
                min: 0,
                max: 2,
                step: 0.01
            })
            this.debugFolder.addBinding(this.params, 'haloScale', {
                label: 'Halo Width',
                min: 0.1,
                max: 10,
                step: 0.05
            }).on('change', e => this.halo.scale.set(e.value, 1, e.value))

            const shellFolder = this.debugFolder.addFolder({title: 'Noise Shell'})
            shellFolder.addBinding(this.params, 'noiseShellScale', {
                label: 'Width',
                min: 0.1,
                max: 10,
                step: 0.05
            }).on('change', e => this.noiseShell.scale.set(e.value, 1, e.value))
            shellFolder.addBinding(this.params, 'noiseScale', {
                label: 'Scale',
                min: 0.1,
                max: 10,
                step: 0.05
            }).on('change', e => this.uNoiseScale.value = e.value)
            shellFolder.addBinding(this.params, 'noiseSpeed', {
                label: 'Speed',
                min: 0,
                max: 30,
                step: 0.05
            }).on('change', e => this.uNoiseSpeed.value = e.value)
            shellFolder.addBinding(this.params, 'noiseTiling', {
                label: 'Tiling',
                x: {min: 0.05, max: 10, step: 0.5},
                y: {min: 0.05, max: 10, step: 0.5},
                z: {min: 0.05, max: 10, step: 0.5},
            }).on('change', () => {
                this.uNoiseTiling.value.set(
                    this.params.noiseTiling.x,
                    this.params.noiseTiling.y,
                    this.params.noiseTiling.z
                )
            })
            shellFolder.addBinding(this.params, 'shellOffset', {
                label: 'Start Offset',
                min: 0,
                max: 2,
                step: 0.01
            })
            shellFolder.addBinding(this.params, 'baseSphereSize', {
                label: 'Sphere Size',
                min: 0.05,
                max: 2,
                step: 0.01
            }).on('change', e => this.uBaseSphereSize.value = e.value)
            shellFolder.addBinding(this.params, 'baseSphereAlpha', {
                label: 'Sphere Alpha',
                min: 0,
                max: 1,
                step: 0.01
            }).on('change', e => this.uBaseSphereAlpha.value = e.value)
            shellFolder.addBinding({solid: false}, 'solid', {label: 'Sphere Debug'})
                .on('change', e => this.uSphereDebugSolid.value = e.value ? 1 : 0)
            shellFolder.addBinding(this.params, 'coreSphereSize', {
                label: 'Core Sphere Size',
                min: 0.05,
                max: 2,
                step: 0.01
            })
            shellFolder.addBinding(this.params, 'coreSphereAlpha', {
                label: 'Core Sphere Alpha',
                min: 0,
                max: 1,
                step: 0.01
            }).on('change', e => this.uCoreSphereAlpha.value = e.value)
            shellFolder.addBinding(this.params, 'corePulseAmount', {
                label: 'Pulse Amount',
                min: 0,
                max: 0.5,
                step: 0.01
            })
            shellFolder.addBinding(this.params, 'corePulseSpeed', {
                label: 'Pulse Speed',
                min: 0,
                max: 20,
                step: 0.1
            })
            shellFolder.addBinding(this.params, 'twist', {
                label: 'Twist',
                min: -1,
                max: 1,
                step: 0.001
            }).on('change', e => this.uTwist.value = e.value)
            shellFolder.addBinding(this.params, 'twistWave', {
                label: 'Twist Wave',
                min: 0,
                max: 5,
                step: 0.05
            }).on('change', e => this.uTwistWave.value = e.value)
            shellFolder.addBinding(this.params, 'twistWaveFrequency', {
                label: 'Wave Frequency',
                min: 0,
                max: 5,
                step: 0.05
            }).on('change', e => this.uTwistWaveFrequency.value = e.value)
            shellFolder.addBinding(this.params, 'twistSpeed', {
                label: 'Twist Speed',
                min: 0,
                max: 10,
                step: 0.1
            }).on('change', e => this.uTwistSpeed.value = e.value)
            shellFolder.addBinding(this.params, 'noiseThreshold', {
                label: 'Threshold',
                min: -1,
                max: 1,
                step: 0.01
            }).on('change', e => this.uNoiseThreshold.value = e.value)
        }

    }

    setSound() {

    }

    update() {
        const character = this.experience.world.character
        if (!character) return

        const beamAim = this.input.getBeamAim()
        const firing = this.input.isPressed('KeyF') || beamAim.active

        let grow
        if (firing) {
            if (this.activatedAt === null) this.activatedAt = this.time.elapsed
            if (this.releasedAt !== null) {
                const s = Math.min((this.time.elapsed - this.releasedAt) / (this.params.shrinkDuration * 1000), 1)
                const current = this.growAtRelease * (1 - s * s * s)
                const t = 1 - Math.cbrt(1 - current)
                this.activatedAt = this.time.elapsed - t * this.params.growDuration * 1000
                this.releasedAt = null
            }
            const t = Math.min((this.time.elapsed - this.activatedAt) / (this.params.growDuration * 1000), 1)
            grow = 1 - Math.pow(1 - t, 3)
            this.growAtRelease = grow
        } else {
            if (this.activatedAt === null) return
            if (this.releasedAt === null) this.releasedAt = this.time.elapsed
            const s = Math.min((this.time.elapsed - this.releasedAt) / (this.params.shrinkDuration * 1000), 1)
            if (s >= 1) {
                this.mesh.visible = false
                this.baseSphere.visible = false
                this.coreSphere.visible = false
                this.light.intensity = 0
                this.activatedAt = null
                this.releasedAt = null
                return
            }
            grow = this.growAtRelease * (1 - s * s * s)
        }

        this.origin.copy(character.model.position)
        this.origin.y += this.params.chestHeight

        if (beamAim.active) {

            const aimDistance = Math.max(beamAim.magnitude, 0.3) * this.params.maxDistance
            this.target.set(
                character.model.position.x + beamAim.x * aimDistance,
                0,
                character.model.position.z + beamAim.z * aimDistance
            )

            this.aimOrigin.set(this.target.x, character.model.position.y + 20, this.target.z)
            this.raycaster.set(this.aimOrigin, this.downDirection)
            const downHits = this.raycaster.intersectObject(this.experience.world.terrain.model, true)
            this.target.y = downHits.length > 0 ? downHits[0].point.y : character.model.position.y
        } else {
            this.raycaster.setFromCamera(this.mouseNdc, this.camera.instance)
            const hits = this.raycaster.intersectObject(this.experience.world.terrain.model, true)
            if (hits.length === 0) {
                this.mesh.visible = false
                this.baseSphere.visible = false
                this.coreSphere.visible = false
                this.light.intensity = 0
                return
            }
            this.target.copy(hits[0].point)
        }

        this.direction.subVectors(this.target, this.origin)
        const length = this.direction.length()
        if (length > this.params.maxDistance) {
            this.direction.multiplyScalar(this.params.maxDistance / length)
            this.target.copy(this.origin).add(this.direction)
        }

        this.direction.normalize()
        this.origin.addScaledVector(this.direction, this.params.startOffset)

        this.mesh.position.copy(this.origin).add(this.target).multiplyScalar(0.5)

        this.toCamera.subVectors(this.camera.instance.position, this.mesh.position)
        this.quadRight.crossVectors(this.direction, this.toCamera)
        if (this.quadRight.lengthSq() > 0.000001) {
            this.quadRight.normalize()
            this.quadNormal.crossVectors(this.quadRight, this.direction)
            this.basisMatrix.makeBasis(this.quadRight, this.direction, this.quadNormal)
            this.mesh.quaternion.setFromRotationMatrix(this.basisMatrix)
        }
        const beamLength = Math.max(this.target.distanceTo(this.origin), 0.001)
        this.mesh.scale.set(grow, beamLength, grow)
        this.uBeamLength.value = beamLength

        const offsetFraction = Math.min(this.params.shellOffset / beamLength, 1)
        this.noiseShell.scale.y = 1 - offsetFraction
        this.noiseShell.position.y = offsetFraction * 0.5

        if (this.releasedAt === null && grow >= 1
            && this.time.elapsed - this.lastCleanseAt >= this.params.cleanseInterval * 1000) {
            const corruption = this.experience.world.corruption
            if (corruption) {
                const spacing = this.params.cleanseRadius * 0.7
                for (let d = 0; d < beamLength; d += spacing) {
                    this.cleansePoint.copy(this.origin).addScaledVector(this.direction, d)
                    corruption.cleanse(this.cleansePoint.x, this.cleansePoint.z, this.params.cleanseRadius)
                }
                corruption.cleanse(this.target.x, this.target.z, this.params.cleanseRadius)
            }
            this.lastCleanseAt = this.time.elapsed
        }

        this.baseSphere.position.copy(this.origin)
        this.baseSphere.quaternion.copy(this.mesh.quaternion)
        this.baseSphere.scale.setScalar(this.params.baseSphereSize * grow)
        this.baseSphere.visible = true

        const corePulse = 1 + Math.sin(this.time.elapsed * 0.001 * this.params.corePulseSpeed) * this.params.corePulseAmount
        this.coreSphere.position.copy(this.origin)
        this.coreSphere.scale.setScalar(this.params.coreSphereSize * corePulse * grow)
        this.coreSphere.visible = true

        this.light.position.copy(this.target)
        this.light.position.y += 0.5
        this.light.intensity = this.params.lightIntensity * grow

        this.mesh.visible = true
    }
}
