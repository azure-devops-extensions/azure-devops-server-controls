import TFS_Admin = require("Admin/Scripts/TFS.Admin");
import Capacity_Controls = require('Agile/Scripts/Capacity/CapacityControls');
import Capacity_Models = require('Agile/Scripts/Capacity/CapacityModels');
import { CapacityShortcutGroup } from 'Agile/Scripts/Capacity/CapacityShortcutGroup';
import Capacity_ViewModels = require('Agile/Scripts/Capacity/CapacityViewModels');
import TFS_Agile = require('Agile/Scripts/Common/Agile');
import TFS_Agile_Controls = require("Agile/Scripts/Common/Controls");
import CustomerIntelligenceConstants = require("Agile/Scripts/Common/CustomerIntelligence");
import { WorkingDays } from "Agile/Scripts/Common/SprintDates";
import SprintPlanningResources = require("Agile/Scripts/Resources/TFS.Resources.AgileSprintPlanning");
import Agile_Utils_CSC_NO_REQUIRE = require("Agile/Scripts/Settings/CommonSettingsConfiguration");
import ko = require("knockout");
import Configurations_NO_REQUIRE = require("Presentation/Scripts/TFS/TFS.Configurations");
import ConfigurationsConstants = require("Presentation/Scripts/TFS/TFS.Configurations.Constants");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import TeamServices = require("TfsCommon/Scripts/Team/Services");
import Controls = require("VSS/Controls");
import Menus = require("VSS/Controls/Menus");
import Navigation = require("VSS/Controls/Navigation");
import Notifications = require("VSS/Controls/Notifications");
import Diag = require("VSS/Diag");
import Events_Action = require("VSS/Events/Action");
import Events_Documents = require("VSS/Events/Document");
import Performance = require("VSS/Performance");
import Service = require("VSS/Service");
import Telemetry = require("VSS/Telemetry/Services");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import Utils_UI = require("VSS/Utils/UI");
import VSS = require("VSS/VSS");

var delegate = Utils_Core.delegate;
var domElem = Utils_UI.domElem;
var tfsContext = TFS_Host_TfsContext.TfsContext.getDefault();

export class CapacityView extends Controls.BaseControl {

    public static enhancementTypeName: string = "tfs.agile.capacityview";

    public static CSSCLASS_COMBO: string = "combo";
    public static CSSCLASS_INVALID: string = "invalid";
    public static CSSCLASS_HEADER: string = "header-cell";
    public static CSSCLASS_INPUT_HEADER: string = "capacity-input-header";
    public static CSSCLASS_DAYS_OFF_HEADER: string = "capacity-days-off-row-header";
    public static CSSCLASS_ROWHEADER: string = "capacity-row-header";
    public static CSSCLASS_INPUT_ROW: string = "capacity-input-row";
    public static CSSCLASS_INPUT_TEAM_ROW: string = "capacity-input-team-row";
    public static CSSCLASS_CAPACITY_INPUT: string = "capacity-capacity";
    public static CSSCLASS_ACTIVITY_CELL: string = "capacity-activity-cell";
    public static CSSCLASS_CLEARROW: string = "capacity-clear-row";
    public static CSSCLASS_ADD_ICON_CONTAINER: string = "capacity-icon-add-container";
    public static CSSCLASS_DAYS_OFF_CONTAINER: string = "capacity-days-off";
    public static CSSCLASS_DAYS_OFF: string = "capacity-days-off";
    public static DATA_TEAM_MEMBER_NAME: string = "teamMemberDisplayName";
    public static DATA_ACTIVITY_CONTROL: string = "activity-control";
    public static EVENT_TIMEOUT: number = 200;
    public static CHARACTER_INPUT_COUNT: number = 5;
    public static MIN_INPUT: number = 0;
    public static MAX_INPUT: number = 1000000;
    public static DECIMAL_PRECISION: number = 2;

    public static CAPACITY_VIEW_TOAST = "capacity-view-toast";
    private static TOAST_TIME = 2000;
    private static TOAST_FADE_IN_TIME = 250;
    private static TOAST_FADE_OUT_TIME = 1000;

    private _$container: JQuery;
    private _editable: boolean;
    private _teamCapacity: Capacity_Models.TeamCapacityModel;
    private _activityDisplayName: string;
    private _informationArea: Notifications.MessageAreaControl;
    private _onOperationStart: () => JQuery;
    private _onOperationComplete: () => void;
    private _capacityViewMenubar: Menus.MenuBar;
    public static CSS_CAPACITY_VIEW_MENUBAR = ".capacity-view-menubar";

