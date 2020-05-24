import Q = require("q");

import { getDefaultWebContext } from "VSS/Context";
import * as StringUtils from "VSS/Utils/String";

import { TeamContext } from "TFS/Core/Contracts";
import { Widget, DashboardGroup } from "TFS/Dashboards/Contracts";
import { DashboardHttpClient } from "TFS/Dashboards/RestClient";
import { usingWithPromise } from "Presentation/Scripts/TFS/TFS.Using";

import { DashboardHttpClientFactory } from "Dashboards/Scripts/Common";
import * as TFS_Dashboards_Common_LazyLoad from "Dashboards/Scripts/Common";
import { WidgetDataForPinning } from "Dashboards/Scripts/Pinning.WidgetDataForPinning";
import * as PushToDashboardConstants from "Dashboards/Scripts/Pinning.PushToDashboardConstants";
import { DashboardsTelemetry } from "Dashboards/Scripts/Telemetry";

import * as Resources from "Presentation/Scripts/TFS/Resources/TFS.Resources.Presentation";

/**
* Interface for the callBack function and its arguments, to be used after add widget completion
*/
export interface callBackOptionsForPin {
    callback?: (args: any) => void;
    arguments?: any;
}

/**
   Interface for the commandArgs used to call pinning 
*/
export interface commandArgs {
    /* { string } projectId - Guid of the current project */
    projectId: string;

    /* {string} groupId - Guid of the group to which the dashboard belongs */
    groupId: string;

    /* { string } dashboardId - Guid of the dashboard to which widget is being added */
    dashboardId: string;

    /* { string } dashboardName - Display name of the dashboard to which widget is being added */
    dashboardName?: string;

    /* { WidgetDataForPinning } widgetData - an object encapsulating all the data needed to create the widget */
    widgetData: WidgetDataForPinning;
}

/**
   Interface for the commandArgs used to call PushToDashboard.pinToDashboard
*/
export interface commandArgsForPinning extends commandArgs {
}

export interface PinArgs {
    isPinned: boolean;
    commandArgs: any;
    response: PushToDashboardResponse;
}

/**
 * Interface for sending response to the caller depending on the outcome of the pin to dashboard call.
 */
export interface PushToDashboardResponse {
    outcome: PushToDashboardOutcome;
    dashboardId: string;

}

export enum PushToDashboardOutcome {
    Success,
    Failure
}

// The PushToDashboardInternal class is for internal use in PushToDashboard class
// It is made public for the sole purpose of unit testing
export class PushToDashboardInternal {

    /**
    * Copies a widget from one dashboard to another as per the information in the commandArgs object
    * The commandArgs Object should implement the interface commandArgsForPinning
    * @param {DashboardHttpClient} dashboardHttpClient - http client used to make REST calls
    * @param {commandArgs} commandArgsForPinning - contains information required for pinning widget to dashboard.
    * @param {string} sourceDashboard - Source dashboard for the 'Copy to dashboard' feature.
    * @returns IPromise<PushToDashboardResponse> - Promise returning a response code, message and the dashboardId that the widget was added to.
    */
    public static copyToDashboard(
        dashboardHttpClient: DashboardHttpClient,
        commandArgs: commandArgsForPinning,
        sourceDashboard: string
    ): IPromise<PushToDashboardResponse> {
        var defer = Q.defer<PushToDashboardResponse>();

        if (!commandArgs.projectId || !commandArgs.groupId || !commandArgs.dashboardId || !commandArgs.widgetData) {
            defer.reject({
                dashboardId: commandArgs.dashboardId || undefined,
                outcome: PushToDashboardOutcome.Failure
            });

            return defer.promise;
        }

        return this.pinWidgetOnDashboard(dashboardHttpClient, commandArgs).then((data) => {
            DashboardsTelemetry.newAddToDashboardSucceeded(commandArgs.widgetData.contributionId, commandArgs.dashboardId, PushToDashboardConstants.Dashboards_Source_Area, sourceDashboard);

            defer.resolve({
                dashboardId: commandArgs.dashboardId,
                outcome: PushToDashboardOutcome.Success
            });

            return defer.promise;
        }, (error) => {
            DashboardsTelemetry.newAddToDashboardFailed(commandArgs.widgetData.contributionId, commandArgs.dashboardId, error, PushToDashboardConstants.Dashboards_Source_Area, sourceDashboard);

            defer.resolve({
                dashboardId: commandArgs.dashboardId,
                outcome: PushToDashboardOutcome.Failure
            });

            return defer.promise;
        });
    }

   /**
    * Adds a widget to a dashboard as per the information in the commandArgs object
    * The commandArgs Object should implement the interface commandArgsForPinning
    * @param {DashboardHttpClient} dashboardHttpClient - http client used to make REST calls
    * @param {commandArgs} commandArgsForPinning - contains information required for pinning widget to dashboard.
    * @param {string} sourceArea - Area from which artifact pinning is requested. Optional.
    * @returns IPromise<PushToDashboardResponse> - Promise returning a response code, message and the dashboardId that the widget was added to.
    */
    public static addToDashboard(
        dashboardHttpClient: DashboardHttpClient,
        commandArgs: commandArgsForPinning,
        sourceArea?: string
    ): IPromise<PushToDashboardResponse> {
        var defer = Q.defer<PushToDashboardResponse>();

        if (!commandArgs.projectId || !commandArgs.groupId || !commandArgs.dashboardId || !commandArgs.widgetData) {
            return this.getPinningResponse(defer, commandArgs.dashboardId || undefined, PushToDashboardOutcome.Failure);
        }

        sourceArea = sourceArea || this.getSourceArea(commandArgs.widgetData.contributionId);

        return this.pinWidgetOnDashboard(dashboardHttpClient, commandArgs).then((data) => {
            DashboardsTelemetry.newAddToDashboardSucceeded(commandArgs.widgetData.contributionId, commandArgs.dashboardId, sourceArea);

            return this.getPinningResponse(defer, commandArgs.dashboardId, PushToDashboardOutcome.Success);
        }, (error) => {
            DashboardsTelemetry.newAddToDashboardFailed(commandArgs.widgetData.contributionId, commandArgs.dashboardId, error, sourceArea);
            return this.getPinningResponse(defer, commandArgs.dashboardId, PushToDashboardOutcome.Failure);
        });
    }

