


import Q = require("q");

import Charting = require("Charting/Scripts/TFS.Charting");
import Charting_Data_Contracts = require("Charting/Scripts/DataService/Contracts");

import Dashboard_Shared_Contracts = require("Dashboards/Scripts/Contracts");

import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");

import Dashboards_WidgetContracts = require("TFS/Dashboards/WidgetContracts");
import WidgetHelpers = require("TFS/Dashboards/WidgetHelpers");

import Controls = require("VSS/Controls");
import SDK = require("VSS/SDK/Shim");
import Utils_String = require("VSS/Utils/String");
import * as Service from "VSS/Service";

import Resources = require("Widgets/Scripts/Resources/TFS.Resources.Widgets");
import TFS_Dashboards_Widgets_BaseChart = require("Widgets/Scripts/BaseChart");
import { WidgetLinkHelper } from "Widgets/Scripts/WidgetLinkHelper";
import { HubsService } from "VSS/Navigation/HubsService";
import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import { FeatureAvailabilityFlags } from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";
import { getWorkItemsHubId } from "WorkItemTracking/Scripts/Utils/WorkItemsHubIdHelper";

/** WIT Chart Control only cares about extending just one detail over baseChart- forming link URL to the corresponding WIT Queries page of the Chart. */
export class WitChartControl
    extends TFS_Dashboards_Widgets_BaseChart.BaseChartWidget implements Dashboard_Shared_Contracts.IWidgetSettings {

    constructor(options: Dashboard_Shared_Contracts.WidgetOptions) {
        super(options);
    }

    // Allows Wit Chart to perform Fast Page switch on click.
    protected handleNavigation(url: string) {
        if (FeatureAvailabilityService.isFeatureEnabled(FeatureAvailabilityFlags.WebAccessAllowFpsWidgets, false)) {
            Service.getLocalService(HubsService).navigateToHub(getWorkItemsHubId(), url);
        }
        else {
            super.handleNavigation(url);
        }
    }

    /**
     * Extends options for control with style enhancements, called by base control during initialization
     * @param {any} options for the control.
     */
    public initializeOptions(options?: any) {
        super.initializeOptions($.extend({ 
            coreCssClass: "lw-chart-widget witchart-container"
        }, options));
    } 

    /*
    * Get the URL to the Query Builder. This is used to generate the url for the graph click event.
    */
    public getLinkUrl(chartConfiguration: Charting_Data_Contracts.ChartConfiguration): string {
        var teamUrl = TFS_Host_TfsContext.TfsContext.getDefault().getActionUrl();
            return Utils_String.format(
                "{0}/_queries/resultsById/{1}",
                teamUrl,
                chartConfiguration.groupKey);
    }

    /** feature name provider override. 
  This allows the base chart to properly route a chart transform request to WIT charting implementation on server */
    public getFeatureName(): string {
        return Charting.ChartProviders.witQueries;
    }

    /**
     * @implements Dashboard_Shared_Contracts.IWidgetSettings
     */
    public getCustomTimeout(): IPromise<number> {
        // 2.5mins as maximal wait before giving up on server responding, expressed in ms - this covers for peak allowed timeouts.
        return Q.resolve(150000); 
    }

    /**
     * Build an error message that has a link to the Query Editor to fix the erreous query.
     * @param {string} queryId in a Guid format
     * @returns {string} Error message with a link to the query editor. This is Html 
     */
    public static buildErrorMessageFromQuery(queryId: string): string {
        var root = TFS_Host_TfsContext.TfsContext.getDefault().getActionUrl();
        var fullUrl = Utils_String.format(
            "{0}/_workItems?path={1}&{2}",
            root,
            queryId,
            "_a=query");
        var errorMessage = Utils_String.format(Resources.ErrorQuery, fullUrl);
        return errorMessage;
    }

    /**
     * Add a link to the query editor from the error received from a request. This method override the BaseChart default one.
     * @param {string} error - Error in a string format from the source. This is Exception Message.
     * @param {ChartConfiguration} chartconfig - Information about the configuration of the chart in problem
     * @returns {WidgetStatus} - Wrapped error in a promise
     */
    public buildErrorMessageFromRequest(error: string, chartconfig: Charting_Data_Contracts.ChartConfiguration): IPromise<Dashboards_WidgetContracts.WidgetStatus> {
        var errorMessage = WitChartControl.buildErrorMessageFromQuery(chartconfig.groupKey);
        return WidgetHelpers.WidgetStatusHelper.Failure(errorMessage + " " + error, true, true);
    }

    protected hasClickPermission() : boolean {
        return WidgetLinkHelper.canUserAccessWITQueriesPage ();
    }

}

SDK.VSS.register("dashboards.witChart", () => WitChartControl);
SDK.registerContent("dashboards.witChart-init", (context) => {
    return Controls.create(WitChartControl, context.$container, context.options);
});
