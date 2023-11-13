
@group(0) @binding(1) var mySampler: sampler; 

fn random (st: vec2f) -> f32 {
    return fract(sin(dot(st.xy,
                         vec2(12.9898,78.233)))*
        43758.5453123);
}

@fragment
fn main(@location(0) inColor: vec3f, @location(1) texCoord: vec2f) -> @location(0) vec4f {
   
   var rnd: f32 = random( texCoord );

    var final_color: vec4f = vec4f(vec3f(rnd, rnd, rnd), 1.0);
    return final_color;
}
