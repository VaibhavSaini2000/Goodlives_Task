const config={
    production :{
        SECRET: process.env.SECRET_KEY,
        DATABASE: process.env.MONGODB_URI
    },
    default : {
        SECRET: process.env.SECRET_KEY,
        DATABASE: 'mongodb://localhost:27017/Goodlives'
    }
}


exports.get = function get(env){
    return config[env] || config.default
}