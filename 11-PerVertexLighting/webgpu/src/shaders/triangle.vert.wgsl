struct VSOut {
    @builtin(position) Position: vec4f,
    @location(0) phongADS: vec3f,
 };

struct ViewParams {
    view_proj: mat4x4<f32>
};

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


@group(0) @binding(5)
var<uniform> u_LA: vec3f;

@group(0) @binding(6)
var<uniform> u_KA: vec3f;

@group(0) @binding(7)
var<uniform> u_LS: vec3f;

@group(0) @binding(8)
var<uniform> u_KS: vec3f;


@group(0) @binding(9)
var<uniform> u_MaterialShininess: f32;


@vertex
fn main(@location(0) inPos: vec3f,
        @location(1) inNormal: vec3f) -> VSOut {
    var vsOut: VSOut;
    
    var eye_coordinates: vec4f = model_view * vec4f(inPos, 1);
    var normal_matrix: mat3x3<f32> = mat3x3<f32>(
    model_view[0].xyz,
    model_view[1].xyz,
    model_view[2].xyz
    );

    var tNorm: vec3f = normalize(normal_matrix * inNormal);
    var s: vec3f = normalize(vec3f(light_position - eye_coordinates.xyz));
    var tNormal_dot_lightDirection: f32 = max(dot(s, tNorm), 0.0);
    var reflectionVector: vec3f = reflect(-s, tNorm);
    var viewVector: vec3f = normalize(vec3f(-eye_coordinates.xyz));

    var ambient: vec3f = u_LA * u_KA;
    var diffuse: vec3f = u_LD * u_KD * tNormal_dot_lightDirection;
    var specular: vec3f = u_LS * u_KS * pow(max(dot(reflectionVector, viewVector),0.0), u_MaterialShininess);


    vsOut.Position = view_params.view_proj * model_view * vec4f(inPos, 1);
    vsOut.phongADS = diffuse + specular + ambient;
    return vsOut;
}
