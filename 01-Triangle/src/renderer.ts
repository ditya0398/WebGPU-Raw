import vertShaderCode from './shaders/triangle.vert.wgsl';
import fragShaderCode from './shaders/triangle.frag.wgsl';

//Let's define the positions for the Vertex Buffer Data
const positions = new Float32Array([
    1.0,-1.0,0.0,
    -1.0,-1.0,0.0,
    0.0,1.0,0.0
]);

//Similarly Color buffer daata
const colors = new Float32Array([
    1.0,
    0.0,
    0.0, // 🔴
    0.0,
    1.0,
    0.0, // 🟢
    0.0,
    0.0,
    1.0 // 🔵
]);

//Index Buffer data 
const indices = new Uint16Array([0,1,2]);

export default class Renderer{
    canvas: HTMLCanvasElement;

    //API Data Structures 
    adapter: GPUAdapter;
    device: GPUDevice;
    queue: GPUQueue; 

    //Rendering onto FrameBuffer Related things
    context: GPUCanvasContext;
    colorTexture: GPUTexture;
    colorTextureView: GPUTextureView;
    depthTexture: GPUTexture;
    depthTextureView: GPUTextureView;

    //Resources which needs to be passed to the GPU
    positionBuffer: GPUBuffer;
    colorBuffer: GPUBuffer;
    indexBuffer: GPUBuffer;
    vertModule: GPUShaderModule;
    fragModule: GPUShaderModule;
    pipeline: GPURenderPipeline;
    commandEncoder: GPUCommandEncoder;
    passEncoder: GPURenderPassEncoder;


    constructor(canvas){
        this.canvas = canvas;
    }


    async start(){
        if(await this.initializeAPI()){
            this.resizeBackings();
            await this.InitializeResources();
            this.render();
        }

    }

    /*Initialize the WebGPU
     Each request to access the adapter and the WebGPU device needs an async execution, that is why we use promise here
     1) Get the GPU Entry point  
     2) Get the Adaptor(Physical Device) from the entry point  
     3) Get the device(Logical Device) from the adaptor
     4) Get the queue


      Questions : - What's the difference between a GPUAdapter and GPUDevice in the WebGPU api?
                    The WebGPU api has both an GPUAdapter and a GPUDevice. But why are there two interfaces for this instead of just one? What was their reasoning when the spec was created?
                    webgpu
                    - https://stackoverflow.com/questions/75997043/whats-the-difference-between-a-gpuadapter-and-gpudevice-in-the-webgpu-api
    */
    async initializeAPI(): Promise<boolean>{
        try{
            //Entry to WebGPU, we get the GPU Device here and start the rendering!
            // You can think of an adapter as WebGPU's representation of a specific piece of GPU hardware in your device.
            const entry: GPU = navigator.gpu;
            if(!entry)
            {
                return false;
            }
            //Physical Device Adapter 
            // The WebGPU Adapter (GPUAdapter) is the API implementation of WebGPU on our GPU.
            this.adapter = await entry.requestAdapter();
            
            //Logical Device
            // The GPU Device is the logical connection between our application and the adapter
            this.device = await this.adapter.requestDevice();
            
             //Queue
            this.queue = this.device.queue;   //A Queue allows you to send work asynchronously to the GPU 
        }
        catch(e){
            console.error(e);
            return false;
        }
        return true;
    }

