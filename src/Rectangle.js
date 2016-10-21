/**
 * @fileoverview
 * A utility for creating and comparing axis-aligned rectangles.
 */

class Rectangle {
    /**
     * Rectangles are always initialized to the "largest possible rectangle";
     * use one of the init* methods below to set up a particular rectangle.
     * @constructor
     */
    constructor () {
        this.left = -Infinity;
        this.right = Infinity;
        this.bottom = -Infinity;
        this.top = Infinity;
    }

    /**
     * Initialize a Rectangle from given Scratch-coordinate bounds.
     * @param {number} left Left bound of the rectangle.
     * @param {number} right Right bound of the rectangle.
     * @param {number} bottom Bottom bound of the rectangle.
     * @param {number} top Top bound of the rectangle.
     */
    initFromBounds (left, right, bottom, top) {
        this.left = left;
        this.right = right;
        this.bottom = bottom;
        this.top = top;
    }

    /**
     * Initialize a Rectangle to the minimum AABB around a set of points.
     * @param {Array.<Array.<number>>} points Array of [x, y] points.
     */
    initFromPointsAABB (points) {
        this.left = Infinity;
        this.right = -Infinity;
        this.top = -Infinity;
        this.bottom = Infinity;
        for (let i = 0; i < points.length; i++) {
            let x = points[i][0];
            let y = points[i][1];
            if (x < this.left) {
                this.left = x;
            }
            if (x > this.right) {
                this.right = x;
            }
            if (y > this.top) {
                this.top = y;
            }
            if (y < this.bottom) {
                this.bottom = y;
            }
        }
    }

    /**
     * Determine if this Rectangle intersects some other.
     * Note that this is a comparison assuming the Rectangle was
     * initialized with Scratch-space bounds or points.
     * @param {!Rectangle} other Rectangle to check if intersecting.
     * @return {Boolean} True if this Rectangle intersects other.
     */
    intersects (other) {
        return (
            this.left <= other.right &&
            other.left <= this.right &&
            this.top >= other.bottom &&
            other.top >= this.bottom
        );
    }

    /**
     * Determine if this Rectangle fully contains some other.
     * Note that this is a comparison assuming the Rectangle was
     * initialized with Scratch-space bounds or points.
     * @param {!Rectangle} other Rectangle to check if fully contained.
     * @return {Boolean} True if this Rectangle fully contains other.
     */
    contains (other) {
        return (
            other.left > this.left &&
            other.right < this.right &&
            other.top < this.top &&
            other.bottom > this.bottom
        );
    }
}

module.exports = Rectangle;
