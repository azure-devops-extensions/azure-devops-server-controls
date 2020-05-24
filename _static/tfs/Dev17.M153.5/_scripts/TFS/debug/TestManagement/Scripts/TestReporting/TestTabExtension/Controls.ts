/// <reference types="knockout" />



import ko = require("knockout");

import EngagementDispatcher_NO_REQUIRE = require("Engagement/Dispatcher");
import EngagementRegistrations_NO_REQUIRE = require("TestManagement/Scripts/TFS.TestManagement.Engagement.Registrations");
import TFS_EngagementRegistrations_NO_REQUIRE = require("Presentation/Scripts/TFS/TFS.Engagement.Registrations");

import * as CommonBase from "TestManagement/Scripts/TestReporting/Common/Common";
import Common = require("TestManagement/Scripts/TestReporting/TestTabExtension/Common");
import TCMLicenseAndFeatureFlagUtils = require("TestManagement/Scripts/Utils/TFS.TestManagement.LicenseAndFeatureFlagUtils");
import TCMPermissionUtils = require("TestManagement/Scripts/Utils/TFS.TestManagement.PermissionUtils");
import Resources = require("TestManagement/Scripts/Resources/TFS.Resources.TestManagement");
import ResultsDetail = require("TestManagement/Scripts/TestReporting/TestTabExtension/TestResults.ResultDetails");
import TCMTelemetry = require("TestManagement/Scripts/TFS.TestManagement.Telemetry");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import * as ViewSettings from "TestManagement/Scripts/TestReporting/Common/View.Settings";


import Controls = require("VSS/Controls");
import Dialogs = require("VSS/Controls/Dialogs");
import Grids = require("VSS/Controls/Grids");
import Menus = require("VSS/Controls/Menus");
import Navigation = require("VSS/Controls/Navigation");
import { RichContentTooltip } from "VSS/Controls/PopupContent";
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import VSS = require("VSS/VSS");

let delegate = Utils_Core.delegate;
let TelemetryService = TCMTelemetry.TelemetryService;
let LicenseAndFeatureFlagUtils = TCMLicenseAndFeatureFlagUtils.LicenseAndFeatureFlagUtils;

export interface ColumnOptionsDialogOptions extends Dialogs.IModalDialogOptions {
    allColumns?: Grids.IGridColumn[];
    displayColumns?: Grids.IGridColumn[];
}

export interface IColumnOptionsDialog extends ResultsDetail.IShowColumnOptions {
    width: number;
    minHeight: number;
    height: number;
    simpleMode: boolean;
    allColumns: Grids.IGridColumn[];
    cssClass: string;
    initialFocusSelector: string;
    target: Common.TargetPage;
    okCallback: Function;
}

export interface IColumnsByProperty {
    [index: string]: Grids.IGridColumn[];
}

export interface IColumnByName {
    [index: string]: Grids.IGridColumn;
}

export interface IDisplayColumnContext {
    isDisplay: boolean;
    columns: IColumnByName;
    $button: JQuery;
    $container: JQuery;
    $available: JQuery;
    $selected: JQuery;
    populated: boolean;
}

interface IColumnContext {
    display: IDisplayColumnContext;
    reset: Function;
}

export class ColumnOptionsDialog extends Dialogs.ModalDialogO<ColumnOptionsDialogOptions>{

    constructor(options?: IColumnOptionsDialog) {
        super(options);
        if (options) {
            this._target = options.target;
        }
    }

    public initialize() {

        super.initialize();
        this._element.addClass("test-results-column-options");

        // Initially, display columns are visible. User can switch between display and sort
        // columns using the buttons at the top of the dialog
        this._currentView = "display";

        this._columnContext = {
            "display": { isDisplay: true, columns: {}, $button: null, $container: null, $available: null, $selected: null, populated: false },
            reset: function () {
                this.display.populated = false;
            }
        };

        this._allColumns = this._options.allColumns || [];
        this._columnsByName = {};
        this._allColumns.forEach((col) => {
            this._columnsByName[col.text] = col;
        });

        // Setting the title of the dialog
        this.setTitle(Resources.ColumnOptionsTitle);

        // Populate the main content
        this._populateMainContent();

        // Populating the selected and available columns
        this._populateSelectedColumns();
        this._populateAvailableColumns(this._columnContext.display);

        // Updating the status of the buttons on the dialog
        this._attachButtonEvents();
        this._updateButtons();
    }

