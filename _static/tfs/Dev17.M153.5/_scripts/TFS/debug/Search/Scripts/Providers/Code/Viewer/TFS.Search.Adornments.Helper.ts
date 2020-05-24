// Copyright (c) Microsoft Corporation. All rights reserved.

"use strict";

import Base_Contracts = require("Search/Scripts/Contracts/TFS.Search.Base.Contracts");
import AdornmentCommon = require("Presentation/Scripts/TFS/TFS.Adornment.Common");
import Search_Constants = require("Search/Scripts/Common/TFS.Search.Constants");

export class AdormentsHelper {
    /**
    * Decorates the hits
    */
    public static getHitHightlights(hits: Base_Contracts.Hit[], fileContent: string): any {
        var hitHighlightingGroup = "search";
        var numberOfHits: number = hits.length;
        var adornments: any;

        if (numberOfHits > 0 && fileContent && fileContent.length > 0) {
            var lastHitEndOffset: number = hits[numberOfHits - 1].charOffset + hits[numberOfHits - 1].length;
            var lineOffsets: LineOffsetDetails[] = this.computeFileContentOffsets(fileContent, lastHitEndOffset);

            // Get adornments
            adornments = this.getHitHighlightingAdornments(lineOffsets, hits);
            var highlightingAdornments: AdornmentCommon.DecorationAdornment[] = adornments.highlightingAdornments;

            // Setting scrollToAdornment of first hit to false after the file is rendered
            if (highlightingAdornments && highlightingAdornments.length > 0) {
                highlightingAdornments[0].scrollToAdornment = true;
                highlightingAdornments[0].className = Search_Constants.SearchConstants.SelectedHit;
            }
        }

        return adornments;
    }

    /**
    * Creates decoration adornment
    */
    private static createAdornment(lineNumber: number, startColumn: number, endColumn: number, scrollToAdornment: boolean, cssClass: string): any {
        var heatMapColor: string = "#F58B1F";
        var heatMapPosition: number = 1; // left = 1, center = 2, right = 4, full = 7

        return <AdornmentCommon.DecorationAdornment> {
            adornmentType: AdornmentCommon.AdornmentType.DECORATION,
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

    public static getHitHighlightingAdornments(lineOffsets: LineOffsetDetails[], hits: Base_Contracts.Hit[])
        : any {
        var currentHighlightingAdornments = [];
        var hitsNavigationAdornments = [];
        var currentLineIndex: number = 0;
        var scrollToAdornment: boolean = false;
        var cssClass: string = Search_Constants.SearchConstants.HitHightedLineCssClass;

        for (var hitIndex in hits) {

            currentLineIndex = this.getLineIndexByHitOffset(hits[hitIndex].charOffset, lineOffsets, currentLineIndex);

            if (currentLineIndex === -1) {
                // Reached EOF or truncated file content due to big size
                break;
            }
            else {
                var adornmentLines: AdornmentLineDetails[] = this.convertHitOffsetIntoLineDetails(hits[hitIndex], lineOffsets, currentLineIndex);
                $.merge(hitsNavigationAdornments, adornmentLines);

                for (var line in adornmentLines) {
                    currentHighlightingAdornments.push(this.createAdornment(adornmentLines[line].lineNumber, adornmentLines[line].startColumn, adornmentLines[line].endColumn, scrollToAdornment, cssClass));
                }
            }
        }

        return { highlightingAdornments: currentHighlightingAdornments, navigationAdornments: hitsNavigationAdornments };
    }

    /**
     * Returns details of lines that needs to be highlighted for the current hit (a hit could span multiple lines)
     */
    private static convertHitOffsetIntoLineDetails(hit: Base_Contracts.Hit, lineOffsets: LineOffsetDetails[], lineIndex: number): AdornmentLineDetails[] {
        var linesToHighlight: AdornmentLineDetails[] = new Array<AdornmentLineDetails>();
        var spansMoreLines: boolean = false;
        var currentHitEndOffset: number = 0;
        var startColumn: number = 0;
        var endColumn: number = 0;
        var endOffset: number = 0;

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

            linesToHighlight.push(new AdornmentLineDetails(startColumn, endColumn, lineIndex + 1));

            // Process spanned lines
            while (spansMoreLines === true && ++lineIndex < lineOffsets.length) {
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
                linesToHighlight.push(new AdornmentLineDetails(startColumn, endColumn, lineIndex + 1));
            }
        }

        return linesToHighlight;
    }

    /**
     * Returns line index on which the hit is found.
     * -1 is returned if no matching line is found (ex. due to stale index)
     * TODO: line lookup is linear. To make it O(1), we need to find a right key to use (hit offset vs line offsets).
     *       Revisit and convert this into a dictionary lookup.
     */
    private static getLineIndexByHitOffset(hitOffset: number, lineOffsets: LineOffsetDetails[], startingIndex: number): number {

        for (var lineIndex = startingIndex; lineIndex < lineOffsets.length; lineIndex++) {
            if (hitOffset < lineOffsets[lineIndex].endOffset) {
                return lineIndex;
            }
        }
        return -1;
    }

    /**
    * Converts file content into line offset, array index would work as line number
    * File content are read till the last hit offset is covered (ie. avoid reading entire file if not needed)
    */
    public static computeFileContentOffsets(fileContent: string, lastHitEndOffset): LineOffsetDetails[] {
        var lineOffsets: LineOffsetDetails[] = new Array<LineOffsetDetails>();
        var currentPosition: number = 0;
        var lineFeedMarker: string = '\n';
        var carriageReturnMarker: string = '\r';
        var lineFeedPosition: number = 0;
        var carriageReturnPosition: number = 0;

        while (currentPosition < lastHitEndOffset) {
            if (lineFeedPosition >= 0 && currentPosition >= lineFeedPosition) {
                lineFeedPosition = fileContent.indexOf(lineFeedMarker, currentPosition);
            }
            if (carriageReturnPosition >= 0 && currentPosition >= carriageReturnPosition) {
                carriageReturnPosition = fileContent.indexOf(carriageReturnMarker, currentPosition);
            }

            var currentline = new LineOffsetDetails(currentPosition, 0);

            if (carriageReturnPosition < 0 && lineFeedPosition < 0) {
                // Possibbly last line, has no newline marker
                currentline.endOffset = fileContent.length; // read till end
                lineOffsets.push(currentline);
                break;
            }

            // Current line has a line end marker - CR or CRLF (Windows style) or LF (Unix style)
            var lineEndMarkerPosition: number = 0;

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
}

/**
 * Highlighting adornment region representation
 */
export class AdornmentLineDetails {
    public startColumn: number;
    public endColumn: number;
    public lineNumber: number;

    constructor(startColumn: number, endColumn: number, lineNumber: number) {
        this.startColumn = startColumn;
        this.endColumn = endColumn;
        this.lineNumber = lineNumber;
    }
}

/**
 * Previewed file is a stream of text comprising multiple line separated by "\n".
 * This structure defines a line in terms of line number and offsets
 */
export class LineOffsetDetails {
    public startOffset: number;
    public endOffset: number;

    constructor(startOffset: number, endOffset: number) {
        this.startOffset = startOffset;
        this.endOffset = endOffset;
    }
}