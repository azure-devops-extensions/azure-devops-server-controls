import Q = require("q");
import { BaseControl, Control, Enhancement, create } from "VSS/Controls";
import Navigation_Services = require("VSS/Navigation/Services");
import Utils_String = require("VSS/Utils/String");
import Controls_Notifications = require("VSS/Controls/Notifications");
import Performance = require("VSS/Performance");
import Events_Action = require("VSS/Events/Action");
import VSS = require("VSS/VSS");
import { getPageContext, getDefaultWebContext } from "VSS/Context";
import FeatureAvailability = require("VSS/FeatureAvailability/Services");
import VSS_Service = require("VSS/Service");
import { HubsService } from "VSS/Navigation/HubsService";
import { getService as getSettingsService, ISettingsService, SettingsUserScope } from "VSS/Settings/Services";
import Contribution_Services = require("VSS/Contributions/Services");

import { DashboardGroupEntryResponse, DashboardGroup } from "TFS/Dashboards/Contracts";

import Contracts_Platform = require("VSS/Common/Contracts/Platform");
import TFS_Server_Constants = require("Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants");

import { Dashboard } from "TFS/Dashboards/Contracts";
import { DashboardEvents } from "Dashboards/Scripts/DashboardEvents";
import { DashboardPageExtension, RefreshTimerEvents, CssHtmlUtilities, FwLinks, getDashboardTeamContext} from "Dashboards/Scripts/Common";
import { IDashboardController, DashboardController } from "Dashboards/Scripts/Grid";
import { DashboardMessageArea } from "Dashboards/Scripts/Notifications";
import TFS_Dashboards_Resources = require("Dashboards/Scripts/Resources/TFS.Resources.Dashboards");
import TFS_Dashboards_Telemetry = require("Dashboards/Scripts/Telemetry");
import { IDashboardGrid, DashboardGrid, DashboardGridOptions, IDashboardsGridWidgetHostContainer } from "Dashboards/Scripts/Grid";
import { IWidgetHost, WidgetLoadState } from "Dashboards/Scripts/Contracts";
import { BladeDimensions } from "Dashboards/Scripts/BladeConstants";
import { PinArgs } from "Dashboards/Scripts/Pinning.PushToDashboardInternal";
import { IDashboardsHubContext } from "Dashboards/Components/DashboardsHubContext";
import * as ManageDashboardDialog from "Dashboards/Components/Shared/ManageDashboardDialog/ManageDashboardDialog";

import EngagementCore_NO_REQUIRE = require("Engagement/Core");
import EngagementDispatcher_NO_REQUIRE = require("Engagement/Dispatcher");
import TFS_JumpStart_NO_REQUIRE = require("Presentation/Scripts/TFS/TFS.QuickStart.JumpStart");
import PresentationResources_NO_REQUIRE = require("Presentation/Scripts/TFS/Resources/TFS.Resources.Presentation");
import TFS_EngagementRegistrations_NO_REQUIRE = require("Presentation/Scripts/TFS/TFS.Engagement.Registrations");

import DashboardManager_Async = require("Dashboards/Scripts/Dialogs.DashboardManager");

import * as PageDataHelper from "Dashboards/Scripts/Common.PageHelpers";
import * as Utils_Accessibility from "VSS/Utils/Accessibility";
import { PublicProjectsTelemetryHelper } from "Dashboards/Scripts/Telemetry";

export class BaseView extends BaseControl {

    public static CssClassDashboardView = "team-dashboard-view";
    private static DashboardMruRoot: string = "Dashboard/LastVisited/";

    protected context: Contracts_Platform.WebContext;
    protected teamContext: Contracts_Platform.TeamContext;

    protected dashboardController: IDashboardController;
    protected dashboardGridControl: IDashboardGrid;
    protected initialLoadTimeStamp: Date;

    /** Holds handles to performance scenarios and related state. Certain events call restartTelemetry which will reset this.  */
    protected telemetryState: ITelemetryState;
    /** Data that gets logs as additional properties in performance scenarios. */
    protected telemetryData: ITelemetryData;
    protected isPerfTelemetryEnabled: boolean = TFS_Dashboards_Telemetry.HasPerformanceTiming();

    protected onWidgetCopiedToDashboard: (args: PinArgs) => void;

    protected startingRetrySeconds = 1;
    protected maxiumumRetrySeconds = 5 * 60;
    protected networkRetryInterval = this.startingRetrySeconds;

    protected onBeforeDashboardUpdate(): IPromise<any> {
        return Q.resolve(null);
    }
    protected onAfterDashboardUpdate(): IPromise<any> {
        return Q.resolve(null);
    }

    /**
    * keep track of the previous state in the navigation tab.
    */
    private previousNavigationState: any;

    public constructor(options?: any) {
        super(options);
        this.context = getDefaultWebContext();
        this.teamContext = getDashboardTeamContext();
        this.dashboardController = new DashboardController(this.teamContext.id);
        this.onWidgetCopiedToDashboard = options.onWidgetCopiedToDashboard;
    }