    private _viewModel: Capacity_ViewModels.CapacityControlViewModel;

    private _toolbar: Menus.MenuBar;
    private _commonSettingsRegistered: boolean;

    /**
     * Construct the CapacityView object
     */
    constructor(options?) {

        super(options);
    }

    /**
     * Create the control inside the provided container
     * 
     * @param $container The container to create the control inside
     */
    public _createIn($container: JQuery) {

        Diag.Debug.assertParamIsObject($container, "$container");

        this._$container = $container;
        this._activityDisplayName = this._options.activityDisplayName;
        this._editable = <boolean>Utils_Core.parseMSJSON($(".edit-permission").html(), false);
    }

    /**
     * OVERRIDE: Initialize the control
     */
    public initialize() {

        this._onOperationStart = this._options.onOperationStart;
        this._onOperationComplete = this._options.onOperationComplete;

        this._teamCapacity = Capacity_Models.getService().getCapacityPageModel();

        this._viewModel = new Capacity_ViewModels.CapacityControlViewModel(
            this._activityDisplayName,
            this._editable,
            this._teamCapacity);

        this._setupInformationArea();
        if (this._viewModel.teamCapacity.isEmpty() && this._editable && !this._options.isFirstIteration) {
            this._showInformation({
                header: this._getCopyFromPreviousMessageJQuery(),
                type: Notifications.MessageAreaType.Info
            });
        }

        if (this._options.isAggregatedCapacityLimitExceeded) {
            this._showInformation({
                header: SprintPlanningResources.AggregatedCapacity_LimitExceeded,
                type: Notifications.MessageAreaType.Error
            });
        }

        //NOTE: we have to wrap this in a computed because we can't throttle a normal observable
        //ALSO: throttle has been deprecated in new versions of knockout
        ko.computed(() => this._viewModel.teamCapacityContext.message()).extend({ throttle: 250 }).subscribe((message: Capacity_ViewModels.IMessage) => {
            switch (message.type) {
                case Notifications.MessageAreaType.None:
                    this._informationArea.clear();
                    break;
                default:
                    this._showInformation(message.message, message.type);
                    break;
            }
        });

        ko.computed(() => this._viewModel.teamCapacityContext.teamMembersAdded()).extend({ throttle: 250 }).subscribe((membersAdded: number) => {
            if (membersAdded === Capacity_ViewModels.TeamCapacityContext.CLEAR_TEAMMEMBER_ADDED_VALUE) {
                return;
            }
            if (membersAdded === 0) {
                this._showInformation({
                    header: this._getNoMoreTeamMembersToAddMessageJQuery(),
                    type: Notifications.MessageAreaType.Info
                });
            } else {
                var $container = $("<div>");
                var $section1 = $("<div>").appendTo($container);
                $section1.text(Utils_String.format(SprintPlanningResources.Capacity_TeamMembersAdded, membersAdded));
                Events_Action.getService().performAction(CapacityView.CAPACITY_VIEW_TOAST, {
                    message: $container
                });
            }
        });

        this._createMenuBar();
        this._createCapacityViewCommonMenubar();
        this._createToastNotification();

        Controls.BaseControl.createIn(Capacity_Controls.CapacityAddPanelControl,
            $(".capacity-addpanel-area"),
            <Capacity_Controls.ICapacityAddPanelOptions<Capacity_ViewModels.ITeamCapacityAddPanelViewModel>>{
                addPanelViewModel: this._viewModel.teamCapacityAddPanelViewModel
            });

        //Fix capacity height when ever add user capacity or any of the message areas are shown or hidden
        ko.computed(() => {
            this._viewModel.teamCapacityAddPanelViewModel.isVisible();
            this._viewModel.teamCapacityAddPanelViewModel.isError();
            this._fixCapacityHeight();
        });

        if (this._viewModel.teamCapacity.capacities().length === 0) {
            Controls.BaseControl.createIn(Capacity_Controls.CapacityNoContentGutterControl,
                $(".capacity-nocontent-message-area"),
                <Capacity_Controls.ICapacityNoContentOptions<Capacity_ViewModels.TeamCapacityNoContentViewModel>>{
                    noContentViewModel: this._viewModel.teamCapacityNoContentViewModel
                });
        }

        ko.computed(() => {
            this._updateMenubarStates(this._viewModel.teamCapacity.isDirty(), this._viewModel.teamCapacity.isValid(), this._viewModel.teamCapacity.isProcessing());
        });

        $(window).resize(delegate(this, this._fixCapacityHeight));
        //Make sure the height is fixed
        this._fixCapacityHeight();
        this._viewModel.teamCapacity.isProcessing.subscribe((isSaving: boolean) => {
            //show the busy overlay when saving, and hide it when not saving
            if (isSaving && $.isFunction(this._onOperationStart)) {
                this._onOperationStart();
            }
            else if (!isSaving && $.isFunction(this._onOperationComplete)) {
                this._onOperationComplete();
            }
        });

        var $capacityControlContainer = $(domElem("div"))
            .attr("data-bind", "template: { name: 'capacity-template' }");

        this._$container.append($capacityControlContainer);
        ko.applyBindings(this._viewModel, this._$container[0]);

        //Setup Shortcuts for the Capacity Control
        new CapacityShortcutGroup(this._viewModel.teamCapacity, this);

        var runningDocumentsTable = Events_Documents.getRunningDocumentsTable();
        runningDocumentsTable.add("CapacityView", this);
        Events_Action.getService().registerActionWorker(TFS_Admin.Actions.EDIT_CLASSIFICATION, function (actionArgs, next) {
            // don't launch if there are other pending changes on the page since it's possible
            // that we will be refreshing the page.
            if (runningDocumentsTable.isModified()) {
                window.alert(SprintPlanningResources.Capacity_PendingChanges);
            }
            else {
                return next(actionArgs);
            }
        }, 10);

        // Connect Working Days Controller to Days Off changed observable
        this._teamCapacity.attachTeamDaysOffChanged(function () {
            WorkingDays.updateBasedOnTeamCapacity();
        });

        Performance.getScenarioManager().recordPageLoadScenario(
            CustomerIntelligenceConstants.AgileCustomerIntelligenceArea.AGILE,
            "Capacity.Open");
    }

