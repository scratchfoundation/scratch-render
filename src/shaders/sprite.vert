uniform mat4 u_projectionMatrix;
uniform mat4 u_modelMatrix;

attribute vec2 a_position;
attribute vec2 a_texCoord;

varying vec2 v_texCoord;

#ifdef DRAW_MODE_line
uniform vec3 u_lineA;
uniform vec3 u_lineB;
varying vec2 v_lineA;
varying vec2 v_lineB;
varying vec2 v_position;
#endif // DRAW_MODE_line

void main() {
    gl_Position = u_projectionMatrix * u_modelMatrix * vec4(a_position, 0, 1);
    v_texCoord = a_texCoord;

    #ifdef DRAW_MODE_line
	v_lineA = (u_modelMatrix * vec4(u_lineA.xy, 0, 1)).xy;
	v_lineB = (u_modelMatrix * vec4(u_lineB.xy, 0, 1)).xy;
    v_position = (u_modelMatrix * vec4(a_position, 0, 1)).xy;
    #endif // DRAW_MODE_line
}
