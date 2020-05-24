import Q = require("q");
import VSS_Service = require("VSS/Service");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import Telemetry = require("VSS/Telemetry/Services");
import Contribution_Services = require("VSS/Contributions/Services");
import FeatureAvailability_Services = require("VSS/FeatureAvailability/Services");
import Contributions_Contracts = require("VSS/Contributions/Contracts");
import { ServiceInstanceTypes } from "VSS/WebApi/Constants";

import Ajax = require("Presentation/Scripts/TFS/TFS.Legacy.Ajax");
import TFS_OM_Common = require("Presentation/Scripts/TFS/TFS.OM.Common");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import { WebSettingsService, WebSettingsScope } from "Presentation/Scripts/TFS/TFS.WebSettingsService";
import ServerConstants = require("Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants");
import { PerfScenarioManager } from "WorkItemTracking/Scripts/Utils/PerfScenarioManager";
import CIConstants = require("WorkItemTracking/Scripts/CustomerIntelligence");
import { IWorkItemMetadataCacheData, IWorkItemMetadataLocalStorageData } from "WorkItemTracking/Scripts/OM/WorkItemInterfaces";
import * as VSSError from "VSS/Error";

export class WorkItemMetadataCacheStampManager {
    public static MetadataStampsKey = "ms.vss-work-web.work-item-cache-data-provider";

    public workItemTypesEtag: string;

    protected _workItemMetaDataCacheStamps: IDictionaryStringTo<IDictionaryStringTo<string>>; // a map from project Id to cache stamps
    private _cachedPromises: { [key: string]: IPromise<void> } = {};
    private _tfsContext: TFS_Host_TfsContext.TfsContext;

    constructor(tfsContext: TFS_Host_TfsContext.TfsContext) {
        this._workItemMetaDataCacheStamps = {};
        this._tfsContext = tfsContext;
    }

    /**
     * Ensure the metadata stamps are ready for current project
     * @param projectId Current project Id.
     * @param forceRefresh If true, force a server request to re-populate the data provider data. Default is false.
     */
    public ensureStampsForCurrentProject(projectId: string, forceRefresh: boolean = false): IPromise<void> {
        const projectKey = projectId.toUpperCase();
        const webPageDataService = VSS_Service.getService(Contribution_Services.WebPageDataService);
        return webPageDataService.ensureDataProvidersResolved([
            {
                id: WorkItemMetadataCacheStampManager.MetadataStampsKey,
                properties: {
                    serviceInstanceType: ServiceInstanceTypes.TFS
                }
            } as Contributions_Contracts.Contribution
        ], forceRefresh)
            .then(() => {
                const data: IWorkItemMetadataCacheData = webPageDataService.getPageData(WorkItemMetadataCacheStampManager.MetadataStampsKey);
                if (data) {
                    this._setCacheStamps(data, projectKey);
                }
            });
    }

    /**
     * Get cache stamp for given meta data type
     * @param type
     * @param projectId
     */
    public getMetadataCacheStamp(type: string, projectId?: string): IPromise<string> {
        const currentProjectId = TFS_Host_TfsContext.TfsContext.getDefault().navigation.projectId;
        const projectKey = (projectId || currentProjectId || "").toUpperCase();

        if (!projectKey) {
            // if a project id is not specified and if the currentpage is not project scoped, that means we cant get cachestamps, so return null
            return Q(null);
        }

        const getCacheStamp = () => {
            const stamp = this._workItemMetaDataCacheStamps[projectKey] ? this._workItemMetaDataCacheStamps[projectKey][type] : null;
            return stamp;
        };

        if (!this._workItemMetaDataCacheStamps[projectKey]) {
            if (!this._cachedPromises[projectKey]) {
                this._cachedPromises[projectKey] = this._ensureMetadataCacheStamps(projectKey, currentProjectId, projectId);
                return this._cachedPromises[projectKey].then(
                    () => {
                        delete this._cachedPromises[projectKey];
                        return getCacheStamp();
                    },
                    (error: Error) => {
                        delete this._cachedPromises[projectKey];
                        VSSError.publishErrorToTelemetry(error);
                        return getCacheStamp();
                    });
            } else {
                return this._cachedPromises[projectKey].then(
                    () => {
                        return getCacheStamp();
                    },
                    () => {
                        return getCacheStamp();
                    });
            }
        }

        return Q(getCacheStamp());
    }

