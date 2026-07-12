export default [
    {
        name: 'environmentMapTexture',
        type: 'cubeTexture',
        path:
            [
                'textures/environmentMap/px.jpg',
                'textures/environmentMap/nx.jpg',
                'textures/environmentMap/py.jpg',
                'textures/environmentMap/ny.jpg',
                'textures/environmentMap/pz.jpg',
                'textures/environmentMap/nz.jpg',
            ]
    },
    // CHARACTER
    {
        name: 'characterModel',
        type: 'gltfModel',
        path: 'models/character.glb',
    },

    // NPCs
    {
        name: 'dragonModel',
        type: 'gltfModel',
        path: 'models/dragonPH.glb',
    },

    // TERRAIN
    {
        name: 'terrainModel',
        type: 'gltfModel',
        path: 'models/terrain.glb',
    },
    {
        name: 'terrainSplatTexture',
        type: 'texture',
        path: 'textures/terrainSplat.png',
    },
    {
        name: 'corruptionMaskTexture',
        type: 'texture',
        path: 'textures/corruptionMask.png',
    },

    // CORRUPTION
    {
        name: 'corruptionInteriorTexture',
        type: 'texture',
        path: 'textures/corruptionInterior.png',
    },

    // GRASS
    {
        name: 'grassColorTexture',
        type: 'texture',
        path: 'textures/grass.png',
    },
    {
        name: 'grassModel',
        type: 'gltfModel',
        path: 'models/grass.glb',
    },
    {
        name: 'waterColorTexture',
        type: 'texture',
        path: 'textures/water.jpg',
    },

    // TREES
    {
        name: 'treesPositionModel',
        type: 'gltfModel',
        path: 'models/terrainTrees.glb',
    },
    {
        name: 'treeModel',
        type: 'gltfModel',
        path: 'models/tree.glb',
    },
    {
        name: 'leafModel',
        type: 'gltfModel',
        path: 'models/treeLeaves.glb',
    },
    {
        name: 'leafTexture',
        type: 'texture',
        path: 'textures/leaf.png',
    },
    // BEAM
    {
        name: 'beamMiddleTexture',
        type: 'texture',
        path: 'textures/beamMiddle.png',
    },
    {
        name: 'beamModel',
        type: 'gltfModel',
        path: 'models/lightBeam.glb',
    },

    // SOUNDS
    {
        name: 'beamStartSound',
        type: 'audio',
        path: 'sounds/beamStart.ogg',
    },
    {
        name: 'beamLoopSound',
        type: 'audio',
        path: 'sounds/beamLoop.ogg',
    },
    {
        name: 'beamEndSound',
        type: 'audio',
        path: 'sounds/beamEnd.ogg',
    },
    {
        name: 'ambientSound',
        type: 'audio',
        path: 'sounds/ambient.ogg',
    },

    // MISC
    {
        name: 'noiseTexture',
        type: 'texture',
        path: 'textures/noise.png',
    },
]