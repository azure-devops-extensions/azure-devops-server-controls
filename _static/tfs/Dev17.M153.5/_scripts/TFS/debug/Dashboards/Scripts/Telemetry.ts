
import TFS_Dashboards_Contracts = require("TFS/Dashboards/Contracts");


import Context = require("VSS/Context");
import Telemetry = require("VSS/Telemetry/Services");
import Utils_String = require("VSS/Utils/String");
import VSS = require("VSS/VSS");

import { ProjectVisibility } from "TFS/Core/Contracts";
import * as UserClaimsService from "VSS/User/Services";
import * as UserPermissionsHelper from "Dashboards/Scripts/Common.UserPermissionsHelper";
import { getProject } from "TfsCommon/Scripts/Navigation/PageService";
import { TeamProjectReference } from "TFS/Core/Contracts";

export class DashboardSplits {
    public static DashboardDataLoaded: string = "DashboardDataLoaded";
    public static GridInitializationStarted: string = "GridInitializationStarted";
    public static WidgetInitializationStarted: string = "WidgetInitializationStarted";
    public static WidgetInitializationEnded: string = "WidgetInitializationEnded";
    public static GridInitializationEnded: string = "GridInitializationEnded";
    public static FirstWidgetLoaded = "FirstWidgetLoaded";
    public static Widget25pctLoaded = "Widgets25pctLoaded";
    public static Widget50pctLoaded = "Widgets50pctLoaded";
    public static Widget75pctLoaded = "Widgets75pctLoaded";
}

export class WidgetSplits {
    public static WidgetInitialized: string = "WidgetInitialized";
    public static WidgetRendered: string = "WidgetRendered";
}

export class DashboardScenarios {
    /**
    * Scenario name for time from page navigation/reload to when all widgets in viewport are loaded (or our time limit is reached)
    */
    public static AllWidgetsLoaded: string = "Dashboards.Page.AllWidgetsLoaded";

    /**
    * Scenario name for time from page navigation/reload to when 75% of 1st party widgets in viewport are loaded (or our time limit is reached)
    */
   public static PageTTILoad: string = "Dashboards.Page.Load";

    /**
    * Original comment: "Scenario name for time from changing dashboard ID to when all widgets are loaded (or our time limit is reached)"
    *
    * June 2018 Update:
    * This is fired on the new dashboards experience when you update something in the Manage Dashboard Dialog and the dashboard reloads.
    * Empirically, on the old experience it doesn't seem to fire at all, even though the code would suggest that it would fire in a few situations.
    * It seems the intent was that when you switch dashboards this fires, but currently it's a hard page load in both experiences anyway.
    */
    public static PageSwitch: string = "Dashboards.Page.Switch";

    /**
    * Scenario name for when the dashboard is reloaded due to a refresh event - both auto refresh OR manual refresh button press.
    * It uses the same calculations / split timings as PageLoad event.
    */
    public static PageAutoRefresh = "Dashboards.Page.AutoRefresh";

    /**
    * Scenario name for when the add is clicked and the catalog opens and renders the list of widgets in the marketplace.
    */
    public static CatalogOpen = "Dashboards.Catalog.Open";

    /**
    * Scenario name for when the clicks a widget and it gets added to the dashboard.
    */
    public static CatalogAdd = "Dashboards.Catalog.Add";

    /**
    * Scenario name for when the admin clicks the config on a widget and it open the widget in preview mode.
    */
    public static ConfigOpen = "Dashboards.Config.Open";

    /**
    * Scenario name for when the admin clicks the config save button for on a widget.
    */
    public static SaveWidgetConfiguration = "Dashboards.Config.Save";

    /**
    * Scenario name for an individual widget start to a successful load.
    */
    public static WidgetLoad = "Widget.Load";
}


export class DashboardsTelemetryConstants {
    /**
    * Area for our CI events.
    */
    public static Area: string = "Dashboards";

    /**
    * Max time to wait before sending telemetry to CI (in milliseconds)
    */
    public static WidgetLoadTelemetryMaxTime = 60000;

    /*scenario split for when the widget is completely initialized. From that point, the widget execute its logic, server call, rendering, etc.*/
    public static WidgetLoadStartedSplitName: string = "Widget.LoadStarted";

