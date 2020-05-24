/// <amd-dependency path='VSS/LoaderPlugins/Css!VersionControlControls' />

import Combos = require("VSS/Controls/Combos");
import Controls = require("VSS/Controls");
import Menus = require("VSS/Controls/Menus");
import ServerConstants = require("Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants");
import VSS = require("VSS/VSS");
import Diag = require("VSS/Diag");
import Utils_UI = require("VSS/Utils/UI");
import Utils_Core = require("VSS/Utils/Core");
import Utils_Date = require("VSS/Utils/Date");
import Utils_String = require("VSS/Utils/String");
import FeatureAvailability_Services = require("VSS/FeatureAvailability/Services");

import { TeamIdentityReference, TfsIdentityReference } from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";
import {GitRepositoryContext} from "VersionControl/Scripts/GitRepositoryContext";
import { RepositoryContext, RepositoryType } from "VersionControl/Scripts/RepositoryContext";
import * as SearchCriteriaUtil from "VersionControl/Scripts/Utils/SearchCriteriaUtil";
import VCResources = require("VersionControl/Scripts/Resources/TFS.Resources.VersionControl");
import VCSpecs = require("VersionControl/Scripts/TFS.VersionControl.VersionSpecs");
import VCGitVersionSelectorMenu = require("VersionControl/Scripts/Controls/GitVersionSelectorMenu");
import { GitLogHistoryMode } from "VersionControl/Scenarios/History/GitHistory/Actions/HistoryTabActionsHub";

import delegate = Utils_Core.delegate;
import domElem = Utils_UI.domElem;

export class ChangesSearchFilter extends Controls.BaseControl {

    private _$basicPaneContent: JQuery;
    private _$filterPanelContent: JQuery;
    private _$pathContainer: JQuery;
    private _$applyFiltersButton: JQuery;
    private _$path: JQuery;
    private _$fromErrorMessage: JQuery;
    private _$toErrorMessage: JQuery;
    private _$filterButton: JQuery;
    private _userCombo: Combos.Combo;
    private _fromCombo: Combos.ComboO<Combos.IDateTimeComboOptions>;
    private _toCombo: Combos.ComboO<Combos.IDateTimeComboOptions>;
    private _branchesControl: VCGitVersionSelectorMenu.GitVersionSelectorMenu;
    private _rangeCombo: Combos.Combo;
    private _historyModeCombo: Combos.Combo;
    private _repositoryContext: RepositoryContext;
    private _lastSearchedCriteria: any;
    private _compactTableFormat: boolean;
    protected _suppressFilterUpdates: boolean;
    private static _historyModeComboOptionsDisplayText: string[] = [VCResources.HistoryModeSimplifiedText, VCResources.HistoryModeFirstParentText, VCResources.HistoryModeFullHistoryText, VCResources.HistoryModeFullHistorySimplifyMergesText];
    private static _historyModeComboOptions: GitLogHistoryMode[] = [GitLogHistoryMode.simplified, GitLogHistoryMode.firstParent, GitLogHistoryMode.fullHistory, GitLogHistoryMode.fullHistorySimplifyMerges];
    private static _defaultHistoryModeComboDisplayText: string = VCResources.HistoryModeSimplifiedText;
    private static _defaultHistoryModeComboOption: GitLogHistoryMode = GitLogHistoryMode.simplified;
    
    public initializeOptions(options?: any) {
        super.initializeOptions($.extend({
            coreCssClass: "vc-changes-list-filter",
            showBranches: false,
            showOldPathControl: true,
            showFromToRange: false,
            showOldFilters: true,
        }, options));
    }

    public initialize() {

        super.initialize();

        this._repositoryContext = this._options.repositoryContext;
        this._suppressFilterUpdates = false;

        // We'll temporarily include a toggle toolbar button here if we have Pushes feature enabled to toggle between a compact/traditational commits table.
        if (this._options.formatButtonCallback) {
                this._compactTableFormat = true;
                this._drawTableFormatToolButton(this._$basicPaneContent, this._options.formatButtonCallback);
        }

        if (!this._options.$pathContainer) {
            this._$pathContainer = $(domElem("div", "path-container")).appendTo(this._element);
        } else {
            this._$pathContainer = this._options.$pathContainer;
        }

        if (this._options.$filterPaneLocation) {
            this._$filterPanelContent = $(domElem("div", "vc-advanced-filter")).appendTo(this._options.$filterPaneLocation);
        }

        this._drawAdvancedFilter(this._$pathContainer, this._$filterPanelContent);

        if(this._options.showOldFilters){
            this.initializeUserSelector();
        }
    }

