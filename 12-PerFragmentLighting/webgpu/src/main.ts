import vertShaderCode from './shaders/triangle.vert.wgsl?raw';
import fragShaderCode from './shaders/triangle.frag.wgsl?raw';
import { mat4 } from 'gl-matrix';
import { vec3 } from 'gl-matrix';
import Sphere, {makeSphere} from './sphere';



class Renderer {
    declare canvas: HTMLCanvasElement;

    //API Data Structure
    declare device: GPUDevice;
    declare queue: GPUQueue;


    //Resources which needs to be passed to the GPU 
    declare positionBufferSphere: GPUBuffer;
    declare normalBufferSphere: GPUBuffer;
    declare indexBufferSphere: GPUBuffer;
    
    //Shader Modules
    declare vertModule: GPUShaderModule;
    declare fragModule: GPUShaderModule;

    declare pipeline: GPURenderPipeline;

    declare context: GPUCanvasContext | null;

    declare depthTexture: GPUTexture;
    declare depthTextureView: GPUTextureView;
    declare colorTexture: GPUTexture;
    declare colorTextureView: GPUTextureView;

    declare commandEncoder: GPUCommandEncoder;
    declare passEncoder: GPURenderPassEncoder;


    declare proj: mat4;
    declare viewParamBGSphere: GPUBindGroup;
    declare uniformBufferProjection: GPUBuffer;
    declare uniformBufferModelView: GPUBuffer;
    declare uniformBufferLightPosition: GPUBuffer;
    declare uniformBufferLightLD: GPUBuffer;
    declare uniformBufferLightKD: GPUBuffer;
    declare uniformBufferLightLA: GPUBuffer;
    declare uniformBufferLightKA: GPUBuffer;
    declare uniformBufferLightLS: GPUBuffer;
    declare uniformBufferLightKS: GPUBuffer;
    declare uniformBufferMaterialShininess: GPUBuffer;
    declare bFullscreen: boolean;
    declare sphere: Sphere;

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        // if(this.canvas)
        //     this.toggleFullscreen(this.canvas);
    }

    toggleFullscreen(canvas: HTMLCanvasElement) {
        let fullscreenEle = document.fullscreenElement || null
        if (fullscreenEle == null) {
            if (canvas.requestFullscreen)
                canvas.requestFullscreen()

            this.bFullscreen = true;
        }
        //else
        // {
        // 	if(document.exitFullscreen)
        // 		document.exitFullscreenß()
        //         ß
        // 	this.bFullscreen = false
        // }

    }



    //Main entry point function
    async start() {
        if (await this.initializeAPI()) {
            this.resizeBackings();
            await this.initializeResources();
            this.render();
        }
    }

    // WebGPU is an asynchronous API so it’s easiest to use in an async function. 
    async initializeAPI(): Promise<boolean> {
        /* 1) Get the GPU 
           2) Get the Adapter
           3) Get the Device from the Adapter
           4) Set up the Queue
         */

        try {
            //Gets the GPU Device from the current browser context
            const entry: GPU = navigator.gpu;
            if (!entry) {
                return false;
            }

            // Get the adapter - Physical Device
            /*A WebGPU "adapter" (GPUAdapter) is an object which identifies a particular WebGPU implementation
             on the system (e.g. a hardware accelerated implementation on an integrated or discrete GPU, 
             or software implementation). Two different GPUAdapter objects on the same page could refer to the
             same underlying implementation,or to two different underlying implementations (e.g. integrated and discrete GPUs). */

            const adapter = await entry.requestAdapter();

            //Get the device - Logical Device 
            /*A WebGPU "device" (GPUDevice) represents a logical connection to a WebGPU adapter.
             It is called a "device" because it abstracts away the underlying implementation (e.g. video card)
             and encapsulates a single connection: code that owns a device can act as if it is the only user of the adapter.
             As part of this encapsulation, a device is the root owner of all WebGPU objects created from it (textures, etc.),
             which can be (internally) freed whenever the device is lost or destroyed. Multiple components on a single webpage
             can each have their own WebGPU device. */
            /*GPUDevice on the other hand exists only in order to provide isolation between applications.
             Your page should not be able to access the textures from another page and vice versa.*/

            /*https://stackoverflow.com/questions/75997043/whats-the-difference-between-a-gpuadapter-and-gpudevice-in-the-webgpu-api*/
            if (!adapter) {
                console.error("No adapter found");
                alert("No adapter found");
                return false;
            }
            this.device = await adapter.requestDevice();

            //A Queue allows you to send work asynchronously to the GPU    
            this.queue = this.device.queue;

        }
        catch (e) {
            console.error(e);
            return false;
        }
        return true;
    }

    //Creates a buffer on the GPU
    createBuffer = (
        arr: Float32Array | Uint16Array,
        usage: number
    ) => {
        // Align to 4 bytes
        let desc = {
            size: (arr.byteLength + 3) & ~3,
            usage,
            mappedAtCreation: true // specifying here that buffer is mappable and you can set the 
            // initial data by calling buffer.getMappedRange()
        };
        /*
         Mapping a buffer means that transferring the ownership of the buffer from GPU to  CPU, so that 
         we can transfer the data into the buffer from the CPU
         When an application requests to map a buffer, it initiates a transfer of the buffer’s ownership
         to the CPU. At this time, the GPU may still need to finish executing some operations that use 
         the buffer, so the transfer doesn’t complete until all previously-enqueued GPU operations are finished.
         That’s why mapping a buffer is an asynchronous operation
         
         Once a GPUBuffer is mapped, it is possible to access its memory from JavaScript This is done by calling 
         GPUBuffer.getMappedRange(), which returns an ArrayBuffer called a "mapping". These are available until
         GPUBuffer.unmap or GPUBuffer.destroy is called, at which point they are detached. These ArrayBuffers
         typically aren’t new allocations, but instead pointers to some kind of shared memory visible to the 
         content process (IPC shared memory, mmapped file descriptor, etc.)
    
         Once the application has finished using the buffer on the CPU, it can transfer ownership back to
         the GPU by unmapping it. This is an immediate operation that makes the application lose all access to 
         the buffer on the CPU (i.e. detaches ArrayBuffers)
         
         So, to SUMARIZE everything - 
         A common need is to create a GPUBuffer that is already filled with some data. This could be achieved
         by creating a final buffer, then a mappable buffer, filling the mappable buffer, and then copying from
         the mappable to the final buffer, but this would be inefficient. Instead this can be done by making the
         buffer CPU-owned at creation: we call this "mapped at creation". All buffers can be mapped at creation,
         even if they don’t have the MAP_WRITE buffer usages. The browser will just handle the transfer of data
         into the buffer for the application.
         Once a buffer is mapped at creation, it behaves as regularly mapped buffer: GPUBUffer.getMappedRange()
         is used to retrieve ArrayBuffers, and ownership is transferred to the GPU with GPUBuffer.unmap().
         
         */
        let buffer = this.device.createBuffer(desc);
        const writeArray =
            arr instanceof Uint16Array
                ? new Uint16Array(buffer.getMappedRange())
                : new Float32Array(buffer.getMappedRange());

        writeArray.set(arr);
        buffer.unmap();
        return buffer;
    }

    //gets the Shader Compilation Log
    getShaderCompilationStatus = (
        compilationInfo: GPUCompilationInfo,
        text: string
    ) => {
        if (compilationInfo.messages.length > 0) {
            var hadError = false;
            console.log(text + " compilation log:");
            for (var i = 0; i < compilationInfo.messages.length; ++i) {
                var msg = compilationInfo.messages[i];
                console.log(`${msg.lineNum}:${msg.linePos} - ${msg.message}`);
                hadError = hadError || msg.type == "error";
            }
            if (hadError) {
                console.log(text + " failed to compile");
                return;
            }
        }
        else {
            console.log(text + " Compiled Successfully!!!")
        }
    }

    async initializeResources() {
        this.sphere = new Sphere(25, 25, 1.0);
        // Create the BUFFERS on the GPU 
        this.positionBufferSphere = this.createBuffer(this.sphere.positionArray, GPUBufferUsage.VERTEX);
        this.normalBufferSphere = this.createBuffer(this.sphere.normalArray, GPUBufferUsage.VERTEX);
        this.indexBufferSphere = this.createBuffer(this.sphere.elementIndices, GPUBufferUsage.INDEX);
        
        //Initializing the SHADERS
        const vsmDesc = {
            code: vertShaderCode
        };
        this.vertModule = this.device.createShaderModule(vsmDesc);

        //Shader Compilation code 
        var compilationInfo = await this.vertModule.getCompilationInfo();
        this.getShaderCompilationStatus(compilationInfo, "Vertex Shader");

        const fsmDesc = {
            code: fragShaderCode
        };
        this.fragModule = this.device.createShaderModule(fsmDesc);


        compilationInfo = await this.fragModule.getCompilationInfo();
        this.getShaderCompilationStatus(compilationInfo, "Fragment Shader");

        //Input Assembly
        const positionAttribDesc: GPUVertexAttribute = {
            shaderLocation: 0,
            offset: 0,
            format: 'float32x3'
        };

        const normalAttribDesc: GPUVertexAttribute = {
            shaderLocation: 1,
            offset: 0,
            format: 'float32x3'
        };

        const positionBufferDesc: GPUVertexBufferLayout = {
            attributes: [positionAttribDesc],
            arrayStride: 4 * 3, //sizeof(float) * 3
            stepMode: 'vertex'
        };

        const normalBufferDesc: GPUVertexBufferLayout = {
            attributes: [normalAttribDesc],
            arrayStride: 4 * 3,
            stepMode: 'vertex'
        };

        const depthStencil: GPUDepthStencilState = {
            depthWriteEnabled: true,
            depthCompare: 'less',
            format: 'depth24plus-stencil8'
        };

        // Shader Stages
        const vertex: GPUVertexState = {
            module: this.vertModule,
            entryPoint: 'main',
            buffers: [positionBufferDesc, normalBufferDesc]
        };

        const colorState: GPUColorTargetState = {
            format: 'bgra8unorm'
        };

        const fragment: GPUFragmentState = {
            module: this.fragModule,
            entryPoint: 'main',
            targets: [colorState]
        }

        // Rasterization
        const primitive: GPUPrimitiveState = {
            frontFace: 'cw',
            cullMode: 'none',
            topology: 'triangle-list'
        }


        //Bind Group Layouts
        var bindGroupLayout = this.device.createBindGroupLayout({
            entries: [{ binding: 0, visibility: GPUShaderStage.VERTEX, buffer: { type: 'uniform' } },
                      { binding: 1, visibility: GPUShaderStage.VERTEX, buffer: { type: 'uniform'}},
                      { binding: 2, visibility: GPUShaderStage.VERTEX, buffer: { type: 'uniform'}},
                      { binding: 3, visibility: GPUShaderStage.VERTEX, buffer: { type: 'uniform'}},
                      { binding: 4, visibility: GPUShaderStage.VERTEX, buffer: { type: 'uniform'}},
                      { binding: 5, visibility: GPUShaderStage.VERTEX, buffer: { type: 'uniform'}},
                      { binding: 6, visibility: GPUShaderStage.VERTEX, buffer: { type: 'uniform'}},
                      { binding: 7, visibility: GPUShaderStage.VERTEX, buffer: { type: 'uniform'}},
                      { binding: 8, visibility: GPUShaderStage.VERTEX, buffer: { type: 'uniform'}},
                      { binding: 9, visibility: GPUShaderStage.VERTEX, buffer: { type: 'uniform'}} ]
        });



        const pipelineLayoutDesc = { bindGroupLayouts: [bindGroupLayout] };
        const layout = this.device.createPipelineLayout(pipelineLayoutDesc);


        //creating the uniform buffer
        this.uniformBufferProjection = this.device.createBuffer({
            size: (16 * 4),
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });

        this.uniformBufferModelView = this.device.createBuffer({
            size: (16 * 4),
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });

        this.uniformBufferLightPosition = this.device.createBuffer({
            size: (3 * 4),
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });
        this.uniformBufferLightLD = this.device.createBuffer({
            size: (3 * 4),
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });
        this.uniformBufferLightKD = this.device.createBuffer({
            size: (3 * 4),
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });
        this.uniformBufferLightLA = this.device.createBuffer({
            size: (3 * 4),
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });
        this.uniformBufferLightKA = this.device.createBuffer({
            size: (3 * 4),
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });
        this.uniformBufferLightLS = this.device.createBuffer({
            size: (3 * 4),
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });
        this.uniformBufferLightKS = this.device.createBuffer({
            size: (3 * 4),
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });
        this.uniformBufferMaterialShininess = this.device.createBuffer({
            size: (1 * 4),
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });
        // Create a bind group which places our view params buffer at binding 0
       
        this.viewParamBGSphere = this.device.createBindGroup({
            layout: bindGroupLayout,
            entries: [{ binding: 0, resource: { buffer: this.uniformBufferProjection, size: 16 * 4, offset: 0 }},
                      { binding: 1, resource: { buffer: this.uniformBufferModelView, size: 16 * 4, offset: 0}},
                      { binding: 2, resource: { buffer: this.uniformBufferLightPosition, size: 3 * 4, offset: 0}},
                      { binding: 3, resource: { buffer: this.uniformBufferLightLD, size: 3 * 4, offset: 0}},
                      { binding: 4, resource: { buffer: this.uniformBufferLightKD, size: 3 * 4, offset: 0}},
                      { binding: 5, resource: { buffer: this.uniformBufferLightLA, size: 3 * 4, offset: 0}},
                      { binding: 6, resource: { buffer: this.uniformBufferLightKA, size: 3 * 4, offset: 0}},
                      { binding: 7, resource: { buffer: this.uniformBufferLightLS, size: 3 * 4, offset: 0}},
                      { binding: 8, resource: { buffer: this.uniformBufferLightKS, size: 3 * 4, offset: 0}},
                      { binding: 9, resource: { buffer: this.uniformBufferMaterialShininess, size: 1 * 4, offset: 0}}]
        })

        const pipelineDesc: GPURenderPipelineDescriptor = {
            layout,

            vertex,
            fragment,

            primitive,
            depthStencil
        };

        this.pipeline = this.device.createRenderPipeline(pipelineDesc);

        this.proj = mat4.perspective(
            mat4.create(), 100 * Math.PI / 180.0, this.canvas.width / this.canvas.height, 0.1, 100);
        
    }

    resizeBackings() {
        this.canvas.width = window.innerWidth
        this.canvas.height = window.innerHeight
        if (!this.context) {
            // get the webgpu context
            this.context = this.canvas.getContext('webgpu');
            if (this.context !== null) {
                //configure the context
                const canvasConfig: GPUCanvasConfiguration = {
                    device: this.device,
                    format: 'bgra8unorm',
                    usage:
                        GPUTextureUsage.RENDER_ATTACHMENT |
                        GPUTextureUsage.COPY_SRC,
                    alphaMode: 'opaque'
                };
                this.context.configure(canvasConfig);
            }
        }

        const depthTextureDesc: GPUTextureDescriptor = {
            size: [this.canvas.width, this.canvas.height, 1],
            dimension: '2d',
            format: 'depth24plus-stencil8',
            usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC
        }

        this.depthTexture = this.device.createTexture(depthTextureDesc);
        this.depthTextureView = this.depthTexture.createView();
    }

    encodeCommands() {
        let colorAttachment: GPURenderPassColorAttachment = {
            view: this.colorTextureView,
            clearValue: { r: 0, g: 0, b: 0, a: 1 },
            loadOp: 'clear',
            storeOp: 'store'
        };

        const depthAttachment: GPURenderPassDepthStencilAttachment = {
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

        // Update camera buffer
        let cameraMatrix: mat4 = mat4.create();
        let modelMatrix: mat4 = mat4.create();
        let modelViewMat: mat4 = mat4.create();

        mat4.lookAt(cameraMatrix, [0, 0, 1], [0, 0, 0], [0, 1, 0]);
        mat4.translate(modelMatrix, modelMatrix, [0.0, 0.0, -1.0]);
        //const now = Date.now() / 1000;
        // mat4.rotateY(
        //     modelMatrix,
        //     modelMatrix, now
        // );
        // mat4.rotateX(
        //     modelMatrix,
        //     modelMatrix, now
        // );
        mat4.mul(modelViewMat, modelMatrix, cameraMatrix);


        mat4.mul(modelViewMat, cameraMatrix, modelMatrix);
        let lightPos: vec3 = vec3.create();
        vec3.set(lightPos, 100.0,100.0,100.0,2.0);

        let LD: vec3 = vec3.create();
        vec3.set(LD, 1.0,1.0,1.0);

        let KD: vec3 = vec3.create();
        vec3.set(KD, 1.0,1.0,1.0);
        
        let LA: vec3 = vec3.create();
        vec3.set(LA, 0.0,0.0,0.0);

        let KA: vec3 = vec3.create();
        vec3.set(KA, 0.0,0.0,0.0);

        let LS: vec3 = vec3.create();
        vec3.set(LS, 1.0,1.0,1.0);

        let KS: vec3 = vec3.create();
        vec3.set(KS, 1.0,1.0,1.0);


       // this.projView = mat4.mul(this.projView, this.proj, modelViewMat);

        this.device.queue.writeBuffer(this.uniformBufferProjection, 0, this.proj);  

        this.device.queue.writeBuffer(this.uniformBufferModelView, 0, modelViewMat);

        this.device.queue.writeBuffer(this.uniformBufferLightPosition, 0, lightPos);

        this.device.queue.writeBuffer(this.uniformBufferLightLD, 0, LD);

        this.device.queue.writeBuffer(this.uniformBufferLightKD, 0, KD);

        this.device.queue.writeBuffer(this.uniformBufferLightLA, 0, LA);

        this.device.queue.writeBuffer(this.uniformBufferLightKA, 0, KA);

        this.device.queue.writeBuffer(this.uniformBufferLightLS, 0, LS);

        this.device.queue.writeBuffer(this.uniformBufferLightKS, 0, KS);

        const shininess = new Float32Array([128.0])
        this.device.queue.writeBuffer(this.uniformBufferMaterialShininess, 0,shininess);
 
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

       
        this.passEncoder.setVertexBuffer(0, this.positionBufferSphere);
        this.passEncoder.setVertexBuffer(1, this.normalBufferSphere);
        this.passEncoder.setBindGroup(0, this.viewParamBGSphere);

        // this.passEncoder.draw(36, 1, 0);
        this.passEncoder.setIndexBuffer(this.indexBufferSphere, 'uint16');
        this.passEncoder.drawIndexed(this.sphere.elementIndices.length,1);
        this.passEncoder.end();

        this.queue.submit([this.commandEncoder.finish()]);
    }

    render = () => {
        //Aquire next image from context
        if (this.context != null) {
            this.colorTexture = this.context.getCurrentTexture();
            this.colorTextureView = this.colorTexture.createView();

            //write and submit commands to queue
            this.encodeCommands();

            //refresh Canvas
            requestAnimationFrame(this.render);
        }
    }
}

const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const renderer = new Renderer(canvas);
renderer.start();
