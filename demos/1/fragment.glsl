precision mediump float;
uniform float uTime;
uniform vec3  uCursor;
varying vec3  vPosition;

void main() {
    vec3 color = vec3(0., 0., 0.);
    float x = vPosition.x;
    float y = vPosition.y;
    float rr = (x * x + y * y) / pow(.8, 2.);
    float z = sqrt(1. - rr);
    float t = .01 + 0.6 * max(0., x * uCursor.x + y * uCursor.y + z);
    if( rr < 1. ) {
        color = vec3(t  * (1. - sin(uTime)), t * sin(uTime), t * (1. - (uTime)));
        color.r *= 1. + .8 * sin(30. * (z + .5 * x * y + .1 * sin(5. * sin(uTime))));
        color.g *= 1. + .8 * cos(30. * (z + .5 * x * y + .5 * sin(3. * sin(uTime))));
        color.b *= 1. + .8 * tan(30. * (z + .5 * x * y + 1. * sin(1. * sin(uTime))));
    }
    gl_FragColor = vec4(color, 1.);
}