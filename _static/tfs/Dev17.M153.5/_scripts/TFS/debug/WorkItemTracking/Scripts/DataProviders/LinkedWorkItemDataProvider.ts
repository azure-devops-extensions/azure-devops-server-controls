import Q = require("q");

import Utils_Array = require("VSS/Utils/Array");
import Utils_Date = require("VSS/Utils/Date");
import Utils_String = require("VSS/Utils/String");
import Utils_Core = require("VSS/Utils/Core");
import { HubsService } from "VSS/Navigation/HubsService";
import { getLocalService } from "VSS/Service";
import Artifacts_Constants = require("VSS/Artifacts/Constants");

import Diag = require("VSS/Diag");
import Events_Action = require("VSS/Events/Action");
import Ajax = require("Presentation/Scripts/TFS/TFS.Legacy.Ajax");
import WITConstants = require("Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants");
import Telemetry = require("VSS/Telemetry/Services");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import TFS_OM_Common = require("Presentation/Scripts/TFS/TFS.OM.Common");
import TFS_OM_Identities = require("Presentation/Scripts/TFS/TFS.OM.Identities");
import TFS_Wit_WebApi = require("TFS/WorkItemTracking/RestClient");
import { WorkItem } from "TFS/WorkItemTracking/Contracts";
import Resources = require("WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking");
import VSSError = require("VSS/Error");
import { IdentityRef } from "VSS/WebApi/Contracts";

import CustomerIntelligenceConstants = require("WorkItemTracking/Scripts/CustomerIntelligence");

import * as Contracts from "Presentation/Scripts/TFS/Controls/LinkedArtifacts/Contracts";
import { ILinkedArtifact, ILinkedArtifactAdditionalData, IArtifactIcon, ArtifactIconType, IArtifactIconDescriptor } from "TFS/WorkItemTracking/ExtensionContracts";
import { BaseDataProvider } from "Presentation/Scripts/TFS/Controls/LinkedArtifacts/DataProvider/DataProvider";
import { WorkItemTypeColorAndIconsProvider } from "Presentation/Scripts/TFS/FeatureRef/WorkItemTypeColorAndIconsProvider";
import { WorkItemStateColorsProvider } from "Presentation/Scripts/TFS/FeatureRef/WorkItemStateColorsProvider";
import { PageWorkItemHelper } from "WorkItemTracking/Scripts/Utils/PageWorkItemHelper";
import { convertPotentialIdentityRefFromFieldValue, getAvatarUrl } from "WorkItemTracking/Scripts/Utils/WorkItemIdentityHelper";
import { WITIdentityHelpers } from "TfsCommon/Scripts/WITIdentityHelpers";
import { getWorkItemsHubId } from "WorkItemTracking/Scripts/Utils/WorkItemsHubIdHelper";

export namespace LinkedWorkItemDataProviderConstants {
    export const WorkItemOpenNotHandled = "06BF59F7-67C4-449C-9563-E25F66E5CA2F";
    export const MiscDataTeamProject = "TeamProject";
    export const MiscDataWorkItemType = "WorkItemType";
    export const MiscDataSubGroupKey = "SubGroup";
    export const RequiredFields = [
        WITConstants.CoreFieldRefNames.Id,
        WITConstants.CoreFieldRefNames.TeamProject,
        WITConstants.CoreFieldRefNames.WorkItemType,
        WITConstants.CoreFieldRefNames.Title,
        WITConstants.CoreFieldRefNames.ChangedBy,
        WITConstants.CoreFieldRefNames.AssignedTo];
}

export default class WorkItemTrackingDataProvider extends BaseDataProvider<number, WorkItem> {
    protected _workItemTypeColorAndIconsProvider = WorkItemTypeColorAndIconsProvider.getInstance();
    protected _workItemStatesColorProvider = WorkItemStateColorsProvider.getInstance();

