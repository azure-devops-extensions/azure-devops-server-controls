//  VSS
import VSS = require("VSS/VSS");
import Diag = require("VSS/Diag");
import Controls = require("VSS/Controls");
import Menus = require("VSS/Controls/Menus");
import Navigation = require("VSS/Controls/Navigation");
import ControlsSearch = require("VSS/Controls/Search");
import Events_Action = require("VSS/Events/Action");
import Service = require("VSS/Service");

//  Agile
import BoardAutoRefreshCommon = require("Agile/Scripts/Board/BoardsAutoRefreshCommon");
import BoardViewToolbarContracts = require("Agile/Scripts/Board/Common/BoardViewToolbarContracts");
import TFS_Agile = require("Agile/Scripts/Common/Agile");
import AgileControls = require("Agile/Scripts/Common/Controls");
import CustomerIntelligenceConstants = require("Agile/Scripts/Common/CustomerIntelligence");
import AgileControlsResources = require("Agile/Scripts/Resources/TFS.Resources.AgileControls");
import BoardResources = require("Agile/Scripts/Resources/TFS.Resources.AgileTaskboard");
import Boards = require("Agile/Scripts/TFS.Agile.Boards");
import { EmbeddedHelper } from "Agile/Scripts/Common/EmbeddedHelper";
import { ScopedEventHelper } from "Agile/Scripts/ScopedEventHelper";

//  Engagement
import QS_UI_NO_REQUIRE = require("Engagement/QuickStart/UI");

//  Presentation
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");

//  TFS
import TFS_Core_Contracts = require("TFS/Core/Contracts");
import Work_WebApi = require("TFS/Work/RestClient");
import { ITeam } from "Agile/Scripts/Models/Team";

const eventActionService = Events_Action.getService();

export interface ILegacyBoardToolbarOptions {
    boardId: string;
    boardExtensionId: string;
    initialAutoRefreshState: BoardAutoRefreshCommon.AutoRefreshState;
    eventsHelper: ScopedEventHelper;
    team: ITeam;
}

export class LegacyBoardToolbarHelper {

    private _toolbar: Menus.MenuBar;
    private _boardSearchControl: ControlsSearch.ToggleSearchBoxControl;
    private _autoRefreshCommandSettings: BoardAutoRefreshCommon.AutoRefreshCommandSettings;
    private _boardRefreshNotificationControl: QS_UI_NO_REQUIRE.Bubble;

    //  Delegates
    private _updateMenuItemDelegate: Function;
    private _boardShowManualRefreshDelegate: Function;
    private _boardHideManualRefreshDelegate: Function;
    private _boardFilterUpdatedDelegate: Function;

    //  Options
    private _boardId: string;
    private _initialAutoRefreshState: BoardAutoRefreshCommon.AutoRefreshState;
    private _boardExtensionId: string;
    private _eventsHelper: ScopedEventHelper;
    private _team: ITeam;

    //  Commands
    private static _fullScreenCommand: string = "fullscreen-toggle";
    private static _refreshBoardCommand: string = "refresh-board";
    private static _refreshNotification: string = "auto-refresh-notification";
    private static _toggleAutoRefreshStateCommand: string = "toggle-auto-refresh-state";

    constructor(options: ILegacyBoardToolbarOptions) {
        Diag.Debug.assert(!!options.eventsHelper, "EventsHelper is null.");
        this._eventsHelper = options.eventsHelper;
        this._initializeOptions(options);
        this._createMenubar();
        this._attachEvents();
        this._initializeAutoRefreshCommand();

        //  Fire an initial inquiry for search data set completeness.
        //  This is trying to safe users an unnecessary click on the search icon.
        this._eventsHelper.fire(BoardViewToolbarContracts.Notifications.BoardMembersDataSetCompleteInquiry);
    }

