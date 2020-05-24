import Ajax = require("Presentation/Scripts/TFS/TFS.Legacy.Ajax");
import Q = require("q");
import TFS_OM_Common = require("Presentation/Scripts/TFS/TFS.OM.Common");
import TFS_Service = require("Presentation/Scripts/TFS/TFS.Service");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import VSS_Utils_Core = require("VSS/Utils/Core");

import Contracts = require("Agile/Scripts/Card/CardsAnnotationsTestAnnotationContracts");

export class TcmHttpClient extends TFS_Service.TfsService {
    public beginGetSuites(teamId: string, requirementIds: number[]): IPromise<Contracts.ITestSuite[]> {
        return this._ajaxPost<Contracts.ITestSuite[]>(teamId, "GetWitTestsForKanbanBoard", {
            userStoryIds: VSS_Utils_Core.stringifyMSJSON(requirementIds)
        });
    }

    public beginSetOutcome(teamId: string, suiteId: number, planId: number, pointId: number, outcome: Contracts.TestOutcome): IPromise<void> {

        if (outcome === Contracts.TestOutcome.Active) {

            return this._ajaxPost<void>(teamId, "ResetTestPoints", {
                planId: planId,
                testPointIds: [pointId]
            });

        }
        else {

            return this._ajaxPost<void>(teamId, "BulkMarkTestPoints", {
                planId: planId,
                suiteId: suiteId,
                testPointIds: [pointId],
                outcome: Contracts.TestOutcomeHelper.toByte(outcome),
                useTeamSettings: true
            });
        }
    }

    public beginRefreshSuite(teamId: string, requirementId: number, planId: number, suiteId: number): IPromise<Contracts.ITestSuite> {

        return this._ajaxPost<Contracts.ITestSuite>(teamId, "AddWitTestCasesToRequirementSuite", {
            requirementId: requirementId,
            planId: planId,
            suiteId: suiteId
        });

    }

    private _ajaxPost<T>(teamId: string, method: string, requestParams?: any, ajaxOptions?: any): IPromise<T> {
        var d = Q.defer<T>();
        Ajax.postMSJSON(this._getApiLocation(teamId, method), requestParams, d.resolve, d.reject, ajaxOptions);
        return d.promise;
    }

    private _getApiLocation(teamId: string, action?: string) {
        return this.getTfsContext().getActionUrl(action || "", "testManagement", { area: "api", teamId: teamId });
    }
}

export function getClient(): TcmHttpClient {
    if (!client) {
        client = TFS_OM_Common.ProjectCollection.getConnection(TFS_Host_TfsContext.TfsContext.getDefault()).getService<TcmHttpClient>(TcmHttpClient);
    }
    return client;
}

var client: TcmHttpClient;



