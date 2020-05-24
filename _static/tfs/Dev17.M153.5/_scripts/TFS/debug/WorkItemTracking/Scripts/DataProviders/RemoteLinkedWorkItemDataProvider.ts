import * as Contracts from "Presentation/Scripts/TFS/Controls/LinkedArtifacts/Contracts";
import { WorkItemStateColorsProvider } from "Presentation/Scripts/TFS/FeatureRef/WorkItemStateColorsProvider";
import { WorkItemTypeColorAndIcons } from "Presentation/Scripts/TFS/FeatureRef/WorkItemTypeColorAndIconsProvider";
import { CoreFieldRefNames } from "Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { WorkItem, WorkItemStateColor, WorkItemTypeColorAndIcon } from "TFS/WorkItemTracking/Contracts";
import { ArtifactIconType, IArtifactIcon, ILinkedArtifact, ILinkedArtifactAdditionalData, RemoteLinkStatus } from "TFS/WorkItemTracking/ExtensionContracts";
import * as Artifacts_Constants from "VSS/Artifacts/Constants";
import { isEmptyGuid, isGuid } from "VSS/Utils/String";
import WorkItemTrackingDataProvider, { LinkedWorkItemDataProviderConstants } from "WorkItemTracking/Scripts/DataProviders/LinkedWorkItemDataProvider";
import { getMetadataKey, getRemoteWorkItemsById, IRemoteWorkItemData, getRemoteWorkItemByUrl, IRemoteWebApiWorkItemData } from "WorkItemTracking/Scripts/OM/RemoteWorkItemProviderDataSource";
import { getRemoteContext } from "WorkItemTracking/Scripts/Utils/RemoteWorkItemUtils";
import { convertPotentialIdentityRefFromFieldValue } from "WorkItemTracking/Scripts/Utils/WorkItemIdentityHelper";
import { allSettled, IResolvedPromiseResult } from "VSSPreview/Utilities/PromiseUtils";

export default class RemoteWorkItemTrackingDataProvider extends WorkItemTrackingDataProvider {

    private typeColorMap: IDictionaryStringTo<WorkItemTypeColorAndIcon> = {};
    private stateColorMap: IDictionaryStringTo<WorkItemStateColor> = {};

    protected _getData(
        ids: number[],
        columns: Contracts.IColumn[],
        tfsContext: TfsContext,
        hostArtifact?: Contracts.IHostArtifact,
        linkedArtifacts?: ILinkedArtifact[],
    ): IPromise<WorkItem[]> {

        // For remote workitem links, we get all the remote workitem links and not grouped by host id and projectid
        // Here we get workitem by grouping them into host and project
        // Once all the promise is settled we return the results.
        const getRemoteWorkItemsPromises: Promise<WorkItem[]>[] = [];
        const remoteWorkItemMapByHostIdAndProjectId: IDictionaryStringTo<ILinkedArtifact[]> = {};

        for (const linkedArtifact of linkedArtifacts) {
            const remoteHostId = linkedArtifact.remoteHostId;
            const remoteProjectId = linkedArtifact.remoteProjectId;
            const remoteStatus = linkedArtifact.remoteStatus;

            // Skip failed remote links
            if (remoteStatus !== RemoteLinkStatus.Failed) {
                const key = remoteHostId + remoteProjectId;
                remoteWorkItemMapByHostIdAndProjectId[key] = remoteWorkItemMapByHostIdAndProjectId[key] || [];
                remoteWorkItemMapByHostIdAndProjectId[key].push(linkedArtifact);
            }
        }

        // If there no items, resolve immediately with workitems so that the history control can show the error message
        const remoteHostIdProjectIdKeys = Object.keys(remoteWorkItemMapByHostIdAndProjectId);
        if (remoteHostIdProjectIdKeys.length === 0) {
            return Promise.resolve([]);
        }

        for (const key of remoteHostIdProjectIdKeys) {

            const artifacts = remoteWorkItemMapByHostIdAndProjectId[key];
            const firstArtifact = artifacts[0];
            const remoteHostId = firstArtifact.remoteHostId;
            const remoteHostUrl = firstArtifact.remoteHostUrl;
            const remoteProjectId = firstArtifact.remoteProjectId;

            const workItemIds = artifacts.map((artifact) => {
                return parseInt(artifact.id);
            });
            getRemoteWorkItemsPromises.push(this._beginGetRemoteWorkItems([...workItemIds], remoteHostId, remoteHostUrl, remoteProjectId));
        }

        return allSettled(getRemoteWorkItemsPromises).then(results => {
            const workItems: WorkItem[] = [];
            for (const result of results) {
                if (result.state !== "rejected") {
                    const resolvedWorkItems = (result as IResolvedPromiseResult<WorkItem[]>).value;
                    workItems.push(...resolvedWorkItems);
                }
            }
            return workItems;
        },
            () => { return []; }
        );
    }

    protected _getLastUpdateData(workItem: WorkItem, tfsContext: TfsContext): ILinkedArtifactAdditionalData {
        const changedByIdentity = convertPotentialIdentityRefFromFieldValue(workItem.fields[CoreFieldRefNames.ChangedBy], true);
        const lastChangedFieldValue = workItem.fields[CoreFieldRefNames.ChangedDate];

        return this._getFriendlyLastUpdateData(changedByIdentity, lastChangedFieldValue);
    }