    public getDialogResult(): IColumnsByProperty {
        let display: IColumnsByProperty = {}, displayContext: IDisplayColumnContext = this._columnContext.display;
        display[this._displayContextName] = [];
        // Preparing the result display columns for the caller
        let selectedColumns: JQuery = displayContext.$selected.children();
        selectedColumns.each((index, col) => {
            display[this._displayContextName].push(displayContext.columns[this._columnsByName[col.textContent].index]);
        });

        this._updateSelectedColumnsSettings(selectedColumns);
        this._addTelemetryForColumnsSelected(selectedColumns);
        return display;
    }

    public addColumns(): void {
        let indices: string[] = [], optionsHtml: string[] = [], current: IDisplayColumnContext = this._getCurrentContext(), columnField: Grids.IGridColumn;

        // Getting the selected columns first
        current.$available.find(this._optionSelected).each(function (i, opt) {
            indices.push(opt.textContent);
            $(opt).remove();
        });

        indices.forEach(delegate(this, (index) => {
            let col: any = { text: index };
            if (current.isDisplay) {
                columnField = this._columnsByName[index];
                if (columnField) {
                    col.index = columnField.index;
                }
            }
            optionsHtml.push(this._createColumnRow(col, false));
            current.columns[this._columnsByName[index].index] = col;
        }));

        if (optionsHtml.length) {
            current.$selected.append(optionsHtml.join(","));
        }

        this._updateButtons();
    }

    public removeColumns(): void {
        let names: string[] = [], current: IDisplayColumnContext = this._getCurrentContext();

        // Getting the selected columns first
        current.$selected.find(this._optionSelected).each((i, opt) => {
            names.push(opt.textContent);
            $(opt).remove();
        });

        names.forEach(delegate(this, (name) => {
            let col = current.columns[this._columnsByName[name].index];
            if (col) {
                this._insertRow(current.$available, col);
                delete current.columns[this._columnsByName[name].index];
            }
        }));

        this._updateButtons();
    }

    public _createColumnRow(column: Grids.IGridColumn, selected: boolean): string {
        /// <summary>Creates list item content for columns</summary>
        return Utils_String.format("<option value='{0}'{1}>{2}</option>", column.text, selected ? " selected" : Utils_String.empty, column.text);
    }

    public _getCurrentContext(): IDisplayColumnContext {
        return this._columnContext[this._currentView];
    }

    private _updateSelectedColumnsSettings(selectedColumns: JQuery) {
        let viewSettingsInstance: ViewSettings.IUserSettings = ViewSettings.TestReportViewSettings.getInstance().getViewSettings();
        let selectedColumnsInUserSettings = viewSettingsInstance.selectedColumns;
        let newSelectedColumns: ViewSettings.IColumnByName[] = [], columnPushed: boolean = false;
        selectedColumns.each((index, col) => {
            columnPushed = false;
            for (let i = 0, len = selectedColumnsInUserSettings.length; i < len; i++) {
                if (Utils_String.equals(col.textContent, selectedColumnsInUserSettings[i].columnName, true)) {
                    newSelectedColumns.push(selectedColumnsInUserSettings[i]);
                    columnPushed = true;
                }
            }
            if (!columnPushed) {
                newSelectedColumns.push({ columnName: col.textContent, width: 100 });
            }
        });
        viewSettingsInstance.selectedColumns = newSelectedColumns;
        if (this._target === Common.TargetPage.Build_Summary_Test_Tab) {
            ViewSettings.UpdateUserSettings.updateUserSpecificSettings(CommonBase.ViewContext.Build, viewSettingsInstance);
        }
        if (this._target === Common.TargetPage.Release_Summary_Test_Tab) {
            ViewSettings.UpdateUserSettings.updateUserSpecificSettings(CommonBase.ViewContext.Release, viewSettingsInstance);
        }
    }

    private _addTelemetryForColumnsSelected(selectedColumns: JQuery) {
        let workFlow: string = Utils_String.empty, columnsList: string[] = [], columnsCount: number = selectedColumns.length;
        if (this._target === Common.TargetPage.Build_Summary_Test_Tab) {
            workFlow = "Build";
        }
        else if (this._target === Common.TargetPage.Release_Summary_Test_Tab) {
            workFlow = "Release";
        }

        selectedColumns.each((index, col) => {
            columnsList.push(col.textContent);
        });
        TelemetryService.publishEvents(TelemetryService.featureTestTabinBuildSummary_ColumnsChanged, {
            "NumberOfColumns": columnsCount,
            "ColumnsName": columnsList.join(),
            "Workflow": workFlow,
            "Context": this._columnContext
        });
    }

