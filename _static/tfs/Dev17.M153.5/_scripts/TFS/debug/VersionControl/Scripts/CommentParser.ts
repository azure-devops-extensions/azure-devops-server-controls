import Utils_String = require("VSS/Utils/String");
import VCResources = require("VersionControl/Scripts/Resources/TFS.Resources.VersionControl");

export interface ParseCommentResult {
    text: string;
    remaining: string;

    /**
     * Whether or not the string in `text` represents all the text leading up to
     * a newline or if it `remaining` contains text from the same line as `text`
     * (i.e. the max line width was hit while determining what the text should be).
     */
    isTextTruncatedBeforeNewline: boolean;
}

/** 
 * Parses commit comments, typically to provide a single summary line and expandable remaining text.
 */
export class Parser {

    public static DefaultMaxLineWidth = 80;

    private static newLinePattern = /[\r\n\u2028\u2029]/;
    private static upToThreeLines = new RegExp(`.*(${Parser.newLinePattern.source}+.*(${Parser.newLinePattern.source}.*(${Parser.newLinePattern.source})?)?)?`, "m");
    private static onlyFirstLine = new RegExp(`^.*$`, "m");

    public static getUpToThreeLines(comment: string): string {
        const match = comment.match(Parser.upToThreeLines);
        return match[0];
    }

    public static getFirstLine(comment: string): string {
        comment = $.trim(comment || "");
        const match = comment.match(Parser.onlyFirstLine);
        return match[0];
    }

    public static getShortComment(comment: string, maxLineWidth?: number, includeEllipsis?: boolean): string {
        const line = Parser._getNextLine(comment, maxLineWidth || Parser.DefaultMaxLineWidth, includeEllipsis);
        if (includeEllipsis && line.remaining) {
            return line.text + "...";
        }
        else {
            return line.text;
        }
    }

    /**
     * Splits a comment into text and remaining text and returns information about both. Requires text
     * be restricted to a specific column width to determine what constitutes a line.
     */
    public static parseComment(comment: string, linesToSkip: number, linesToInclude: number, maxLineWidth: number = Parser.DefaultMaxLineWidth): ParseCommentResult {
        let text = "",
            nextLineResult: ParseCommentResult,
            originalComment = comment,
            isTextTruncatedBeforeNewline: boolean = false;

        for (let i = 0; i < linesToSkip && comment; i++) {
            comment = Parser._getNextLine(comment, maxLineWidth, true).remaining;
        }

        for (let i = 0; i < linesToInclude && comment; i++) {
            nextLineResult = Parser._getNextLine(comment, maxLineWidth, true);

            if (i > 0) {
                text += "\r\n";
            }

            text += nextLineResult.text;
            comment = nextLineResult.remaining;
            isTextTruncatedBeforeNewline = nextLineResult.isTextTruncatedBeforeNewline;
        }

        return {
            text: text,
            remaining: comment,
            isTextTruncatedBeforeNewline
        };
    }

    public static getChangeListDescription(changeList: any, useComment: boolean, maxCommentLength?: number) {

        let description = "";

        if (useComment && changeList.comment) {
            description = Parser.getShortComment(changeList.comment, maxCommentLength);
        }

        if (!description) {

            if (changeList.shelvesetName) {
                description = Utils_String.format(VCResources.ShelvesetDetailsTitle, changeList.shelvesetName);
            }
            else if (changeList.commitId) {
                description = Utils_String.format(VCResources.CommitDetailsTitle, changeList.commitId.short);
            }
            else if (changeList.changesetId) {
                description = Utils_String.format(VCResources.ChangesetDetailsTitle, changeList.changesetId);
            }
        }

        return description;
    }

    private static _getNextLine(comment: string, maxLineWidth: number, includeRemaining: boolean): ParseCommentResult {

        let firstLine = "",
            remaining = "",
            index = 0,
            lastWhitespaceIndex = 0,
            len: number,
            char: string,
            isTextTruncatedBeforeNewline = false,
            truncatedToLastWhitespaceIndex = false;

        comment = $.trim(comment || "");
        if (comment) {

            len = comment.length;
            while (index < maxLineWidth && index < len) {
                char = comment[index];
                if (Parser.newLinePattern.test(char)) {
                    break;
                }
                else {
                    if (/\s/.test(char)) {
                        lastWhitespaceIndex = index;
                    }
                    index++;
                }
            }

            if (index < len && index === maxLineWidth && lastWhitespaceIndex > 0) {
                index = lastWhitespaceIndex + 1;
                truncatedToLastWhitespaceIndex = true;
            }

            firstLine = comment.substr(0, index);

            const remainingText = comment.substr(index);
            if (includeRemaining) {
                remaining = remainingText;
            }

            if (truncatedToLastWhitespaceIndex) {
                const nonWhitespaceThenNewlinePattern = new RegExp(`\\S+${Parser.newLinePattern.source}*`, "m");
                isTextTruncatedBeforeNewline = nonWhitespaceThenNewlinePattern.test(remainingText);
            }
        }

        return {
            text: firstLine,
            remaining,
            isTextTruncatedBeforeNewline
        };
    }

}