    /*
    1) Create the Buffer
    2) Shader Modules and their compilation
    3) Input Assembly 
    4) Uniform Data - Bind Group Layouts 
        At a high level, bind groups follow a similar model to vertex buffers in WebGPU.
        Each bind group specifies an array of buffers and textures which it contains, and the parameter binding indices to map 
        these too in the shader. Each pipeline specifies that it will use zero or more such bind groups. During rendering,
        the bind groups required by the pipeline are bound to the corresponding bind group slots specified when creating
        the pipeline layout, to bind data to the shader parameters. The bind group layout and bind groups using the layout 
        are treated as separate objects, allowing parameter values to be changed without changing the entire rendering pipeline.
        By using multiple bind group sets, we can swap out per-object parameters without conflicting with bind groups specifying
        global parameters during rendering. The bind group parameters can be accessible in both the vertex and fragment stages 
        (or, compute).An example pipeline using two bind group sets is illustrated in the figure below.
    5) Pipeline desc 
    */
    async InitializeResources()
    {
         //Buffers
         const createBuffer = (
            arr: Float32Array | Uint16Array,
            usage: number
         ) => {
           //Align to 4 bytes? Need to read on this more
            let desc = {
                size: (arr.byteLength + 3) & ~3,
                usage, // read more on this 
                mappedAtCreation: true
            };
        //The createBuffer() method of the GPUDevice interface creates a GPUBuffer in which to store raw data to use in GPU operations.
         let buffer = this.device.createBuffer(desc);
         const writeArray  = 
            arr instanceof Uint16Array
                ? new Uint16Array(buffer.getMappedRange())
                : new Float32Array(buffer.getMappedRange());

            writeArray.set(arr);
            buffer.unmap();
            return buffer;
        };

        this.positionBuffer = createBuffer(positions, GPUBufferUsage.VERTEX);
        this.colorBuffer = createBuffer(colors, GPUBufferUsage.VERTEX);
        this.indexBuffer = createBuffer(indices, GPUBufferUsage.INDEX);


        //Initializing the Shaders
        //Here we create shader modules, these modules gets run on the GPU
        //In WebGPU, most implementations will print an error to the JavaScript console. Of course you can still check for errors yourself
        // but it’s really nice that if you do nothing you’ll still get some useful info.
        const vsmDesc = {
            code: vertShaderCode
        };
        this.vertModule = this.device.createShaderModule(vsmDesc);

        //Shader Compilation code 
        var compilationInfo = await this.vertModule.getCompilationInfo();
        if (compilationInfo.messages.length > 0) {
            var hadError = false;
            console.log("Vertex Shader compilation log:");
            for (var i = 0; i < compilationInfo.messages.length; ++i) {
                var msg = compilationInfo.messages[i];
                console.log(`${msg.lineNum}:${msg.linePos} - ${msg.message}`);
                hadError = hadError || msg.type == "error";
            }
            if (hadError) {
                console.log(" Vertex Shader failed to compile");
                return;
            }
        }



        const fsmDesc = {
            code: fragShaderCode
        };
        this.fragModule = this.device.createShaderModule(fsmDesc);

       
         compilationInfo = await this.fragModule.getCompilationInfo();
        if (compilationInfo.messages.length > 0) {
            var hadError = false;
            console.log("Fragment Shader compilation log:");
            for (var i = 0; i < compilationInfo.messages.length; ++i) {
                var msg = compilationInfo.messages[i];
                console.log(`${msg.lineNum}:${msg.linePos} - ${msg.message}`);
                hadError = hadError || msg.type == "error";
            }
            if (hadError) {
                console.log(" Fragment Shader failed to compile");
                return;
            }
        }



        /*A pipeline, or more specifically a “render pipeline”, represents a pair of shaders used in a particular way. 
        Several things that happen in WebGL are combined into one thing in WebGPU when creating a pipeline. 
        For example, linking the shaders, setting up attributes parameters, choosing the draw mode (points, line, triangles), 
        setting up how the depth buffer is used. */

        // ⚗️ Graphics Pipeline
        //Input Assembly
        const positionAttribDesc: GPUVertexAttribute = {
            shaderLocation: 0,
            offset: 0,
            format: 'float32x3'
        };

        const colorAttribDesc: GPUVertexAttribute = {
            shaderLocation: 1,
            offset: 0,
            format: 'float32x3'
        };
        
        const positionBufferDesc: GPUVertexBufferLayout = {
            attributes: [positionAttribDesc],
            arrayStride: 4 * 3, //sizeof(float) * 3
            stepMode: 'vertex'
        };

        const colorBufferDesc: GPUVertexBufferLayout = {
            attributes: [colorAttribDesc],
            arrayStride: 4 * 3,
            stepMode: 'vertex'
        };


        const depthStencil: GPUDepthStencilState = {
            depthWriteEnabled: true,
            depthCompare: 'less',
            format: 'depth24plus-stencil8'
        };


        //Uniform Data
        
        const pipelineLayoutDesc = {bindGroupLayouts: []};
        const layout = this.device.createPipelineLayout(pipelineLayoutDesc);



        //Shader Stages
        const vertex: GPUVertexState = {
            module: this.vertModule,
            entryPoint: 'main',
            buffers: [positionBufferDesc,colorBufferDesc]
        };

        //Color/Blend State
        const colorState: GPUColorTargetState = {
            format: 'bgra8unorm'
        };

        const fragment: GPUFragmentState = {
            module: this.fragModule,
            entryPoint: 'main',
            targets: [colorState]
        };


        //Rasterization
        const primitive: GPUPrimitiveState = {
            frontFace: 'cw',
            cullMode: 'none',
            topology: 'triangle-list'
        };


        const pipelineDesc: GPURenderPipelineDescriptor = {
            layout,

            vertex,
            fragment,

            primitive,
            depthStencil
        };

        this.pipeline = this.device.createRenderPipeline(pipelineDesc);

    }
 // In order to see what you're drawing, you'll need an HTMLCanvasElement 
   //and to setup a Canvas Context from that canvas. A Canvas Context manages a series of textures
   // you'll use to present your final render output to your <canvas> element.