    public getSearchCriteria() {

        let searchCriteria: any,
            path: string,
            versionSpec: any,
            user: string,
            temp: string,
            from: string,
            to: string,
            fromDate: Date,
            toDate: Date;

        searchCriteria = {};

        path = $.trim(this._$path.val());
        searchCriteria.itemPath = path;
        
        if (this._options.version) {
            searchCriteria.itemVersion = this._options.version;
        }
        if (this._branchesControl) {
            versionSpec = this._branchesControl.getSelectedVersion();
            if (versionSpec) {
                searchCriteria.itemVersion = versionSpec.toVersionString();
            }
        }

        if(this._options.showOldFilters){
            user = this.getUserFilter();
            if (user) {
                if (this._repositoryContext.getRepositoryType() === RepositoryType.Tfvc) {
                    const tfsAuthor: SearchCriteriaUtil.TfsAuthorIdentity = SearchCriteriaUtil.getTFSIdentityfromAuthor(user);
                    searchCriteria.user = tfsAuthor.displayName;
                    searchCriteria.alias = tfsAuthor.alias;
                }
                else {
                    searchCriteria.user = user;
                }
            }

            if (this._isDateRangeSelected()) {
                fromDate = this._fromCombo.getBehavior<Combos.ComboDateBehavior>().getSelectedDate();
                from = $.trim(this._fromCombo.getText());
                if (from) {
                    searchCriteria.fromDate = from;
                }

                toDate = this._toCombo.getBehavior<Combos.ComboDateBehavior>().getSelectedDate();
                to = $.trim(this._toCombo.getText());
                if (to) {
                    searchCriteria.toDate = to;
                }

                if (fromDate && toDate && fromDate > toDate) {
                    temp = searchCriteria.fromDate;
                    searchCriteria.fromDate = searchCriteria.toDate;
                    searchCriteria.toDate = temp;
                }
            }
            else {
                from = $.trim(this._fromCombo.getText());
                if (from) {
                    searchCriteria.fromVersion = from;
                }
                to = $.trim(this._toCombo.getText());
                if (to) {
                    searchCriteria.toVersion = to;
                }
                if (((parseInt(searchCriteria.fromVersion) > 0) && (parseInt(searchCriteria.toVersion))) &&
                    (parseInt(searchCriteria.fromVersion) > parseInt(searchCriteria.toVersion))) {
                    temp = searchCriteria.fromVersion;
                    searchCriteria.fromVersion = searchCriteria.toVersion;
                    searchCriteria.toVersion = temp;
                }
            }

            if (this._historyModeCombo) {
                const selectedhistoryModeIndex: number = this._historyModeCombo.getSelectedIndex();
                if (selectedhistoryModeIndex > -1 && selectedhistoryModeIndex < ChangesSearchFilter._historyModeComboOptions.length) {
                    searchCriteria.gitLogHistoryMode = GitLogHistoryMode[ChangesSearchFilter._historyModeComboOptions[selectedhistoryModeIndex]].toString();
                }
                else {
                    searchCriteria.gitLogHistoryMode = GitLogHistoryMode[ChangesSearchFilter._defaultHistoryModeComboOption].toString();
                }
            }
        }
        return searchCriteria;
    }

