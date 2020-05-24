import * as React from "react";
import * as Controls from "VSS/Controls";
import Utils_Accessibility = require("VSS/Utils/Accessibility");
import { format as formatString } from "VSS/Utils/String";
import { DialogOptions, Dialog } from "VSSPreview/Flux/Components/Dialog";
import { VssDetailsList } from "VSSUI/VssDetailsList";

import {
    ColumnActionsMode,
    ConstrainMode,
    DetailsListLayoutMode,
    IColumn,
} from "OfficeFabric/DetailsList";
import { Fabric } from "OfficeFabric/Fabric";
import { Spinner } from "OfficeFabric/Spinner";
import * as Tooltip from "VSSUI/Tooltip";
import { Label } from "OfficeFabric/Label";
import { getId } from "OfficeFabric/Utilities";
import { SelectionMode } from "OfficeFabric/utilities/selection/interfaces";

import { ActionsHub, SearchResultEntry, SearchStatus } from "VersionControl/Scenarios/ChangeDetails/Components/Dialogs/ActionsHub";
import { ActionCreator } from "VersionControl/Scenarios/ChangeDetails/Components/Dialogs/ActionCreator";
import * as Store from "VersionControl/Scenarios/ChangeDetails/Components/Dialogs/Store";
import {
    SearchCommitGitVersionSelectorMenu,
    SearchCommitGitVersionSelectorMenuOptions,
} from "VersionControl/Scenarios/ChangeDetails/Components/Dialogs/SearchCommitGitVersionSelectorMenu";
import { BranchStats } from "VersionControl/Scenarios/ChangeDetails/GitCommit/ActionsHub";
import { StatBadge } from "VersionControl/Scenarios/Shared/StatBadge";
import * as VCGitVersionSelectorMenu from "VersionControl/Scripts/Controls/GitVersionSelectorMenu";
import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";
import * as VCSpecs from "VersionControl/Scripts/TFS.VersionControl.VersionSpecs";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";

import "VSS/LoaderPlugins/Css!VersionControl/SearchCommitInBranchesDialog";

export interface SearchCommitInBranchesDialogOptions extends DialogOptions {
    repositoryContext: GitRepositoryContext;
    commitId: string;
    currentCommitBranchStats: BranchStats;
}

export class SearchCommitInBranchesDialog extends Dialog<SearchCommitInBranchesDialogOptions> {
    /**
     *Renders the content of the dialog.
     */
    public render(): JSX.Element {
        return (
            <SearchCommitInBranchesComponent
                repositoryContext={this._options.repositoryContext}
                commitId={this._options.commitId}
                currentCommitBranchStats={this._options.currentCommitBranchStats}
                />
        );
    }

    /**
     * Initializes default options for the dialog.
     * @param options
     */
    public initializeOptions(options?: SearchCommitInBranchesDialogOptions): void {
        const defaultOptions: DialogOptions = {
            coreCssClass: "vc-search-commit-dialog",
            resizable: false,
            disposeOnClose: true,
            buttons: null,
            width: this._getDialogWidth(800),
            height: 450,
            minHeight: 450,
            title: VCResources.SearchCommitInBranchesDialog_Title,
            okButtonEnabled: false,
        };

        super.initializeOptions($.extend(defaultOptions, options));
    }

    private _getDialogWidth(maxWidth: number): number {
        const width: number = window.innerWidth * 0.7;

        return Math.min(width, maxWidth);
    }
}

export namespace SearchResultsListColumnKeys {
    export const RefName = "refname";
    export const SearchResult = "searchresult";
}

export interface SearchResultsProps {
    searchResults: SearchResultEntry[];
    retrySearchCallback(SearchResultEntry): void;
}

export class SearchResultsComponent extends React.Component<SearchResultsProps, {}> {
    public render(): JSX.Element {
        return (
            <Fabric>
                <VssDetailsList
                    items={this.props.searchResults}
                    columns={this.getSearchResultsColumns()}
                    layoutMode = { DetailsListLayoutMode.justified }
                    constrainMode = { ConstrainMode.unconstrained }
                    isHeaderVisible = { true }
                    selectionMode = { SelectionMode.none }
                    className = { "vc-search-results-detailsList" }
                    />
                </Fabric>
        );
    }

