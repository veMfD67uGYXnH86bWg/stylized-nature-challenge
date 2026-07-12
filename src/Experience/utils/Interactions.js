import Experience from '../Experience.js'

export default class Interactions {
    constructor() {
        this.experience = new Experience()
        this.input = this.experience.input

        this.items = []
        this.current = null
        this.wasPressed = false

        this.setPrompt()
    }


    add(item) {
        item.enabled = item.enabled ?? true
        this.items.push(item)
        return item
    }

    setPrompt() {
        this.promptElement = document.createElement('div')
        this.promptElement.classList.add('interaction-prompt')
        this.promptElement.style.display = 'none'
        document.body.appendChild(this.promptElement)

        this.promptElement.addEventListener('pointerdown', () => {
            if (this.current) this.current.onInteract()
        })
    }

    update() {
        const character = this.experience.world?.character
        if (!character) return

        if (this.experience.dialogue?.isOpen) {
            this.current = null
            this.promptElement.style.display = 'none'
            return
        }

        const characterPosition = character.model.position
        this.current = null
        let nearestDistance = Infinity
        for (const item of this.items) {
            if (!item.enabled) continue
            const distance = characterPosition.distanceTo(item.target.position)
            if (distance < item.radius && distance < nearestDistance) {
                nearestDistance = distance
                this.current = item
            }
        }

        if (this.current) {
            this.promptElement.textContent = this.input.isTouch
                ? this.current.prompt
                : `E - ${this.current.prompt}`
            this.promptElement.style.display = 'block'
        } else {
            this.promptElement.style.display = 'none'
        }

        const isPressed = this.input.isPressed('KeyE')
        if (isPressed && !this.wasPressed && this.current) {
            this.current.onInteract()
        }
        this.wasPressed = isPressed
    }
}