    public setSearchCriteria(searchCriteria: any, disableApplybutton?: boolean): void {

        let showAdvancedFilter = false;

        this._$path.val(searchCriteria.itemPath || "");
        this._options.version = searchCriteria.itemVersion || "";

        if (this._branchesControl && searchCriteria.itemVersion) {
            this._branchesControl.setSelectedVersion(VCSpecs.VersionSpec.parse(searchCriteria.itemVersion));
        }

        if(this._options.showOldFilters){
            //Set user filter for tfs and Git seperately.
            if (this._repositoryContext.getRepositoryType() === RepositoryType.Tfvc && !!searchCriteria.alias) {
                const tfsAuthor: string = SearchCriteriaUtil.getAuthorfromTFSIdentity({
                    displayName: searchCriteria.user,
                    alias: searchCriteria.alias,
                });
                this.setUserFilter(tfsAuthor);
            }
            else {
                this.setUserFilter(searchCriteria.user);
            }
            
            if (this._rangeCombo && !this._isDateRangeSelected() ) {
                this._rangeCombo.setSelectedIndex(1, true);
                this._fromCombo.setText(searchCriteria.fromVersion, true);
                this._toCombo.setText(searchCriteria.toVersion, true);

                if (searchCriteria.fromVersion || searchCriteria.toVersion) {
                    showAdvancedFilter = true;
                }
            }
            else {
                if (this._rangeCombo) {
                    this._rangeCombo.setSelectedIndex(0, true);
                }
                this._fromCombo.setText(searchCriteria.fromDate, true);
                this._toCombo.setText(searchCriteria.toDate, true);
            }

            if (this._historyModeCombo) {
                const selectedIndex = ChangesSearchFilter._historyModeComboOptions.indexOf(Number(GitLogHistoryMode[searchCriteria.gitLogHistoryMode]));
                if (selectedIndex >= 0 && selectedIndex < ChangesSearchFilter._historyModeComboOptions.length) {
                    this._historyModeCombo.setSelectedIndex(selectedIndex, true);
                }
                else {
                    this._historyModeCombo.setSelectedIndex(0, true);
                }
            }

            this._lastSearchedCriteria = searchCriteria;
            //If disableApplybutton is specified, then update the button state to that value.
            if (disableApplybutton != null) {
                this._updateApplyFiltersButtonState(disableApplybutton);
            }
            this._updateFilterControlsTooltip();
        }
    }

    protected createUserSelector($container: JQuery, controlId: string): void {
        const $userInput = $(domElem("input", "user"))
            .attr("id", "user" + controlId)
            .appendTo($container)
            .val(this._options.user || "")
            .bind("keydown", delegate(this, this._onKeyDown));

        this._userCombo = <Combos.Combo>Controls.Enhancement.enhance(Combos.Combo, $userInput, {
            cssClass: "user-combo",
            allowEdit: true,
            source: [],
            dropShow: (dropPopup: Combos.ComboListDropPopup) => {
                if (dropPopup.getDataSource().getCount() === 0) {
                    dropPopup.getElement().addClass('in-progress-container-small');
                }
            },
            change: (combo: Combos.Combo) => {
                this._handleFilterComboValueChange(combo, VCResources.HistoryResultHeaderAuthor);
            },
            focus: () => {
                if (!this._userCombo.isDropVisible()) {
                    this._userCombo.showDropPopup();
                }
            }
        });

        this._handleFilterComboValueChange(this._userCombo, VCResources.HistoryResultHeaderAuthor);
        this._userCombo._element.change({ title: () => { return VCResources.HistoryResultHeaderAuthor; } }, delegate(this, this._onComboChange));
    }

    protected initializeUserSelector(): void {
        if (this._repositoryContext && this._userCombo) {
            const dropPopup = this._userCombo.getBehavior().getDropPopup<Combos.BaseComboDropPopup>();
            this._repositoryContext.getClient().beginGetAuthors(this._repositoryContext, (authors) => {
                if (!this.isDisposed()) {
                    const dropPopup = this._userCombo.getBehavior().getDropPopup();
                    this._userCombo.setSource($.map(authors, (author, index) => {
                        if (this._repositoryContext.getRepositoryType() === RepositoryType.Tfvc) {
                            const selectedAuthor: TfsIdentityReference = author as TfsIdentityReference;
                            return SearchCriteriaUtil.getAuthorfromTFSIdentity({
                                displayName: selectedAuthor.displayName,
                                alias: selectedAuthor.accountName,
                            });
                        }
                        else {
                            return author.displayName;
                        }
                    }));
                    if (dropPopup) {
                        dropPopup.getElement().removeClass('in-progress-container-small');
                        dropPopup.update();
                    }
                }
            }, (error) => {
                Diag.log(Diag.LogVerbosity.Error, "Failed to get the repository's authors: " + VSS.getErrorMessage(error));
            },
            { showGlobalProgressIndicator: false });
        }
    }

