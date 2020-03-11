const path = require('path');
// var HardSourceWebpackPlugin = require('hard-source-webpack-plugin');

module.exports = {
  entry: './src/client.js',
  output: {
    path: path.resolve(__dirname, './'),
    filename: 'index.js'
  },
  optimization: {
    minimize: true
  }
};