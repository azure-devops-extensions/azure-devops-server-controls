import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { ILinkTypes, IWorkItemData, IWorkItemTypeData, IFieldProjectData, IFieldEntry } from "WorkItemTracking/Scripts/OM/WorkItemInterfaces";
import { PerfScenarioManager } from "WorkItemTracking/Scripts/Utils/PerfScenarioManager";
import { getMSJSON, postMSJSON } from "Presentation/Scripts/TFS/TFS.Legacy.Ajax";
import { PerformanceEvents } from "WorkItemTracking/Scripts/CustomerIntelligence";
import { ContributionsHttpClient } from "VSS/Contributions/RestClient";
import { ProjectCollection } from "Presentation/Scripts/TFS/TFS.OM.Common";
import { format, equals } from "VSS/Utils/String";
import * as Resources from "WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking";
import { parseMSJSON } from "VSS/Utils/Core";
import { WebPageDataService } from "VSS/Contributions/Services";
import { getService } from "VSS/Service";
import { CacheStatus, WITCommonConstants } from "Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants";
import { WorkItemMetadataCacheStampManager } from "WorkItemTracking/Scripts/WorkItemMetadataCacheStampManager";
import { IWorkItemDataSource } from "WorkItemTracking/Scripts/OM/DataSources/Interfaces";

export class WorkItemMvcClient implements IWorkItemDataSource {
    private _tfsContext: TfsContext;
    private _cacheStampManager: WorkItemMetadataCacheStampManager;

    constructor(tfsContext: TfsContext, cacheStampManager: WorkItemMetadataCacheStampManager) {
        this._tfsContext = tfsContext;
        this._cacheStampManager = cacheStampManager;
    }

    public beginGetWorkItemData(projectId: string, ids: number[], isDeleted?: boolean, includeInRecentActivity?: boolean, includeHistory?: boolean): Promise<IWorkItemData[]> {
        const apiName = !includeHistory ? "workitemsnohistory" : "workitems";

        return new Promise((resolve, reject) => postMSJSON(this._getApiLocation("", apiName), {
            ids,
            isDeleted,
            includeInRecentActivity,
            includeHistory
        }, resolve, reject));
    }

    public beginGetLinkTypes(): Promise<ILinkTypes> {
        return new Promise((resolve, reject) => {
            this._cacheStampManager.addStampToParams(WITCommonConstants.LinkTypes, null, (params) => {
                getMSJSON(
                    this._getApiLocation(undefined, "linkTypes"),
                    params,
                    (linkTypes: ILinkTypes, textStatus: string, xhr: JQueryXHR) => {
                        PerfScenarioManager.addData({
                            [`${PerformanceEvents.WORKITEMTRACKING_GETLINKTYPES_REQUEST}.ETAG`]: xhr.getResponseHeader("ETag"),
                            [`${PerformanceEvents.WORKITEMTRACKING_GETLINKTYPES_REQUEST}.DATE`]: xhr.getResponseHeader("Date")
                        });

                        resolve(linkTypes);
                    },
                    reject);
            });
        });
    }

    public beginGetWorkItemTypeData(projectId: string, typeNames: string[]): Promise<IWorkItemTypeData[]> {
        return new Promise((resolve, reject) => {
            this._cacheStampManager.addStampToParams(WITCommonConstants.WorkItemTypes, { typeNames }, (params) => {
                PerfScenarioManager.addSplitTiming(PerformanceEvents.WORKITEMTRACKING_GETTYPES_REQUEST, true);

                getMSJSON(this._getApiLocation(projectId, "workItemTypes"), params, (payloads: IWorkItemTypeData[], textStatus: string, xhr: JQueryXHR) => {
                    // capture etag and date , date of resource can help confirm if the data was cold loaded or warm loaded from web cache
                    PerfScenarioManager.addData({
                        [`${PerformanceEvents.WORKITEMTRACKING_GETTYPES_REQUEST}.ETAG`]: xhr.getResponseHeader("ETag"),
                        [`${PerformanceEvents.WORKITEMTRACKING_GETTYPES_REQUEST}.DATE`]: xhr.getResponseHeader("Date")
                    });
                    PerfScenarioManager.addSplitTiming(PerformanceEvents.WORKITEMTRACKING_GETTYPES_REQUEST, false);

                    resolve(payloads);
                }, reject);
            }, projectId);
        });
    }

    public beginGetFieldProjectData(projectId: string): Promise<IFieldProjectData> {
        return new Promise((resolve, reject) => {
            this._cacheStampManager.addStampToParams(WITCommonConstants.TeamProjects, {
                includeFieldDefinitions: true,
                namesOrIds: [projectId]
            }, params => {
                getMSJSON(this._getApiLocation(projectId, "teamProjects"), params, resolve, reject);
            });
        });
    }

    public beginGetFields(): Promise<IFieldEntry[]> {
        return new Promise((resolve, reject) => {
            this._cacheStampManager.addStampToParams(WITCommonConstants.Fields, null, (params) => {
                getMSJSON(this._getApiLocation(undefined, "fields"), params, (fields: IFieldEntry[]) => {
                    resolve(fields);
                }, (error) => {
                    reject(error);
                });
            });
        });
    }

    private _getApiLocation(projectId: string | undefined, action: string, params?: Object): string {
        // Do not include team
        return this._tfsContext.getActionUrl(action || "", "wit", $.extend({ project: projectId, team: "", area: "api" }, params));
    }
}
