/// <amd-dependency path='VSS/LoaderPlugins/Css!VersionControlControls' />

import Controls = require("VSS/Controls");
import Diag = require("VSS/Diag");
import Utils_UI = require("VSS/Utils/UI");
import TFS_FilteredListControl = require("Presentation/Scripts/TFS/FeatureRef/FilteredListControl");
import Menus = require("VSS/Controls/Menus");
import { format } from "VSS/Utils/String";
import VSS = require("VSS/VSS");

import { GitCommit, GitQueryCommitsCriteria, GitCommitRef, ChangeListSearchCriteria } from "TFS/VersionControl/Contracts";

import * as Git_Client from "TFS/VersionControl/GitRestClient";
import * as VCCommentParser from "VersionControl/Scripts/CommentParser";
import * as CommitIdHelper from "VersionControl/Scripts/CommitIdHelper";
import * as CustomerIntelligenceConstants from "VersionControl/Scripts/CustomerIntelligenceConstants";
import { CustomerIntelligenceData } from "VersionControl/Scripts/CustomerIntelligenceData";
import GitRefService = require("VersionControl/Scripts/Services/GitRefService");
import GitUIService_NO_REQUIRE = require("VersionControl/Scripts/Services/GitUIService");
import {GitRepositoryContext} from "VersionControl/Scripts/GitRepositoryContext";
import VCResources = require("VersionControl/Scripts/Resources/TFS.Resources.VersionControl");
import VCSpecs = require("VersionControl/Scripts/TFS.VersionControl.VersionSpecs");

import domElem = Utils_UI.domElem;

export interface GitVersionSelectorControlOptions extends TFS_FilteredListControl.FilteredListControlOptions {
    repositoryContext?: GitRepositoryContext;
    disableTags?: boolean;
    disableBranches?: boolean;
    disableMyBranches?: boolean;
    showVersionActions?: boolean;
    allowUnmatchedSelection?: boolean;
    elementToFocusOnDismiss?: HTMLElement;
}

export namespace TabIds {
    export const Branches = "branches";
    export const MyBranches = "myBranches";
    export const Tags = "tags";
    export const Commit = "commit";
}

export class GitVersionSelectorControl extends TFS_FilteredListControl.FilteredListControl {

    private _repositoryContext: GitRepositoryContext;
    private _branchSearchText: string;          // Used to keep Mine and All Branches search text in synch (Bug #626880).
    private _lastBranchTabId: string;           // Mine or All Branches tabId used when search text was updated.
    private _switchingTabs: boolean = false;    // Ignore the search text change resulting from focus change on tab switching.
    private _emptyCommitsMsg: string;
    private _commitRefMap: { [key: string]: GitCommitRef; } = null;
    private _commitTimerHandle: number;

    public initializeOptions(options?: any) {
        let showBranches: boolean = true;
        let showTags: boolean = true;
        let showMyBranches: boolean = true;
        let showCommit: boolean = false;

        if (options) {
            if (options.disableTags) {
                showTags = false;
            }
            if (options.disableBranches) {
                showBranches = false;
            }
            if (options.disableMyBranches) {
                showMyBranches = false;
            }
            if (options.showCommits) {
                showCommit = true;
            }
        }

        Diag.Debug.assert(showTags || showBranches || showMyBranches || showCommit, "At least one Ref type should be visible.");
        const tabNames: any = {};
        let defaultTabId: string = null;

        if (showMyBranches) {
            tabNames.myBranches = VCResources.MyBranchesTabLabel;
            defaultTabId = TabIds.MyBranches;
        }

        if (showBranches) {
            tabNames.branches = showMyBranches ? VCResources.BranchesWithMineTabLabel : VCResources.BranchesTabLabel;
            defaultTabId = defaultTabId || TabIds.Branches;
        }

        if (showTags) {
            tabNames.tags = VCResources.TagsTabLabel;
            defaultTabId = defaultTabId || TabIds.Tags;
        }

        if (showCommit) {
            tabNames.commit = VCResources.VersionSelectorCommitTabLabel;
            defaultTabId = defaultTabId || TabIds.Commit;
        }

        super.initializeOptions($.extend({
            cssClass: "vc-git-version-selector-control",
            tabNames: tabNames,
            defaultTabId: defaultTabId,
            scrollToExactMatch: true,
            useBowtieStyle: true
        }, options));
    }