    /* Dashboard in view mode when telemetry event fire */
    public static DashboardViewModeMenu = "viewModeMenuLink";

    /* Dashboard in edit mode when telemetry event fire */
    public static DashboardEditModeMenu = "editModeMenuLink";

    /* Dashboard Directory Performance Scenario */
    public static DirectoryScenario = "Dashboards.Directory";

}

export class DashboardFeatureNames {
    public static CreateDashboard: string = "CreateDashboard";
    public static ReplaceDashboards: string = "ReplaceDashboards";
    public static SaveDashboards: string = "SaveDashboards";
}

export function HasPerformanceTiming(): boolean {
    if (window.performance && window.performance.timing) {
        return true;
    }

    return false;
}

/*
 * Provides common telemetry services for all first party dashboards code.
 * It is only intended for use by the DashboardsTelemetry & WidgetTelemetry classes.
 */
export class DashboardsTelemetryCore {

    /*
    * Publish telemetry under Dashboards
    * feature name represents the name the event will be queryable under
    * properties defines supplemental properties in the payload
    * startTime is the Date.now() value from the start of the operation. The current time is paired with it by the infrastructure to provide the total duration. (optional)
    * immediate to push the event, default is false. Set this to be true if user navigate away from the page so the event would not lose.
    */
    public static publish(featureName: string, properties?: IDictionaryStringTo<any>, startTime?: number, immediate?: boolean): void {

        if (!properties) {
            properties = {};
        }

        // Collection of Dashboards-wide standard properties
        properties['SessionId'] = Context.getPageContext().diagnostics.sessionId;   // This allows us to relate dashboards requests under a common client session
        if (Context.getPageContext().webContext.team) {
            properties['TeamId'] = Context.getPageContext().webContext.team.id;         // This allows us to relate dashboards requests associated to a given team
        }

        properties['isAdmin'] = UserPermissionsHelper.CanManagePermissionsForDashboards();

        Telemetry.publishEvent(new Telemetry.TelemetryEventData(DashboardsTelemetryConstants.Area, featureName, properties, startTime), immediate);
    }

    /* Extract out unique VS#/TF# error ID string if it's present, to aid in bucketization. Returns null, if no such error is on hand. */
    public static extractErrorId(errorMessage: string) {
        var errorId = null;
        var errorIdMatches = errorMessage.match("VS[0-9]+");
        if (errorIdMatches != null && errorIdMatches.length >= 1) {
            errorId = errorIdMatches[0];
        } else {
            errorIdMatches = errorMessage.match("TF[0-9]+");
            if (errorIdMatches != null && errorIdMatches.length >= 1) {
                errorId = errorIdMatches[0];
            }
        }
        return errorId;
    }
}

/*
 * Central handler for managing Dashboards Telemetry from Client code.
 * This is important for establishing consistent reporting patterns of telemetry, for ease of querying.
  */
export class DashboardsTelemetry {
    // WidgetHost Operations
    /*
     * Produces Telemetry when Widget has failed to load.
     */
    public static onWidgetLoadFailed(result: any, contributionId: string, customProps?: any): void {
        var measuredFeatureName = "WidgetLoadFailed";
        var interpretedResult = VSS.getErrorMessage(result);
        var errorId = DashboardsTelemetryCore.extractErrorId(interpretedResult);
        var properties: IDictionaryStringTo<any> =
            {
                "ErrorId": errorId,
                "contributionId": contributionId,
                ...customProps
            };

        DashboardsTelemetryCore.publish(measuredFeatureName, properties);
    }

    /**
     * produce telemetry on dashboard with widgets below the fold.
     * @param belowFold no of widgets below viewport
     * @param total no of widgets on the dashboard.
     * @param dashboardId dashboard containing these widgets.
     */
    public static widgetsBelowFold(belowFold: number, total: number, dashboardId: string): void {
        var measuredFeatureName = "widgetsBelowFold";

        var properties: IDictionaryStringTo<any> =
            {
                "belowFold": belowFold,
                "total": total,
                "windowHeight": $(window).height(),
                "windowWidth": $(window).width(),
                "dashboardId": dashboardId
            };

        DashboardsTelemetryCore.publish(measuredFeatureName, properties);
    }

