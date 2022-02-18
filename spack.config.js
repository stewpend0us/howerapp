const { config } = require('@swc/core/spack')


module.exports = config({
    entry: {
        main: __dirname + '/src/js/main.js',
    },
    output: {
        path: __dirname + '/build/js/'
    },
    options: {
        minify: true,
        jsc: {
            minify: {
                compress: true,
            }
        }
    }
});