    protected getUserFilter(): string {
        if (this._userCombo) {
            return $.trim(this._userCombo.getText());
        }
        else {
            return "";
        }
    }

    protected setUserFilter(user: string): void {
        if (this._userCombo) {
            this._userCombo.setText(user || "", true);
        }
    }

    protected getFormattedTooltip(title: string, value: string): string {
        if (value != "") {
            return Utils_String.format(VCResources.FilterTooltipFormat, title, value);
        } else {
            return title;
        }
    }

    protected addErrorToolTip($element: JQuery, $errorMessage: JQuery): void {
        this._bind($element, "focusout", (e: JQueryMouseEventObject) => {
            this._checkFormat();
            if ($element.hasClass("invalid-form") === true ||
                $element.hasClass("invalid") === true) {
                $errorMessage.show();
            }
        });

        this._bind($element, "focusin", (e: JQueryMouseEventObject) => {
            $errorMessage.hide();
        });
    }

    protected updateFilterPanelState(filterDataEventFired?: boolean): void {
        if(this._options.showOldFilters){
            const searchCriteria = this.getSearchCriteria();
            let filterHasValues = false;

            if (searchCriteria.user ||
                searchCriteria.fromVersion ||
                searchCriteria.toVersion ||
                searchCriteria.fromDate ||
                searchCriteria.toDate ||
                Number(GitLogHistoryMode[searchCriteria.gitLogHistoryMode]) > 0) {

                filterHasValues = true;
            }

            if (filterHasValues) {
                this._updateApplyFiltersButtonState(filterDataEventFired);
                this._$filterButton.addClass("filter-applied");
                this._$filterButton.attr("tabindex", "0").attr("title", VCResources.FilterClearFiltersTooltip);
                
                this._$filterButton.removeClass("bowtie-search-filter").addClass("bowtie-clear-filter");
                this._$filterButton.on("click.reset_filters", (event) => this.filterButtonRemoveFilterEventHandle());
                this._$filterButton.on("keypress.reset_filters", (event) => {
                    if (event.which === Utils_UI.KeyCode.ENTER || event.which == Utils_UI.KeyCode.SPACE) {
                        this.filterButtonRemoveFilterEventHandle()
                    };
                });
            }
            else {
                this._updateApplyFiltersButtonState(true);
                this._$filterButton.removeClass("filter-applied");
                this._$filterButton.removeAttr("tabindex").attr("title", VCResources.FilterNoFilterApplied);
                this._$filterButton.removeClass("bowtie-clear-filter").addClass("bowtie-search-filter");

                this._$filterButton.off("click.reset_filters keypress.reset_filters");

            }

            this._updateFilterControlsTooltip();
        }
    }

    private filterButtonRemoveFilterEventHandle(): void {
        this._suppressFilterUpdates = true;
        if (this._historyModeCombo) {
            $.extend(this._lastSearchedCriteria, {
                gitLogHistoryMode: GitLogHistoryMode[ChangesSearchFilter._defaultHistoryModeComboOption].toString()
            });
        }
        this.setSearchCriteria($.extend(this._lastSearchedCriteria, {
            user: "",
            alias: "",
            fromDate: "",
            toDate: "",
            fromVersion: "",
            toVersion: ""
        }));
        this._suppressFilterUpdates = false;
        this.fireFilterUpdated();
    }

    protected fireFilterUpdated(): void {
        if (this._suppressFilterUpdates === false) {
            const searchCriteria = this.getSearchCriteria();
            this._lastSearchedCriteria = searchCriteria;
            this._fire("filter-updated", [searchCriteria]);
        }
        this.updateFilterPanelState(true);
    }

    private _updateApplyFiltersButtonState(disable: boolean): void {
        if (disable) {
            this._$applyFiltersButton.attr("disabled", "");
            this._$applyFiltersButton.addClass("disabled");
        } else {
            this._$applyFiltersButton.removeAttr("disabled");
            this._$applyFiltersButton.removeClass("disabled");
        }
    }

