import * as THREE from 'three/webgpu'
import Experience from '../Experience.js'

export default class MusicManager {
    constructor() {
        this.experience = new Experience()
        this.resources = this.experience.resources
        this.time = this.experience.time
        this.gameState = this.experience.gameState
        this.debug = this.experience.debug

        this.params = {
            masterVolume: 0.3,
            fadeSpeed: 0.5,
            dragonRadius: 16,
            healthyRadius: 25,
        }

        this.forcedContext = null
        this.currentContext = null

        this.setTracks()
        this.setAutoplay()
        this.setDebug()
        this.setDebugVisuals()

        console.log('Loaded MusicManager')
    }

    makeTrack(bufferName, loop) {
        const audio = new THREE.Audio(this.experience.listener)
        audio.setBuffer(this.resources.items[bufferName])
        audio.setLoop(loop)
        audio.setVolume(0)
        return {audio, targetVolume: 0}
    }

    setTracks() {
        this.tracks = {
            rotating1: this.makeTrack('rotatingSong1', false),
            rotating2: this.makeTrack('rotatingSong2', false),
            dragon: this.makeTrack('dragonSong', true),
            healthy: this.makeTrack('healthyPatchSong', true),
            credits: this.makeTrack('creditsSong', true),
        }

        this.contextTrack = {
            dragon: 'dragon',
            healthy: 'healthy',
            credits: 'credits',
        }

        this.rotation = ['rotating1', 'rotating2']
        this.rotationIndex = 0

        this.rotation.forEach((key) => {
            this.tracks[key].audio.onEnded = () => {
                this.tracks[key].audio.isPlaying = false
                this.rotationIndex = (this.rotationIndex + 1) % this.rotation.length
                if (this.currentContext === 'default') this.startDefaultTrack()
            }
        })
    }

    resolveContext() {
        if (this.forcedContext) return this.forcedContext
        if (this.gameState.isCredits) return 'credits'
        if (this.nearDragon()) return 'dragon'
        if (this.inHealthyPatch()) return 'healthy'
        return 'default'
    }

    nearDragon() {
        const dragon = this.experience.world.dragon
        const character = this.experience.world.character
        if (!dragon || !character) return false
        return character.model.position.distanceTo(dragon.model.position) < this.params.dragonRadius
    }

    inHealthyPatch() {
        const grass = this.experience.world.grassShader
        const character = this.experience.world.character
        if (!grass || !character) return false

        const dx = Math.abs(character.model.position.x - grass.params.healthyCenter.x)
        const dz = Math.abs(character.model.position.z - grass.params.healthyCenter.y)
        return Math.max(dx, dz) < this.params.healthyRadius
    }

    startDefaultTrack() {
        const key = this.rotation[this.rotationIndex]
        const track = this.tracks[key]
        if (!track.audio.isPlaying) track.audio.play()
        this.setActiveTrack(key)
    }

    setActiveTrack(activeKey) {
        this.activeTrackKey = activeKey
        for (const key in this.tracks) {
            this.tracks[key].targetVolume = key === activeKey ? this.params.masterVolume : 0
        }
        const track = this.tracks[activeKey]
        if (!track.audio.isPlaying) track.audio.play()
    }

    transitionTo(context) {
        if (context === 'default') {
            this.startDefaultTrack()
        } else {
            this.setActiveTrack(this.contextTrack[context])
        }
    }

    update() {
        if (!this.experience.world?.character) return

        this.updateDebugVisuals()

        if (this.activeTrackKey) {
            this.tracks[this.activeTrackKey].targetVolume = this.params.masterVolume
        }

        const context = this.resolveContext()
        if (context !== this.currentContext) {
            this.currentContext = context
            this.transitionTo(context)
        }

        const step = this.params.fadeSpeed * this.time.delta * 0.001
        for (const key in this.tracks) {
            const track = this.tracks[key]
            const current = track.audio.getVolume()
            if (current === track.targetVolume) continue

            const next = current < track.targetVolume
                ? Math.min(current + step, track.targetVolume)
                : Math.max(current - step, track.targetVolume)
            track.audio.setVolume(next)

            if (next === 0 && track.targetVolume === 0 && track.audio.isPlaying
                && !this.rotation.includes(key)) {
                track.audio.stop()
            }
        }
    }

    setDebugVisuals() {
        if (!this.debug.active) return

        const segments = 64
        const circlePoints = []
        for (let i = 0; i <= segments; i++) {
            const a = (i / segments) * Math.PI * 2
            circlePoints.push(new THREE.Vector3(Math.cos(a), 1, Math.sin(a)))
        }

        const ringMaterial = (hex) => new THREE.LineBasicMaterial({
            color: 0xff4488,
            depthTest: false,
            depthWrite: false,
        })

        this.dragonRing = new THREE.Line(
            new THREE.BufferGeometry().setFromPoints(circlePoints),
            ringMaterial(0xff4488)
        )


        this.healthyRing = new THREE.Line(
            new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(-1, 0, -1),
                new THREE.Vector3(1, 0, -1),
                new THREE.Vector3(1, 0, 1),
                new THREE.Vector3(-1, 0, 1),
                new THREE.Vector3(-1, 0, -1),
            ]),
            ringMaterial(0x44ff88)
        )

        for (const ring of [this.dragonRing, this.healthyRing]) {
            ring.frustumCulled = false
            ring.renderOrder = 999
            this.experience.scene.add(ring)
        }

        this.debugState = this.debugState || {}
        this.debugState.showZones = true
        this.debugFolder.addBinding(this.debugState, 'showZones', {label: 'Show Zones'})
            .on('change', (e) => {
                this.dragonRing.visible = e.value
                this.healthyRing.visible = e.value
            })
    }

    updateDebugVisuals() {
        if (!this.dragonRing) return

        const dragon = this.experience.world.dragon
        if (dragon) {
            this.dragonRing.position.set(dragon.model.position.x, 0.15, dragon.model.position.z)
            this.dragonRing.scale.set(this.params.dragonRadius, 1, this.params.dragonRadius)
        }

        const grass = this.experience.world.grassShader
        if (grass) {
            this.healthyRing.position.set(grass.params.healthyCenter.x, 0.15, grass.params.healthyCenter.y)
            this.healthyRing.scale.set(this.params.healthyRadius, 1, this.params.healthyRadius)
        }
    }

    setAutoplay() {
        const start = () => {
            const context = this.experience.listener.context
            if (context.state === 'suspended') context.resume()
        }
        window.addEventListener('pointerdown', start, {once: true})
        window.addEventListener('keydown', start, {once: true})
    }

    setDebug() {
        if (!this.debug.active) return

        this.debugFolder = this.debug.ui.addFolder({title: 'Music', expanded: false})
        this.debugFolder.addBinding(this.params, 'masterVolume', {label: 'Volume', min: 0, max: 1, step: 0.01})
        this.debugFolder.addBinding(this.params, 'fadeSpeed', {label: 'Fade Speed', min: 0.05, max: 3, step: 0.05})
        this.debugFolder.addBinding(this.params, 'dragonRadius', {label: 'Dragon Radius', min: 1, max: 40, step: 0.5})
        this.debugFolder.addBinding(this.params, 'healthyRadius', {label: 'Healthy Radius', min: 1, max: 60, step: 0.5})

        this.debugState = {force: ''}
        this.debugFolder.addBinding(this.debugState, 'force', {
            label: 'Force Context',
            options: {Auto: '', Default: 'default', Dragon: 'dragon', Healthy: 'healthy', Credits: 'credits'},
        }).on('change', (e) => {
            this.forcedContext = e.value || null
        })
    }
}
