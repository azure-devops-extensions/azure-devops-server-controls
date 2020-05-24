import * as VSSStore from "VSS/Flux/Store";
import { format } from "VSS/Utils/String";

import {
    TabChangedPayload,
    ItemInfo,
    ItemRetrievalFailedPayload,
    CommitSavedPayload,
    EditingFileDiscardedPayload,
} from "VersionControl/Scenarios/Explorer/ActionsHub";
import { VersionControlActionIds } from "VersionControl/Scripts/Controls/ControlsCommon";
import { ItemModel } from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";

export enum ExplorerItemTab {
    FileContent,
    FolderContent,
    History,
    Compare,
    Error,
}

export interface ItemContentState {
    currentTab: string;
    visibleItemTab: ExplorerItemTab;
    path: string;
    notFoundErrorMessage: string;
    item: ItemModel;
    readMeItem: ItemModel;
    displayItem: ItemModel;
}

export interface ChangeItemArguments {
    tab: string;
    path: string;
    itemInfo?: ItemInfo;
    notFoundError?: Error;
}

/**
 * A store containing the state of the current displayed item.
 * Common state for file & folder items.
 */
export class ItemContentStore extends VSSStore.Store {
    public state = {
        visibleItemTab: ExplorerItemTab.FolderContent,
    } as ItemContentState;

    public changeTab = (payload: TabChangedPayload) => {
        this.updateTab(payload.tab);

        this.emitChanged();
    }

    public editOrAddNewFile = (fileItem: ItemModel): void => {
        this.updateTab(VersionControlActionIds.Contents);

        this.state.path = fileItem.serverItem;

        this.state.item = fileItem;
        this.state.readMeItem = undefined;

        this.emitChanged();
    }

    public commit = (payload: CommitSavedPayload): void => {
        if (payload.coercedTab) {
            this.updateTab(payload.coercedTab);
        }

        if (payload.navigatePath) {
            this.state.path = payload.navigatePath;
            this.state.item = undefined;
            this.state.readMeItem = undefined;
        }

        this.emitChanged();
    }

    public discardEditingFile = (payload: EditingFileDiscardedPayload): void => {
        this.state.path = payload.navigatePath;

        if (payload.coercedTab) {
            this.updateTab(payload.coercedTab);
        }

        this.loadItem(payload.navigateItemInfo);
    }

    public changeItem = (payload: ChangeItemArguments) => {
        this.updateTab(payload.tab);

        this.state.path = payload.path;

        if (payload.notFoundError) {
            this.failRetrieval({ notFoundError: payload.notFoundError });
        } else {
            this.loadItem(payload.itemInfo);
        }
    }

    public loadItem = (itemInfo: ItemInfo, coercedTab?: string) => {
        this.state.item = itemInfo && itemInfo.item;
        this.state.readMeItem = itemInfo && itemInfo.readMeItem;

        if (coercedTab) {
            this.state.currentTab = coercedTab;
        }

        this.emitChanged();
    }

    public failRetrieval = (payload: ItemRetrievalFailedPayload) => {
        this.state.notFoundErrorMessage = payload.notFoundError && payload.notFoundError.message;

        this.emitChanged();
    }

    protected emitChanged(): void {
        this.state.visibleItemTab = this.calculateVisibleItemTab();
        this.state.displayItem = this.calculateDisplayItem();
        super.emitChanged();
    }

    private calculateDisplayItem(): ItemModel {
        return this.state.currentTab === VersionControlActionIds.Readme ? this.state.readMeItem : this.state.item;
    }

    private calculateVisibleItemTab(): ExplorerItemTab {
        if (this.state.notFoundErrorMessage) {
            return ExplorerItemTab.Error;
        }

        if (this.state.currentTab === VersionControlActionIds.Contents) {
            const isFolder = !this.state.item || this.state.item.isFolder;
            return isFolder ? ExplorerItemTab.FolderContent : ExplorerItemTab.FileContent;
        }

        return easyMapVisibleTabs[this.state.currentTab];
    }

    private updateTab(tab: string): void {
        this.state.currentTab = tab;
        this.state.notFoundErrorMessage = undefined;
    }
}

const easyMapVisibleTabs: IDictionaryStringTo<ExplorerItemTab> = {
    [VersionControlActionIds.Annotate]: ExplorerItemTab.FileContent,
    [VersionControlActionIds.Readme]: ExplorerItemTab.FileContent,
    [VersionControlActionIds.History]: ExplorerItemTab.History,
    [VersionControlActionIds.Compare]: ExplorerItemTab.Compare,
    [VersionControlActionIds.Preview]: ExplorerItemTab.FileContent,
    [VersionControlActionIds.HighlightChanges]: ExplorerItemTab.FileContent,
};