    constructor() {
        super(Artifacts_Constants.ToolNames.WorkItemTracking);

        // Define work item open action handler as the very last which will be called if there are no action handlers on the page
        Events_Action.getService().registerActionWorker("open-work-item", function (actionArgs, next) {
            return LinkedWorkItemDataProviderConstants.WorkItemOpenNotHandled;
        }, Events_Action.ActionService.MaxOrder);
    }

    public getArtifactDisplayString(count: number, artifactType: string): string {
        const resourceString = count === 1 ? Resources.WorkItemRemainingArtifactsDisplayStringSingular :
            Resources.WorkItemRemainingArtifactsDisplayStringPlural;

        return Utils_String.format(resourceString, count);
    }

    protected _convertKey(key: string): number {
        return parseInt(key, 10);
    }

    protected _getResolvedArtifactId(resolvedArtifact: WorkItem): string {
        return resolvedArtifact.id.toString(10);
    }

    protected _getData(
        ids: number[],
        columns: Contracts.IColumn[],
        tfsContext: TFS_Host_TfsContext.TfsContext,
        hostArtifact?: Contracts.IHostArtifact,
        linkedArtifacts?: ILinkedArtifact[],
    ): IPromise<WorkItem[]> {

        const getWorkItemsPromises: IPromise<WorkItem[]>[] = [];
        const idsFetching = ids.slice(0);

        getWorkItemsPromises.push(this._beginGetWorkItems(idsFetching, columns, tfsContext, hostArtifact));

        let results: WorkItem[] = [];
        return Q.allSettled(getWorkItemsPromises).then(
            (settledPromises) => {
                for (const promise of settledPromises) {
                    if (promise.state === "fulfilled") {
                        results = results.concat(promise.value);
                    }
                }
                return results;
            },
            (reason) => { return results; }
        );
    }

    protected _valueToDisplayData(linkedArtifact: ILinkedArtifact, workItem: WorkItem, columns: Contracts.IColumn[], tfsContext: TFS_Host_TfsContext.TfsContext): Contracts.IInternalLinkedArtifactDisplayData {
        if (!workItem) {
            // Work item could not be resolved (might be deleted, or permissions prevent current user from seeing it)
            const errorMessage = Utils_String.localeFormat(Resources.LinkFormWorkItemNotFound);

            return BaseDataProvider.getErrorDisplayData(
                linkedArtifact,
                {
                    name: errorMessage,
                    message: errorMessage
                });
        }

        const additionalData: IDictionaryStringTo<ILinkedArtifactAdditionalData> = {};

        for (const column of columns) {
            let data: ILinkedArtifactAdditionalData;

            // Handle special columns
            switch (column.refName) {
                case Contracts.InternalKnownColumns.LastUpdate.refName:
                    data = this._getLastUpdateData(workItem, tfsContext);
                    break;

                case Contracts.InternalKnownColumns.State.refName:
                    data = this._getStateData(workItem, tfsContext, linkedArtifact);
                    break;

                default:
                    data = column.type === Contracts.LinkColumnType.Identity ? this._getIdentityData(column, workItem) : this._getColumnData(column, workItem, tfsContext);
            }

            if (data) {
                additionalData[column.refName] = data;
            }
        }

        return {
            id: workItem.id.toString(10),
            tool: this.supportedTool,
            type: Artifacts_Constants.ArtifactTypeNames.WorkItem,
            linkType: linkedArtifact.linkType,
            linkTypeDisplayName: linkedArtifact.linkTypeDisplayName,
            primaryData: this._getPrimaryData(workItem, tfsContext, linkedArtifact),
            additionalData: additionalData,
            uri: linkedArtifact.uri,
            comment: linkedArtifact.comment,
            isColumnDependent: true, // Work item display objects are column dependent and need to be cached with columns
            miscData: {
                [LinkedWorkItemDataProviderConstants.MiscDataTeamProject]: workItem.fields[WITConstants.CoreFieldRefNames.TeamProject],
                [LinkedWorkItemDataProviderConstants.MiscDataWorkItemType]: workItem.fields[WITConstants.CoreFieldRefNames.WorkItemType]
            }
        };
    }

