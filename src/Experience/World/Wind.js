import * as THREE from 'three/webgpu'
import {uniform, vec3, mul, add, time, mx_noise_float} from 'three/tsl'


let instance = null

export default function getWind(speed = 2.0, strength = -0.7, tiling = new THREE.Vector3(0.2, 0.0, 0.2)) {
    if (instance) return instance

    const params = {
        speed: speed,
        strength: strength,
        tiling: tiling,
    }

    const uSpeed = uniform(params.speed)
    const uStrength = uniform(params.strength)
    const uTiling = uniform(params.tiling.clone())

    const sampleWave = (worldPos) => {
        const scroll = add(worldPos, vec3(0, 0, mul(uSpeed, time)))
        const tiled = mul(scroll, uTiling)
        return mx_noise_float(tiled).clamp(0, 1).mul(uStrength)
    }

    const setupDebug = (folder) => {
        folder.addBinding(params, 'speed', {label: 'Wave Speed', min: 0, max: 10, step: 0.1})
            .on('change', e => uSpeed.value = e.value)
        folder.addBinding(params, 'strength', {label: 'Wave Strength', min: -2, max: 2, step: 0.01})
            .on('change', e => uStrength.value = e.value)
        folder.addBinding(params, 'tiling', {
            label: 'Wind Tiling',
            x: {min: 0.01, max: 2, step: 0.01},
            y: {min: 0.01, max: 2, step: 0.01},
            z: {min: 0.01, max: 2, step: 0.01},
        }).on('change', () => {
            uTiling.value.set(
                params.tiling.x,
                params.tiling.y,
                params.tiling.z,
            )
        })
        return folder
    }

    instance = {params, uSpeed, uStrength, uTiling, sampleWave, setupDebug}
    return instance
}
