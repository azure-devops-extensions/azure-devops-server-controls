/*
* ---------------------------------------------------------
* Copyright(C) Microsoft Corporation. All rights reserved.
* ---------------------------------------------------------
*/

/// <reference types="knockout" />

import ko = require("knockout");

import UserSettings = require("TestManagement/Scripts/TestReporting/ExploratorySession/UserSettings");
import Resources = require("TestManagement/Scripts/Resources/TFS.Resources.TestManagement");
import ManualUtils = require("TestManagement/Scripts/TestReporting/ExploratorySession/Utils");
import TestResultsControl = require("TestManagement/Scripts/TestReporting/TestTabExtension/Controls");
import TCMTelemetry = require("TestManagement/Scripts/TFS.TestManagement.Telemetry");

import Controls = require("VSS/Controls");
import Diag = require("VSS/Diag");
import Splitter = require("VSS/Controls/Splitter");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import Navigation = require("VSS/Controls/Navigation");
import Menus = require("VSS/Controls/Menus");
import VSS = require("VSS/VSS");
let delegate = Utils_Core.delegate;
let TelemetryService = TCMTelemetry.TelemetryService;
let SettingsConstant = UserSettings.ExploratorySessionUserSettingsConstant;

/// <summary>
/// Tool bar section control for exploratory session view page.
/// </summary>
export class Toolbar extends Controls.BaseControl {
    public onExecuteCommand: (command: string) => void;

    public initializeOptions(options: any) {
        super.initializeOptions($.extend({
            coreCssClass: "toolbar exploratory-session-details-toolbar"
        }, options));

        this.onExecuteCommand = options.onExecuteCommand;
    }

    public initialize() {
        super.initialize();
        this._createView();
    }

    public dispose(): void {

        if (this._menuBar) {
            this._menuBar.dispose();
            this._menuBar = null;
        }
        if (this.onExecuteCommand) {
            this.onExecuteCommand = null;
        }
        $(".exploratory-session-details-toolbar").remove();
        super.dispose();
    }

    private _createView(): void {
        Diag.logVerbose("[Toolbar._createView]: Toolbar creation started");

        this._menuBar = <Menus.MenuBar>Controls.BaseControl.createIn(Menus.MenuBar, this.getElement(), {
            items: this._createMenubarItems(),
            executeAction: Utils_Core.delegate(this, this._onMenubarItemClick)
        });
    }

    private _createMenubarItems(): Menus.IMenuItemSpec[] {
        let items = [];
        items.push({ id: ManualUtils.ExploratorySessionToolbarCommands.ExpandAll, title: Resources.ExpandAllText, showText: false, icon: "bowtie-icon bowtie-toggle-expand-all" });
        items.push({ id: ManualUtils.ExploratorySessionToolbarCommands.CollapseAll, title: Resources.CollapseAllText, showText: false, icon: "bowtie-icon bowtie-toggle-collapse-all" });

        return items;
    }

    private _onMenubarItemClick(e?: any) {
        let commandName = e.get_commandName();
        if (this.onExecuteCommand) {
            this.onExecuteCommand(commandName);
        }
    }

    private _menuBar: Menus.MenuBar;
}

/// <summary>
/// The Group by control to update the result grid based on selection
/// </summary>
export class GroupBy extends TestResultsControl.ResultsDropDownControl implements TestResultsControl.IDropDownControl {
    public groupByOption: KnockoutObservable<string> = ko.observable(Utils_String.empty);
    private _groupbyFilterOptions: Navigation.IPivotFilterItem[];
    private _clickedOption: string = null;

    public initializeOptions(options?: any) {
        super.initializeOptions($.extend({
            coreCssClass: "filter exploratory-session-groupby-filter",
            text: Resources.PivotText,
            onPivotChangedDelegate: this.onPivotChanged
        }, options));

        this._clickedOption = ManualUtils.ExploratorySessionToolbarCommands.GroupByExploredWorkItems;
    }

    public dispose(): void {
        super.dispose();
    }