    // Dashboard Operations
    public static onDashboardRename(oldName: string, newName: string, dashboardId: string): void {
        var measuredFeatureName = "DashboardRenamed";
        var properties: IDictionaryStringTo<any> =
            {
                "OldName": oldName,
                "NewName": newName,
                "DashboardId": dashboardId
            };
        DashboardsTelemetryCore.publish(measuredFeatureName, properties);
    }

    public static onCreateDashboard(dashboardId: string, position: number): void {
        var measuredFeatureName = DashboardFeatureNames.CreateDashboard;
        var properties: IDictionaryStringTo<any> =
            {
                "DashboardId": dashboardId,
                "Position": position
            };
        DashboardsTelemetryCore.publish(measuredFeatureName, properties, null, true);
    }

    public static onReplaceDashboards(dashboardGroup: TFS_Dashboards_Contracts.DashboardGroup): void {
        var measuredFeatureName = DashboardFeatureNames.ReplaceDashboards;
        var properties: IDictionaryStringTo<any> =
            {
                "DashboardCount": dashboardGroup.dashboardEntries.length,
                "GroupPermission": TFS_Dashboards_Contracts.GroupMemberPermission[dashboardGroup.permission]
            };
        DashboardsTelemetryCore.publish(measuredFeatureName, properties, null, true);
    }

    public static onSaveDashboards(dashboardsAdded: number, dashboardsReordered: number): void {
        var measuredFeatureName = DashboardFeatureNames.SaveDashboards;
        var properties: IDictionaryStringTo<any> =
            {
                "DashboardsAdded": dashboardsAdded,
                "DashboardsReordered": dashboardsReordered,
                "UserIdentifier": Context.getDefaultWebContext().user.id
            };
        DashboardsTelemetryCore.publish(measuredFeatureName, properties, null, true);
    }

    /* Records events Errors produced on Dashboards */
    public static onDashboardError(eventName: string, errorMessage: string, dashboardId?: string): void {
        var measuredFeatureName = "DashboardError";

        var errorMessage = VSS.getErrorMessage(errorMessage);
        var errorId = DashboardsTelemetryCore.extractErrorId(errorMessage);
        var properties: IDictionaryStringTo<any> =
            {
                "EventName": eventName,
                "ErrorMessage": errorMessage,
                "ErrorId": errorId,
                "DashboardId": dashboardId
            };
        DashboardsTelemetryCore.publish(measuredFeatureName, properties);
    }

    //Pinning Operations

    /*
    * Track the successful pinning of widgets to a dashboard using the new Add to Dashboard experience, through
    * the type of the widget
    * the id of the dashboard it is being pinned to
    * Note: WidgetId is server-assigned on save, we don't block on client round trip for it right now. Refer to DashboardService.AddWidget.
    */
    public static newAddToDashboardSucceeded(widgetTypeId: string, destinationDashboard: string, sourceArea?: string, sourceDashboard?: string): void {
        var measuredFeatureName = "NewAddToDashboardSucceeded";
        var properties: IDictionaryStringTo<any> =
            {
                "WidgetTypeId": widgetTypeId, //Note: What is referred to as WidgetTypeId is actually the full contributionId.
                "SourceDashboard": sourceDashboard,
                "DestinationDashboard": destinationDashboard,
                "Source": sourceArea,
            };
        DashboardsTelemetryCore.publish(measuredFeatureName, properties);
    }

    /*
    * Track failed attempts to pin widgets to a dashboard using the new Add to Dashboard experience, through
    * the type of the widget
    * the id of the dashboard it is being pinned to
    * Note: WidgetId is server-assigned on save, we don't block on client round trip for it right now. Refer to DashboardService.AddWidget.
    */
    public static newAddToDashboardFailed(widgetTypeId: string, destinationDashboard: string, error: string, sourceArea?: string, sourceDashboard?: string): void {
        var measuredFeatureName = "NewAddToDashboardFailed";
        var properties: IDictionaryStringTo<any> =
            {
                "WidgetTypeId": widgetTypeId, //Note: What is referred to as WidgetTypeId is actually the full contributionId.
                "SourceDashboard": sourceDashboard,
                "DestinationDashboard": destinationDashboard,
                "Source": sourceArea,
                "Error": error
            };

        DashboardsTelemetryCore.publish(measuredFeatureName, properties);
    }

