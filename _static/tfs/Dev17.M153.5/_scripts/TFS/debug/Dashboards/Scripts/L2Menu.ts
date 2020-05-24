/// <reference types="jquery" />
/// <amd-dependency path="VSS/LoaderPlugins/Css!dashboard" />

import TFS_Dashboards_Common = require("Dashboards/Scripts/Common");
import TFS_Dashboards_Constants = require("Dashboards/Scripts/Generated/Constants");
import TFS_Dashboards_Errors = require("Dashboards/Scripts/Notifications");
import TFS_Dashboards_Resources = require("Dashboards/Scripts/Resources/TFS.Resources.Dashboards");
import TFS_Dashboards_Telemetry = require("Dashboards/Scripts/Telemetry");
import {DashboardRefreshTimer} from "Dashboards/Scripts/L2Menu.RefreshTimer";

import { HubsService } from "VSS/Navigation/HubsService";
import TFS_Server_WebAccess_Constants = require("Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants");

import TFS_Dashboards_Contracts = require("TFS/Dashboards/Contracts");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import Contracts_Platform = require("VSS/Common/Contracts/Platform");
import Controls = require("VSS/Controls");
import Controls_Notifications = require("VSS/Controls/Notifications");
import Controls_Dialogs = require("VSS/Controls/Dialogs");
import Diag = require("VSS/Diag");
import Context = require("VSS/Context");
import PopupContent = require("VSS/Controls/PopupContent");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import Utils_UI = require("VSS/Utils/UI");
import Navigation_Services = require("VSS/Navigation/Services");
import Events_Action = require("VSS/Events/Action");

import VSS = require("VSS/VSS");
import VSS_Service = require("VSS/Service");
import Contribution_Services = require("VSS/Contributions/Services");
import * as UserPermissionsHelper from "Dashboards/Scripts/Common.UserPermissionsHelper";
import * as Utils_Accessibility from "VSS/Utils/Accessibility";

// For async loading
import DashboardManager_Async = require("Dashboards/Scripts/Dialogs.DashboardManager");

var delegate = Utils_Core.delegate;

/**
 * Options for the L2Menu.
 * The overflow algorithm is not required, by default we provide one.
 */
export interface IL2Menu {
    distributionAlgo: IOverflowAlgorithm;
    Hub: Hub[];
    refreshPageOnChange?: boolean;

    /** Unit test override for window.location navigation */
    navigate?: (url: string) => void
}

/**
 * Represent the L2 menu that we replace for Dashboard. This one contains every dashboard in a tabs
 * format with the possibility to add a new dashboard directly from that menu bar.
 */
export class L2Menu extends Controls.Control<IL2Menu> {
    public static IdTabs: string = "dashboard-tab-container";
    public static IdEditor: string = "inline-editor-panel";
    public static IdMenuRight: string = "menu-right-panel";
    public static IdOverflow: string = "dashboard-overflow-panel";
    public static IdLeftPanel: string = "dashboard-left-panel";
    public static L2MenuContainerId: string = "dashboard-l2-menu-bar";
    /**
     * This represent the maximum number of tabs we allow in the menu. This is shared with the server side and dashboard manager
     */
    public static MaximumDashboard: number = TFS_Dashboards_Common.DashboardPageExtension.getMaxDashboardsPerGroup();

    /**
     * WebContext which is required to know the user authorization
     */
    private tfsContext: Contracts_Platform.WebContext;

    /**
    * Contains the list of dashboards that will be distributed accross the tabs and the overflow menu. This can be null.
    */
    private dashboards: TFS_Dashboards_Contracts.DashboardGroupEntryResponse[];

    /**
     * This is always defined (admin or not)
     */
    public _dashboardTabs: DashboardsTabs;

    /**
     * Display dashboard that cannot be in tabs
     */
    public _dashboardOverflow: DashboardsOverflow;

    /**
     * This can be NULL if the user is not a Team Admin
     */
    private dashboardInlineEditorPanel: DashboardsInlineEditorPanel;

    /**
     * This can be NULL if the user is not a Team Admin
     */
    private dashboardsRightPanel: DashboardsRightPanel;

    /**
    *  This is the panel that is going to be used to house all extra links on the left.
    */
    private dashboardsLeftPanel: DashboardsLeftPanel;

    /**
     * Logic to distribute between tabs and overflow list. Cannot be null.
     */
    private distributionAlgo: IOverflowAlgorithm;

    /**
     * Contain the dashboards distributed in two list : tabs and overflow.
     * This is used to be able to see if something has changed. Most of the time, on window resize nothing will
     * be changed so no need to redraw everything. This variable is there only for performance reason.
     */
    private currentDistribution: DistributionSets;

    /**
     * Call to perform page navigation
     */
    private navigateHandler: (url: string) => void;

    /**
     * Other hubs that should be put on the left side of the divider "|"
     */
    private hubs: Hub[];

    private permission: TFS_Dashboards_Contracts.GroupMemberPermission = TFS_Dashboards_Contracts.GroupMemberPermission.None;

    public refreshTimer: DashboardRefreshTimer;

    public constructor(options: IL2Menu) {
        super(options);
        if (options == null || options.distributionAlgo == null) {
            this.distributionAlgo = new OverflowAlgorithm();
        }
        else {
            this.distributionAlgo = options.distributionAlgo || new OverflowAlgorithm(); // default algo
        }
        if (options && options.Hub) {
            this.hubs = options.Hub;
        }

        this.tfsContext = Context.getDefaultWebContext();
        $(window).resize(() => {
            this.refreshMenu();
        });

        this.navigateHandler = (options != null && options.navigate) ? options.navigate : url => window.location.assign(url);
    }

    /**
     * Initialize the control by rendering the visual representation of the L2 Menu
     */
    public initialize() {
        super.initialize();

        this.render();

        Navigation_Services.getHistoryService().attachNavigate(() => {
            var currentDashboard: string = TFS_Dashboards_Common.DashboardPageExtension.getActiveDashboard();
            TFS_Dashboards_Telemetry.DashboardsTelemetry.onSwitchDashboard(currentDashboard);
            this.navigateToDashboard(currentDashboard, false);
        }, false);
    }

    public static getHiddenLegacyL2Menu(): L2Menu {
        return <L2Menu>L2Menu.create(L2Menu, $("<div />").addClass("hidden").appendTo(document.body),
            {
                distributionAlgo: null,
                Hub: null,
                refreshPageOnChange: true
            });
    }

    /**
     * Gets the reference to dashboards right panel.
     */
    public getDashboardsRightPanel(): DashboardsRightPanel {
        return this.dashboardsRightPanel;
    }

    /**
     * Render every part of the menu depending of the user authorization
     */
    public render() {
        this.renderLeftPanel();
        this.renderTabsBar();
        this.renderOverflow();
        this.renderInlineEditorPanel();
        this.renderRightPanel();
        this.loadDashboard();
    }

    public renderLeftPanel() {
        var that = this;
        var $container = $('<ul>')
            .attr('id', L2Menu.IdLeftPanel);
        this.dashboardsLeftPanel = <DashboardsLeftPanel>Controls.Control.createIn<DashboardsLeftPanelOptions>(
            DashboardsLeftPanel,
            $container,
            <DashboardsLeftPanelOptions>{
                hubs: this.hubs
            });
        $container.appendTo(this.getElement());
    }

    /**
     * When the browser resize, the menu must be rendered again depending of the space available.
     * The overflow's button is also hid if no overflow
     */
    public refreshMenu(): void {
        this.distributeDashboards();
        this._setOverflowButtonVisibility();
    }

    /**
     * Set the visibility on the dashboard overflow if this one is having overflow
     */
    public _setOverflowButtonVisibility(): void {
        if (this._dashboardOverflow.getIsHavingOverflow()) {
            this._dashboardOverflow.show();

        } else {
            this._dashboardOverflow.hide();
        }
    }

    /**
     * Load dashboard.
     *   1. First try to load the dashboard from our JSON island.
     *   2. If #1 fails, fall back to loading from the REST API.  This is needed because
     *      users clicking on the Welcome L2 won't have a JSON island
     */
    public loadDashboard(): void {

        // get from the island if available.
       var dashboards = this.loadExistingDashboardsFromJsonIsland();
        if (dashboards) {
            this._setDashboardsAndDisplayPanels(dashboards.dashboardEntries ? dashboards.dashboardEntries : <any>dashboards);
            return;
        }

        // else from the REST API.
        this.loadExistingDashboardsFromServer().then(
            (response: TFS_Dashboards_Contracts.DashboardGroup) => {
                this._setDashboardsAndDisplayPanels(response.dashboardEntries);
            },
            (err) => {
                TFS_Dashboards_Errors.DashboardMessageArea.setMessage(Controls_Notifications.MessageAreaType.Error, TFS_Dashboards_Resources.ErrorMessage_DashboardGroup);
                TFS_Dashboards_Telemetry.DashboardsTelemetry.onDashboardError("Loading dashboard", err.message);
            });
    }

    private setupRefreshTimer(dashboardEntries: TFS_Dashboards_Contracts.DashboardGroupEntryResponse[]): void {
        var currentDashboard: string = TFS_Dashboards_Common.DashboardPageExtension.getActiveDashboard();

        dashboardEntries.forEach((
            groupEntry: TFS_Dashboards_Contracts.DashboardGroupEntryResponse,
            index: number,
            dashboardEntries: TFS_Dashboards_Contracts.DashboardGroupEntryResponse[]) => {

            if (groupEntry.id === currentDashboard && groupEntry.refreshInterval > 0) {
                Events_Action.getService().performAction(
                    TFS_Dashboards_Common.RefreshTimerEvents.StartTimer,
                    { refreshTime: dashboardEntries[index].refreshInterval });
                this.refreshTimer = this.dashboardsRightPanel.refreshTimer;
            }

        });
    }

    /**
    * Setup the panels to display the dashboards
    * @param {DashboardGroupEntryResponse} list of dashboards
    */
    public _setDashboardsAndDisplayPanels(dashboardEntries: TFS_Dashboards_Contracts.DashboardGroupEntryResponse[]): void {
        this.setupRefreshTimer(dashboardEntries);
        this.setDashboards(dashboardEntries);
        this.displayPanels();
    }

