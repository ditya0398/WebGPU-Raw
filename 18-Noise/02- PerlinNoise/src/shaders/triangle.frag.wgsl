
@group(0) @binding(1) var mySampler: sampler; 

fn random (st: vec2f) -> f32 {
      return fract(sin(dot(st.xy,
                         vec2(12.9898,78.233)))*
        43758.5453123);
}


fn noise(st: vec2f) -> f32{
    var i: vec2f = floor(st);
    var f: vec2f =  fract(st);

    var a: f32 = random(i);
    var b: f32 = random(i + vec2f(1.0, 0.0));
    var c: f32 = random(i + vec2f(0.0, 1.0));
    var d: f32 = random(i + vec2f(1.0, 1.0));
    
    var u: vec2f = f * f * (3.0 - 2.0 * f);

    return mix(a, b, u.x) +
            (c - a)* u.y * (1.0 - u.x) +
            (d - b) * u.x * u.y;

}

fn fbm(st: vec2f) -> f32{
     // Initial values
    var value: f32 = 0.0;
    var amplitude: f32 = 0.5;
    var frequency: f32 = 0.0;
    var octaves: i32 = 6;
    var newSt: vec2f = st;

    // Loop of octaves
    for (var i = 0; i < octaves; i++) {
        value += amplitude * noise(newSt);
        newSt = newSt * 2.0;
        amplitude *= 0.5;
    }
    return value;
}

@fragment
fn main(@location(0) inColor: vec3f, @location(1) texCoord: vec2f) -> @location(0) vec4f {
    var newTex: vec2f = texCoord * 10.0;
   var rnd: f32 = fbm(newTex);

    var final_color: vec4f = vec4f(vec3f(rnd, rnd, rnd), 1.0);
    return final_color;
}