    public initialize() {
        super.initialize();
        Navigation_Services.getHistoryService().attachNavigate(this.navigationHandler, false);
        this.registerEventWorkers();
        this.load();
    }

    protected isEditMode(): boolean {
        return false;
    }

    public dispose(): void {
        Events_Action.getService().unregisterActionWorkers(DashboardEvents.ManageDashboardsButtonClicked);
        Events_Action.getService().unregisterActionWorkers(RefreshTimerEvents.OnRefresh);
        Navigation_Services.getHistoryService().detachNavigate(this.navigationHandler);

        super.dispose();
    }

    protected loadDashboard(): void {
        this.initialLoadTimeStamp = new Date();
        document.title = DashboardPageExtension.getFormattedDashboardName(this.dashboardController.dashboardData.name);
        this.initializePreviousNavStateOnLoad();

        if (this.isPerfTelemetryEnabled) {
            this.telemetryState.allWidgetsInViewPerfScenario = Performance.getScenarioManager().startScenarioFromNavigation(
                TFS_Dashboards_Telemetry.DashboardsTelemetryConstants.Area,
                TFS_Dashboards_Telemetry.DashboardScenarios.AllWidgetsLoaded);

            this.telemetryState.partialTTIPerfScenario = Performance.getScenarioManager().startScenarioFromNavigation(
                TFS_Dashboards_Telemetry.DashboardsTelemetryConstants.Area,
                TFS_Dashboards_Telemetry.DashboardScenarios.PageTTILoad, true);

            this.telemetryState.allWidgetsInViewPerfScenario.addSplitTiming(TFS_Dashboards_Telemetry.DashboardSplits.DashboardDataLoaded);
            this.telemetryState.partialTTIPerfScenario.addSplitTiming(TFS_Dashboards_Telemetry.DashboardSplits.DashboardDataLoaded);

            this.telemetryData.totalWidgets = this.dashboardController.dashboardData.widgets.length;
            this.telemetryData.totalFirstPartyWidgets = this.dashboardController.dashboardData.widgets.filter(
                w => TFS_Dashboards_Telemetry.DashboardsTelemetry.contributionIdBelongsToFirstParty(w.contributionId)).length;

        }

        this.dashboardGridControl = this.createGrid();
        this.telemetryData.dashboardId = this.dashboardController.dashboardData.id;

        if (this.isPerfTelemetryEnabled) {
            if (this.telemetryData.totalFirstPartyWidgets == 0) {
                this.endPartialWidgetsTTITelemetry();
            }
            if (this.telemetryData.totalWidgets == 0) {
                this.endAllWidgetsTelemetry();
                this.onAllWidgetLoaded();
            }
        }
    }

    private announceDashboardContext(): void {
        const formatString = this.dashboardController.dashboardData.widgets.length === 0
            ? TFS_Dashboards_Resources.Announce_DashboardHasNoWidgets
            : this.dashboardController.dashboardData.widgets.length === 1
                ? TFS_Dashboards_Resources.Announce_LoadingSingleWidget
                : TFS_Dashboards_Resources.Announce_LoadingWidgets;
        const message = Utils_String.format(formatString, this.dashboardController.dashboardData.widgets.length);
        Utils_Accessibility.announce(message, false);
    }

    protected updateDashboard(dashboardId: string, isAutoRefresh: boolean = false): IPromise<void> {
        var deferred = Q.defer<void>();
        // clear error section.
        DashboardMessageArea.clearMessage();

        this.restartTelemetry();
        if (!isAutoRefresh) {
            this.initialLoadTimeStamp = new Date(); // This is for duration the page is refresh from.
        }

        // The first time a dashboard page load happens we record Dashboards.Page.Load (TTI) and Dashboards.Page.AllWidgetsLoaded
        // Calls to this method happen for a variety of reasons, but all imply that the page was already interactive.
        // For these cases we record either Dashboards.Page.Switch or Dashboards.Page.AutoRefresh
        this.telemetryState.allWidgetsInViewPerfScenario = Performance.getScenarioManager().startScenario(
            TFS_Dashboards_Telemetry.DashboardsTelemetryConstants.Area,
            isAutoRefresh ? TFS_Dashboards_Telemetry.DashboardScenarios.PageAutoRefresh :
                TFS_Dashboards_Telemetry.DashboardScenarios.PageSwitch);

        this.dashboardController.getDashboard(dashboardId, true).then(
            () => {
                document.title = DashboardPageExtension.getFormattedDashboardName(this.dashboardController.dashboardData.name);
                this.triggerDashboardUpdateEvent();
                if (this.dashboardController.dashboardData.id != DashboardPageExtension.getActiveDashboard()) {
                    // We retrieved the data, but it's too late - different dashboard is being displayed
                    return;
                }
                else {
                    this.telemetryData.totalWidgets = this.dashboardController.dashboardData.widgets.length;
                    this.telemetryData.dashboardId = this.dashboardController.dashboardData.id;


                    // recreate the control with new widgets
                    this.dashboardGridControl = this.createGrid();
                    this.setTimerValue(this.dashboardController.dashboardData.refreshInterval);
                }
                // reset retry interval
                this.networkRetryInterval = this.startingRetrySeconds;
                deferred.resolve(null);
            },
            (errorObj: any) => {
                if (this.telemetryState.allWidgetsInViewPerfScenario) { //abort perf scenario, if it hasn't already been cleared via timeout.
                    this.telemetryState.allWidgetsInViewPerfScenario.abort();
                }
                if (this.telemetryState.partialTTIPerfScenario) {
                    this.telemetryState.partialTTIPerfScenario.abort();
                }

                // remove any killswitches as the scenario has been aborted.
                this._clearTelemetryTimeOut();
                this.stopTimer();

                // If this is network problem and it was triggerred by the refresh timer, we would do retry logic here
                if (errorObj.status == 0 && isAutoRefresh) {
                    window.setTimeout(() => {
                        this.updateDashboard(dashboardId, true);
                    }, this.networkRetryInterval * 1000);
                    this.updateNetworkRetryInterval();
                } else {
                    var errorMessage = this.getNetworkErrorMessage(errorObj);
                    this.showNetworkError(errorMessage, errorObj.status);
                }
                deferred.reject(null);
            });

        return deferred.promise;
    }

