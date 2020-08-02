precision mediump float;

#ifdef DRAW_MODE_line
uniform float u_positionScalar;
#endif

uniform mat4 u_projectionMatrix;
uniform mat4 u_modelMatrix;

attribute vec2 a_texCoord;

attribute vec2 a_position;

varying vec2 v_texCoord;

void main() {
	#ifdef DRAW_MODE_line
    vec2 position = a_position;
    position.y = clamp(position.y * u_positionScalar, -0.5, 0.5);
    gl_Position = u_projectionMatrix * u_modelMatrix * vec4(position, 0, 1);
	#elif defined(DRAW_MODE_background)
	gl_Position = vec4(a_position * 2.0, 0, 1);
	#else
	gl_Position = u_projectionMatrix * u_modelMatrix * vec4(a_position, 0, 1);
	#endif
	v_texCoord = a_texCoord;
}
