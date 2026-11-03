// Decode meshopt-compressed, quantized GLBs into plain float GLBs our reader understands.
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS, EXTMeshoptCompression, KHRMeshQuantization } from '@gltf-transform/extensions';
import { dequantize } from '@gltf-transform/functions';
import { MeshoptDecoder } from 'meshoptimizer';

export async function decodeGlb(input: string, output: string) {
  await MeshoptDecoder.ready;
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
  const doc = await io.read(input);
  await doc.transform(dequantize());
  // drop the compression and quantization extensions so the output is plain floats
  for (const ext of doc.getRoot().listExtensionsUsed()) {
    if (ext.extensionName === EXTMeshoptCompression.EXTENSION_NAME || ext.extensionName === KHRMeshQuantization.EXTENSION_NAME) ext.dispose();
  }
  // animation samplers can still hold quantized outputs; convert them to float
  for (const anim of doc.getRoot().listAnimations()) {
    for (const s of anim.listSamplers()) {
      for (const acc of [s.getInput(), s.getOutput()]) {
        if (!acc || acc.getComponentType() === 5126) continue;
        const n = acc.getCount() * acc.getElementSize();
        const out = new Float32Array(n);
        const el: number[] = [];
        for (let i = 0; i < acc.getCount(); i++) {
          acc.getElement(i, el);
          for (let k = 0; k < el.length; k++) out[i * el.length + k] = el[k];
        }
        acc.setArray(out).setNormalized(false);
      }
    }
  }
  await io.write(output, doc);
}
