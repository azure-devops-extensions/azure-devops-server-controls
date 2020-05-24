import Q = require("q");


import Diag = require("VSS/Diag");
import Utils_Array = require("VSS/Utils/Array");
import Utils_String = require("VSS/Utils/String");
import Utils_Number = require("VSS/Utils/Number");


import TFS_Core_Ajax = require("Presentation/Scripts/TFS/TFS.Legacy.Ajax");
import TFS_OM_Common = require("Presentation/Scripts/TFS/TFS.OM.Common");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");

import WITOM = require("WorkItemTracking/Scripts/TFS.WorkItemTracking");
import { WorkItemManager } from "WorkItemTracking/Scripts/OM/WorkItemManager";
import WIT_WebApi = require("TFS/WorkItemTracking/RestClient");
import VSS_WIT_Contracts = require("TFS/WorkItemTracking/Contracts");

import ExtensionResources = require("Agile/Scripts/Resources/TFS.Resources.AgileExtensionsDuplicateWorkItem");
import { PageWorkItemHelper } from "WorkItemTracking/Scripts/Utils/PageWorkItemHelper";

export enum DuplicateWorkItemType {
    Default,
    Primary,
    Duplicate
}

interface IDuplicateWorkItemState {
    duplicateType: DuplicateWorkItemType;
    primaryWorkItemId?: number;
}

export module Configuration {
    export var PARENT_ID: string = "$parentID";
    export var CURRENT_USER: string = "$currentUser";

    export interface IFieldAction {
        referenceName: string;
        value: any;
    }

    export interface IWorkItemTypeConfiguration {
        workItemTypeName: string;

        resolveAsPrimary: IFieldAction[];
        resolveAsDuplicate: IFieldAction[];
        unlink: IFieldAction[];
    }

    export interface IConfiguration {
        linkTypeRefName: string;
        linkTypePrimaryEndName: string;
        linkTypeDuplicateEndName: string;

        workItemTypes: IWorkItemTypeConfiguration[];
    }

    export function load(tfsContext?: TFS_Host_TfsContext.TfsContext): IPromise<IConfiguration> {
        tfsContext = tfsContext || TFS_Host_TfsContext.TfsContext.getDefault();

        var actionUrl = tfsContext.getActionUrl("getProcessSettingsProperty", "processConfiguration", {
            area: "api",
            propertyName: "DuplicateWorkItemFlow"
        } as TFS_Host_TfsContext.IRouteData);

        var deferred = Q.defer<IConfiguration>();

        TFS_Core_Ajax.getMSJSON(
            actionUrl,
            null,
            (result: { value: string }) => {
                if (!result || !result.value) {
                    // Empty configuration
                    deferred.resolve(null);
                } else {
                    let c = JSON.parse(result.value);
                    deferred.resolve(c);
                }
            }, () => {
                Diag.logError("Could not load duplicate work item flow configuration");
                deferred.reject({});
            });

        return deferred.promise;
    }
}

export class BaseService {
    constructor(protected _configuration: Configuration.IConfiguration) {
    }

    /** Return list of supported work item type names */
    public getSupportedWorkItemTypeNames(): string[] {
        return this._configuration && this._configuration && this._configuration.workItemTypes && this._configuration.workItemTypes.map(x => x.workItemTypeName) || [];
    }

    protected _getConfigurationForWorkItemTypeName(workItemTypeName: string): Configuration.IWorkItemTypeConfiguration {
        for (var workItemTypeConfiguration of this._configuration.workItemTypes) {
            if (Utils_String.localeIgnoreCaseComparer(workItemTypeConfiguration.workItemTypeName, workItemTypeName) === 0) {
                return workItemTypeConfiguration;
            }
        }

        Diag.Debug.fail(ExtensionResources.NoMatchingConfigurationError);
        throw new Error(ExtensionResources.NoMatchingConfigurationError);
    }
}

export class DuplicateWorkItemService extends BaseService {
    private _workItemStore: WITOM.WorkItemStore;
    private _workItemManager: WorkItemManager;

    constructor(configuration: Configuration.IConfiguration, tfsContext?: TFS_Host_TfsContext.TfsContext) {
        super(configuration);

        tfsContext = tfsContext || TFS_Host_TfsContext.TfsContext.getDefault();

        this._workItemStore = TFS_OM_Common.ProjectCollection.getConnection(tfsContext).getService<WITOM.WorkItemStore>(WITOM.WorkItemStore);
        this._workItemManager = WorkItemManager.get(this._workItemStore);
    }