    private _populateMainContent() {
        let $columnsDiv: JQuery = $("<div class='test-results-columns' />").appendTo(this._element);
        this._populateTabContent($columnsDiv, this._displayContextName);
    }

    private _populateTabContent($container: JQuery, contextName: string): void {
        let context: IDisplayColumnContext = this._columnContext[contextName];
        context.$container = $("<div class='content' />").addClass(contextName).appendTo($container);
        this._populateSectionDiv($("<div class='available' />").appendTo(context.$container), true, context);
        this._populateSectionDiv($("<div class='selected' />").appendTo(context.$container), false, context);
    }

    private _populateSectionDiv($container: JQuery, isAvailable: boolean, context: IDisplayColumnContext): void {
        let labelText: string = isAvailable ? Resources.ColumnOptionsAvailableColumns : Resources.ColumnOptionsSelectedColumns,
            selectKey: string = isAvailable ? "$available" : "$selected",
            $buttonContainer: JQuery;

        $("<label />").text(labelText).appendTo($("<div class='header' />").appendTo($container));
        context[selectKey] = $("<select size='2' multiple='multiple' />").appendTo($("<div class='list-container' />").appendTo($container));

        if (isAvailable) {
            context[selectKey].on("change", delegate(this, this._onAvailableListChange)).on("dblclick", delegate(this, this._onAvailableListDblClick));
        }
        else {
            context[selectKey].on("change", delegate(this, this._onSelectedListChange)).on("dblclick", delegate(this, this._onSelectedListDblClick));
        }

        $buttonContainer = $("<div class='buttons' />").appendTo($container);
        if (isAvailable) {
            this._addButton($buttonContainer, "add", Resources.ColumnOptionsAddColumn, "bowtie-icon bowtie-chevron-right");
            this._addButton($buttonContainer, "remove", Resources.ColumnOptionsRemoveColumn, "bowtie-icon bowtie-chevron-left");
        }
        else {
            this._addButton($buttonContainer, "move-up", Resources.ColumnOptionsMoveColumnUp, "bowtie-icon bowtie-arrow-up");
            this._addButton($buttonContainer, "move-down", Resources.ColumnOptionsMoveColumnDown, "bowtie-icon bowtie-arrow-down");
            $("<br />").appendTo($buttonContainer);
        }
    }

    private _addButton($container: JQuery, css: string, title: string, icon: string): JQuery {
        let $button: JQuery = $("<button />").attr("aria-label", title).addClass(css).appendTo($("<div />").appendTo($container));
        RichContentTooltip.add(title, $button);
        $("<span class='icon' />").addClass(icon).appendTo($button);
        return $button;
    }

    private _attachButtonEvents(): void {
        let element: JQuery = this._element;
        element.find("button.add").on("click", delegate(this, this._onAddColumnClick)).button();
        element.find("button.remove").on("click", delegate(this, this._onRemoveColumnClick)).button();
        element.find("button.move-up").on("click", delegate(this, this._onMoveColumnUpClick)).button();
        element.find("button.move-down").on("click", delegate(this, this._onMoveColumnDownClick)).button();
    }

    //The columns to appear on left box
    //Setting only text and index as told by satishc to me as an object to the available columns
    private _populateAvailableColumns(context: IDisplayColumnContext): void {

        context.$available.empty();
        this._allColumns.forEach((col) => {
            if (!context.columns[col.index]) {
                context.$available.append(this._createColumnRow(col, false));
            }
        });
    }

    //The columns to appear on right box
    //This will store width too, as if someone clicks on column option button and then click Ok, he should not get default/hard coded widths, as the 
    //user setting cannot be loaded again for those columns we are saving it here too.
    private _populateSelectedColumns(): void {
        let options: ColumnOptionsDialogOptions = this._options,
            display: IDisplayColumnContext = this._columnContext.display;
        options.displayColumns = options.displayColumns || [];

        // Populating selected display columns
        options.displayColumns.forEach((displayColumn) => {
            let col: Grids.IGridColumn = {
                text: displayColumn.text,
                index: displayColumn.index,
                width: displayColumn.width
            };
            display.columns[displayColumn.index] = col;
            display.$selected.append(this._createColumnRow(col, false));
        });
    }

