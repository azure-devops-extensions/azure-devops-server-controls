import { SelectionMode } from "OfficeFabric/utilities/selection/interfaces";
import * as ReactDOM from "react-dom";

import * as Controls from "VSS/Controls";
import * as Dialogs from "VSS/Controls/Dialogs";
import { domElem } from "VSS/Utils/UI";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";

import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";
import { GitBranchVersionSpec } from "VersionControl/Scripts/TFS.VersionControl.VersionSpecs";
import { DefaultColumns } from "VersionControl/Scenarios/History/GitHistory/Components/HistoryListColumns";
import { HistoryEntry, ChangeList } from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";
import { ChangesSearchFilter } from "VersionControl/Scripts/Controls/HistoryChangesSearchFilter";
import { HistoryTabActionCreator } from "VersionControl/Scenarios/History/GitHistory/Actions/HistoryTabActionCreator";
import { HistoryTabActionsHub, GitHistorySearchCriteria, GitHistoryDataOptions } from "VersionControl/Scenarios/History/GitHistory/Actions/HistoryTabActionsHub";
import { HistoryTabStoresHub } from "VersionControl/Scenarios/History/GitHistory/Stores/HistoryTabStoresHub";
import { HistoryCommitsSource } from "VersionControl/Scenarios/History/GitHistory/Sources/HistoryCommitsSource";
import { HistorySourcesHub } from "VersionControl/Scenarios/History/GitHistory/Sources/HistorySourcesHub";
import * as HistoryList from "VersionControl/Scenarios/History/GitHistory/Components/HistoryListContainer";
import { HistoryListItem } from "VersionControl/Scenarios/History/GitHistory/Components/HistoryListInterfaces";
import { GitHistoryFilter, GitFilterSearchCriteria, GitFilterProps, RenderFilter } from "VersionControl/Scenarios/History/GitHistory/Components/GitHistoryFilter";
import * as HistoryUtils from "VersionControl/Scenarios/History/GitHistory/HistoryUtils";
import { GitPermissionsSource } from "VersionControl/Scenarios/Shared/Permissions/GitPermissionsSource";

export interface CommitPickerDialogOptions extends Dialogs.IModalDialogOptions {
    mode?: string;
    tfsContext?: TfsContext;
    repositoryContext?: GitRepositoryContext;
    myChangesLabel?: string;
    allChangesLabel?: string;
    showBranches?: boolean;
    linkTarget?: string;
    filterOptions?: any;
}

export class HistoryCommitPickerDialog extends Dialogs.ModalDialogO<CommitPickerDialogOptions> {
    private _actionsHub: HistoryTabActionsHub;
    private _actionCreator: HistoryTabActionCreator;
    private _storesHub: HistoryTabStoresHub;
    private _historySourcesHub: HistorySourcesHub;
    private _$newHistoryListContainer: JQuery;
    private _repositoryContext: GitRepositoryContext;
    private _selectedCommit: ChangeList;

    private _searchCriteria: GitHistorySearchCriteria;
    private _gitHistoryFilter: GitHistoryFilter;
    private _filterContainer: HTMLElement;

    constructor(options?) {
        super($.extend({
            initialFocusSelector: ".path-container .path-cell-input"
        }, options));
    }

    public initializeOptions(options?: any): void {
        super.initializeOptions($.extend({
            coreCssClass: "vc-commit-picker vc-item-picker"
        }, options));
    }

