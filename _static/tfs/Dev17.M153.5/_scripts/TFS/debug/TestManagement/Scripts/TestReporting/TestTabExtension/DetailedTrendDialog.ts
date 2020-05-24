/// <reference types="knockout" />

import TFS_Dashboards_PushToDashboard = require("Dashboards/Scripts/Pinning.PushToDashboard");
import TFS_Dashboards_WidgetDataForPinning = require("Dashboards/Scripts/Pinning.WidgetDataForPinning");
import TFS_Dashboards_PushToDashboardConstants = require("Dashboards/Scripts/Pinning.PushToDashboardConstants");

import TFS_Presentation_Resources = require("Presentation/Scripts/TFS/Resources/TFS.Resources.Presentation");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");

import Resources = require("TestManagement/Scripts/Resources/TFS.Resources.TestManagement");
import Detailed_Charts = require("TestManagement/Scripts/TestReporting/Charts/ChartBase");
import { ColumnLine } from "TestManagement/Scripts/TestReporting/Charts/ChartFactory";

import Contracts = require("TFS/TestManagement/Contracts");

import Controls = require("VSS/Controls");
import Dialogs = require("VSS/Controls/Dialogs");
import Menus = require("VSS/Controls/Menus");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import VSS = require("VSS/VSS");

let TfsContext = TFS_Host_TfsContext.TfsContext;

export interface DetailedChartsDialogOptions extends Dialogs.IDialogOptions {

    chartConfig: Detailed_Charts.ChartConfigurationOptions;

    view: string;

    chartData: Contracts.AggregatedDataForResultTrend[];
}

export class DetailedChartsDialog extends Dialogs.DialogO<DetailedChartsDialogOptions>{

    public initializeOptions(options: DetailedChartsDialogOptions) {
        options = $.extend({
            coreCssClass: "detailed-trend-chart",
            dynamicSize: false,
            modal: true,
            resizable: false,
            hideCloseButton: true,
            useLegacyStyle: true
        }, options);
        super.initializeOptions(options);
    }

    public initialize() {
        super.initialize();
        this._addCustomMenu();

        new ColumnLine().create(this.getElement(), this._options.chartConfig, this._options.chartData);
    }

    private _addCustomMenu(): void {
        let $titleBar: JQuery;
        $titleBar = this.getElement().closest(".ui-dialog").children(".ui-dialog-titlebar");
        this._menu = <DetailedChartMenu>Controls.Control.createIn<IDetailedChartMenuOptions>(DetailedChartMenu, $titleBar, {
            getWidgetData: Utils_Core.delegate(this, this._getWidgetData),
            onClose: Utils_Core.delegate(this, this.close)
        });
        this.getElement().on("click", (e) => {
            if (this._menu.isMenuBarActive()) {
                this._menu.hideMenu();
            }
        });
    }

    private _getWidgetData(): TFS_Dashboards_WidgetDataForPinning.WidgetDataForPinning {
        let widgetName: string,
            widgetTypeId: string,
            widgetSettings: string;

        widgetName = this._options.chartConfig.title;

        widgetTypeId = TFS_Dashboards_PushToDashboardConstants.TestResults_Trend_WidgetTypeId;

        widgetSettings = JSON.stringify(this._options.chartConfig);

        return new TFS_Dashboards_WidgetDataForPinning.WidgetDataForPinning(widgetName, widgetTypeId, widgetSettings);
    }
    private _menu: DetailedChartMenu;
}

export interface IDetailedChartMenuOptions {
    getWidgetData: Function;
    onClose: Function;
}

export class DetailedChartMenu extends Controls.Control<IDetailedChartMenuOptions> {

    public initialize(): void {
        super.initialize();
        this.getElement().addClass("menu-bar test-results-detailed-chart-ellipsis-menubar");
        this._createView();
    }

    public hideMenu(): void {
        if (this._menuBar) {
            let menuItem = this._menuBar.getItem(DetailedChartMenu.command_addToDashboard);
            menuItem.collapse({ immediate: true });
        }
    }

    public isMenuBarActive(): boolean {
        return (this._menuBar) ? this._menuBar.isActive() : false;
    }

    private _createView(): void {
        this._menuBar = <Menus.MenuBar>Controls.BaseControl.createIn(Menus.MenuBar, this.getElement(), {
            items: this._getMenuItems(),
            executeAction: Utils_Core.delegate(this, this._onMenubarItemClick)
        });

        this.getElement().on("click", (e) => {
            e.stopPropagation();
        });
    }

    private _getMenuItems(): Menus.IMenuItemSpec[] {
        let items: Menus.IMenuItemSpec[] = [];
        let widgetData: TFS_Dashboards_WidgetDataForPinning.WidgetDataForPinning = this._options.getWidgetData();

        items.push($.extend({
            id: DetailedChartMenu.command_addToDashboard,
            text: TFS_Presentation_Resources.PushToDashboardTitle,
            icon: "bowtie-icon bowtie-ellipsis",
            showText: false,
            childItems: [TFS_Dashboards_PushToDashboard.PushToDashboard.createMenu(TfsContext.getDefault().contextData, widgetData, (args) => { })],
        }, { hideDrop: true }));

        items.push({ id: DetailedChartMenu.command_close, title: Resources.CloseText, icon: "icon-close", showText: false });

        return items;
    }

    private _onMenubarItemClick(e?: any): void {
        let command = e.get_commandName(),
            commandArgs = e.get_commandArgument();

        switch (command) {
            case DetailedChartMenu.command_close:
                if ($.isFunction(this._options.onClose)) {
                    this._options.onClose();
                }
                break;
            case TFS_Dashboards_PushToDashboardConstants.PinToDashboardCommand:
                /**
                 *  With the new add to dashboard experience (M137), 
                 * the pinToDashboard API doesn't have to be explicitly called here. 
                 * However, we still handle this case specifically to avoid the 
                 * default (error) case below.
                **/
                break;
            default:
                throw new Error(Utils_String.format("Unsupported command: {0}", command));
        }
    }

    private static command_addToDashboard = "add-chart-to-dashboard";
    private static command_close = "detailed-chart-close";
    private _menuBar: Menus.MenuBar;
}

// TFS plug-in model requires this call for each TFS module.
VSS.tfsModuleLoaded("TestTabExtension/DetailedTrendDialog", exports);