    public initialize() {
        this._setRepositoryContext(this._options.repositoryContext);
        super.initialize();
        this._element.addClass("vc-git-selector");
        if (this._options.showVersionActions) {
            this._element.addClass("has-actions");
            this._createActionItems($(domElem("div", "vc-git-version-selector-actions")).addClass("toolbar").appendTo(this._element));
        }
    }

    private invalidateBranches = (): void => {
        this._clearCachedItems();
        this.updateFilteredList("myBranches");
        this.updateFilteredList("branches");
    }

    public getAriaDescription(): string {
        const description = this._options.showVersionActions ? " " + VCResources.VersionSelectorAriaDescribeActions : "";
        return super.getAriaDescription() + description;
    }

    private _createActionItems($container: JQuery) {
        const toolbar = <Menus.MenuBar>Controls.BaseControl.createIn(Menus.MenuBar, $container, <Menus.MenuBarOptions>{
            cssClass: "vc-git-version-selector-actions-menu",
            ariaAttributes: <Controls.AriaAttributes>{
                label: VCResources.GitVersionSelectorActionsAriaLabel,
            },
            items: [
                <Menus.IMenuItemSpec> {
                    id: "new-branch",
                    text: VCResources.NewBranchText,
                    icon: "bowtie-icon bowtie-math-plus-light",
                    action: () => {
                        this._onCreateNewBranch();
                    }
                }
            ]
        });
    }

    /**
     * Executed when the user clicks Enter when there are no items that match the search text.
     */
    public _onEmptyListSearchEnterClick() {

        // If on the Mine tab, clicking Enter takes the user to the All branches tab for the full list.
        if (this._selectedTab === TabIds.MyBranches && !this._options.disableBranches) {
            const searchText: string = this.getSearchText();

            // Except... if allowUnmatchedSelection and the search texts includes a wildcard * for branch name matching,
            // then return a new branch version spec for that filter (An asterisk "*" is not valid in branch names on Windows anyway)
            if (this._options.allowUnmatchedSelection && searchText && searchText.indexOf("*") > -1) {
                this._onItemSelected(new VCSpecs.GitBranchVersionSpec(searchText));
            }
            else {
                this.selectTab(TabIds.Branches);
                this.setSearchText(searchText);
            }
        }
        else if (this._selectedTab === TabIds.Commit) {
            this._delayFillCommitsSuggestionList();
        }
        // Else if allowUnmatchedSelection, clicking Enter will select and return new branch version spec
        else if (this._options.allowUnmatchedSelection) {
            this._onItemSelected(new VCSpecs.GitBranchVersionSpec(this.getSearchText()));
        }

        // Else, if showVersionActions (includes New Branch), clicking Enter will show the Create Branch dialog.
        else if (this._options.showVersionActions) {
            this._onCreateNewBranch();
        }
    }

    public _onItemSelected(item: any) {
        this._selectedItem = item;
        this.publishCIforItemSelected();
        super._onItemSelected(item);
    }

    public clearInput() {
        this._lastBranchTabId = "";
        this._branchSearchText = "";
        this._emptyCommitsMsg = "";
        this._resetCommitsSuggestions();
        this._clearCommitsTimeout();
        super.clearInput();
    }

    protected onSearchTextChanged() {
        if (!this._switchingTabs && this._isABranchTab(this._selectedTab)) {
            this._lastBranchTabId = this._selectedTab;
            this._branchSearchText = this.getSearchText();
        }
        else if (this._selectedTab === TabIds.Commit) {
            const searchText: string = this.getSearchText();
            if (searchText.length >= CommitIdHelper.SHORT_HASH_LENGTH) {
                this._delayFillCommitsSuggestionList();
            }
        }
        super.onSearchTextChanged();
    }

    /**
     * Overridden onTabSelected to apply the same search text between My Branches and All Branches tabs.
     */
    protected onTabSelected(tabId: string) {
        this._switchingTabs = true;
        super.onTabSelected(tabId);
        this._switchingTabs = false;

        if (this._lastBranchTabId !== tabId && this._isABranchTab(tabId)) {
            this.setSearchText(this._branchSearchText);
        }
    }

    /** Returns true if the specified tabId is a Mine or All branches tab */
    private _isABranchTab(tabId: string) {
        return tabId === TabIds.Branches || tabId === TabIds.MyBranches;
    }