    public dispose() {
        if (this._toolbar) {
            this._toolbar.dispose();
            this._toolbar = null;
        }

        if (this._boardSearchControl) {
            this._boardSearchControl.dispose();
            this._boardSearchControl = null;
        }

        if (this._boardRefreshNotificationControl) {
            this._boardRefreshNotificationControl.dispose();
            this._boardRefreshNotificationControl = null;
        }

        this._detachEvents();
    }

    private _attachEvents(): void {

        //  Notification:   BoardToolbarMenuItemNeedsUpdate
        this._updateMenuItemDelegate = (eventArgs: BoardViewToolbarContracts.IKnownToolbarMenuItemUpdateEventArgs) => {
            this._updateCommandState(eventArgs);
        };

        this._eventsHelper.attachEvent(
            BoardViewToolbarContracts.Notifications.BoardToolbarMenuItemNeedsUpdate,
            this._updateMenuItemDelegate);

        //  Notification:   BoardShowManualRefresh
        this._boardShowManualRefreshDelegate = (eventArgs: BoardViewToolbarContracts.IBoardShowManualRefreshEventArgs) => {
            this._updateCommandState(<BoardViewToolbarContracts.IKnownToolbarMenuItemUpdateEventArgs>
                {
                    id: LegacyBoardToolbarHelper._refreshBoardCommand,
                    hidden: false
                }
            );

            //  Create the bubble control to show manual refresh message, only if it has not been created already.
            if (!this._boardRefreshNotificationControl) {
                this._createBoardRefreshNotificationControl(eventArgs.message, eventArgs.eventName);
            }
        };

        this._eventsHelper.attachEvent(
            BoardViewToolbarContracts.Notifications.BoardShowManualRefresh,
            this._boardShowManualRefreshDelegate);

        //  Notification:   BoardHideManualRefresh
        this._boardHideManualRefreshDelegate = () => {
            this._updateCommandState(<BoardViewToolbarContracts.IKnownToolbarMenuItemUpdateEventArgs>
                {
                    id: LegacyBoardToolbarHelper._refreshBoardCommand,
                    hidden: true
                }
            );

            if (this._boardRefreshNotificationControl) {
                this._boardRefreshNotificationControl.dispose();
                this._boardRefreshNotificationControl = null;
            }

            this._getRefreshNotificationDismissButtonElement().off("click");
        };

        this._eventsHelper.attachEvent(
            BoardViewToolbarContracts.Notifications.BoardHideManualRefresh,
            this._boardHideManualRefreshDelegate);

        //  Notification:   BoardFilterUpdated
        this._boardFilterUpdatedDelegate = (sender: any, eventArgs: BoardViewToolbarContracts.IBoardFilterUpdated) => {
            this._boardFilterUpdated(eventArgs);
        };

        this._eventsHelper.attachEvent(
            BoardViewToolbarContracts.Notifications.BoardFilterUpdated,
            this._boardFilterUpdatedDelegate);
    }

    private _detachEvents(): void {

        //  Notification:   BoardToolbarMenuItemNeedsUpdate
        if (this._updateMenuItemDelegate) {
            this._eventsHelper.detachEvent(
                BoardViewToolbarContracts.Notifications.BoardToolbarMenuItemNeedsUpdate,
                this._updateMenuItemDelegate);
            this._updateMenuItemDelegate = null;
        }

        //  Notification:   BoardShowManualRefresh
        if (this._boardShowManualRefreshDelegate) {
            this._eventsHelper.detachEvent(
                BoardViewToolbarContracts.Notifications.BoardShowManualRefresh,
                this._boardShowManualRefreshDelegate);
            this._boardShowManualRefreshDelegate = null;
        }

        //  Notification:   BoardHideManualRefresh
        if (this._boardHideManualRefreshDelegate) {
            this._eventsHelper.detachEvent(
                BoardViewToolbarContracts.Notifications.BoardHideManualRefresh,
                this._boardHideManualRefreshDelegate);
            this._boardHideManualRefreshDelegate = null;
        }

        if (this._boardFilterUpdatedDelegate) {
            this._eventsHelper.detachEvent(
                BoardViewToolbarContracts.Notifications.BoardFilterUpdated,
                this._boardFilterUpdatedDelegate);
            this._boardFilterUpdatedDelegate = null;
        }
    }

