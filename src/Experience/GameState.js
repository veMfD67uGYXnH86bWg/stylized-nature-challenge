import EventEmitter from './utils/EventEmitter.js'
import Experience from './Experience.js'

export default class GameState extends EventEmitter {
    constructor() {
        super()
        this.experience = new Experience()
        this.debug = this.experience.debug

        // 0 = no beam, 1 = the dragon's gift, 2-4 = mini-quest upgrades.
        // Corruption tiers run 1-3, so level 3 already cleanses everything:
        // reaching maxBeamLevel is the endgame beat, not a stronger beam
        this.beamLevel = 0
        this.maxBeamLevel = 4
        this.isCredits = false

        this.setDebug()
    }

    setCredits(value) {
        this.isCredits = value
    }

    setBeamLevel(level) {
        level = Math.min(level, this.maxBeamLevel)
        if (level === this.beamLevel) return
        this.beamLevel = level
        this.trigger('beamLevelChanged', [level])

        // placeholder ending: hitting max flips credits on (MusicManager already
        // reacts). Swap this for the real ending sequence when it exists
        if (level >= this.maxBeamLevel) this.setCredits(true)
    }

    grantBeam() {
        if (this.beamLevel === 0) this.setBeamLevel(1)
    }

    hasBeam() {
        return this.beamLevel > 0
    }

    // firing permission: gameplay needs the dragon's gift, but with debug active
    // the beam always works so shader/cleanse iteration never needs the dialogue
    canFire() {
        return this.hasBeam() || this.debug.active
    }

    // what tier this beam cleanses. In debug at level 0 the beam still fires -
    // treat it as tier 1 (not max) so the resist gating stays testable; use the
    // Upgrade button to audition higher tiers
    getCleanseLevel() {
        if (this.debug.active) return Math.max(this.beamLevel, 1)
        return this.beamLevel
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
