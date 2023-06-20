const path = require('path')

module.exports = {
  entry: './src/index.ts',
  externalsPresets: { node: true },
  output: {
    path: path.resolve(__dirname, './dist'),
    filename: 'bundle.js',
    library: '@hedgepie/apy',
    libraryTarget: 'umd',
    globalObject: 'this',
    publicPath: '',
  },
  experiments: {
    outputModule: false,
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
    fallback: {
      "stream": require.resolve("stream-browserify"),
    }
  },
  module: {
    // https://webpack.js.org/loaders/babel-loader/#root
    rules: [
      {
        test: /.m?(j|t)s$/,
        loader: 'babel-loader',
        exclude: /node_modules/,
      }
    ],
  },
  devtool: 'source-map'
}
