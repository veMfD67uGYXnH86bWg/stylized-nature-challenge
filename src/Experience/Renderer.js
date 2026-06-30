import * as THREE from 'three/webgpu'
import Experience from './Experience.js'
import {Fn, luminance, mix, pass, pow, uniform, vec3} from 'three/tsl'
import {bloom} from 'three/addons/tsl/display/BloomNode.js'
import {pixelationPass} from 'three/addons/tsl/display/PixelationPassNode.js'

const toneMappingOptions = {
    None: THREE.NoToneMapping,
    Linear: THREE.LinearToneMapping,
    Reinhard: THREE.ReinhardToneMapping,
    Cineon: THREE.CineonToneMapping,
    ACESFilmic: THREE.ACESFilmicToneMapping,
    AgX: THREE.AgXToneMapping,
    Neutral: THREE.NeutralToneMapping
}

export default class Renderer {
    constructor() {
        this.experience = new Experience()
        this.canvas = this.experience.canvas
        this.sizes = this.experience.sizes
        this.scene = this.experience.scene
        this.camera = this.experience.camera
        this.debug = this.experience.debug
        this.params = {
            exposure: 1.75
        }

        if (this.debug.active) {
            this.rendererFolder = this.debug.ui.addFolder({title: 'Renderer', expanded: false})
        }

        this.setInstance()
    }