    private _drawTableFormatToolButton($container, callback: any): void {
        const menu = <Menus.MenuBar>Controls.BaseControl.createIn(Menus.MenuBar,
            $(domElem("span", "vc-view-pivot-filters toolbar")).appendTo($container),
            { cssClass: "vc-view-pivot-menu" }
        );
        const menuItems: any[] = [];
        menuItems.push({
            id: "format-commits-table",
            title: VCResources.HistoryListFormatToggleText,
            showText: false,
            toggled: !this._compactTableFormat,
            icon: "bowtie-icon bowtie-editor-list-bullet",
            action: () => {
                this._compactTableFormat = !this._compactTableFormat;
                callback(this._compactTableFormat);
            }
        });

        menu.updateItems(menuItems);
    }

    private _drawAdvancedFilter($pathContainer: JQuery, $filterContainer: JQuery): void {

        let $filterTable: JQuery,
            $filterRow: JQuery,
            $filterCell: JQuery,
            $rangeFrom: JQuery,
            $rangeTo: JQuery,
            $rangeInput: JQuery,
            $label: JQuery,
            showBranches: boolean = this._options.showBranches,
            showFromToRange: boolean = this._options.showFromToRange,
            showHistoryMode: boolean = !!this._options.showHistoryMode,
            showOldFilters: boolean = this._options.showOldFilters,
            showPath: boolean,
            colSpan: number,
            gitContext: GitRepositoryContext,
            controlId = this.getId(),
            pathEditId = "path" + controlId;
        showPath = this._options.showOldPathControl !== false;

        $filterTable = $(domElem("table", "filter"));

        $filterRow = $(domElem("tr", "filter-row")).appendTo($filterTable);
        if (!showPath && !showBranches) {
            $filterRow.hide();
        }

        const $pathLabelCell = $(domElem("td")).addClass("bowtie").appendTo($filterRow);
        $label = $(domElem("label"))
            .attr("for", pathEditId)
            .addClass("source-path-label")
            .text(VCResources.ChangesetListPath)
            .appendTo($pathLabelCell);

        let $pathTextBoxCell: JQuery;

        if (this._options.showLabelFieldStackedUp) {
            $pathTextBoxCell = $pathLabelCell;
        }
        else {
            $pathTextBoxCell = $(domElem("td")).addClass("path-cell bowtie").appendTo($filterRow);
        }

        this._$path = $(domElem("input", "path"))
            .attr("id", pathEditId)
            .addClass("path-cell-input")
            .appendTo($pathTextBoxCell)
            .val(this._options.path || "")
            .bind("keydown", delegate(this, this._onKeyDown));

        if (!showPath) {
            $pathLabelCell.hide();
            $pathTextBoxCell.hide();
        }

        if (showBranches) {
            $filterCell = $(domElem("td")).addClass("branch bowtie").appendTo($filterRow);
            $(domElem("label")).text(VCResources.BranchLabelText).appendTo($filterCell);
            this._branchesControl = <VCGitVersionSelectorMenu.GitVersionSelectorMenu>Controls.BaseControl.createIn(VCGitVersionSelectorMenu.GitVersionSelectorMenu, $filterCell, {
                onItemChanged: () => this.fireFilterUpdated()
            });
        }

        const $filterControlsRow = $("<tr class='filter-row vc-advanced-filter' />");

        if (!$filterContainer) {
            $filterControlsRow.appendTo($filterTable);
        } else {
            const $filterControlsTable = $(domElem("table", "filter")).append($filterControlsRow);
            $filterControlsTable.appendTo($filterContainer);
        }

        if(showOldFilters) {
            $filterCell = $(domElem("td")).appendTo($filterControlsRow);

            this._$filterButton = $(domElem("div", "filter-button bowtie-icon bowtie-search-filter")).attr("tabindex", "0");
            this._$filterButton.appendTo($filterCell);

            if (showHistoryMode) {
                this._renderHistoryModeOption($filterControlsRow);
            }

            $filterCell = $(domElem("td")).addClass("vc-filter-control").appendTo($filterControlsRow);
            this.createUserSelector($filterCell, controlId);

            if (showFromToRange) {
                $filterCell = $(domElem("td")).addClass("vc-filter-control").appendTo($filterControlsRow);
                $rangeInput = $(domElem("input", "range")).attr("id", "range" + controlId).appendTo($filterCell);
            }

            $filterCell = $(domElem("td")).addClass("vc-filter-control").appendTo($filterControlsRow).bind("keydown", delegate(this, this._onKeyDown));
            $rangeFrom = $(domElem("div", "from")).appendTo($filterCell);
            this._fromCombo = <Combos.Combo>Controls.BaseControl.createIn(Combos.Combo, $rangeFrom, {
                cssClass: "from-combo",
                id: "from" + controlId,
                focus: () => {
                    if (this._fromCombo.getMode() === "drop" && !this._fromCombo.isDropVisible()) {
                        this._fromCombo.showDropPopup();
                    }
                },
                change: (combo: Combos.Combo) => {
                    this._handleFilterComboValueChange(combo, this._isDateRangeSelected() ? VCResources.FilterFromDateText : VCResources.ChangesetListFrom);
                }
            });

            this._handleFilterComboValueChange(this._fromCombo, this._isDateRangeSelected() ? VCResources.FilterFromDateText : VCResources.ChangesetListFrom);
            this._fromCombo._element.change({ title: () => { return this._isDateRangeSelected() ? VCResources.FilterFromDateText : VCResources.ChangesetListFrom; } },
                                            delegate(this, this._onComboChange));
            this._fromCombo.getInput().attr("title", VCResources.FilterFromDateText);
            this._$fromErrorMessage = $(domElem("div", "error-tip")).hide().text("").appendTo(this._fromCombo._element);
            this.addErrorToolTip(this._fromCombo._element, this._$fromErrorMessage);

            $filterCell = $(domElem("td")).addClass("vc-filter-control").appendTo($filterControlsRow).bind("keydown", delegate(this, this._onKeyDown));
            $rangeTo = $(domElem("div", "to")).appendTo($filterCell);
            this._toCombo = <Combos.Combo>Controls.BaseControl.createIn(Combos.Combo, $rangeTo, {
                cssClass: "to-combo",
                id: "to" + controlId,
                focus: () => {
                    if (this._toCombo.getMode() === "drop" && !this._toCombo.isDropVisible()) {
                        this._toCombo.showDropPopup();
                    }
                },
                change: (combo: Combos.Combo) => {
                    this._handleFilterComboValueChange(combo, this._isDateRangeSelected() ? VCResources.FilterToDateText : VCResources.ChangesetListTo);
                }
            });
            this._handleFilterComboValueChange(this._toCombo, this._isDateRangeSelected() ? VCResources.FilterToDateText : VCResources.ChangesetListTo);
            this._toCombo._element.change({ title: () => { return this._isDateRangeSelected() ? VCResources.FilterToDateText : VCResources.ChangesetListTo; } },
                                        delegate(this, this._onComboChange));
            this._$toErrorMessage = $(domElem("div", "error-tip")).hide().text("").appendTo(this._toCombo._element);
            this.addErrorToolTip(this._toCombo._element, this._$toErrorMessage);

            $filterCell = $(domElem("td")).addClass("bowtie").appendTo($filterControlsRow);
            this._$applyFiltersButton = $(domElem("button", "btn-cta vc-apply-filters-button"))
                .text(VCResources.FilterApplyFiltersButtonText)
                .attr("title", VCResources.FilterApplyFiltersButtonTooltip).appendTo($filterCell);
            this._$applyFiltersButton.click(delegate(this, this._onApplyFiltersClick));
        }
    
        if (showBranches) {
            this._branchesControl.setRepository(<GitRepositoryContext>this._repositoryContext);

            if (this._options.version) {
                this._branchesControl.setSelectedVersion(this._options.version);
            }
            else if (this._repositoryContext && this._repositoryContext.getRepositoryType() === RepositoryType.Git) {
                gitContext = <GitRepositoryContext>this._repositoryContext;
                gitContext.getGitClient().beginGetUserLastBranch(gitContext.getRepository(), (branchName: string) => {
                    if (branchName) {
                        this._branchesControl.setSelectedVersion(new VCSpecs.GitBranchVersionSpec(branchName));
                    }
                });
            }
        }

        if (showOldFilters && showFromToRange) {
            this._rangeCombo = <Combos.Combo>Controls.Enhancement.enhance(Combos.Combo, $rangeInput, {
                cssClass: "range-combo",
                allowEdit: false,
                source: [VCResources.ChangesetListCreatedDate, VCResources.ChangesetListChangesetNumber],
                indexChanged: delegate(this, this._onRangeChange),
                change: (combo: Combos.Combo) => {
                    if (combo && combo.getText().trim() === "") {
                        Utils_UI.Watermark(combo.getInput(), { watermarkText: VCResources.FilterRangeText });
                    }
                },
                focus: () => {
                    if (!this._rangeCombo.isDropVisible()) {
                        this._rangeCombo.showDropPopup();
                    }
                }
            });
            this._rangeCombo.setSelectedIndex(0, false);
            this._rangeCombo.getInput().attr("title", VCResources.FilterRangeText);
        }

        if (!this._options.path && this._repositoryContext) {
            this._$path.val(this._repositoryContext.getRootPath());
        }

        $filterTable.appendTo($pathContainer);

        if(this._options.showOldFilters){
            this._setFromToComboProperties();
            this.updateFilterPanelState();
        }
    }