    /** Return primary work item for the given id. Can be either the given  */
    public findPrimary(primaryWorkItemId: number): IPromise<WITOM.WorkItem> {
        var action = (workItemId: number): IPromise<WITOM.WorkItem> => {
            return this._beginGetWorkItem(workItemId).then(workItem => {
                let primaryState = this._getWorkItemState(workItem);

                switch (primaryState.duplicateType) {
                    case DuplicateWorkItemType.Duplicate:
                        // Primary is also duplicate, continue to find real primary
                        return action(primaryState.primaryWorkItemId);

                    case DuplicateWorkItemType.Default:
                    case DuplicateWorkItemType.Primary:
                    default:
                        return workItem;
                }
            })
        };

        return action(primaryWorkItemId);
    }

    /** Link work item to a primary. Modifies the duplicate item. */
    public linkToPrimary(sourceWorkItemId: number, primaryWorkItemId: number): IPromise<void> {
        // Retrieve real primary work item and source work item
        return Q.all<any>([
            this._beginGetWorkItem(sourceWorkItemId),
            this.findPrimary(primaryWorkItemId)
        ])
            .spread<void>((sourceWorkItem: WITOM.WorkItem, primaryWorkItem: WITOM.WorkItem) => {
                var sourceState = this._getWorkItemState(sourceWorkItem);

                // Validate
                if (sourceState.duplicateType === DuplicateWorkItemType.Duplicate) {
                    Diag.Debug.fail(ExtensionResources.UpdatePrimaryLinkError);
                    throw new Error(ExtensionResources.UpdatePrimaryLinkError);
                }

                // Create forward link from source to primary work item
                var link = WITOM.WorkItemLink.create(sourceWorkItem, this._configuration.linkTypeDuplicateEndName, primaryWorkItem.id, null);
                sourceWorkItem.addLink(link);

                // Apply field changes to source work item
                let config = this._getConfigurationForWorkItemTypeName(sourceWorkItem.workItemType.name);
                this._applyFieldChangesToWorkItem(sourceWorkItem, config.resolveAsDuplicate, primaryWorkItem.id);

                return null;
            });
    }

    /** Returns a promise which resolves all linked work item ids */
    public getDuplicateWorkItemIds(primaryWorkItemId: number): IPromise<number[]> {
        return this._beginGetWorkItem(primaryWorkItemId).then(primaryWorkItem => {
            var links = this._getMatchingLinks(primaryWorkItem);

            var duplicateWorkItemIds = links.filter(l =>
                l.getSourceId() === primaryWorkItemId
                && Utils_String.ignoreCaseComparer(this._configuration.linkTypePrimaryEndName, l.getLinkTypeEnd().immutableName) === 0)
                .map(l => l.getTargetId());

            return duplicateWorkItemIds;
        });
    }

    public unlinkFromPrimary(duplicateWorkItemId: number, primaryWorkItemId: number): IPromise<void> {
        return this._beginGetWorkItem(duplicateWorkItemId).then(workItem => {
            // Find link
            var links = this._getMatchingLinks(workItem).filter(l => l.getTargetId() === primaryWorkItemId);
            if (!links || links.length === 0) {
                // No link to remove, fail
                Diag.Debug.fail("No matching configuration found for work item.");
                throw new Error(ExtensionResources.NoLinksFoundToUnlinkError);
            }

            // Remove
            var link = links[0];
            workItem.removeLinks([link]);

            // Apply unlink field changes
            let config = this._getConfigurationForWorkItemTypeName(workItem.workItemType.name);

            this._applyFieldChangesToWorkItem(workItem, config.resolveAsPrimary, primaryWorkItemId);

            return null;
        });
    }

    private _applyFieldChangesToWorkItem(workItem: WITOM.WorkItem, fieldActions: Configuration.IFieldAction[], parentId: number) {
        for (var fieldAction of fieldActions) {
            let value: string = fieldAction.value;

            if (Utils_String.equals(fieldAction.value, Configuration.PARENT_ID, true)) {
                value = parentId.toString();
            } else if (Utils_String.equals(fieldAction.value, Configuration.CURRENT_USER, true)) {
                value = workItem.store.getCurrentUserName();
            }

            if (!workItem.setFieldValue(fieldAction.referenceName, value)) {
                Diag.logWarning("Unable to set field value in work item.");
            }
        }
    }

    /** Get work item from store/manager */
    private _beginGetWorkItem(workItemId: number): IPromise<WITOM.WorkItem> {
        return this._beginGetWorkItems([workItemId]).then(workItems => {
            return workItems[0];
        });
    }

