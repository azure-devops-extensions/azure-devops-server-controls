import * as Controls from "VSS/Controls";
import * as TFS_FilteredListControl from "Presentation/Scripts/TFS/FeatureRef/FilteredListControl";
import { SearchCommitGitVersionSelectorControl,
        SearchCommitGitVersionSelectorControlOptions } from "VersionControl/Scenarios/ChangeDetails/Components/Dialogs/SearchCommitGitVersionSelectorControl";
import * as VCGitVersionSelectorMenu from "VersionControl/Scripts/Controls/GitVersionSelectorMenu";
import * as VCSpecs from "VersionControl/Scripts/TFS.VersionControl.VersionSpecs";

export interface SearchCommitGitVersionSelectorMenuOptions extends VCGitVersionSelectorMenu.GitVersionSelectorMenuOptions {
    showSearchAllRefsAction: boolean;
    searchAllRefsAction(searchText: string, branchSearch: boolean): void;
}

export class SearchCommitGitVersionSelectorMenu extends VCGitVersionSelectorMenu.GitVersionSelectorMenu {

    public _createFilteredList($container: JQuery): TFS_FilteredListControl.FilteredListControl {
        return Controls.Enhancement.enhance(
            SearchCommitGitVersionSelectorControl, $container, {
            repositoryContext: this._repositoryContext,
            disableTags: (this._options ? this._options.disableTags : null),
            showCommits: (this._options ? this._options.showCommits : null),
            disableBranches: (this._options ? this._options.disableBranches : null),
            disableMyBranches: this._options.disableMyBranches,
            showVersionActions: this._options.showVersionActions,
            searchAllRefsActionCallback: this._searchAllRefsAction,
            showSearchAllRefsAction: this._options.showSearchAllRefsAction,
            allowUnmatchedSelection: this._options.allowUnmatchedSelection || this._options.popupOptions.allowUnmatchedSelection,
            waitOnFetchedItems: this._options.waitOnFetchedItems,
            customerIntelligenceData: this._options.customerIntelligenceData,
        } as SearchCommitGitVersionSelectorControlOptions) as SearchCommitGitVersionSelectorControl;
    }

    public _getItemTooltip(item: any): string {
        return null;
    }

    private _searchAllRefsAction = (searchText: string, isBranchSearch: boolean): void => {
        const versionSpec = isBranchSearch ? new VCSpecs.GitBranchVersionSpec(searchText) : new VCSpecs.GitTagVersionSpec(searchText);
        this.setSelectedItem(versionSpec);
        this._options.searchAllRefsAction(searchText, isBranchSearch);
    }
}