    public getSearchResultsColumns(): IColumn[] {
        const columns: IColumn[] = [];

        columns.push({
            key: SearchResultsListColumnKeys.RefName,
            name: VCResources.SearchComminInBranchesDialog_BranchTagsHeader,
            fieldName: null,
            className: "search-result-ref-name",
            minWidth: 200,
            maxWidth: 700,
            isResizable: true,
            columnActionsMode: ColumnActionsMode.disabled,
            onRender: (item: SearchResultEntry) => {
                let iconClass = "bowtie-tfvc-branch";
                if (!item.isBranch) {
                    iconClass = "bowtie-tag";
                }
                const tagOrBranch = (item.isBranch) ? VCResources.RelatedArtifactBranchTitle : VCResources.RelatedArtifactTagTitle;
                const tooltipContent = formatString(VCResources.SearchCommitDialog_CheckedLinksTooltip, tagOrBranch, item.refName);
                return (
                    <StatBadge
                        iconClassName={iconClass}
                        className={"ms-Link"}
                        title={item.refName}
                        tooltip={tooltipContent}
                        url={item.refUrl}
                        urlTargetAttribute={"_blank"}
                        telemetryEventData={null}
                        />
                );
            }
        });

        columns.push({
            key: SearchResultsListColumnKeys.SearchResult,
            name: VCResources.SearchComminInBranchesDialog_StatusHeader,
            fieldName: null,
            className: "search-result-status",
            minWidth: 200,
            maxWidth: 300,
            isResizable: false,
            columnActionsMode: ColumnActionsMode.disabled,
            onRender: (item: SearchResultEntry) => {
                let searchResult: JSX.Element;
                if (item.searchStatus === SearchStatus.InProgress) {
                    searchResult = (
                        <Spinner
                            label={VCResources.SearchCommitInBranchesDialog_FetchingStatus}
                            />
                    );
                }
                else if (item.searchStatus === SearchStatus.Failed) {
                    searchResult = (
                        <div>
                            <span>{VCResources.SearchCommitInBranchesDialog_SearchFailedMessage}</span>
                            <a
                                className={"retry-link"}
                                onClick={() => { this.props.retrySearchCallback(item); } }
                                >
                                {VCResources.SearchCommitInBranchesDialog_RetryMessage}
                            </a>
                        </div>
                    );
                }
                else if (item.searchStatus === SearchStatus.Succeeded) {
                    let statusIcon;
                    let statusmessage;
                    if (item.doesRefIncludeCommit === true) {
                        statusIcon = "bowtie-check success";
                        statusmessage = VCResources.SearchCommitInBranchesDialog_IncludesThisCommit;
                    }
                    else {
                        statusIcon = "bowtie-edit-delete failure";
                        statusmessage = VCResources.SearchCommitInBranchesDialog_DoesNotIncludeThisCommit;
                    }

                    searchResult = (
                            <div className="search-result">
                            <span className={"bowtie-icon " + statusIcon} />
                                <Tooltip.TooltipHost content={statusmessage} overflowMode={Tooltip.TooltipOverflowMode.Parent}>
                                    <span className="search-result-text"> {statusmessage}</span>
                                </Tooltip.TooltipHost>
                            </div>
                    );
                }

                return <div aria-live="polite">{searchResult}</div>
            }
        });

        return columns;
    }
}

export interface SearchCommitInBranchesProps {
    repositoryContext: GitRepositoryContext;
    commitId: string;
    currentCommitBranchStats: BranchStats;
}

export class SearchCommitInBranchesComponent extends React.Component<SearchCommitInBranchesProps, Store.State> {
    private _gitBranchesMenu: VCGitVersionSelectorMenu.GitVersionSelectorMenu;
    private _store: Store.Store;
    private _actionCreator: ActionCreator;
    private _selectRefLabelId: string;

    constructor(props: SearchCommitInBranchesProps) {
        super(props);
        this._selectRefLabelId = getId("select-ref-label");
        this._setupActionCreatorAndStore();
        this._onSearchCommitInAllBranchesOrTags = this._onSearchCommitInAllBranchesOrTags.bind(this);
    }

