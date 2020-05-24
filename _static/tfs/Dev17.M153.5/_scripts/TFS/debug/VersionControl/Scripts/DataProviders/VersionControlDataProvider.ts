import * as Q from "q";
import Ajax = require("Presentation/Scripts/TFS/TFS.Legacy.Ajax");
import { ArtifactTypeNames } from "VSS/Artifacts/Constants";
import Artifacts_Services = require("VSS/Artifacts/Services");
import TFS_OM_Common = require("Presentation/Scripts/TFS/TFS.OM.Common");
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import PresentationResource = require("Presentation/Scripts/TFS/Resources/TFS.Resources.Presentation");
import Utils_Date = require("VSS/Utils/Date");
import Utils_String = require("VSS/Utils/String");

import * as DataProvider from "Presentation/Scripts/TFS/Controls/LinkedArtifacts/DataProvider/DataProvider";
import * as LinkedArtifacts from "Presentation/Scripts/TFS/Controls/LinkedArtifacts/Contracts";
import { ILinkedArtifact, ILinkedArtifactAdditionalData, ArtifactIconType } from "TFS/WorkItemTracking/ExtensionContracts";

import VCLegacyContracts = require("VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts");
import VCSpecs = require("VersionControl/Scripts/TFS.VersionControl.VersionSpecs");
import VCResources = require("VersionControl/Scripts/Resources/TFS.Resources.VersionControl");
import { ChangesetArtifact } from "VersionControl/Scripts/ChangesetArtifact";
import { TfvcHttpClient } from "TFS/VersionControl/TfvcRestClient";
import { tfvcVersionSpecToVersionDescriptor } from "VersionControl/Scripts/VersionSpecUtils";
import * as VersionControlUtils from "VersionControl/Scripts/TFS.VersionControl";
import TFS_VersionControl_Contracts = require("TFS/VersionControl/Contracts");

export interface IArtifactInfo {
    linkedArtifact: ILinkedArtifact;
    artifact?: Artifacts_Services.Artifact;
    resolved?: boolean;
}

export default class VersionControlDataProvider implements DataProvider.ILinkedArtifactsDataProvider {
    /** Tool the plugin supports e.g. git, build, workitemtracking */
    public supportedTool: string;

    /** Called for retrieving artifact data
     * @param artifacts Raw artifacts
     * @param columns Set of columns to return data for
     * @param tfsContext The current tfs context (this can be used to generate correct href etc with the current team)
     * @param hostArtifact The host artifact, it will be falsy when the host artifact is new (e.g. New Work Item)
     * @returns Display data needed for rendering etc.
    */
    public beginGetDisplayData(
        artifacts: ILinkedArtifact[],
        columns: LinkedArtifacts.IColumn[],
        tfsContext: TfsContext,
        hostArtifact?: LinkedArtifacts.IHostArtifact
    ): IPromise<LinkedArtifacts.IInternalLinkedArtifactDisplayData[]> {

        const artifactMap: IDictionaryStringTo<IArtifactInfo> = {};
        const changesetRequestData: TFS_VersionControl_Contracts.TfvcChangesetsRequestData = { changesetIds: [], commentLength: 2048, includeLinks: true };
        const itemRequestData: TFS_VersionControl_Contracts.TfvcItemRequestData = { includeContentMetadata: true, includeLinks: true, itemDescriptors: [] };
        const legacyLatestVersionItemIds: string[] = [];
        const legacyLatestVersionItemMap: IDictionaryStringTo<ILinkedArtifact> = {};
        
        for (const artifact of artifacts) {
            if (Utils_String.ignoreCaseComparer(artifact.type, ArtifactTypeNames.Changeset) === 0) {
                artifactMap[artifact.id] = { linkedArtifact: artifact, artifact: new ChangesetArtifact(artifact) };
                changesetRequestData.changesetIds.push(parseInt(artifact.id, 10));
            } else if (Utils_String.ignoreCaseComparer(artifact.type, ArtifactTypeNames.LatestItemVersion) === 0) {
                legacyLatestVersionItemMap[artifact.id] = artifact;
                legacyLatestVersionItemIds.push(artifact.id);
            } else if (Utils_String.ignoreCaseComparer(artifact.type, ArtifactTypeNames.VersionedItem) === 0) {
                const versionedItem: VersionControlUtils.VersionedItemArtifact = new VersionControlUtils.VersionedItemArtifact(artifact);
                const spec: VCSpecs.VersionSpec = VCSpecs.VersionSpec.parse(versionedItem.changesetId);
                const version: TFS_VersionControl_Contracts.TfvcVersionDescriptor = tfvcVersionSpecToVersionDescriptor(spec);

                artifactMap[versionedItem.path] = { linkedArtifact: artifact, artifact: versionedItem };
                itemRequestData.itemDescriptors.push({
                    path: versionedItem.path,
                    recursionLevel: TFS_VersionControl_Contracts.VersionControlRecursionType.None,
                    version: version.version,
                    versionOption: version.versionOption,
                    versionType: version.versionType
                });
            }
        }

        let displayData: LinkedArtifacts.IInternalLinkedArtifactDisplayData[] = [];

        const promises: IPromise<any>[] = [];
        const client = TFS_OM_Common.ProjectCollection.getDefaultConnection().getHttpClient<TfvcHttpClient>(TfvcHttpClient);

        if (changesetRequestData.changesetIds.length > 0) {
            promises.push(client.getBatchedChangesets(changesetRequestData).then((changesets: TFS_VersionControl_Contracts.TfvcChangesetRef[]) => {
                displayData = [ ...displayData, ...getChangesetDisplayData(changesets, artifactMap, tfsContext) ];
            }, (error: Error) => {
                // Eat the Error, Handled at the end
            }));
        }

        if (itemRequestData.itemDescriptors.length > 0) {
            promises.push(client.getItemsBatch(itemRequestData).then((versionedItems: TFS_VersionControl_Contracts.TfvcItem[][]) => {
                displayData = [ ...displayData, ...getVersionedItemDisplayData(versionedItems, artifactMap, tfsContext) ];
            }, (error: Error) => {
                // Eat the Error, Handled at the end
            }));
        }

        if (legacyLatestVersionItemIds.length > 0) {
            promises.push(retrieveLegacyLatestVersionItemData(legacyLatestVersionItemIds, tfsContext)
                .then((latestVersionedItems: VCLegacyContracts.TfsItem[]) => {
                    const artifactInfoMap: IDictionaryStringTo<IArtifactInfo> = {};
                    $.each(latestVersionedItems, (i: number, item: VCLegacyContracts.TfsItem) => {
                        artifactInfoMap[item.id] = {
                            linkedArtifact: legacyLatestVersionItemMap[item.id],
                            artifact: new VersionControlUtils.LatestItemVersionArtifact(legacyLatestVersionItemMap[item.id], item.serverItem)
                        };
                    });
                    displayData = [ ...displayData, ...getLatestVersionedItemDisplayData(latestVersionedItems, artifactInfoMap, tfsContext) ]
                }, (error: Error) => {
                    // Eat the Error, Handled at the end
                }));
        }

        return Q.all(promises).then(() => {
            displayData = [ ...displayData, ...getErrorDisplayData(artifactMap, tfsContext) ];
            return displayData;
        });
    }
}

