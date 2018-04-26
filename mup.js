module.exports = {
  servers: {
    one: {
      host: '128.199.195.126',
      username: 'root',
      // pem: "/home/rabbit/Downloads/phal-pos.pem"
      password: 'babyface10'
      // or leave blank for authenticate from ssh-agent
    }
  },

  meteor: {
    name: 'Pos',
    path: '../pos-ls',
    servers: {
      one: {}
    },
    buildOptions: {
      serverOnly: true,
    },
    env: {
      ROOT_URL: 'http://128.199.195.126/',
      MONGO_URL: 'mongodb://localhost/pos'
    },
    dockerImage: 'abernix/meteord:base',
    deployCheckWaitTime: 60
  },

  mongo: {
    oplog: true,
    port: 27017,
    servers: {
      one: {},
    },
  },
};
