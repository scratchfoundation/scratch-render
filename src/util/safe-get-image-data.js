/**
 * Given a CanvasRenderingContext2D, and values for width and height
 * of a proposed image snapshot, return the ImageData for the context.
 * @param {CanvasRenderingContext2D} ctx The 2D canvas rendering context
 * @param {number} width The width of the proposed image snapshot
 * @param {number} height The height of the proposed image snapshot
 * @returns {Array} The list of values in the object
 */
const safeGetImageData = function (ctx, width, height) {
    const safeWidth = width || 1;
    const safeHeight = height || 1;

    return ctx.getImageData(0, 0, safeWidth, safeHeight);
};

module.exports = safeGetImageData;