    public initialize(): void {
        super.initialize();
        this._searchCriteria = {
            user: null,
            alias: null,
            fromDate: null,
            toDate: null,
            gitLogHistoryMode: null,
            itemPath: "\\",
        } as GitHistorySearchCriteria;

        this.updateOkButton(false);
        this._repositoryContext = this._options.repositoryContext;

        this._initializeFlux();

        this._repositoryContext.getGitClient().beginGetUserLastBranch(this._repositoryContext.getRepository(),
            (branchName: string) => {
                const searchCriteria: GitHistorySearchCriteria = $.extend({}, this._searchCriteria);
                let versionSpec = null;
                if (branchName) {
                    versionSpec = new GitBranchVersionSpec(branchName);
                    searchCriteria.itemVersion = versionSpec.toVersionString();
                }

                const searchFilter = <ChangesSearchFilter>Controls.BaseControl.createIn(ChangesSearchFilter, this._element, $.extend(this._options.filterOptions || {}, {
                    tfsContext: this._options.tfsContext,
                    showBranches: this._options.showBranches,
                    showFromToRange: false,
                    showOldFilters: false,
                    myChangesLabel: this._options.myChangesLabel,
                    allChangesLabel: this._options.allChangesLabel,
                    version: versionSpec,
                    showLabelFieldStackedUp: true
                }));

                // sets focus on the path control which is the fist interactive element in this dialog.
                this.setInitialFocus();
                this._renderNewSearchFilter(searchCriteria);

                this._$newHistoryListContainer = $(domElem("div", "history-list-container")).appendTo(this._element);
                HistoryList.renderInto(this._$newHistoryListContainer[0], {
                    actionCreator: this._actionCreator,
                    repositoryContext: this._repositoryContext,
                    historyListStore: this._storesHub.historyListStore,
                    headerVisible: true,
                    shouldDisplayError: true,
                    onSelectionChanged: this._onSelectionChanged,
                    columns: DefaultColumns.BasicColumns,
                });

                this._onFilterUpdated(null, searchCriteria);
            });

        this.getElement().bind("filter-updated", this._onFilterUpdated);

        // To clear the override of enter handler for input elements in base class, 
        // which makes datepicker inaccessible
        this.getElement().off("keydown");
    }

    public getDialogResult(): ChangeList {
        // Returning the selected commit
        return this._selectedCommit;
    }

    private _renderNewSearchFilter = (searchCriteria: GitHistorySearchCriteria): void => {
        const containerRow = $(this._element).find(".vc-changes-list-filter");
        this._filterContainer = domElem("div");
        $(this._filterContainer).appendTo(containerRow);

        // Construct filterSearchCriteria by distilling only the filters parameters. 
        // Do not add properties like itemPath , path etc.
        const filterSearchCriteria: GitFilterSearchCriteria = {
            user: searchCriteria.user,
            alias: searchCriteria.alias,
            fromDate: searchCriteria.fromDate,
            toDate: searchCriteria.toDate,
            gitLogHistoryMode: searchCriteria.gitLogHistoryMode,
        }

        const filterProps: GitFilterProps = {
            initialSearchCriteria: filterSearchCriteria,
            filterUpdatedCallback: (updatedSearchCriteria: GitFilterSearchCriteria) => this._onFilterUpdated(null, updatedSearchCriteria),
            repositoryId: this._repositoryContext.getRepositoryId(),
            mruAuthors: HistoryUtils.calculateMruAuthors(this._storesHub.historyListStore.state.historyResults),
            isFilterPanelVisible: true
        };
        this._gitHistoryFilter = RenderFilter(filterProps, this._filterContainer) as GitHistoryFilter;
    }

    public onClose(e?: JQueryEventObject): any {
        this._cleanHistoryListObjects();
        super.onClose(e);
    }

    private _cleanHistoryListObjects(): void {
        ReactDOM.unmountComponentAtNode(this._$newHistoryListContainer[0]);
        ReactDOM.unmountComponentAtNode(this._filterContainer);
        this._storesHub = null;
        this._actionsHub = null;
        this._actionCreator = null;
        this._historySourcesHub = null;
        this._$newHistoryListContainer = null;
    }

    private _initializeFlux(): void {
        this._actionsHub = new HistoryTabActionsHub();
        this._storesHub = new HistoryTabStoresHub(this._actionsHub);
        this._historySourcesHub = {
            historyCommitsSource: new HistoryCommitsSource(this._repositoryContext),
            permissionsSource: new GitPermissionsSource(this._repositoryContext.getRepository().project.id, this._repositoryContext.getRepositoryId())
        };

        this._actionCreator = new HistoryTabActionCreator(this._actionsHub, this._historySourcesHub, this._storesHub.getAggregatedState);
    }

    private _onFilterUpdated = (e?: JQueryEventObject, searchCriteria?: Partial<GitHistorySearchCriteria>): void => {
        this._searchCriteria = $.extend({}, this._searchCriteria, searchCriteria);
        this.updateOkButton(false);
        const dataOptions = {
            fetchBuildStatuses: false,
            fetchPullRequests: false,
            fetchTags: true,
            fetchGraph: false
        } as GitHistoryDataOptions;
        this._actionCreator.fetchHistory(this._searchCriteria, dataOptions);
    }

    private _onSelectionChanged = (selection?: HistoryListItem[]): void => {
        if (selection && selection.length > 0) {
            this._selectedCommit = selection[0].item.changeList;
            this.updateOkButton(true);
        }
        else {
            this._selectedCommit = null;
            this.updateOkButton(false);
        }
    }
}