    /** Publish customer intelligence data when an item is selected to measure use of Mine, filtering, and typical list sizes. */
    private publishCIforItemSelected() {
        const ci = this._options.customerIntelligenceData as CustomerIntelligenceData || new CustomerIntelligenceData();
        const selectedTab = this._selectedTab || "";
        const itemCount = (this._getCurrentItemsForTabId(selectedTab) || []).length;
        const isFiltered = (this.getSearchText() as string || "").length > 0;
        ci.properties[CustomerIntelligenceConstants.GITVERSIONSELECTOR_ITEMSELECTED_ISFILTERED] = isFiltered;
        ci.properties[CustomerIntelligenceConstants.GITVERSIONSELECTOR_ITEMSELECTED_TOTALCOUNT] = itemCount;
        ci.clone().publish(CustomerIntelligenceConstants.GITVERSIONSELECTOR_ITEMSELECTED, false, selectedTab+"Tab", false);
    }

    private _onCreateNewBranch() {
        this._fire("action-item-clicked");

        VSS.using(["VersionControl/Scripts/Services/GitUIService"], (_GitUIService: typeof GitUIService_NO_REQUIRE) => {
            const gitUIService = _GitUIService.getGitUIService(this._repositoryContext);
            const createBranchOptions = <GitUIService_NO_REQUIRE.ICreateBranchOptions>{
                sourceRef: <VCSpecs.IGitRefVersionSpec>this._getSelectedItem(),
                suggestedFriendlyName: this.getSearchText()
            };

            gitUIService.createBranch(createBranchOptions).then(result => {
                if (result.cancelled) {
                    if (this._options.elementToFocusOnDismiss) {
                        Utils_UI.tryFocus(this._options.elementToFocusOnDismiss);
                    }

                    return;
                }

                const newBranchSpec = new VCSpecs.GitBranchVersionSpec(result.selectedFriendlyName);

                this.setSelectedItem(newBranchSpec, true);
                this._onItemSelected(newBranchSpec);
            });
        });
    }

    public _getWaterMarkText(tabId: string) {
        if (tabId === TabIds.Branches) {
            return VCResources.BranchesFilterWatermark;
        }
        else if (tabId === TabIds.MyBranches) {
            return VCResources.MyBranchesFilterWatermark;
        }
        else if (tabId === TabIds.Commit) {
            return VCResources.VersionSelectorCommitsFilterWatermark;
        }
        else {
            return VCResources.TagsFilterWatermark;
        }
    }

    public _getNoItemsText(tabId: string) {
        if (tabId === TabIds.Branches) {
            return VCResources.VersionSelectorNoBranches;
        }
        else if (tabId === TabIds.MyBranches) {
            return VCResources.VersionSelectorNoMyBranches;
        }
        else if (tabId === TabIds.Commit) {
            return this._emptyCommitsMsg;
        }
        else {
            return VCResources.VersionSelectorNoTags;
        }
    }

    public _getNoMatchesText(tabId: string) {
        if (tabId === TabIds.Branches) {
            return VCResources.VersionSelectorNoMatchingBranches;
        }
        else if (tabId === TabIds.MyBranches) {
            return VCResources.VersionSelectorNoMatchingMyBranches;
        }
        else if (tabId === TabIds.Commit) {
            return "";
        }
        else {
            return VCResources.VersionSelectorNoMatchingTags;
        }
    }

    public _getItemName(item: any) {
        if (item instanceof VCSpecs.GitBranchVersionSpec) {
            return (<VCSpecs.GitBranchVersionSpec>item).branchName;
        }
        else if (item instanceof VCSpecs.GitTagVersionSpec) {
            return (<VCSpecs.GitTagVersionSpec>item).tagName;
        }
        else if (item instanceof VCSpecs.GitCommitVersionSpec) {
            const commit = <VCSpecs.GitCommitVersionSpec>item;
            if (this._commitRefMap && this._commitRefMap[commit.commitId]) {
                return format("{0}    {1}", commit.commitId, VCCommentParser.Parser.getShortComment(this._commitRefMap[commit.commitId].comment));
            }
        }
        else {
            return "";
        }
    }

