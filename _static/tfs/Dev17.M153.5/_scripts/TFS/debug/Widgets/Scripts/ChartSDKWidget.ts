
import Q = require("q");

import Core_Contracts = require("TFS/Core/Contracts");
import Dashboards_WidgetContracts = require("TFS/Dashboards/WidgetContracts");
import TFS_Dashboards_Contracts = require("TFS/Dashboards/Contracts");
import TFS_Dashboards_Constants = require("Dashboards/Scripts/Generated/Constants");
import WidgetHelpers = require("TFS/Dashboards/WidgetHelpers");
import Work_Contracts = require("TFS/Work/Contracts");

import Controls = require("VSS/Controls");
import Locations = require("VSS/Locations");
import SDK = require("VSS/SDK/Shim");
import Utils_String = require("VSS/Utils/String");
import VSS_Diag = require("VSS/Diag");

import WidgetResources = require("Widgets/Scripts/Resources/TFS.Resources.Widgets");
import VSS_Control_BaseWidget = require("Widgets/Scripts/VSS.Control.BaseWidget");
import Dashboard_Shared_Contracts = require("Dashboards/Scripts/Contracts");

import ChartSDKSamples = require("Charting/Scripts/ChartSDKSamples");


/** Note: this feature is conditional from the Widget catalog, using: "WebAccess.Widgets.ChartSDKWidget" */
export class ChartSDKWidget
    extends VSS_Control_BaseWidget.BaseWidgetControl<Dashboard_Shared_Contracts.WidgetOptions>{
    public static initializeInstanceName = "dashboards.chartSDKWidget-init";

    public $_title: JQuery;
    public $_bodyContainer: JQuery;

    public preload(settings: Dashboards_WidgetContracts.WidgetSettings): IPromise<Dashboards_WidgetContracts.WidgetStatus> {
        return WidgetHelpers.WidgetStatusHelper.Success();
    }

    public load(settings: Dashboards_WidgetContracts.WidgetSettings): IPromise<Dashboards_WidgetContracts.WidgetStatus> {
        this.renderWidgetContainers(settings);
        var isFirstLoad= true;
        return this.paintLatestState(settings, isFirstLoad);
    }

    public reload(settings: Dashboards_WidgetContracts.WidgetSettings): IPromise<Dashboards_WidgetContracts.WidgetStatus> {
        //Lazy re-load of the chart. 
        //In practice, a widget author needs to:
        // Check if data settings changed, requiring server side request and then a general repaint
        //OR just do a repaint

        var isFirstLoad = false;
        return this.paintLatestState(settings, isFirstLoad);
    }

    /* Synchronous operation to render the current state. */
    public paintLatestState(settings: Dashboards_WidgetContracts.WidgetSettings, isFirstLoad: boolean): IPromise<Dashboards_WidgetContracts.WidgetStatus>{
        this.hideUnConfiguredControl();
        //Ensure the title uses current name
        if (this.$_title.text() != settings.name) {
            this.$_title.text(settings.name);
        }
        
        //The Widget size isn't guaranteed to be the same as it started. Ensure body sizing is current.
        this.allocateBodySpace(settings);

        //(re)Render TCM's combo chart using their contract, with the latest data state. At this point, there should be no-async work needed.
        this.$_bodyContainer.empty();
        try {
            var chartSettings = ChartSDKSamples.ChartSDKWidgetSettings.parseOrDefault(settings.customSettings.data);
            var $target = this.$_bodyContainer;
            if (chartSettings.mode == null || chartSettings.payload == null) {
                this.showUnConfiguredControl(settings.size, settings.name);
                return WidgetHelpers.WidgetStatusHelper.Unconfigured();
            } else {
                ChartSDKSamples.SDKWidgetContentProvider.renderOption($target, chartSettings, isFirstLoad);
            }
            return WidgetHelpers.WidgetStatusHelper.Success()
        } catch (e) {
            //An exception here implies Bad data state fouled up rendering...
            VSS_Diag.logError(e.stack);
            return WidgetHelpers.WidgetStatusHelper.Failure(e);
        }
    }


    /*Encapsulates the problem of layout for the chart's container */
    public renderWidgetContainers(settings: Dashboards_WidgetContracts.WidgetSettings) {
        var $widget = this.getElement()
            .addClass(TFS_Dashboards_Constants.WidgetDomClassNames.WidgetContainer)
            //Override normal widget styling rules
            .css("padding-top", "10")
            .css("padding-bottom", "0")
            .css("padding-left", "0")
            .css("padding-right", "0");


        this.$_title = $("<h2>")
            .addClass("title") 
            .css("line-height", "20px")
            .css("margin-left", "14px");

        //Note: Shouldn't the size converter or pixel size be available as part of the dashboards/widget contract for 3rd Party?
        //The sizeConverter is not currently public.
        this.$_bodyContainer= $("<div>")
            .addClass("widget-chart-body");
        this.allocateBodySpace(settings);

        $widget.append(this.$_title);
        $widget.append(this.$_bodyContainer);
    }

    public allocateBodySpace(settings: Dashboards_WidgetContracts.WidgetSettings) {
        //TODO: Dashboard Framework team needs to expose these constants for widget developers, and we need to express them for use by charts :)
        var titleHeight = 40; //10 top + 20 + 10 bot
        var bottomPaddingSpace = 10;
        var lrPaddingSpace = 14;

        this.$_bodyContainer
            .css("height", (WidgetHelpers.WidgetSizeConverter.RowsToPixelHeight(settings.size.rowSpan) - titleHeight) + "px")
            .css("width", (WidgetHelpers.WidgetSizeConverter.ColumnsToPixelWidth(settings.size.columnSpan)) + "px"); 
    }
}

SDK.registerContent(ChartSDKWidget.initializeInstanceName , (context) => {
    return Controls.create(ChartSDKWidget, context.$container, context.options);
});