    private _renderHistoryModeOption($container: JQuery) {
        const $filterCell = $(domElem("td")).addClass("vc-filter-control vc-history-mode-filter");

        const $historyModeInput = $(domElem("input", "history-mode-input"))
            .appendTo($filterCell);

        this._historyModeCombo = <Combos.Combo>Controls.Enhancement.enhance(Combos.Combo, $historyModeInput, {
            cssClass: "history-mode-combo",
            allowEdit: false,
            source: ChangesSearchFilter._historyModeComboOptionsDisplayText,
            change: (combo: Combos.Combo) => {
                this._handleHistoryModeComboValueChange(combo);
            },
            focus: () => {
                if (!this._historyModeCombo.isDropVisible()) {
                    this._historyModeCombo.showDropPopup();
                }
            }
        });
        this._historyModeCombo.setSelectedIndex(0, false);
        this._historyModeCombo.getInput().attr("title", VCResources.HistoryModeFilterControlText);
        $filterCell.appendTo($container);
    }

    private _handleHistoryModeComboValueChange(combo: Combos.Combo): void {
        if (combo.getSelectedIndex() > 0) {
            combo.getElement().addClass("has-selected-values");
            this.updateFilterPanelState();
        } else {
            combo.getElement().removeClass("has-selected-values");
            this._onApplyFiltersClick();
        }
    }

