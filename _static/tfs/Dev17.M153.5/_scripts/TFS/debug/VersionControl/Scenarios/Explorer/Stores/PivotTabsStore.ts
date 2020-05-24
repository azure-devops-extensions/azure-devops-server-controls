import * as VSSStore from "VSS/Flux/Store";

import {
    CurrentRepositoryChangedPayload,
    TabChangedPayload,
    FilePreviewAvailabilityChangedPayload,
    ItemInfo,
    CommitSavedPayload,
    EditingFileDiscardedPayload,
} from "VersionControl/Scenarios/Explorer/ActionsHub";
import { VersionControlActionIds } from "VersionControl/Scripts/Controls/ControlsCommon";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";

export interface PivotTabItem {
    tabKey: string;
    title: string;
}

export interface PivotTabsState {
    tabItems: PivotTabItem[];
    visibleTabs: PivotTabItem[];
    currentTab: string;
    defaultTab: string;
    isEditing: boolean;
    isFolder: boolean;
    isBinary: boolean;
    hasReadMe: boolean;
    isFullScreen: boolean;
    isHistoryFilterVisible: boolean;
    isPreviewModeAvailable: boolean;
    isPreviewMode: boolean;
    preferContentOverPreview: boolean,
    isAnnotate: boolean;
    pageOptions: any;
}

export interface SelectItemArguments extends FilePreviewAvailabilityChangedPayload {
    tab: string;
    isTabExplicit: boolean;
    options?: {
        isFullScreen?: boolean;
    };
    itemInfo?: ItemInfo;
}

function generateTabItems(isGit: boolean): PivotTabItem[] {
    return [
        { title: VCResources.Contents, tabKey: VersionControlActionIds.Contents },
        { title: VCResources.Preview, tabKey: VersionControlActionIds.Preview },
        { title: VCResources.History, tabKey: VersionControlActionIds.History },
        { title: VCResources.Compare, tabKey: VersionControlActionIds.Compare },
        { title: isGit ? VCResources.Blame : VCResources.Annotate, tabKey: VersionControlActionIds.Annotate },
        { title: VCResources.Readme, tabKey: VersionControlActionIds.Readme },
        { title: VCResources.HighlightChanges, tabKey: VersionControlActionIds.HighlightChanges },
    ];
}

/**
 * A store containing the state of the content tabs for the current item.
 */
export class PivotTabsStore extends VSSStore.Store {
    public state = {
        currentTab: VersionControlActionIds.Contents,
        defaultTab: VersionControlActionIds.Contents,
        tabItems: [],
    } as PivotTabsState;

    public changeRepository = (payload: CurrentRepositoryChangedPayload): void => {
        this.state = {
            currentTab: VersionControlActionIds.Contents,
            defaultTab: VersionControlActionIds.Contents,
            tabItems: generateTabItems(payload.isGit),
            pageOptions: payload.pageOptions,
            isFullScreen: false,
            isPreviewModeAvailable: false,
        } as PivotTabsState;

        this.emitChanged();
    }

    public changeTab = (payload: TabChangedPayload): void => {
        this.state.currentTab = payload.tab;

        if (this.state.isPreviewModeAvailable) {
            if (this.state.currentTab === VersionControlActionIds.Contents) {
                this.state.preferContentOverPreview = true;
            }
            else if (this.state.currentTab === VersionControlActionIds.Preview) {
                this.state.preferContentOverPreview = false;
            }
        }

        this.emitChanged();
    }

    public selectItem = (payload: SelectItemArguments): void => {
        this.state.currentTab = payload.tab;

        if (payload.options) {
            this.state.isFullScreen = Boolean(payload.options.isFullScreen);
        }

        if (payload.isTabExplicit && payload.tab === VersionControlActionIds.Contents) {
            this.state.preferContentOverPreview = true;
        }

        this.changePreviewMode(payload);

        this.setItem(payload.itemInfo);
    }

    public editNewOrExistingFile = (payload: FilePreviewAvailabilityChangedPayload): void => {
        this.state.currentTab = VersionControlActionIds.Contents;
        this.state.isEditing = true;
        this.state.isFolder = false;
        this.state.hasReadMe = false;

        this.changePreviewMode(payload);

        this.emitChanged();
    }

