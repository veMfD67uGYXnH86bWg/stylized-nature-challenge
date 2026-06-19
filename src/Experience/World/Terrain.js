import * as THREE from 'three/webgpu'
import {vertexColor, vec4, mul, texture, uv, positionWorld, uniform} from 'three/tsl'
import Experience from '../Experience.js'

export default class Terrain {
    constructor() {
        this.experience = new Experience()
        this.scene = this.experience.scene
        this.resources = this.experience.resources
        this.resource = this.resources.items.terrainModel
        this.debug = this.experience.debug

        // Debug
        if (this.debug.active) {
            this.debugFolder = this.debug.ui.addFolder(
                {
                    title: `Terrain`,
                })
        }

        this.setTextures()
        this.setModel()
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

        this.params = {tiledUvGrass: 0.09, tiledUvDirt: 0.09, tiledUvWater: 0.09}

        // tiledUV Debug
        if (this.debug.active) {
            /*Object.keys(this.params).forEach(key => {
                this.debugFolder.addBinding(this.params, key, {min: 0.01, max: 1, step: 0.01})
                    .on('change', () => {

                    })
            })*/
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

                const finalColor = this.dirtColor.mul(r).add(this.grassColor.mul(g)).add(this.waterColor.mul(b))

                const mat = new THREE.MeshStandardNodeMaterial()
                mat.colorNode = finalColor
                child.material = mat
            }
        })
    }
}