    protected gridOptions(): DashboardGridOptions {
        return <DashboardGridOptions>{
            dashboardPermission: { canEdit: false },
            telemetryScenarios: !!this.telemetryState ? [this.telemetryState.allWidgetsInViewPerfScenario, this.telemetryState.partialTTIPerfScenario] : null,
            widgetRenderedCallback: this.isPerfTelemetryEnabled ? (host: IWidgetHost) => { this.widgetLoadedCallback(host); } : null,
            controller: this.dashboardController,
            widgetsModifiedCallback: (args) => { this.widgetsModifiedHandler(args); },
            getVisibleWidthSize: () => { return $('#container-with-scroll').width() - BladeDimensions.BladeWidth; }
        };
    };

    private widgetsModifiedHandler(args: PinArgs) {
        // Callback to invoke when a widget has been copied to a dashboard.
        if (args.response) {
            this.onWidgetCopiedToDashboard(args);
        }

        if (args.commandArgs && args.commandArgs.dashboardId === DashboardPageExtension.getActiveDashboard()) {
            this.updateDashboard(args.commandArgs.dashboardId, false);
        }
    }

    protected createGrid(): IDashboardGrid {

        if (this.dashboardGridControl) {
            this.dashboardGridControl.dispose();
            this.dashboardGridControl = null;
        }

        // log the current dashboard as the last visited for the project/team (as well as mark the team as the project mru). We do it as early as possible to not be affected by slow loading widgets.
        this.logDashboardMruToSettingsService();

        return <DashboardGrid>DashboardGrid.createIn(DashboardGrid, this.getElement(), this.gridOptions());
    }

    /** Callback that is run by the grid when each widget is loaded, used to record and aggregate report telemetry.
    *  @param {Dashboards_Control_WidgetHost.WidgetHost} widgetHost the host has a widget that got loaded
    */

    protected widgetLoadedCallback(widgetHost: IWidgetHost): void {
        let isFirstParty = TFS_Dashboards_Telemetry.DashboardsTelemetry.contributionIdBelongsToFirstParty(widgetHost.getWidget().contributionId);

        // update total count for grid.
        this.telemetryState.loadedWidgetsCount++;
        if (isFirstParty) {
            this.telemetryState.firstPartyLoadedWidgetsCount++;
        }

        // let the completed time for the last widget that was loaded. This time is used if the remaining widgets
        // time out, this allows us to avoid unnecessary skewing from a single bad widget.
        this.telemetryState.lastWidgetTime = Performance.getTimestamp();

        //if the widget was loaded successfully update the relevant counter.
        if (widgetHost.getLoadState() == WidgetLoadState.Loaded) {
            this.telemetryData.widgetsSuccessfullyLoaded++;
            if (isFirstParty) {
                this.telemetryData.firstPartyWidgetsSuccessfullyLoaded++;
            }
        }

        // keep track of the set of widgets that we expect to have been initialized. Note that in virtualization
        // not all widgets maybe initialized, especially if they are below the fold. We default it to the full list of widgets
        // but update it if we find we do have widgets that are outside the view port.
        var widgetsInViewport = this.telemetryData.totalWidgets;
        var firstPartyWidgetInViewport = this.telemetryData.totalFirstPartyWidgets;

        // we check for the grids existence as its possible for the grid to be disposed of either by a switch or a dashboard refresh.
        if (this.dashboardGridControl) {
            widgetsInViewport = this.dashboardGridControl.getCountOfWidgetsInInitialLoad();
            firstPartyWidgetInViewport = this.dashboardGridControl.getCountOfFirstPartyWidgetsInInitialLoad();
        }

        // add splits into performance to keep track of intermediate progress (25%, 50%, 75% of the widgets being loaded)
        this.logWidgetProgressPerformance(widgetsInViewport);

        if (this.telemetryState && this.telemetryState.partialTTIPerfScenario) {
            let currentLoadedPercentage = this.getCurrentLoadedPercentage(this.telemetryState.firstPartyLoadedWidgetsCount, firstPartyWidgetInViewport);

            if (currentLoadedPercentage >= 75) {
                this.endPartialWidgetsTTITelemetry();
            }
        }

        if (this.telemetryState.allWidgetsInViewPerfScenario && this.telemetryState.loadedWidgetsCount >= widgetsInViewport) {
            // when the number of initialized widgets match the number of widgets that have loaded successfully
            // we finish the Dashboards.Page.AllWidgetsLoaded event
            if (this.telemetryState.loadedWidgetsCount == widgetsInViewport) {
                // log the all widgets loaded telemetry event
                this.endAllWidgetsTelemetry();

                // at this time widgets are loaded, so we trigger callback for any post load operations.
                this.onAllWidgetLoaded();

                // remove any killswitches as the scenario has succeeded successfully.
                this._clearTelemetryTimeOut();
            }
        }
    }

