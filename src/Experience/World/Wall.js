import * as THREE from 'three/webgpu'
import {texture} from 'three/tsl'
import Experience from '../Experience.js'

export default class Wall {
    constructor() {
        this.experience = new Experience()
        this.scene = this.experience.scene
        this.resources = this.experience.resources
        this.debug = this.experience.debug
        this.colliders = this.experience.world.colliders

        if (this.debug.active) {
            this.debugFolder = this.debug.ui.addFolder({
                title: 'Wall',
                expanded: false,
            })
        }

        this.setModel()
        this.setCollision()

        console.log('Loaded Wall')
    }

    setModel() {
        let wallGeometry = null
        this.resources.items.wallModel.scene.traverse((child) => {
            if (child.isMesh && !wallGeometry) {
                child.updateWorldMatrix(true, false)
                const localMatrix = child.matrixWorld.clone()
                localMatrix.setPosition(0, 0, 0)
                wallGeometry = child.geometry.clone()
                wallGeometry.applyMatrix4(localMatrix)
            }
        })

        const wallTexture = this.resources.items.wallTexture
        const wallNormalTexture = this.resources.items.wallNormalTexture
        wallTexture.colorSpace = THREE.SRGBColorSpace
        wallTexture.flipY = false

        this.material = new THREE.MeshStandardNodeMaterial()
        this.material.colorNode = texture(wallTexture)
        this.material.normalsNode = wallNormalTexture

        // this.experience.world.corruption?.applyTo(this.material)

        const placements = []
        this.resources.items.wallsPositionModel.scene.traverse((obj) => {
            if (obj.name.startsWith('wall')) {
                obj.updateWorldMatrix(true, false)
                placements.push({
                    position: obj.getWorldPosition(new THREE.Vector3()),
                    quaternion: obj.getWorldQuaternion(new THREE.Quaternion()),
                    scale: obj.getWorldScale(new THREE.Vector3()),
                })
            }
        })

        this.mesh = new THREE.InstancedMesh(wallGeometry, this.material, placements.length)
        const dummy = new THREE.Object3D()
        placements.forEach((placement, i) => {
            dummy.position.copy(placement.position)
            dummy.quaternion.copy(placement.quaternion)
            dummy.scale.copy(placement.scale)
            dummy.updateMatrix()
            this.mesh.setMatrixAt(i, dummy.matrix)
        })
        this.mesh.instanceMatrix.needsUpdate = true
        this.mesh.castShadow = true
        this.mesh.receiveShadow = true
        this.scene.add(this.mesh)

        console.log(`Loaded ${placements.length} walls`)
    }

    setCollision() {
        this.resources.items.wallsCollisionModel.scene.traverse((child) => {
            if (child.isMesh) {
                this.boundingBox = new THREE.Box3()
                this.boundingBox.setFromObject(child)
                this.colliders.push(this.boundingBox)
            }
        })
    }
}