    /**
    * Switch to a Dashboard by guid. This force the redraw to ensure that we do a special treatment to the active one.
    * @param {string} dashboardId Guid
    * @param {boolean} resetUrl true if URL needs to be changed, false if URL shouldn't be touched. Defaults to true.
    * @param {boolean} isNew true if dashboard is just created, else false
    */
    public navigateToDashboard(dashboardId: string, resetUrl: boolean = true, isNew: boolean = false): void {
        if (resetUrl) {
            var activeDashboardId = TFS_Dashboards_Common.DashboardPageExtension.getActiveDashboard();
            if (!Utils_String.isEmptyGuid(activeDashboardId) && this._options.refreshPageOnChange !== true) {
                TFS_Dashboards_Common.DashboardPageExtension.setActiveDashboard(dashboardId);
            }
            else {
                // we are in the L2 menu or a contributed hub, and going back to dashboards is a full navigation.
                var url: string = TFS_Host_TfsContext.TfsContext.getDefault().getActionUrl("", "dashboards")
                    + DashboardTab.QueryStringParam
                    + dashboardId;

                // add IsNew=true query parameter, so view will enter into edit mode with catalog open
                if (isNew) {
                    url = Utils_String.format("{0}&{1}=true", url, TFS_Dashboards_Constants.DashboardUrlParams.IsNew);
                }

                this.navigateHandler(url);
            }
        }
        VSS_Service.getLocalService(HubsService).triggerSelectedHubChangedEvent(dashboardId);
        this.distributeDashboards(true);
        this._setOverflowButtonVisibility();
    }

    /**
     * Display panels that is hidden
     */
    public displayPanels(): void {
        if (this.dashboardInlineEditorPanel != null) {
            this.dashboardInlineEditorPanel.getElement().parent().show();
        }
        if (this._dashboardOverflow != null) {
            this._dashboardOverflow.getElement().parent().show();
        }
    }

    /**
     * Set the dashboards into the L2Menu
     * @param dashboards to be inserted into the menu (tab + overflow)
     */
    public setDashboards(dashboards: TFS_Dashboards_Contracts.DashboardGroupEntryResponse[]) {
        this.dashboards = dashboards;
        this.distributeDashboards();
        this._setOverflowButtonVisibility();
    }

    /*
    * Load all dashboard for the current project and team from the page's JSON island
    * @return DashboardGroup A collection of dashboards
    */
    private loadExistingDashboardsFromJsonIsland(): TFS_Dashboards_Contracts.DashboardGroup {
        return TFS_Dashboards_Common.DashboardPageExtension.getDashboardsFromWebPageData();
    }

    /*
    * Load all dashboard for the current project and team
    * @return {IPromise<DashboardGroup>} A collection of dashboards
    */
    public loadExistingDashboardsFromServer(): IPromise<TFS_Dashboards_Contracts.DashboardGroup> {
        var httpClient = TFS_Dashboards_Common.DashboardHttpClientFactory.getClient();
        return httpClient.getDashboards(TFS_Dashboards_Common.getTeamContext());
    }

    /**
     * Distribute dashboard between tabs and overflow menu. This will not redraw everything if not required.
     * @param {boolean} forceRender Render even if no changes made
     */
    public distributeDashboards(forceRender: boolean = false): void {

        var rightPanelHtmlElement = this.dashboardsRightPanel == null ? null : this.dashboardsRightPanel.getElement().parent();
        var dashboardTabsHtmlElement = this._dashboardTabs == null ? null : this._dashboardTabs.getElement().parent();
        var inlineEditorlHtmlElement = this.dashboardInlineEditorPanel == null ? null : this.dashboardInlineEditorPanel.getElement().parent();
        var overflowHtmlElement = this._dashboardOverflow == null ? null : this._dashboardOverflow.getElement().parent();
        var dashboardLeftHtemlElement = this.dashboardsLeftPanel == null ? null : this.dashboardsLeftPanel.getElement().parent();

        var l2Dimensions: L2Dimension = new L2Dimension(this.getElement(),
            rightPanelHtmlElement,
            dashboardTabsHtmlElement,
            inlineEditorlHtmlElement,
            overflowHtmlElement,
            dashboardLeftHtemlElement);

        var distribution = this.distributionAlgo.getDistribution(this.dashboards, l2Dimensions, (d) => { return this.getWidthFromDashboardTab(d) });
        if (distribution != null && (forceRender || distribution.hasChanged(this.currentDistribution))) {
            Diag.Debug.logInfo("Menu needs to be redrawn");
            this._dashboardTabs.batchRenderInPositionOrder(distribution.getDashboardToShow());
            this._dashboardOverflow.batchRenderInPositionOrder(distribution.getDashboardToHide());
            if (inlineEditorlHtmlElement != null) {
                this.dashboardInlineEditorPanel.onDashboardCountChange();
            }
            this.currentDistribution = distribution; //Save it this way we will be able to compare again on the next move
        }

    }

    private getWidthFromDashboardTab(dashboard: TFS_Dashboards_Contracts.DashboardGroupEntryResponse): number {
        var temporaryHiddenHtmlElementForMeasurement = $('<div>')
            .attr('id', "temporary-element-measurement")
            .css('display', 'none');
        temporaryHiddenHtmlElementForMeasurement.appendTo(this._dashboardTabs.getElement());
        var tabObject = new DashboardTab(dashboard, null);
        var $tabHtml = tabObject.getElement();
        $tabHtml.appendTo(temporaryHiddenHtmlElementForMeasurement);
        var width = temporaryHiddenHtmlElementForMeasurement.width() + this.getHorizontalMargin(temporaryHiddenHtmlElementForMeasurement);
        temporaryHiddenHtmlElementForMeasurement.remove();//Cleanup the mesurement container
        return width;
    }

    /**
     * We need to add more than just the width of the html element. This method gets the margin on each side. The padding
     * does not need to be calculated because this one is already counted in the width.
     * @param {jquery} htmlElement The element to get the margin pixel size.
     * @returns {number} The number in pixel of horizontal margin
     */
    private getHorizontalMargin(htmlElement: JQuery): number {
        return parseInt(htmlElement.css("marginLeft").replace('px', '')) + parseInt(htmlElement.css("marginRight").replace('px', ''));
    }

    /**
     * Render the list of links to the dashboard.
     */
    public renderTabsBar(): void {
        var that = this;
        var $tabsContainer = $('<ul>')
            .attr('id', L2Menu.IdTabs);
        this._dashboardTabs = <DashboardsTabs>Controls.Control.createIn<any>(
            DashboardsTabs,
            $tabsContainer,
            {
                navigateToDashboard: function (dashboardId: string) { return that.navigateToDashboard(dashboardId); }
            }
        );
        $tabsContainer.appendTo(this.getElement());
    }

    /**
     * Render the overflow if required. If every dashboard is displayed in the tabs than we do not need to display the overflow
     */
    public renderOverflow(): void {
        var that = this;
        var $container = $('<div>')
            .attr('id', L2Menu.IdOverflow);
        this._dashboardOverflow = <DashboardsOverflow>Controls.Control.createIn<any>(
            DashboardsOverflow,
            $container,
            {
                navigateToDashboard: function (dashboardId: string) { return that.navigateToDashboard(dashboardId); }
            }
        );
        $container.hide(); // Wait until we got the server answer to show
        $container.appendTo(this.getElement());
    }

    /**
    * Gets the options for dashboard inline editor dialog.
    */
    public getInlineEditorDialogOptions(): DashboardsInlineEditorDialogOptions {
        var editorDialogOptions: DashboardsInlineEditorDialogOptions = this.getInlineEditorOptions();
        editorDialogOptions.hasProgressElement = false;
        return editorDialogOptions;
    }

    /**
     * Gets the options for dashboard inline editor.
     */
    public getInlineEditorOptions(): IDashboardsInlineEditorPanelOption {
        return {
            tabContainer: this._dashboardTabs,
            getMaxPosition: (): number => this.getMaxPosition(),
            maxTabs: L2Menu.MaximumDashboard,
            canAddDashboard: () => this.canAddDashboard(),
            validateDashboardNameIsUnique: (name: string) => this.validateDashboardNameIsUnique(name),
            addDashboard: (dashboard: TFS_Dashboards_Contracts.DashboardGroupEntryResponse) => this.addDashboard(dashboard),
            navigateToDashboard: (dashboardId: string) => this.navigateToDashboard(dashboardId, true, true)
        }
    }


    /**
     * Render the editor panel only if the current user is a Team Admin
     */
    public renderInlineEditorPanel(): void {
        var that = this;
        if (this.canShowInlineEditor()) {
            var $inlineEditorPanel = $('<div>')
                .attr('id', L2Menu.IdEditor);
            this.dashboardInlineEditorPanel = <DashboardsInlineEditorPanel>Controls.Control.createIn<any>(
                DashboardsInlineEditorPanel,
                $inlineEditorPanel,
                this.getInlineEditorOptions());

            $inlineEditorPanel.appendTo(this.getElement());
            $inlineEditorPanel.hide(); // Wait until we got the server answer to show
        }
    }

    /**
     * Add a new dashboard. Used by the inline editor to add a new dashboard on the fly.
     * @param {TFS_Dashboards_Contracts.DashboardGroupEntryResponse} dashboard cannot be null
     */
    public addDashboard(dashboard: TFS_Dashboards_Contracts.DashboardGroupEntryResponse): void {
        if (dashboard == null) {
            return;
        }
        if (this.dashboards == null) {
            this.dashboards = [];
        }
        this.dashboards.push(dashboard);
        this.refreshMenu();
    }

    /**
     * Render the right panel that contain for the moment only the gear for management. Later, the list of all
     * dashboards will also be present in this right panel.
     */
    public renderRightPanel(): void {
        var $rightPanel = $('<div>')
            .attr('id', L2Menu.IdMenuRight);
        var that = this;
        this.dashboardsRightPanel = <DashboardsRightPanel>Controls.Control.createIn<DashboardsRightPanelOptions>(
            DashboardsRightPanel,
            $rightPanel,
            <DashboardsRightPanelOptions>{
                onDashboardManagerClosed: Utils_Core.delegate(that, that._onDashboardManagerClose),
                show: this.canShowManageButton()
            }
        );
        $rightPanel.appendTo(this.getElement());
    }

    private canShowManageButton(): boolean {
        return UserPermissionsHelper.CanReadDashboards()
    }

    private canShowInlineEditor(): boolean {
        return UserPermissionsHelper.CanCreateDashboards() || UserPermissionsHelper.CanEditDashboard() ||  UserPermissionsHelper.CanDeleteDashboards();
    }


