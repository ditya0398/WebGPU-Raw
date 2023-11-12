@group(0) @binding(1) var myTexture: texture_2d<f32>;
@group(0) @binding(2) var mySampler: sampler; 

@fragment
fn main(@location(0) inColor: vec3f, @location(1) texCoord: vec2f) -> @location(0) vec4f {
    var myTex: vec4f = textureSample(myTexture, mySampler, texCoord);

    var sun_color: vec3f = vec3f(1.0, 0.5, 0.2);
    var brightness: f32 = 1.0 / length(texCoord - 0.5);
    var final_color: vec4f = vec4f(sun_color * brightness, 1.0);
    return final_color;
}
