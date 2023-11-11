struct VSOut {
    @builtin(position) Position: vec4f,
    @location(0) texCoord: vec2f
 };

struct ViewParams {
    view_proj: mat4x4<f32>
};


//let's create our uniform variable for the bindgroup
@group(0) @binding(0)
var<uniform> view_params: ViewParams;

@vertex
fn main(@location(0) inPos: vec3f,
        @location(1) inTexCoord: vec2f) -> VSOut {
    var vsOut: VSOut;
    vsOut.Position = view_params.view_proj * vec4f(inPos, 1);
    vsOut.texCoord = inTexCoord;
    return vsOut;
}