    /**
     * Called everytime the manager is closed. This is required to be able to adjust from the changes occurred in the manager (add/rename/delete)
     * @param dashboards Full list of dashboard. Can be null if no changes. This will set the dashboard for the menu.
     */
    public _onDashboardManagerClose(dashboardsGroup?: TFS_Dashboards_Contracts.DashboardGroup): void {
        // If the user pressed cancel, no change needs to be made.
        if (dashboardsGroup && dashboardsGroup.dashboardEntries) {
            var defaultDashboardId: string = dashboardsGroup.dashboardEntries[0].id; //First dashboard is always the default one
            var activeDashboardId: string = TFS_Dashboards_Common.DashboardPageExtension.getActiveDashboard();

            var dashboardIndex: number = 0; // The dashboard that we need to deal with the

            // If the GUI is empty, that mean user click on the Welcome hub
            if (this.isOnDashboardLeftPanel()) {
                this.loadDashboard();
            } else {
                if (!dashboardsGroup.dashboardEntries.some((x, index) => {
                    if (x.id.toLowerCase() === activeDashboardId.toLowerCase()) {
                        dashboardIndex = index;
                        return true;
                    } else {
                        return false;
                    }
                })) {
                    //Active Dashboard doesn't exist so we use the default one
                    activeDashboardId = defaultDashboardId;
                }
                this.dashboards = dashboardsGroup.dashboardEntries;
                document.title = TFS_Dashboards_Common.DashboardPageExtension.getFormattedDashboardName(dashboardsGroup.dashboardEntries[dashboardIndex].name);
                this.navigateToDashboard(activeDashboardId); // Switch dashboard to the active one

                Events_Action.getService().performAction(
                    TFS_Dashboards_Common.RefreshTimerEvents.StartTimer,
                    { refreshTime: dashboardsGroup.dashboardEntries[dashboardIndex].refreshInterval });
            }
        } else {
            // User cancel the dialog without changes, we reset the timer
            Events_Action.getService().performAction(TFS_Dashboards_Common.RefreshTimerEvents.ResetTimer);
        }
    }

    public isOnDashboardLeftPanel(): boolean {
        var activeDashboardId: string = TFS_Dashboards_Common.DashboardPageExtension.getActiveDashboard();
        return activeDashboardId === Utils_String.EmptyGuidString;
    }

    /**
     * Get the number of dashboard present in the menu
     * @returns {number} The number of dashboard.
     */
    public getDashboardsCount(): number {
        if (this.dashboards == null) {
            return 0;
        }
        return this.dashboards.length;
    }

    /**
     * Indicate if we can add more dashboard to the menu
     * @return True if can add more dashboard. False if the maximum threshold has been reached.
     */
    public canAddDashboard(): boolean {
        return this.getDashboardsCount() < L2Menu.MaximumDashboard;
    }

    /**
    * Indicates if the given name is unique among existing dashboards.
    * @return True if given name is unique. False if not
    */
    public validateDashboardNameIsUnique(name: string): boolean {
        return TFS_Dashboards_Common.DashboardPageExtension.validateDashboardNameIsUnique(this.dashboards, name);
    }

    /**
     * Return the biggest position
     * @return 0 if no dashboard, otherwise the highest position of the collection
     */
    public getMaxPosition(): number {
        var maxPosition = 0;
        if (this.dashboards != null) {
            for (var dashboardsIndex = 0; dashboardsIndex < this.getDashboardsCount(); dashboardsIndex++) {
                var dashboard = this.dashboards[dashboardsIndex];
                if (dashboard.position > maxPosition) {
                    maxPosition = dashboard.position;
                }
            }
        }
        return maxPosition;
    }
}

/**
 * Methods used to get dimension of specifics container
 */
export interface IL2Dimension {
    /**
   * Get the full L2 menu width size
   * @returns {number} Pixel
   */
    getFullBarWidth(): number;

    /**
     * Get the width of the right panel
     * @returns {number} Pixel
     */
    getRightPanelWidth(): number;

    /**
     * Get the inline-editor width when open
     * @returns {number} Pixel
     */
    getEditorWidth(): number;

    /**
     * Get tabs width (remaining of the space after removing other panels)
     * @returns {number} Pixel
     */
    getTabsWidth(): number;

    /**
 * Get the width of the right panel
 * @returns {number} Pixel
 */
    getRightPanelWidth(): number;
}

/**
 * Contains all dimension for the L2Menu and its section. During the construction of the object, the measurements are taken.
 */
export class L2Dimension implements IL2Dimension {
    /**
     * This is the full l2 menu bar width. This should be the same as the browser width.
     */
    private fullBarWidth: number;
    /**
     * The right panel width is the part completly at right that is not mobile.
     */
    private rightPanelWidth: number;
    /**
     * The editor when this one is open
     */
    private editorWidth: number;
    /**
     * This is the all dashboard tab width which is the remaining space once all other sections are calculated
     */
    private tabsWidth: number;

    /**
    * This is the width of the left panel
    */
    private leftPanelWidth: number;

    /**
     * Overflow section width. We always calculate as if the button is showed.
     */
    private overFlowWidth: number;

    public constructor(l2Menu: JQuery, rightPanel: JQuery, tabsPanel: JQuery, editor: JQuery, overflow: JQuery, leftPanel: JQuery) {
        this.fullBarWidth = $(l2Menu).width();
        this.setEditorWidth(editor);
        this.setRightPanelWidth(rightPanel);
        this.setOverflowWidth(overflow);
        this.setLeftPanelWidth(leftPanel);
        this.tabsWidth = this.fullBarWidth - this.overFlowWidth - this.editorWidth - this.rightPanelWidth - this.leftPanelWidth
        this.getHorizontalMargin(tabsPanel) - 6;//6 because we have 5 elements that may be round up
    }

    /**
     * The editor width is tricky and require to go get the size of this one when it is expanded. The reason is that in the specification
     * we require to always have a reserved space for the editor. This is a spec constraint, not a design constraint because we could
     * reflow the tabs when the editor opens.
     * @param {JQuery} editor html control
     */
    public setEditorWidth(editor: JQuery): void {
        if (editor != null) {
            var $textBoxBehindEditorPanel = $(editor).find('#' + DashboardsInlineEditorPanel.IdTextboxInput);
            var editorClasses = $textBoxBehindEditorPanel.attr('class'); //Save to put again, we do not just remove because we need to put back in the same state (might be open)
            var editorStyle = $textBoxBehindEditorPanel.attr('style'); //Save to put again, we do not just remove because we need to put back in the same state (might be open)
            $textBoxBehindEditorPanel.removeAttr('class'); //Required to have the full width to remove possible class that collapse element
            $textBoxBehindEditorPanel.removeAttr('style'); //Required to have the full width to remove the display none that might be there if collapsed
            $textBoxBehindEditorPanel.addClass(DashboardsInlineEditorPanel.InputOpenClass); //Add the class that may increase the width
            this.editorWidth = $(editor).width() + this.getHorizontalMargin($(editor));
            $textBoxBehindEditorPanel.removeClass(DashboardsInlineEditorPanel.InputOpenClass); //Remove the class (will be added next if it was there before on next line)
            $textBoxBehindEditorPanel.attr('class', editorClasses); //Set back
            $textBoxBehindEditorPanel.attr('style', editorStyle); //Set back
        } else {
            this.editorWidth = 0;
        }
    }

    /**
     * Overflow width is dynamically calculated by taking the remaining space we have once we remove all others controls in the menu on the browser width.
     * @param {JQuery} overflow html control
     */
    public setOverflowWidth(overflow: JQuery): void {
        if (overflow != null) {
            var $buttonBehindTheOverflowPanel = $(overflow).find('.dropdown-menu');
            var buttonStyle = $buttonBehindTheOverflowPanel.attr('style'); //Save to put again, we do not just remove because we need to put back in the same state (might be hidden if no overflow before)
            this.overFlowWidth = $(overflow).width() + this.getHorizontalMargin($(overflow));
            $buttonBehindTheOverflowPanel.attr('style', buttonStyle); //Set back
        }
        else {
            this.overFlowWidth = 0;
        }
    }

    /**
     * Set the right panel size.
     * @param {JQuery} rightPanel html control
     */
    public setRightPanelWidth(rightPanel: JQuery): void {
        if (rightPanel != null) {
            this.rightPanelWidth = $(rightPanel).width() + this.getHorizontalMargin($(rightPanel));
        }
        else {
            this.rightPanelWidth = 0;
        }
    }

    public setLeftPanelWidth(leftPanel: JQuery): void {
        if (leftPanel != null) {
            this.leftPanelWidth = $(leftPanel).width() + this.getHorizontalMargin($(leftPanel));
        } else {
            this.leftPanelWidth = 0;
        }
    }

    /**
     * Utility method that give all the horizontal margin (left + right). This is required to have the full width of any Html element.
     * @param htmlElement
     * @returns {number} Pixel of the margin (left + right)
     */
    private getHorizontalMargin(htmlElement: JQuery): number {
        return parseInt(htmlElement.css("marginLeft").replace('px', '')) + parseInt(htmlElement.css("marginRight").replace('px', ''));
    }

    /**
     * Get the full L2 menu width size
     * @returns {number} Pixel
     */
    public getFullBarWidth(): number {
        return this.fullBarWidth;
    }

    /**
     * Get the width of the right panel
     * @returns {number} Pixel
     */
    public getRightPanelWidth(): number {
        return this.rightPanelWidth;
    }

    /**
     * Get the inline-editor width when open
     * @returns {number} Pixel
     */
    public getEditorWidth(): number {
        return this.editorWidth;
    }

    /**
     * Get tabs width (remaining of the space after removing other panels)
     * @returns {number} Pixel
     */
    public getTabsWidth(): number {
        return this.tabsWidth;
    }

    /**
    * Get the width of the right panel
    * @returns {number} Pixel
    */
    public getLeftPanelWidth(): number {
        return this.leftPanelWidth;
    }
}

export interface IOverflowAlgorithm {

    /**
     * Get the distribution of dashboard between the tab and the overflow menu.
     * @param dashboards to calculate the distribution on
     * @param l2MenuDimensions the menu parts dimension
     * @param measurementContainer container to take measurement on
     * @returns {DistributionSets} Result of the distribution between tabs and overflow list
     */
    getDistribution(dashboards: TFS_Dashboards_Contracts.DashboardGroupEntryResponse[],
        l2MenuDimensions: IL2Dimension,
        getWidthForDashboardTab: (dashboard: TFS_Dashboards_Contracts.DashboardGroupEntryResponse) => number): DistributionSets;
}