   resizeBackings()
   {
       //We are creating a Swapchain
       if(!this.context)
       {
           //create a context for rendering
           this.context = this.canvas.getContext('webgpu');

           //Configure the Context
           const canvasConfig: GPUCanvasConfiguration = {
               device: this.device,
               format: 'bgra8unorm',
               usage:
                    GPUTextureUsage.RENDER_ATTACHMENT|
                    GPUTextureUsage.COPY_SRC,
                    alphaMode: 'opaque'
           };
           this.context.configure(canvasConfig);
       }

       const depthTextureDesc: GPUTextureDescriptor = {
           size: [this.canvas.width, this.canvas.height,1],
           dimension: '2d',
           format: 'depth24plus-stencil8',
           usage: GPUTextureUsage.RENDER_ATTACHMENT |GPUTextureUsage.COPY_SRC
       };

       this.depthTexture = this.device.createTexture(depthTextureDesc);
       this.depthTextureView = this.depthTexture.createView();
   }

    encodeCommands()
    {
        let colorAttachment: GPURenderPassColorAttachment = {
            view: this.colorTextureView,
            clearValue: {r:0, g:0, b:0, a:1},
            loadOp: 'clear',
            storeOp: 'store'
        };

        const depthAttachment:  GPURenderPassDepthStencilAttachment = {
            view: this.depthTextureView,
            depthClearValue: 1,
            depthLoadOp: 'clear',
            depthStoreOp: 'store',
            stencilClearValue: 0,
            stencilLoadOp: 'clear',
            stencilStoreOp: 'store'
        };

        const renderPassDesc: GPURenderPassDescriptor = {
            colorAttachments: [colorAttachment],
            depthStencilAttachment: depthAttachment
        };

        this.commandEncoder = this.device.createCommandEncoder();


        //Encode drawing commands
        this.passEncoder = this.commandEncoder.beginRenderPass(renderPassDesc);
        this.passEncoder.setPipeline(this.pipeline);
        this.passEncoder.setViewport(
            0,
            0,
            this.canvas.width,
            this.canvas.height,
            0,
            1
        );

        this.passEncoder.setScissorRect(0,
            0,
            this.canvas.width,
            this.canvas.height);

        this.passEncoder.setVertexBuffer(0,this.positionBuffer);
        this.passEncoder.setVertexBuffer(1,this.colorBuffer);

        this.passEncoder.setIndexBuffer(this.indexBuffer, 'uint16');
        this.passEncoder.drawIndexed(3,1);
        this.passEncoder.end();

        this.queue.submit([this.commandEncoder.finish()]);
    }

    render = () => {
        //Aquire next image from context
        this.colorTexture = this.context.getCurrentTexture();
        this.colorTextureView = this.colorTexture.createView();

        //write and submit commands to queue
        this.encodeCommands();

        //refresh Canvas
        requestAnimationFrame(this.render);
    }

  
}