    protected _getPrimaryData(workItem: WorkItem, tfsContext: TfsContext, linkedArtifact: ILinkedArtifact): Contracts.IInternalLinkedArtifactPrimaryData {
        const workItemType = workItem.fields[CoreFieldRefNames.WorkItemType];
        const projectName = workItem.fields[CoreFieldRefNames.TeamProject];
        const { remoteHostId, remoteProjectId, remoteHostUrl } = linkedArtifact;
        const primaryData: Contracts.IInternalLinkedArtifactPrimaryData = super._getPrimaryData(workItem, tfsContext, linkedArtifact);
        // Artifact href
        let href: string;
        if (isGuid(remoteHostId) && !isEmptyGuid(remoteHostId)) {
            href = remoteHostUrl + tfsContext.getActionUrl("edit", "workitems", {
                project: projectName,
                parameters: [workItem.id],
                serviceHost: getRemoteContext(remoteHostId, remoteHostUrl).host
            });
        }

        let typeIcon: IArtifactIcon;

        const lookUpKey = getMetadataKey(remoteHostId, remoteProjectId, workItemType);
        const typeColor = this.typeColorMap[lookUpKey];
        const descriptor = (typeColor &&
            { color: WorkItemTypeColorAndIcons.transformColor(typeColor.color), icon: WorkItemTypeColorAndIcons.transformIcon(typeColor.icon) })
            || WorkItemTypeColorAndIcons.getDefault();
        typeIcon = {
            type: ArtifactIconType.icon,
            descriptor,
            title: workItemType
        };

        primaryData.href = href;
        primaryData.typeIcon = typeIcon;
        primaryData.callback = null; // Resetting the callback so that we open workitem always in new tab
        return primaryData;
    }

    protected _valueToDisplayData(linkedArtifact: ILinkedArtifact, workItem: WorkItem, columns: Contracts.IColumn[], tfsContext: TfsContext): Contracts.IInternalLinkedArtifactDisplayData {
        const linkedArtifactData = super._valueToDisplayData(linkedArtifact, workItem, columns, tfsContext);

        linkedArtifactData.tool = Artifacts_Constants.ToolNames.RemoteWorkItemTracking;

        const projectName = workItem && workItem.fields[CoreFieldRefNames.TeamProject];
        const subGroupValue = projectName ? `${linkedArtifact.remoteHostName}/${projectName}` : `${linkedArtifact.remoteHostName}`;

        if (linkedArtifactData.miscData) {
            linkedArtifactData.miscData[LinkedWorkItemDataProviderConstants.MiscDataSubGroupKey] = subGroupValue;
        } else {
            linkedArtifactData.miscData = {
                [LinkedWorkItemDataProviderConstants.MiscDataSubGroupKey]: subGroupValue
            };
        }

        return linkedArtifactData;
    }

    protected _getStateData(workItem: WorkItem, tfsContext: TfsContext, linkedArtifact?: ILinkedArtifact): ILinkedArtifactAdditionalData {
        const workItemType = workItem.fields[CoreFieldRefNames.WorkItemType];
        const workItemState = workItem.fields[CoreFieldRefNames.State];
        const { remoteHostId, remoteProjectId } = linkedArtifact;

        const lookUpKey = getMetadataKey(remoteHostId, remoteProjectId, workItemType, workItemState);
        const stateColor = this.stateColorMap[lookUpKey];
        const color = (stateColor && WorkItemTypeColorAndIcons.transformColor(stateColor.color)) || WorkItemStateColorsProvider.DEFAULT_STATE_COLOR;
        const stateIcon = {
            type: ArtifactIconType.colorCircle,
            descriptor: color,
            title: workItem.fields[CoreFieldRefNames.State]
        };
        return {
            icon: stateIcon,
            styledText: { text: workItemState },
            title: workItemState
        };
    }

    private async _beginGetRemoteWorkItems(
        ids: number[],
        remoteHostId: string,
        remoteHostUrl: string,
        remoteProjectId: string
    ): Promise<WorkItem[]> {

        const dataProviderData = await getRemoteWorkItemsById([...ids], remoteHostId, remoteHostUrl, remoteProjectId);
        if (dataProviderData) {
            const workItems = dataProviderData["work-items-data"].map((remoteWorkItemData: IRemoteWorkItemData) => {
                const workItem = remoteWorkItemData["work-item-data"];
                const workItemType = workItem.fields[CoreFieldRefNames.WorkItemType];
                const state = workItem.fields[CoreFieldRefNames.State];
                const typeColorLookUpKey = getMetadataKey(remoteHostId, remoteProjectId, workItemType);
                const stateColorLookUpKey = getMetadataKey(remoteHostId, remoteProjectId, workItemType, state);
                this.typeColorMap[typeColorLookUpKey] = remoteWorkItemData["work-item-type-color-icon"];
                this.stateColorMap[stateColorLookUpKey] = remoteWorkItemData["work-item-type-state-color"];
                return workItem;
            });

            return workItems;
        }

        return [];
    }
}
