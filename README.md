## scratch-render

## **⚠️ NOTICE: Repository Migration to Mono-Repo ⚠️**

The Scratch Team has migrated the `scratch-render` module into a new mono-repo,
[`scratch-editor`](https://github.com/scratchfoundation/scratch-editor). This independent `scratch-render` repository
**will be archived**. Any new issues or pull requests should be opened in the mono-repo.

The new mono-repo version of `scratch-render` is published to the NPM registry as
[`@scratch/scratch-render`](https://www.npmjs.com/package/@scratch/scratch-render).

**Contributors:**

* I would like to thank all past contributors for their work on this repository.
* If you are aware of valuable issues or pull requests, please consider re-opening them in the mono-repo. If you do
  so, please link the new issue or pull request to the original one in this repository to help others find it and to
  reduce the chance of duplicate work.
* We apologize for the inconvenience and greatly appreciate your help with this transition!

For more information, see the [`scratch-editor` repository on GitHub](https://github.com/scratchfoundation/scratch-editor).

## Overview

#### WebGL-based rendering engine for Scratch 3.0

## Installation
```bash
npm install https://github.com/scratchfoundation/scratch-render.git
```

## Setup
```html
<!DOCTYPE html>
<html lang="en">
    <head>
        <meta charset="UTF-8">
        <title>Scratch WebGL rendering demo</title>
    </head>

    <body>
        <canvas id="myStage"></canvas>
        <canvas id="myDebug"></canvas>
    </body>
</html>
```

```js
var canvas = document.getElementById('myStage');
var debug = document.getElementById('myDebug');

// Instantiate the renderer
var renderer = new require('scratch-render')(canvas);

// Connect to debug canvas
renderer.setDebugCanvas(debug);

// Start drawing
function drawStep() {
    renderer.draw();
    requestAnimationFrame(drawStep);
}
drawStep();

// Connect to worker (see "playground" example)
var worker = new Worker('worker.js');
renderer.connectWorker(worker);
```

## Standalone Build
```bash
npm run build
```

```html
<script src="/path/to/render.js"></script>
<script>
    var renderer = new window.RenderWebGLLocal();
    // do things
</script>
```

## Testing
```bash
npm test
```

## Donate
We provide [Scratch](https://scratch.mit.edu) free of charge, and want to keep it that way! Please consider making a [donation](https://secure.donationpay.org/scratchfoundation/) to support our continued engineering, design, community, and resource development efforts. Donations of any size are appreciated. Thank you!

## Committing

This project uses [semantic release](https://github.com/semantic-release/semantic-release) to ensure version bumps
follow semver so that projects depending on it don't break unexpectedly.

In order to automatically determine version updates, semantic release expects commit messages to follow the
[conventional-changelog](https://github.com/bcoe/conventional-changelog-standard/blob/master/convention.md)
specification.

You can use the [commitizen CLI](https://github.com/commitizen/cz-cli) to make commits formatted in this way:

```bash
npm install -g commitizen@latest cz-conventional-changelog@latest
```

Now you're ready to make commits using `git cz`.