    /**
      Determine if the menu item related to the "Save" command is enabled on the tool/menu bar.
      @return true if save is enabled on the tool/menu bar
              false if not.
    */
    public isSaveEnabled(): boolean {
        var toolBarSaveCommandState = this._toolbar.getCommandState(Capacity_ViewModels.CapacityControlViewModel.TOOLBAR_CMD_SAVE);
        return toolBarSaveCommandState === Menus.MenuItemState.None;
    }

    public getMessageArea(): Notifications.MessageAreaControl {
        return this._informationArea;
    }

    /**
      Determine if the menu item related to the "Undo" command is enabled on the tool/menu bar.
      @return true if undo is enabled on the tool/menu bar
              false if not.
    */
    public isUndoEnabled(): boolean {
        var toolBarUndoCommandState = this._toolbar.getCommandState(Capacity_ViewModels.CapacityControlViewModel.TOOLBAR_CMD_UNDO);
        return toolBarUndoCommandState === Menus.MenuItemState.None;
    }

    /**
     * Used by runningDocumentsTable to determine whether the page is dirty
     * 
     * @return 
     */
    public isDirty(): boolean {
        return this._viewModel.teamCapacity.isDirty();
    }

    private _createToastNotification() {
        var toastNotification = <Notifications.ToastNotification>Controls.BaseControl.createIn(Notifications.ToastNotification, $(".main"), {
            fadeInTime: CapacityView.TOAST_FADE_IN_TIME,
            fadeOutTime: CapacityView.TOAST_FADE_OUT_TIME,
            toastTime: CapacityView.TOAST_TIME
        });

        Events_Action.getService().registerActionWorker(CapacityView.CAPACITY_VIEW_TOAST, (args: any) => {
            toastNotification.toast(args.message);
        });
    }

