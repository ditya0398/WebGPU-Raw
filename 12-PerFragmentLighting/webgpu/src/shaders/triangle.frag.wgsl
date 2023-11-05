

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



@fragment
fn main(@location(0) tNorm: vec3f, @location(1) light_direction: vec3f, @location(2) view_vector: vec3f ) -> @location(0) vec4f {
    
    var normalizedTNorm: vec3f = normalize(tNorm);
    var normalizedLightDirection: vec3f = normalize(light_direction);
    var normalizedViewVector: vec3f = normalize(view_vector);

    var tNormal_dot_lightDirection: f32 = max(dot(normalizedLightDirection, normalizedTNorm), 0.0);
    var reflectionVector: vec3f = reflect(-normalizedLightDirection, normalizedTNorm);
   
    var ambient: vec3f = u_LA * u_KA;
    var diffuse: vec3f = u_LD * u_KD * tNormal_dot_lightDirection;
    var specular: vec3f = u_LS * u_KS * pow(max(dot(reflectionVector, normalizedViewVector),0.0), u_MaterialShininess);

    var phongADS: vec3f =  ambient + diffuse + specular;
    
    return vec4f(phongADS, 1);
}