/**
 * Determine the dashboard distribution between the tabs and the overflow controls
 */
export class OverflowAlgorithm implements IOverflowAlgorithm {

    /**
     * Create a new overflow algorithm to determine how to distribute all dashboard between the tabs and the overflow menu.
     */
    public constructor() {

    }

    /**
     * Get the distribution of dashboard between the tab and the overflow menu.
     * @param {DashboardGroupEntryResponse} dashboards to calculate the distribution on
     * @param {IL2Dimension} l2MenuDimensions the menu parts dimension
     * @param {function} Delegate outside the algorithm for calculating the size the algorithm to determine the size in pixel. The reason
     *                   is that we do not need to be bound to the Html to do the distribution.
     * @returns {DistributionSets} Result of the distribution between tabs and overflow list
     */
    public getDistribution(dashboards: TFS_Dashboards_Contracts.DashboardGroupEntryResponse[],
        l2MenuDimensions: IL2Dimension,
        getWidthForDashboardTab: (dashboard: TFS_Dashboards_Contracts.DashboardGroupEntryResponse) => number): DistributionSets {
        var tabs: TFS_Dashboards_Contracts.DashboardGroupEntryResponse[] = [];
        var overflows: TFS_Dashboards_Contracts.DashboardGroupEntryResponse[] = [];
        var currentTabsSize: number = 0;
        var tab: TFS_Dashboards_Contracts.DashboardGroupEntryResponse;
        var tabSize: number;
        var dashboardIndex: number;

        var activeDashboardId = TFS_Dashboards_Common.DashboardPageExtension.getActiveDashboard();
        var activeTab: TFS_Dashboards_Contracts.DashboardGroupEntryResponse;
        var activeOverflowIndex: number = -1;
        var mapIdToSize: { [id: string]: number; } = {};

        if (dashboards == null) //Can occur if not dashboard in the URL
        {
            return null;
        }
        //0- Make sure we treat dashboard in the right priority order
        dashboards = TFS_Dashboards_Common.DashboardContractsExtension.sortDashboardsByPosition(dashboards);

        //1- Distribute by size only. Take in memory if the current dashboard is in overflow (+ its position in overflow)
        for (dashboardIndex = 0; dashboardIndex < dashboards.length; dashboardIndex++) {
            tab = dashboards[dashboardIndex];
            tabSize = getWidthForDashboardTab(tab);
            mapIdToSize[tab.id] = tabSize;
            if (tab.id === activeDashboardId) {
                activeTab = tab;
            }

            if (currentTabsSize + tabSize <= l2MenuDimensions.getTabsWidth() && overflows.length === 0) //Only add in tabs if we have space or if not yet added one in overflow
            {
                currentTabsSize += tabSize;
                tabs.push(tab);
            }
            else {
                overflows.push(tab);
                if (tab.id === activeDashboardId) {
                    activeOverflowIndex = overflows.length - 1;
                }
            }
        }

        //2- If the current active dashboard is in overflow, we need to put this one in the last position and remove from the
        //last position 1 by 1 until we have enought space.
        if (activeOverflowIndex !== -1 && activeTab != null) {
            // Add active in last position, remove from overflow. This allow us to limit the manipulation
            tabs.push(activeTab);
            overflows.splice(activeOverflowIndex, 1);
            var sizeToRemove = mapIdToSize[activeDashboardId];
            var sizeRemoved = 0;
            do {
                var tabToMoveIntoOverflow = tabs.splice(tabs.length - 2, 1); // Remove the tab before last position (active tab)
                overflows.unshift(tabToMoveIntoOverflow[0]);
                sizeRemoved += mapIdToSize[tabToMoveIntoOverflow[0].id];
            } while (sizeRemoved < sizeToRemove);
        }

        return new DistributionSets(tabs, overflows);
    }
}

/**
 *This is the class that the algorithm return once it has figure out what can be shown or hidden.
 */
export class DistributionSets implements DistributionSets {
    private dashboardsShowed: TFS_Dashboards_Contracts.DashboardGroupEntryResponse[];
    private dashboardsHid: TFS_Dashboards_Contracts.DashboardGroupEntryResponse[];

    /**
     * Build a distrbution set from 2 lists.
     * @param showed List of dashboards to show in the tabs
     * @param hid List of dashboard to hide from the tabs
     */
    public constructor(showed: TFS_Dashboards_Contracts.DashboardGroupEntryResponse[], hid: TFS_Dashboards_Contracts.DashboardGroupEntryResponse[]) {
        if (showed == null) {
            throw Error("Showed list cannot be null");
        }
        if (hid == null) {
            throw Error("Hid list cannot be null");
        }
        this.dashboardsShowed = showed;
        this.dashboardsHid = hid;
    }

    /**
     * Get the dashboard to show in the tabs
     * @returns {DashboardGroupEntryResponse} List of dashboards
     */
    public getDashboardToShow(): TFS_Dashboards_Contracts.DashboardGroupEntryResponse[] {
        return this.dashboardsShowed;
    }

    /**
     * Get the dashboard to hide from the tabs (or show in the overflow menu)
     * @returns {DashboardGroupEntryResponse} List of dashboards
     */
    public getDashboardToHide(): TFS_Dashboards_Contracts.DashboardGroupEntryResponse[] {
        return this.dashboardsHid;
    }

    /**
     * Compare two distribution set to determine if a change has appear or not. This is useful in the determination of
     * if a re-calculus is required or not.
     * @param otherSet to compare. Can be null.
     * @returns {boolean} True if changed, False if the same
     */
    public hasChanged(otherSet: DistributionSets): boolean {
        if (otherSet == null) {
            return true;
        }
        var toShow = otherSet.getDashboardToShow();
        var toHide = otherSet.getDashboardToHide();
        if (toShow.length !== this.getDashboardToShow().length || toHide.length !== this.getDashboardToHide().length) {
            return true;
        }

        for (var dashboardIndexShow = 0; dashboardIndexShow < this.getDashboardToShow().length; dashboardIndexShow++) {
            if (this.dashboardsShowed[dashboardIndexShow].id !== toShow[dashboardIndexShow].id) {
                return true;
            }
        }
        for (var dashboardIndexHide = 0; dashboardIndexHide < this.getDashboardToHide().length; dashboardIndexHide++) {
            if (this.dashboardsHid[dashboardIndexHide].id !== toHide[dashboardIndexHide].id) {
                return true;
            }
        }
        return false;
    }
}

/**
 * Give the possibility to navigate in the L2 from the overflow
 */
export interface IDashboardsOverflowOption {
    /**
     * Action to associate to the overflow tab link
     */
    navigateToDashboard(dashboardId: string): void;

    /**
     * For unit tests only. Used to redefine $(document)
     */
    $document?: JQuery;
}

/**
 * This is the section that hide all dashboards that couldn't be visible in the dashboard's tabs.
 * It contains a button to show the list of dashboard and a popup that display all dashboard.
 */
export class DashboardsOverflow extends Controls.Control<IDashboardsOverflowOption>{

    public static DropDownClass: string = "dropdown-menu";
    public static PopupControlClass: string = "filtered-list-popup";
    public static OverflowListContainerClass: string = "dashboard-overflow-list"

    /**
     * VSO's control that we use to display the list of dashboards when the menu is pressed (open)
     */
    public _popupEnhancement: PopupContent.PopupContentControl;

    /**
     * List of Html Element that contains all dashboards that overflow.
     */
    public _$listElement: JQuery;

    /**
     * Flag to indicate if the dashboard overflow menu is having any dashboard. This is helpful to determine
     * if we display the menu.
     */
    private isHavingOverflow: boolean;

    /**
     * Represents $(document)
     */
    private $document: JQuery;

    /**
     * Build the overflow menu. Take in option the navigateTo action to assign to every dashboardtab inside the overflow menu.
     */
    public constructor(options: IDashboardsOverflowOption) {
        super(options);

        this.$document = options.$document || $(document);
    }

    public initialize() {
        super.initialize();
        this.render();
    }

    public render() {
        var that = this;
        this.getElement().addClass(DashboardsOverflow.DropDownClass); // Get from the framework the hover feel of a button
        this.getElement().attr("title", TFS_Dashboards_Resources.MenuOverflowTooltip); //Popup

        $("<span>")
            .addClass("icon icon-ellipsis")
            .appendTo(this.getElement()); // Add the visual of the button
        this._$listElement = $("<ul>").addClass(DashboardsOverflow.OverflowListContainerClass);

        this._popupEnhancement = <PopupContent.PopupContentControl>Controls.Enhancement.enhance(PopupContent.PopupContentControl,
            this.getElement(),
            $.extend({
                cssClass: DashboardsOverflow.PopupControlClass,
                content: () => {
                    return that._$listElement;
                },
                menuContainer: this.getElement().parent(),
                elementAlign: "right-top",
                baseAlign: "right-bottom"
            }
                , {}));

        var popupFocusDelegate = () => this._closePopupIfNoFocus();

        /**
         * Open the list of dashboard inside the popup
         */
        this._popupEnhancement.getElement().bind("popup-opened", () => {
            this.getElement().addClass("menu-opened");

            // The event has to be on document because any element on the page could
            // request focus, and this event should fire in that case. Focusin had to be used
            // instead of focusout, blur, or onKeyDown for TAB because you need to know what element is gaining focus,
            // not which one is losing it, to determine if the overflow menu and its children are losing focus.
            this.$document.focusin(popupFocusDelegate);
        });

        /**
         * Hide the list of dashboard from the popup
         */
        this._popupEnhancement.getElement().bind("popup-closed", () => {
            this.getElement().removeClass("menu-opened");

            this.$document.off("focusin", popupFocusDelegate);
        });

        // Make this element focusable to listen for keyboard events
        this.getElement().parent().on("keydown", (e: JQueryEventObject) => { that.onKeyDown(e); });
    }

