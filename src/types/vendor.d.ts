declare module "hershey" {
  export type Point = [number, number];
  export interface PathResult {
    bounds: { minX: number; maxX: number; minY: number; maxY: number };
    paths: Point[][];
  }
  export function stringToPaths(value: string): PathResult;
}
