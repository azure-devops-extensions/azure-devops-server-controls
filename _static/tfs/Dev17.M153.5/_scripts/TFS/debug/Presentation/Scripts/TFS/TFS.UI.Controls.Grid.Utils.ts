/// <reference types="jquery" />

import VSS = require("VSS/VSS");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import Diag = require("VSS/Diag");
import VSS_Resources_Platform = require("VSS/Resources/VSS.Resources.Platform");
import Ajax = require("Presentation/Scripts/TFS/TFS.Legacy.Ajax");
import Utils_UI = require("VSS/Utils/UI");



/**
 * Keyboard Navigation aid for grid and List-oriented Controls.
 * Returns the updated index position for a navigational key press, for use with array-backed visualizations rendered as grids, with horizontal sweeps, or Lists(grids of width or height of a single element).
 * Returns null on non-navigational keypresses.
 *
 * @param e - JQuery Keyboard Event Object
 * @param initialIndex - The selected position in the array of elements, prior to the key press
 * @param columnCount - The number of columns in the grid.
 * @param elementCount - The total number of elements in the array.
 */
export function interpretGridKeyPress(e: JQueryEventObject, initialIndex: number, columnCount: number, elementCount: number): number {
    const lastIndex = elementCount - 1;
    let targetIndex = null;

    switch (e.keyCode) {
        case Utils_UI.KeyCode.UP:
            targetIndex = Math.max(initialIndex - columnCount, initialIndex % columnCount);
            break;
        case Utils_UI.KeyCode.DOWN:
            let newPosition = initialIndex + columnCount;
            targetIndex = (newPosition <= lastIndex) ? newPosition : initialIndex;
            break;

        case Utils_UI.KeyCode.LEFT:
            targetIndex = Math.max(initialIndex - 1, 0);
            break;
        case Utils_UI.KeyCode.RIGHT:
            targetIndex = Math.min(initialIndex + 1, lastIndex);
            break;

        case Utils_UI.KeyCode.HOME:
            targetIndex = 0;
            break;
        case Utils_UI.KeyCode.END:
            targetIndex = lastIndex;
            break;
    }
    return targetIndex;
}