    /**
     * When key are pressed down, if we are the control we have some accessibility event to support.
     * We support opening and closing the menu.
     */
    public onKeyDown(e: JQueryEventObject): void {
        if (e.keyCode == Utils_UI.KeyCode.ESCAPE) {
            this._popupEnhancement.hide();
        }
        else if ($(e.target).attr('id') === L2Menu.IdOverflow) {
            switch (e.keyCode) {
                case Utils_UI.KeyCode.DOWN:
                    this._popupEnhancement.show();
                    break;
                case Utils_UI.KeyCode.UP:
                    this._popupEnhancement.hide();
                    break;
                case Utils_UI.KeyCode.ENTER:
                case Utils_UI.KeyCode.SPACE:
                    this._popupEnhancement.toggle();
                    break;
            }
        }
    }

    /**
     * Return the state of the overflow menu
     * @returns {boolean} True if dashboard in the overflow; False if not dashboard in the overflow menu
     */
    public getIsHavingOverflow(): boolean {
        return this.isHavingOverflow;
    }
    /**
     * Render a list of dashboard to be inside the overflow menu.
     * Also, this set the overflow flag.
     * @param dashboards To be added. Only overflow ones
     */
    public batchRenderInPositionOrder(dashboards: TFS_Dashboards_Contracts.DashboardGroupEntryResponse[]): void {
        this._popupEnhancement.hide();
        this._$listElement.html(''); //Flush everything, we will re-add everything in the next loop
        if (dashboards != null) {
            for (var dashboardIndex = 0; dashboardIndex < dashboards.length; dashboardIndex++) {
                var dashboard = dashboards[dashboardIndex];
                var dashboardTab = this.createDashboardTab(dashboard);
                dashboardTab.appendTo(this._$listElement);
            }
        }
        this.isHavingOverflow = dashboards != null && dashboards.length > 0;
    }

    /**
     * Checks if any of the child elements of the overflow menu have focus. If not, the menu is closed.
     */
    public _closePopupIfNoFocus(): void {
        if ($("#" + L2Menu.IdOverflow).find(":focus").length == 0) {
            this._popupEnhancement.hide();
        }
    }

    /**
     * Create the dashboard tab for the overflow menu. This need to remove all selected tab that by default we add if
     * it is the selected one.
     * @param {DashboardGroupEntryResponse} The dashboard information for the tab
     * @returns {Jquery} A created html element for the tab
     */
    public createDashboardTab(dashboardEntry: TFS_Dashboards_Contracts.DashboardGroupEntryResponse): JQuery {
        var tab = new DashboardTab(dashboardEntry, this._options.navigateToDashboard);
        var link = tab.getElement().removeClass("selected");
        return link;
    }

    /**
     * In C#, this would be an override of the base method. It adds functionnalities of the base showElement method.
     * We need to have accessibility with the tab only if this element is shown.
     */
    public show(): void {
        this.showElement();
        this.getElement().parent().attr("tabIndex", "0"); //Parent because DashboardOverflow not the container created inside it is tabbable.
    }

    /**
     * In C#, this would be an override of the base method. It adds functionnalities of the base hideElement method.
     * Remove the accessibility on the tab, otherwise we have the focus on an invisible element.
     */
    public hide(): void {
        this.hideElement();
        this.getElement().parent().removeAttr("tabIndex"); //Parent because DashboardOverflow not the container created inside it is tabbable.
    }
}

/**
 * Option for the right panel
 */
export interface DashboardsRightPanelOptions {
    /**
     * Call back that is trigged when the manager is closed
     * @param Full dashboards list. This is usefull to know if something has changed inside the manager
     */
    onDashboardManagerClosed: (dashboardsGroup?: TFS_Dashboards_Contracts.DashboardGroup) => void;

    /**
     * Show the manage button only when user has permission to manage dashboards
     */
    show: boolean;
}

/**
 * Right Panel is a floating panel at the top-right of the screen. It contains the management options
 * and later will contain the list of all dashboards
 */
export class DashboardsRightPanel extends Controls.Control<DashboardsRightPanelOptions> {

    public refreshTimer: DashboardRefreshTimer;
    public static DashboardManagerButtonId: string = "dashboard-management";

    public constructor(options?: any) {
        super(options);

    }

    public initialize() {
        super.initialize();
        this.render();
        this.registerEventWorkers();
    }

    /**
     * The button of the control that open the manager
     */
    private $buttonManagementDashboard: JQuery;

    public render() {
        var $rightPanelDivision = this.getElement();

        // If this user is admin, then we would show the dashboard manager gear button
        if (this._options.show) {
            this.$buttonManagementDashboard = $("<button>")
                .attr('id', TFS_Dashboards_Constants.DomIds.ManagerButton)
                .attr('title', TFS_Dashboards_Resources.ManageDashboardTooltip)
                .attr('aria-label', TFS_Dashboards_Resources.ManageDashboardTooltip)
                .attr('type', 'button');
            var $spanIconGear = $('<span>')
                .addClass("icon icon-header-settings");
            this.$buttonManagementDashboard.appendTo($rightPanelDivision);
            $spanIconGear.appendTo(this.$buttonManagementDashboard);
            this.attachEvents();
        }
    }

    /**
     * Attach the click and keyboard events
     */
    public attachEvents(): void {
        this._bind(this.$buttonManagementDashboard, "click", delegate(this, this.showManagementDialog));
        this.$buttonManagementDashboard.on("keydown", (e) => { this.onKeyDown(e); });
    }

    /**
     * Keying down on the control (not the container). This is important because the focus
     * is on the control (the reason that this should be attached to the parent).
     * This is for accessibility : open the manager with keyboard
     * @param {JQueryEventObject} event - Event related to the key down
     */
    public onKeyDown(e: JQueryEventObject): void {
        switch (e.keyCode) {
            case Utils_UI.KeyCode.ENTER:
            case Utils_UI.KeyCode.SPACE:
            case Utils_UI.KeyCode.DOWN:
                e.preventDefault();
                e.stopPropagation(); //Required when we press enter, otherwise it will propagate into the popup and do a save
                this.showManagementDialog();
        }
    }

    /**
     * This is executed when the user click the manager.
     */
    public showManagementDialog(): void {
        if (this.refreshTimer) {
            this.refreshTimer.stopRefreshCountdown();
        }

        VSS.using(["Dashboards/Scripts/Dialogs.DashboardManager"], (DashboardManager: typeof DashboardManager_Async) => {
            Controls.create(
                DashboardManager.DashboardsManagerDialog2,
                this.getElement(), {
                    closeCallback: this._options.onDashboardManagerClosed
                });
        });
    }

    private registerEventWorkers(): void {
        var actionSvc: Events_Action.ActionService = Events_Action.getService();
        actionSvc.registerActionWorker(TFS_Dashboards_Common.RefreshTimerEvents.ResetTimer,
            () => {
                if (this.refreshTimer) {
                    this.refreshTimer.resetRefreshCountdown();
                }
            });
        actionSvc.registerActionWorker(TFS_Dashboards_Common.RefreshTimerEvents.StopTimer,
            () => {
                if (this.refreshTimer) {
                    this.refreshTimer.stopRefreshCountdown();
                }
            });
        actionSvc.registerActionWorker(TFS_Dashboards_Common.RefreshTimerEvents.StartTimer,
            (actionArgs: any) => {
                if (!this.refreshTimer) {
                    this.refreshTimer = <DashboardRefreshTimer>Controls.Control.createIn(
                        DashboardRefreshTimer,
                        this.getElement()
                    );
                }

                this.refreshTimer.setAndStartRefreshTimer(actionArgs.refreshTime);
            });
    }
}

/**
 * Give the possibility to navigate in the L2 from the tabs
 */
export interface IDashboardsTabsOption {
    navigateToDashboard(dashboardId: string): void;
}

/**
 * Represent the section of the menu where all dashboards are contained.
 */
export class DashboardsTabs extends Controls.Control<IDashboardsTabsOption>{

    public constructor(options: IDashboardsTabsOption) {
        super(options);

    }

    public initialize() {
        super.initialize();
    }

    /**
     * Render every dashboard by creating a new tab and place each of these in position order
     * @param {DashboardGroupEntryResponse[]} List of dashboards
     */
    public batchRenderInPositionOrder(dashboards: TFS_Dashboards_Contracts.DashboardGroupEntryResponse[]): void {
        this.getElement().html(''); //Remove everything. This need to be improved for remove some flickering by removing just the necessary
        if (dashboards != null) {
            var $ulElement = this.getElement();
            for (var dashboardIndex = 0; dashboardIndex < dashboards.length; dashboardIndex++) {
                var currentIndex = dashboardIndex;
                var $tab = this.createDashboardTab(dashboards[currentIndex]);
                $tab.appendTo($ulElement);
            }
        }
    }

    /**
     * Create a dashboard tab in Html from a dashbord group entry
     * @param {DashboardGroupEntryResponse} dashboardEntry that should come from the server
     * @return {JQuery} Html element created. It represents a single tab.
     */
    public createDashboardTab(dashboardEntry: TFS_Dashboards_Contracts.DashboardGroupEntryResponse): JQuery {
        var tab = new DashboardTab(dashboardEntry, this._options.navigateToDashboard);
        return tab.getElement();
    }
}

/**
 * Reprensent a single tab for the L2Menu. This is the tab that is directly in the tabs (not in the overflow)
 */
export class DashboardTab {
    /**
     * Query String template to use for each tab link
     */
    public static QueryStringParam: string = Utils_String.format("?{0}=", TFS_Dashboards_Constants.DashboardUrlParams.ActiveDashboardId);

    /**
     * Unique identifier of the dashboard under the link
     */
    public static DashboardIdData: string = "data-dashboard-id";

    /**
     * Business Logic Model Object behind this tab
     */
    private dashboardInfo: TFS_Dashboards_Contracts.DashboardGroupEntryResponse;

    /**
     * The click event is public to the tab because this one need to be associated outside the tab
     * the reason is that the navigation logic does not belong to every tabs but is centralized in the L2Menu.
     * @param dashboardEntry {DashboardGroupEntryResponse} The dashboard information
     * @param navigateToDashboard {function} Function that is associated to the click of a tab.
     */
    private clickEvent: (dashboardId: string) => void;

    /**
     * Create a link from dashboard entry. Provide a pointer to the action to be trigged on click event.
     */
    constructor(dashboardEntry: TFS_Dashboards_Contracts.DashboardGroupEntryResponse, navigateToDashboard: (dashboardId: string) => void) {
        this.dashboardInfo = dashboardEntry;
        this.clickEvent = navigateToDashboard;
    }