    private logDashboardMruToSettingsService(): void {
        let teamSettingsToUpdate: any = {};
        let projectSettingsToUpdate: any = {};
        teamSettingsToUpdate[BaseView.DashboardMruRoot + "DashboardId"] = this.dashboardController.dashboardData.id;
        getSettingsService().setEntries(teamSettingsToUpdate, SettingsUserScope.Me, "Team", this.teamContext.id);

        projectSettingsToUpdate[BaseView.DashboardMruRoot + "TeamId"] = this.teamContext.id;
        getSettingsService().setEntries(projectSettingsToUpdate, SettingsUserScope.Me, "Project", this.context.project.id);
    }


    /**
    * Called when all widgets are loaded in the view, to be used for any post processing that needs to be performed.
    */
    protected onAllWidgetLoaded(): void {
        if (this.dashboardGridControl) {

            // keep a reference of the window for the viewport calculation per widget.
            let windowElement: JQuery = $(window);

            // keep track of widgets outside the view.
            let widgetsOutsideView: number = 0;

            var widgetContainers: IDashboardsGridWidgetHostContainer[] = this.dashboardGridControl.getWidgets();
            if (widgetContainers && widgetContainers.length > 0) {
                for (let widgetContainer of widgetContainers) {
                    if (widgetContainer.widgethost) {
                        let perfScenario = widgetContainer.widgethost.getPerformanceScenario();

                        // make sure the scenario actually exists, these arent created for disabled widget.
                        if (perfScenario) {
                            // add dashboard level telemetry data to each widget (dashboardId, total number of widgets)
                            perfScenario.addData(this.telemetryData);

                            // add whether the widget is in the viewport.
                            let inViewport = CssHtmlUtilities.isInViewport(widgetContainer.element, windowElement);
                            if (!inViewport) {
                                ++widgetsOutsideView;
                            }
                            perfScenario.addData({ inViewport: inViewport });
                        }
                    }
                }

                // send telemetry on whether any of the widgets is not in viewport - i.e. the dashboard has below the fold widgets.
                if (widgetsOutsideView > 0) {
                    TFS_Dashboards_Telemetry.DashboardsTelemetry.widgetsBelowFold(
                        widgetsOutsideView,
                        widgetContainers.length,
                        this.dashboardController.dashboardData.id);
                }
            }

            // inform all widgets that the dashboard load is complete and they can perform any post processing as needed.
            this.dashboardGridControl.onDashboardLoaded();
        }

        this.initializeEngagement();
    }

    /**
   * Initializes jumpstart/quickstart experiences post widget load via the Engagement Dispatcher. This allows for slight performance improvement as these scripts and their dependencies
   * are moved out of the primary dashboard loading experience flow.
   */
    private initializeEngagement(): void {
        // following featurees only for hosted deployments.
        if (!getPageContext().webAccessConfiguration.isHosted) return;
        VSS.using(["Engagement/Dispatcher", "Presentation/Scripts/TFS/TFS.Engagement.Registrations"], (EngagementDispatcher: typeof EngagementDispatcher_NO_REQUIRE, TFS_EngagementRegistrations: typeof TFS_EngagementRegistrations_NO_REQUIRE) => {
            this._registerGalleryNewFeature();
            TFS_EngagementRegistrations.registerNewFeature();
            EngagementDispatcher.Dispatcher.getInstance().start("Dashboards");
        });
    }

