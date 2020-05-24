import * as _AdornmentCommon from "Presentation/Scripts/TFS/TFS.Adornment.Common";
import * as _VCLegacyContracts from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";
import * as _VCFileViewer from "VersionControl/Scripts/Controls/FileViewer";
import * as _SearchSharedContracts from "Search/Scripts/Generated/Search.SharedLegacy.Contracts";
import * as VSSStore from "VSS/Flux/Store";
import * as Constants from "Search/Scenarios/Code/Constants";
import { getHitHighlights } from "Search/Scenarios/Code/Flux/Stores/AdornmentHelper";
import { CursorPositionChangePayload } from "Search/Scenarios/Code/Flux/ActionsHub";

export interface HitNavigationState {
    hitAdornments: _AdornmentCommon.DecorationAdornment[];

    activeHighlightedAdornmentIndex: number;

    prevHitNavigationEnabled: boolean;

    nextHitNavigationEnabled: boolean;

    cursorPosition: _VCFileViewer.FileViewerSelection;
}

export class HitNavigationStore extends VSSStore.Store {
    private _state: HitNavigationState = { activeHighlightedAdornmentIndex: -1, cursorPosition: resetCursorPosition() } as HitNavigationState;
    private _hasSelectionChangeOnPrevNav: boolean = false;

    public get state(): HitNavigationState {
        return this._state;
    }

    public updateHitNavigation = (
        fileContent: _VCLegacyContracts.FileContent,
        hits: _SearchSharedContracts.Hit[],
        itemIndex: number,
        resultsCount: number): void => {
        const adornments = getHitHighlights(hits, fileContent.content);
        let highlightedAdornmentIndex = -1;

        if (adornments.length) {
            // If result selection has switched after prev hit navigation, highlight the last search hit else the first hit.
            if (this._hasSelectionChangeOnPrevNav) {
                highlightedAdornmentIndex = adornments.length - 1;
                this._hasSelectionChangeOnPrevNav = false;
            }
            else {
                highlightedAdornmentIndex = 0;
            }

            updateDecorationAt(adornments, highlightedAdornmentIndex);
        }

        this._state.cursorPosition = resetCursorPosition();
        this._state.activeHighlightedAdornmentIndex = highlightedAdornmentIndex;
        this._state.hitAdornments = adornments;

        this.updateHitNavigationActionButtonState(itemIndex, highlightedAdornmentIndex, resultsCount, this._state.cursorPosition, adornments);

        this.emitChanged();
    }

    public updateCursorPosition = (
        payload: CursorPositionChangePayload,
        itemIndex: number,
        resultsCount: number): void => {
        const cursorPosition = payload.cursorPosition;
        const { hitAdornments, activeHighlightedAdornmentIndex } = this._state;

        if (hitAdornments && hasCursorPositionUpdated(cursorPosition, this._state.cursorPosition)) {
            // If there is change in cursor position, update the cursor state and the hit button state.
            this._state.cursorPosition = cursorPosition;

            if (activeHighlightedAdornmentIndex >= 0) {
                const clonedAdornments = cloneAdornments(hitAdornments);
                updateDecorationAt(clonedAdornments, activeHighlightedAdornmentIndex, true)
                this._state.hitAdornments = clonedAdornments;
                this._state.activeHighlightedAdornmentIndex = -1;
            }

            this.updateHitNavigationActionButtonState(itemIndex, -1, resultsCount, this._state.cursorPosition, this._state.hitAdornments);

            this.emitChanged();
        }
    }

    public incrementActiveHighlightIndex = (itemIndex: number, resultsCount: number): void => {
        const { hitAdornments, activeHighlightedAdornmentIndex, cursorPosition } = this._state;
        if (hitAdornments) {
            const length: number = hitAdornments.length;
            let nextAdornmentIndex: number;
            if (activeHighlightedAdornmentIndex < 0) {
                // Find the next closest hit if the cursor position is present in the viewer.
                const cursorLine = cursorPosition.positionLineNumber;
                const cursorColumn = cursorPosition.positionColumn;
                for (let idx = 0; idx < length; idx++) {
                    const hit = hitAdornments[idx];
                    if (hit.startLine > cursorLine ||
                        hit.startLine === cursorLine && hit.startColumn > cursorColumn) {
                        nextAdornmentIndex = idx;
                        break;
                    }
                }
            }
            else {
                nextAdornmentIndex = activeHighlightedAdornmentIndex + 1;
            }

            this.updateAdornmentsOnHitNav(nextAdornmentIndex, itemIndex, resultsCount);
        }
    }

    public setSelectionChangeOnHitNav = (): void => {
        this._hasSelectionChangeOnPrevNav = true;
    }

    public decrementActiveIndexHighlight = (itemIndex: number, resultsCount: number): void => {
        const { hitAdornments, activeHighlightedAdornmentIndex, cursorPosition } = this._state;
        if (hitAdornments) {
            const length: number = hitAdornments.length;
            let prevAdornmentIndex: number;
            if (activeHighlightedAdornmentIndex < 0) {
                // Find the prev closest hit if the cursor position is present in the viewer.
                const cursorLine = cursorPosition.positionLineNumber;
                const cursorColumn = cursorPosition.positionColumn;
                for (let idx = length - 1; idx >= 0; idx--) {
                    const hit = hitAdornments[idx];
                    if (hit.endLine < cursorLine ||
                        hit.endLine === cursorLine && hit.endColumn < cursorColumn) {
                        prevAdornmentIndex = idx;
                        break;
                    }
                }
            }
            else {
                prevAdornmentIndex = activeHighlightedAdornmentIndex - 1;
            }

            this.updateAdornmentsOnHitNav(prevAdornmentIndex, itemIndex, resultsCount);
        }
    }

