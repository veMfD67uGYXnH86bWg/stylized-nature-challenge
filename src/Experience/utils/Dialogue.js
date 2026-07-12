import Experience from '../Experience.js'

export default class Dialogue {
    constructor() {
        this.experience = new Experience()

        this.isOpen = false
        this.lines = []
        this.lineIndex = 0
        this.onComplete = null

        this.setBox()

        window.addEventListener('keydown', (event) => {
            if (this.isOpen && event.code === 'KeyE') this.next()
        })

        window.addEventListener('pointerdown', () => {
            if (this.isOpen && performance.now() - this.openedAt > 200) this.next()
        })
    }

    setBox() {
        this.box = document.createElement('div')
        this.box.classList.add('dialogue-box')
        this.box.style.display = 'none'

        this.speakerElement = document.createElement('div')
        this.speakerElement.classList.add('dialogue-speaker')
        this.textElement = document.createElement('div')
        this.textElement.classList.add('dialogue-text')

        this.box.appendChild(this.speakerElement)
        this.box.appendChild(this.textElement)
        document.body.appendChild(this.box)
    }

    open({speaker = '', lines, onComplete = null}) {
        this.isOpen = true
        this.openedAt = performance.now()
        this.lines = lines
        this.lineIndex = 0
        this.onComplete = onComplete

        this.speakerElement.textContent = speaker
        this.textElement.textContent = this.lines[0]
        this.box.style.display = 'block'
    }

    next() {
        this.lineIndex++
        if (this.lineIndex < this.lines.length) {
            this.textElement.textContent = this.lines[this.lineIndex]
        } else {
            this.close()
        }
    }

    close() {
        this.isOpen = false
        this.box.style.display = 'none'
        if (this.onComplete) {
            const callback = this.onComplete
            this.onComplete = null
            callback()
        }
    }
}