    setInstance() {
        this.instance = new THREE.WebGPURenderer({
            canvas: this.canvas,
            antialias: true
        })

        this.instance.toneMapping = THREE.CineonToneMapping
        this.instance.toneMappingExposure = this.params.exposure

        this.instance.setClearColor('#211d20')
        this.instance.setSize(this.sizes.width, this.sizes.height)
        this.instance.setPixelRatio(this.sizes.pixelRatio)

        this.instance.shadowMap.enabled = true
        this.instance.shadowMap.type = THREE.PCFSoftShadowMap

        // Post Processing
        // this.pixelParams = {
        //     pixelSize: uniform(4),
        //     normalEdgeStrength: uniform(0.3),
        //     depthEdgeStrength: uniform(0.4),
        //     pixelAlignedPanning: true
        // }
        // this.bloomParams = {
        //     threshold: 0,
        //     strength: 0,
        //     radius: 0,
        // }

        // this.gradeParams = {
        //     lift: {x: 0, y: 0, z: 0.02},
        //     gamma: {x: 1, y: 1, z: 1},
        //     gain: {x: 1, y: 1, z: 1},
        //     saturation: 0.85,
        // }
        //
        // const uLift = uniform(new THREE.Vector3(
        //     this.gradeParams.lift.x, this.gradeParams.lift.y, this.gradeParams.lift.z
        // ))
        // const uGamma = uniform(new THREE.Vector3(
        //     this.gradeParams.gamma.x, this.gradeParams.gamma.y, this.gradeParams.gamma.z
        // ))
        // const uGain = uniform(new THREE.Vector3(
        //     this.gradeParams.gain.x, this.gradeParams.gain.y, this.gradeParams.gain.z
        // ))
        // const uSaturation = uniform(this.gradeParams.saturation)
        //
        // const applyGrade = Fn(([color]) => {
        //     let c = color.rgb
        //
        //     c = c.mul(uGain)
        //     c = pow(c.max(0.0001), uGamma.reciprocal())
        //     c = c.add(uLift.mul(c.oneMinus()))
        //
        //     const gray = vec3(luminance(c))
        //     c = mix(gray, c, uSaturation)
        //
        //     return c
        // })

        // this.renderPipeline = new THREE.RenderPipeline(this.instance)
        //
        // const scenePass = pass(this.scene, this.camera.instance)
        // const scenePassColor = scenePass.getTextureNode()
        // const bloomPass = bloom(scenePassColor)
        // bloomPass.strength.value = this.bloomParams.strength
        // this.renderPipeline.outputNode = applyGrade(scenePassColor.add(bloomPass))
        // this.renderPipeline.outputNode = scenePassColor.add(bloomPass)

        /* // Pixel Pass

        const pixelPass = pixelationPass(
            this.scene,
            this.camera.instance,
            this.pixelParams.pixelSize,
            this.pixelParams.normalEdgeStrength,
            this.pixelParams.depthEdgeStrength
        )
        const bloomPass = bloom(pixelPass)

        this.renderPipeline.outputNode = pixelPass
        this.renderPipeline.outputNode = pixelPass.add(bloomPass)*/

        if (this.debug.active) {
            this.rendererFolder.addBlade({
                view: 'list',
                label: 'Tone Mapping',
                options: [
                    {text: 'None', value: toneMappingOptions.None},
                    {text: 'Linear', value: toneMappingOptions.Linear},
                    {text: 'Reinhard', value: toneMappingOptions.Reinhard},
                    {text: 'Cineon', value: toneMappingOptions.Cineon},
                    {text: 'ACESFilmic', value: toneMappingOptions.ACESFilmic},
                    {text: 'AgX', value: toneMappingOptions.AgX},
                    {text: 'Neutral', value: toneMappingOptions.Neutral},
                ],
                value: toneMappingOptions.Cineon,
            }).on('change', (e) => {
                this.instance.toneMapping = e.value
            })
            this.rendererFolder.addBinding(this.params, 'exposure', {
                label: 'Exposure',
                min: 0,
                max: 5,
                step: 0.05,
            }).on('change', (e) => {
                this.instance.toneMappingExposure = e.value
            })
            // this.renderPipelineFolder = this.rendererFolder.addFolder({title: 'Post Processing'})

            /* // Pixel Pass Debug
            this.renderPipelineFolder.addBinding(this.pixelParams.pixelSize, 'value', {
                label: 'Pixel Size',
                min: 0,
                max: 10,
                step: 1,
            })*/

            // this.renderPipelineFolder.addBinding(this.bloomParams, 'strength', {
            //     label: 'Bloom Strength',
            //     min: 0,
            //     max: 3,
            //     step: 0.01,
            // }).on('change', (e) => {
            //     bloomPass.strength.value = e.value
            // })
            // this.renderPipelineFolder.addBinding(this.bloomParams, 'threshold', {
            //     label: 'Bloom Threshold',
            //     min: 0,
            //     max: 3,
            //     step: 0.01,
            // }).on('change', (e) => {
            //     bloomPass.threshold.value = e.value
            // })
            // this.renderPipelineFolder.addBinding(this.bloomParams, 'radius', {
            //     label: 'Bloom Radius',
            //     min: 0,
            //     max: 3,
            //     step: 0.01,
            // }).on('change', (e) => {
            //     bloomPass.radius.value = e.value
            // })
            //
            // this.gradeFolder = this.rendererFolder.addFolder({title: 'Color Grade'})
            // this.gradeFolder.addBinding(this.gradeParams, 'lift', {
            //     label: 'Lift (Shadows)',
            //     x: {min: -0.2, max: 0.2, step: 0.001},
            //     y: {min: -0.2, max: 0.2, step: 0.001},
            //     z: {min: -0.2, max: 0.2, step: 0.001},
            // }).on('change', () => {
            //     uLift.value.set(this.gradeParams.lift.x, this.gradeParams.lift.y, this.gradeParams.lift.z)
            // })
            // this.gradeFolder.addBinding(this.gradeParams, 'gamma', {
            //     label: 'Gamma (Midtones)',
            //     x: {min: 0.2, max: 2, step: 0.01},
            //     y: {min: 0.2, max: 2, step: 0.01},
            //     z: {min: 0.2, max: 2, step: 0.01},
            // }).on('change', () => {
            //     uGamma.value.set(this.gradeParams.gamma.x, this.gradeParams.gamma.y, this.gradeParams.gamma.z)
            // })
            // this.gradeFolder.addBinding(this.gradeParams, 'gain', {
            //     label: 'Gain (Highlights)',
            //     x: {min: 0, max: 2, step: 0.01},
            //     y: {min: 0, max: 2, step: 0.01},
            //     z: {min: 0, max: 2, step: 0.01},
            // }).on('change', () => {
            //     uGain.value.set(this.gradeParams.gain.x, this.gradeParams.gain.y, this.gradeParams.gain.z)
            // })
            // this.gradeFolder.addBinding(this.gradeParams, 'saturation', {
            //     label: 'Saturation',
            //     min: 0,
            //     max: 1.5,
            //     step: 0.01,
            // }).on('change', (e) => {
            //     uSaturation.value = e.value
            // })
        }
    }

    resize() {
        this.instance.setSize(this.sizes.width, this.sizes.height)
        this.instance.setPixelRatio(this.sizes.pixelRatio)
    }

    update() {
        this.instance.render(this.scene, this.camera.instance)
        // this.renderPipeline.render()

    }
}