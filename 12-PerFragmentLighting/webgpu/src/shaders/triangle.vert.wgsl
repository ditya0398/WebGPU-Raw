struct VSOut {
    @builtin(position) Position: vec4f,
    @location(0) tNorm: vec3f,
    @location(1) light_direction: vec3f,
    @location(2) view_vector: vec3f
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

    vsOut.tNorm = normal_matrix * inNormal;
    vsOut.light_direction = vec3f(light_position - eye_coordinates.xyz);
    vsOut.view_vector= vec3f(-eye_coordinates.xyz);

    vsOut.Position = view_params.view_proj * model_view * vec4f(inPos, 1);
   
    return vsOut;
}
