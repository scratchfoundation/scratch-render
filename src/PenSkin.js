const twgl = require('twgl.js');

const RenderConstants = require('./RenderConstants');
const Skin = require('./Skin');

const Rectangle = require('./Rectangle');
const ShaderManager = require('./ShaderManager');

/**
 * Attributes to use when drawing with the pen
 * @typedef {object} PenSkin#PenAttributes
 * @property {number} [diameter] - The size (diameter) of the pen.
 * @property {Array<number>} [color4f] - The pen color as an array of [r,g,b,a], each component in the range [0,1].
 */

/**
 * The pen attributes to use when unspecified.
 * @type {PenSkin#PenAttributes}
 * @memberof PenSkin
 * @private
 * @const
 */
const DefaultPenAttributes = {
    color4f: [0, 0, 1, 1],
    diameter: 1
};


class PenSkin extends Skin {
    /**
     * Create a Skin which implements a Scratch pen layer.
     * @param {int} id - The unique ID for this Skin.
     * @param {RenderWebGL} renderer - The renderer which will use this Skin.
     * @extends Skin
     * @listens RenderWebGL#event:NativeSizeChanged
     */
    constructor (id, renderer) {
        super(id);

        /**
         * @private
         * @type {RenderWebGL}
         */
        this._renderer = renderer;

        /** @type {HTMLCanvasElement} */
        this._canvas = document.createElement('canvas');

        /** @type {WebGLTexture} */
        this._texture = null;

        /** @type {WebGLTexture} */
        this._exportTexture = null;

        /** @type {WebGLFramebuffer} */
        this._framebuffer = null;

        /** @type {WebGLFramebuffer} */
        this._silhouetteBuffer = null;

        /** @type {boolean} */
        this._silhouetteDirty = false;

        this.onNativeSizeChanged = this.onNativeSizeChanged.bind(this);
        this._renderer.on(RenderConstants.Events.NativeSizeChanged, this.onNativeSizeChanged);

        this._setCanvasSize(renderer.getNativeSize());
    }

    /**
     * Dispose of this object. Do not use it after calling this method.
     */
    dispose () {
        this._renderer.removeListener(RenderConstants.Events.NativeSizeChanged, this.onNativeSizeChanged);
        this._renderer.gl.deleteTexture(this._texture);
        this._texture = null;
        super.dispose();
    }

    /**
     * @returns {boolean} true for a raster-style skin (like a BitmapSkin), false for vector-style (like SVGSkin).
     */
    get isRaster () {
        return true;
    }

    /**
     * @return {Array<number>} the "native" size, in texels, of this skin. [width, height]
     */
    get size () {
        return [this._canvas.width, this._canvas.height];
    }

    /**
     * @return {WebGLTexture} The GL texture representation of this skin when drawing at the given size.
     * @param {int} pixelsWide - The width that the skin will be rendered at, in GPU pixels.
     * @param {int} pixelsTall - The height that the skin will be rendered at, in GPU pixels.
     */
    // eslint-disable-next-line no-unused-vars
    getTexture (pixelsWide, pixelsTall) {
        if (this._canvasDirty) {
            this._drawToBuffer();
        }

        return this._exportTexture;
    }

    /**
     * Clear the pen layer.
     */
    clear () {
        const gl = this._renderer.gl;
        twgl.bindFramebufferInfo(gl, this._framebuffer);

        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);

