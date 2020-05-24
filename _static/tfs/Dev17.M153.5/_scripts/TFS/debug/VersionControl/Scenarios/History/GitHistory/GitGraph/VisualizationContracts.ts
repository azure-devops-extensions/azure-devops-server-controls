/**
 * Enum of all the visualization components that can be drawn on a cell. Assigned powers of 2 to support bit flags.
 */
export enum VisComponents {
    /*
    This denotes an empty cell with no component in it marked for render
    +-----+
    |     |
    |     |
    |     |
    |     |
    +-----+
    */
    None = 0,

    /*
    +-----+
    |\    |
    | \   |
    |     |
    |     |
    +-----+
    */
    TopLeft = 1,

    /*
    +-----+
    |  |  |
    |  |  |
    |     |
    |     |
    +-----+
    */
    TopMiddle = 2,

    /*
    +-----+
    |    /|
    |   / |
    |     |
    |     |
    +-----+
    */
    TopRight = 4,

    /*
    +-----+
    |     | 
    |__   |
    |     |
    |     |
    +-----+
    */
    LeftCenter = 8,

    /*
    +-----+
    |     | 
    |     |
    |   \ |
    |    \|
    +-----+
    */
    BottomRight = 16,

    /*
    +-----+
    |     | 
    |     |
    |  |  |
    |  |  |
    +-----+
    */
    BottomMiddle = 32,

    /*
    +-----+
    |     | 
    |     |
    | /   |
    |/    |
    +-----+
    */
    BottomLeft = 64,

    /*
    +-----+
    |     | 
    |   __|
    |     |
    |     |
    +-----+
    */
    RightCenter = 128,

   /* This denotes that the cell holds a commit node*/
    Circle = 256,

    /*
    +-----+
    |     | 
    |_    |
    | \   |
    |     |
    +-----+
    */
    LeftMerge = 512,

    /*
    +-----+
    |     | 
    |    _|
    |   / |
    |     |
    +-----+
    */
    RightMerge = 1024,

    /*
    +-----+
    |     | 
    |     |
    |     |
    |  |  |
    +-----+
    */
    OctopusMerge = 2048,

    /* This denotes that the cell holds a merge node*/
    MergeNode = 4096
}

/**
 * Enum of all the excision visualization components that can be drawn on a cell. Assigned powers of 2 to support bit flags.
 */
export enum ExcisionVisComponents {
    /*
    This denotes an empty cell with no excision component in it marked for render
    +-----+
    |     |
    |     |
    |     |
    |     |
    +-----+
    */
    None = 0,

    /*
    +-----+
    |     | 
    |    _|
    |   / |
    |   | |
    +-----+
    */
    OutgoingExcision = 1,

    /*
    +-----+
    | |   | 
    | \ __|
    |     |
    |     |
    +-----+
    */
    IncomingExcision = 2,

    /*
    +-----+
    |     | 
    |   __|
    |  /  |
    |  |  |
    +-----+
    */
    OutgoingSelectedExcision = 4,

    /*
    +-----+
    |  |  | 
    |  \__|
    |     |
    |     |
    +-----+
    */
    IncomingSelectedExcision = 8,

    /*
    +-----+
    |  |  | 
    |  |  |
    |  |  |
    |  |  |
    +-----+
    */
    ContinuingSelectedTrackingLine = 16,

    /*
    +-----+
    |     | 
    |_____|
    |     |
    |     |
    +-----+
    */
    ExcisionHorizontal = 32
}

/**
 * Enum of all the highlight directions used for highlighting graph rows
 */
export enum HighlightDirection {
    All,
    FromAbove,
    FromBelow,
    SelectionRow
};