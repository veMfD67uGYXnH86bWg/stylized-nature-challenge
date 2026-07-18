import * as THREE from 'three/webgpu'
import {uniform, positionLocal, normalLocal} from 'three/tsl'

export const RENDER_ORDER = {
    OCCLUDER: 0,
    CONTOUR: 1,
    FILL: 2,
    CHARACTER: 3,
    NON_OCCLUDER: 4,
}

export default class Silhouette {
    constructor({silhouetteColor = '#e48ce7', contourDarken = 0.55, contourThickness = 0.012} = {}) {
        this.uColor = uniform(new THREE.Color(silhouetteColor))
        this.uDarken = uniform(contourDarken)
        this.uThickness = uniform(contourThickness)

        this.fillMaterial = new THREE.MeshBasicNodeMaterial({
            side: THREE.FrontSide,
            transparent: false,
            depthWrite: false,
            depthFunc: THREE.GreaterDepth,
        })
        this.fillMaterial.colorNode = this.uColor

        this.contourMaterial = new THREE.MeshBasicNodeMaterial({
            side: THREE.BackSide,
            transparent: false,
            depthWrite: false,
            depthFunc: THREE.GreaterDepth,
        })

        this.contourMaterial.colorNode = this.uColor.mul(this.uDarken)
        this.contourMaterial.positionNode = positionLocal.add(normalLocal.mul(this.uThickness))
    }

    add(object) {
        const meshes = []
        object.traverse(child => {
            if (child.isMesh && !child.userData.isShell) meshes.push(child)
        })

        meshes.forEach(mesh => {
            this.addShell(mesh, this.contourMaterial, RENDER_ORDER.CONTOUR)
            this.addShell(mesh, this.fillMaterial, RENDER_ORDER.FILL)
        })

        return this
    }

    addShell(mesh, material, renderOrder) {
        let shell
        if (mesh.isSkinnedMesh) {
            shell = new THREE.SkinnedMesh(mesh.geometry, material)
            shell.bind(mesh.skeleton, mesh.bindMatrix)
        } else {
            shell = new THREE.Mesh(mesh.geometry, material)
        }
        shell.castShadow = false
        shell.receiveShadow = false
        shell.userData.isShell = true
        shell.renderOrder = renderOrder
        mesh.add(shell)
        return shell
    }
}