    /**
    * Create a dashboard tab in Html from a dashbord group entry. The link take the full width and height of the item (li).
    * @param {DashboardGroupEntryResponse} dashboardEntry that should come from the server
    * @return {JQuery} Html element created. It represents a single tab.
    */
    public getElement(): JQuery {
        var $tab = $('<li>');
        var $tabLink = $('<a>')
            .attr('href', DashboardTab.createDashboardLink(this.dashboardInfo.id))
            .attr(DashboardTab.DashboardIdData, this.dashboardInfo.id)
            .text(this.dashboardInfo.name);

        var activeDashboardId = TFS_Dashboards_Common.DashboardPageExtension.getActiveDashboard();
        if (activeDashboardId === this.dashboardInfo.id) {
            $tab.addClass("selected");
        }

        $tabLink.click((e) => {
            this.clickEvent(this.dashboardInfo.id);
            e.preventDefault();
        });

        $tabLink.appendTo($tab);
        return $tab;
    }

    /**
    * Create the URL for a tab from its dashboard id.
    * @return {string} Return a full absolute url
    */
    public static createDashboardLink(dashboardId: string): string {
        var context = TFS_Host_TfsContext.TfsContext.getDefault();
        return context.getActionUrl() + DashboardTab.QueryStringParam + dashboardId;
    }
}

/**
 * Interface that allows to pass a reference of the parent container to the inline editor. This give a pointer
 * to the container to be able to dynamically add new tabs into this one.
 */
export interface IDashboardsInlineEditorPanelOption {
    /**
     * Reference to the tab container. This is where inline add tabs.
     */
    tabContainer: DashboardsTabs;

    /**
     * Return the highest position value from all dashboards available
     */
    getMaxPosition(): number;

    /**
     * Indicate if the menu can add more dashboard
     */
    canAddDashboard(): boolean;

    /**
     * When saving, we take the response from the server and add it into the collection
     * @param dashboard to add
     */
    addDashboard(dashboard: TFS_Dashboards_Contracts.DashboardGroupEntryResponse);

    /**
    * Indicates if the given name is unique among existing dashboards.
    * @return True if given name is unique. False if not
    */
    validateDashboardNameIsUnique(name: string): boolean;

    /**
     * The maximum number of tabs in the menu
     */
    maxTabs: number;

    /**
     * Navigate to dashboard by setting the ID and moving this one into the new one
     * @param dashboardId Guid of the dashboard
     */
    navigateToDashboard(dashboardId: string): void;
}

/**
 * Represent the editable part of the L2 menu.
 * This one contains an input box which has a custom placeholder logic to replicate what VSO's search textbox has.
 * The control has a single button to add and the close (same Html element).
 */
export class DashboardsInlineEditorPanel extends Controls.Control<IDashboardsInlineEditorPanelOption>{

    /**
     * This should remain private.  Allows to have a degree of speration with the server. This is the max number of characters for a dashboard name.
     */
    public static MaxDashboardNameLength: number = TFS_Dashboards_Constants.DashboardWidgetLimits.MaxDashboardNameLength;

    /**
     * This should remain private.  Allows to have a degree of speration with the server. This is the max number dashboard that we support.
     */
    private static MaxDashboardCount: number = TFS_Dashboards_Common.DashboardPageExtension.getMaxDashboardsPerGroup();

    /**
     * Unique identifier for the ADD/Cancel button.
     */
    public static IdAddButton: string = "dashboard-inline-add";

    /**
     * Unique identifier for entering the name of the dashboard
     */
    public static IdTextboxInput: string = "dashboard-inline-textbox";

    /**
     * Class added when the input inline is showed
     */
    public static InputOpenClass: string = "show-input-inline";

    /**
     * Class used when the input is not showed
     */
    public static InputHideClass: string = "hide-input-inline";

    /**
     * Class that we had when we have the focus on the textbox underneat this control. Required because otherwise the focus
     * is set automatically to the textbox and not this custom control.
     */
    public static FocusClass: string = "focus";

    /**
     * Must remain private. The only class that can handle the input textbox is the inline editor itself.
     */
    private $inputDashboardName: JQuery;

    /**
     * Must remain private. The only class that can handle the + and X buttons is the inline editor itself.
     */
    private $buttonAddDashboard: JQuery;

    /**
     * Options for the inline editor
     */
    private optionInlineEditorPanel: IDashboardsInlineEditorPanelOption;

    /**
     * Create a new dashboard editor.
     * @param {IDashboardsInlineEditorPanelOption} options that are required.
     */
    public constructor(options: IDashboardsInlineEditorPanelOption) {
        super(options);
        if (this._options.tabContainer == null) {
            throw new Error("TabContainer required");
        }
    }

    /**
     * Render the inline editor of the L2 menu.
     */
    public initialize() {
        super.initialize();
        this.render();
    }

    /**
     * Render the controls which contains a textbox to add the new name of the dashboard, a button to activate the control and a button to save.
     */
    public render() {
        var $l2Navigation = this.getElement();
        var infoInput = TFS_Dashboards_Resources.MenuDashboardNamePlaceHolder;

        this.$inputDashboardName = $("<input>")
            .attr('id', DashboardsInlineEditorPanel.IdTextboxInput)
            .attr('type', 'text')
            .attr('value', '')
            .attr('maxlength', DashboardsInlineEditorPanel.MaxDashboardNameLength)
            .attr('style', 'display:none') //We set the style and not a class because JQuery fadeIn/fadeOut plays with that attribute
            .attr('placeholder', infoInput)
            .attr('title', infoInput)
            .addClass(DashboardsInlineEditorPanel.InputHideClass);
        this.$inputDashboardName.appendTo($l2Navigation);

        this.$buttonAddDashboard = $("<button>")
            .attr('id', DashboardsInlineEditorPanel.IdAddButton)
            .attr('title', TFS_Dashboards_Resources.MenuAddNewDashboard)
            .attr('type', 'button');
        var $spanIcon = $('<span>')
            .addClass("bowtie-icon bowtie-math-plus");
        $spanIcon.appendTo(this.$buttonAddDashboard);
        $spanIcon.appendTo(this.$buttonAddDashboard);
        this.$buttonAddDashboard.appendTo($l2Navigation);
        this.bindControlsActions(this.$buttonAddDashboard, this.$inputDashboardName);
    }

    /**
     * Bind actions on several controls. These are regrouped into a single method because they are interacting to each other states.
     * @param {Jquery} buttonAddDashboard - The add button needs to open and close the editor.
     * @param {Jquery} inputDashboardName - The save button needs to save the new dashboard.
     */
    public bindControlsActions($buttonAddDashboard: JQuery, $inputDashboardName: JQuery): void {
        var that = this;

        $buttonAddDashboard.on("click", (e) => { this.onClickToggleAddButton(e); });
        $inputDashboardName.on("focus", (e) => { this.onFocusTextbox(e); });
        $inputDashboardName.on("keydown", (e) => { this.onKeyDownTextBox(e); });

        //The code below replace the "blur" on the inputDashboardName. The reason is that we want to be able to cancel by clicking a button which
        //would raise the blur event first which we do not want in the case of clicking a cancel button.
        $(window.document.body).click(function (event) {
            if (that.isOpen()) //Only if the editor is open
            {
                that.handleClickedEvents($(event.target), event);
            }
        });
    }

    /**
     * Get newly entered dashboard name
     * @returns {string} Empty string if no character is there or entered string
     */
    private getDashboardName(): string {
        return this.$inputDashboardName.val();
    }

    /**
     * Removes focus class on L2 Navigation
     */
    private removeFocusOnL2Navigation(): void {
        var $l2Navigation = this.getElement();
        $l2Navigation.removeClass(DashboardsInlineEditorPanel.FocusClass);
    }

    /**
    * When ENTER is pressed, Save dashboard if dashboard name is valid
    * When ESCAPE is pressed, Close editor and show ADD button
    * When TAB is pressed, Save dashboard if dashboard name is valid
    * When DELETE or BACKSPACE is pressed, Decide if placeholder text should be shown after last character is removed
    * @param {JQueryEventObject} jqueryEvent used to get keyCode
    */
    public onKeyDownTextBox(jqueryEvent: JQueryEventObject): void {
        switch (jqueryEvent.keyCode) {
            case Utils_UI.KeyCode.TAB:
                this.onLostFocusTextbox("Save by pressing TAB");
                break;
            case Utils_UI.KeyCode.ENTER:
                this.onLostFocusTextbox("Save by pressing Enter key");
                break;
            case Utils_UI.KeyCode.ESCAPE:
                this.removeFocusOnL2Navigation();
                TFS_Dashboards_Telemetry.DashboardsTelemetry.onInlineEditorButton("Cancel by pressing Escape key");
                if (this.$inputDashboardName) {
                    this._closeInlineEditor();
                }
                break;
            case Utils_UI.KeyCode.BACKSPACE:
            case Utils_UI.KeyCode.DELETE:
                // Checking against 1 because this character is going to be deleted right now
                if (this.getDashboardName().length === 1 && this.$inputDashboardName.attr('placeholder') === undefined) {
                    this.$inputDashboardName.attr('placeholder', TFS_Dashboards_Resources.MenuDashboardNamePlaceHolder);
                }
                break;
        }
    }

    /**
     * Handle different click elements
     * @param {JQuery} clickedElement - The clicked element
     * @param {JQueryEventObject} event - Event related to the click
     */
    public handleClickedEvents(clickedElement: JQuery, event: JQueryEventObject): void {
        var clickedElementId = clickedElement.attr('id');
        if (clickedElementId === DashboardsInlineEditorPanel.IdTextboxInput) {
            clickedElement.removeAttr('placeholder');
        } else if (clickedElementId === DashboardsInlineEditorPanel.IdAddButton) { // We do not do the blur on the Add/Cancel button
            this.onClickToggleAddButton(event);
        } else {
            this.onLostFocusTextbox("Save by losing focus");
        }
    }

    /**
     * Ensure to stop propagation. This is required, otherwise we have the global click event that will be trigged
     * and will create a double-click which will close the editor.
     * @param {JQueryEventObject} event - The click event
     */
    private onClickToggleAddButton(event: JQueryEventObject): any {
        event.preventDefault();
        event.stopPropagation(); // Required otherwise the global click is executed and this one try to save.
        this.toggleAddButton();
    }

