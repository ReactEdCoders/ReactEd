# ReactEd

Exposing the props passed down from the react parent components.

## Features

* When you hover over the component name you will see what props are being passed or if they just are being sent from the next level up.
* React/Redux Snippets for ease of development

## Usages

![Usage](images/usage.gif)

## Configuration

ReactEd requires a webpack generated bundle file to properly traverse your application.  At this time we are unable to offer support for Create-React-App.  
```json
{
  module.exports = {
    entry: './src/index.js',
    output: {
      path: path.resolve(__dirname, 'dist/'),
      filename: 'bundle.js',
      publicPath: '/dist',
    },
    mode: 'none',
}
```
**Note:** If using Webpack 4.0 or greater please change your [**mode**](https://webpack.js.org/concepts/#mode) to **none** as the default is **Production** which will minify the bundle and make our tool stop working.

## Change Log
See Change Log [here](CHANGELOG.md)

## Issues
Submit the [issues](https://github.com/ReactEdLLC/ReactEd/issues) if you find any bug or have any suggestion.

## Contribution
Fork the [repo](https://github.com/ReactEdLLC/ReactEd) and submit pull requests.