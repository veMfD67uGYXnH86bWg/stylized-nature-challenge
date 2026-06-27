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

    // GRASS
    {
        name: 'grassColorTexture',
        type: 'texture',
        path: 'textures/grass.jpg',
    },
    {
        name: 'grassModel',
        type: 'gltfModel',
        path: 'models/grassTilted.glb',
    },
    {
        name: 'dirtColorTexture',
        type: 'texture',
        path: 'textures/dirt.jpg',
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

    // MISC
    {
        name: 'noiseTexture',
        type: 'texture',
        path: 'textures/noise.png',
    },
]