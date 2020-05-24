import { findIndex } from "OfficeFabric/Utilities";

import * as Service from "VSS/Service";
import * as Utils_String from "VSS/Utils/String";

import { IPickListItem } from "VSSUI/PickList";
import { IFilterItemState, IFilterState } from "VSSUI/Utilities/Filter";

import { IUpstreamSettingsRowData } from "Package/Scripts/Components/Settings/UpstreamSettingsList";
import { HubWebPageDataService } from "Package/Scripts/DataServices/WebPageDataService";
import { IPackageProtocol } from "Package/Scripts/Protocols/Common/IPackageProtocol";
import { ProtocolProvider } from "Package/Scripts/Protocols/ProtocolProvider";
import { IHubState } from "Package/Scripts/Types/IHubState";
import { WebPageConstants } from "Package/Scripts/Types/WebPage.Contracts";
import { Feed, UpstreamSource_All, UpstreamSource_Local } from "Package/Scripts/WebApi/VSS.CustomFeed.Contracts";
import { UpstreamSource } from "Package/Scripts/WebApi/VSS.Feed.Contracts";

import { PackageFilterBarConstants } from "Feed/Common/Constants/Constants";
import * as PackageResources from "Feed/Common/Resources";
import { BowtieIconProps } from "Feed/Common/Utils/Icons";

// this is a weak test, the server will perform more thorough validation
export function isSameUpstreamSource(source: UpstreamSource, target: UpstreamSource): boolean {
    if ((source && !target) || (!source && target)) {
        return false;
    }

    if (source.name && source.name !== target.name) {
        return false;
    }

    if (!isSameLocation(source, target)) {
        return false;
    }

    if (source.protocol && source.protocol !== target.protocol) {
        return false;
    }

    if (source.upstreamSourceType && source.upstreamSourceType !== target.upstreamSourceType) {
        return false;
    }

    return true;
}

function isSameLocation(source: UpstreamSource, target: UpstreamSource): boolean {
    if (source.location && source.location === target.location) {
        return true;
    }

    if (
        source.internalUpstreamCollectionId === target.internalUpstreamCollectionId &&
        source.internalUpstreamFeedId === target.internalUpstreamFeedId &&
        source.internalUpstreamViewId === target.internalUpstreamViewId
    ) {
        return true;
    }

    return false;
}

export function filterDefaultUpstreamSources(
    feed?: Feed,
    protocolMap?: IDictionaryStringTo<IPackageProtocol>
): UpstreamSource[] {
    const webPageDataService = Service.getLocalService(HubWebPageDataService);
    const defaultUpstreamSources = webPageDataService.getDefaultPublicUpstreamSources();

    return filterUpstreamSources(defaultUpstreamSources, feed, protocolMap);
}

export function filterUpstreamSources(
    upstreamSources: UpstreamSource[],
    feed?: Feed,
    protocolMap?: IDictionaryStringTo<IPackageProtocol>
): UpstreamSource[] {
    return upstreamSources.filter(upstreamSource => {
        const protocol = ProtocolProvider.get(upstreamSource.protocol);
        return protocol !== null && protocol.supportsUpstreams(feed);
    });
}

export function getUpstreamSourceRowData(
    feed: Feed
): {
    protocolFilterValues: IPackageProtocol[];
    upstreamSources: IUpstreamSettingsRowData[];
} {
    const protocolsSeen = new Set<string>();
    const protocolList: IPackageProtocol[] = [];

    const invalidProtocol: IPackageProtocol = {
        name: "Unknown",
        key: "Unknown",
        vssIconProps: new BowtieIconProps("status-warning"),
        supportsUpstreams: (): boolean => false
    } as IPackageProtocol;

    const nonDeletedUpstreamSources = feed.upstreamSources.filter(
        (upstreamSource: UpstreamSource) => upstreamSource.deletedDate == null
    );
    const rowData = nonDeletedUpstreamSources.map((source: UpstreamSource) => {
        const protocol = ProtocolProvider.get(source.protocol) || invalidProtocol;

        if (!protocolsSeen.has(protocol.name)) {
            protocolsSeen.add(protocol.name);
            protocolList.push(protocol);
        }

        return {
            isInvalid: !protocol.supportsUpstreams(feed),
            iconProps: protocol.vssIconProps,
            protocolName: protocol.name,
            upstreamSource: source
        } as IUpstreamSettingsRowData;
    });

    return {
        protocolFilterValues: protocolList,
        upstreamSources: rowData
    };
}

/**
 * Give list of upstream sources that needs to be displayed in grid
 * @param upstreamSourcesInFeed - Initial set of upstream sources set on feed
 * @param upstreamSourcesToAdd - User wants to add these upstream sources
 * @param upstreamSourcesToRemove - User wants to remove these upstream sources
 */
