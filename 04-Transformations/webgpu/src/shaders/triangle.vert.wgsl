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

@vertex
fn main(@location(0) inPos: vec3f,
        @location(1) inColor: vec3f) -> VSOut {
    var vsOut: VSOut;
    vsOut.Position = view_params.view_proj * vec4f(inPos, 1);
    vsOut.color = inColor;
    return vsOut;
}