    /**
    * Telemetry about the Add Widget button at the button right of the screen.
    * @param {boolean} inEditMode true if the dashboard is in edit mode when the button is clicked
    */
    public static onAddWidget(inEditMode: boolean): void {
        var measuredFeatureName = "AddWidget";
        var properties: IDictionaryStringTo<any> =
            {
                "InEditMode": inEditMode
            };
        DashboardsTelemetryCore.publish(measuredFeatureName, properties);
    }

    /**
    * Telemetry about the DashboardEditMenu at the button right of the screen.
    * @param {string} eventName (open, close)
    */
    public static onDashboardEditMenu(eventName: string): void {
        var measuredFeatureName = "DashboardEditMenu";
        var properties: IDictionaryStringTo<any> =
            {
                "EventName": eventName
            };
        DashboardsTelemetryCore.publish(measuredFeatureName, properties);
    }

    /**
    * Telemetry about the Add/Cancel/Save button
    * @param {string} eventName (showAdd, showCancel, showSave, hideSave)
    */
    public static onInlineEditorButton(eventName: string): void {
        var measuredFeatureName = "onInlineEditorButton";
        var properties: IDictionaryStringTo<any> =
            {
                "EventName": eventName
            };
        DashboardsTelemetryCore.publish(measuredFeatureName, properties);
    }

    /**
     * Telemetry about where users delete the widget
     * @param {string} widgetTypeId: indicates the widget type id
     * @param {string} dashboardId The ID of the current dashboard
     * @param {string} widgetId: Guid of the Widget
     * @param {string} dashboardMode identified where the telementry event was triggered (ex. viewModeMenuLink, editModeMenuLink)
     */
    public static onRemoveWidget(widgetTypeId: string, dashboardId: string, widgetId: string, dashboardMode?: string): void {
        var measuredFeatureName = dashboardMode ? "RemoveWidgetLinkClick" : "RemoveWidget";
        var properties: IDictionaryStringTo<any> =
            {
                "WidgetTypeId": widgetTypeId, //Note: What is referred to as WidgetTypeId is actually the full contributionId. TypeId represents a legacy concept, which still needs to be retired. See User story #952753.
                "DashboardId": dashboardId,
                "WidgetId": widgetId
            };

        if (dashboardMode) {
            // LinkDescription is the legacy property... we don't want to change that.
            properties["LinkDescription"] = dashboardMode;
        }
        DashboardsTelemetryCore.publish(measuredFeatureName, properties);
    }


    /**
    * Telemetry about adding a widget from the catalog.
    * @param {string} widgetTypeId: indicates the widget type id
    * @param {string} dashboardId: indicates the dashboard id
    * @param {string} source: indicates the origin of the add ("DragAndDrop", "AddButton", "DoubleClick")
    * Note: WidgetId is server-assigned on save, we don't block on client round trip for it right now. Refer to DashboardService.AddWidget.
    */
    public static onAddWidgetFromCatalog(widgetTypeId: string, dashboardId: string, source: string): void {
        var measuredFeatureName = "AddFromCatalog";
        var properties: IDictionaryStringTo<any> =
            {
                "WidgetTypeId": widgetTypeId, //Note: What is referred to as WidgetTypeId is actually the full contributionId. TypeId represents a legacy concept, which still needs to be retired. See User story #952753.
                "DashboardId": dashboardId,
                "AddSource": source
            };
        DashboardsTelemetryCore.publish(measuredFeatureName, properties);
    }

    /**
     * Telemetry about where users are opening widget configuration
     * @param {string} widgetTypeId: indicates the widget type id
     * @param {string} dashboardId The ID of the current dashboard
     * @param {string} widgetId: Guid of the Widget
     * @param {string} dashboardMode identified where the telementry event was triggered (ex. viewModeMenuLink, editModeMenuLink)
     */
    public static onConfigureWidget(widgetTypeId: string, dashboardId: string, widgetId: string, dashboardMode?: string): void {
        var measuredFeatureName = dashboardMode ? "ConfigureWidgetLinkClick" : "ConfigureWidget";
        var properties: IDictionaryStringTo<any> =
            {
                "WidgetTypeId": widgetTypeId, //Caveat Emptor: callers are actually passing ContributionId as TypeId.
                "DashboardId": dashboardId,
                "WidgetId": widgetId
            };

        if (dashboardMode) {
            // LinkDescription is the legacy property... we don't want to change that.
            properties["LinkDescription"] = dashboardMode;
        }
        DashboardsTelemetryCore.publish(measuredFeatureName, properties);
    }

