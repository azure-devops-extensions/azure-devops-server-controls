/// <reference types="jquery" />

import AdornmentCommon = require("Presentation/Scripts/TFS/TFS.Adornment.Common");
import VCFileViewer = require("VersionControl/Scripts/Controls/FileViewer");

export interface InlineLineAdornmentOptions {
    startColumn: number;
    endColumn: number;
}

export interface WholeLineAdornmentOptions {
    startLineNumber: number;
    endLineNumber: number;
    scrollTo?: boolean;
    style?: "plain" | "error";
    glyphMarginText?: string;
}

export interface LineAdornmentOptions extends InlineLineAdornmentOptions, WholeLineAdornmentOptions {
}

/**
 * A decoration adornment that is pre-styled to modify a whole, single line in the editor.
 */
export class FileViewerLineAdornment implements AdornmentCommon.DecorationAdornment {

    /**
     * Returns the multiple adornments that are needed to decorate the line.
     */
    public static create(options: LineAdornmentOptions) {
        let adornments: FileViewerLineAdornment[] = [];
            
        if (typeof options.startColumn !== "undefined" && typeof options.endColumn !== "undefined") {
            adornments.push(new FileViewerInlineLineAdornment({
                startLineNumber: options.startLineNumber,
                endLineNumber: options.endLineNumber,
                style: options.style,
                startColumn: options.startColumn,
                endColumn: options.endColumn
            }));
        }
        else {
            adornments.push(new FileViewerWholeLineLineAdornment({
                startLineNumber: options.startLineNumber,
                endLineNumber: options.endLineNumber,
                style: options.style,
                glyphMarginText: options.glyphMarginText
            }));
        }
        
        return adornments;
    }

    public adornmentType = AdornmentCommon.AdornmentType.DECORATION;
    public usingGlyphMargin = false;
    public glyphMarginText: string;
    
    // AdornmentCommon.DecorationAdornment properties
    public overviewRuler;
    public isOriginalSide = true;
    public startLine = 1;
    public endLine = 1;
    public startColumn = 1;
    public endColumn = 1;
    public isWholeLine: boolean;
    public actualClassName: string;
    public linesDecorationsClassName: string;
    public className: string;
    public glyphMarginClassName: string;
    public scrollToAdornment = true;

    protected lineNumber: number;
    protected style: string;
    
    protected static heatMapPosition = 1;  

    constructor(protected options: WholeLineAdornmentOptions) {
        this.lineNumber = options.startLineNumber;        
        this.startLine = options.startLineNumber;
        this.endLine = options.endLineNumber || options.startLineNumber;

        if (options.scrollTo) {
            this.scrollToAdornment = options.scrollTo;
        }

        this.style = (this.options.style || "").toLocaleLowerCase();
    }
}

export class FileViewerInlineLineAdornment extends FileViewerLineAdornment {
    constructor(options: InlineLineAdornmentOptions & WholeLineAdornmentOptions) {
        super(options);
        
        if (options.startColumn) {
            this.startColumn = options.startColumn;
        }
        
        if (options.endColumn) {
            this.endColumn = options.endColumn;
        }
        
        this.isWholeLine = false;
        this.className = "vc-line-inline-adornment";
        
        switch (this.style) {
            case "error":
                this.className += ".vc-adornment-style-error";
                break;            
            case "plain":
            default:
                this.className += ".vc-adornment-style-plain";
        }
    }
}

export class FileViewerWholeLineLineAdornment extends FileViewerLineAdornment {
    constructor(options: WholeLineAdornmentOptions) {
        super(options);
        
        this.isWholeLine = true;
        this.actualClassName = "vc-line-adornment";
        this.linesDecorationsClassName = "vc-line-lineNumber-adornment";
        this.overviewRuler = {
            color: "",
            position: FileViewerLineAdornment.heatMapPosition
        };
        
        switch (this.style) {
            case "error":
                this.usingGlyphMargin = true;
                this.glyphMarginClassName = 'vc-line-glyph-adornment bowtie-icon bowtie-status-failure';
                this.glyphMarginText = options.glyphMarginText;
                
                this.actualClassName += ".vc-adornment-style-error";
                this.linesDecorationsClassName += ".vc-adornment-style-error";
                this.overviewRuler.color = "red";
                break;            
            case "plain":
            default:
                this.actualClassName += ".vc-adornment-style-plain";
                this.linesDecorationsClassName += ".vc-adornment-style-plain";
                this.overviewRuler.color = "rgb(248, 238, 199)"; /* Should match .code-editor-host .vc-line-adornment.vc-adornment-style-plain background in CodeEditorPage.css */
        }
    }
}