    public _beginGetListItems(tabId: string, callback: (items: any[]) => void) {

        // if there is no repo selected then skip this call, it will fail
        if (!this._repositoryContext || !this._repositoryContext.getRepositoryId()) {
            callback.call(this, []);
            return;
        }
        let items: any[];
        const gitRefService = GitRefService.getGitRefService(this._repositoryContext);

        if (tabId === TabIds.Branches) {
            gitRefService.getBranchNames().then(branches => {
                items = branches.map(branch => new VCSpecs.GitBranchVersionSpec(branch));
                callback.call(this, items);
            });
        }
        else if (tabId === TabIds.MyBranches) {
            gitRefService.getMyBranchNames().then(branches => {
                items = branches.map(branch => new VCSpecs.GitBranchVersionSpec(branch));
                callback.call(this, items);
            });
        }
        else if (tabId === TabIds.Tags) {
            gitRefService.getTagNames().then(tags => {
                items = tags.map(tag => new VCSpecs.GitTagVersionSpec(tag));
                callback.call(this, items);
            });
        }
        else if (tabId === TabIds.Commit) {
            callback.call(this, []);
        }
    }

    public setRepository(repositoryContext: GitRepositoryContext) {
        this._setRepositoryContext(repositoryContext);
        this._clearCachedItems();
        this.updateFilteredList();
    }

    private _setRepositoryContext(newRepositoryContext: GitRepositoryContext) {
        if (this._repositoryContext !== newRepositoryContext) {
            if (this._repositoryContext) {
                GitRefService.getGitRefService(this._repositoryContext).unsubscribe(GitRefService.GitRefNotificationChannels.BranchesChanged, this.invalidateBranches);
            }
            this._repositoryContext = newRepositoryContext;
            if (this._repositoryContext) {
                GitRefService.getGitRefService(this._repositoryContext).subscribe(GitRefService.GitRefNotificationChannels.BranchesChanged, this.invalidateBranches);
            }
        }
    }

    private _updateCommitMsg(newMsg: string) {

        if (this._emptyCommitsMsg !== newMsg) {
            this._emptyCommitsMsg = newMsg;
            this.updateFilteredList();
        }
    }

    private _delayFillCommitsSuggestionList(): void {
        this._clearCommitsTimeout();
        this._commitTimerHandle = setTimeout(() => {
            this._fillCommitsSuggestionList();
        }, 500);
    }

    private _fillCommitsSuggestionList(): void {
        const partialCommitId: string = this.getSearchText();
        if (partialCommitId.length >= CommitIdHelper.SHORT_HASH_LENGTH && CommitIdHelper.isValidPartialId(partialCommitId)) {

            const searchCriteria = <ChangeListSearchCriteria>CommitIdHelper.getStartsWithSearchCriteria(partialCommitId);

            const commitSearchCriteria = <GitQueryCommitsCriteria>{
                fromCommitId: searchCriteria.fromVersion,
                toCommitId: searchCriteria.toVersion,
            }
            Git_Client.getClient().getCommitsBatch(commitSearchCriteria, this._options.repositoryContext.getRepositoryId()).then(
                (commitRefs: GitCommitRef[]) => {
                    this._commitRefMap = {};
                    if (commitRefs.length > 0) {
                        const items = commitRefs.map((commitRef: GitCommitRef) => {
                            this._commitRefMap[commitRef.commitId] = commitRef;
                            return new VCSpecs.GitCommitVersionSpec(commitRef.commitId)
                        });
                        this._setItemsForTabId(TabIds.Commit, items);
                        this.updateFilteredList(TabIds.Commit);
                    }
                    else {
                        this._updateCommitMsg(VCResources.VersionSelectorEnterValidCommits);
                    }

                },
                (error) => {
                    // commit does not exist
                    this._updateCommitMsg(VCResources.VersionSelectorEnterValidCommits);
                });
        }
        else if (partialCommitId.length > 0) {
            if (partialCommitId.length < CommitIdHelper.SHORT_HASH_LENGTH) {
                this._updateCommitMsg(VCResources.CreateTag_EnterMoreCharacters);
            }
            else {
                this._updateCommitMsg(VCResources.VersionSelectorEnterValidCommits);
            }
        }
    }

    private _resetCommitsSuggestions(): void {
        this._commitRefMap = {};
        this._setItemsForTabId(TabIds.Commit, []);
    }

    private _clearCommitsTimeout(): void {
        if (this._commitTimerHandle) {
            clearTimeout(this._commitTimerHandle);
            this._commitTimerHandle = null;
        }
    }
}