    /**
     * Telemetry about where users are opening widget lightbox
     * @param {string} dashboardId The ID of the current dashboard
     * @param {string} widgetTypeId: indicates the widget type id
     */
    public static onShowWidgetLightbox(dashboardId: string, widgetTypeId: string, widgetId: string): void {
        var measuredFeatureName = "ShowWidgetLightbox";
        var properties: { [key: string]: any } =
            {
                "DashboardId": dashboardId,
                "WidgetTypeId": widgetTypeId, //Note: What is referred to as WidgetTypeId is actually the full contributionId. TypeId represents a legacy concept, which still needs to be retired. See User story #952753.
                "WidgetId": widgetId
            };
        DashboardsTelemetryCore.publish(measuredFeatureName, properties);
    }

    /**
     * Telemetry for tracking time it takes to open lightboxed widget
     * @param {string} dashboardId The ID of the current dashboard
     * @param {string} widgetTypeId: indicates the widget type id
     */
    public static onLightboxWidgetLoaded(dashboardId: string, widgetTypeId: string, widgetId: string, timeTakenMs: number): void {
        var measuredFeatureName = "WidgetLightboxLoadedTime";
        var properties: { [key: string]: any } =
            {
                "DashboardId": dashboardId,
                "WidgetTypeId": widgetTypeId, //Note: What is referred to as WidgetTypeId is actually the full contributionId. TypeId represents a legacy concept, which still needs to be retired. See User story #952753.
                "WidgetId": widgetId,
                "TimeTakenMs": timeTakenMs
            };
        DashboardsTelemetryCore.publish(measuredFeatureName, properties);
    }

    /*
     * Produces a widget resize event telemetry
     * @param {string} widgetTypeId: indicates the widget type id
     * @param {WidgetSize} savedSize: the current size which is being saved
     * @param {WidgetSize} previousSize: the previous size of the widget being saved.
     */
    public static onWidgetResize(
        widgetTypeId: string,
        widgetId: string,
        savedSize: TFS_Dashboards_Contracts.WidgetSize,
        previousSize: TFS_Dashboards_Contracts.WidgetSize): void {

        var measuredFeatureName = "WidgetResized";
        var properties: IDictionaryStringTo<any> =
            {
                "WidgetTypeId": widgetTypeId, //Note: What is referred to as WidgetTypeId is actually the full contributionId. TypeId represents a legacy concept, which still needs to be retired. See User story #952753.
                "WidgetId": widgetId,
                "CurrentSize": savedSize.columnSpan + 'x' + savedSize.rowSpan,
                "PreviousSize": previousSize.columnSpan + 'x' + previousSize.rowSpan
            };
        DashboardsTelemetryCore.publish(measuredFeatureName, properties);
    }

    /*
     * Produces a telemetry event when the permissions is changed by a administrator
     * @param{GroupMemberPermission} permissions: permission changed by the administrator.
     */
    public static onPermissionsChanged(permissions: TFS_Dashboards_Contracts.GroupMemberPermission): void {
        var measuredFeatureName = "PermissionsChanged";
        var properties: IDictionaryStringTo<any> = {};
        properties[TFS_Dashboards_Contracts.GroupMemberPermission[permissions]] = true;
        DashboardsTelemetryCore.publish(measuredFeatureName, properties, null, true);
    }

    /*
     * Produces an enabling auto refresh event telemetry
     * @param{string} dashboardId: indicates the dashboard id
     */
    public static onEnablingAutoRefresh(dashboardId: string): void {
        var measuredFeatureName = "DashboardAutoRefreshEnable";
        var properties: IDictionaryStringTo<any> =
            {
                "DashboardId": dashboardId
            };
        DashboardsTelemetryCore.publish(measuredFeatureName, properties);
    }

