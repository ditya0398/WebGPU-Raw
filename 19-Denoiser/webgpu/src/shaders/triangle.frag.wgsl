@group(0) @binding(1) var myTexture: texture_2d<f32>;
@group(0) @binding(2) var mySampler: sampler; 

@fragment
fn main(@location(0) inColor: vec3f, @location(1) texCoord: vec2f) -> @location(0) vec4f {
    return textureSample(myTexture, mySampler, texCoord);
}
