import type {WebGLRenderer} from 'three';
import type {probeClip} from './clip-probe.js';

declare global {
  interface Window {
    __kyotoPlateUniforms?: Record<string, {value: unknown}>;
    __kyotoRenderer?: WebGLRenderer;
    __kyotoPlatePose?: () => {
      ward: string;
      parts: unknown[];
      soft: unknown;
      ident: Uint8Array;
      mw: number;
      mh: number;
      a: Float32Array;
      b: Float32Array;
    };
    __kyotoPlateProbe?: (opts?: {treeAtAnchor?: boolean; minDepth?: number}) => Promise<ReturnType<typeof probeClip>>;
  }
}