    /*
     * Produces a event when the auto refresh happens
     * @param{string} dashboardId: indicates the dashboard id
     */
    public static onAutoRefresh(dashboardId: string, minuntesSinceLoad: number): void {
        var measuredFeatureName = "DashboardAutoRefreshHappen";
        var properties: IDictionaryStringTo<any> =
            {
                "DashboardId": dashboardId,
                "minutesSinceLoad": minuntesSinceLoad
            };
        DashboardsTelemetryCore.publish(measuredFeatureName, properties);
    }

    /*
    * Produces a event when the user click on the refresh indicator
    * @param{string} dashboardId: indicates the dashboard id
    */
    public static onClickingAutoRefresh(dashboardId: string): void {
        var measuredFeatureName = "DashboardAutoRefreshUserClick";
        var properties: IDictionaryStringTo<any> =
            {
                "Dashboardid": dashboardId
            };
        DashboardsTelemetryCore.publish(measuredFeatureName, properties);
    }

    /*
    * Produces a event when the user drags items in widget catalog
    */
    public static onCatalogDrag(): void {
        var measuredFeatureName = "DashboardCatalogDrag";
        var properties: IDictionaryStringTo<any> =
            {
            };
        DashboardsTelemetryCore.publish(measuredFeatureName, properties);
    }

    /*
    * Produces a event when the user closes catalog
    * @param {number} widgetsAdded: number of widgets added
    */
    public static onCatalogClosed(widgetsAdded: number): void {
        var measuredFeatureName = "DashboardCatalogClosed";
        var properties: IDictionaryStringTo<any> =
            {
                "WidgetsAdded": widgetsAdded
            };
        DashboardsTelemetryCore.publish(measuredFeatureName, properties);
    }

    /*
    * Produces a event when the user opens the dashboard manager
    */
    public static onOpenDashboardManager(): void {
        DashboardsTelemetryCore.publish("openDashboardManager");
    }

    /*
    * Produces a event when the user switches the dashboard
    * @param {string} currentdashboardId: the current dashboard we are on
    */
    public static onSwitchDashboard(currentdashboardId: string): void {
        var properties: IDictionaryStringTo<any> =
            {
                "current": currentdashboardId
            };
        DashboardsTelemetryCore.publish("SwitchDashboard");
    }

    public static contributionIdBelongsToFirstParty(contributionId: string): boolean {
        return Utils_String.startsWith(contributionId, "ms.vss");
    }
}

export class PublicProjectsTelemetryHelper {

    private static hasMemberClaim: boolean = UserClaimsService.getService().hasClaim(UserClaimsService.UserClaims.Member);
    private static hasStakeholderClaim: boolean = UserPermissionsHelper.Utils.isStakeholder();
    private static hasPublicClaim: boolean = UserClaimsService.getService().hasClaim(UserClaimsService.UserClaims.Public);
    private static hasAnonymousClaim: boolean = UserClaimsService.getService().hasClaim(UserClaimsService.UserClaims.Anonymous);
    /**
     * Returns a string representing the user type.
     * For Telemetry purposes only.
     */
    public static getUserType(): string {

        if (this.hasStakeholderClaim) {
            return UserType.Stakeholder;
        }
        if (this.hasMemberClaim) {
            return UserType.Member;
        }
        if (this.hasPublicClaim) {
            return UserType.Public;
        }
        if (this.hasAnonymousClaim) {
            return UserType.Anonymous;
        }
        return "Unknown";
    }

    public static getPublicProjectsTelemetryData(): PublicProjectsTelemetryInformation {
        // when the new web platform is off the page data is not populated.
        // The page context doesnt have visibility in the old platform so we just short circuit that data point.
        let projectInfo = getProject() || {} as TeamProjectReference;

        const visibility = ProjectVisibility[projectInfo.visibility];

        return {
            "UserType": PublicProjectsTelemetryHelper.getUserType(),
            "ProjectVisibility": visibility,
            "ProjectId": projectInfo.id
        }
    }
}

export class UserType {
    public static Member = "Member";
    public static Stakeholder = "Stakeholder";
    public static Public = "Public";
    public static Anonymous = "Anonymous";
}

export interface PublicProjectsTelemetryInformation {
    "UserType": string;
    "ProjectVisibility": string;
    "ProjectId": string;
}