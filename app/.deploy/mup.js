module.exports = {
  servers: {
    one: {
      // TODO: set host address, username, and authentication method
      host: 'www.lisk.bike',
      username: 'root',
      pem: "~/.ssh/id_rsa"
      // password: 'server-password'
      // or neither for authenticate from ssh-agent
    }
  },

  app: {
    // TODO: change app name and path
    name: 'lisk-bike',
    path: '../',
    
    volumes: {
      '/root/lisk-bike/image-upload':'/storage/lisk-bike/'
    },

    servers: {
      one: {},
    },

    buildOptions: {
      debug: false,
      serverOnly: true,
    },

    env: {
      // TODO: Change to your app's url
      // If you are using ssl, it needs to start with https://
      ROOT_URL: 'https://www.lisk.bike',
      // MONGO_URL: 'mongodb://lisk.bike/lisk-bike',
      MONGO_URL: 'mongodb://mongodb/meteor',
      MONGO_OPLOG_URL: 'mongodb://mongodb/local',
    },

    docker: {
      // change to 'abernix/meteord:base' if your app is using Meteor 1.4 - 1.5
      image: 'abernix/meteord:node-8.11.2-base',
      // buildInstructions: [
      //   'RUN apt-get update && apt-get install -y imagemagick',
      // ],
      
    },

    // Show progress bar while uploading bundle to server
    // You might need to disable it on CI servers
    enableUploadProgressBar: true
  },

  mongo: {
    version: '3.4.1',
    servers: {
      one: {}
    }
  },

  // (Optional)
  // Use the proxy to setup ssl or to route requests to the correct
  // app when there are several apps

  proxy: {
    domains: 'www.lisk.bike',

    ssl: {
      // Enable Let's Encrypt
      letsEncryptEmail: 'mosbuma@bumos.nl',
      forceSSL: true
    }
  }
};