    private _moveColumnUp(): void {
        let columnsToMoveUp: JQuery = this._getCurrentContext().$selected.find(this._optionSelected);
        columnsToMoveUp.each((index, col) => {
            let $prev = $(col).prev();
            if (!$prev.attr("selected")) {
                $(col).insertBefore($prev);
            }
        });
    }

    private _moveColumnDown(): void {
        let columnsToMoveDown: HTMLElement[] = this._getCurrentContext().$selected.find(this._optionSelected).toArray().reverse();
        columnsToMoveDown.forEach((col) => {
            let $next = $(col).next();
            if (!$next.attr("selected")) {
                $(col).insertAfter($next);
            }
        });
    }

    // This function creates a list item for available list and
    // places is in a correct location in an alphabetical manner
    private _insertRow($list: JQuery, col: Grids.IGridColumn): void {
        let inserted: boolean = false;
        let column: JQuery = $list.children();
        column.each(delegate(this, (index, currentColumn) => {
            if (Utils_String.ignoreCaseComparer(col.text, currentColumn.text) < 0) {
                $(currentColumn).before(this._createColumnRow(col, true));
                inserted = true;
                return false;
            }
        }));

        // If there is no items in the list or the inserted item
        // is going to be last item, it is not handled in the previous
        // loop. Thus, it should be handled separately.
        if (!inserted) {
            $list.append(this._createColumnRow(col, true));
        }
    }

    private _updateButtons(): void {
        let current: IDisplayColumnContext = this._getCurrentContext(),
            availableDisabled: boolean = current.$available.children(":selected").length === 0,
            selectedDisabled: boolean = current.$selected.children(":selected").length === 0;

        current.$available.closest("div.available").find("button.add").button("option", "disabled", availableDisabled);
        current.$available.closest("div.available").find("button.remove").button("option", "disabled", selectedDisabled);
        current.$selected.closest("div.selected").find("button").button("option", "disabled", selectedDisabled);

        this.updateOkButton(this._columnContext.display.$selected.children().length > 0);
    }

    private _onAvailableListChange(): void {
        this._updateButtons();
    }

    private _onAvailableListDblClick(): void {
        this.addColumns();
    }

    private _onSelectedListChange(): void {
        this._updateButtons();
    }

    private _onSelectedListDblClick(): void {
        this.removeColumns();
    }

    private _onAddColumnClick(): void {
        this.addColumns();
    }

    private _onRemoveColumnClick(): void {
        this.removeColumns();
    }

    private _onMoveColumnUpClick(): void {
        this._moveColumnUp();
    }

    private _onMoveColumnDownClick(): void {
        this._moveColumnDown();
    }

    private _currentView: string;
    private _columnContext: IColumnContext;
    private _allColumns: Grids.IGridColumn[];
    private _columnsByName: IColumnByName = {};
    private _displayContextName: string = "display";
    private _optionSelected: string = "option:selected";
    private _target: Common.TargetPage;

}

/// <summary>
/// Tool bar section control for TestResults extension page
/// </summary>
export class LeftToolbar extends Controls.BaseControl {

    constructor(options?: any) {
        super(options);
    }

    public initializeOptions(options?: any) {
        super.initializeOptions($.extend({
            coreCssClass: "toolbar test-result-details-toolbar"
        }, options));
    }

    public initialize() {
        super.initialize();
        this._createView();
    }

    public onExecuteCommand: (command: string) => void;

    private _createView(): void {
        this._menuBar = <Menus.MenuBar>Controls.BaseControl.createIn(Menus.MenuBar, this.getElement(), {
            items: this._createMenubarItems(),
            executeAction: Utils_Core.delegate(this, this._onMenubarItemClick)
        });

        this._isCreateBugPermisionPresent = TCMPermissionUtils.PermissionUtils.hasCreateWorkItemPermission(TFS_Host_TfsContext.TfsContext.getDefault().navigation.projectId);
    }