    /**
     * Show Jump Start
     */
    private _registerJumpStartQuickStart(): void {
        VSS.using(["Engagement/Core", "Engagement/Dispatcher"], (EngagementCore: typeof EngagementCore_NO_REQUIRE, EngagementDispatcher: typeof EngagementDispatcher_NO_REQUIRE) => {
            EngagementDispatcher.Dispatcher.getInstance().register(<EngagementCore_NO_REQUIRE.IEngagementModel>{
                id: "JumpStart",
                type: EngagementCore.EngagementType.QuickStart,
                model: EngagementDispatcher.lazyLoadModel(["Presentation/Scripts/TFS/TFS.QuickStart.JumpStart"], (TFS_JumpStart: typeof TFS_JumpStart_NO_REQUIRE) => {
                    return new TFS_JumpStart.JumpStartModel(this.context.project.name);
                })
            });
        });
    }

    /**
    * Show New Features
    */
    private _registerGalleryNewFeature(): void {
        if (!FeatureAvailability.FeatureAvailabilityService.isFeatureEnabled(TFS_Server_Constants.FeatureAvailabilityFlags.GalleryPromotion)) {
            return;
        }
        VSS.using(["Engagement/Core", "Engagement/Dispatcher", "Presentation/Scripts/TFS/Resources/TFS.Resources.Presentation"],
            (
                EngagementCore: typeof EngagementCore_NO_REQUIRE,
                EngagementDispatcher: typeof EngagementDispatcher_NO_REQUIRE,
                PresentationResources: typeof PresentationResources_NO_REQUIRE) => {
                EngagementDispatcher.Dispatcher.getInstance().register(<EngagementCore_NO_REQUIRE.IEngagementModel>{
                    id: "GalleryPromotion",
                    type: EngagementCore.EngagementType.NewFeature,
                    model: {
                        engagementId: "GalleryPromotion",
                        title: PresentationResources.GalleryPromotionNewFeatureTitle,
                        content: [{
                            imageClassName: "newfeature-bubble-gallerypromotion-image"
                        }],
                        learnMoreLinkTitle: PresentationResources.GalleryPromotionNewFeatureLearnMoreLinkTitle,
                        learnMoreLink: FwLinks.GalleryPromotion,
                    }
                });
            });
    }

    /**
   * Increment the retry interval for the next network retry
   */
    private updateNetworkRetryInterval() {
        if (this.networkRetryInterval < this.maxiumumRetrySeconds) {
            this.networkRetryInterval = this.networkRetryInterval * 2;
        }
        // Keep the retry logic at 5 minutes max
        if (this.networkRetryInterval > this.maxiumumRetrySeconds) {
            this.networkRetryInterval = this.maxiumumRetrySeconds;
        }
    }

    private addCommonPagePerfScenarioData(scenario: Performance.IScenarioDescriptor): void {
        scenario.addData({ teamId: this.teamContext.id });
        scenario.addData({ projectId: this.context.project.id });
        scenario.addData(this.telemetryData);
        scenario.addData(PublicProjectsTelemetryHelper.getPublicProjectsTelemetryData());
        scenario.addData({ pageEmbedded: PageDataHelper.isEmbeddedPage() });
    }

    /** Constructs a performance scenario and sends our telemetry data */
    protected endAllWidgetsTelemetry(): void {
        this.addCommonPagePerfScenarioData(this.telemetryState.allWidgetsInViewPerfScenario);

        //we exclude all hung-up widgets from the timings, so that data is not scewed by widgets that never load
        this.telemetryState.allWidgetsInViewPerfScenario.end(this.telemetryState.lastWidgetTime);

        // Performance scenario is our "state" - if there's no scenario, we will not try to report the telemetry
        // The scenario is only started by onDashboardLoad or updateDashboard, once that completes we stop measuring.
        this.telemetryState.allWidgetsInViewPerfScenario = null;
    }

    protected endPartialWidgetsTTITelemetry() : void {
        this.addCommonPagePerfScenarioData(this.telemetryState.partialTTIPerfScenario);

        this.telemetryState.partialTTIPerfScenario.end(this.telemetryState.lastWidgetTime);

        // null out the perf scenario now that's it's done
        this.telemetryState.partialTTIPerfScenario = null;
    }

    /*Clears telemetry timeout event that handles bad widget telemetry cases*/
    private _clearTelemetryTimeOut(): void {
        if (this.telemetryState && this.telemetryState.telemetryTimeoutHandlerId) {
            clearTimeout(this.telemetryState.telemetryTimeoutHandlerId);
        }
    }

    /** Resets telemetry data and restarts performance measurement */
    private restartTelemetry(): void {

        // remove any existing killswitches as we will be setting a new timeout
        this._clearTelemetryTimeOut();

        this.telemetryData =
            {
                widgetsSuccessfullyLoaded: 0,
                firstPartyWidgetsSuccessfullyLoaded: 0,
                totalWidgets: 0,
                totalFirstPartyWidgets: 0,
                isLoadTimeout: false,
                dashboardId: null
            }

        this.telemetryState = {
            loadedWidgetsCount: 0,
            firstPartyLoadedWidgetsCount: 0,
            allWidgetsInViewPerfScenario: null,
            partialTTIPerfScenario: null,
            lastWidgetTime: 0,
            isSplitLogged: {},
            // If there's a widget in the end of loading that takes forever to load this is the killswitch that will always report time
            telemetryTimeoutHandlerId: setTimeout(() => this.dashboardLoadingTimeoutCallback(), TFS_Dashboards_Telemetry.DashboardsTelemetryConstants.WidgetLoadTelemetryMaxTime),
        }
    }