    public render(): JSX.Element {
        const noResultsLabel = formatString(
                                this.state.isTagSearch ? VCResources.SearchCommitDialogTagsNoResultsLabel : VCResources.SearchCommitDialogBranchesNoResultsLabel,
                                this.state.searchText);

        return (
            <div className="vc-search-commit-container">
                <label className="refs-picker-container-label">{VCResources.SearchCommitInBranchesDialog_RefsPickerLabel}</label>
                <div className="refs-picker-container" />
                <div className="result-container">
                    {
                        this.state.isPrefixSearchForRefsLoading &&
                        <Spinner
                            label={VCResources.SearchCommitInBranchesDialog_FetchingStatus}/>
                    }
                    {
                        !this.state.isPrefixSearchForRefsLoading && !this.showEmptyResultText() &&
                        <SearchResultsComponent
                            searchResults={this.state.searchResults}
                            retrySearchCallback={this._retrySearchCallback}/>
                    }
                    {
                        !this.state.isPrefixSearchForRefsLoading && this.showEmptyResultText() &&
                        <div className="empty-result-text">
                            <Label>{noResultsLabel}</Label>
                        </div>
                    }
                    {
                        !this.state.isPrefixSearchForRefsLoading && this.state.isPrefixSearchForRefsFailed &&
                        <div className="empty-result-text">
                            <Label>{VCResources.SearchCommitInBranchesDialog_SearchFailedMessage}</Label>
                        </div>
                    }
                </div>
            </div>
        );
    }

    private showEmptyResultText(): boolean {
        return this.state.searchText && !(this.state.searchResults && this.state.searchResults.length > 0);
    }

    public componentDidMount(): void {
        this._gitBranchesMenu = Controls.BaseControl.createIn(
            SearchCommitGitVersionSelectorMenu,
            $(".refs-picker-container"), {
                onItemChanged: this._onBranchChanged,
                showVersionActions: false,
                showSearchAllRefsAction: true,
                searchAllRefsAction: this._onSearchCommitInAllBranchesOrTags,
                waitOnFetchedItems: true,
                customerIntelligenceData: null,
                ariaLabelledBy: this._selectRefLabelId,
                setPopupWidthToMatchMenu: true
            } as SearchCommitGitVersionSelectorMenuOptions
        ) as SearchCommitGitVersionSelectorMenu;

        this._gitBranchesMenu.setRepository(this.props.repositoryContext);
        this._gitBranchesMenu.focus();

        if (this.props.currentCommitBranchStats && this.props.currentCommitBranchStats.name) {
            this._gitBranchesMenu.setSelectedVersion(new VCSpecs.GitBranchVersionSpec(this.props.currentCommitBranchStats.name));
        }
    }

    public componentWillUnmount(): void {
        if (this._store) {
            this._store.removeChangedListener(this._onChange);
            this._store.dispose();
            this._store = null;
        }

        if (this._gitBranchesMenu) {
            this._gitBranchesMenu.dispose();
            this._gitBranchesMenu = null;
        }

        this._actionCreator = null;
    }

    private _setupActionCreatorAndStore(): void {
        const actionsHub = new ActionsHub();
        this._store = new Store.Store(actionsHub, this.props.currentCommitBranchStats);
        this._store.addChangedListener(this._onChange);

        this._actionCreator = new ActionCreator(actionsHub);

        this.state = this._store.getState();
    }

    private _onChange = (): void => {
        this.setState(() => this._store.getState());
    }

    private _onBranchChanged = (selectedVersion: VCSpecs.VersionSpec): void => {
        this._actionCreator.searchCommitInSelectedVersion(this.props.repositoryContext, this.props.commitId, selectedVersion);
    }

    private _retrySearchCallback = (selectedItem: SearchResultEntry): void => {
        if (selectedItem.isBranch) {
            this._actionCreator.searchCommitInSelectedVersion(
                this.props.repositoryContext,
                this.props.commitId,
                new VCSpecs.GitBranchVersionSpec(selectedItem.refName)
            );
        }
        else {
            this._actionCreator.searchCommitInSelectedVersion(
                this.props.repositoryContext,
                this.props.commitId,
                new VCSpecs.GitTagVersionSpec(selectedItem.refName)
            );
        }
    }

    private _onSearchCommitInAllBranchesOrTags(searchText: string, isBranchSearch: boolean): void {
        if (searchText) {
            this._actionCreator.prefixSearchForRefs(
                this.props.repositoryContext,
                this.props.commitId,
                searchText,
                isBranchSearch
            );
            if (this._gitBranchesMenu) {
                this._gitBranchesMenu.focus();
            }
        }
    }
}
