import * as THREE from 'three/webgpu'
import {positionLocal, normalLocal, color, uniform} from 'three/tsl'

export default class Outline {
    constructor({thickness = 1, outlineColor = '#000000'} = {}) {
        this.uThickness = uniform(thickness)

        this.material = new THREE.MeshBasicNodeMaterial({side: THREE.BackSide})
        this.material.colorNode = color(outlineColor)
        this.material.positionNode = positionLocal.add(normalLocal.mul(this.uThickness))
    }

    add(object) {
        const meshes = []
        object.traverse(child => {
            if (child.isMesh) meshes.push(child)
        })

        meshes.forEach(mesh => {
            let shell
            if (mesh.isSkinnedMesh) {
                shell = new THREE.SkinnedMesh(mesh.geometry, this.material)
                shell.bind(mesh.skeleton, mesh.bindMatrix)
            } else {
                shell = new THREE.Mesh(mesh.geometry, this.material)
            }
            shell.castShadow = false
            shell.receiveShadow = false
            shell.userData.isShell = true   // so other passes skip it
            mesh.add(shell)
        })

        return this
    }
}
