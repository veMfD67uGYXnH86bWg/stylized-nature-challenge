import Experience from '../Experience.js'
import Environment from './Environment.js'
import Character from './Character.js'
import Shapes from './Shapes.js'
import Terrain from './Terrain.js'
import Dragon from './Dragon.js'
import Trees from './Trees.js'
import Corruption from '../shaders/Corruption.js'
import LightBeam from '../shaders/lightBeam.js'
// import Grass from './Grass.js'
import GrassShader from '../shaders/GrassShader.js'

import * as THREE from 'three/webgpu'

export default class World {
    constructor() {
        this.experience = new Experience()
        this.scene = this.experience.scene
        this.resources = this.experience.resources
        this.colliders = []

        this.resources.on('ready', () => {
            this.environment = new Environment()
            this.terrain = new Terrain()
            this.corruption = new Corruption()
            // this.grass = new Grass()
            this.grassShader = new GrassShader()
            this.character = new Character()
            this.dragon = new Dragon()
            this.trees = new Trees()
            this.lightBeam = new LightBeam()

            // this.generateShapes()

            this.setPerfDebug()
        })
    }

    setPerfDebug() {
        const debug = this.experience.debug
        if (!debug.active) return

        const renderer = this.experience.renderer.instance
        const folder = debug.ui.addFolder({title: 'Perf', expanded: false, index: 0})

        folder.addBinding({pixelRatio: this.experience.sizes.pixelRatio}, 'pixelRatio', {
            min: 0.25,
            max: 2,
            step: 0.25,
        }).on('change', e => renderer.setPixelRatio(e.value))

        folder.addBinding({shadows: true}, 'shadows').on('change', e => {
            renderer.shadowMap.enabled = e.value
            this.scene.traverse((child) => {
                if (child.isMesh) child.material.needsUpdate = true
            })
        })

        folder.addBinding({grass: true}, 'grass').on('change', e => {
            if (this.grass.mesh) this.grass.mesh.visible = e.value
        })

        folder.addBinding({trees: true}, 'trees').on('change', e => {
            if (this.trees.trunkMesh) this.trees.trunkMesh.visible = e.value
            if (this.trees.outlineMesh) this.trees.outlineMesh.visible = e.value
            if (this.trees.leafMesh) this.trees.leafMesh.visible = e.value
        })
    }

    generateShapes() {
        this.shapes = []
        this.shapes.push(new Shapes({
            shape: 'sphere',
            color: 0xff0000,
            position: new THREE.Vector3(-2, 0.5, 2)
        }).boundingBox)
        this.shapes.push(new Shapes({
            shape: 'box',
            color: 0xffff00,
            position: new THREE.Vector3(-2, 2.5, -2)
        }).boundingBox)
        this.shapes.push(new Shapes({
            shape: 'torus',
            color: 0xff00ff,
            position: new THREE.Vector3(-2, 0.5, -6)
        }).boundingBox)
    }

    update() {
        if (this.corruption)
            this.corruption.update()
        if (this.character)
            this.character.update()
        if (this.environment)
            this.environment.update()
        if (this.grass)
            this.grass.update()
        if (this.grassShader)
            this.grassShader.update()
        if (this.dragon)
            this.dragon.update()
        if (this.lightBeam)
            this.lightBeam.update()
    }
}