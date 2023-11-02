struct VSOut {
    @builtin(position) Position: vec4f,
    @location(0) color: vec3f,
 };

struct ViewParams {
    view_proj: mat4x4<f32>
};



//let's create our uniform variable for the bindgroup
@group(0) @binding(0)
var<uniform> view_params: ViewParams;

@group(0) @binding(1)
var<uniform> model_view: mat4x4<f32>;



@vertex
fn main(@location(0) inPos: vec3f,
        @location(1) inColor: vec3f) -> VSOut {
    var vsOut: VSOut;
    var eye_coordinates: vec4f = model_view * vec4f(inPos, 1);
    var normal_matrix: mat3x3<f32> = mat3x3(transpose()) 

    vsOut.Position = view_params.view_proj * model_view * vec4f(inPos, 1);
    vsOut.color = inColor;
    return vsOut;
}
