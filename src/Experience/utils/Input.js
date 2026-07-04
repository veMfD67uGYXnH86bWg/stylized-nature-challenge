import Joystick from './Joystick.js'

export default class Input {
    constructor() {
        this.keys = {}

        window.addEventListener('keydown', (e) => {
            this.keys[e.code] = true
        })
        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false
        })

        this.isTouch = window.matchMedia('(pointer: coarse)').matches
        if (this.isTouch) this.joystick = new Joystick()
    }

    isPressed(code) {
        return this.keys[code] === true
    }


    getMove() {
        if (this.joystick && this.joystick.active) {
            return {
                x: this.joystick.vector.x,
                z: this.joystick.vector.y,   // screen up (-y) = forward (-z)
                forceRun: this.joystick.magnitude > 0.9,
            }
        }

        return {
            x: (this.isPressed('KeyD') ? 1 : 0) - (this.isPressed('KeyA') ? 1 : 0),
            z: (this.isPressed('KeyS') ? 1 : 0) - (this.isPressed('KeyW') ? 1 : 0),
            forceRun: null,
        }
    }
}