    private _handleFilterComboValueChange(combo: Combos.Combo, text: string): void {
        if (combo && combo.getText().trim() === "") {
            Utils_UI.Watermark(combo.getInput(), { watermarkText: text });
            combo.getInput().attr("title", text);
            combo.getElement().removeClass("has-selected-values");
        } else {
            combo.getElement().addClass("has-selected-values");
        }
    }

    private _onKeyDown(e?: JQueryEventObject): any {
        if (e.keyCode === Utils_UI.KeyCode.ENTER) {
            this._onApplyFiltersClick();
                $(e.target).blur();
            return false;
        }
    }

    private _isDateRangeSelected(): boolean {
        if (this._rangeCombo) {
            return this._rangeCombo.getSelectedIndex() === 0;
        }
        else {
            return true;
        }
    }

    private _onApplyFiltersClick(e?: JQueryEventObject): void {
        if (!this._checkFormat()) {
            return;
        }
        this.fireFilterUpdated();
    }

    private _onRangeChange(): void {
        this._fromCombo.setText("", false);
        this._toCombo.setText("", false);
        this._setFromToComboProperties();
        this.fireFilterUpdated();
    }

    private _setFromToComboProperties(): void {
        //when change range box type, remove invalid class
        this._removeInvalidClassFromComboBox();
        if (this._isDateRangeSelected()) {
            this._fromCombo.setType("date-time");
            this._fromCombo.setMode("drop");
            this._handleFilterComboValueChange(this._fromCombo, VCResources.FilterFromDateText);

            this._toCombo.setType("date-time");
            this._toCombo.setMode("drop");
            this._handleFilterComboValueChange(this._toCombo, VCResources.FilterToDateText);
        }
        else {
            this._$fromErrorMessage.hide();
            this._$toErrorMessage.hide();
            this._fromCombo.setType("list");
            this._fromCombo.setMode("text");
            this._handleFilterComboValueChange(this._fromCombo, VCResources.ChangesetListFrom);

            this._toCombo.setType("list");
            this._toCombo.setMode("text");
            this._handleFilterComboValueChange(this._toCombo, VCResources.ChangesetListTo);
        }
        this._updateFilterControlsTooltip();
    }