    /** Get work items from store/manager */
    private _beginGetWorkItems(workItemIds: number[]): IPromise<WITOM.WorkItem[]> {
        var deferred = Q.defer<WITOM.WorkItem[]>();

        this._workItemManager.beginGetWorkItems(workItemIds, (workItems: WITOM.WorkItem[]) => {
            deferred.resolve(workItems);
        }, (error) => {
            deferred.reject(error);
        });

        return deferred.promise;
    }

    /** Return state of work item, depending on links */
    private _getWorkItemState(workItem: WITOM.WorkItem): IDuplicateWorkItemState {
        // Get matching links
        var duplicateLinks = this._getMatchingLinks(workItem);

        var linksToPrimary = duplicateLinks.filter(l => Utils_String.ignoreCaseComparer(this._configuration.linkTypeDuplicateEndName, l.getLinkTypeEnd().immutableName) === 0);
        var hasOutgoingPrimaryLink = linksToPrimary && linksToPrimary.length > 0;

        if (hasOutgoingPrimaryLink) {
            // Work item has outgoing duplicate link, it's a duplicate
            return {
                duplicateType: DuplicateWorkItemType.Duplicate,
                primaryWorkItemId: linksToPrimary[0].getTargetId()
            };
        }

        var linksToDuplicate = duplicateLinks.filter(l => Utils_String.ignoreCaseComparer(this._configuration.linkTypePrimaryEndName, l.getLinkTypeEnd().immutableName) === 0);
        var hasIncomingDuplicateLink = linksToDuplicate && linksToDuplicate.length > 0;

        if (hasIncomingDuplicateLink) {
            // Work item has incoming duplicate link, it's a primary
            return {
                duplicateType: DuplicateWorkItemType.Primary
            };
        }

        if (hasOutgoingPrimaryLink && hasIncomingDuplicateLink) {
            // Work item is invalid
            // TODO: Include validation state?
            return null;
        }

        return {
            duplicateType: DuplicateWorkItemType.Default
        };
    }

    private _getMatchingLinks(workItem: WITOM.WorkItem): WITOM.WorkItemLink[] {
        var workItemLinks: WITOM.WorkItemLink[] = <WITOM.WorkItemLink[]>workItem.getLinks().filter(l => l instanceof WITOM.WorkItemLink);

        return workItemLinks.filter(l => Utils_String.ignoreCaseComparer(l.getLinkTypeEnd().linkType.referenceName, this._configuration.linkTypeRefName) === 0);
    }
}

export class DuplicateWorkItemRESTService extends BaseService {
    constructor(configuration: Configuration.IConfiguration) {
        super(configuration);
    }

    /**
    * Async method which unlinks a duplicate work item from a primary
    * work item
    */
    public beginUnlinkFromPrimary(duplicateWorkItemId: number, primaryWorkItemId: number, currentUser: string, updateFields: boolean = true): IPromise<VSS_WIT_Contracts.WorkItem> {
        var deferred = Q.defer<VSS_WIT_Contracts.WorkItem>();

        return WIT_WebApi.getClient().getWorkItem(duplicateWorkItemId, null, null, VSS_WIT_Contracts.WorkItemExpand.Relations).then((workItem) => {
            let config = this._getConfigurationForWorkItemTypeName(workItem.fields["System.WorkItemType"]);
            var index = 0;

            // Find the index of primary relation
            for (; workItem.relations && index < workItem.relations.length; index++) {
                if (this._getWorkItemIdFromLink(workItem.relations[index].url) === primaryWorkItemId
                    && Utils_String.ignoreCaseComparer(this._configuration.linkTypeDuplicateEndName, workItem.relations[index].rel) === 0) {
                    break;
                }
            }

            if (workItem.relations === undefined || index === workItem.relations.length) {
                // No link to remove, fail
                deferred.reject({
                    message: Utils_String.format(ExtensionResources.NoPrimaryLinkFoundError, workItem.id)
                });
                return deferred.promise;
            }

            // create post data for remove link
            var postData = [
                {
                    "op": "test",
                    "path": "/rev",
                    "value": workItem.rev
                },
                {
                    "op": "remove",
                    "path": "/relations/" + index
                }
            ];

            if (updateFields === true) {
                Utils_Array.addRange(postData, this._getfieldUpdateRESTOperations(config.unlink, primaryWorkItemId, currentUser));
            }

            // Update the item
            return WIT_WebApi.getClient().updateWorkItem(postData, workItem.id);
        });
    }

