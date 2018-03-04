const webpack = require("webpack");
const ExtractTextPlugin = require("extract-text-webpack-plugin");

module.exports = function () {
    return {
        entry: "./src/index.ts",

        output: {
            filename: "bundle.js",
            path: __dirname + "/../dist"
        },

        resolve: {
            extensions: [".ts", ".js", ".json", '.scss', '.png']
        },

        module: {
            rules: [{
                test: /\.ts?$/,
                loader: "awesome-typescript-loader"
            }, {
                test: /\.modernizrrc\.json$/,
                use: [{
                    loader: "modernizr-loader"
                }, {
                    loader: "json-loader"
                }]
            }]
        }
    }
};