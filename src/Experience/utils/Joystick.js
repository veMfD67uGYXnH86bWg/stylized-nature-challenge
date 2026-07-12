export default class Joystick {
    constructor({right = false} = {}) {
        this.right = right
        this.vector = {x: 0, y: 0}
        this.magnitude = 0
        this.active = false

        this.deadzone = 0.15
        this.pointerId = null

        this.setElements()
        this.setEvents()
    }

    setElements() {
        this.base = document.createElement('div')
        this.base.classList.add('joystick-base')
        if (this.right) this.base.classList.add('joystick-right')

        this.knob = document.createElement('div')
        this.knob.classList.add('joystick-knob')

        this.base.appendChild(this.knob)
        document.body.appendChild(this.base)
    }

    setEvents() {
        this.base.addEventListener('pointerdown', (e) => {
            this.pointerId = e.pointerId
            this.base.setPointerCapture(e.pointerId)
            this.active = true
            this.handleMove(e)
        })

        this.base.addEventListener('pointermove', (e) => {
            if (!this.active || e.pointerId !== this.pointerId) return
            this.handleMove(e)
        })

        const end = (e) => {
            if (e.pointerId !== this.pointerId) return
            this.active = false
            this.pointerId = null
            this.vector.x = 0
            this.vector.y = 0
            this.magnitude = 0
            this.knob.style.transform = 'translate(-50%, -50%)'
        }
        this.base.addEventListener('pointerup', end)
        this.base.addEventListener('pointercancel', end)
    }

    handleMove(e) {
        const rect = this.base.getBoundingClientRect()
        const radius = rect.width * 0.5

        // offset from the base center, clamped to the base circle
        let dx = e.clientX - (rect.left + radius)
        let dy = e.clientY - (rect.top + radius)
        const dist = Math.hypot(dx, dy)
        if (dist > radius) {
            dx = dx / dist * radius
            dy = dy / dist * radius
        }

        this.knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`

        const nx = dx / radius
        const ny = dy / radius
        this.magnitude = Math.hypot(nx, ny)

        if (this.magnitude < this.deadzone) {
            this.vector.x = 0
            this.vector.y = 0
        } else {
            this.vector.x = nx
            this.vector.y = ny
        }
    }
}