    /** Callback method that gets called when some widgets on dashboard never load */
    private dashboardLoadingTimeoutCallback(): void {
        if (this.telemetryData) {
            this.telemetryData.isLoadTimeout = true;
        }

        if (this.telemetryState.allWidgetsInViewPerfScenario) {
            this.endAllWidgetsTelemetry();
        }

        if (this.telemetryState.partialTTIPerfScenario) {
            this.endPartialWidgetsTTITelemetry();
        }
    }

    private getCurrentLoadedPercentage(loaded: number, total: number) {
        return Math.floor((loaded * 100) / total);
    }

    /**
     * Log time expended for splits on how many widgets have been loaded at specific points.
     *
     * Historically these split were recorded as percentages of the total number of widgets, not total widgets in the viewport.
     * These means that for larger dashboards, many of the splits were never recorded. M136 updates this to do percentages of the
     * widgets in the viewport.
     */
    private logWidgetProgressPerformance(totalWidgets: number): void {
        if (this.telemetryState && this.telemetryState.allWidgetsInViewPerfScenario) {
            var currentLoadedPercentage: number = this.getCurrentLoadedPercentage(this.telemetryState.loadedWidgetsCount, totalWidgets);

            if (currentLoadedPercentage >= 75 && !this.telemetryState.isSplitLogged[TFS_Dashboards_Telemetry.DashboardSplits.Widget75pctLoaded]) {
                this.telemetryState.allWidgetsInViewPerfScenario.addSplitTiming(TFS_Dashboards_Telemetry.DashboardSplits.Widget75pctLoaded);
                this.telemetryState.isSplitLogged[TFS_Dashboards_Telemetry.DashboardSplits.Widget75pctLoaded] = true;
            }

            if (currentLoadedPercentage >= 50 && !this.telemetryState.isSplitLogged[TFS_Dashboards_Telemetry.DashboardSplits.Widget50pctLoaded]) {
                this.telemetryState.allWidgetsInViewPerfScenario.addSplitTiming(TFS_Dashboards_Telemetry.DashboardSplits.Widget50pctLoaded);
                this.telemetryState.isSplitLogged[TFS_Dashboards_Telemetry.DashboardSplits.Widget50pctLoaded] = true;
            }

            if (currentLoadedPercentage >= 25 && !this.telemetryState.isSplitLogged[TFS_Dashboards_Telemetry.DashboardSplits.Widget25pctLoaded]) {
                this.telemetryState.allWidgetsInViewPerfScenario.addSplitTiming(TFS_Dashboards_Telemetry.DashboardSplits.Widget25pctLoaded);
                this.telemetryState.isSplitLogged[TFS_Dashboards_Telemetry.DashboardSplits.Widget25pctLoaded] = true;
            }

            if (this.telemetryState.loadedWidgetsCount == 1 && !this.telemetryState.isSplitLogged[TFS_Dashboards_Telemetry.DashboardSplits.FirstWidgetLoaded]) {
                this.telemetryState.allWidgetsInViewPerfScenario.addSplitTiming(TFS_Dashboards_Telemetry.DashboardSplits.FirstWidgetLoaded);
                this.telemetryState.isSplitLogged[TFS_Dashboards_Telemetry.DashboardSplits.FirstWidgetLoaded] = true;
            }
        }
    }

    protected resetTimer(): void {
        Events_Action.getService().performAction(RefreshTimerEvents.ResetTimer);
    }

    protected stopTimer(): void {
        Events_Action.getService().performAction(RefreshTimerEvents.StopTimer);
    }

    protected setTimerValue(refreshTime: number): void {
        Events_Action.getService().performAction(RefreshTimerEvents.StartTimer, { refreshTime: refreshTime });
    }