    protected _filter(resolvedArtifact: Contracts.IInternalLinkedArtifactDisplayData, filterConfiguration: Contracts.ILinkedArtifactSubtypeFilterConfiguration, hostArtifact?: Contracts.IHostArtifact): boolean {
        // Filter work items if filter is given
        if (!filterConfiguration) {
            return true;
        }

        // Filter for matching work item type...
        const matchingWorkItemType =
            !filterConfiguration.artifactSubtypes
            || Utils_Array.contains(filterConfiguration.artifactSubtypes, resolvedArtifact.miscData && resolvedArtifact.miscData[LinkedWorkItemDataProviderConstants.MiscDataWorkItemType], Utils_String.localeIgnoreCaseComparer);

        // ...and current project scope if that is given.
        const hostProjectName = hostArtifact && hostArtifact.additionalData && hostArtifact.additionalData[Contracts.HostArtifactAdditionalData.ProjectName] || null;
        const projectFilter =
            !filterConfiguration.inCurrentProject
            || (hostProjectName && Utils_String.localeIgnoreCaseComparer(hostProjectName, resolvedArtifact.miscData && resolvedArtifact.miscData[LinkedWorkItemDataProviderConstants.MiscDataTeamProject]) === 0);

        if (filterConfiguration.inCurrentProject) {
            Diag.Debug.assert(!!hostProjectName, "[Linked Artifacts]: When filtering to current project, require host project name from host");
        }

        return matchingWorkItemType && projectFilter;
    }

    protected _getPrimaryData(workItem: WorkItem, tfsContext: TFS_Host_TfsContext.TfsContext, linkedArtifact: ILinkedArtifact): Contracts.IInternalLinkedArtifactPrimaryData {
        // Populate user/identity details
        const assignedToIdentity: IdentityRef = convertPotentialIdentityRefFromFieldValue(workItem.fields[WITConstants.CoreFieldRefNames.AssignedTo], true);
        const projectName = workItem.fields[WITConstants.CoreFieldRefNames.TeamProject];
        const user = {
            titlePrefix: assignedToIdentity ? Resources.AssignedToPrefix : null,
            displayName: assignedToIdentity ? assignedToIdentity.displayName : Resources.AssignedToEmptyText,
            uniqueName: assignedToIdentity ? assignedToIdentity.uniqueName : "",
            id: assignedToIdentity ? assignedToIdentity.id : "",
            imageUrl: getAvatarUrl(assignedToIdentity)
        };

        // Artifact href
        const href = tfsContext.getActionUrl("edit", "workitems", {
            project: projectName,
            team: Utils_String.equals(tfsContext.navigation.project, projectName, true) ? tfsContext.navigation.team : null,
            parameters: [workItem.id]
        });

        // Artifact type icon
        const type = workItem.fields[WITConstants.CoreFieldRefNames.WorkItemType];
        const project = workItem.fields[WITConstants.CoreFieldRefNames.TeamProject];
        let typeIcon: IArtifactIcon;
        typeIcon = {
            type: ArtifactIconType.icon,
            descriptor: this._workItemTypeColorAndIconsProvider.getColorAndIcon(project, type) as IArtifactIconDescriptor,
            title: workItem.fields[WITConstants.CoreFieldRefNames.WorkItemType]
        };

        // Populate primary data
        const primaryData: Contracts.IInternalLinkedArtifactPrimaryData = {
            typeName: workItem.fields[WITConstants.CoreFieldRefNames.WorkItemType],
            displayId: workItem.id.toString(),
            href: href,
            title: workItem.fields[WITConstants.CoreFieldRefNames.Title],
            typeIcon: typeIcon,
            user: user,
            callback: (miscData: any, hostArtifact?: Contracts.IHostArtifact, e?: Contracts.IEvent) => {
                const executedEvent = new Telemetry.TelemetryEventData(
                    CustomerIntelligenceConstants.WITCustomerIntelligenceArea.WORK_ITEM_TRACKING,
                    CustomerIntelligenceConstants.WITCustomerIntelligenceFeature.CLIENTSIDEOPERATION_RELATEDWORKITEMS_CONTROL_OPENWORKITEM, {
                        "workItemId": workItem.id.toString(),
                        "hostArtifactId": hostArtifact ? hostArtifact.id.toLowerCase() : null,
                        "hostArtifactTool": hostArtifact ? hostArtifact.tool.toLowerCase() : null,
                        "hostArtifactType": hostArtifact ? hostArtifact.type.toLowerCase() : null
                    });
                Telemetry.publishEvent(executedEvent);
                const result = Events_Action.getService().performAction("open-work-item", {
                    id: workItem.id,
                    tfsContext: tfsContext
                });


                if (result === LinkedWorkItemDataProviderConstants.WorkItemOpenNotHandled) {
                    // No action worker handled this action, try to do fps
                    const tfsContextProject = tfsContext.contextData.project;
                    if (tfsContextProject && Utils_String.equals(project, tfsContextProject.name, true)) {
                        getLocalService(HubsService).getHubNavigateHandler(getWorkItemsHubId(), primaryData.href)(e);
                        return true;
                    }
                    // No action worker handled this action, return false to let the browser perform default action
                    return false;
                }

                return true;
            }
        };

        return primaryData;
    }

