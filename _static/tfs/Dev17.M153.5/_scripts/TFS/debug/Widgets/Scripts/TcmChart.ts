



import Q = require("q");

import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");

import Dashboards_WidgetContracts = require("TFS/Dashboards/WidgetContracts");
import Charting = require("Charting/Scripts/TFS.Charting");

import Controls = require("VSS/Controls");
import SDK = require("VSS/SDK/Shim");
import Telemetry = require("VSS/Telemetry/Services");
import Utils_String = require("VSS/Utils/String");
import Dashboard_Shared_Contracts = require("Dashboards/Scripts/Contracts");
import Charting_Data_Contracts = require("Charting/Scripts/DataService/Contracts");

import TFS_Dashboards_Widgets_BaseChart = require("Widgets/Scripts/BaseChart");
import WidgetHelpers = require("TFS/Dashboards/WidgetHelpers");
import Resources = require("Widgets/Scripts/Resources/TFS.Resources.Widgets");
import { WidgetLinkHelper } from "Widgets/Scripts/WidgetLinkHelper";

export class TcmChartControl
    extends TFS_Dashboards_Widgets_BaseChart.BaseChartWidget
    implements Dashboard_Shared_Contracts.IWidgetSettings{

    /*
    * Constructor that pass a base chart option. This allow to have a callback that return an URL for the click on the widget
    */
    constructor(options: Dashboard_Shared_Contracts.WidgetOptions) {
        super(options);
    }

    protected hasClickPermission() : boolean {
        return WidgetLinkHelper.canUserAccessTCMQueriesPage();
    }

    /**
     * Extends options for control with style enhancements, called by base control during initialization
     * @param {any} options for the control.
     */
    public initializeOptions(options?: any) {
        super.initializeOptions($.extend({
            coreCssClass: "lw-chart-widget tcmchart-container"
        }, options));
    }

    /*
     * Get the URL to Test. This is used to generate the url for the graph click event.
     * @param {ChartConfiguration} chartConfiguration - Information about the configuration of the chart
     * @return {string} The full url without the page and query string. Does not end with a slash
     */
    public getLinkUrl(chartConfiguration: Charting_Data_Contracts.ChartConfiguration): string {
        try {
            var teamUrl = TFS_Host_TfsContext.TfsContext.getDefault().getActionUrl();

            // http://123123123.me.tfsallin.net:81/DefaultCollection/qwas/_TestManagement/resultsById/1-2
            var filter = chartConfiguration.transformOptions.filter; //For example : "planId=1\u0026suiteId=2\u0026chartDataSource=execution"
            var suiteId = chartConfiguration.groupKey;
            var planId = filter.split('\u0026')[0].split('=')[1]; //Get the planId. This is not a best practice but this is how TCM does on server side TestReportsHelper.cs
            return Utils_String.format(
                "{0}/_TestManagement?planId={1}&suiteId={2}",
                teamUrl,
                planId,
                suiteId);
        } catch (e) {
            Telemetry.publishEvent(Telemetry.TelemetryEventData.fromProperty("Dashboards", "TcmChart", "getLinkUrl", "Empty URL"));
            return "";
        } 
    }

    /** feature name provider override. 
    This allows the base chart to properly route a chart transform request to TCM charting implementation on server */
    public getFeatureName(): string {
        return Charting.ChartProviders.testReports;
    }

    /**
      * @implements Dashboard_Shared_Contracts.IWidgetSettings
      */
    public getCustomTimeout(): IPromise<number> {
        // 2.5mins as maximal wait before giving up on server responding, expressed in ms - this covers for peak allowed timeouts.
        return Q.resolve(150000);
    }

    /**
    * Build an error message that has a link to the Test hub to fix the erreous query.
    * @param {ChartConfiguration} chartConfiguration - Information about the configuration of the chart in problem
    * @returns {string} Error message with a link to the query editor. This is Html 
    */
    public static buildErrorMessageFromChartConfig(chartConfiguration: Charting_Data_Contracts.ChartConfiguration): string {
        var root = TFS_Host_TfsContext.TfsContext.getDefault().getActionUrl();
        var filter = chartConfiguration.transformOptions.filter; //For example : "planId=1\u0026suiteId=2\u0026chartDataSource=execution"
        var suiteId = chartConfiguration.groupKey;
        var planId = filter.split('\u0026')[0].split('=')[1]; //Get the planId. This is not a best practice but this is how TCM does on server side TestReportsHelper.cs
        var fullUrl = Utils_String.format(
            "{0}/_TestManagement?&planId={1}&suiteId={2}",
            root,
            planId,
            suiteId,
            "_a=tests");
        var errorMessage = Utils_String.format(Resources.ErrorQuery, fullUrl);
        return errorMessage;
    }

    /**
     * Add a link to the test hub from the error received from a request. This method override the BaseChart default one.
     * @param {string} error - Error in a string format from the source. This is Exception Message.
     * @param {ChartConfiguration} chartconfig - Information about the configuration of the chart in problem
     * @returns {WidgetStatus} - Wrapped error in a promise
     */
    public buildErrorMessageFromRequest(error: string, chartconfig: Charting_Data_Contracts.ChartConfiguration): IPromise<Dashboards_WidgetContracts.WidgetStatus> {
        var errorMessage = TcmChartControl.buildErrorMessageFromChartConfig(chartconfig);
        return WidgetHelpers.WidgetStatusHelper.Failure(errorMessage + " " + error, true, true);
    }
}

SDK.VSS.register("dashboards.tcmChart", () => TcmChartControl);
SDK.registerContent("dashboards.tcmChart-init", (context) => {
    return Controls.create(TcmChartControl, context.$container, context.options);
});