    private _createMenubarItems(): Menus.IMenuItemSpec[] {
        let createBugText = Utils_String.format(Resources.CreateWorkItemText, Resources.BugCategoryRefName);
        let items = [];
        items.push({ id: Common.TestResultDetailsCommands.ExpandAll, title: Resources.ExpandAllText, showText: false, icon: "bowtie-icon bowtie-toggle-expand" });
        items.push({ id: Common.TestResultDetailsCommands.CollapseAll, title: Resources.CollapseAllText, showText: false, icon: "bowtie-icon bowtie-toggle-collapse" });

        items.push({ separator: true });

        items.push({ id: Common.TestResultDetailsCommands.ColumnOptions, text: Resources.Columnoptions, showText: true, noIcon: true });

        items.push({ separator: true });

        if (LicenseAndFeatureFlagUtils.isAddToExistingBugInTestResultSummaryPageEnabled()) {
            items.push({ id: Common.TestResultDetailsCommands.BugMenuItem, text: Resources.BugText, title: Resources.BugText, showText: true, icon: "bowtie-icon bowtie-file-bug", disabled: true, childItems: this._createAndAddBugSubMenu() });
        }
        else {
            items.push({ id: Common.TestResultDetailsCommands.CreateBug, title: createBugText, showText: false, icon: "bowtie-icon bowtie-file-bug", disabled: true });
        }

        items.push({ id: Common.TestResultDetailsCommands.RelatedRequirements, title: Resources.RelatedRequirementDialogTitle, showText: false, icon: "bowtie-icon bowtie-link", disabled: true });
        if (LicenseAndFeatureFlagUtils.isQuickStartTraceabilityEnabled()) {
            VSS.using(["Engagement/Dispatcher", "TestManagement/Scripts/TFS.TestManagement.Engagement.Registrations", "Presentation/Scripts/TFS/TFS.Engagement.Registrations"], (EngagementDispatcher: typeof EngagementDispatcher_NO_REQUIRE, EngagementRegistrations: typeof EngagementRegistrations_NO_REQUIRE, TFS_EngagementRegistrations: typeof TFS_EngagementRegistrations_NO_REQUIRE) => {
                EngagementRegistrations.registerTraceabilityQuickStart();
                TFS_EngagementRegistrations.registerNewFeature();
                EngagementDispatcher.Dispatcher.getInstance().start("TestsExtension");
            });
        }

        if (LicenseAndFeatureFlagUtils.isInProgressFeatureEnabled()) {
            items.push({ separator: true });
            items.push({ id: Common.TestResultDetailsCommands.Refresh, text: Resources.ViewMoreTests, title: Resources.ViewMoreTests, showText: true, icon: "bowtie-icon bowtie-navigate-refresh", hidden: true });
        }

        return items;
    }

    private _createAndAddBugSubMenu() {
        let createBugText: string = Utils_String.format(Resources.CreateWorkItemText, Resources.BugCategoryRefName);
        let addBugText: string = Utils_String.format(Resources.AddToExistingBugText, Resources.BugCategoryRefName);

        return [
            {
                id: Common.TestResultDetailsCommands.CreateBug, text: createBugText, showText: true, icon: "bowtie-icon bowtie-work-item"
            },
            {
                id: Common.TestResultDetailsCommands.AddToExistingBug, text: addBugText, showText: true, icon: "bowtie-icon bowtie-link"
            }
        ];
    }

    private _onMenubarItemClick(e?: any) {
        let commandName = e.get_commandName();
        if (this.onExecuteCommand) {
            this.onExecuteCommand(commandName);
        }
    }

    public updateStateOfCreateBugAndLinkButton(toDisable: boolean) {
        toDisable = toDisable || !this._isCreateBugPermisionPresent;
        this._menuBar.updateCommandStates(
            [
                {
                    id: Common.TestResultDetailsCommands.CreateBug,
                    disabled: toDisable
                },
                {
                    id: Common.TestResultDetailsCommands.BugMenuItem,
                    disabled: toDisable
                },
                {
                    id: Common.TestResultDetailsCommands.RelatedRequirements,
                    disabled: toDisable
                }
            ]
        );
    }

    public showRefreshButton(shouldBeVisible: boolean) {
        this._menuBar.updateCommandStates(
            [
                {
                    id: Common.TestResultDetailsCommands.Refresh,
                    hidden: !shouldBeVisible
                }
            ]
        );
    }

    public isCommandEnabled(commandId: string) {
        return this._menuBar.getItem(commandId).isEnabled();
    }

    public getMenuBarChildrens(): Menus.MenuItem[] {
        return this._menuBar._children;
    }

    private _isCreateBugPermisionPresent = true;
    private _menuBar: Menus.MenuBar;
}

export interface IDropDownControl {
    /// <summary>
    /// returns list of items in the drop down
    /// </summary>
    getDropDownOptions(): Navigation.IPivotFilterItem[];

