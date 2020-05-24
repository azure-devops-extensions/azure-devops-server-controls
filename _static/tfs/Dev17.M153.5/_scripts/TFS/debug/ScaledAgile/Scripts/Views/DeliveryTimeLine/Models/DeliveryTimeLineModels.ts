import { KeyCode } from "VSS/Utils/UI";

/**
 * Describe the direction of an user action.
 * Used when we need to know in which direction we need to load more data.
 */
export enum Movement {
    None = 0,
    Left = 1,
    Right = 2,
    Up = 4,
    Down = 8
}

export var KeyToMovementMap: { [key: number]: Movement } = {
    [KeyCode.UP]: Movement.Up,
    [KeyCode.DOWN]: Movement.Down,
    [KeyCode.LEFT]: Movement.Left,
    [KeyCode.RIGHT]: Movement.Right
}

/**
 * Describe the way the movement was produced
 */
export enum MovementType {
    Unknown = 0,
    Mouse = 1,
    CalendarButton = 2,
    Shortcut = 4,
    DragCard = 8,
    Scrollbar = 16,
    MouseWheel = 32,
    Touch = 64,
}

/**
 * Viewport movement - horizontal and vertical.
 */
export interface IViewportMovedDelta {
    horizontal: number;
    vertical: number;
}

/**
 * Simple impl of IViewportMovedDelta.
 */
export class ViewportMovedDelta implements IViewportMovedDelta {
    horizontal: number;
    vertical: number;

    constructor(horizontal: number, vertical: number) {
        this.horizontal = horizontal;
        this.vertical = vertical;
    }
}