    private _fetchMetadataCacheStamps(projectId: string): IPromise<IWorkItemMetadataCacheData> {
        const defer = Q.defer<IWorkItemMetadataCacheData>();

        Ajax.getMSJSON(this._getApiLocation("getMetadataCacheStamps", { project: projectId }), null, (data: string) => {
            defer.resolve(JSON.parse(data));
        }, () => {
            defer.resolve(null);
        });

        return defer.promise;
    }

    protected _ensureMetadataCacheStamps(projectKey: string, currentProjectId?: string, projectId?: string): IPromise<void> {
        const isSameProject = !projectId || Utils_String.equals(projectId, currentProjectId || "", true);

        const setCacheStamps = (stampData: IWorkItemMetadataCacheData) => {
            this._workItemMetaDataCacheStamps[projectKey] = stampData ? stampData.workItemMetadataCacheStamp : null;
            this.workItemTypesEtag = stampData ? stampData.rawWorkItemTypesEtagForCI : null;
        };

        if (!isSameProject) {
            // if current project id and provided project id are different then load the stamps for provided project id
            PerfScenarioManager.addSplitTiming(
                CIConstants.PerformanceEvents.WORKITEMTRACKING_GETMETADATACACHESTAMP_FROMAPI, true);
            return this._fetchMetadataCacheStamps(projectId)
                .then((data: IWorkItemMetadataCacheData) => {
                    PerfScenarioManager.addSplitTiming(
                        CIConstants.PerformanceEvents.WORKITEMTRACKING_GETMETADATACACHESTAMP_FROMAPI, false);

                    setCacheStamps(data);
                    return Q<void>(null);
                });
        } else {
            PerfScenarioManager.addSplitTiming(
                CIConstants.PerformanceEvents.WORKITEMTRACKING_GETMETADATACACHESTAMP_FROMPAGEDATA, true);
            return VSS_Service.getService(Contribution_Services.ExtensionService).getContribution(WorkItemMetadataCacheStampManager.MetadataStampsKey)
                .then(() => {
                    PerfScenarioManager.addSplitTiming(
                        CIConstants.PerformanceEvents.WORKITEMTRACKING_GETMETADATACACHESTAMP_FROMPAGEDATA, false);

                    const data: IWorkItemMetadataCacheData = this.getPageData(WorkItemMetadataCacheStampManager.MetadataStampsKey);
                    if (data) {
                        setCacheStamps(data);
                    }
                    return Q<void>(null);
                });
        }
    }

    private _setCacheStamps(stampData: IWorkItemMetadataCacheData, projectKey: string): void {
        this._workItemMetaDataCacheStamps[projectKey] = stampData ? stampData.workItemMetadataCacheStamp : null;
        this.workItemTypesEtag = stampData ? stampData.rawWorkItemTypesEtagForCI : null;
    }

    /**
     * This methods updates the params for a rest call with the metadata cachestamp. If the stamps
     * are already downloaded the callback will be called synchronously otherwise it will be async.
     * @param type The type of stamp 
     * @param params The existing params to merge with the retrieved stamp
     * @param continuation The function to call when stamp is retrieved
     * @param projectId This should be passed by only those metadata that have a project dependent cacheStamp. Like WorkItemTypes
     */
    public addStampToParams(type: string, params: any, continuation: (params: IDictionaryStringTo<any>) => void, projectId?: string): void {
        const buildParams = (stamp: string) => {
            if (stamp) {
                if (params) {
                    params.stamp = stamp;
                    return params;
                } else {
                    return {
                        stamp: stamp
                    };
                }
            }

            return params;
        };

        this.getMetadataCacheStamp(type, projectId).then((resolvedStamp: string) => {
            continuation(buildParams(resolvedStamp));
        });
    }

    /**
     * Helper function to get page data for a given key
     *
     * @param key key of the data provider
     */
    public getPageData(key: string): any {
        return VSS_Service.getService(Contribution_Services.WebPageDataService).getPageData(key);
    }

    private _getApiLocation(action?: string, params?: any): string {
        /// <param name="action" type="string" optional="true" />
        /// <param name="params" type="Object" optional="true" />
        return this._tfsContext.getActionUrl(action || "", "wit", $.extend({ project: "", team: "", area: "api" }, params));
    }
}