    /// <summary>
    /// Handler for pivot changed event
    /// </summary>
    onPivotChanged(e?: any, args?: any);
}

/// <summary>
/// The Group by control to update the result grid based on selection
/// </summary>
export class ResultsDropDownControl extends Controls.BaseControl {

    public initialize() {
        super.initialize();
        this._createView();
    }

    /// <summary>
    /// Update the drop down items with the newly available set
    /// </summary>
    public updateDropDownItems(items: Navigation.IPivotFilterItem[]): void {
        if (this._pivotFilter) {
            this._pivotFilter.updateItems(items);
        }
    }

    /// <summary>
    /// create the view for the control
    /// </summary>
    private _createView(): void {
        this._pivotFilter = <Navigation.PivotFilter>Controls.BaseControl.createIn(Navigation.PivotFilter, this.getElement(), {
            text: this._options.text,
            behavior: ResultsDropDownControl._behavior,
            items: this.getDropDownOptions()
        });

        if ($.isFunction(this._options.onPivotChangedDelegate)) {
            this._pivotFilter._bind("changed", delegate(this, this._options.onPivotChangedDelegate));
        } else {
            throw new Error("onPivotChangedDelegate is not a function.");
        }
    }

    /// <summary>
    /// returns list of drop down options
    /// </summary>
    public getDropDownOptions(): Navigation.IPivotFilterItem[] {
        throw new Error(("ResultsDropDownControl.getDropDownOptions(): This method should be overridden"));
    }

    /// <summary>
    /// Handler for pivot changed event
    /// </summary>
    public onPivotChanged(e?: any, args?: any) {
        throw new Error(("ResultsDropDownControl.onPivotChanged(): This method should be overridden"));
    }

    public _pivotFilter: Navigation.PivotFilter;
    private static _behavior: string = "dropdown";
}

/// <summary>
/// The Group by control to update the result grid based on selection
/// </summary>
export class GroupBy extends ResultsDropDownControl implements IDropDownControl {

    public initializeOptions(options?: any) {
        super.initializeOptions($.extend({
            coreCssClass: "filter test-results-groupby-filter",
            text: Resources.GroupByText,
            onPivotChangedDelegate: this.onPivotChanged
        }, options));
    }

    public groupByOption: KnockoutObservable<string> = ko.observable(Utils_String.empty);

    /// <summary>
    /// Delegate method to be called on change of menu item
    /// </summary>
    public onPivotChanged(e?: any, args?: any) {
        let selectedFilter: Navigation.IPivotFilterItem = this._pivotFilter.getSelectedItem();
        this.groupByOption(selectedFilter.id);
    }

    /// <summary>
    /// returns list of group by options
    /// </summary>
    public getDropDownOptions(): Navigation.IPivotFilterItem[] {
        this._groupbyFilterOptions = [
            { id: Common.TestResultDetailsCommands.GroupByTestRun, text: Resources.TestRunText, selected: false }
        ];

        this._groupbyFilterOptions.push({
            id: Common.TestResultDetailsCommands.GroupByContainer,
            text: Resources.TestFileText,
            selected: false
        });

        this._groupbyFilterOptions.push({
            id: Common.TestResultDetailsCommands.GroupByPriority,
            text: Resources.PriorityText,
            selected: false
        });

        if (TCMPermissionUtils.PermissionUtils.isMember()) {

            this._groupbyFilterOptions.push({
                id: Common.TestResultDetailsCommands.GroupByRequirement,
                text: Resources.RequirementText,
                selected: false
            });

            this._groupbyFilterOptions.push({
                id: Common.TestResultDetailsCommands.GroupByTestSuite,
                text: Resources.TestSuiteText,
                selected: false
            });
        }

        this._groupbyFilterOptions.push({
            id: Common.TestResultDetailsCommands.GroupByOwner,
            text: Resources.Owner,
            selected: false
        });

        this._groupbyFilterOptions.push({
            id: Common.TestResultDetailsCommands.GroupByNone,
            text: Resources.NoneText,
            selected: false
        });

        this._groupbyFilterOptions.forEach((option: Navigation.IPivotFilterItem) => {
            if (option.id ===
                ViewSettings.TestReportViewSettings.getInstance().getViewSettings().groupBySetting.command) {
                option.selected = true;
                return false;
            }
        });
        return this._groupbyFilterOptions;
    }