    private _initializeOptions(options: ILegacyBoardToolbarOptions): void {
        this._boardId = options.boardId;
        this._boardExtensionId = options.boardExtensionId;
        this._initialAutoRefreshState = options.initialAutoRefreshState;
        this._team = options.team;
    }

    private _updateCommandState(newState: BoardViewToolbarContracts.IKnownToolbarMenuItemUpdateEventArgs) {
        if (this._toolbar) {
            this._toolbar.updateCommandStates([
                {
                    id: newState.id,
                    disabled: newState.disabled,
                    toggled: newState.toggled,
                    hidden: newState.hidden,
                }
            ]);
        }
    }

    private _boardFilterUpdated(updates: BoardViewToolbarContracts.IBoardFilterUpdated): void {
        const filterApplied: boolean = updates.isFilterApplied;
        const filterMenuItem: Menus.MenuItem = this._toolbar.getItem(AgileControls.FilterControls.FILTER_COMMAND);

        if (filterMenuItem) {
            if (filterApplied) {
                AgileControls.FilterControls.initialize(this._toolbar, filterApplied, "bowtie-icon bowtie-search-filter-fill");
            } else {
                AgileControls.FilterControls.initialize(this._toolbar, filterApplied);
            }
        }
    }

    private _createMenubar() {
        /// <summary> Creates menubar for settings, filter and fullscreen, if not already created</summary>

        var menuItems: any[] = [];

        // feature flag check
        menuItems.push(
            {
                id: AgileControls.FilterControls.FILTER_COMMAND,
                title: AgileControlsResources.FilterIcon_ToolTip,
                showText: false,
                icon: "bowtie-icon bowtie-search-filter",
            });

        // Add refresh icon to the menubar.
        menuItems.push(
            {
                id: LegacyBoardToolbarHelper._refreshBoardCommand,
                title: AgileControlsResources.Kanban_RefreshIconTooltip,
                showText: false,
                hidden: true,
                icon: "bowtie-icon bowtie-navigate-refresh",
                action: () => {
                    this._publishAutoRefreshTelemetry("RefreshIconClicked", {}, true);
                    eventActionService.performAction(Events_Action.CommonActions.ACTION_WINDOW_RELOAD);
                }
            });

        menuItems.push(
            {
                id: LegacyBoardToolbarHelper._toggleAutoRefreshStateCommand,
                showText: false,
                icon: "bowtie-icon bowtie-network-tower",
                action: () => {
                    this._toggleAutoRefreshCommandState();
                },
                disabled: !TFS_Agile.areAdvancedBacklogFeaturesEnabled(),
                ariaLabel: AgileControlsResources.Kanban_AutoRefreshStateIcon_AriaLabel
            });

        menuItems.push(
            {
                id: AgileControls.CommonSettingsConfigurationControl.CMD_COMMON_SETTINGS,
                title: AgileControlsResources.Common_Setting_Config_Menu_Tooltip,
                showText: false,
                icon: "bowtie-icon bowtie-settings-gear"
            });

        // When embedded don't add the full screen button.
        if (!EmbeddedHelper.isEmbedded()) {
            menuItems.push(
                {
                    id: LegacyBoardToolbarHelper._fullScreenCommand,
                    icon: Navigation.FullScreenHelper.getFullScreenIcon(),
                    title: Navigation.FullScreenHelper.getFullScreenTooltip(),
                    showText: false
                });
        }

        this._toolbar = Controls.Control.create(
            Menus.MenuBar,
            $(".filters"),
            {
                items: menuItems,
                cssClass: "board-settings",
                suppressInitContributions: true,
                contributionIds: ["ms.vss-work-web.backlog-board-pivot-filter-menu"],
                getContributionContext: () => {
                    return {
                        id: this._boardId,
                        team: this._team
                    };
                }
            } as Menus.MenuBarOptions);

        this._toolbar.getElement().attr("aria-label", BoardResources.SettingsMenubarLabel);

        AgileControls.FilterControls.initialize(this._toolbar, false);

        AgileControls.CommonSettingsConfigurationControl.initialize(
            this._toolbar,
            () => { this._recordKanbanCommonConfigDialogTelemetry(); });

        //  When embedded, don't add the full screen button.
        if (!EmbeddedHelper.isEmbedded()) {
            Navigation.FullScreenHelper.initialize(this._toolbar);
        }

        this._toolbar.refreshContributedItems();
    }

