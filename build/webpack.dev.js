const common = require("./webpack.common.js");
const merge = require("webpack-merge");
const webpack = require('webpack');

module.exports = merge(common(cssLoaderOptions, sassLoaderOptions), {
    devServer: {
        compress: true,
        port: 3004
    },
    output: {
        filename: "bundle.js",
        path: __dirname + "/../dist",
        publicPath: "/dist/"
    },
    plugins: [
        new webpack.HotModuleReplacementPlugin(),
        new webpack.WatchIgnorePlugin([
            /css\.d\.ts$/
        ]),
        new webpack.SourceMapDevToolPlugin({
            filename: null, // inline sourcemap
            test: /\.(tsx?|js)($|\?)/i // case-insensitive match for ts/js files
        })
    ]
});