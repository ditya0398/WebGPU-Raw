
export default class Sphere {
	public declare elementIndices: Uint16Array;
	public declare positionArray: Float32Array;
	public declare normalArray: Float32Array;
	

	constructor(stacks: any, slices: any, radius: any) {
		this.makeSphere(stacks,slices,radius);
	}

	makeSphere(stacks: any, slices: any, radius: any) {
		var pos = Array()
		var nor = Array()
		for (var i = 0; i <= stacks; i++) {
			var phi = Math.PI * i / stacks;
			for (var j = 0; j <= slices; j++) {
				var theta = 2.0 * Math.PI * j / slices;
				pos.push(Math.sin(phi) * Math.sin(theta) * radius)
				pos.push(Math.cos(phi) * radius)
				pos.push(Math.sin(phi) * Math.cos(theta) * radius)

				nor.push(Math.sin(phi) * Math.sin(theta))
				nor.push(Math.cos(phi))
				nor.push(Math.sin(phi) * Math.cos(theta))
			}
		}
		var elements = Array()
		for (var i = 0; i < stacks; i++) {
			var e1 = i * (slices + 1)
			var e2 = e1 + slices + 1
			for (var j = 0; j < slices; j++, e1++, e2++) {
				if (i != 0) {
					elements.push(e1)
					elements.push(e2)
					elements.push(e1 + 1)
				}
				if (i != (stacks - 1)) {
					elements.push(e1 + 1)
					elements.push(e2)
					elements.push(e2 + 1)
				}
			}
		}
		this.elementIndices = Uint16Array.from(elements)
		this.positionArray = Float32Array.from(pos)
		this.normalArray = Float32Array.from(nor)
	}

}