    public beginLinkToPrimary(primaryWorkItem: VSS_WIT_Contracts.WorkItem, workItemIds: number[]): IPromise<VSS_WIT_Contracts.WorkItem> {
        // Find the index of primary relation
        var postData = [];

        if (workItemIds.length === 0) {
            return null;
        }

        postData.push({
            "op": "test",
            "path": "/rev",
            "value": primaryWorkItem.rev
        });

        for (var i = 0; i < workItemIds.length; i++) {
            postData.push({
                "op": "add",
                "path": "/relations/-",
                "value": {
                    "rel": this._configuration.linkTypePrimaryEndName,
                    "url": this._getWorkItemApiURL(workItemIds[i]),
                    "attributes": {
                        "comment": ""
                    }
                }
            });
        }

        // Update the item
        return WIT_WebApi.getClient().updateWorkItem(postData, primaryWorkItem.id);
    }

    /**
    * This returns the URL for the full screen of the work item
    * @param workItem to generate the link. eg. http://fabrikam.me.tfsallin.net/DefaultCollection/_apis/wit/workItems/1"
    */
    private _getWorkItemApiURL(workItemId: number): string {
        var tfsContext = TFS_Host_TfsContext.TfsContext.getDefault();
        var webContext = tfsContext.contextData;
        var collectionUrl = webContext.collection.uri;

        // build url
        var wiUrl = collectionUrl
            + "_apis/wit/workItems/"
            + workItemId;
        wiUrl = encodeURI(wiUrl);
        return wiUrl;
    }

    /** 
    * Helper method to extract work item id from link url
    */
    private _getWorkItemIdFromLink(url: string) {
        var lastOccurenceOfBackslash = url.lastIndexOf('/');

        if (lastOccurenceOfBackslash === -1) {
            throw new Error(ExtensionResources.InvalidFormatOfWorkItemURL);
        }

        return Utils_Number.parseLocale(url.substring(lastOccurenceOfBackslash + 1));
    }

    /**
    * Returns an array of REST operations required for updating fields actions
    * @param fieldActions array of field referenceName and values to be updated
    */
    private _getfieldUpdateRESTOperations(fieldActions: Configuration.IFieldAction[], parentId: number, currentUser: string) {
        var postData = [];
        for (var fieldAction of fieldActions) {
            let value: string = fieldAction.value;
            if (Utils_String.equals(fieldAction.value, Configuration.PARENT_ID, true)) {
                value = parentId.toString();
            } else if (Utils_String.equals(fieldAction.value, Configuration.CURRENT_USER, true)) {
                value = currentUser;
            }

            postData.push({
                "op": "add",
                "path": "/fields/" + fieldAction.referenceName,
                "value": value
            });
        }
        return postData;
    }

    public getDuplicateWorkItems(workItemIds: number[]): IPromise<VSS_WIT_Contracts.WorkItem[]> {
        return PageWorkItemHelper.pageWorkItems(workItemIds);
    }

    /**
    * This matches all the duplicate links and removes from the primary work item.
    **/
    public beginUnlinkAllDuplicatesFromPrimary(primaryWorkItemId: number): IPromise<VSS_WIT_Contracts.WorkItem> {
        return WIT_WebApi.getClient().getWorkItem(primaryWorkItemId, null, null, VSS_WIT_Contracts.WorkItemExpand.Relations).then((workItem) => {
            var postData = [];
            postData.push({
                "op": "test",
                "path": "/rev",
                "value": workItem.rev
            });

            if (!workItem.relations) {
                Diag.Debug.fail(ExtensionResources.NoLinksFoundToUnlinkError);
                throw new Error(ExtensionResources.NoLinksFoundToUnlinkError);
            }

            // Loop is running in reverse order due to change in the relations index after remove operation.
            for (var index = workItem.relations.length - 1; index >= 0; index--) {
                if (Utils_String.ignoreCaseComparer(this._configuration.linkTypePrimaryEndName, workItem.relations[index].rel) === 0) {
                    postData.push({
                        "op": "remove",
                        "path": "/relations/" + index
                    });
                }
            }

            if (postData.length <= 1) {
                Diag.Debug.fail(ExtensionResources.NoLinksFoundToUnlinkError);
                throw new Error(ExtensionResources.NoLinksFoundToUnlinkError);
            }

            return WIT_WebApi.getClient().updateWorkItem(postData, workItem.id);
        });
    }

}


