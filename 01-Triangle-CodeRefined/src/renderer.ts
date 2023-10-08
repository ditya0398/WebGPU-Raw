import vertShaderCode from './shaders/triangle.vert.wgsl';
import fragShaderCode from './shaders/triangle.frag.wgsl';

//Define the position for the Triangle which will be passed to the Shader
const positionTriangle = new Float32Array([
    1.0, -1.0, 0.0,
    -1.0, -1.0, 0.0,
    0.0, 1.0, 0.0
]);

//Define the Color data
const colorTriangle = new Float32Array([
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

//Indices 
const Indices = new Uint16Array([0, 1, 2]);


export default class Renderer{
    canvas: HTMLCanvasElement;

    //API Data Structure
    adapter: GPUAdapter;
    device: GPUDevice;
    queue: GPUQueue;
    
    constructor(canvas){
        this.canvas = canvas;
    }

    //Main entry point function
    async start(){
    
    }

    // WebGPU is an asynchronous API so it’s easiest to use in an async function. 
    async initializeAPI(): Promise<boolean>{
        /* 1) Get the GPU 
           2) Get the Adapter
           3) Get the Device from the Adapter
           4) Set up the Queue
         */

        try{
            //Gets the GPU Device from the current browser context
            const entry: GPU = navigator.gpu;
            if(!entry)
            {
                return false;
            }

            // Get the adapter - Physical Device
            /*A WebGPU "adapter" (GPUAdapter) is an object which identifies a particular WebGPU implementation
             on the system (e.g. a hardware accelerated implementation on an integrated or discrete GPU, 
             or software implementation). Two different GPUAdapter objects on the same page could refer to the
             same underlying implementation,or to two different underlying implementations (e.g. integrated and discrete GPUs). */

            this.adapter = await entry.requestAdapter();

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
            
             this.device = await this.adapter.requestDevice();

             //A Queue allows you to send work asynchronously to the GPU    
             this.queue = this.device.queue;
        
        }
        catch(e){
            console.error(e);
            return false;
        }
        return true;
    }

    async initializeResources()
    {
        const createBuffer = (
            arr: Float32Array | Uint16Array,
            usage: number
        ) => {
            // Align to 4 bytes
            let desc = {
                size: (arr.byteLength + 3) & ~ 3,
                usage, 
                mappedAtCreation: true // specifying here that buffer is mappable and you can set the 
                                       // initial data by calling buffer.getMappedRange()
            };
            /*
             Mapping a buffer means that transferring the ownership of the buffer from GPU to  CPU, so that 
             we can transfer the data into the buffer
             When an application requests to map a buffer, it initiates a transfer of the buffer’s ownership
             to the CPU. At this time, the GPU may still need to finish executing some operations that use 
             the buffer, so the transfer doesn’t complete until all previously-enqueued GPU operations are finished.
             That’s why mapping a buffer is an asynchronous operation
             
             Once a GPUBuffer is mapped, it is possible to access its memory from JavaScript This is done by calling 
             GPUBuffer.getMappedRange, which returns an ArrayBuffer called a "mapping". These are available until
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
    }

}