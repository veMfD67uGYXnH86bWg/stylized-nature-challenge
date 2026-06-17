import Experience from '../Experience.js'
import Environment from './Environment.js'
import Floor from './Floor.js'
import Character from './Character.js'
import Shapes from './Shapes.js'
import * as THREE from 'three/webgpu'

export default class World {
    constructor() {
        this.experience = new Experience()
        this.scene = this.experience.scene
        this.resources = this.experience.resources


        // Wait for resources
        this.resources.on('ready', () => {
            // Setup
            this.floor = new Floor()
            // this.meme = new Meme()
            this.environment = new Environment()

            this.shapes = []
            this.shapes.push(new Shapes({
                shape: 'sphere',
                color: 0xff0000,
                position: new THREE.Vector3(-2, 0.5, 2)
            }).boundingBox)
            this.shapes.push(new Shapes({
                shape: 'box',
                color: 0xffff00,
                position: new THREE.Vector3(-2, 0.5, -2)
            }).boundingBox)
            this.shapes.push(new Shapes({
                shape: 'torus',
                color: 0xff00ff,
                position: new THREE.Vector3(-2, 0.5, -6)
            }).boundingBox)

            this.character = new Character()
        })
    }

    update() {
        if (this.character)
            this.character.update()
    }
}