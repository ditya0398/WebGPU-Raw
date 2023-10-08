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

        }
        return true;
    }

}