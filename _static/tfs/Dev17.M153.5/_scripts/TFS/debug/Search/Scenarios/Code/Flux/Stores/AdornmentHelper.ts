import * as _AdornmentCommon from "Presentation/Scripts/TFS/TFS.Adornment.Common";
import * as _SearchSharedContracts from "Search/Scripts/Generated/Search.SharedLegacy.Contracts";
import * as SearchConstants from "Search/Scenarios/Code/Constants";

export interface LineOffsetDetails {
    startOffset: number;

    endOffset: number;
}

export class AdornmentLineDetails {
    startColumn: number;

    endColumn: number;

    lineNumber: number;
}

export function getHitHighlights(contentHits: _SearchSharedContracts.Hit[], fileText: String): _AdornmentCommon.DecorationAdornment[] {
    const numberOfHits: number = contentHits.length;
    let adornments: _AdornmentCommon.DecorationAdornment[] = [];

    if (numberOfHits > 0 && fileText && fileText.length > 0) {
        const lastHitEndOffset: number = contentHits[numberOfHits - 1].charOffset + contentHits[numberOfHits - 1].length;
        const lineOffsets: LineOffsetDetails[] = computeFileContentOffsets(fileText, lastHitEndOffset);

        adornments = getHitHighlightingAdornments(lineOffsets, contentHits);
    }

    return adornments;
}

/**
* Converts file content into line offset, array index would work as line number
* File content are read till the last hit offset is covered (ie. avoid reading entire file if not needed)
*/
function computeFileContentOffsets(fileContent: String, lastHitEndOffset: number): LineOffsetDetails[] {
    let lineOffsets: LineOffsetDetails[] = [],
        currentPosition: number = 0,
        lineFeedMarker: string = '\n',
        carriageReturnMarker: string = '\r',
        lineFeedPosition: number = 0,
        carriageReturnPosition: number = 0;

    while (currentPosition < lastHitEndOffset) {
        if (lineFeedPosition >= 0 && currentPosition >= lineFeedPosition) {
            lineFeedPosition = fileContent.indexOf(lineFeedMarker, currentPosition);
        }

        if (carriageReturnPosition >= 0 && currentPosition >= carriageReturnPosition) {
            carriageReturnPosition = fileContent.indexOf(carriageReturnMarker, currentPosition);
        }

        let currentline: LineOffsetDetails = { startOffset: currentPosition, endOffset: 0 };

        if (carriageReturnPosition < 0 && lineFeedPosition < 0) {
            // Possibbly last line, has no newline marker
            currentline.endOffset = fileContent.length; // read till end
            lineOffsets.push(currentline);
            break;
        }

        // Current line has a line end marker - CR or CRLF (Windows style) or LF (Unix style)
        let lineEndMarkerPosition: number = 0;

        if (lineFeedPosition > -1 && carriageReturnPosition > -1) {
            if (carriageReturnPosition + 1 === lineFeedPosition) {
                // Windows style (CRLF) new line marker found
                lineEndMarkerPosition = lineFeedPosition;
            }
            else {
                lineEndMarkerPosition = Math.min(lineFeedPosition, carriageReturnPosition);
            }
        }
        else {
            lineEndMarkerPosition = Math.max(lineFeedPosition, carriageReturnPosition);
        }

        currentline.endOffset = lineEndMarkerPosition;
        lineOffsets.push(currentline);
        currentPosition = lineEndMarkerPosition + 1; // Skip the new line
    }

    return lineOffsets;
}

