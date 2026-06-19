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
                'textures/environmentMap/nz.jpg'
            ]
    },
    {
        name: 'characterModel',
        type: 'gltfModel',
        path: 'models/Character/character.glb'
    },
    {
        name: 'terrainModel',
        type: 'gltfModel',
        path: 'models/Terrain/test2.glb'
    },
    {
        name: 'grassColorTexture',
        type: 'texture',
        path: 'textures/grass.jpg'
    },
    {
        name: 'dirtColorTexture',
        type: 'texture',
        path: 'textures/dirt.jpg'
    },
    {
        name: 'waterColorTexture',
        type: 'texture',
        path: 'textures/water.jpg'
    },
    // {
    //     name: 'grassNormalTexture',
    //     type: 'texture',
    //     path: 'textures/grass/normal.png'
    // },
    // {
    //     name: 'memeColorTexture',
    //     type: 'texture',
    //     path: 'textures/meme/meme.jpg'
    // },

]