    /**
     * Creates the menu items used in the capacity planning view toolbar
     */
    private _createToolbarItems() {
        return <Menus.IMenuItemSpec[]>[
            { id: Capacity_ViewModels.CapacityControlViewModel.TOOLBAR_CMD_SAVE, title: SprintPlanningResources.Capacity_Toolbar_Save, showText: false, icon: "bowtie-icon bowtie-save" },
            { id: Capacity_ViewModels.CapacityControlViewModel.TOOLBAR_CMD_UNDO, title: SprintPlanningResources.Capacity_Toolbar_Undo, showText: false, icon: "bowtie-icon bowtie-edit-undo" },
            { separator: true },
            { id: Capacity_ViewModels.CapacityControlViewModel.TOOLBAR_CMD_ADD_USER, title: SprintPlanningResources.Capacity_AddCapacityUser, showText: false, icon: "bowtie-icon bowtie-math-plus" },
            { id: Capacity_ViewModels.CapacityControlViewModel.TOOLBAR_CMD_ADD_MISSING_TEAM_MEMBERS, title: SprintPlanningResources.Capacity_AddMissingTeamMembers, showText: false, icon: "bowtie-icon bowtie-add-team" },
            { id: Capacity_ViewModels.CapacityControlViewModel.TOOLBAR_CMD_COPY, title: SprintPlanningResources.Capacity_Toolbar_Copy, showText: false, icon: "bowtie-icon bowtie-edit-copy" }];
    }

    private _createMenuBar() {
        this._toolbar = <Menus.MenuBar>Controls.BaseControl.createIn(Menus.MenuBar, $(".toolbar"), {
            items: this._createToolbarItems(),
            executeAction: this._viewModel.menubarEventHandler
        });

        ko.computed(() => {
            this._updateMenubarStates(this._viewModel.teamCapacity.isDirty(), this._viewModel.teamCapacity.isValid(), this._viewModel.teamCapacity.isProcessing());
        });
    }

    private _updateMenubarStates = (isDirty: boolean, isValid: boolean, isBusy: boolean) => {
        this._toolbar.updateCommandStates(<any[]>[
            { id: Capacity_ViewModels.CapacityControlViewModel.TOOLBAR_CMD_SAVE, disabled: !isDirty || !isValid || !this._editable || isBusy },
            { id: Capacity_ViewModels.CapacityControlViewModel.TOOLBAR_CMD_UNDO, disabled: !isDirty || !this._editable || isBusy },
            { id: Capacity_ViewModels.CapacityControlViewModel.TOOLBAR_CMD_ADD_USER, disabled: !this._editable || isBusy, toggled: this._viewModel.teamCapacityAddPanelViewModel.isVisible() },
            { id: Capacity_ViewModels.CapacityControlViewModel.TOOLBAR_CMD_ADD_MISSING_TEAM_MEMBERS, disabled: !this._editable || isBusy },
            { id: Capacity_ViewModels.CapacityControlViewModel.TOOLBAR_CMD_COPY, disabled: isDirty || this._options.isFirstIteration || !this._editable || isBusy }
        ]);
    }

    /**
     * Set up the information area
     */
    private _setupInformationArea() {
        this._informationArea = <Notifications.MessageAreaControl>Controls.Enhancement.enhance(Notifications.MessageAreaControl, $(".capacity-information-area"), {
            closeable: true
        });

        this._informationArea.getElement().bind(Notifications.MessageAreaControl.EVENT_DISPLAY_COMPLETE,
            delegate(this, this._fixCapacityHeight));
    }

    private _getCopyFromPreviousMessageJQuery(): JQuery {
        var $div: JQuery = $("<div>").text(SprintPlanningResources.Capacity_CopyPrevious_Info);
        var $a: JQuery = $("<a>").attr("href", "#").text(SprintPlanningResources.Capacity_CopyNow_LinkText);
        $a.click((e?: Event) => {
            if (e) {
                e.preventDefault();
            }

            this._viewModel.teamCapacity.copyFromPrevious();
        });

        $div.append($a);
        return $div;
    }

    private _getNoMoreTeamMembersToAddMessageJQuery(): JQuery {

        var teamAdminPageUrl = tfsContext.getActionUrl(null, null, { team: tfsContext.currentTeam.name, area: "admin" })
        var linkElement = Utils_String.format("<a href='{0}' target='_blank' rel='noopener noreferrer'>{1}</a>", teamAdminPageUrl, SprintPlanningResources.Capacity_ClickHere);
        var divContents = Utils_String.format(SprintPlanningResources.Capacity_NoMoreTeamMembers, linkElement);
        var $div: JQuery = $(Utils_String.format("<div>{0}</div>", divContents));
        return $div;
    }

