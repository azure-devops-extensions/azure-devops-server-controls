// Copyright (c) Microsoft Corporation. All rights reserved.

"use strict";

import ServerConstants = require("Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants");
import Context = require("Search/Scripts/Common/TFS.Search.Context");
import Ajax = require("Presentation/Scripts/TFS/TFS.Legacy.Ajax");
import Code_Contracts = require("Search/Scripts/Contracts/TFS.Search.Code.Contracts");
import Base_Contracts = require("Search/Scripts/Contracts/TFS.Search.Base.Contracts");
import Helpers = require("Search/Scripts/Common/TFS.Search.Helpers");
import Q = require("q");

export class Custom {
    public getData(): any {
        var editorOption = $.parseJSON($(".code-editor-options").html() || "{}");

        return editorOption;
    }

    public getContentAsync(params: any, success: any, failure: any): void {
        var scope = Context.SearchContext.getTfsContext().contextData.account.name,
            deferred = Q.defer<any>();
        var actionUrl: string = Context.SearchContext.getActionUrl("getFileContent");
        var branch: string;
        if (Helpers.Utils.isFeatureFlagEnabled(ServerConstants.FeatureAvailabilityFlags.WebAccessSearchUseContentHash)) {
            branch = params.contentId;
        } else {
            branch = params.branchName;
        }
        Ajax.getMSJSON(
            actionUrl,
            {
                scope: scope,
                projectName: params.projectName,
                repositoryName: params.repositoryName,
                branchName: branch,
                filePath: params.filePath
            },
            success,
            failure,
            {});
    }

    public getContentDownloadUrl(params: any): string {
        var scope = Context.SearchContext.getTfsContext().contextData.account.name;

        return Helpers.SearchUrls.GetSourceDeportFileDownloadUrl("getFileDownload",
            scope,
            params.projectName,
            params.repositoryName,
            // Passing content hash for branch name.
            params.contentId,
            params.filePath,
            params.fileName,
            params.contentId,
            params.contentsOnly);
    } 

    public getHitAdorments(fileContent: string, hits: Array<Base_Contracts.Hit>): Array<any>{
        var hitAdorments: Array<any> = new Array<any>(),
            lineOffsetDetails: Array<any> = this.computeFileContentOffsets(fileContent);
        if (hits) {
            hitAdorments = this.getHitHighlightingAdornments(lineOffsetDetails, hits);
        }

        return hitAdorments;
    }

    /**
    * Not optimized.
    **/
    private computeFileContentOffsets(fileContent: string): Array<any> {
        var lineOffsets: Array<any> = new Array<any>();
        var currentPosition: number = 0;
        var newLine: string = '\n';

        while (currentPosition < fileContent.length) {
            var lineEndPosition: number = fileContent.indexOf(newLine, currentPosition);
            var currentline = {
                startOffset: currentPosition,
                endOffset: 0
            };

            if (lineEndPosition > -1) {
                currentline.endOffset = lineEndPosition;
                lineOffsets.push(currentline);
                currentPosition = lineEndPosition + 1; // Skip the new line
            }
            else { // Possibble that last line has no newline
                currentline.endOffset = fileContent.length;
                lineOffsets.push(currentline);
                break;
            }
        }

        return lineOffsets;
    }

    private getHitHighlightingAdornments(lineOffsets: Array<any>, hits: Base_Contracts.Hit[])
        : any {
        var currentHighlightingAdornments = [];
        var currentLineIndex: number = 0;

        for (var hitIndex in hits) {

            currentLineIndex = this.getLineIndexByHitOffset(hits[hitIndex].charOffset, lineOffsets, currentLineIndex);

            if (currentLineIndex === -1) {
                // Reached EOF or truncated file content due to big size
                break;
            }
            else {
                var adornmentLines: Array<any> = this.convertHitOffsetIntoLineDetails(hits[hitIndex], lineOffsets, currentLineIndex);
               
                for (var line in adornmentLines) {
                    currentHighlightingAdornments.push({
                        "hitsDefinition": {
                            "startLineNumber": adornmentLines[line].startLineNumber,
                            "endLineNumber": adornmentLines[line].endLineNumber,
                            "startColumn": adornmentLines[line].startColumn,
                            "endColumn": adornmentLines[line].endColumn
                        },
                        "hitsCss": {
                            "inlineClassName": "search-hit-highlighted-line"
                        }
                    });
                }
            }
        }

        return currentHighlightingAdornments;
    }

    private getLineIndexByHitOffset(hitOffset: number, lineOffsets: Array<any>, startingIndex: number): number {

        for (var lineIndex = startingIndex; lineIndex < lineOffsets.length; lineIndex++) {
            if (hitOffset < lineOffsets[lineIndex].endOffset) {
                return lineIndex;
            }
        }
        return -1;
    }

    private convertHitOffsetIntoLineDetails(hit: Base_Contracts.Hit, lineOffsets: Array<any>, lineIndex: number): Array<any> {
        var linesToHighlight: Array<any> = new Array<any>();
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

            linesToHighlight.push({
                "startColumn": startColumn,
                "endColumn": endColumn,
                "startLineNumber": lineIndex + 1,
                "endLineNumber": lineIndex + 1
            });

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
                linesToHighlight.push({
                    "startColumn": startColumn,
                    "endColumn": endColumn,
                    "startLineNumber": lineIndex + 1,
                    "endLineNumber": lineIndex + 1
                });
            }
        }

        return linesToHighlight;
    }
}
