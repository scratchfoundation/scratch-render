const ScratchRender = require('../RenderWebGL');
const getMousePosition = require('./getMousePosition');

const canvas = document.getElementById('scratch-stage');
const renderer = new ScratchRender(canvas);
renderer.setLayerGroupOrdering(['group1']);

const drawableID = renderer.createDrawable('group1');
renderer.updateDrawablePosition(drawableID, [0, 0]);
renderer.updateDrawableDirectionScale(drawableID, 90, [100, 100]);

const WantedSkinType = {
    bitmap: 'bitmap',
    vector: 'vector',
    pen: 'pen'
};

const drawableID2 = renderer.createDrawable('group1');
const wantedSkin = WantedSkinType.vector;

// Bitmap (squirrel)
const image = new Image();
image.addEventListener('load', () => {
    const bitmapSkinId = renderer.createBitmapSkin(image);
    if (wantedSkin === WantedSkinType.bitmap) {
        renderer.updateDrawableSkinId(drawableID2, bitmapSkinId);
    }
});
image.crossOrigin = 'anonymous';
image.src = 'https://cdn.assets.scratch.mit.edu/internalapi/asset/7e24c99c1b853e52f8e7f9004416fa34.png/get/';

// SVG (cat 1-a)
const xhr = new XMLHttpRequest();
xhr.addEventListener('load', () => {
    const skinId = renderer.createSVGSkin(xhr.responseText);
    if (wantedSkin === WantedSkinType.vector) {
        renderer.updateDrawableSkinId(drawableID2, skinId);
    }
});
xhr.open('GET', 'https://cdn.assets.scratch.mit.edu/internalapi/asset/b7853f557e4426412e64bb3da6531a99.svg/get/');
xhr.send();

if (wantedSkin === WantedSkinType.pen) {
    const penSkinID = renderer.createPenSkin();

    renderer.updateDrawableSkinId(drawableID2, penSkinID);

    canvas.addEventListener('click', event => {
        const rect = canvas.getBoundingClientRect();

        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        renderer.penLine(penSkinID, {
            color4f: [Math.random(), Math.random(), Math.random(), 1],
            diameter: 8
        },
        x - 240, 180 - y, (Math.random() * 480) - 240, (Math.random() * 360) - 180);
    });
}

let posX = 0;
let posY = 0;
let scaleX = 100;
let scaleY = 100;
let fudgeProperty = 'posx';

const fudgeInput = document.getElementById('fudge');
const fudgePropertyInput = document.getElementById('fudgeproperty');
const fudgeMinInput = document.getElementById('fudgeMin');
const fudgeMaxInput = document.getElementById('fudgeMax');

/* eslint require-jsdoc: 0 */
const updateFudgeProperty = event => {
    fudgeProperty = event.target.value;
};

const updateFudgeMin = event => {
    fudgeInput.min = event.target.valueAsNumber;
};

const updateFudgeMax = event => {
    fudgeInput.max = event.target.valueAsNumber;
};

fudgePropertyInput.addEventListener('change', updateFudgeProperty);
fudgePropertyInput.addEventListener('init', updateFudgeProperty);

fudgeMinInput.addEventListener('change', updateFudgeMin);
fudgeMinInput.addEventListener('init', updateFudgeMin);

fudgeMaxInput.addEventListener('change', updateFudgeMax);
fudgeMaxInput.addEventListener('init', updateFudgeMax);

// Ugly hack to properly set the values of the inputs on page load,
// since they persist across reloads, at least in Firefox.
// The best ugly hacks are the ones that reduce code duplication!
fudgePropertyInput.dispatchEvent(new CustomEvent('init'));
fudgeMinInput.dispatchEvent(new CustomEvent('init'));
fudgeMaxInput.dispatchEvent(new CustomEvent('init'));
fudgeInput.dispatchEvent(new CustomEvent('init'));

const handleFudgeChanged = function (event) {
    const fudge = event.target.valueAsNumber;
    switch (fudgeProperty) {
    case 'posx':
        posX = fudge;
        renderer.updateDrawablePosition(drawableID2, [posX, posY]);
        break;
    case 'posy':
        posY = fudge;
        renderer.updateDrawablePosition(drawableID2, [posX, posY]);
        break;
    case 'direction':
        renderer.updateDrawableDirection(drawableID2, fudge);
        break;
    case 'scalex':
    case 'scaley':
    case 'scaleboth':
        if (fudgeProperty === 'scalex' || fudgeProperty === 'scaleboth') scaleX = fudge;
        if (fudgeProperty === 'scaley' || fudgeProperty === 'scaleboth') scaleY = fudge;
        renderer.updateDrawableScale(drawableID2, [scaleX, scaleY]);
        break;
    case 'color':
    case 'whirl':
    case 'fisheye':
    case 'pixelate':
    case 'mosaic':
    case 'brightness':
    case 'ghost':
        renderer.updateDrawableEffect(drawableID2, fudgeProperty, fudge);
        break;
    }
};

fudgeInput.addEventListener('input', handleFudgeChanged);
fudgeInput.addEventListener('change', handleFudgeChanged);
fudgeInput.addEventListener('init', handleFudgeChanged);

const updateStageScale = event => {
    renderer.resize(480 * event.target.valueAsNumber, 360 * event.target.valueAsNumber);
};

const stageScaleInput = document.getElementById('stage-scale');

stageScaleInput.addEventListener('input', updateStageScale);
stageScaleInput.addEventListener('change', updateStageScale);

canvas.addEventListener('mousemove', event => {
    const mousePos = getMousePosition(event, canvas);
    renderer.extractColor(mousePos.x, mousePos.y, 30);
});

canvas.addEventListener('click', event => {
    const mousePos = getMousePosition(event, canvas);
    const pickID = renderer.pick(mousePos.x, mousePos.y);
    console.log(`You clicked on ${(pickID < 0 ? 'nothing' : `ID# ${pickID}`)}`);
    if (pickID >= 0) {
        console.dir(renderer.extractDrawableScreenSpace(pickID, mousePos.x, mousePos.y));
    }
});

const drawStep = function () {
    renderer.draw();
    // renderer.getBounds(drawableID2);
    // renderer.isTouchingColor(drawableID2, [255,255,255]);
    requestAnimationFrame(drawStep);
};
drawStep();

const debugCanvas = /** @type {canvas} */ document.getElementById('debug-canvas');
renderer.setDebugCanvas(debugCanvas);
