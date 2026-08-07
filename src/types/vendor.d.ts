declare module "hershey" {
  export type Point = [number, number];
  export interface PathResult {
    bounds: { minX: number; maxX: number; minY: number; maxY: number };
    paths: Point[][];
  }
  export function stringToPaths(value: string): PathResult;
}

declare module "gifenc" {
  export interface GIFEncoderInstance {
    writeFrame(
      index: Uint8Array,
      width: number,
      height: number,
      options?: {
        palette?: number[][];
        delay?: number;
        repeat?: number;
        dispose?: number;
      }
    ): void;
    finish(): void;
    bytes(): Uint8Array;
  }
  function GIFEncoder(options?: { initialCapacity?: number }): GIFEncoderInstance;
  const gifenc: { GIFEncoder: typeof GIFEncoder };
  export default gifenc;
}
