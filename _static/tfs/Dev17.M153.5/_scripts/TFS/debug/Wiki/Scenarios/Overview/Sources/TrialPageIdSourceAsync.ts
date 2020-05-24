import * as Q from "q";
import * as VSS from "VSS/VSS";
import * as PageIdSource_Async from "Wiki/Scenarios/Overview/Sources/TrialPageIdSource";

// Do NOT Productize
// This and the underlying source is only used for testing purpose
// This should be removed when we get feature UX
export class TrialPageIdSourceAsync {
    private _pageIdSourcePromise: IPromise<PageIdSource_Async.TrialPageIdSource>;

    public getWikiPageIds(wikiId: string, wikiVersion: string, pagePath: string): IPromise<any> {
        const deferred = Q.defer<any>();

        this._getPageIdSourcePromise().then(
            (pageIdSource: PageIdSource_Async.TrialPageIdSource) => {
                pageIdSource.getWikiPageIds(wikiId, wikiVersion, pagePath).then(deferred.resolve, deferred.reject);
            });

        return deferred.promise;
    }

    private _getPageIdSourcePromise(): IPromise<PageIdSource_Async.TrialPageIdSource> {
        if (!this._pageIdSourcePromise) {
            this._pageIdSourcePromise = VSS.requireModules(["Wiki/Scenarios/Overview/Sources/TrialPageIdSource"]).spread(
                (pageIdSourceModule: typeof PageIdSource_Async) => new PageIdSource_Async.TrialPageIdSource());
        }

        return this._pageIdSourcePromise;
    }
}