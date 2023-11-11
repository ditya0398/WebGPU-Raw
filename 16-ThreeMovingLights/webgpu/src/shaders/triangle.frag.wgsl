struct Light{
    u_LDRed: vec3f,
    u_KDRed: vec3f,

    u_LARed: vec3f,
    u_KARed: vec3f,

    u_LSRed: vec3f,
    u_KSRed: vec3f,

   
};
@group(0) @binding(3)
var<uniform> light: Light;

@group(0) @binding(4)
var<uniform> u_MaterialShininess: f32;


@fragment
fn main(@location(0) tNorm: vec3f, @location(1) light_direction: vec3f, @location(2) view_vector: vec3f ) -> @location(0) vec4f {
    
    var normalizedTNorm: vec3f = normalize(tNorm);
    var normalizedLightDirection: vec3f = normalize(light_direction);
    var normalizedViewVector: vec3f = normalize(view_vector);

    var tNormal_dot_lightDirection: f32 = max(dot(normalizedLightDirection, normalizedTNorm), 0.0);
    var reflectionVector: vec3f = reflect(-normalizedLightDirection, normalizedTNorm);
   
    var ambient: vec3f = light.u_LARed * light.u_KARed;
    var diffuse: vec3f = light.u_LDRed * light.u_KDRed * tNormal_dot_lightDirection;
    var specular: vec3f = light.u_LSRed * light.u_KSRed * pow(max(dot(reflectionVector, normalizedViewVector),0.0), u_MaterialShininess);

    var phongADS: vec3f =  ambient + diffuse + specular;
    
    return vec4f(phongADS, 1);
}