    private registerEventWorkers(): void {
        var actionSvc: Events_Action.ActionService = Events_Action.getService();
        actionSvc.registerActionWorker(RefreshTimerEvents.OnRefresh,
            (args: any, next: (actionArgs: any) => any) => {
                var activeDashboardId: string = DashboardPageExtension.getActiveDashboard();
                var differentMin = Math.floor((new Date()).getTime() - this.initialLoadTimeStamp.getTime()) / (60 * 1000);
                TFS_Dashboards_Telemetry.DashboardsTelemetry.onAutoRefresh(activeDashboardId, differentMin);
                this.updateDashboard(activeDashboardId, true);

                // continue with the chain of responsibility
                if ($.isFunction(next)) {
                    next(args);
                }
            });

        actionSvc.registerActionWorker(DashboardEvents.ManageDashboardsButtonClicked, (actionArgs: any, next: any) => {
            actionSvc.performAction(RefreshTimerEvents.StopTimer);

            if (DashboardPageExtension.isNewDashboardExperience()) {
                let activeDashboard = DashboardPageExtension.getWidgetsFromDataIsland();

                ManageDashboardDialog.show({
                    dashboard: activeDashboard,
                    team: { teamName: this.teamContext.name, teamId: this.teamContext.id },
                    onSave: (dashboard) => {
                        document.title = DashboardPageExtension.getFormattedDashboardName(dashboard.name);
                        DashboardPageExtension.setActiveDashboard(activeDashboard.id, true);
                        this.updateDashboard(activeDashboard.id, false);

                        Events_Action.getService().performAction(
                            RefreshTimerEvents.StartTimer,
                            { refreshTime: dashboard.refreshInterval });

                        this.requestHeaderUpdate();
                    }
                });
            }
            else {
                VSS.using(["Dashboards/Scripts/Dialogs.DashboardManager"], (DashboardManager: typeof DashboardManager_Async) => {
                    create(
                        DashboardManager.DashboardsManagerDialog2,
                        this.getElement(), {
                            closeCallback: (dashboardGroup) => this._onDashboardManagerClose(dashboardGroup)
                        });
                    next(actionArgs);
                });
            }
        });
    }

    protected requestHeaderUpdate(): void {
    }

    /**
     * Called everytime the manager is closed. This is required to be able to adjust from the changes occurred in the manager (add/rename/delete)
     */
    private _onDashboardManagerClose(dashboardsGroup?: DashboardGroup): void {
        if (dashboardsGroup && dashboardsGroup.dashboardEntries) {
            //First dashboard in the list is the default one, we might move to using the last visted dashboard depending on where that lands.
            var defaultDashboardIndex: number = 0;

            // we look up the active dashboard index.
            var activeDashboardIndex: number = -1;

            var activeDashboardId: string = DashboardPageExtension.getActiveDashboard();

            var findActiveDashboard = (x, index) => {
                if (Utils_String.localeIgnoreCaseComparer(x.id, activeDashboardId) === 0) {
                    activeDashboardIndex = index;
                    return true;
                } else {
                    return false;
                }
            };

            // when the current active dashboard is removed we would need to navigate to another dashboard (the default for the current context)
            if (!dashboardsGroup.dashboardEntries.some(findActiveDashboard)) {
                document.title = DashboardPageExtension.getFormattedDashboardName(dashboardsGroup.dashboardEntries[defaultDashboardIndex].name);
                DashboardPageExtension.setActiveDashboard(dashboardsGroup.dashboardEntries[defaultDashboardIndex].id, true);
                this.updateDashboard(dashboardsGroup.dashboardEntries[defaultDashboardIndex].id, false); // Switch dashboard to the active one

                Events_Action.getService().performAction(
                    RefreshTimerEvents.StartTimer,
                    { refreshTime: dashboardsGroup.dashboardEntries[defaultDashboardIndex].refreshInterval });
            }
            else {
                this.dashboardController.dashboardData.refreshInterval = dashboardsGroup.dashboardEntries[activeDashboardIndex].refreshInterval;
                this.dashboardController.dashboardData.name = dashboardsGroup.dashboardEntries[activeDashboardIndex].name;
                this.requestHeaderUpdate();
            }
        }
        else {
            // User cancel the dialog without changes, we reset the timer
            Events_Action.getService().performAction(RefreshTimerEvents.ResetTimer);
        }
    }

    /**
     * Sets the current state from the page as the previous nav state when first loading the dashboard page.
     */
    private initializePreviousNavStateOnLoad(): void {
        // if no previous state exists for navigation, pull and assign it from the page
        if (!this.previousNavigationState) {
            // if current state has a dashboardId in the url, set the previous state to be same as current.
            var currentState: any = Navigation_Services.getHistoryService().getCurrentState();
            if (currentState && currentState[DashboardPageExtension.FragmentID]) {
                this.previousNavigationState = currentState;
            }
            // if current state in url doesnt have dashboardId, pull it from the data island.
            else {
                this.previousNavigationState = {};
                this.previousNavigationState[DashboardPageExtension.FragmentID] = DashboardPageExtension.getActiveDashboard();
            }
        }
    }

    /**
     * Identify if the navigation is happening through a product traversal:
     * when traversing between dashboard (or via clicking the home hub group) rather than an hyperlink
     * that has a fragment as part of a in page element text. All product navigations are designed around the fact that the navigation
     * will only support push state behaviour and use fragments in urls to override any existing behavior, and urls with both query and fragments
     * violate this pattern (and hence cannot be from the product)
     */
    private isDashboardNavigation(): boolean {
        var currentState: any = Navigation_Services.getHistoryService().getCurrentState();

        // derive dashboard from previous and current states.
        var previousStateDashboard: string = this.previousNavigationState[DashboardPageExtension.FragmentID];
        var currentStateDashboard: string = currentState[DashboardPageExtension.FragmentID];

        // previous state had dashboard and current state doesn't, this can only happen if the user  made the change manually
        // or its being done via a hash change (through say an in-text fragment hyperlink in the markdown widget)

        return previousStateDashboard && !currentStateDashboard ? false : true;
    }

