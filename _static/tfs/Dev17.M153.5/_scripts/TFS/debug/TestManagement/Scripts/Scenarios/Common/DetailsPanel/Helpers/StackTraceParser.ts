import {
    IFilePathData,
    IParsedStackTraceInfo,
} from "TestManagement/Scripts/Scenarios/Common/DetailsPanel/Sources/SourceInfoProviders/common";

export interface ILineColumnInfo {
    lineNumber: number;
    columnNumber: number;
}

export interface IPathInfo {
    isPath: boolean;
    isFullPath: boolean;
}

export class StackTraceParser {

    private result: IParsedStackTraceInfo[] = [];
    private static readonly winDrivePrefix = "[a-zA-Z]:";
    private static readonly winPathPrefix = "(" + StackTraceParser.winDrivePrefix + "|\\.\\.?)";
    private static readonly winPathSeparatorClause = "(\\\\|\\/)";
    private static readonly winExcludedPathCharactersClause = "[^\\0<>\\?\\|\\/\\s!$`&*()\\[\\]+'\":;]";
    /** A regex that matches paths in the form c:\foo, .\foo, ..\foo, foo\bar */
    private static readonly winLocalLinkClause = "((" + StackTraceParser.winPathPrefix
        + "|(" + StackTraceParser.winExcludedPathCharactersClause
        + ")+)?(" + StackTraceParser.winPathSeparatorClause + "("
        + StackTraceParser.winExcludedPathCharactersClause + ")+)+)";

    private static readonly lineAndColumnClause = [
        "((\\S*)\", line ((\\d+)( column (\\d+))?))", // "(file path)", line 45 column 25
        "((\\S*) on line ((\\d+)(, column (\\d+))?))", // (file path) on line 8, column 13
        "((\\S*):line ((\\d+)(, column (\\d+))?))", // (file path):line 8, column 13
        "(([^:\\s\\(\\)<>\'\"\\[\\]]*)(:(\\d+))?(:(\\d+))?)" // (file path):336, (file path):336:9
    ].join("|").replace(/ /g, "[${'\u00A0'} ]");

    // Changing any regex may effect this value, hence changes this as well if required.
    private winLineAndColumnMatchIndex = 12;

    // Each line and column clause have 6 groups (ie no. of expressions in round brackets)
    private lineAndColumnClauseGroupCount = 6;

    private static readonly linkPattern: RegExp = new RegExp(`${StackTraceParser.winLocalLinkClause}(${StackTraceParser.lineAndColumnClause})`);

    public parseStackTrace(stackTrace: string): IParsedStackTraceInfo[] {
        let stackTraceList = stackTrace.split("\n");
        return stackTraceList.map((stackTraceLine) => this.parseStackTraceLine(stackTraceLine));
    }

    private parseStackTraceLine(stackTraceLine: string): IParsedStackTraceInfo {
        // Trim initial white space 
        stackTraceLine = stackTraceLine.trim();

        let parsedStackTraceInfo: IParsedStackTraceInfo = {
            stackTrace: stackTraceLine,
            filePathData: null
        };

        let matches = StackTraceParser.linkPattern.exec(stackTraceLine);

        // No path found or can not create URl from it.
        if (matches) {

            let pathInfo = this._checkIfFilePathCanCreateUrl(matches);

            if (pathInfo.isPath) {

                let lineColumnInfo = this._extractLineAndColumnInfo(matches);
                let filePath = matches[1];
                let filePathdata: IFilePathData = {
                    filePath: filePath,
                    lineNumber: lineColumnInfo.lineNumber,
                    columnNumber: lineColumnInfo.columnNumber,
                    isFullPath: pathInfo.isFullPath
                };

                parsedStackTraceInfo.filePathData = filePathdata;
            }
        }

        return parsedStackTraceInfo;
    }

    // This function check if the parsed string is file path or not.
    // If string is file path then is it full path or not
    private _checkIfFilePathCanCreateUrl(matches: string[]): IPathInfo {
        let pathInfo: IPathInfo = {
            isPath: false,
            isFullPath: false
        };

        // if path is in the form "c:\file.txt", "..\file.txt", ".\file.txt" then
        // matches[3] will have "c:", ".." and "." repectively
        if (!matches[3]) {
            pathInfo.isPath = true;
            pathInfo.isFullPath = false;
            return pathInfo;
        }
        else {
            // check if path is in the form c:\foo, ..\foo
            let winPathprefix = "^(" + StackTraceParser.winDrivePrefix + "|\\.\\.)";
            let resxPattern = new RegExp(winPathprefix);

            // matches[3] has the prefixes.
            let resxMatches = resxPattern.exec(matches[3]);

            // resxMatches[1] will get filled if matches[3] will be in the form "c:\foo" and "..\foo"
            if (resxMatches && resxMatches[1]) {
                pathInfo.isPath = true;
                pathInfo.isFullPath = true;
                return pathInfo;
            }
            else {
                if (matches[1]) {
                    // matches[1] is the path and it is in the form ".\foo"
                    matches[1] = matches[1].substring(matches[3].length);
                    pathInfo.isPath = true;
                    pathInfo.isFullPath = false;
                    return pathInfo;
                }
                else {
                    // The parsed string is not a path
                    return pathInfo;
                }
            }
        }
    }

    private _extractLineAndColumnInfo(matches: string[]): ILineColumnInfo {
        let lineColumnInfo: ILineColumnInfo = {
            lineNumber: 1,
            columnNumber: 1
        };

        if (matches == null) {
            return lineColumnInfo;
        }


        let lineAndColumnClauseLength = StackTraceParser.lineAndColumnClause.length;
        for (let i = 0; i < lineAndColumnClauseLength; i++) {
            const lineMatchIndex = this.winLineAndColumnMatchIndex + (this.lineAndColumnClauseGroupCount * i);
            const rowNumber = matches[lineMatchIndex];
            if (rowNumber) {
                lineColumnInfo.lineNumber = parseInt(rowNumber, 10);

                // Check if column number exists
                const columnNumber = matches[lineMatchIndex + 2];
                if (columnNumber) {
                    lineColumnInfo.columnNumber = parseInt(columnNumber, 10);
                }
                break;
            }
        }

        return lineColumnInfo;
    }
}