        const ctx = this._canvas.getContext('2d');
        ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);

        this._silhouetteDirty = true;
    }

    /**
     * Draw a point on the pen layer.
     * @param {PenAttributes} penAttributes - how the point should be drawn.
     * @param {number} x - the X coordinate of the point to draw.
     * @param {number} y - the Y coordinate of the point to draw.
     */
    drawPoint (penAttributes, x, y) {
        // Canvas renders a zero-length line as two end-caps back-to-back, which is what we want.
        this.drawLine(penAttributes, x, y, x, y);
    }

    /**
     * Draw a line on the pen layer.
     * @param {PenAttributes} penAttributes - how the line should be drawn.
     * @param {number} x0 - the X coordinate of the beginning of the line.
     * @param {number} y0 - the Y coordinate of the beginning of the line.
     * @param {number} x1 - the X coordinate of the end of the line.
     * @param {number} y1 - the Y coordinate of the end of the line.
     */
    drawLine (penAttributes, x0, y0, x1, y1) {
        // const ctx = this._canvas.getContext('2d');

        // this._setAttributes(ctx, penAttributes);

        // Width 1 and 3 lines need to be offset by 0.5.
        const diameter = penAttributes.diameter || DefaultPenAttributes.diameter;
        const offset = (Math.max(4 - diameter, 0) % 2) / 2;
        // ctx.beginPath();
        // ctx.moveTo(this._rotationCenter[0] + x0 + offset, this._rotationCenter[1] - y0 + offset);
        // ctx.lineTo(this._rotationCenter[0] + x1 + offset, this._rotationCenter[1] - y1 + offset);
        // ctx.stroke();

        // this._canvasDirty = true;

        this._drawLineOnBuffer(
            penAttributes,
            this._rotationCenter[0] + x0 + offset, this._rotationCenter[1] - y0 + offset,
            this._rotationCenter[0] + x1 + offset, this._rotationCenter[1] - y1 + offset
        );

        this._silhouetteDirty = true;
    }

    _drawLineOnBuffer (penAttributes, x0, y0, x1, y1) {
        // console.log(x0, y0, x1, y1);
        // if (texture !== this._texture && this._canvasDirty) {
        //     this._drawToBuffer();
        // }

        const gl = this._renderer.gl;
        twgl.bindFramebufferInfo(gl, this._framebuffer);

        // gl.disable(gl.BLEND);
        gl.blendFuncSeparate(gl.ONE, gl.ONE_MINUS_SRC_ALPHA, gl.SRC_ALPHA, gl.ONE);

        const bounds = this._bounds;

        const NO_EFFECTS = 0;
        const currentShader = this._renderer._shaderManager.getShader(ShaderManager.DRAW_MODE.line, NO_EFFECTS);

        gl.viewport(0, 0, bounds.width, bounds.height);
        const projection = twgl.m4.ortho(0, bounds.width, 0, bounds.height, -1, 1);
        // console.log(bounds);

        gl.useProgram(currentShader.program);
        twgl.setBuffersAndAttributes(gl, currentShader, this._renderer._bufferInfo);

        const diameter = penAttributes.diameter || DefaultPenAttributes.diameter;
        const length = Math.hypot(Math.abs(x1 - x0) - 0.001, Math.abs(y1 - y0) - 0.001);
        const avgX = (x0 + x1) / 2;
        const avgY = (y0 + y1) / 2;
        const theta = Math.atan2(y0 - y1, x0 - x1);
        const half = length / (length + diameter) / 2;
        const width = Math.abs(x1 - x0) + diameter;
        const height = Math.abs(y1 - y0) + diameter;

        const uniforms = {
            u_skin: this._texture,
            u_projectionMatrix: projection,
            u_modelMatrix: twgl.m4.multiply(
                twgl.m4.translation(twgl.v3.create(avgX, avgY, 0)),
                twgl.m4.scaling(twgl.v3.create(
                    Math.abs(Math.cos(theta)) * (length) + 0 * (length) + diameter,
                    Math.abs(Math.sin(theta)) * (length) + 0 * (length) + diameter,
                    // Math.cos(theta) * (Math.abs(x1 - x0)) + Math.sin(theta) * (Math.abs(y1 - y0)) + diameter,
                    0
                ))
            ),
            u_lineA: twgl.v3.create(Math.sign(Math.cos(theta)) * (0.5 - diameter / 2 / width), Math.sign(Math.sin(theta)) * (0.5 - diameter / 2 / height)),
            u_lineB: twgl.v3.create(Math.sign(Math.cos(theta)) * -(0.5 - diameter / 2 / width), Math.sign(Math.sin(theta)) * -(0.5 - diameter / 2 / height)),
            u_lineWidth: diameter,
            u_lineColor: penAttributes.color4f || DefaultPenAttributes.color4f,
            u_fudge: 0,
        };
        // console.log(uniforms.u_lineA, uniforms.u_lineB);

        twgl.setUniforms(currentShader, uniforms);

        twgl.drawBufferInfo(gl, this._renderer._bufferInfo, gl.TRIANGLES);

        // gl.enable(gl.BLEND);
        gl.blendFuncSeparate(gl.ONE, gl.ONE_MINUS_SRC_ALPHA, gl.ZERO, gl.ONE);

        twgl.bindFramebufferInfo(gl, null);

        this._silhouetteDirty = true;
    }

    /**
     * Stamp an image onto the pen layer.
     * @param {HTMLCanvasElement|HTMLImageElement|HTMLVideoElement} stampElement - the element to use as the stamp.
     * @param {number} x - the X coordinate of the stamp to draw.
     * @param {number} y - the Y coordinate of the stamp to draw.
     */
    drawStamp (stampElement, x, y) {
        const ctx = this._canvas.getContext('2d');

        ctx.drawImage(stampElement, this._rotationCenter[0] + x, this._rotationCenter[1] - y);

        this._canvasDirty = true;
        this._silhouetteDirty = true;
    }

    _drawRectangle (currentShader, texture, bounds, x = -this._canvas.width / 2, y = this._canvas.height / 2) {
        const gl = this._renderer.gl;

        gl.viewport(0, 0, bounds.width, bounds.height);
        const projection = twgl.m4.ortho(bounds.left, bounds.right, bounds.top, bounds.bottom, -1, 1);

        gl.useProgram(currentShader.program);
        twgl.setBuffersAndAttributes(gl, currentShader, this._renderer._bufferInfo);

        const uniforms = {
            u_skin: texture,
            u_projectionMatrix: projection,
            u_modelMatrix: twgl.m4.multiply(
                twgl.m4.translation(twgl.v3.create(-x - bounds.width / 2, -y + bounds.height / 2, 0)),
                twgl.m4.scaling(twgl.v3.create(bounds.width, bounds.height, 0))
            ),
            u_fudge: 0,
        };

        twgl.setTextureParameters(gl, texture, {minMag: gl.NEAREST});
        twgl.setUniforms(currentShader, uniforms);

        twgl.drawBufferInfo(gl, this._renderer._bufferInfo, gl.TRIANGLES);
    }

    _drawToBuffer (texture = this._texture, x = -this._canvas.width / 2, y = this._canvas.height / 2) {
        if (texture !== this._texture && this._canvasDirty) {
            this._drawToBuffer();
        }

        const gl = this._renderer.gl;
        twgl.bindFramebufferInfo(gl, this._framebuffer);

        gl.blendFuncSeparate(gl.ONE, gl.ONE_MINUS_SRC_ALPHA, gl.SRC_ALPHA, gl.ONE);

        const bounds = this._bounds;

        if (texture === this._texture) {
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this._canvas);

            const ctx = this._canvas.getContext('2d');
            ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);

            this._canvasDirty = false;
        }

        const NO_EFFECTS = 0;
        const currentShader = this._renderer._shaderManager.getShader(ShaderManager.DRAW_MODE.default, NO_EFFECTS);

        this._drawRectangle(currentShader, texture, bounds, x, y);

        gl.blendFuncSeparate(gl.ONE, gl.ONE_MINUS_SRC_ALPHA, gl.ZERO, gl.ONE);

        twgl.bindFramebufferInfo(gl, null);

        this._silhouetteDirty = true;
    }

    /**
     * React to a change in the renderer's native size.
     * @param {object} event - The change event.
     */
    onNativeSizeChanged (event) {
        this._setCanvasSize(event.newSize);
    }

    /**
     * Set the size of the pen canvas.
     * @param {Array<int>} canvasSize - the new width and height for the canvas.
     * @private
     */
    _setCanvasSize (canvasSize) {
        const [width, height] = canvasSize;

        const gl = this._renderer.gl;

        this._bounds = new Rectangle();
        this._bounds.initFromBounds(width / 2, width / -2, height / 2, height / -2);

        this._canvas.width = width;
        this._canvas.height = height;
        this._rotationCenter[0] = width / 2;
        this._rotationCenter[1] = height / 2;

        if (this._texture !== null) {
            this._renderer.gl.deleteTexture(this._texture);
        }
        this._texture = twgl.createTexture(
            gl,
            {
                auto: true,
                mag: gl.NEAREST,
                min: gl.NEAREST,
                wrap: gl.CLAMP_TO_EDGE,
                src: this._canvas
            }
        );

        this._exportTexture = twgl.createTexture(
            gl,
            {
                auto: true,
                mag: gl.NEAREST,
                min: gl.NEAREST,
                wrap: gl.CLAMP_TO_EDGE,
                width,
                height,
            }
        );

        const attachments = [
            {
                format: gl.RGBA,
                attachment: this._exportTexture
            },
        ];
        if (this._framebuffer) {
            twgl.resizeFramebufferInfo(gl, this._framebuffer, attachments, width, height);
            twgl.resizeFramebufferInfo(gl, this._silhouetteBuffer, [{format: gl.RGBA}], width, height);
        } else {
            this._framebuffer = twgl.createFramebufferInfo(gl, attachments, width, height);
            this._silhouetteBuffer = twgl.createFramebufferInfo(gl, [{format: gl.RGBA}], width, height);
        }

        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);

        this._silhouetteDirty = true;
    }

    /**
     * Set context state to match provided pen attributes.
     * @param {CanvasRenderingContext2D} context - the canvas rendering context to be modified.
     * @param {PenAttributes} penAttributes - the pen attributes to be used.
     * @private
     */
    _setAttributes (context, penAttributes) {
        penAttributes = penAttributes || DefaultPenAttributes;
        const color4f = penAttributes.color4f || DefaultPenAttributes.color4f;
        const diameter = penAttributes.diameter || DefaultPenAttributes.diameter;

        const r = Math.round(color4f[0] * 255);
        const g = Math.round(color4f[1] * 255);
        const b = Math.round(color4f[2] * 255);
        const a = color4f[3]; // Alpha is 0 to 1 (not 0 to 255 like r,g,b)

        context.strokeStyle = `rgba(${r},${g},${b},${a})`;
        context.lineCap = 'round';
        context.lineWidth = diameter;
    }

    /**
     * If there have been pen operations that have dirtied the canvas, update
     * now before someone wants to use our silhouette.
     */
    updateSilhouette () {
        if (this._silhouetteDirty) {
            if (this._canvasDirty) {
                this._drawToBuffer();
            }

            // Render export texture to another framebuffer
            const gl = this._renderer.gl;
            twgl.bindFramebufferInfo(gl, this._silhouetteBuffer);

            gl.clearColor(0, 0, 0, 0);
            gl.clear(gl.COLOR_BUFFER_BIT);

            gl.disable(gl.BLEND);

            const bounds = this._bounds;
            const texture = this._exportTexture;

            const NO_EFFECTS = 0;
            const currentShader = this._renderer._shaderManager.getShader(ShaderManager.DRAW_MODE.default, NO_EFFECTS);

            this._drawRectangle(currentShader, texture, bounds);

            gl.enable(gl.BLEND);

            twgl.bindFramebufferInfo(gl, null);

            // Sample the framebuffer's pixels into the silhouette instance
            const skinPixels = new Uint8Array(Math.floor(this._canvas.width * this._canvas.height * 4));
            gl.readPixels(0, 0, this._canvas.width, this._canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, skinPixels);

            const skinCanvas = this._canvas;
            skinCanvas.width = bounds.width;
            skinCanvas.height = bounds.height;

            const skinContext = skinCanvas.getContext('2d');
            const skinImageData = skinContext.createImageData(bounds.width, bounds.height);
            skinImageData.data.set(skinPixels);
            skinContext.putImageData(skinImageData, 0, 0);

            this._silhouette.update(this._canvas);

            this._silhouetteDirty = false;
        }
    }
}

module.exports = PenSkin;
