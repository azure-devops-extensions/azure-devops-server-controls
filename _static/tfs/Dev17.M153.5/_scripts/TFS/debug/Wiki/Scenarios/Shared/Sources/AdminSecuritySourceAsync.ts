import * as Q from "q";
import * as VSS from "VSS/VSS";
import * as AdminSecuritySource_Async from "Wiki/Scenarios/Shared/Sources/AdminSecuritySource";

export class AdminSecuritySourceAsync {
    private _adminSecuritySourcePromise: IPromise<AdminSecuritySource_Async.AdminSecuritySource>;
    
    public getProjectWikiRepoId(): IPromise<string> {
        const deferred = Q.defer<string>();

        this._getAdminSecuritySourcePromise().then(
            (adminSecuritySource: AdminSecuritySource_Async.AdminSecuritySource) => {
                adminSecuritySource.getProjectWikiRepoId().then(deferred.resolve, deferred.reject);
            });

        return deferred.promise;
    }

    private _getAdminSecuritySourcePromise(): IPromise<AdminSecuritySource_Async.AdminSecuritySource> {
        if (!this._adminSecuritySourcePromise) {
            this._adminSecuritySourcePromise = VSS.requireModules(["Wiki/Scenarios/Shared/Sources/AdminSecuritySource"]).spread(
                (adminSecuritySourceModule: typeof AdminSecuritySource_Async) => new AdminSecuritySource_Async.AdminSecuritySource());
        }

        return this._adminSecuritySourcePromise;
    }
}