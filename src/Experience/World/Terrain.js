import * as THREE from 'three/webgpu'
import {vertexColor, vec4, mul, texture, uv, positionWorld, uniform, smoothstep} from 'three/tsl'
import Experience from '../Experience.js'

export default class Terrain {
    constructor() {
        this.experience = new Experience()
        this.scene = this.experience.scene
        this.resources = this.experience.resources
        this.resource = this.resources.items.terrainModel

        this.debug = this.experience.debug

        if (this.debug.active) {
            this.debugFolder = this.debug.ui.addFolder(
                {
                    title: `Terrain`,
                    expanded: false,
                })
        }

        this.setTextures()
        this.setModel()

        console.log('Loaded Terrain')
    }

    setWrapColorSpace(texture) {
        texture.wrapS = THREE.RepeatWrapping
        texture.wrapT = THREE.RepeatWrapping
        texture.colorSpace = THREE.SRGBColorSpace
    }

    createTexture(number, textureName) {
        const u = uniform(number)
        const tiling = positionWorld.xz.mul(u)
        this.setWrapColorSpace(this.resources.items[`${textureName}ColorTexture`])
        return [u, tiling, texture(this.resources.items[`${textureName}ColorTexture`], tiling)]
    }

    setTextures() {
        [this.tilingUniformGrass, this.tiledUvGrass, this.grassColor] = this.createTexture(0.09, 'grass');
        [this.tilingUniformDirt, this.tiledUvDirt, this.dirtColor] = this.createTexture(0.09, 'dirt');
        [this.tilingUniformWater, this.tiledUvWater, this.waterColor] = this.createTexture(0.09, 'water');

        this.params = {tiledUvGrass: 0.09, tiledUvDirt: 0.09, tiledUvWater: 0.09, edgeSoftness: 0.05}
        this.uEdgeSoftness = uniform(this.params.edgeSoftness)

        if (this.debug.active) {
            this.debugFolder.addBinding(this.params, 'tiledUvGrass', {
                min: 0.01,
                max: 0.3,
                step: 0.01,
            }).on('change', () => {
                this.tilingUniformGrass.value = this.params.tiledUvGrass
            })
            this.debugFolder.addBinding(this.params, 'tiledUvDirt', {
                min: 0.01,
                max: 0.3,
                step: 0.01,
            }).on('change', () => {
                this.tilingUniformDirt.value = this.params.tiledUvDirt
            })
            this.debugFolder.addBinding(this.params, 'tiledUvWater', {
                min: 0.01,
                max: 0.3,
                step: 0.01
            }).on('change', () => {
                this.tilingUniformWater.value = this.params.tiledUvWater
            })
            this.debugFolder.addBinding(this.params, 'edgeSoftness', {
                min: 0.001,
                max: 0.5,
                step: 0.001
            }).on('change', () => {
                this.uEdgeSoftness.value = this.params.edgeSoftness
            })
        }
    }

    setModel() {
        this.model = this.resource.scene
        this.model.position.set(0, 0, 0)
        this.scene.add(this.model)

        this.model.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                child.receiveShadow = true
                const r = vertexColor().r
                const g = vertexColor().g
                const b = vertexColor().b

                const wDirt = smoothstep(this.uEdgeSoftness.negate(), this.uEdgeSoftness, r.sub(g.max(b)))
                const wGrass = smoothstep(this.uEdgeSoftness.negate(), this.uEdgeSoftness, g.sub(r.max(b)))
                const wWater = smoothstep(this.uEdgeSoftness.negate(), this.uEdgeSoftness, b.sub(r.max(g)))
                const weightSum = wDirt.add(wGrass).add(wWater).max(0.0001)

                const finalColor = this.dirtColor.mul(wDirt)
                    .add(this.grassColor.mul(wGrass))
                    .add(this.waterColor.mul(wWater))
                    .div(weightSum)

                const mat = new THREE.MeshStandardNodeMaterial()
                mat.colorNode = finalColor
                mat.side = THREE.DoubleSide
                child.material = mat
            }
        })
    }
}