    public reset = (): void => {
        this._state = { activeHighlightedAdornmentIndex: -1, cursorPosition: resetCursorPosition() } as HitNavigationState;
        this.emitChanged();
    }

    /**
     * Update the previous and next adornments on hit navigation
     * @param updatedActiveHighlightIndex
     * @param selectedResult
     * @param allResults
     */
    private updateAdornmentsOnHitNav(
        updatedActiveHighlightIndex: number,
        itemIndex: number,
        resultsCount: number): void {
        const { hitAdornments, activeHighlightedAdornmentIndex, cursorPosition } = this._state,
            clonedAdornments = cloneAdornments(hitAdornments);

        if (activeHighlightedAdornmentIndex >= 0) {
            updateDecorationAt(clonedAdornments, activeHighlightedAdornmentIndex, true);
        }

        if (updatedActiveHighlightIndex >= 0) {
            updateDecorationAt(clonedAdornments, updatedActiveHighlightIndex);
        }

        this._state.activeHighlightedAdornmentIndex = updatedActiveHighlightIndex;
        this._state.hitAdornments = clonedAdornments;
        this._state.cursorPosition = resetCursorPosition();

        this.updateHitNavigationActionButtonState(itemIndex, updatedActiveHighlightIndex, resultsCount, this._state.cursorPosition, clonedAdornments);

        this.emitChanged();
    }

    private updateHitNavigationActionButtonState = (
        itemIndex: number,
        highlightedAdornmentIndex: number,
        resultsCount: number,
        cursorPos: _VCFileViewer.FileViewerSelection,
        hits: _AdornmentCommon.DecorationAdornment[]): void => {
        const totalHighlights = hits.length;

        let cursorBeforeFirstHit = false,
            cursorAfterLastHit = false;

        if (totalHighlights) {
            cursorBeforeFirstHit = isCursorBeforeFirstHit(cursorPos, hits[0]);
            cursorAfterLastHit = isCursorAfterLastHit(cursorPos, hits[totalHighlights - 1]);
        }

        this._state.prevHitNavigationEnabled = itemIndex > 0 ||
            (totalHighlights > 0 &&
                (highlightedAdornmentIndex > 0 ||
                    !cursorBeforeFirstHit));

        this._state.nextHitNavigationEnabled = itemIndex < resultsCount - 1 ||
            (totalHighlights > 0 &&
                (highlightedAdornmentIndex !== -1 && highlightedAdornmentIndex < totalHighlights - 1 ||
                    highlightedAdornmentIndex === -1 && !cursorAfterLastHit));
    }
}

/**
 * Compares the old and new curosr position
 * @param oldCursorPosition
 * @param newCursorPosition
 */
function hasCursorPositionUpdated(oldCursorPosition: _VCFileViewer.FileViewerSelection, newCursorPosition: _VCFileViewer.FileViewerSelection): boolean {
    return oldCursorPosition.positionColumn !== newCursorPosition.positionColumn ||
        oldCursorPosition.positionLineNumber !== newCursorPosition.positionLineNumber;
}

function resetCursorPosition(): _VCFileViewer.FileViewerSelection {
    return {
        positionColumn: 0,
        positionLineNumber: 0,
        endColumn: 0,
        endLineNumber: 0,
        startColumn: 0,
        startLineNumber: 0
    }
}

export function isPositionAtFileEnd(
    totalHighlights: number,
    activeHighlightIndex: number,
    cursorPosition: _VCFileViewer.FileViewerSelection,
    lastHighlight: _AdornmentCommon.DecorationAdornment): boolean {
    return (activeHighlightIndex === -1 &&
        isCursorAfterLastHit(cursorPosition, lastHighlight)) ||
        totalHighlights === activeHighlightIndex + 1;
}

export function isPositionAtFileStart(
    activeHighlightIndex: number,
    cursorPosition: _VCFileViewer.FileViewerSelection,
    firstHighlight: _AdornmentCommon.DecorationAdornment): boolean {
    return activeHighlightIndex === 0 || (
        activeHighlightIndex === -1 &&
        isCursorBeforeFirstHit(cursorPosition, firstHighlight));
}

function isCursorAfterLastHit(
    cursorPos: _VCFileViewer.FileViewerSelection,
    lastHighlight: _AdornmentCommon.DecorationAdornment): boolean {
    const lastHitLine = lastHighlight.startLine;
    const lastHitColumn = lastHighlight.startColumn;

    return cursorPos.positionLineNumber > lastHitLine ||
        (cursorPos.positionLineNumber === lastHitLine &&
            cursorPos.positionColumn >= lastHitColumn);
}

function isCursorBeforeFirstHit(
    cursorPos: _VCFileViewer.FileViewerSelection,
    firstHighlight: _AdornmentCommon.DecorationAdornment): boolean {
    const firstHitLine = firstHighlight.endLine;
    const firstHitColumn = firstHighlight.endColumn;

    return cursorPos.positionLineNumber < firstHitLine ||
        (cursorPos.positionLineNumber === firstHitLine &&
            cursorPos.positionColumn <= firstHitColumn);
}

function cloneAdornments(adornments: _AdornmentCommon.DecorationAdornment[]): _AdornmentCommon.DecorationAdornment[] {
    const newAdornments = adornments.map(a => Object.assign({}, a));

    return newAdornments;
}

function updateDecorationAt(decorations: _AdornmentCommon.DecorationAdornment[], index: number, reset?: boolean): void {
    decorations[index].scrollToAdornment = !reset;
    decorations[index].className = !reset ? Constants.SelectedHit : Constants.HitHightedLineCssClass;
}