    private _recordKanbanCommonConfigDialogTelemetry() {
        Boards.KanbanTelemetry.publish(
            CustomerIntelligenceConstants.AgileCustomerIntelligenceFeature.CLIENTSIDEOPERATION_COMMON_CONFIG_DIALOG_OPENED,
            {
                Page: TFS_Agile.AgileCustomerIntelligenceConstants.KANBAN_VIEW
            });
    }

    private _initializeAutoRefreshCommand(): void {
        this._autoRefreshCommandSettings = {
            state: this._initialAutoRefreshState,
            onEnabled: () => {
                const newState = BoardAutoRefreshCommon.AutoRefreshState.ENABLED;
                const callback = () => {
                    // reenable the menu item
                    this._updateAutoRefreshCommandVisualState(newState, /* isRefreshing */ false);
                };

                this._autoRefreshCommandSettings.state = newState;
                this._eventsHelper.fire(BoardViewToolbarContracts.Notifications.BoardAutoRefreshEnabled, callback);
            },
            onDisabled: () => {
                const newState = BoardAutoRefreshCommon.AutoRefreshState.DISABLED;
                const callback = () => {
                    // reenable the menu item
                    this._updateAutoRefreshCommandVisualState(newState, /* isRefreshing */ false);
                };

                this._autoRefreshCommandSettings.state = newState;
                this._eventsHelper.fire(BoardViewToolbarContracts.Notifications.BoardAutoRefreshDisabled, callback);
            }
        }

        // Initial visual state set of the command
        this._updateAutoRefreshCommandVisualState(this._initialAutoRefreshState, false);
    }

    private _toggleAutoRefreshCommandState(): void {
        // Disable auto refresh for stakeholders
        if (!TFS_Agile.areAdvancedBacklogFeaturesEnabled()) {
            return;
        }

        //  Making the command disabled to prevent consecutive clicks before action complete
        this._updateAutoRefreshCommandVisualState(BoardAutoRefreshCommon.AutoRefreshState.DISABLED, true);

        // Invoke the respective handler
        if (this._autoRefreshCommandSettings.state === BoardAutoRefreshCommon.AutoRefreshState.ENABLED) {
            this._saveAutoRefreshState(false, this._autoRefreshCommandSettings.onDisabled);
        } else {
            this._saveAutoRefreshState(true, this._autoRefreshCommandSettings.onEnabled);
        }
    }

    private _updateAutoRefreshCommandVisualState(
        state: BoardAutoRefreshCommon.AutoRefreshState,
        isRefreshing: boolean): void {

        var featureDisabled = !TFS_Agile.areAdvancedBacklogFeaturesEnabled();
        var isDisabled: boolean = featureDisabled || isRefreshing;

        var iconToolTip: string;
        if (featureDisabled) {
            iconToolTip = AgileControlsResources.Kanban_AutoRefreshStateIconDisabledTooltip;
        }
        else if (isRefreshing) {
            iconToolTip = AgileControlsResources.Kanban_AutoRefreshStateIconRefreshingTooltip;
        }
        else {
            iconToolTip = (state === BoardAutoRefreshCommon.AutoRefreshState.ENABLED) ?
                AgileControlsResources.Kanban_AutoRefreshStateIconONTooltip :
                AgileControlsResources.Kanban_AutoRefreshStateIconOFFTooltip;
        }

        this._toolbar.updateCommandStates([
            {
                id: LegacyBoardToolbarHelper._toggleAutoRefreshStateCommand,
                disabled: isDisabled,
                toggled: state === BoardAutoRefreshCommon.AutoRefreshState.ENABLED
            }
        ]);

        var autoRefreshMenuItem: Menus.MenuItem = this._toolbar.getItem(LegacyBoardToolbarHelper._toggleAutoRefreshStateCommand);
        if (autoRefreshMenuItem) {
            autoRefreshMenuItem.updateTitle(iconToolTip);
        }
    }

