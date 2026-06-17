import Experience from '../Experience.js'
import Environment from './Environment.js'
import Floor from './Floor.js'
// import Meme from './Meme.js'
import Character from './Character.js'

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
            this.character = new Character()
            this.environment = new Environment()

        })
    }

    update() {
        if (this.meme)
            this.meme.update()
        if (this.billboard)
            this.billboard.update()
    }
}