    private _updateFilterControlsTooltip(): void {
        if (this._userCombo) {
            const tooltip = this.getFormattedTooltip(VCResources.HistoryResultHeaderAuthor, this._userCombo.getInputText());
            this._userCombo.getInput().attr("title", tooltip);
        }

        const fromTooltip = this.getFormattedTooltip(this._isDateRangeSelected() ? VCResources.FilterFromDateText : VCResources.ChangesetListFrom,
                                                    this._fromCombo.getInputText());
        this._fromCombo.getInput().attr("title", fromTooltip);

        const toTooltip = this.getFormattedTooltip(this._isDateRangeSelected() ? VCResources.FilterToDateText : VCResources.ChangesetListTo,
                                                  this._toCombo.getInputText());
        this._toCombo.getInput().attr("title", toTooltip);

        if (this._rangeCombo) {
            const rangeTooltip = this.getFormattedTooltip(VCResources.ChangesetListRange, this._rangeCombo.getInputText());
            this._rangeCombo.getInput().attr("title", rangeTooltip);
        }
    }

    private _onComboChange(e?: JQueryEventObject): void {
        //clear the invalid-form class and hide error tooltip when fromCombo or toCombo has key down event
        const $target: JQuery = $(e.target);
        $target.removeClass("invalid-form");

        const input = $target.find("input");
        const value: string = input.val();

        if (value == null || value.trim() === "") {
            $target.removeClass("has-selected-values");
            input.attr("title", e.data.title());
            this.fireFilterUpdated();
        } else {
            this.updateFilterPanelState();
        }

        this._$fromErrorMessage.hide();
        this._$toErrorMessage.hide();
    }

    private _removeInvalidClassFromComboBox(): void {
        this._fromCombo._element.removeClass("invalid-form");
        this._toCombo._element.removeClass("invalid-form");
    }

    private _checkFormat(): boolean {
        let validFormat: boolean = true;
        if(this._options.showOldFilters){
            this._removeInvalidClassFromComboBox();
            if (this._isDateRangeSelected()) {
                validFormat = this._checkComboDateFormat(this._fromCombo, this._$fromErrorMessage) && validFormat;
                validFormat = this._checkComboDateFormat(this._toCombo, this._$toErrorMessage) && validFormat;
            }
            else {
                validFormat = this._checkComboChangesetNumberFormat(this._fromCombo, this._$fromErrorMessage) && validFormat;
                validFormat = this._checkComboChangesetNumberFormat(this._toCombo, this._$toErrorMessage) && validFormat;
            }
        }
        return validFormat;
    }

    private _checkComboChangesetNumberFormat(combo: Combos.ComboO<Combos.IDateTimeComboOptions>, $errorMessage: JQuery): boolean {
        const changesetNumber: string = combo.getInputText().trim();
        let isNumber: boolean = true;
        if (changesetNumber && !isNaN(parseInt(changesetNumber)) && parseInt(changesetNumber).toString().length == changesetNumber.length) {
            if (1 > parseInt(changesetNumber) || parseInt(changesetNumber) > 2147483647) {
                isNumber = false;
            }
        }
        else if (changesetNumber) {
            isNumber = false;
        }

        if (!isNumber) {
            combo._element.addClass("invalid-form");
            $errorMessage.text(Utils_String.format(VCResources.HistoryChangesSearchFilterInvalidChangesetNumberFormat, changesetNumber));
        }

        return isNumber;
    }

    private _checkComboDateFormat(combo: Combos.ComboO<Combos.IDateTimeComboOptions>, $errorMessage: JQuery): boolean {
        if (combo.getInputText().trim() && !Utils_Date.parseDateString(combo.getInputText())) {
            combo._element.addClass("invalid-form");
            $errorMessage.text(VCResources.HistoryChangesSearchFilterInvalidDateFormat);
            return false;
        }
        return true;
    }

}
