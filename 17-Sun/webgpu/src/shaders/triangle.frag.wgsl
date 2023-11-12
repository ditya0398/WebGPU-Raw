
@group(0) @binding(1) var mySampler: sampler; 

@fragment
fn main(@location(0) inColor: vec3f, @location(1) texCoord: vec2f) -> @location(0) vec4f {
   
    var sun_color: vec3f = vec3f(1.0, 0.4, 0.2);
    var brightness: f32 = 1.0 / length(texCoord - 0.5);
    var color: vec3f =  vec3f(sun_color * brightness);
  
    var final_color: vec4f = vec4f(color, 1.0);
    return final_color;
}
