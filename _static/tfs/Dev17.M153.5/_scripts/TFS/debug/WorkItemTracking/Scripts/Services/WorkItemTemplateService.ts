import TFS_Service = require("Presentation/Scripts/TFS/TFS.Service");
import Q = require("q");
import * as WIT_Contracts from "TFS/WorkItemTracking/Contracts";
import WIT_WebApi = require("TFS/WorkItemTracking/RestClient");
import { getDefaultWebContext } from "VSS/Context";
import { WebPageDataService } from "VSS/Contributions/Services";
import Events_Services = require("VSS/Events/Services");
import * as Service from "VSS/Service";
import Utils_String = require("VSS/Utils/String");
import { ServiceInstanceTypes } from "VSS/WebApi/Constants";

var eventSvc = Events_Services.getService();

export interface IWorkItemTemplateDefinition extends WIT_Contracts.WorkItemTemplateReference {
    /** Template ownerId */
    ownerId: string;
}

export class WorkItemTemplateService extends TFS_Service.TfsService {

    public static readonly EVENT_TEMPLATES_UPDATED = "workitem-template-updated";
    private static readonly ContributionDataProviderId = "ms.vss-work-web.work-item-templates-data-provider";

    private _httpClient: WIT_WebApi.WorkItemTrackingHttpClient;

    /* { 'projectId/ownerId' : IPromise<{ 'WorkItemTypeNameKey': [ WorkItemTemplate ] }> } */
    private _projectOwnerCache: IDictionaryStringTo<IPromise<IDictionaryStringTo<WIT_Contracts.WorkItemTemplateReference[]>>> = {};

    /* { 'projectId/workItemTypeName' : [ WorkItemTemplate ] } */
    private _projectWorkItemTypeCache: IDictionaryStringTo<IPromise<IWorkItemTemplateDefinition[]>> = {};

    /* { 'templateId': IPromise<WorkItemTemplate> } */
    private _templateCache: IDictionaryStringTo<IPromise<WIT_Contracts.WorkItemTemplate>> = {};

    /**
     * Gets the Work Item Template with the specified Template Id
     *
     * @param projectId - [Guid] the id of the project the template belongs to
     * @param ownerId - [Guid] the id of the team or user that template belong to
     * @param templateId - [Guid] the id of the template
     */
    public getWorkItemTemplate(projectId: string, ownerId: string, templateId: string): IPromise<WIT_Contracts.WorkItemTemplate> {
        if (!this._templateCache[templateId]) {
            this._templateCache[templateId] = this._getHttpClient().getTemplate(projectId, ownerId, templateId);
        }
        return this._templateCache[templateId];
    }

    /**
     * Gets shallow references to all the Work Item Templates that belong to the specified owner. Sorted Alphabetically by Template Name
     * 
     * @param projectId - [Guid] the id of the project the templates belongs to
     * @param ownerId - [Guid] the team or user the templates belongs to
     */
    public getWorkItemTemplateReferences(projectId: string, ownerId: string): IPromise<IDictionaryStringTo<WIT_Contracts.WorkItemTemplateReference[]>> {
        var key: string = WorkItemTemplateService._getCacheKey(projectId, ownerId);
        if (!this._projectOwnerCache[key]) {
            this._projectOwnerCache[key] = this._getHttpClient().getTemplates(projectId, ownerId).then((templates: WIT_Contracts.WorkItemTemplateReference[]) => {
                var templateMap: IDictionaryStringTo<WIT_Contracts.WorkItemTemplateReference[]> = {};

                for (var template of templates) {
                    let workItemTypeNameKey = this._getNormalizedWorkItemTypeName(template.workItemTypeName);
                    if (!templateMap[workItemTypeNameKey]) {
                        templateMap[workItemTypeNameKey] = [];
                    }
                    templateMap[workItemTypeNameKey].push(template);
                }

                //Sort Alphabetically
                for (var workItemType of Object.keys(templateMap)) {
                    templateMap[workItemType] = templateMap[workItemType].sort((a, b) => this._compareTemplate(a, b));
                }

                return templateMap;
            });
        }
        return this._projectOwnerCache[key];
    }