    /**
     * Verify if the current control is open
     * @returns {boolean} True if open, false if not open
     */
    public isOpen(): boolean {
        return this.getElement()
            .find('#' + DashboardsInlineEditorPanel.IdTextboxInput)
            .hasClass(DashboardsInlineEditorPanel.InputOpenClass);
    }

    /**
     * Need to set a class to the inline container to have a way to notify the focus. This is a limitation of CSS3.
     * @param {JQueryEventObject} jqueryEvent Not used but in the Jquery click action
     */
    public onFocusTextbox(jqueryEvent: JQueryEventObject): void {
        var $l2Navigation = this.getElement();
        $l2Navigation.addClass(DashboardsInlineEditorPanel.FocusClass);
    }

    /**
     * Remove the class given in focus in. This is used to handle some advanced CSS scenario like the background color of the input which blends
     * with the right button 'X'.
     * Also used to automatically save the dashboard
     * @param {string} telemetryMessage - Message to send for telemetry
     */
    public onLostFocusTextbox(telemetryMessage: string): void {
        this.removeFocusOnL2Navigation();
        if (this.validateAddDashboard()) {
            TFS_Dashboards_Telemetry.DashboardsTelemetry.onInlineEditorButton(telemetryMessage);
            this.saveDashboard();
        }
        this._closeInlineEditor(); // Always close (specs)
    }

    /**
     * Toggle the Add button from "Collapse inline editor" to "Expand inline editor" and vice-versa.
     */
    public toggleAddButton(): void {
        if (this.isOpen()) {
            TFS_Dashboards_Telemetry.DashboardsTelemetry.onInlineEditorButton("Cancel by pressing X button");
            this._closeInlineEditor();
        }
        else {
            TFS_Dashboards_Telemetry.DashboardsTelemetry.onInlineEditorButton("Show the inline editor by pressing the + button");
            this.openInlineEditor();
        }
    }

    /**
     * Show the input textbox to enter a dashboard name
     */
    private openInlineEditor(): void {
        var $input = this.$inputDashboardName;
        var $buttonAdd = this.$buttonAddDashboard;
        $input.show();                              // Display-Inline Block
        $input.removeClass(DashboardsInlineEditorPanel.InputHideClass);    // Remove the width of 0. This is required for the animation effect of sliding
        $input.addClass(DashboardsInlineEditorPanel.InputOpenClass);       // Set back the width to the desired maximum value. This will pass from 0 to X with a CSS animation
        $input.val('');                             // Reset the value to nothing
        if ($input.attr('placeholder') === undefined) {     // After the placeholder was removed, adding it again if user opens the editor
            $input.attr('placeholder', TFS_Dashboards_Resources.MenuDashboardNamePlaceHolder);
        }
        $buttonAdd.addClass("add-to-close");        // CSS3 animation to move the Add button to a Close button
        $buttonAdd.attr('title', TFS_Dashboards_Resources.MenuCancelNewDashboard);
        $input.focus();
    }

    /**
     * Validate the trimmed Dashboard Name is not empty
     * @return { boolean } FALSE if dashboard name is empty.TRUE if not
     */
    public _isDashboardNameNotEmpty(): boolean {
        var displayNameDashboardFromInput = this.getDashboardName();
        return displayNameDashboardFromInput.trim() !== "";
    }

    /**
     * Hide the dashboard name + ensure we do not display the save button
     */
    public _closeInlineEditor(): void {
        var $input = this.$inputDashboardName;
        var $buttonAdd = this.$buttonAddDashboard;
        $input.removeClass(DashboardsInlineEditorPanel.InputOpenClass);   // Remove the size of the textbox
        $input.addClass(DashboardsInlineEditorPanel.InputHideClass)
            .hide();
        $buttonAdd.removeClass("add-to-close");     // Start a CSS3 animation to Close button to Add button
    }

    /**
     * Change the appearance of the ADD button to disable if no dashboard can be added.
     * This method is trigged by anyone who change the amount of dashboard which will re-evaluate if
     * it is possible to add or not more dashboard and change the editor in consequence.
     */
    public onDashboardCountChange(): void {
        var canAddDashboard = this._options.canAddDashboard();
        this.$buttonAddDashboard.prop('disabled', !canAddDashboard);
        var titleMessage = canAddDashboard ?
            TFS_Dashboards_Resources.MenuAddNewDashboard :
            Utils_String.format(TFS_Dashboards_Resources.ErrorCreateDashboardTooManyDashboard, DashboardsInlineEditorPanel.MaxDashboardCount);

        this.$buttonAddDashboard.attr('title', titleMessage);

        if (!canAddDashboard) {
            this._closeInlineEditor();
        }
    }

    /**
     * Sets dashboard name to empty string
     */
    private clearDashboardName(): void {
        this.$inputDashboardName.val("");
    }

    /**
     * Validate the Dashboard Name. We do not trim the name because trailing white-space and forward white-space are accepted on the server.
     * Also sends telemetry in case of non unique dashboard names
     * @return {boolean} FALSE if dashboard name is (null or undefined or) empty or not unique. TRUE if unique
     */
    public _isDashboardNameUnique(): boolean {
        var displayNameDashboardFromInput = this.getDashboardName();

        if (!displayNameDashboardFromInput) {
            return false;
        }

        if (this._options.validateDashboardNameIsUnique(displayNameDashboardFromInput)) {
            return true;
        }
        TFS_Dashboards_Errors.DashboardMessageArea.setMessage(Controls_Notifications.MessageAreaType.Error, TFS_Dashboards_Resources.ErrorCreateDashboardNameAlreadyExists);
        TFS_Dashboards_Telemetry.DashboardsTelemetry.onDashboardError("newDashboardName", TFS_Dashboards_Resources.ErrorCreateDashboardNameAlreadyExists);
        return false;
    }

    /**
     * Validate the dasboard count of tabs/dashboard.
     * Also sends telemetry in case dashboard count exceeds limit
     * @return {boolean} TRUE if dashboard count is within range otherwise FALSE
     */
    public _isDashboardCountInRange(): boolean {
        if (this._options.canAddDashboard()) {
            return true;
        }
        var message = Utils_String.format(TFS_Dashboards_Resources.ErrorCreateDashboardTooManyDashboard, this._options.maxTabs);
        TFS_Dashboards_Errors.DashboardMessageArea.setMessage(Controls_Notifications.MessageAreaType.Error, message);
        TFS_Dashboards_Telemetry.DashboardsTelemetry.onDashboardError("dashboardLimit", message);
        return false;
    }

    /**
     * Validates whether new dashboard name is not same as existing names
     * And whether dashboard count is within valid range
     * @returns {boolean} TRUE if dashboard name is valid and count is within range otherwise FALSE
     */
    public validateAddDashboard(): boolean {
        return this._isDashboardNameNotEmpty() && this._isDashboardNameUnique() && this._isDashboardCountInRange();
    }

    /**
    * Save the dashboard
    */
    public saveDashboard(): void {
        var dashboardName = this.getDashboardName();
        this.clearDashboardName(); // Required because we do not want to save twice

        this._saveDashboardOnServer(dashboardName).then(
            (e) => {
                this.onSaveDashboardSucceeded(e);
            },
            (e) => {
                this.onSaveDashboardFailure(e);
            });
    }

    /**
     * When the dashboard is saved successfully, this method is called. It allows to add the dashboard into the client and
     * to navigate to it. Change the url is done by the navigateToDashboard method.
     * @param {DashboardGroupEntryResponse} newDashboardFromServer - Dashboard information from the server (ID for example)
     *
     */
    public onSaveDashboardSucceeded(newDashboardFromServer: TFS_Dashboards_Contracts.DashboardGroupEntryResponse): void {
        TFS_Dashboards_Telemetry.DashboardsTelemetry.onCreateDashboard(newDashboardFromServer.id, newDashboardFromServer.position);

        this._options.addDashboard(newDashboardFromServer);
        this._options.navigateToDashboard(newDashboardFromServer.id);
        this.onDashboardCountChange();//Required if we save the last possible dashboard to add to ensure the inline editor close + disable
    }

    /**
     * Response from the server when saving fail of a new dashboard
     * @param {TfsError} error - Contains detailed error information
     */
    public onSaveDashboardFailure(error: TfsError): void {
        var errorMessage: string;
        if (error.message) {
            errorMessage = Utils_String.format(TFS_Dashboards_Resources.ErrorMessage_CreateNewDashboard_Details, error.message);
        }
        else {
            // Not sure if we can ever get a falsy message but leaving the original message here just in case. Ideally, all server exception messages are descriptive enough to
            // display to the user. We should also consider exception type mapping to client "friendly" messages where the messages don't make sense to show.
            errorMessage = Utils_String.format(TFS_Dashboards_Resources.ErrorMessage_CreateNewDashboard, 1, DashboardsInlineEditorPanel.MaxDashboardNameLength, this._options.maxTabs);
        }

        TFS_Dashboards_Errors.DashboardMessageArea.setMessage(Controls_Notifications.MessageAreaType.Error, errorMessage);
        TFS_Dashboards_Telemetry.DashboardsTelemetry.onDashboardError("saveDashboard(server side)", error.message);
    }

    /**
     * Send a HTTP call to the server to save the widget
     * @param {string} displayNameDashboardFromInput - the name of the new dashboard
     */
    public _saveDashboardOnServer(displayNameDashboardFromInput: string) {
        var tfsContext = Context.getDefaultWebContext();
        var teamContext = TFS_Dashboards_Common.getDashboardTeamContext();

        var projectId = tfsContext.project.id;
        var teamId = teamContext.id;
        var httpApi = TFS_Dashboards_Common.DashboardHttpClientFactory.getClient();
        var position = this._options.getMaxPosition() + 1;
        var dashboardObjectToSave: TFS_Dashboards_Contracts.DashboardGroupEntry = {
            id: null,
            name: displayNameDashboardFromInput,
            position: position,
            refreshInterval: 0,
            eTag: null,
            _links: null,
            widgets: null,
            url: null,
            description: null,
            ownerId: null
        };
        var postDashboardsPromise = httpApi.createDashboard(dashboardObjectToSave, TFS_Dashboards_Common.getTeamContext());
        return postDashboardsPromise;
    }

    /**
     * Disable the element by sending the control to disable and also changing its visual appareance.
     * @param {JQuery} $element - The Html element that contain an icon
     * @param {boolean} disabled - True to disable the control, false to enable it.
     */
    private htmlElementWithIconState($element: JQuery, disabled: boolean): void {
        $element.prop("disabled", disabled);
        $element.find('.icon').css('opacity', disabled ? .4 : 1);
    }