    private navigationHandler = () => {
        if (DashboardPageExtension.isNewDashboardExperience()) {
            return;
        }

        var currentState = Navigation_Services.getHistoryService().getCurrentState();
        var currentPivot: string = currentState.view;

        // we dont handle directory pages.
        if (currentPivot) {
            return;
        }

        // if regular in product dashboad navigation.
        if (this.isDashboardNavigation()) {
            // store previous state and update dashboard if the current state qualifies.
            this.previousNavigationState = currentState;
            var activeDashboard: string = DashboardPageExtension.getActiveDashboard();
            var canRefreshDashboard: boolean = this.canRefreshDashboard(activeDashboard);
            if (canRefreshDashboard) {
                Q.allSettled([this.onBeforeDashboardUpdate()]).then(() => {
                    this.updateDashboard(activeDashboard).then(() => {
                        this.onAfterDashboardUpdate();
                    }).then(() => {
                        this.announceDashboardContext();
                    });
                });
            }
        }
        else {
            // non product hash driven navigation. We reset the hub selection to the current hub(as hub code upstreams switches it)
            // and update the url with the current dashboard, but without the hash(as well as reseting the history point)
            var dashboardId: string = this.previousNavigationState[DashboardPageExtension.FragmentID];
            VSS_Service.getLocalService(HubsService).triggerSelectedHubChangedEvent(dashboardId);
            currentState[DashboardPageExtension.FragmentID] = dashboardId;
            Navigation_Services.getHistoryService().replaceHistoryPoint(null, currentState, null, true);
        }
    };

    protected triggerDashboardUpdateEvent(): void {
        Events_Action.getService().performAction(DashboardEvents.DashboardUpdated, {
            dashboard: this.dashboardController.dashboardData
        });
    }

    private load(): void {
        this.restartTelemetry();
        this.dashboardController.getDashboard(DashboardPageExtension.getActiveDashboard()).then(() => {
            this.triggerDashboardUpdateEvent();
            this.loadDashboard();
            this.announceDashboardContext();
        }, (errorObj: any) => {
            var errorMessage = this.getNetworkErrorMessage(errorObj);
            this.showNetworkError(errorMessage, errorObj.status);
        });
    }

    private getNetworkErrorMessage(errorObj: any): string {
        var errorDetails = "";

        if (errorObj.serverError && errorObj.serverError.value && errorObj.serverError.value.Message) {
            errorDetails = errorObj.serverError.value.Message;
        }
        else if (errorObj.message) {
            errorDetails = errorObj.message;
        }

        var errorMessage = Utils_String.format("{0}\n{1} {2}",
            TFS_Dashboards_Resources.ErrorMessage_LoadDashboard,
            TFS_Dashboards_Resources.ErrorMessage_ErrorDetails,
            errorDetails);

        return errorMessage;
    }

    private showNetworkError(error: string, httpCode: string) {
        DashboardMessageArea.setMessage(Controls_Notifications.MessageAreaType.Warning, error);
    }

    /**
    *  Checks if we should refresh the dashboard based on the new dashboard id and current url
    * @param {string} url - current window url
    * @param {string} newDashboardGuid - new active dashboard, either from url or the local data island.
    */
    private canRefreshDashboard(newDashboardGuid: string): boolean {
        var newDashboardGuidValid: boolean = newDashboardGuid != Utils_String.EmptyGuidString; // checks for loaded dashboard from previous url or data island
        var newDashboardGuidDifferent: boolean = this.dashboardController.dashboardData.id != newDashboardGuid;

        return newDashboardGuidValid && newDashboardGuidDifferent;
    }

}

/** Internal structure for the view to keep and send the telemetry data to Performance API */
export interface ITelemetryData {
    /** Number of widgets that reported success loading */
    widgetsSuccessfullyLoaded: number,
    /** Number of first party widgets that reported success loading */
    firstPartyWidgetsSuccessfullyLoaded: number,
    /** Total number of widgets on a dashboard */
    totalWidgets: number,
    /** Total number of first party widgets on a dashboard. Used in TTI metric. */
    totalFirstPartyWidgets: number,
    /** Dashboard ID */
    dashboardId: string,
    /** true if some widgets or the dashboard itself never successfully loaded */
    isLoadTimeout: boolean
}

export interface ITelemetryState {
    loadedWidgetsCount: number;
    firstPartyLoadedWidgetsCount: number;
    allWidgetsInViewPerfScenario: Performance.IScenarioDescriptor;
    partialTTIPerfScenario: Performance.IScenarioDescriptor;
    lastWidgetTime: number;
    isSplitLogged: IDictionaryStringTo<boolean>;
    telemetryTimeoutHandlerId: number;
}