    /**
     * Gets shallow references to all the Work Item Templates that belong to the specified owner for the specified Work Item Type
     *
     * @param projectId - [Guid] the id of the project the templates belongs to
     * @param ownerId - [Guid] the team or user the templates belongs to
     * @param typeName - Work Item Type Name
     */
    public getWorkItemTemplatesForType(projectId: string, ownerId: string, workItemTypeName: string): IPromise<WIT_Contracts.WorkItemTemplateReference[]> {
        return this.getWorkItemTemplateReferences(projectId, ownerId).then((templateMap: IDictionaryStringTo<WIT_Contracts.WorkItemTemplateReference[]>) => {
            let key = this._getNormalizedWorkItemTypeName(workItemTypeName);
            return templateMap[key] || [];
        });    
    }

    /**
     * Get templates for workItemType from all the teams I'm a member off
     * @param workItemTypeName WorkItemTypeName
     */
    public getMyWorkItemTemplatesForWorkItemType(workItemTypeName: string): IPromise<IWorkItemTemplateDefinition[]> {
        const key = WorkItemTemplateService._getCacheKey(getDefaultWebContext().project.id, workItemTypeName);

        if (this._projectWorkItemTypeCache[key]) {
            return this._projectWorkItemTypeCache[key];
        } else {
            const contributions = [{
                id: WorkItemTemplateService.ContributionDataProviderId,
                properties: {
                    "serviceInstanceType": ServiceInstanceTypes.TFS
                }
            } as Contribution];
            const webPageDataService = Service.getService(WebPageDataService);

            this._projectWorkItemTypeCache[key] = webPageDataService.ensureDataProvidersResolved(contributions, true, { workItemTypeName }).then(() => {
                let templates = webPageDataService.getPageData<IWorkItemTemplateDefinition[]>(WorkItemTemplateService.ContributionDataProviderId);
                templates = templates.sort((t1, t2) => this._compareTemplate(t1, t2));
                return templates;
            });    
            return this._projectWorkItemTypeCache[key];
        }
    }

    /**
     * Replaces the content of the specified template
     *
     * NOTE: Caches will become out of sync/issues may occur if there are concurrent replace requests for the same template.
     *
     * @param projectId - [Guid] the id of the project the template belongs to
     * @param ownerId - [Guid] the id of the team or user that the template belong to
     * @param templateId - [Guid] the id of the template to replace
     * @param template - The new content for the template
     */
    public replaceWorkItemTemplate(projectId: string, ownerId: string, templateId: string, template: WIT_Contracts.WorkItemTemplate): IPromise<WIT_Contracts.WorkItemTemplate> {
        var promise: IPromise<WIT_Contracts.WorkItemTemplate> = this._getHttpClient().replaceTemplate(template, projectId, ownerId, templateId);

        promise.then((t: WIT_Contracts.WorkItemTemplate) => {
            // A template was replaced, reset provider cache to force refresh templates next time
            this._resetProviderCache(projectId, ownerId, t.workItemTypeName);

            this._updateCache(projectId, ownerId, t);
        });

        return promise;
    }

    /**
     * Create a Work Item Template
     * 
     * @param projectId - [Guid] the id of the project the new template should belong to
     * @param ownerId - [Guid] the id of the team or user that the new template should belong to
     * @param template - The template to create
     */
    public createWorkItemTemplate(projectId: string, ownerId: string, template: WIT_Contracts.WorkItemTemplate): IPromise<WIT_Contracts.WorkItemTemplate> {
        return this._getHttpClient().createTemplate(template, projectId, ownerId).then((t: WIT_Contracts.WorkItemTemplate) => {
            // A new template was created, reset provider cache to force refresh templates next time
            this._resetProviderCache(projectId, ownerId, t.workItemTypeName);

            this._updateCache(projectId, ownerId, t);

            return t;
        });
    }

