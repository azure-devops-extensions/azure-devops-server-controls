/// <reference types="jquery" />

import VSS = require("VSS/VSS");
import VSSError = require("VSS/Error");
import WITConstants = require("Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import Ajax = require("Presentation/Scripts/TFS/TFS.Legacy.Ajax");
import Utils_String = require("VSS/Utils/String");
import Utils_Date = require("VSS/Utils/Date");
import Diag = require("VSS/Diag");
import Resources = require("WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking");
import TFS_OM_Common = require("Presentation/Scripts/TFS/TFS.OM.Common");
import TFS_OM_Identities = require("Presentation/Scripts/TFS/TFS.OM.Identities");
import Artifacts_Plugins = require("Presentation/Scripts/TFS/TFS.ArtifactPlugins");
import Artifacts_Services = require("VSS/Artifacts/Services");
import TFS_Wit_WebApi = require("TFS/WorkItemTracking/RestClient");
import TFS_Wit_Contracts = require("TFS/WorkItemTracking/Contracts");
import Q = require("q");
import Telemetry = require("VSS/Telemetry/Services");
import { WorkItemTypeColorAndIconsProvider } from "Presentation/Scripts/TFS/FeatureRef/WorkItemTypeColorAndIconsProvider";
import { WorkItemStateColorsProvider } from "Presentation/Scripts/TFS/FeatureRef/WorkItemStateColorsProvider";

import CustomerIntelligenceConstants = require("WorkItemTracking/Scripts/CustomerIntelligence");

export class WorkItemArtifactPlugin implements Artifacts_Plugins.IRelatedArtifactsPlugin {

    public supportedTool: string = "workitemtracking";
    public static ARTIFACT_TYPE: string = "workitem";

    protected _workItemTypeColorProvider = WorkItemTypeColorAndIconsProvider.getInstance();
    protected _workItemStatesColorProvider = WorkItemStateColorsProvider.getInstance();

    public beginGetDisplayData(artifacts: Artifacts_Services.IArtifactData[], tfsContext: TFS_Host_TfsContext.TfsContext, hostArtifact?: Artifacts_Services.IArtifactData): IPromise<Artifacts_Plugins.IArtifactDisplayData[]> {
        Diag.Debug.assertIsArray(artifacts, "expected artifacts to be an array");

        let independentPromises: IPromise<void>[] = [];
        let currentProject = tfsContext.contextData.project;

        if (currentProject && currentProject.name) {
            // Get workitem type colors for current project
            independentPromises.push(this._workItemStatesColorProvider.ensureColorsArePopulated([currentProject.name]));

            // Get workitem state colors for current project
            independentPromises.push(this._workItemTypeColorProvider.ensureColorAndIconsArePopulated([currentProject.name]));
        }

        // Begin get workitems and process results
        let witHttpClient = TFS_OM_Common.ProjectCollection.getDefaultConnection().getHttpClient<TFS_Wit_WebApi.WorkItemTrackingHttpClient>(TFS_Wit_WebApi.WorkItemTrackingHttpClient);
        let ids = [];
        for (let artifact of artifacts) {
            ids.push(artifact.id);
        };

        return witHttpClient.getWorkItems(ids).then(
            (workitems: TFS_Wit_Contracts.WorkItem[]) => {

                if(!workitems || workitems.length === 0){
                    return Q([]);
                }                
                
                let projectNames = workitems.map(w => w.fields[WITConstants.CoreFieldRefNames.TeamProject]);
                let independentPromises: IPromise<void>[] = [
                    this._workItemStatesColorProvider.ensureColorsArePopulated(projectNames),
                    this._workItemTypeColorProvider.ensureColorAndIconsArePopulated(projectNames)
                ];

                let processWorkItems = () => {
                    var retValue: Artifacts_Plugins.IArtifactDisplayData[] = [];

                    for (var workItem of workitems) {
                        retValue.push(this._getArtifactDisplayDataForWorkItem(workItem, tfsContext));
                    }

                    return retValue;
                }

                // Process workitems once all the promises are settled
                return Q.allSettled(independentPromises).then(
                    results => processWorkItems(),
                    error => processWorkItems()
                );
            });
    }

    public comparer(a: Artifacts_Plugins.IArtifactDisplayData, b: Artifacts_Plugins.IArtifactDisplayData): number {

        // 1 - Compare workitem types
        let witypeCompareRes = Utils_String.localeIgnoreCaseComparer(a.miscData.workItemType, b.miscData.workItemType);
        if (witypeCompareRes !== 0) {
            return witypeCompareRes;
        }

        // 2 - Compare workitem states
        let wistateCompareRes = Utils_String.localeIgnoreCaseComparer(a.miscData.state, b.miscData.state);
        if (wistateCompareRes !== 0) {
            return wistateCompareRes;
        }

        // 3 - Compare workitem titles
        let wititleCompareRes = Utils_String.localeIgnoreCaseComparer(a.primaryData.title, b.primaryData.title);
        if (wititleCompareRes !== 0) {
            return wititleCompareRes;
        }

        // 4 - Compare workitem ids
        let wiIdCompareRes = Utils_String.localeIgnoreCaseComparer(a.id, b.id);
        return wiIdCompareRes;
    }

    public getArtifactDisplayString(count: number, artifactType: string): string {
        let resourceString = count === 1 ? Resources.WorkItemRemainingArtifactsDisplayStringSingular :
            Resources.WorkItemRemainingArtifactsDisplayStringPlural;

        return Utils_String.format(resourceString, count);
    }

    protected _getArtifactDisplayDataForWorkItem(workItem: TFS_Wit_Contracts.WorkItem, tfsContext: TFS_Host_TfsContext.TfsContext): Artifacts_Plugins.IArtifactDisplayData {

        // Get primary data
        let primaryData = this._getRelatedArtifactPrimaryDataForWorkItem(workItem, tfsContext);

        // Get additional data
        let additionalData = this._getRelatedArtifactAdditionalDataForWorkItem(workItem, tfsContext);

        // Misc Data
        let miscData: any = {
            "workItemType": workItem.fields[WITConstants.CoreFieldRefNames.WorkItemType],
            "state": workItem.fields[WITConstants.CoreFieldRefNames.State]
        };

        return {
            id: workItem.id.toString(10),
            tool: this.supportedTool,
            type: WorkItemArtifactPlugin.ARTIFACT_TYPE,

            primaryData: primaryData,
            additionalData: additionalData,
            miscData: miscData
        };
    }

    protected _getRelatedArtifactPrimaryDataForWorkItem(workItem: TFS_Wit_Contracts.WorkItem, tfsContext: TFS_Host_TfsContext.TfsContext): Artifacts_Plugins.IRelatedArtifactPrimaryData {

        // Populate user/identity details
        let uniquifiedAssignedToIdentity = workItem.fields[WITConstants.CoreFieldRefNames.AssignedTo];
        let assignedToIdentity = TFS_OM_Identities.IdentityHelper.parseUniquefiedIdentityName(uniquifiedAssignedToIdentity);
        let user = {
            titlePrefix: assignedToIdentity ? Resources.AssignedToPrefix : null,
            displayName: assignedToIdentity ? assignedToIdentity.displayName : Resources.AssignedToEmptyText,
            uniqueName: assignedToIdentity ? assignedToIdentity.uniqueName : "",
            id: assignedToIdentity ? assignedToIdentity.id : ""
        };

        // Artifact href
        let href = tfsContext.getActionUrl("edit", "workitems", {
            project: tfsContext.navigation.project,
            team: tfsContext.navigation.team,
            parameters: [workItem.id]
        });

        const projectName = workItem.fields[WITConstants.CoreFieldRefNames.TeamProject];
        const workItemType = workItem.fields[WITConstants.CoreFieldRefNames.WorkItemType];

        // Artifact type icon
        let typeIcon = {
            type: Artifacts_Plugins.ArtifactIconType.colorBar,
            descriptor: this._workItemTypeColorProvider.getColor(projectName, workItemType),
            title: workItemType
        };

        // Populate primary data
        let primaryData: Artifacts_Plugins.IRelatedArtifactPrimaryData = {
            displayId: workItem.id.toString(),
            href: href,
            title: workItem.fields[WITConstants.CoreFieldRefNames.Title],
            typeIcon: typeIcon,
            user: user,
            callback: (miscData: any, hostArtifact?: Artifacts_Services.IArtifactData) => {
                let executedEvent = new Telemetry.TelemetryEventData(
                    CustomerIntelligenceConstants.WITCustomerIntelligenceArea.WORK_ITEM_TRACKING,
                    CustomerIntelligenceConstants.WITCustomerIntelligenceFeature.CLIENTSIDEOPERATION_RELATEDWORKITEMS_CONTROL_OPENWORKITEM, {
                        "workItemId": workItem.id.toString(),
                        "hostArtifactId": hostArtifact ? hostArtifact.id.toLowerCase() : null,
                        "hostArtifactTool": hostArtifact ? hostArtifact.tool.toLowerCase() : null,
                        "hostArtifactType": hostArtifact ? hostArtifact.type.toLowerCase() : null
                    });
                Telemetry.publishEvent(executedEvent);
            }
        };

        return primaryData;
    }

    protected _getRelatedArtifactAdditionalDataForWorkItem(workItem: TFS_Wit_Contracts.WorkItem, tfsContext: TFS_Host_TfsContext.TfsContext): Artifacts_Plugins.IRelatedArtifactAdditionalData[] {

        // Additional Data: Last updated details
        let additionalData: Artifacts_Plugins.IRelatedArtifactAdditionalData[] = [];
        let uniquifiedChangedByIdentity = workItem.fields[WITConstants.CoreFieldRefNames.ChangedBy];
        let changedByIdentity = TFS_OM_Identities.IdentityHelper.parseUniquefiedIdentityName(uniquifiedChangedByIdentity);
        let lastChangedFieldValue = workItem.fields[WITConstants.CoreFieldRefNames.ChangedDate];

        if (changedByIdentity && lastChangedFieldValue) {
            let lastChangedDate: Date = Utils_Date.parseDateString(lastChangedFieldValue);
            let lastChangedFriendlyText = Utils_Date.friendly(lastChangedDate);
            additionalData.push({
                // Text - Sample "Updated 20 hours ago"
                text: Utils_String.format(Resources.WorkItemArtifactLastUpdatedLabel, lastChangedFriendlyText), // Text

                // ToolTip - Sample "Updated by VSEQA1 on Wednesday, December 01, 2012 00:00:00 PM"
                title: Utils_String.format(Resources.WorkItemArtifactLastUpdatedByLabel, changedByIdentity.displayName, Utils_Date.localeFormat(lastChangedDate, "F"))
            });
        }

        // Additional Data: workitem state
        let workItemType = workItem.fields[WITConstants.CoreFieldRefNames.WorkItemType];
        let workItemState = workItem.fields[WITConstants.CoreFieldRefNames.State];
        let projectName = workItem.fields[WITConstants.CoreFieldRefNames.TeamProject];
        let stateIcon: Artifacts_Plugins.IArtifactIcon = null;

        if (projectName && this._workItemStatesColorProvider.isPopulated(projectName)) {
            stateIcon = {
                type: Artifacts_Plugins.ArtifactIconType.colorCircle,
                descriptor: this._workItemStatesColorProvider.getColor(projectName, workItemType, workItemState),
                title: workItem.fields[WITConstants.CoreFieldRefNames.State]
            };
        }

        additionalData.push({
            icon: stateIcon,
            text: workItemState, // Text
            title: workItemState // ToolTip
        });

        return additionalData;
    }
}

// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("TFS.WorkItemTracking.Artifacts.Plugin", exports);