    protected _getLastUpdateData(workItem: WorkItem, tfsContext: TFS_Host_TfsContext.TfsContext): ILinkedArtifactAdditionalData {
        const changedByIdentity = convertPotentialIdentityRefFromFieldValue(workItem.fields[WITConstants.CoreFieldRefNames.ChangedBy], true);
        const lastChangedFieldValue = workItem.fields[WITConstants.CoreFieldRefNames.ChangedDate];
        const lastChangedDate: Date = Utils_Date.parseDateString(lastChangedFieldValue);

        return this._getFriendlyLastUpdateData(changedByIdentity, lastChangedDate);
    }

    protected _getFriendlyLastUpdateData(changedByIdentity, lastChangedDate: Date): ILinkedArtifactAdditionalData {
        if (changedByIdentity && lastChangedDate) {
            const lastChangedFriendlyText = Utils_Date.friendly(lastChangedDate);
            return {
                // Text - Sample "Updated 20 hours ago"
                styledText: { text: Utils_String.format(Resources.WorkItemArtifactLastUpdatedLabel, lastChangedFriendlyText) },

                // ToolTip - Sample "Updated by VSEQA1 on Wednesday, December 01, 2012 00:00:00 PM"
                title: Utils_String.format(Resources.WorkItemArtifactLastUpdatedByLabel, changedByIdentity.displayName, Utils_Date.localeFormat(lastChangedDate, "F")),

                rawData: lastChangedDate
            };
        }
    }

    protected _getIdentityData(column: Contracts.IColumn, workItem: WorkItem): ILinkedArtifactAdditionalData {
        const refName = column.refName;
        if (workItem.fields[refName]) {
            const identityRef = convertPotentialIdentityRefFromFieldValue(workItem.fields[refName], true);
            return {
                styledText: { text: identityRef.displayName },
                title: WITIdentityHelpers.getUniqueIdentityNameForContextIdentity(identityRef.uniqueName, identityRef.displayName),
                rawData: identityRef.displayName
            };
        }

        return null;
    }