    private _getGroupbyOptionById(id: string): Navigation.IPivotFilterItem {
        let selectedOption: Navigation.IPivotFilterItem = null;
        for (let i = 0, len = this._groupbyFilterOptions.length; i < len; i++) {
            if (Utils_String.equals(id, this._groupbyFilterOptions[i].id, true)) {
                selectedOption = this._groupbyFilterOptions[i];
                break;
            }
        }

        return selectedOption;
    }

    private _groupbyFilterOptions: Navigation.IPivotFilterItem[];
}

/// <summary>
/// The Filter by control to update the result grid based on selection
/// </summary>
export class FilterBy extends ResultsDropDownControl implements IDropDownControl {

    public initializeOptions(options?: any) {
        super.initializeOptions($.extend({
            coreCssClass: "filter test-results-outcome-filter",
            text: Resources.TestResultsFilterByOutcome,
            onPivotChangedDelegate: this.onPivotChanged
        }, options));
    }

    public filterByOption: KnockoutObservable<string> = ko.observable(Utils_String.empty);

    /// <summary>
    /// Delegate method to be called on change of menu item
    /// </summary>
    public onPivotChanged(e?: any, args?: any) {
        let selectedFilter: Navigation.IPivotFilterItem = this._pivotFilter.getSelectedItem();
        this.filterByOption(selectedFilter.id);
    }

    /// <summary>
    /// returns list of filter options
    /// </summary>
    public getDropDownOptions(): Navigation.IPivotFilterItem[] {
        this._filterByOutcomeOptions = [
            { id: Common.TestResultDetailsCommands.FilterByFailed, text: Resources.TestResultsFilterByOutcomeFailed, selected: false },
            { id: Common.TestResultDetailsCommands.FilterByPassed, text: Resources.TestResultsFilterByOutcomePassed, selected: false }
        ];
        if (LicenseAndFeatureFlagUtils.isNewOutcomeFiltersForRerunEnabled()) {
            this._filterByOutcomeOptions.push({ id: Common.TestResultDetailsCommands.FilterByPassedOnRerun, text: Resources.TestResultsFilterByOutcomePassedOnRerun, selected: false });
        }

        if (LicenseAndFeatureFlagUtils.isAbortedRunsFeatureEnabled()) {
            this._filterByOutcomeOptions.push({ id: Common.TestResultDetailsCommands.FilterByAborted, text: Resources.TestResultsFilterByOutcomeAborted, selected: false });
        }

        if (LicenseAndFeatureFlagUtils.isTIAUIEnabledInBuildSummaryAndGroupBy()) {
            this._filterByOutcomeOptions.push({ id: Common.TestResultDetailsCommands.FilterByNotImpacted, text: Resources.TestResultsFilterByOutcomeNotImpacted, selected: false });
        }

        this._filterByOutcomeOptions.push({ id: Common.TestResultDetailsCommands.FilterByOthers, text: Resources.TestResultsFilterByOutcomeOthers, selected: false },
            { id: Common.TestResultDetailsCommands.FilterByAll, text: Resources.TestResultsFilterByOutcomeAll, selected: false });


        this._filterByOutcomeOptions.forEach((option: Navigation.IPivotFilterItem) => {
            if (option.id === ViewSettings.TestReportViewSettings.getInstance().getViewSettings().filterBySetting.command) {
                option.selected = true;
                return false;
            }
        });

        return this._filterByOutcomeOptions;
    }

    private _filterByOutcomeOptions: Navigation.IPivotFilterItem[];
}

export interface IDetailsPaneOptions {
    onExecuteCommand: (commandName: string) => void;
}

/// <summary>
/// Toggle button implementation for Test results details pane section
/// </summary>
export class RightToolbar extends Controls.Control<IDetailsPaneOptions> {
    public initialize(): void {
        super.initialize();
        this._load();
    }

    public initializeOptions(options?: IDetailsPaneOptions): void {
        super.initializeOptions($.extend({
            coreCssClass: "toolbar right-toolbar"
        }, options));
        this._onExecuteCommand = options.onExecuteCommand;
    }

    public setFilterActiveState(active: boolean) {
        let item: Menus.MenuItem = this._menu.getItem(Common.TestResultDetailsCommands.ToggleFilterBar);
        let menuItemSpec = this._menu.getMenuItemSpecs().filter(x => x.id === Common.TestResultDetailsCommands.ToggleFilterBar)[0];

        item.update({
            ...menuItemSpec,
            icon: active ? "bowtie-icon bowtie-search-filter-fill" : "bowtie-icon bowtie-search-filter"
        });
    }

