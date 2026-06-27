import Experience from '../Experience.js'
import Environment from './Environment.js'
import Character from './Character.js'
import Shapes from './Shapes.js'
import Terrain from './Terrain.js'
import Grass from './Grass.js'
import Dragon from './Dragon.js'
import Trees from './Trees.js'
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
            this.grass = new Grass()
            this.character = new Character()
            this.dragon = new Dragon()
            this.trees = new Trees()

            // this.generateShapes()
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
        if (this.character)
            this.character.update()
        if (this.environment)
            this.environment.update()
        if (this.grass)
            this.grass.update()
        if (this.dragon)
            this.dragon.update()
    }
}