function retrieveLegacyLatestVersionItemData(
    artifactsIds: string[],
    tfsContext: TfsContext
): IPromise<VCLegacyContracts.TfsItem[]> {

    const artifacts: VersionControlUtils.LatestItemVersionArtifact[] = [];
    const apiLocation = tfsContext.getActionUrl("itemsById", "versioncontrol", { area: "api" });

    return new Promise((resolve, reject) => {
        Ajax.getMSJSON(apiLocation, { ids: artifactsIds.join(",") },
        (items) => {
            resolve(items);
        }, 
        (error: Error) => {
            reject(error);
        });
    });
}

export function getChangesetPrimaryData(
    artifact: ILinkedArtifact, 
    tfsContext: TfsContext, 
    changeset: TFS_VersionControl_Contracts.TfvcChangesetRef,
    changesetArtifact: Artifacts_Services.Artifact
): LinkedArtifacts.IInternalLinkedArtifactPrimaryData {

    const changesetDetailsUrl = changeset && changeset._links && changeset._links.web && changeset._links.web.href;

    return {
        href: changesetDetailsUrl || changesetArtifact.getUrl(tfsContext.contextData),
        title: changesetArtifact.getTitle(),
        typeIcon: { type: ArtifactIconType.icon, title: artifact.linkTypeDisplayName, descriptor: "bowtie-tfvc-change-list" },
        user: changeset && changeset.author && {
            displayName: changeset.author.displayName,
            id: changeset.author.id,
            uniqueName: changeset.author.uniqueName
        }
    };
}

export function getVersionedItemPrimaryData(
    artifact: ILinkedArtifact,
    tfsContext: TfsContext,
    versionedItem: TFS_VersionControl_Contracts.TfvcItem,
    versionedItemArtifact: Artifacts_Services.Artifact
): LinkedArtifacts.IInternalLinkedArtifactPrimaryData {

    return {
        displayId: versionedItem && versionedItem.version && versionedItem.version.toString(10),
        href: versionedItemArtifact.getUrl(tfsContext.contextData),
        title: versionedItemArtifact.getTitle(),
        typeIcon: { type: ArtifactIconType.icon, title: artifact.linkTypeDisplayName, descriptor: "bowtie-file-content" }
    };
}

