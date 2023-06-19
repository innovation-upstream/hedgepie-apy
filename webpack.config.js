const path = require('path')

module.exports = {
  entry: './src/index.ts',
  output: {
    path: path.resolve(__dirname, './dist'),
    filename: 'bundle.js',
  },
  experiments: {
    outputModule: true,
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
    fallback: {
      "stream": require.resolve("stream-browserify")
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
