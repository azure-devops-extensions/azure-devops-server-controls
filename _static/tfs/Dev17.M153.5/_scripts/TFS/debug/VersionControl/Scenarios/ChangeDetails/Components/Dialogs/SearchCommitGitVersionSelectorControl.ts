import * as Controls from "VSS/Controls";
import * as Menus from "VSS/Controls/Menus";
import { format as formatString, endsWith, startsWith } from "VSS/Utils/String";
import * as Utils_UI from "VSS/Utils/UI";

import { GitVersionSelectorControl, GitVersionSelectorControlOptions, TabIds } from "VersionControl/Scripts/Controls/GitVersionSelectorControl";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";

import domElem = Utils_UI.domElem;

export interface SearchCommitGitVersionSelectorControlOptions extends GitVersionSelectorControlOptions {
    showSearchAllRefsAction?: boolean;
    searchAllRefsActionCallback?(searchText: string, branchSearch: boolean): void;
}

const searchActionMenuItemId = "search-commit-in-all-refs";

export class SearchCommitGitVersionSelectorControl extends GitVersionSelectorControl {

    private $toolbarContainer: JQuery;
    private _toolbar: Menus.MenuBar;

    public initialize() {
        super.initialize();

        if (this._options.showSearchAllRefsAction) {
            this._element.addClass("has-actions");
            this._createSearchAllRefsActionItems($(domElem("div", "vc-git-version-selector-actions")).addClass("toolbar").appendTo(this._element));
        }
    }

    private _createSearchAllRefsActionItems($container: JQuery): void {
        this.$toolbarContainer = $container;
        this._toolbar = <Menus.MenuBar>Controls.BaseControl.createIn(Menus.MenuBar, $container, <Menus.MenuBarOptions>{
            cssClass: "vc-git-version-selector-actions-menu",
            ariaAttributes: <Controls.AriaAttributes>{
                label: VCResources.GitVersionSelectorActionsAriaLabel,
            },
            items: [
                <Menus.IMenuItemSpec>{
                    id: searchActionMenuItemId,
                    icon: "bowtie-icon bowtie-search",
                    action: () => {
                        this._onSearchItemClicked();
                    }
                }
            ]
        });
        this._hideToolbar();
    }

    protected onTabSelected(tabId: string): void {
        super.onTabSelected(tabId);
        if (tabId === TabIds.MyBranches) {
            this._hideToolbar();
        } else {
            this._showToolbar();
        }
        this._updateMenuItemText(tabId, this.getSearchText());
    }

    protected onSearchTextChanged(): void {
        super.onSearchTextChanged();
        this._updateMenuItemText(this._selectedTab, this.getSearchText());
    }

    public clearInput(): void {
        super.clearInput();
        this.clearMenuItemText();
    }

    public _getNoMatchesText(tabId: string): string {
        const prefixSearchTextWithAsteriskCheck = this._getPrefixSearchTextWithAsteriskCheck(this.getSearchText());

        if (prefixSearchTextWithAsteriskCheck) {
            if (tabId === TabIds.Branches) {
                return formatString(VCResources.VersionSelectorPrefixSearchBranchesText, prefixSearchTextWithAsteriskCheck);
            }

            if (tabId === TabIds.Tags) {
                return formatString(VCResources.VersionSelectorPrefixSearchTagsText, prefixSearchTextWithAsteriskCheck);
            }
        }

        return super._getNoMatchesText(tabId);
    }

    public _onEmptyListSearchEnterClick(): void {
        const prefixSearchTextWithAsteriskCheck = this._getPrefixSearchTextWithAsteriskCheck(this.getSearchText());
        if ((this._selectedTab === TabIds.Branches || this._selectedTab === TabIds.Tags) && prefixSearchTextWithAsteriskCheck) {
            this._prefixSearch(prefixSearchTextWithAsteriskCheck);
        } else {
            super._onEmptyListSearchEnterClick();
        }
    }

    private _getPrefixSearchTextWithAsteriskCheck(searchText: string): string {

        return searchText && searchText.length > 1 && endsWith(searchText, "*")
            ? searchText.substr(0, searchText.length - 1).trim()
            : null;
    }

    private _getPrefixSearchText(searchText: string): string {
        if (!searchText || startsWith(searchText, "*")) {
            return null;
        }
        const prefixSearchText = this._getPrefixSearchTextWithAsteriskCheck(searchText);

        return prefixSearchText ? prefixSearchText : searchText && searchText.trim();
    }

    private clearMenuItemText(): void {
        this._updateMenuItemText(this._selectedTab, "");
    }

    private _updateMenuItemText(tabId: string, searchText: string): void {
        if (this._toolbar) {
            const menuItem: Menus.MenuItem = this._toolbar.getItem(searchActionMenuItemId);
            const text = tabId === TabIds.Tags ? VCResources.SearchCommitGitVersionSelectorActionsMenuItemTagsLabel :
                VCResources.SearchCommitGitVersionSelectorActionsMenuItemBranchesLabel;
            const prefixSearchText = this._getPrefixSearchText(searchText);
            menuItem.updateText(formatString(text, prefixSearchText));
            this._toolbar.updateCommandStates([{ id: searchActionMenuItemId, disabled: !prefixSearchText }]);
        }
    }

    private _onSearchItemClicked(): void {
        const searchText = this.getSearchText();
        const prefixSearchText = this._getPrefixSearchText(searchText);
        this._prefixSearch(prefixSearchText);
    }

    private _prefixSearch(prefixSearchText: string) {
        if (prefixSearchText) {
            if (this._options.searchAllRefsActionCallback) {
                const isBranchSearch: boolean = this._selectedTab === TabIds.Branches || this._selectedTab === TabIds.MyBranches;
                this._options.searchAllRefsActionCallback(prefixSearchText, isBranchSearch);
            }
            this._fire("action-item-clicked");
        }
    }

    private _showToolbar(): void {
        if (this.$toolbarContainer) {
            this.$toolbarContainer.show();
        }
    }

    private _hideToolbar(): void {
        if (this.$toolbarContainer) {
            this.$toolbarContainer.hide();
        }
    }
}