    /// <summary>
    /// Delegate method to be called on change of menu item
    /// </summary>
    public onPivotChanged(e?: any, args?: any) {
        let selectedFilter: Navigation.IPivotFilterItem = this._pivotFilter.getSelectedItem();
        if (selectedFilter) {
            this.groupByOption(selectedFilter.id);
            TelemetryService.publishEvents(TelemetryService.featureControlTabInXTSessionsGridView_GroupByClicked, {
                "Clicked": this._clickedOption,
                "DropDownSelected": selectedFilter.id
            });
            this._clickedOption = selectedFilter.id;

            let userSettings = UserSettings.ExploratorySessionUserSettings.getInstance().getUserSettings();
            userSettings.groupBySetting = selectedFilter.id;
            UserSettings.ExploratorySessionUserSettings.getInstance().updateUserSettings(SettingsConstant.GroupBySettingSettingString, selectedFilter.id);
        }
    }

    /// <summary>
    /// returns list of group by options
    /// </summary>
    public getDropDownOptions(): Navigation.IPivotFilterItem[] {
        this._groupbyFilterOptions = [
            { id: ManualUtils.ExploratorySessionToolbarCommands.GroupByExploredWorkItems, text: Resources.ExploratorySessionGroupByExploredWorkItem, selected: false },
            { id: ManualUtils.ExploratorySessionToolbarCommands.GroupByUnExploredWorkItems, text: Resources.ExploratorySessionGroupByUnExploredWorkItem, selected: false },
            { id: ManualUtils.ExploratorySessionToolbarCommands.GroupBySessions, text: Resources.ExploratorySessionGroupBySession, selected: false },
            { id: ManualUtils.ExploratorySessionToolbarCommands.GroupBySessionOwners, text: Resources.ExploratorySessionGroupBySessionOwner, selected: false },
            { id: ManualUtils.ExploratorySessionToolbarCommands.GroupByNone, text: Resources.NoneText, selected: false }
        ];

        this._groupbyFilterOptions.forEach((option: Navigation.IPivotFilterItem) => {
            if (option.id === UserSettings.ExploratorySessionUserSettings.getInstance().getUserSettings().groupBySetting) {
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
}

/// <summary>
/// The Filter by control to update the result grid based on selection
/// </summary>
export class FilterBy extends TestResultsControl.ResultsDropDownControl implements TestResultsControl.IDropDownControl {
    public filterByOption: KnockoutObservable<string> = ko.observable(Utils_String.empty);
    private _filterByOutcomeOptions: Navigation.IPivotFilterItem[];
    private _clickedOption: string = null;

    public initializeOptions(options?: any) {
        super.initializeOptions($.extend({
            coreCssClass: "filter exploratory-session-outcome-filter",
            text: Resources.FilterText,
            onPivotChangedDelegate: this.onPivotChanged,
            width: 110
        }, options));

        this._clickedOption = ManualUtils.ExploratorySessionToolbarCommands.FilterByAll;
    }

    public dispose(): void {
        super.dispose();
    }

    /// <summary>
    /// Delegate method to be called on change of menu item
    /// </summary>
    public onPivotChanged(e?: any, args?: any) {
        let selectedFilter: Navigation.IPivotFilterItem = this._pivotFilter.getSelectedItem();
        if (selectedFilter) {
            this.filterByOption(selectedFilter.id);
            TelemetryService.publishEvents(TelemetryService.featureControlTabInXTSessionsGridView_ShowClicked, {
                "Clicked": this._clickedOption,
                "DropDownSelected": selectedFilter.id
            });
            this._clickedOption = selectedFilter.id;

            let userSettings = UserSettings.ExploratorySessionUserSettings.getInstance().getUserSettings();
            userSettings.filterBySetting = selectedFilter.id;
            UserSettings.ExploratorySessionUserSettings.getInstance().updateUserSettings(SettingsConstant.FilterBySettingSettingString, selectedFilter.id);
        }
    }

    /// <summary>
    /// returns list of filter options
    /// </summary>
    public getDropDownOptions(): Navigation.IPivotFilterItem[] {
        this._filterByOutcomeOptions = [
            { id: ManualUtils.ExploratorySessionToolbarCommands.FilterByBug, text: Resources.ExploratorySessionFilterByOutcomeBug, selected: false },
            { id: ManualUtils.ExploratorySessionToolbarCommands.FilterByTask, text: Resources.ExploratorySessionFilterByOutcomeTask, selected: false },
            { id: ManualUtils.ExploratorySessionToolbarCommands.FilterByTestCase, text: Resources.ExploratorySessionFilterByOutcomeTestCase, selected: false },
            { id: ManualUtils.ExploratorySessionToolbarCommands.FilterByAll, text: Resources.ExploratorySessionFilterByOutcomeAll, selected: false }
        ];

        this._filterByOutcomeOptions.forEach((option: Navigation.IPivotFilterItem) => {
            if (option.id === UserSettings.ExploratorySessionUserSettings.getInstance().getUserSettings().filterBySetting) {
                option.selected = true;
                return false;
            }
        });

        // handling scenario when group by is unexploredWorkItem, expectation is not to show filters
        if (UserSettings.ExploratorySessionUserSettings.getInstance().getUserSettings().groupBySetting === ManualUtils.ExploratorySessionToolbarCommands.GroupByUnExploredWorkItems) {
            $(".filters-section.left").hide();
        } else {
            $(".filters-section.left").show();
        }

        return this._filterByOutcomeOptions;
    }
}

export interface IDetailsPaneOptions {
    splitter: Splitter.Splitter;
}

/// <summary>
/// Toggle button implementation for session grid details pane section
/// </summary>
export class DetailsPaneToggle extends Controls.Control<IDetailsPaneOptions> {

    public initialize(): void {
        super.initialize();
        this._load();
    }

    public initializeOptions(options?: IDetailsPaneOptions): void {
        super.initializeOptions($.extend({
            coreCssClass: "toolbar details-pain-toggle"
        }, options));
        this._splitter = options.splitter;
    }

    public dispose(): void {

        if (this._menu) {
            this._menu.dispose();
            this._menu = null;
        }
        super.dispose();
    }

    public applySettings(): void {
        this._splitState = UserSettings.ExploratorySessionUserSettings.getInstance().getUserSettings().detailPaneState;
        this._splitter.toggleSplit(this._splitState);

        this._setExpandedState();
    }

    /// <summary>
    /// loads the toggle setting from cache and applies the same
    /// Adds the toggle button to MenuBar
    /// </summary>
    private _load(): void {
        this._menu = <Menus.MenuBar>Controls.BaseControl.createIn(Menus.MenuBar, this.getElement(), {
            items: this._getMenuItems(),
            executeAction: delegate(this, this._handleActionCallback)
        });
    }

    private _getMenuItems(): Menus.IMenuItemSpec[] {
        return [
            {
                id: "details-pane-toggle-button",
                title: Resources.TestDetailPaneToggleButtonTooltip,
                showText: false,
                icon: "bowtie-icon bowtie-details-pane",
                cssClass: this._toggleDetailsPaneClass
            }];
    }

    /// <summary>
    /// Toggle button click handler
    /// </summary>
    private _handleActionCallback(): void {
        this._splitState = !this._splitState;
        this._splitter.toggleSplit(this._splitState);
        if (this._splitState) {
            TelemetryService.publishEvent(TelemetryService.featureControlTabInXTSessionsGridView_DetailsPane, "Action", "Close");
        } else {
            TelemetryService.publishEvent(TelemetryService.featureControlTabInXTSessionsGridView_DetailsPane, "Action", "Open");
        }

        let userSettings = UserSettings.ExploratorySessionUserSettings.getInstance().getUserSettings();
        userSettings.detailPaneState = (this._splitState) ? true : false;
        this._setExpandedState();
        UserSettings.ExploratorySessionUserSettings.getInstance().updateUserSettings(SettingsConstant.DetailPaneStateSettingString, userSettings.detailPaneState);
    }

    private _setExpandedState(){
         let splitState = this._splitState.toString();
         let menuItem = this._element.find("." + this._toggleDetailsPaneClass);

         if (menuItem){
             menuItem.attr("aria-expanded", splitState);
         }
    }

    private _toggleDetailsPaneClass = "toggle-details-pane";
    private _menu: Menus.MenuBar;
    private _splitState: boolean = true;
    private _splitter: Splitter.Splitter;
}

/// <summary>
/// Full screen toggle section control for sessions grid
/// </summary>
export class FullScreenToggle extends Controls.BaseControl {
    public fullScreenDelegate: (isFullScreenMode: boolean) => void;


    public initialize() {
        super.initialize();
        this._load();
    }

    public initializeOptions(options?: any) {
        super.initializeOptions($.extend({
            coreCssClass: "toolbar"
        }, options));
        this.fullScreenDelegate = options.fullScreenDelegate;
    }

    public dispose(): void {

        if (this.fullScreenDelegate) {
            this.fullScreenDelegate = null;
        }
        super.dispose();
    }

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
VSS.tfsModuleLoaded("ExploratorySession/Control", exports);