    public commit = (payload: CommitSavedPayload): void => {
        this.state.isEditing = false;

        if (payload.coercedTab) {
            this.state.currentTab = payload.coercedTab;
        }

        this.emitChanged();
    }

    public discardEditingFile = (payload: EditingFileDiscardedPayload): void => {
        this.state.isEditing = false;

        if (payload.coercedTab) {
            this.state.currentTab = payload.coercedTab;
        }

        this.changePreviewMode(payload);

        if (payload.navigateItemInfo) {
            this.setItem(payload.navigateItemInfo);
        } else {
            this.emitChanged();
        }
    }

    public changeFullScreen = (isFullScreen: boolean): void => {
        this.state.isFullScreen = Boolean(isFullScreen);

        this.emitChanged();
    }

    public setItem = (itemInfo: ItemInfo, coercedTab?: string): void => {
        if (itemInfo) {
            this.state.isFolder = itemInfo.item.isFolder;
            this.state.isBinary = itemInfo.item.contentMetadata && itemInfo.item.contentMetadata.isBinary;
            this.state.hasReadMe = Boolean(itemInfo.readMeItem);
        }

        if (this.state.isFolder) {
            this.state.isPreviewModeAvailable = false;
            this.state.defaultTab = VersionControlActionIds.Contents;
        }

        if (coercedTab) {
            this.state.currentTab = coercedTab;
        }

        this.emitChanged();
    }

    private changePreviewMode = ({ isPreviewAvailable, isPreviewDefault }: FilePreviewAvailabilityChangedPayload): void => {
        this.state.isPreviewModeAvailable = isPreviewAvailable;
        this.state.defaultTab = isPreviewDefault
            ? VersionControlActionIds.Preview
            : VersionControlActionIds.Contents;

        if (!this.state.isEditing) {
            const shouldPreview = isPreviewDefault && !this.state.preferContentOverPreview;
            if (this.state.currentTab === VersionControlActionIds.Contents) {
                if (shouldPreview) {
                    this.state.currentTab = VersionControlActionIds.Preview;
                }
            } else if (this.state.currentTab === VersionControlActionIds.Preview) {
                if (!shouldPreview) {
                    this.state.currentTab = VersionControlActionIds.Contents;
                }
            }
        }
    }

    protected emitChanged(): void {
        const hiddenTabs = this.calculateHiddenTabs();
        this.state.visibleTabs =
            this.state.tabItems.filter(tabItem =>
                tabItem.tabKey === this.state.currentTab ||
                hiddenTabs.indexOf(tabItem.tabKey) < 0);

        const isHistoryTab = this.state.currentTab === VersionControlActionIds.History;
        this.state.isHistoryFilterVisible = isHistoryTab;

        this.state.isPreviewMode =
            this.state.currentTab === VersionControlActionIds.Readme ||
            this.state.currentTab === VersionControlActionIds.Preview;

        this.state.isAnnotate = this.state.currentTab === VersionControlActionIds.Annotate;

        super.emitChanged();
    }

    private calculateHiddenTabs(): string[] {
        const hiddenTabs: string[] = [];

        if (this.state.isEditing) {
            hiddenTabs.push(VersionControlActionIds.History);
            hiddenTabs.push(VersionControlActionIds.Compare);
            hiddenTabs.push(VersionControlActionIds.Annotate);
        } else {
            hiddenTabs.push(VersionControlActionIds.HighlightChanges);

            if (this.state.isFolder) {
                hiddenTabs.push(VersionControlActionIds.Compare);
                hiddenTabs.push(VersionControlActionIds.Annotate);
                hiddenTabs.push(VersionControlActionIds.Preview);
            } else if (this.state.isBinary) {
                hiddenTabs.push(VersionControlActionIds.Annotate);
            }
        }

        if (!this.state.hasReadMe) {
            hiddenTabs.push(VersionControlActionIds.Readme);
        }

        if (!this.state.isPreviewModeAvailable) {
            hiddenTabs.push(VersionControlActionIds.Preview);
        }

        return hiddenTabs;
    }
}
