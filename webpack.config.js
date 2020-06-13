const path = require('path');
// var HardSourceWebpackPlugin = require('hard-source-webpack-plugin');

module.exports = {
  entry: './src/client.js',
  module: {
    rules: [
      {
        test: /\.worker\.js$/,
        use: { 
          loader: 'worker-loader',
          options: { inline: true, fallback: false }
        }
      }
    ]
  },
  output: {
    path: path.resolve(__dirname, './'),
    filename: 'index.js'
  },
  optimization: {
    minimize: true
  }
};