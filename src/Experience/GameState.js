import EventEmitter from './utils/EventEmitter.js'
import Experience from './Experience.js'

export default class GameState extends EventEmitter {
    constructor() {
        super()
        this.experience = new Experience()
        this.debug = this.experience.debug

        this.beamLevel = 0
        this.isCredits = false

        this.setDebug()
    }

    setCredits(value) {
        this.isCredits = value
    }

    setBeamLevel(level) {
        if (level === this.beamLevel) return
        this.beamLevel = level
        this.trigger('beamLevelChanged', [level])
    }

    grantBeam() {
        if (this.beamLevel === 0) this.setBeamLevel(1)
    }

    hasBeam() {
        return this.beamLevel > 0
    }

    setDebug() {
        if (!this.debug.active) return

        this.debugFolder = this.debug.ui.addFolder({title: 'Game State'})
        this.debugFolder.addBinding(this, 'beamLevel', {
            label: 'Beam Level',
            readonly: true,
        })
        this.debugFolder.addButton({title: 'Grant Beam (dragon)', label: 'Unlock'}).on('click', () => {
            this.grantBeam()
            this.debug.ui.refresh()
        })
        this.debugFolder.addButton({title: '+1 Beam Level', label: 'Upgrade'}).on('click', () => {
            this.setBeamLevel(this.beamLevel + 1)
            this.debug.ui.refresh()
        })
        this.debugFolder.addBinding(this, 'isCredits', {label: 'Credits'})
    }
}
