export enum ShapeKind { Circle = "circle", Square = "square" }
export interface Shape { kind: ShapeKind; area(): number; }
export class Circle implements Shape {
    constructor(public radius: number) {}
    kind: ShapeKind = ShapeKind.Circle;
    area(): number { return Math.PI * this.radius * this.radius; }
}
export const PI: number = 3.14159;