    private _createCapacityViewCommonMenubar() {
        var $menubar = $(CapacityView.CSS_CAPACITY_VIEW_MENUBAR);

        if (!this._capacityViewMenubar && $menubar.length > 0) {
            $menubar.toggleClass("agile-important-hidden", false);
            this._capacityViewMenubar = <Menus.MenuBar>Controls.Enhancement.enhance(Menus.MenuBar, $menubar);

            // Initialize commonSettingsConfiguration menuitem and register tabs
            this._attachCommonConfigurationRegistration();
            TFS_Agile_Controls.CommonSettingsConfigurationControl.initialize(this._capacityViewMenubar, () => { this._recordCapacityViewCommonConfigDialogTelemetry(); });

            // Initialize fullscreen menuitem
            Navigation.FullScreenHelper.initialize(this._capacityViewMenubar);
        }
    }

    private _attachCommonConfigurationRegistration() {
        Service.getService(TeamServices.TeamPermissionService).beginGetTeamPermissions(tfsContext.navigation.projectId, this._options.teamId).then((permissions: TeamServices.ITeamPermissions) => {
            Events_Action.getService().registerActionWorker(ConfigurationsConstants.Actions.LAUNCH_COMMON_CONFIGURATION, (actionArgs, next: Function) => {
                VSS.using([
                    "Presentation/Scripts/TFS/TFS.Configurations",
                    "Agile/Scripts/Settings/CommonSettingsConfiguration"], (
                        Configuration: typeof Configurations_NO_REQUIRE,
                        Agile_Utils_CSC: typeof Agile_Utils_CSC_NO_REQUIRE
                    ) => {
                        var perfScenario = TFS_Agile_Controls.CommonSettingsConfigurationControl.createPerfScenario(TFS_Agile.AgileCustomerIntelligenceConstants.CAPACITY_VIEW, !this._commonSettingsRegistered);

                        if (!this._commonSettingsRegistered) {
                            Configuration.TabControlsRegistration.clearRegistrations(TFS_Agile.TabControlsRegistrationConstants.COMMON_CONFIG_SETTING_INSTANCE_ID);
                            Agile_Utils_CSC.CommonSettingsConfigurationUtils.registerGeneralSettingsForIterationLevel(this._options.teamId, permissions, /* showBacklogVisibilitiesTab */ true);
                            this._commonSettingsRegistered = true;
                        }

                        actionArgs = $.extend({
                            perfScenario: perfScenario
                        }, actionArgs);
                        next(actionArgs);
                    });
            });
        });
    }

    private _recordCapacityViewCommonConfigDialogTelemetry() {
        Telemetry.publishEvent(new Telemetry.TelemetryEventData(
            CustomerIntelligenceConstants.AgileCustomerIntelligenceArea.AGILE,
            CustomerIntelligenceConstants.AgileCustomerIntelligenceFeature.CLIENTSIDEOPERATION_COMMON_CONFIG_DIALOG_OPENED, {
                Page: TFS_Agile.AgileCustomerIntelligenceConstants.CAPACITY_VIEW,
            }));
    }

    /**
     * Show information to the user in the message area
     * 
     * @param message The message (String or Object) to display
     * @param type OPTIONAL: The type of message (e.g. Warning, Error)
     */
    private _showInformation(message: any, type?: Notifications.MessageAreaType) {
        this._informationArea.setMessage(message, type);
        this._fixCapacityHeight();
    }

    /**
     * Fix the height of the capacity entry area
     */
    private _fixCapacityHeight() {
        var $capacityElement = $(".capacity-scrollable"),
            siblingsHeight = 0;

        $capacityElement.siblings(":visible").each(function () {
            var $element = $(this);
            siblingsHeight += $element.outerHeight(true);
        });

        $capacityElement.css("top", siblingsHeight);
    }
}

VSS.initClassPrototype(CapacityView, {
    _$container: null,
    _currentIteration: null,
    _toolbar: null,
    _editable: null,
    _teamCapacity: null,
    _idCounter: 1,
    _eventMap: null,
    _activityValuesProvider: null,
    _activityDisplayName: null,
    _dataChanged: false,
    _statusIndicator: null,
    _informationArea: null,
    _saveToolbarEnabled: false,
    _undoToolbarEnabled: false,
    _copyToolbarEnabled: true,
    _onOperationStart: null,
    _onOperationComplete: null
});