function getLatestVersionedItemPrimaryData(
    artifact: ILinkedArtifact,
    tfsContext: TfsContext,
    tfsItem: VCLegacyContracts.TfsItem,
    latestVersionedItemArtifact: Artifacts_Services.Artifact
): LinkedArtifacts.IInternalLinkedArtifactPrimaryData {
    return {
        displayId: artifact && artifact.id,
        href: latestVersionedItemArtifact.getUrl(tfsContext.contextData),
        title: latestVersionedItemArtifact.getTitle(),
        typeIcon: { type: ArtifactIconType.icon, title: artifact.linkTypeDisplayName, descriptor: "bowtie-file-content" }
    }
}

export function getAdditionalData(lastUpdatedDate: Date): IDictionaryStringTo<ILinkedArtifactAdditionalData> {
    const data: IDictionaryStringTo<ILinkedArtifactAdditionalData> = {};

    if (lastUpdatedDate) {
        data[LinkedArtifacts.InternalKnownColumns.LastUpdate.refName] = {
            styledText: { text: Utils_String.format(VCResources.LinkedArtifactsTfvcCreated, Utils_Date.friendly(lastUpdatedDate)) },
            title: Utils_Date.localeFormat(lastUpdatedDate, "F"),
            rawData: lastUpdatedDate
        };
    }

    return data;
}

export function getChangesetDisplayData(
    changesets: TFS_VersionControl_Contracts.TfvcChangesetRef[],
    artifactMap: IDictionaryStringTo<IArtifactInfo>,
    tfsContext: TfsContext
): LinkedArtifacts.IInternalLinkedArtifactDisplayData[] {

    const displayData: LinkedArtifacts.IInternalLinkedArtifactDisplayData[] = [];

    // filter null items
    changesets = (changesets || []).filter(changeset => Boolean(changeset));
        
    for (const changeset of changesets) {
        const info: IArtifactInfo = artifactMap[changeset.changesetId.toString(10)];
        info.resolved = true;
        const data: LinkedArtifacts.IInternalLinkedArtifactDisplayData = { ...info.linkedArtifact };
        data.primaryData = getChangesetPrimaryData(info.linkedArtifact, tfsContext, changeset, info.artifact);
        data.additionalData = getAdditionalData(changeset.createdDate);
        displayData.push(data);
    }

    return displayData;
}

export function getVersionedItemDisplayData(
    versionedItems: TFS_VersionControl_Contracts.TfvcItem[][],
    artifactMap: IDictionaryStringTo<IArtifactInfo>,
    tfsContext: TfsContext
): LinkedArtifacts.IInternalLinkedArtifactDisplayData[] {

    const displayData: LinkedArtifacts.IInternalLinkedArtifactDisplayData[] = [];

    // filter null items
    const items = (versionedItems || [])
        .reduce((items, itemsCur) => items.concat(itemsCur), [])
        .filter(item => Boolean(item));

    for (const item of items) {
        const info: IArtifactInfo = artifactMap[item.path];
        info.resolved = true;
        const data: LinkedArtifacts.IInternalLinkedArtifactDisplayData = { ...info.linkedArtifact };
        data.primaryData = getVersionedItemPrimaryData(info.linkedArtifact, tfsContext, item, info.artifact);
        data.additionalData = getAdditionalData(item.changeDate);
        displayData.push(data);
    }

    return displayData;
}

function getLatestVersionedItemDisplayData(
    latestVersionedItems: VCLegacyContracts.TfsItem[],
    artifactMap: IDictionaryStringTo<IArtifactInfo>,
    tfsContext: TfsContext
): LinkedArtifacts.IInternalLinkedArtifactDisplayData[] {

    const displayData: LinkedArtifacts.IInternalLinkedArtifactDisplayData[] = [];

    // filter null items
    const items = (latestVersionedItems || []).filter(item => Boolean(item));

        for (const item of items) {
            const info: IArtifactInfo = artifactMap[item.id];
            info.resolved = true;
            const data: LinkedArtifacts.IInternalLinkedArtifactDisplayData = { ...info.linkedArtifact };
            data.primaryData = getLatestVersionedItemPrimaryData(info.linkedArtifact, tfsContext, item, info.artifact);
            data.additionalData = getAdditionalData(item.changeDate);
            displayData.push(data);
        }

    return displayData;
}

export function getErrorDisplayData(
    artifacts: IDictionaryStringTo<IArtifactInfo>,
    tfsContext: TfsContext
): LinkedArtifacts.IInternalLinkedArtifactDisplayData[] {

    const displayData: LinkedArtifacts.IInternalLinkedArtifactDisplayData[] = [];

    for (const artifactId of Object.keys(artifacts)) {
        const info: IArtifactInfo = artifacts[artifactId];
        if (!info.resolved) {
            // show default primary data if the server call failed for this item
            const primaryData = Utils_String.ignoreCaseComparer(info.linkedArtifact.type, ArtifactTypeNames.Changeset) === 0
                ? getChangesetPrimaryData(info.linkedArtifact, tfsContext, null, info.artifact)
                : getVersionedItemPrimaryData(info.linkedArtifact, tfsContext, null, info.artifact);
            displayData.push({ ...info.linkedArtifact, primaryData });
        }
    }

    return displayData;
}
