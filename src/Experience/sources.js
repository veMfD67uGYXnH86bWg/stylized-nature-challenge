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

    // NOISE
    {
        name: 'noiseTexture',
        type: 'texture',
        path: 'textures/noise.png',
    },

    // WALLS
    {
        name: 'wallModel',
        type: 'gltfModel',
        path: 'models/wall.glb',
    },
    {
        name: 'wallTexture',
        type: 'texture',
        path: 'textures/wall.png',
    },
    {
        name: 'wallNormalTexture',
        type: 'texture',
        path: 'textures/wallNormal.png',
    },
    {
        name: 'wallsPositionModel',
        type: 'gltfModel',
        path: 'models/terrainWalls.glb',
    },
    {
        name: 'wallsCollisionModel',
        type: 'gltfModel',
        path: 'models/wallsCollision.glb',
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
    {
        name: 'step1Sound',
        type: 'audio',
        path: 'sounds/step1.ogg',
    },
    {
        name: 'step2Sound',
        type: 'audio',
        path: 'sounds/step2.ogg',
    },
    {
        name: 'step3Sound',
        type: 'audio',
        path: 'sounds/step3.ogg',
    },
    {
        name: 'step4Sound',
        type: 'audio',
        path: 'sounds/step4.ogg',
    },
    {
        name: 'step5Sound',
        type: 'audio',
        path: 'sounds/step5.ogg',
    },
    {
        name: 'step6Sound',
        type: 'audio',
        path: 'sounds/step6.ogg',
    },
    {
        name: 'step7Sound',
        type: 'audio',
        path: 'sounds/step7.ogg',
    },
    // {
    //     name: 'dogBarkSound',
    //     type: 'audio',
    //     path: 'sounds/dogBark.ogg',
    // },

    // SONGS
    {
        name: 'rotatingSong1',
        type: 'audio',
        path: 'sounds/song_dark_fantasy.ogg',
    },
    {
        name: 'rotatingSong2',
        type: 'audio',
        path: 'sounds/song_dark_liminal_void.ogg',
    },
    {
        name: 'dragonSong',
        type: 'audio',
        path: 'sounds/song_oblivion_like.ogg',
    },
    {
        name: 'creditsSong',
        type: 'audio',
        path: 'sounds/song_relaxing_morning.ogg',
    },
    {
        name: 'healthyPatchSong',
        type: 'audio',
        path: 'sounds/song_skyrim_like.ogg',
    },

]