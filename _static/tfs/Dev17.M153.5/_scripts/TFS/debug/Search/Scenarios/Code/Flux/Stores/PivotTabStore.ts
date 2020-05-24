import * as VSSStore from "VSS/Flux/Store";
import * as Resources from "Search/Scripts/Resources/TFS.Resources.Search.Scenarios";
import * as _VCLegacyContracts from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";
import { PivotTabActionIds } from "Search/Scenarios/Code/Constants";
import { ActiveTabChangedPayload } from "Search/Scenarios/Code/Flux/ActionsHub";
import { CodeResult } from "Search/Scenarios/WebApi/Code.Contracts";
import { isVCType } from "Search/Scenarios/Code/Utils";
import { ContextRetrievedPayload, RendererFetchedPayload } from "Search/Scenarios/Code/Flux/ActionsHub";

export interface PivotTabItem {
    tabKey: string;

    title: string;

    ariaLabel: string;
}

export interface PivotTabsState {
    tabItems: PivotTabItem[];

    currentTab: string;

    isFullScreen: boolean;
}

/**
 * A store containing the state of the content tabs for the current item.
 */
export class PivotTabsStore extends VSSStore.Store {
    private _state = {} as PivotTabsState;

    public get state(): PivotTabsState {
        return this._state;
    }

    public changeTab = (payload: ActiveTabChangedPayload): void => {
        this._state.currentTab = getCurrentTab(payload.activeTabKey, this._state.tabItems);
        if (payload.changeOnNavigation) {
            this._state.isFullScreen = false;
        }
        this.emitChanged();
    }

    public updateTabs = (item: CodeResult): void => {
        // update both tabItems and tab.
        // As there can be cases where the new selection doesn't support previously selected tab.(e.g. swith from vc type item to sd type item)
        // Therefore, set current tab if the previously selected tab is supported in the new list of tab actions.
        this._state.tabItems = generateTabItems(item && isVCType(item.vcType));
        this._state.currentTab = getCurrentTab(this._state.currentTab, this._state.tabItems);
        this.emitChanged();
    }

    public onPageInitializationStarted = (activeTabKey: string) => {
        this._state.currentTab = activeTabKey === PivotTabActionIds.Contents ||
            activeTabKey === PivotTabActionIds.History ||
            activeTabKey === PivotTabActionIds.Blame ||
            activeTabKey === PivotTabActionIds.Compare
            ? activeTabKey
            : PivotTabActionIds.Contents;

        this._state.tabItems = [];
        this._state.isFullScreen = false;
        this.emitChanged();
    }

    public toggleFullScreen = (isFullScreen: boolean) => {
        this.state.isFullScreen = isFullScreen;
        this.emitChanged();
    }

    /**
     * Removes the annotations tab in case the file previewed is a binary or image file
     */
    public updateTabsOnContextRetrieval = (activeItem: CodeResult, payload: ContextRetrievedPayload) => {
        const contentMetadata: _VCLegacyContracts.FileContentMetadata = payload.serverItem.contentMetadata;
        // If, context retrieval completed for the item and is the same as current active one.
        if ((activeItem === payload.item) &&
            (contentMetadata.isBinary || contentMetadata.isImage)) {
            this._state.tabItems = generateTabItems(isVCType(payload.item.vcType), true);
            this._state.currentTab = getCurrentTab(this._state.currentTab, this._state.tabItems);
            this.emitChanged();
        }
    }

    public updateTabsOnRendererRetrieval = (payload: RendererFetchedPayload, activeItem: CodeResult) => {
        if (payload.item === activeItem && payload.isRendererPresent) {
            // The active item can not be a binary with preview, hence the parameters.
            this._state.tabItems = generateTabItems(isVCType(payload.item.vcType), false, true);
            this._state.currentTab = getCurrentTab(this._state.currentTab, this._state.tabItems);
            this.emitChanged();
        }
    }
}

function generateTabItems(isVCType: boolean, isBinary: boolean = false, isPreviewAvailable: boolean = false): PivotTabItem[] {

    // Contents tab would be present irrespective of type (Git/TFVC/SD).
    let pivotTabs: PivotTabItem[] = [
        { title: Resources.Contents, tabKey: PivotTabActionIds.Contents, ariaLabel: Resources.Contents }
    ];

    if (isVCType) {
        // Show preview for md, html and htm files.
        if (isPreviewAvailable) {
            pivotTabs.push({ title: Resources.Preview, tabKey: PivotTabActionIds.Preview, ariaLabel: Resources.Preview });
        }

        pivotTabs.push({ title: Resources.History, tabKey: PivotTabActionIds.History, ariaLabel: Resources.History });
        pivotTabs.push({ title: Resources.Compare, tabKey: PivotTabActionIds.Compare, ariaLabel: Resources.Compare });

        // Blame tab is not supported for binary content types.
        if (!isBinary) {
            pivotTabs.push({ title: Resources.Blame, tabKey: PivotTabActionIds.Blame, ariaLabel: Resources.Blame });
        }
    }

    return pivotTabs;
}

function getCurrentTab(currentTab: string, tabItems: PivotTabItem[]): string {
    return isValidAction(
        currentTab,
        tabItems.map(ti => ti.tabKey))
        ? currentTab
        : PivotTabActionIds.Contents;
}

export function isValidAction(actionId: string, validActionIds: string[]): boolean {
    return validActionIds.indexOf(actionId) >= 0;
}