export function mergeUpstreamSources(
    upstreamSourcesInFeed: UpstreamSource[],
    upstreamSourcesToAdd: UpstreamSource[],
    upstreamSourcesToRemove: UpstreamSource[]
): UpstreamSource[] {
    // get list of names to remove
    const upstreamSourcesToRemoveMap: IDictionaryStringTo<string> = {};
    for (const upstreamSource of upstreamSourcesToRemove) {
        upstreamSourcesToRemoveMap[upstreamSource.name] = upstreamSource.name;
    }

    const upstreamSources: UpstreamSource[] = [];

    // remove existing upstream sources
    for (const upstreamSource of upstreamSourcesInFeed) {
        if (upstreamSourcesToRemoveMap[upstreamSource.name] == null && upstreamSource.deletedDate == null) {
            upstreamSources.push(upstreamSource);
        }
    }

    // add new upstream sources
    return upstreamSources.concat(...upstreamSourcesToAdd);
}

function sourceKeyToUpstreamSource(
    source: string,
    upstreamSources: UpstreamSource[],
    getStringEvaluation: (upstreamSource: UpstreamSource, source: string) => boolean
): UpstreamSource {
    if (upstreamSources == null || upstreamSources.length === 0) {
        return null;
    }

    const index: number = findIndex(upstreamSources, (upstreamSource: UpstreamSource) => {
        return getStringEvaluation(upstreamSource, source);
    });

    if (index > -1) {
        return upstreamSources[index];
    }

    return null;
}

export function urlSourceToUpstreamSource(hubState: IHubState, upstreamSources: UpstreamSource[]): UpstreamSource {
    const sourceKey = hubState.upstreamSource;
    switch (sourceKey) {
        case null:
            return null;
        case PackageResources.UpstreamSourceKey_All:
            return UpstreamSource_All;
        case PackageResources.UpstreamSourceKey_Local:
            return UpstreamSource_Local;
        case PackageResources.UpstreamSourceKey_Cache /* for legacy when npmjs was the only upstream source */:
            return upstreamSources[0];
    }

    if (hubState.protocolType == null) {
        const stringEvaluationCallback = (upstreamSource, source) =>
            Utils_String.equals(upstreamSource.name, source, true);
        return sourceKeyToUpstreamSource(sourceKey, upstreamSources, stringEvaluationCallback);
    }

    const protocolStringEvaluationCallback = (upstreamSource, source) =>
        Utils_String.equals(Utils_String.format("{0},{1}", upstreamSource.protocol, upstreamSource.name), source, true);
    return sourceKeyToUpstreamSource(
        Utils_String.format("{0},{1}", hubState.protocolType, sourceKey),
        upstreamSources,
        protocolStringEvaluationCallback
    );
}

export function filterSourceKeyToUpstreamSource(sourceKey: string, upstreamSources: UpstreamSource[]): UpstreamSource {
    switch (sourceKey) {
        case null:
            return UpstreamSource_All;
        case WebPageConstants.DirectUpstreamSourceIdForThisFeedFilter:
            return UpstreamSource_Local;
        default:
            const stringEvaluationCallback = (upstreamSource, source) =>
                Utils_String.equals(upstreamSource.id, source, true);
            return sourceKeyToUpstreamSource(sourceKey, upstreamSources, stringEvaluationCallback);
    }
}

export function filterStateToUpstreamSource(
    filterState: IFilterState,
    upstreamSources: UpstreamSource[]
): UpstreamSource {
    const filterSourceState: IFilterItemState = filterState[PackageFilterBarConstants.SourceFilterKey];

    // if filterbar Clear was used, filterState will be null
    // if dropdown Clear was used, value will be empty
    if (filterSourceState != null && filterSourceState.value.length > 0) {
        const directUpstreamSourceId = filterSourceState.value[0].key;

        return filterSourceKeyToUpstreamSource(directUpstreamSourceId, upstreamSources);
    }

    return null;
}

export function upstreamSourceToPickListItem(upstreamSource: UpstreamSource): IPickListItem {
    const icon = ProtocolProvider.get(upstreamSource.protocol).vssIconProps;
    const label = Utils_String.format("{0} {1}", upstreamSource.protocol, upstreamSource.name);
    return {
        key: upstreamSource.id, // directUpstreamSourceId
        name: upstreamSource.name,
        iconProps: icon,
        ariaLabel: label
    } as IPickListItem;
}

export function getProtocolFromUpstreamSource(feed: Feed): string {
    if (
        feed.upstreamEnabled &&
        feed.upstreamSource != null &&
        feed.upstreamSource.name !== UpstreamSource_All.name &&
        feed.upstreamSource.name !== UpstreamSource_Local.name
    ) {
        return feed.upstreamSource.protocol;
    }

    return null;
}