    /**
     * Delete the specified template.
     * 
     * @param projectId - [Guid] the id of the project the template belong to
     * @param ownerId - [Guid] the id of the owner the template belong to
     * @param template - The template to delete
     */
    public deleteWorkItemTemplate(projectId: string, ownerId: string, template: WIT_Contracts.WorkItemTemplateReference): IPromise<void> {
        // Template was deleted, reset provider cache to force refresh templates next time
        this._resetProviderCache(projectId, ownerId, template.workItemTypeName);
        
        var deletedTemplates: IDictionaryStringTo<boolean> = {};
        deletedTemplates[template.id] = true;
        this._clearFromCache(projectId, ownerId, deletedTemplates);

        return this._getHttpClient().deleteTemplate(projectId, ownerId, template.id);
    }

    private _getHttpClient(): WIT_WebApi.WorkItemTrackingHttpClient {
        if (!this._httpClient) {
            this._httpClient = this.tfsConnection.getHttpClient<WIT_WebApi.WorkItemTrackingHttpClient>(WIT_WebApi.WorkItemTrackingHttpClient);
        }
        return this._httpClient;
    }

    private static _getCacheKey(projectId: string, ownerIdOrWorkItemTypeName: string): string {
        return `${projectId.toLowerCase()}/${ownerIdOrWorkItemTypeName.toLowerCase()}`;
    }

    private _getNormalizedWorkItemTypeName(workItemTypeName: string): string {
        return workItemTypeName.toLowerCase();
    }

    private _updateCache(projectId: string, ownerId: string, template: WIT_Contracts.WorkItemTemplate) {
        // Update the template cache
        this._templateCache[template.id] = Q(template);

        // Fire 'EVENT_TEMPLATES_UPDATED'. This will force the WIForm to reload templates menu next time
        eventSvc.fire(WorkItemTemplateService.EVENT_TEMPLATES_UPDATED);
    }

    private _clearFromCache(projectId: string, ownerId: string, deletedTemplates: IDictionaryStringTo<boolean>) {
        for (var templateId of Object.keys(deletedTemplates)) {
            delete this._templateCache[templateId];
        }
    }

    // Reset provider cache. This will force refresh templates next time when a consumer calls 'getTemplates' method
    private _resetProviderCache(projectId: string, ownerId: string, workItemTypeName: string): void {
        const projectOwnerCacheKey = WorkItemTemplateService._getCacheKey(projectId, ownerId);
        this._projectOwnerCache[projectOwnerCacheKey] = null;

        const projectWorkitemTypeCacheKey = WorkItemTemplateService._getCacheKey(projectId, workItemTypeName);
        this._projectWorkItemTypeCache[projectWorkitemTypeCacheKey] = null;
    }

    private _compareTemplate(template1: WIT_Contracts.WorkItemTemplateReference, template2: WIT_Contracts.WorkItemTemplateReference): number {
        var compareResult: number = Utils_String.localeIgnoreCaseComparer(template1.name, template2.name);
        if (compareResult !== 0) {
            return compareResult;
        }
        else {
            // If the names of the template are the same, we will sort based on Guid since they are unique
            return Utils_String.localeIgnoreCaseComparer(template1.id, template2.id);
        }
    }

    /**
     * Performs a binary search in the given array for the specified template
     * 
     * @param templates
     * @param template
     *
     * @returns -1 if array is null or empty; the index of the item if found; the index of the template before where this template should go
     */
    private _binarySearchTemplates(templates: WIT_Contracts.WorkItemTemplateReference[], template: WIT_Contracts.WorkItemTemplateReference): number {
        if (templates && templates.length > 0) {
            var minIndex: number = 0;
            var maxIndex: number = templates.length - 1;
            var currentIndex: number;
            var compareResult: number;
            while (minIndex <= maxIndex) {
                currentIndex = Math.floor(minIndex + ((maxIndex - minIndex) / 2));
                compareResult = this._compareTemplate(templates[currentIndex], template);
                if (compareResult < 0) {
                    minIndex = currentIndex + 1;
                }
                else if (compareResult > 0) {
                    maxIndex = currentIndex - 1;
                }
                else {
                    return currentIndex;
                }
            }
            // Return the index of the template right before the one searched for
            // This allows us to quickly insert it into the correct location if neccessary
            return maxIndex;
        }
        else {
            return -1;
        }
    }
}