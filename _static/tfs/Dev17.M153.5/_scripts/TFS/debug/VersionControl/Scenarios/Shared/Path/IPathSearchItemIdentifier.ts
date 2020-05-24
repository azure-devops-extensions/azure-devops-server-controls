export enum PathSearchResultsType {
    inFolder,
    global
}

export interface PathSearchItemIdentifier {
    resultsType: PathSearchResultsType;
    itemIndex: number;
}