    protected _getStateData(workItem: WorkItem, tfsContext: TFS_Host_TfsContext.TfsContext, linkedArtifact: ILinkedArtifact): ILinkedArtifactAdditionalData {
        const workItemType = workItem.fields[WITConstants.CoreFieldRefNames.WorkItemType];
        const workItemState = workItem.fields[WITConstants.CoreFieldRefNames.State];
        const projectName = workItem.fields[WITConstants.CoreFieldRefNames.TeamProject];
        let stateIcon: IArtifactIcon = null;

        if (this._workItemStatesColorProvider.isPopulated(projectName)) {
            stateIcon = {
                type: ArtifactIconType.colorCircle,
                descriptor: this._workItemStatesColorProvider.getColor(projectName, workItemType, workItemState),
                title: workItem.fields[WITConstants.CoreFieldRefNames.State]
            };
        }

        return {
            icon: stateIcon,
            styledText: { text: workItemState },
            title: workItemState
        };
    }

    protected _getColumnData(column: Contracts.IColumn, workItem: WorkItem, tfsContext: TFS_Host_TfsContext.TfsContext): ILinkedArtifactAdditionalData {
        const refName = column.refName;

        // Treat id in a special way since it's not contained in the "fields" object
        if (refName === WITConstants.CoreFieldRefNames.Id) {
            const idString = workItem.id.toString(10);

            return {
                styledText: { text: idString },
                title: idString,
                rawData: workItem.id
            };
        }

        if (workItem.fields[refName]) {
            let fieldValue = workItem.fields[refName];
            if (column.type === Contracts.LinkColumnType.DateTime && typeof fieldValue === "string") {
                // From the rest client the dates are given back to us as strings. Based on the type information available in IColumn
                // we can parse the date and then we can convert to display string based on the current locale.
                // So if type is date, parse the string as date.
                fieldValue = Utils_Date.parseDateString(fieldValue);
            }
            const displayString = Utils_Core.convertValueToDisplayString(fieldValue);
            return {
                styledText: { text: displayString },
                title: displayString,
                rawData: fieldValue
            };
        }

        return null;
    }

    protected _beginGetWorkItems(
        ids: number[],
        columns: Contracts.IColumn[],
        tfsContext: TFS_Host_TfsContext.TfsContext,
        hostArtifact?: Contracts.IHostArtifact,
        filter?: Contracts.ILinkedArtifactSubtypeFilterConfiguration
    ): IPromise<WorkItem[]> {

        const finishWorkItems = (workItems: WorkItem[]) => {
            if (!workItems || workItems.length === 0) {
                return Q([]);
            }

            const projectNames = workItems.map(w => w.fields[WITConstants.CoreFieldRefNames.TeamProject]);
            const colorPromises: IPromise<void>[] = [
                this._workItemTypeColorAndIconsProvider.ensureColorAndIconsArePopulated(projectNames)
            ];

            // Only retrieve state colors when the state column is requested
            const containsStateColumn = columns.some(c => Utils_String.equals(c.refName, WITConstants.CoreFieldRefNames.State, true));
            if (containsStateColumn) {
                colorPromises.push(this._workItemStatesColorProvider.ensureColorsArePopulated(projectNames));
            }

            return Q.allSettled(colorPromises).then(() => workItems, (reason) => workItems);
        };

        let fields = LinkedWorkItemDataProviderConstants.RequiredFields.concat(columns.map(c => c.refName).filter(refName => {
            return !Utils_String.equals(refName, Contracts.InternalKnownColumns.Comment.refName, true)
                && !Utils_String.equals(refName, Contracts.InternalKnownColumns.Link.refName, true);
        }));

        fields = Utils_Array.unique(fields, Utils_String.ignoreCaseComparer);

        const project: string = hostArtifact
            && hostArtifact.additionalData
            && (hostArtifact.additionalData[Contracts.HostArtifactAdditionalData.ProjectName]
                || hostArtifact.additionalData[Contracts.HostArtifactAdditionalData.ProjectId])
            || null;

        return PageWorkItemHelper.pageWorkItems(ids, project, fields).then(workItems => finishWorkItems(workItems));
    }
}