    public setFilterExpandedState(expanded: boolean) {
        let item: Menus.MenuItem = this._menu.getItem(Common.TestResultDetailsCommands.ToggleFilterBar);
        let menuItemSpec = this._menu.getMenuItemSpecs().filter(x => x.id === Common.TestResultDetailsCommands.ToggleFilterBar)[0];

        item.update({
            ...menuItemSpec,
            title: expanded ? Resources.HideFilterBarTitle : Resources.ShowFilterBarTitle
        });

        this._menu.updateCommandStates([
            {
                id: Common.TestResultDetailsCommands.ToggleFilterBar,
                toggled: expanded,
                disabled: false
            }
        ]);

        let menuItem: JQuery = this._element.find("." + RightToolbar._toggleFilterBarClass);
        menuItem.attr("aria-expanded", expanded.toString());
    }

    public setSplitterExpandedState(splitState: boolean) {
        this._menu.updateCommandStates([
            {
                id: Common.TestResultDetailsCommands.ToggleDetailsPane,
                toggled: splitState,
                disabled: false
            }
        ]);
        let menuItem: JQuery = this._element.find("." + RightToolbar._toggleDetailsPaneClass);

        if (menuItem) {
            menuItem.attr("aria-expanded", splitState.toString());
        }
    }

    /// <summary>
    /// loads the toggle setting from cache and applies the same
    /// Adds the toggle button to MenuBar
    /// </summary>
    private _load(): void {
        this._menu = <Menus.MenuBar>Controls.BaseControl.createIn(Menus.MenuBar, this.getElement(), {
            items: this._getMenuItems(),
            executeAction: delegate(this, this._onMenubarItemClick)
        });
    }

    private _getMenuItems(): Menus.IMenuItemSpec[] {
        let menuItems: Menus.IMenuItemSpec[] = [];
        if (LicenseAndFeatureFlagUtils.isTestResultsFilterInCICDEnabled()) {
            menuItems.push({
                id: Common.TestResultDetailsCommands.ToggleFilterBar,
                title: Resources.ShowFilterBarTitle,
                showText: false,
                icon: "bowtie-icon bowtie-search-filter-fill",
                cssClass: RightToolbar._toggleFilterBarClass
            });
        }
        menuItems.push({
            id: Common.TestResultDetailsCommands.ToggleDetailsPane,
            title: Resources.ResultsDetailToggleText,
            showText: false,
            icon: "bowtie-icon bowtie-details-pane",
            cssClass: RightToolbar._toggleDetailsPaneClass
        });
        return menuItems;
    }

    /// <summary>
    /// Toggle button click handler
    /// </summary>
    private _onMenubarItemClick(e?: any): void {
        let commandName = e.get_commandName();
        this._onExecuteCommand(commandName);
    }

    private static _toggleDetailsPaneClass = "toggle-details-pane-menu";
    private static _toggleFilterBarClass = "toggle-filter-bar-menu";
    private _menu: Menus.MenuBar;
    private _onExecuteCommand: (command: string) => void;
}

/// <summary>
/// Full screen toggle section control for TestResults extension page
/// </summary>
export class FullScreenToggle extends Controls.BaseControl {
    constructor(options?: any) {
        super(options);
    }

    public initialize() {
        super.initialize();
        this._load();
    }

    public initializeOptions(options?: any) {
        super.initializeOptions(options);
    }

    public fullScreenDelegate: (isFullScreenMode: boolean) => void;

    /// <summary>
    /// loads the section view/data
    /// </summary>
    private _load(): void {
        if (FullScreenToggle._menuBar) {
            this.getElement().append(FullScreenToggle._menuBar.getElement());
        } else {
            FullScreenToggle._menuBar = <Menus.MenuBar>Controls.BaseControl.createIn(Menus.MenuBar, this.getElement());
            Navigation.FullScreenHelper.initialize(FullScreenToggle._menuBar, {
                addHistoryPoint: false,
                setFullScreenCallback: delegate(this, this._handleFullScreenCallback)
            });
        }
    }

    private _handleFullScreenCallback() {
        if (this.fullScreenDelegate) {
            this.fullScreenDelegate(Navigation.FullScreenHelper.getFullScreen());
        }
    }

    private static _menuBar: Menus.MenuBar;
}

// TFS plug-in model requires this call for each TFS module.
VSS.tfsModuleLoaded("TestTabExtension/Controls", exports);