    /**
    * Creates a widget on the target dashboard as per the information in the commandArgs object
    * The commandArgs Object should implement the interface commandArgsForPinning
    * Public for unit testing.
    * @param {DashboardHttpClient} dashboardHttpClient - http client used to make REST calls
    * @param {commandArgs} commandArgsForPinning - contains information required for pinning widget to dashboard.
    * @returns IPromise<Widget> - Promise returning the created widget.
    */
    public static pinWidgetOnDashboard(dashboardHttpClient: DashboardHttpClient, commandArgs: commandArgsForPinning): IPromise<Widget> {
        if (!dashboardHttpClient) {
            dashboardHttpClient = DashboardHttpClientFactory.getClient();
        }

        let widget: Widget = this.createWidgetFromData(commandArgs.widgetData);
        let teamContext: TeamContext = this.getTeamContext(commandArgs);

        return dashboardHttpClient.createWidget(widget, teamContext, commandArgs.dashboardId);
    }

    /**
    * Resolves and returns the promise on a deferred object of type PushToDashboardResponse
    * @param {deferred} Q.Deferred<PushToDashboardResponse> - deferred object.
    * @param {dashboardId} string - id of the dashboard to pin to.
    * @param {outcome} PushToDashboardOutcome - outcome of the pinning operation.
    * @returns IPromise<PushToDashboardResponse> - Promise returning the response.
    */
    private static getPinningResponse(deferred: Q.Deferred<PushToDashboardResponse>, dashboardId: string, outcome: PushToDashboardOutcome): IPromise<PushToDashboardResponse> {
        deferred.resolve({
            dashboardId: dashboardId,
            outcome: outcome
        });

        return deferred.promise;
    }

    /**
     * Retrieves the dashboards available in this context.
     * // TODO: Remove after VersionControl is updated to use the new add to dashboard experience.
     * @return The available dashboards in a DashboardGroup structure.
     */
    public static getDashboards(): IPromise<DashboardGroup> {
        return usingWithPromise<typeof TFS_Dashboards_Common_LazyLoad>("Dashboards/Scripts/Common")
            .then(dashboardsCommon => {
                const httpClient = dashboardsCommon.DashboardHttpClientFactory.getClient();
                return httpClient.getDashboards(dashboardsCommon.getTeamContext());
            });
    }

    /** Creates a widget for pinning to a dashboard using the data provided
     * @param: data - WidgetDataForPinning
     * @returns: Widget
     */
    public static createWidgetFromData(data: WidgetDataForPinning): Widget {
        return {
            size: data.size,
            id: null,
            position: {
                column: 0,
                row: 0
            },
            name: data.name,
            contributionId: data.contributionId,
            settings: data.settings,
            artifactId: "",
            settingsVersion: data.settingsVersion
        } as Widget;
    }

    /** Returns team context based on pinning data.
     * @param: commandArgs: commandArgsForPinning
     * @returns: TeamContext
     */
    public static getTeamContext(commandArgs: commandArgsForPinning): TeamContext {
        let context = getDefaultWebContext();

        return {
            projectId: context.project.id,
            project: context.project.name,
            teamId: commandArgs.groupId || undefined, // team information is undefined for project dashboards.
            team: commandArgs.groupId || undefined
        } as TeamContext;
    }

    /** Returns source area for widget based on widget type.
     * @param: widgetType: string
     * @returns: sourceArea: string
     */
    public static getSourceArea(widgetType: string): string {
        switch (widgetType) {

            // Charting
            case PushToDashboardConstants.WITChart_WidgetTypeID: return PushToDashboardConstants.WITChart_Source_Area;
            case PushToDashboardConstants.TCMChart_WidgetTypeID: return PushToDashboardConstants.TCMChart_Source_Area;

            // WIT Query
            case PushToDashboardConstants.QueryScalar_WidgetTypeID: return PushToDashboardConstants.QueryTree_Source_Area;

            // Version Control
            case PushToDashboardConstants.Markdown_WidgetTypeID: return PushToDashboardConstants.CodeMD_Source_Area;
            case PushToDashboardConstants.CodeScalar_WidgetTypeID: return PushToDashboardConstants.CodeExplorer_Source_Area;

            // Build
            case PushToDashboardConstants.BuildChart_WidgetTypeID: return PushToDashboardConstants.Build_Source_Area;

            // Test Management
            case PushToDashboardConstants.TestResults_Trend_WidgetTypeId:
            case PushToDashboardConstants.TestResults_DurationTrend_WidgetTypeId:
            case PushToDashboardConstants.TestResults_FailureTrend_WidgetTypeId: return PushToDashboardConstants.Test_Source_Area;

            default: return undefined;
        }
    }
}
