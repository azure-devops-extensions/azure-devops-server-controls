/**
 * Pivot types for directory page
 */
export const enum DirectoryPivotType {
    mine = "mine",
    all = "all",
    directory = "directory"
}

/**
 * Pivots on directory page
 */
export interface IDirectoryPivot {
    name: string;
    type: DirectoryPivotType;
}