    private _saveAutoRefreshState(value: boolean, callBack: Function): void {
        var tfsContext = TFS_Host_TfsContext.TfsContext.getDefault();
        var tfsConnection = new Service.VssConnection(tfsContext.contextData);
        var workHttpClient = tfsConnection.getHttpClient<Work_WebApi.WorkHttpClient>(Work_WebApi.WorkHttpClient);
        var teamContext: TFS_Core_Contracts.TeamContext = {
            projectId: tfsContext.contextData.project.id,
            teamId: tfsContext.currentTeam.identity.id,
            project: undefined,
            team: undefined
        };

        var data: IDictionaryStringTo<string> = {};
        data["autoRefreshState"] = value ? "true" : "false";
        workHttpClient.updateBoardUserSettings(data, teamContext, this._boardId)
            .then(
                (latestBoardUserSettings) => {
                    callBack();
                },
                (error: {
                    message: string;
                    serverError: any;
                }) => {
                    // no-op
                });
    }

    private _publishAutoRefreshTelemetry(
        eventType: string,
        ciData: IDictionaryStringTo<any>,
        immediate: boolean = false): void {

        BoardAutoRefreshCommon.PublishAutoRefreshTelemetry(
            eventType,
            this._boardExtensionId, ciData, immediate);
    }

    private _createBoardRefreshNotificationControl(message: string, eventName: string): void {
        var that = this;
        VSS.using(["Engagement/QuickStart/UI"], (QS_UI: typeof QS_UI_NO_REQUIRE) => {
            var bubblePosition = QS_UI.BubblePosition.TOP;

            if (Navigation.FullScreenHelper.getFullScreen()) {
                bubblePosition = QS_UI.BubblePosition.BOTTOM;
            }

            this._boardRefreshNotificationControl = Controls.create(QS_UI.Bubble, $("body"), <QS_UI_NO_REQUIRE.BubbleModel>{
                // Setting the 'margin-left' property is needed to shift the bubble control towards the right of the target so that the callout arrow aligns towards the target.
                // Setting the 'width' property is needed to place the dismiss (close) button slightly wider to the text content in the pop-up.
                css: { 'margin-left': '34px', 'width': '340px', 'z-index': '1' },
                content: message,
                showCloseButton: true,
                target: "[command=" + LegacyBoardToolbarHelper._refreshBoardCommand + "]",
                position: bubblePosition,
                alignment: QS_UI.BubbleAlignment.RIGHT,
                calloutAlignment: QS_UI.BubbleAlignment.RIGHT,
            });

            this._publishAutoRefreshTelemetry("RefreshNotificationShown", { "EventSource": eventName });
            this._boardRefreshNotificationControl.getElement().addClass('shown').addClass(LegacyBoardToolbarHelper._refreshNotification);
            this._getRefreshNotificationDismissButtonElement().on("click", function () {
                that._publishAutoRefreshTelemetry("RefreshNotificationDismissed", { "EventSource": eventName });
            });
        });
    }

    private _getRefreshNotificationDismissButtonElement(): JQuery {
        return $(".quickstart.bubble." + LegacyBoardToolbarHelper._refreshNotification + " .quickstart-close");
    }
}