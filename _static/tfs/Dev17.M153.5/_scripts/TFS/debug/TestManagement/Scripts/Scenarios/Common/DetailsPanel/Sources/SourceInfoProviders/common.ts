export enum RepositoryTypes {
    TfsVersionControl = "tfsversioncontrol",
    TfsGit = "tfsgit"
}

export interface IFilePathData{
    filePath: string;
    lineNumber: number;
    columnNumber: number;
    isFullPath: boolean;
}

export interface IParsedStackTraceInfo {
    stackTrace: string;
    filePathData: IFilePathData;
}

export interface ILinkedStackTraceInfo {
    stackTrace: string;
    url: string;
}

export interface ISourceInfoProvider {
    getKey(): string;
    constructFilePath(parsedStackTraceInfo: IParsedStackTraceInfo[]): Promise<ILinkedStackTraceInfo[]>;
} 