function getHitHighlightingAdornments(lineOffsets: LineOffsetDetails[], hits: _SearchSharedContracts.Hit[]): _AdornmentCommon.DecorationAdornment[] {
    let currentHighlightingAdornments = [],
        currentLineIndex: number = 0,
        scrollToAdornment: boolean = false;

    for (let hit of hits) {
        currentLineIndex = getLineIndexByHitOffset(hit.charOffset, lineOffsets, currentLineIndex);
        if (currentLineIndex >= 0) {
            const adornmentLines: AdornmentLineDetails[] = convertHitOffsetIntoLineDetails(hit, lineOffsets, currentLineIndex);
            currentHighlightingAdornments = [
                ...currentHighlightingAdornments,
                ...adornmentLines.map((adornmentLine, idx) => {
                    const { endColumn, startColumn, lineNumber } = adornmentLine;
                    return createAdornment(lineNumber, startColumn, endColumn, false, SearchConstants.HitHightedLineCssClass);
                })];
        } 
        else {
            // End of file has been reached. 
            break;
        }
    };

    return currentHighlightingAdornments;
}

/**
 * Creates decoration adornment
 */
function createAdornment(lineNumber: number, startColumn: number, endColumn: number, scrollToAdornment: boolean, cssClass: string): _AdornmentCommon.DecorationAdornment {
    const heatMapColor: string = "#F58B1F";
    const heatMapPosition: number = 1; // left = 1, center = 2, right = 4, full = 7

    return <_AdornmentCommon.DecorationAdornment>{
        adornmentType: _AdornmentCommon.AdornmentType.DECORATION,
        startLine: lineNumber,
        endLine: lineNumber,
        startColumn: startColumn,
        endColumn: endColumn,
        isOriginalSide: true,
        className: cssClass,
        scrollToAdornment: scrollToAdornment,
        overviewRuler: { color: heatMapColor, position: heatMapPosition }
    };
}

/**
 * Returns details of lines that needs to be highlighted for the current hit (a hit could span multiple lines)
 */
function convertHitOffsetIntoLineDetails(hit: _SearchSharedContracts.Hit, lineOffsets: LineOffsetDetails[], lineIndex: number): AdornmentLineDetails[] {
    let linesToHighlight: AdornmentLineDetails[] = [],
        spansMoreLines: boolean = false,
        currentHitEndOffset: number = 0,
        startColumn: number = 0,
        endColumn: number = 0,
        endOffset: number = 0;

    if (lineIndex < lineOffsets.length) {
        currentHitEndOffset = hit.charOffset + hit.length - 1;
        startColumn = hit.charOffset - lineOffsets[lineIndex].startOffset + 1;

        // Process the first line
        if (currentHitEndOffset < lineOffsets[lineIndex].endOffset) {
            endColumn = startColumn + hit.length;
        }
        else {
            // Take till end of line
            endColumn = lineOffsets[lineIndex].endOffset - lineOffsets[lineIndex].startOffset + 1;
            spansMoreLines = true;
        }

        linesToHighlight.push({ startColumn, endColumn, lineNumber: lineIndex + 1 });

        // Process spanned lines
        while (spansMoreLines === true && lineIndex < lineOffsets.length) {
            startColumn = 1;
            endOffset = 0;
            if (currentHitEndOffset < lineOffsets[lineIndex].endOffset) {
                endOffset = currentHitEndOffset - lineOffsets[lineIndex].startOffset + 1;
                //as the column number that we pass are started with 1 and not 0
                endColumn = endOffset + 1;
                spansMoreLines = false;
            }
            else {
                // Take the entire line
                endColumn = lineOffsets[lineIndex].endOffset - lineOffsets[lineIndex].startOffset + 1;
            }

            linesToHighlight.push({ startColumn, endColumn, lineNumber: lineIndex + 1 });
            lineIndex++;
        }
    }

    return linesToHighlight;
}

function getLineIndexByHitOffset(hitOffset: number, lineOffsets: LineOffsetDetails[], startingIndex: number): number {
    for (let lineIndex = startingIndex; lineIndex < lineOffsets.length; lineIndex++) {
        if (hitOffset < lineOffsets[lineIndex].endOffset) {
            return lineIndex;
        }
    }
    // No matching line is found. (e.g. stale index)
    return -1;
}