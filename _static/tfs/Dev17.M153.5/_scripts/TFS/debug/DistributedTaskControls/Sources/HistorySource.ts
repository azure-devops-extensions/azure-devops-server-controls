
export interface IHistorySource {
    getDefinitionRevision(definitionId: number | string, revision: number): IPromise<string>;
}