    /**
     * Return if the dashboard text box has some entry not saved yet.
     * @returns {boolean} True if text change and visible , false if empty.
     */
    public hasDashboardInputDirty(): boolean {
        return this.getElement().is(':visible') && this.$inputDashboardName.val() !== "";
    }
}

export interface DashboardsInlineEditorDialogOptions extends Controls_Dialogs.IModalDialogOptions, IDashboardsInlineEditorPanelOption {
}

export class DashboardsInlineEditorDialog extends Controls_Dialogs.ModalDialogO<DashboardsInlineEditorDialogOptions> {
    private $inputDashboardName: JQuery;
    private error: Controls_Notifications.MessageAreaControl;

    public initializeOptions(options?: DashboardsInlineEditorDialogOptions) {
        super.initializeOptions($.extend({
            coreCssClass: "new-dashboard-dialog",
            title: TFS_Dashboards_Resources.MenuAddNewDashboard,
            resizable: false,
            draggable: true,
            width: 400,
            height: 200,
            useBowtieStyle: true
        }, options));
    }

    initialize(): void {
        super.initialize();

        let $fieldSet = $("<fieldset />").appendTo(this.getElement());

        $("<label />").text(TFS_Dashboards_Resources.NewDashboardLabelName).appendTo($fieldSet);

        var infoInput = TFS_Dashboards_Resources.MenuDashboardNamePlaceHolder;
        this.$inputDashboardName = $("<input>")
            .attr('id', DashboardsInlineEditorPanel.IdTextboxInput)
            .attr('type', 'text')
            .attr('value', '')
            .attr('maxlength', DashboardsInlineEditorPanel.MaxDashboardNameLength)
            .attr('placeholder', infoInput)
            .appendTo($fieldSet);

        this.$inputDashboardName.focus();

        this.error = Controls.Control.create(
            Controls_Notifications.MessageAreaControl,
            this.getElement(), {
                showIcon: true,
                closeable: false
            });

        this._bind(this.$inputDashboardName, "input", (e: JQueryEventObject) => {
            this.clearError();
            this.updateOkButton(this._isDashboardNameNotEmpty());
        });
    }

    /**
     * Validate the trimmed Dashboard Name is not empty
     * @return { boolean } FALSE if dashboard name is empty, TRUE if not
     */
    public _isDashboardNameNotEmpty(): boolean {
        var displayNameDashboardFromInput = this.getDashboardName();
        return displayNameDashboardFromInput.trim() !== "";
    }

    private setError(message: string): void {
        this.error.setError(message);

        Utils_Accessibility.announce(message, true /*assertive*/);
    }

    private clearError(): void {
        this.error.clear();
    }

    /**
     * Get newly entered dashboard name
     * @returns {string} Empty string if no character is there or entered string
     */
    private getDashboardName(): string {
        return this.$inputDashboardName.val();
    }


    /**
     * Validates whether new dashboard name is not same as existing names
     * And whether dashboard count is within valid range
     * @returns {boolean} TRUE if dashboard name is valid and count is within range otherwise FALSE
     */
    public validateAddDashboard(): boolean {
        return this._isDashboardNameNotEmpty() && this._isDashboardNameUnique() && this._isDashboardCountInRange();
    }

    /**
     * Validate the Dashboard Name. We do not trim the name because trailing white-space and forward white-space are accepted on the server.
     * Also sends telemetry in case of non unique dashboard names
     * @return {boolean} FALSE if dashboard name is (null or undefined or) empty or not unique. TRUE if unique
     */
    public _isDashboardNameUnique(): boolean {
        var displayNameDashboardFromInput = this.getDashboardName();

        if (!displayNameDashboardFromInput) {
            return false;
        }

        if (this._options.validateDashboardNameIsUnique(displayNameDashboardFromInput)) {
            return true;
        }
        this.setError(TFS_Dashboards_Resources.ErrorCreateDashboardNameAlreadyExists);
        TFS_Dashboards_Telemetry.DashboardsTelemetry.onDashboardError("newDashboardName", TFS_Dashboards_Resources.ErrorCreateDashboardNameAlreadyExists);
        return false;
    }

    /**
     * Validate the dasboard count of tabs/dashboard.
     * Also sends telemetry in case dashboard count exceeds limit
     * @return {boolean} TRUE if dashboard count is within range otherwise FALSE
     */
    public _isDashboardCountInRange(): boolean {
        if (this._options.canAddDashboard()) {
            return true;
        }
        var message = Utils_String.format(TFS_Dashboards_Resources.ErrorCreateDashboardTooManyDashboard, this._options.maxTabs);
        this.setError(message);
        TFS_Dashboards_Telemetry.DashboardsTelemetry.onDashboardError("dashboardLimit", message);
        return false;
    }

    /**
     * When the dashboard is saved successfully, this method is called. It allows to add the dashboard into the client and
     * to navigate to it. Change the url is done by the navigateToDashboard method.
     * @param {DashboardGroupEntryResponse} newDashboardFromServer - Dashboard information from the server (ID for example)
     *
     */
    public onSaveDashboardSucceeded(newDashboardFromServer: TFS_Dashboards_Contracts.DashboardGroupEntryResponse): void {
        Utils_Accessibility.announce(TFS_Dashboards_Resources.DashboardInlineEditor_AnnounceSuccessfullyCreatedMessage, true);
        TFS_Dashboards_Telemetry.DashboardsTelemetry.onCreateDashboard(newDashboardFromServer.id, newDashboardFromServer.position);

        this._options.addDashboard(newDashboardFromServer);
        this._options.navigateToDashboard(newDashboardFromServer.id);
    }

    /**
     * Response from the server when saving fail of a new dashboard
     * @param {TfsError} error - Contains detailed error information
     */
    public onSaveDashboardFailure(error: TfsError): void {
        var errorMessage: string;
        if (error.message) {
            errorMessage = Utils_String.format(TFS_Dashboards_Resources.ErrorMessage_CreateNewDashboard_Details, error.message);
        }
        else {
            // Not sure if we can ever get a falsy message but leaving the original message here just in case. Ideally, all server exception messages are descriptive enough to
            // display to the user. We should also consider exception type mapping to client "friendly" messages where the messages don't make sense to show.
            errorMessage = Utils_String.format(TFS_Dashboards_Resources.ErrorMessage_CreateNewDashboard, 1, DashboardsInlineEditorPanel.MaxDashboardNameLength, this._options.maxTabs);
        }

        this.setError(errorMessage);
        TFS_Dashboards_Telemetry.DashboardsTelemetry.onDashboardError("saveDashboard(server side)", error.message);
    }

    /**
      * Send a HTTP call to the server to save the widget
      * @param {string} displayNameDashboardFromInput - the name of the new dashboard
      */
    public _saveDashboardOnServer(displayNameDashboardFromInput: string) {
        var tfsContext = Context.getDefaultWebContext();
        var teamContext = TFS_Dashboards_Common.getDashboardTeamContext();

        var projectId = tfsContext.project.id;
        var teamId = teamContext.id;
        var httpApi = TFS_Dashboards_Common.DashboardHttpClientFactory.getClient();
        var position = this._options.getMaxPosition() + 1;
        var dashboardObjectToSave: TFS_Dashboards_Contracts.DashboardGroupEntry = {
            id: null,
            name: displayNameDashboardFromInput,
            position: position,
            refreshInterval: 0,
            eTag: null,
            _links: null,
            widgets: null,
            url: null,
            description: null,
            ownerId: null
        };
        var postDashboardsPromise = httpApi.createDashboard(dashboardObjectToSave, TFS_Dashboards_Common.getTeamContext());
        return postDashboardsPromise;
    }

    onOkClick(e?: JQueryEventObject): any {
        if (this.validateAddDashboard()) {
            this.updateOkButton(false);

            var dashboardName = this.getDashboardName();
            TFS_Dashboards_Telemetry.DashboardsTelemetry.onInlineEditorButton("Saving dashboard using dialog");

            this._saveDashboardOnServer(dashboardName).then(
                (dashboard) => {
                    this.onSaveDashboardSucceeded(dashboard);
                    this.close();
                },
                (e) => {
                    if (e.status === 403 /* permission */) {
                        var message = Utils_String.format(TFS_Dashboards_Resources.ErrorMessage_PermissionDenied,
                            `<a onclick='location.reload(true)' href='${window.location.href}'>${TFS_Dashboards_Resources.Refresh_Link}</a>`);
                        TFS_Dashboards_Errors.DashboardMessageArea.setMessage(Controls_Notifications.MessageAreaType.Error, message, true);
                        this.close();
                        return;
                    }
                    this.onSaveDashboardFailure(e);
                    this.updateOkButton(true);
                });
        }
    }
}

/**
 * Option for the left panel
 */
export interface DashboardsLeftPanelOptions {
    hubs: Hub[];
}

export class DashboardsLeftPanel extends Controls.Control<DashboardsLeftPanelOptions> {
    private hubs: Hub[];

    public constructor(options: DashboardsLeftPanelOptions) {
        super(options);
        if (options.hubs && options.hubs.length > 0) {
            this.hubs = options.hubs;
        }
    }

    public initialize() {
        super.initialize();
        this.render();
    }

    public render() {
        var hubContainer = $("<ul>");
        var hubRendered: number = 0;
        if (this.hubs && this.hubs.length > 0) {
            this.hubs.forEach((h: Hub) => {
                if (h.id != TFS_Dashboards_Resources.HubTitle) {
                    var $hubElement = $("<li></li>")
                        .data("hubid", h.id)
                        .appendTo(hubContainer);

                    if (h.isSelected) {
                        $hubElement.addClass("selected");
                    }

                    // Create the link
                    $("<a>").attr("id", h.id)
                        .text(h.name)
                        .attr("href", h.uri)
                        .appendTo($hubElement);
                    hubRendered++;
                }
            });

            // Add the divider if we have at least one hub rendered
            // We are doing this because we would skip rendering of the Dashboard hub
            if (hubRendered > 0) {
                var $dividerDiv = $("<div>")
                    .addClass("L2-hub-title-separator")
                    .text("|");
                hubContainer.append($("<li>").append($dividerDiv));
            }
            hubContainer.appendTo(this.getElement());
        }
    }
}
