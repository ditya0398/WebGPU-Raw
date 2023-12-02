@group(0) @binding(1) var myTexture: texture_2d<f32>;
@group(0) @binding(2) var mySampler: sampler; 

const INV_SQRT_OF_2PI: f32 = 0.39894228040143267793994605993439;
const INV_PI: f32 = 0.31830988618379067153776752674503;

fn deNoise(_texture: texture_2d<f32>, _sampler: sampler, uv: vec2f, sigma: f32, kSigma: f32, threshold: f32) -> vec4f {
    var radius: f32 = round(kSigma * sigma);
    var radQ: f32 = radius * radius;

    var invSigmaQx2: f32 =  0.5 / (sigma * sigma);
    var invSigmaQx2PI: f32 = INV_PI * invSigmaQx2;

    var invThresholdSqx2: f32 = 0.5 / (threshold * threshold);
    var invThresholdSqrt2PI: f32 = INV_SQRT_OF_2PI / threshold;

    var centrPx: vec4f = textureSample(_texture, _sampler, uv);

    var zBuff: f32 = 0.0;
    var aBuff: vec4f = vec4f(0.0,0.0,0.0,0.0);
    var size: vec2f = vec2f(textureDimensions(_texture, 0));

     var x: f32;
     var y: f32;
    for (x=-radius; x <= radius; x =  x + 1) {
        var pt: f32 = sqrt(radQ- x * x);   
        for (y=-pt; y <= pt; y = y + 1) {
            var blurFactor: f32 = exp( -dot(vec2f(x, y) , vec2f(x, y)) * invSigmaQx2 ) * invSigmaQx2PI;
                            
            var walkPx: vec4f = textureSample(_texture, _sampler, uv + vec2f(x,y) /size);
            var dC: vec4f = walkPx-centrPx;
            var deltaFactor: f32 = exp( -dot(dC, dC) * invThresholdSqx2) * invThresholdSqrt2PI * blurFactor;

            zBuff += deltaFactor;
            aBuff += deltaFactor*walkPx;
        }
    }

    return aBuff/zBuff;
}

@fragment
fn main(@location(0) inColor: vec3f, @location(1) texCoord: vec2f) -> @location(0) vec4f {
    return deNoise(myTexture, mySampler, texCoord, 7.0, 2.0, 0.195);
}
