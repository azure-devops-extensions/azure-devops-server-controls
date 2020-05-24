import * as Q from "q";
import { ChangeList, ChangeQueryResults } from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";
import { RepositoryContext } from "VersionControl/Scripts/RepositoryContext";

export class ChangeListSource {

    constructor(private _repositoryContext: RepositoryContext) {
    }

    /**
     * Loads change list from json island
     * @param element jquery element to take json island from
     */
    public loadChangeListFromJsonIsland(element: JQuery): ChangeList {
        return this._repositoryContext.getClient()._getChangeListFromJsonIsland(element, false);
    }

    /**
     * Asynchronously fetches more changes for the given change list.
     * This will not be used for Git merge commit scenarios,
     * where we have to get the diff between merge commit and parent commit.
     */
    public loadMoreChanges(changeListVersion: string, maxChangesToInclude: number, skipCount: number)
        : IPromise<ChangeQueryResults> {

        const deferred = Q.defer<ChangeQueryResults>();

        this._repositoryContext.getClient().beginGetChangeListChanges(
            this._repositoryContext,
            changeListVersion,
            maxChangesToInclude,
            skipCount,
            (resultModel) => {
                deferred.resolve(resultModel);
            },
            (error: Error) => {
                deferred.reject(error);
            });

        return deferred.promise;
    }
}
