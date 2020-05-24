import { ignoreCaseComparer } from "VSS/Utils/String";

import { ActionsHub, HistorySearchCriteria } from "VersionControl/Scenarios/Explorer/ActionsHub";
import { GetItemOptions, GetItemResult, findItem } from "VersionControl/Scenarios/Explorer/Bridges/ItemRetrievalBridge";
import { getKnownItem } from "VersionControl/Scenarios/Explorer/Bridges/KnownItemsUtils";
import { LatestChangesRetrievalBridge } from "VersionControl/Scenarios/Explorer/Bridges/LatestChangesRetrievalBridge";
import { RepositorySource } from "VersionControl/Scenarios/Explorer/Sources/RepositorySource";
import { AggregateState } from "VersionControl/Scenarios/Explorer/Stores/StoresHub";
import { HistoryTabActionCreator } from "VersionControl/Scenarios/History/GitHistory/Actions/HistoryTabActionCreator";
import { VersionControlActionIds } from "VersionControl/Scripts/Controls/ControlsCommon";
import { ItemModel } from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";
import { VersionSpec } from "VersionControl/Scripts/TFS.VersionControl.VersionSpecs";
import { combinePaths } from "VersionControl/Scripts/VersionControlPath";

export interface GetItemAndFetchExtraDataResult extends GetItemResult {
    readMeItem: ItemModel;
    tab: string;
    areFolderLatestChangesRequested: boolean;
}

export type GetItemAndFetchExtraData = (
    tab: string,
    path: string,
    versionSpec: VersionSpec,
    options: GetItemOptions,
) => GetItemAndFetchExtraDataResult;

export type FetchHistoryIfNeeded = (
    path: string,
    version: VersionSpec,
    filterCriteria: HistorySearchCriteria,
) => void;

/**
 * Flux implementation of extra data retrieval for items based on current tab.
 * Extra data: Folder latest changes, History, Readme content...
 */
export class ItemExtraDataBridge {
    private readonly latestChangesRetrievalBridge: LatestChangesRetrievalBridge;

    constructor(
        private readonly actionsHub: ActionsHub,
        private readonly repositorySource: RepositorySource,
        private readonly getItem: (path: string, versionSpec: VersionSpec, options: GetItemOptions) => GetItemResult,
        private readonly getAggregateState: () => AggregateState,
        private readonly fetchHistoryIfNeeded: FetchHistoryIfNeeded,
    ) {
        this.latestChangesRetrievalBridge = new LatestChangesRetrievalBridge(actionsHub, repositorySource, getAggregateState);
    }

    public getItemAndFetchExtraData = (
        tab: string,
        path: string,
        versionSpec: VersionSpec,
        options: GetItemOptions = {},
    ): GetItemAndFetchExtraDataResult => {
        const item = !options.hasChangedVersion && getKnownItem(path, this.getAggregateState().knownItemsState);
        if (item) {
            tab = coerceTabOnItem(tab, item) || tab;
        }

        options.needsContentMetadata =
            tab === VersionControlActionIds.Contents ||
            tab === VersionControlActionIds.Preview ||
            tab === VersionControlActionIds.HighlightChanges ||
            tab === VersionControlActionIds.Annotate ||
            tab === VersionControlActionIds.Readme;

        const readMeItem = item && this.getReadMeItem(item);
        const pathToGet = tab !== VersionControlActionIds.Readme
            ? path
            : readMeItem ? readMeItem.serverItem : combinePaths(path, readMeFileName);

        const { isKnownNonexistent } = this.getItem(pathToGet, versionSpec, options);
        const extraResult = !isKnownNonexistent &&
            this.fetchExtraDataForItem(tab, path, versionSpec, item, options);

        return {
            item,
            readMeItem,
            tab,
            isKnownNonexistent,
            ...extraResult,
        };
    }

    public fetchExtraDataForItem = (
        tab: string,
        path: string,
        versionSpec: VersionSpec,
        item: ItemModel,
        options: GetItemOptions = {},
    ): { areFolderLatestChangesRequested: boolean } => {
        if (tab === VersionControlActionIds.Contents) {
            const aggregateState = this.getAggregateState();
            const hasChangedItem = options.hasChangedPath || options.hasChangedVersion;
            if (isFolderWithChildren(item) &&
                (hasChangedItem || !aggregateState.folderContentState.areFolderLatestChangesRequested)) {
                this.latestChangesRetrievalBridge.fetchFolderLatestChanges({ path: item.serverItem });
                return { areFolderLatestChangesRequested: true };
            }
        } else if (tab === VersionControlActionIds.History || tab === VersionControlActionIds.Compare) {
            this.fetchHistoryIfNeeded(path, versionSpec, options.historySearchCriteria);
        }

        return { areFolderLatestChangesRequested: this.getAggregateState().folderContentState.areFolderLatestChangesRequested };
    }

    public retrieveAllLastChanges(triggerFullName: string): void {
        this.actionsHub.remainderFolderLatestChangesRequested.invoke({ triggerFullName });

        const { path, version } = this.getAggregateState();
        this.latestChangesRetrievalBridge.fetchFolderLatestChanges({ path, version, allowPartial: false });
    }

    public findReadMeItem(currentItem: ItemModel, items: ItemModel[]): ItemModel {
        return findItem(items, combinePaths(currentItem.serverItem, readMeFileName)) ||
            this.getReadMeItem(currentItem);
    }

    private getReadMeItem(folderItem: ItemModel): ItemModel | undefined {
        const readMeChildItem = getReadMeChildItem(folderItem);
        const { knownItemsState } = this.getAggregateState();
        return readMeChildItem && getKnownItem(readMeChildItem.serverItem, knownItemsState) || readMeChildItem;
    }
}

/**
 * If the item doesn't support the given tab, returns another tab.
 * Otherwise returns undefined.
 */
export function coerceTabOnItem(currentTab: string, item: ItemModel): string | undefined {
    if (!VersionControlActionIds.explorerSupports(currentTab, item.isFolder)) {
        return VersionControlActionIds.Contents;
    }

    if (currentTab === VersionControlActionIds.Readme && hasReadMeItem(item) === false) {
        return VersionControlActionIds.Contents;
    }

    if (currentTab === VersionControlActionIds.Annotate && item.contentMetadata && item.contentMetadata.isBinary) {
        return VersionControlActionIds.Contents;
    }

    return undefined;
}

const readMeFileName = "README.md";

/**
 * Checks whether the given folder item contains a Readme file.
 * @returns true if it has Readme; false if not; undefined if Item has not been completely loaded yet.
 */
function hasReadMeItem(folderItem: ItemModel): boolean | undefined {
    if (!folderItem.childItems) {
        return undefined;
    } else {
        return Boolean(getReadMeChildItem(folderItem));
    }
}

function getReadMeChildItem(folderItem: ItemModel): ItemModel | undefined {
    return folderItem.childItems && folderItem.childItems.filter(child =>
        ignoreCaseComparer(child.serverItem.slice(-readMeFileName.length), readMeFileName) === 0)[0];
}

/**
 * Verifies that the item exists, it's a folder and it has children.
 * If we don't have loaded the childItems yet but it's a folder,
 * it safely assumes it will have items. This is true always in Git except
 * for the root folder (the only would-be empty folder in Git), and
 * we never lazy-load that root ItemModel.
 */
function isFolderWithChildren(item: ItemModel): boolean {
    return item &&
        item.isFolder &&
        (!item.childItems || item.childItems.length > 0);
}
