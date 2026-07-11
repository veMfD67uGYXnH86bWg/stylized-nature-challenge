import Experience from './Experience.js'

export default class GodRays {
    constructor() {
        this.experience = new Experience()
        this.scene = this.experience.scene
        this.world = this.experience.world
        this.debug = this.experience.debug


        this.setModel()
    }

    setModel() {


        // this.scene.add(this.model)
    }
}