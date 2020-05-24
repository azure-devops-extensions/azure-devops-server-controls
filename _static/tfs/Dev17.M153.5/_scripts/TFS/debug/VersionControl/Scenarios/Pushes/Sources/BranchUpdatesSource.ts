import * as Q from "q";
import { Contribution } from "VSS/Contributions/Contracts";
import { WebPageDataService } from "VSS/Contributions/Services";
import { IScenarioManager, getScenarioManager } from "VSS/Performance";
import { ContractSerializer } from "VSS/Serialization";
import { getService } from "VSS/Service";
import { parseDateString } from "VSS/Utils/Date";
import { ServiceInstanceTypes } from "VSS/WebApi/Constants";

import { GitPushSearchCriteria, TypeInfo } from "TFS/VersionControl/Contracts";

import {
    BranchUpdatesLoadedPayload,
    GitPushRefExtended,
    PushesSearchFilterData,
} from "VersionControl/Scenarios/Pushes/ActionsHub";
import * as Constants from "VersionControl/Scenarios/Shared/Constants";
import { GitClientService } from "VersionControl/Scripts/GitClientService";
import { versionStringToRefName } from "VersionControl/Scripts/GitRefUtility";
import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";
import { convertArtifactUriToPublicUrl } from "VersionControl/Scripts/Utils/Build";

export interface IPageDataService {
    getPageData<T>(key: string, contractMetadata?: any);
    ensureDataProvidersResolved(contributions: Contribution[], refreshIfExpired?: boolean, properties?: any): IPromise<any>;
}

export class BranchUpdatesSource {
    
    private _contributionId: string;
    private _gitClient: GitClientService;
    private _perfScenarioManager: IScenarioManager;
    private _webPageDataService: IPageDataService;
    private static c_defaultTop = 50;

    constructor(private _repositoryContext: GitRepositoryContext, contributionId?: string) {
        this._perfScenarioManager = getScenarioManager();
        this._gitClient = <GitClientService>this._repositoryContext.getClient();
        this._webPageDataService = getService(WebPageDataService) as IPageDataService;
        this._contributionId = contributionId || "ms.vss-code-web.git-history-view-branch-updates-data-provider";
    }

    public getUpdatesFromDataProvider(searchFilter: PushesSearchFilterData, skip?: number, top?: number): IPromise<BranchUpdatesLoadedPayload> {
        const scenario = this._perfScenarioManager.startScenario("VersionControl", "BranchUpdatesSource.getUpdatesFromDataProvider");
        const deferred = Q.defer<BranchUpdatesLoadedPayload>();
        if (!top) {
            top = BranchUpdatesSource.c_defaultTop;
        }

        this._webPageDataService.ensureDataProvidersResolved([
            {
                id: this._contributionId,
                properties: {
                    serviceInstanceType: ServiceInstanceTypes.TFS
                }
            } as Contribution],
            true,
            this._getDataProviderProperties(searchFilter, skip, top + 1),
        ).then(
            () => {
                const pageData = this._webPageDataService.getPageData<any>(this._contributionId);
                this._deseriallize(pageData);

                scenario.end();

                this._sanitizePayload(pageData, top);

                deferred.resolve(pageData);
            },
            (error: Error) => {
                scenario.end();
                deferred.reject(error);
            });

        return deferred.promise;
    }

    /**
     * Get ref updates data from embedded json island in the document
     */
    public getUpdatesFromJsonIsland(): BranchUpdatesLoadedPayload {
        const scenario = this._perfScenarioManager.startScenario("VersionControl", "BranchUpdatesSource.getUpdatesFromJsonIsland");

        const updates = this._webPageDataService.getPageData<BranchUpdatesLoadedPayload>(this._contributionId);
        this._deseriallize(updates);
        scenario.end();

        this._sanitizePayload(updates, BranchUpdatesSource.c_defaultTop);

        return updates;
    }

    private _deseriallize(payload: BranchUpdatesLoadedPayload): void {
        if (!payload) {
            return;
        }

        if (payload.pushes) {
            payload.pushes.forEach(
                (value: GitPushRefExtended, index: number) => {
                    value.push = ContractSerializer.deserialize(value.push, TypeInfo.GitPushRef);
                    value.status = convertArtifactUriToPublicUrl(
                        ContractSerializer.deserialize(value.status, TypeInfo.GitStatus),
                        this._repositoryContext);
                });
        }
    }

    private _getDataProviderProperties(filterData: PushesSearchFilterData, skip?: number, top?: number): any {
        const searchCriteria = {
            pusherId: filterData.userId,
            refName: filterData.allRefs ? null : versionStringToRefName(filterData.itemVersion),
            includeRefUpdates: true,
            excludePushers: filterData.excludeUsers,
            fromDate: undefined,
            toDate: undefined,
        };

        if (filterData.toDate) {
            searchCriteria.toDate = parseDateString(filterData.toDate);
        }

        if (filterData.fromDate) {
            searchCriteria.fromDate = parseDateString(filterData.fromDate);
        }

        return {
            "repositoryName": this._repositoryContext.getRepository().name,
            "searchCriteria": searchCriteria,
            "$skip": skip,
            "$top": top,
        };
    }

    private _sanitizePayload(payload: BranchUpdatesLoadedPayload, top: number): void {
        if (payload) {
            payload.hasMoreUpdates = false;
            if (payload.pushes && payload.pushes.length > top) {
                payload.hasMoreUpdates = true;
                payload.pushes.pop();
            }
        }
    }
}
