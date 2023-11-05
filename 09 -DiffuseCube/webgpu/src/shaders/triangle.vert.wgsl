struct VSOut {
    @builtin(position) Position: vec4f,
    @location(0) diffuseColor: vec3f,
 };

struct ViewParams {
    view_proj: mat4x4<f32>
};



//let's create our uniform variable for the bindgroup
@group(0) @binding(0)
var<uniform> view_params: ViewParams;

@group(0) @binding(1)
var<uniform> model_view: mat4x4<f32>;

@group(0) @binding(2)
var<uniform> light_position: vec3f;


@group(0) @binding(3)
var<uniform> u_LD: vec3f;


@group(0) @binding(4)
var<uniform> u_KD: vec3f;


@vertex
fn main(@location(0) inPos: vec3f,
        @location(1) inNormal: vec3f) -> VSOut {
    var vsOut: VSOut;
    var eye_coordinates: vec4f = model_view * vec4f(inPos, 1);
    var normal_matrix: mat3x3 = mat3x3(model_view);
    var tNorm: vec3f = normalize(normal_matrix * inNormal);
    var s: vec3f = vec3f(light_position - eye_coordinates.xyz);

    vsOut.Position = view_params.view_proj * model_view * vec4f(inPos, 1);
    vsOut.diffuseColor = u_LD * u_KD * max(dot(s, tNorm), 0.0);
    return vsOut;
}
