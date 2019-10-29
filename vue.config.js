const imageminMozjpeg = require('imagemin-mozjpeg');
const ImageminPlugin = require('imagemin-webpack-plugin').default;
const webpack = require('webpack');
const {
  UnusedFilesWebpackPlugin
} = require('unused-files-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const UglifyJS = require('uglify-es');
const env_vars = require('./ENV_VARS');
const webpackConfig = {
  node: {
    process: true
  },
  devtool: 'source-map',
  devServer: {
    https: true,
    disableHostCheck: true,
    host: 'localhost',
    hotOnly: true,
    port: 8080,
    writeToDisk: JSON.parse(env_vars.BUILD_TYPE) === 'mewcx',
    headers: {
      'Strict-Transport-Security': 'max-age=63072000; includeSubdomains; preload',
      'Content-Security-Policy': "default-src 'self' blob:; frame-src 'self' connect.trezor.io:443; img-src 'self' https://nft.mewapi.io data: blob: ; script-src 'unsafe-eval' 'unsafe-inline' blob: https:; style-src 'self' 'unsafe-inline' https:; object-src 'none'; connect-src *;",
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'same-origin'
    }
  },
  plugins: [
    new webpack.DefinePlugin(env_vars),
    new webpack.NormalModuleReplacementPlugin(/^any-promise$/, 'bluebird'),
    new ImageminPlugin({
      disable: process.env.NODE_ENV !== 'production',
      test: /\.(jpe?g|png|gif|svg)$/i,
      pngquant: {
        quality: '100'
      },
      plugins: [
        imageminMozjpeg({
          quality: 100,
          progressive: true
        })
      ]
    }),
    new CopyWebpackPlugin([{
      from: 'src/builds/' + JSON.parse(env_vars.BUILD_TYPE) + '/public',
      transform: function (content, filePath) {
        if (filePath.split('.').pop() === ('js' || 'JS'))
          return UglifyJS.minify(content.toString()).code;
        if (
          filePath.replace(/^.*[\\\/]/, '') === 'manifest.json' &&
          JSON.parse(env_vars.BUILD_TYPE) === 'mewcx'
        ) {
          const version = require('./package.json').version;
          const json = JSON.parse(content);
          json.version = version;
          return JSON.stringify(json, null, 2);
        }
        return content;
      }
    }])
  ],
  optimization: {
    splitChunks: {
      cacheGroups: {
        commons: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'initial'
        }
      }
    }
  }
};
if (process.env.NODE_ENV === 'production') {
  webpackConfig.plugins.push(
    new UnusedFilesWebpackPlugin({
      patterns: ['src/**/*.*'],
      failOnUnused: true,
      globOptions: {
        ignore: []
      }
    })
  );
}
const pwa = {
  name: 'MyEtherWallet',
  workboxOptions: {
    importWorkboxFrom: 'local',
    skipWaiting: true,
    clientsClaim: true,
    navigateFallback: '/index.html'
  }
};
const exportObj = {
  publicPath: process.env.ROUTER_MODE === 'history' ? '/' : './',
  configureWebpack: webpackConfig,
  lintOnSave: process.env.NODE_ENV === 'production' ? 'error' : true,
  integrity: process.env.WEBPACK_INTEGRITY === 'false' ? false : true,
  pwa: pwa
};
module.exports = exportObj;
