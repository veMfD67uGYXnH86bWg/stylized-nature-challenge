import Experience from './Experience.js'

const fullscreenIcon = `
<svg viewBox="0 0 24 24" fill="currentColor" width="1em" height="1em">
    <path d="M16 3H22V9H20V5H16V3ZM2 3H8V5H4V9H2V3ZM20 19V15H22V21H16V19H20ZM4 19H8V21H2V15H4V19Z"></path>
</svg>`

const fullscreenExitIcon = `
<svg viewBox="0 0 24 24" fill="currentColor" width="1em" height="1em">
    <path d="M18 7H22V9H16V3H18V7ZM8 9H2V7H6V3H8V9ZM18 17V21H16V15H22V17H18ZM8 15V21H6V17H2V15H8Z"></path>
</svg>`

export default class Interface {
    constructor() {
        this.experience = new Experience()
        this.input = this.experience.input

        if (document.documentElement.requestFullscreen) {
            this.setFullscreenButton()
        }
    }

    setFullscreenButton() {
        this.fullscreenButton = document.createElement('button')
        this.fullscreenButton.classList.add('fullscreen-button')
        this.fullscreenButton.innerHTML = fullscreenIcon
        document.body.appendChild(this.fullscreenButton)

        this.fullscreenButton.addEventListener('click', () => {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen?.()
            } else {
                document.exitFullscreen?.()
            }
        })

        document.addEventListener('fullscreenchange', () => {
            this.fullscreenButton.innerHTML = document.fullscreenElement
                ? fullscreenExitIcon
                : fullscreenIcon
        })
    }
}
