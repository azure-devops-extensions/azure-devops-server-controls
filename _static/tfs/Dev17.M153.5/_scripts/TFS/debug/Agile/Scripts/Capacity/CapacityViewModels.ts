/// <reference types="jquery" />
/// <reference types="knockout" />

import VSS = require("VSS/VSS");
import VSSError = require("VSS/Error");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import Utils_Array = require("VSS/Utils/Array");
import Diag = require("VSS/Diag");
import ko = require("knockout");
import Ajax = require("Presentation/Scripts/TFS/TFS.Legacy.Ajax");
import SprintPlanningResources = require("Agile/Scripts/Resources/TFS.Resources.AgileSprintPlanning");
import Notifications = require("VSS/Controls/Notifications");
import Controls = require("VSS/Controls");
import Dialogs = require("VSS/Controls/Dialogs");
import TFS_UI_Controls_Identities = require("Presentation/Scripts/TFS/TFS.UI.Controls.Identities");
import TFS_Knockout = require("Presentation/Scripts/TFS/TFS.Knockout");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import TFS_Agile = require("Agile/Scripts/Common/Agile");
import TFS_OM_Common = require("Presentation/Scripts/TFS/TFS.OM.Common");
import TFS_AgileCommon = require("Presentation/Scripts/TFS/FeatureRef/TFS.AgileCommon");
import TFS_TeamAwarenessService = require("Presentation/Scripts/TFS/FeatureRef/TFS.TeamAwarenessService");
import TFS_SimpleFieldControl = require("Presentation/Scripts/TFS/FeatureRef/SimpleFieldControl");
import TFS_EllipsisMenuBar = require("Presentation/Scripts/TFS/FeatureRef/EllipsisMenuBar");
import TFS_OM_Identities = require("Presentation/Scripts/TFS/TFS.OM.Identities");
import Work_Contracts = require("TFS/Work/Contracts");
import FeatureAvailability_Services = require("VSS/FeatureAvailability/Services");
import Capacity_Models = require("Agile/Scripts/Capacity/CapacityModels");
import ServerConstants = require("Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants");
import Menus = require("VSS/Controls/Menus");
import Identities_Picker_RestClient = require("VSS/Identities/Picker/RestClient");
import Identities_Picker_Services = require("VSS/Identities/Picker/Services");
import Identities_Picker_Controls = require("VSS/Identities/Picker/Controls");
import Telemetry = require("VSS/Telemetry/Services");
import TFS_Grid_Adapters = require("Presentation/Scripts/TFS/TFS.UI.Controls.Grid.DataAdapters");
import Q = require("q");
import { ProgressAnnouncer } from "VSS/Utils/Accessibility";

TFS_Knockout.overrideDefaultBindings()

import CustomerIntelligenceConstants = require("Agile/Scripts/Common/CustomerIntelligence");

var delegate = Utils_Core.delegate;


/** 
 * Contains resource strings for Capacity View Header row 
 */
export class TeamCapacityContext {
    public TEAM_MEMBER_HEADER = SprintPlanningResources.Capacity_UserHeader;
    public CAPACITY_PER_DAY_HEADER = SprintPlanningResources.Capacity_CapacityHeader;
    public DAYS_OFF_HEADER = SprintPlanningResources.Capacity_DaysOffHeader;
    public TEAM_DAYS_OFF_LABEL = SprintPlanningResources.Capacity_TeamDaysOff;
    public ACTIVITY_FIELD_DISPLAY_NAME: string = "";
    public static CLEAR_TEAMMEMBER_ADDED_VALUE = -1;

    public message: KnockoutObservable<IMessage> = ko.observable(<IMessage>{ message: "", type: Notifications.MessageAreaType.None });
    public teamMembersAdded: KnockoutObservable<number> = ko.observable(TeamCapacityContext.CLEAR_TEAMMEMBER_ADDED_VALUE);

    public usersAddedUsingAddUser = 0;
    public usersRemovedUsingRemoveUser = 0;
    public capacityCopiedFromLastSprint = 0;
    public addMissingTeamMembersUsed = 0;


    //FieldData Provider for the Activity Drop down
    public ActivityFieldDataProvider: TFS_Grid_Adapters.FieldDataProvider;
    public clearMessage() {
        this.message(<IMessage>{
            message: "",
            type: Notifications.MessageAreaType.None
        });
    }

    constructor(activityFieldDisplayName: string, activityValues: string[]) {
        this.ACTIVITY_FIELD_DISPLAY_NAME = activityFieldDisplayName;
        this.ActivityFieldDataProvider = new TFS_Grid_Adapters.FieldDataProvider(activityValues, { allowEmpty: true });
    }

    private _resetTelemetryData() {
        this.usersAddedUsingAddUser = 0;
        this.usersRemovedUsingRemoveUser = 0;
        this.capacityCopiedFromLastSprint = 0;
        this.addMissingTeamMembersUsed = 0;
    }

    public publishTelemetryData() {
        //Telemetry
        Telemetry.publishEvent(new Telemetry.TelemetryEventData(
            CustomerIntelligenceConstants.AgileCustomerIntelligenceArea.AGILE,
            CustomerIntelligenceConstants.AgileCustomerIntelligenceFeature.TELEMETRY_CAPACITY_VIEW_ADDREMOVECAPACITYUSER, {
                "UsesAdded": this.usersAddedUsingAddUser,
                "UsersRemoved": this.usersRemovedUsingRemoveUser
            }));

        Telemetry.publishEvent(new Telemetry.TelemetryEventData(
            CustomerIntelligenceConstants.AgileCustomerIntelligenceArea.AGILE,
            CustomerIntelligenceConstants.AgileCustomerIntelligenceFeature.TELEMETRY_CAPACITY_VIEW_CAPACITYPLANNING, {
                "copyFromPrevious": this.capacityCopiedFromLastSprint,
                "addedMissingTeamMembers": this.addMissingTeamMembersUsed
            }));
        this._resetTelemetryData();
    }
}

/**
 * View model for Capacity control, this referes the Capacity Headers resources and teh TeamCapacityViewModel
 */
export class CapacityControlViewModel {
    //MenuBar Commands
    public static TOOLBAR_CMD_SAVE: string = "capacity-save";
    public static TOOLBAR_CMD_UNDO: string = "capacity-undo";
    public static TOOLBAR_CMD_COPY: string = "capacity-copy";
    public static TOOLBAR_CMD_ADD_USER: string = "capacity-add-user";
    public static TOOLBAR_CMD_ADD_MISSING_TEAM_MEMBERS: string = "capacity-add-missing-team-members";
    public TEAM_DAYS_OFF_DESCRIPTION = SprintPlanningResources.Capacity_TeamDaysOffDescriptionText;

    public teamCapacity: TeamCapacityViewModel;
    public teamCapacityContext: TeamCapacityContext;
    public teamCapacityAddPanelViewModel: ITeamCapacityAddPanelViewModel;
    public teamCapacityNoContentViewModel: TeamCapacityNoContentViewModel;
    public editable: boolean;

    constructor(activityFieldDisplayName: string, editable: boolean, teamCapacityModel: Capacity_Models.TeamCapacityModel) {
        this.teamCapacityContext = new TeamCapacityContext(activityFieldDisplayName, teamCapacityModel.activityValues);
        this.teamCapacity = new TeamCapacityViewModel(teamCapacityModel, this.teamCapacityContext, TeamCapacityViewModel.DEFAULT_VALIDATION_DELAY, editable);
        this.teamCapacityAddPanelViewModel = new TeamCapacityAddPanelViewModel(teamCapacityModel, this.teamCapacityContext);

        // Create empty capacity page only when there are no capacities
        if (teamCapacityModel.capacities().length === 0) {
            this.teamCapacityNoContentViewModel = new TeamCapacityNoContentViewModel(teamCapacityModel);
        }

        this.editable = editable;
    }

    /**
     * Handler for toolbar menu item click
     * 
     * @param [e] - Event args
     */
    public menubarEventHandler = (e?: any) => {
        Diag.Debug.assertParamIsObject(e, "e");

        var command: string = e.get_commandName();

        switch (command) {
            case CapacityControlViewModel.TOOLBAR_CMD_SAVE:
                this.teamCapacity.beginSave();
                break;
            case CapacityControlViewModel.TOOLBAR_CMD_UNDO:
                this.teamCapacity.undo();
                break;
            case CapacityControlViewModel.TOOLBAR_CMD_COPY:
                Diag.logTracePoint("CapacityView.ClickCopy.Start");
                this.teamCapacity.copyFromPrevious();
                break;
            case CapacityControlViewModel.TOOLBAR_CMD_ADD_USER:
                this.teamCapacityAddPanelViewModel.isVisible(!this.teamCapacityAddPanelViewModel.isVisible());
                break;
            case CapacityControlViewModel.TOOLBAR_CMD_ADD_MISSING_TEAM_MEMBERS:
                this.teamCapacity.addMissingTeamMembers();
                break;
            default:
                Diag.Debug.fail("Toolbar command was not an expected string");
                break;
        }
    }
}

/**
 * This interface is used for storing error/warning messages, its main consumer is  TeamCapacityViewModel
 */
export interface IMessage {
    message: string;
    type: Notifications.MessageAreaType;
}

/**
* Capacity Add Panel View model interface
*/
export interface ITeamCapacityAddPanelViewModel {
    isVisible: KnockoutObservable<boolean>;
    isError: KnockoutComputed<boolean>;
    /**
    * Creates identity picker control in given container
    * @param {jQuery} $container - container for the Identity Picker Control
    * @param {jQuery} $rootContainer - container for the entire control
    */
    initialize($container: JQuery, $rootContainer: JQuery);
    focus();
    dispose();
}

/**
* Capacity Add Panel View model for Hosted environment
*/
export class TeamCapacityAddPanelViewModel extends Capacity_Models.DisposableBase implements ITeamCapacityAddPanelViewModel {
    public isVisible: KnockoutObservable<boolean> = ko.observable(false);
    public isAddEnabled: KnockoutComputed<boolean>;
    public selectedEntity: KnockoutObservable<Identities_Picker_RestClient.IEntity> = ko.observable(null);
    public isError: KnockoutComputed<boolean>;
    public errorText: KnockoutObservable<string> = ko.observable("");

    private _identityPickerSearchControl: Identities_Picker_Controls.IdentityPickerSearchControl;
    private _identityPickerSearchOptions: Identities_Picker_Controls.IIdentityPickerSearchOptions;
    private _teamCapacityModel: Capacity_Models.TeamCapacityModel;
    private _context: TeamCapacityContext;
    private _$rootContainer: JQuery;

    constructor(teamCapacityModel: Capacity_Models.TeamCapacityModel, context: TeamCapacityContext) {
        super();
        this._teamCapacityModel = teamCapacityModel;
        this._context = context;

        this._disposables.push(this.isError = ko.computed(() => {
            if (this.selectedEntity()) {
                if (this.selectedEntity().localId) {
                    this.errorText(SprintPlanningResources.Capacity_UserAlreadyHasCapacity);
                    return !!this._teamCapacityModel.teamMemberCapacityMap[this.selectedEntity().localId];
                }
                else {
                    this.errorText(SprintPlanningResources.Capacity_UserIsNotMaterializedYet);
                    return true;
                }
            }
            return false;
        }));

        this._disposables.push(this.isAddEnabled = ko.computed(() => {
            if (this.selectedEntity() && !this.isError()) {
                return true;
            }
            return false;
        }));

    }

    /**
    * Initializes the View Model
    * @param {jQuery} $container - container for the Identity Picker Control
    * @param {jQuery} $rootContainer - container for the entire control
    */
    public initialize($container: JQuery, $rootContainer: JQuery) {
        this._$rootContainer = $rootContainer;
        //Setting both IMS and AAD to true to ensure we get both AAD and MSA groups, setting AAD:true should be no-op for OnPrem
        var operationScope: Identities_Picker_Services.IOperationScope = {
            IMS: true,
            Source: true
        };
        var identityType: Identities_Picker_Services.IEntityType = {
            User: true
        };

        this._identityPickerSearchOptions = <Identities_Picker_Controls.IIdentityPickerSearchOptions>{
            operationScope: operationScope,
            identityType: identityType,
            multiIdentitySearch: false,
            showMruTriangle: false,
            showMru: false,
            showContactCard: true,
            consumerId: TFS_Agile.IdentityControlConsumerIds.CapacitySearchControl
        };
        this._identityPickerSearchControl = Controls.create(Identities_Picker_Controls.IdentityPickerSearchControl, $container, this._identityPickerSearchOptions);

        //We can not use onItemChange as it do not fire when user clears the selection 
        $container.bind(Identities_Picker_Controls.IdentityPickerSearchControl.VALID_INPUT_EVENT, delegate(this, this._onIdentityPickerSelectionChanged));
        $container.bind(Identities_Picker_Controls.IdentityPickerSearchControl.INVALID_INPUT_EVENT, delegate(this, this._onIdentityPickerSelectionChanged));
    }

    public focus() {
        var $identitySearchBox = this._$rootContainer.find(".identity-picker-input");
        Diag.Debug.assert(!!$identitySearchBox, "The identity search box is not found");
        if ($identitySearchBox.length > 0) {
            $identitySearchBox[0].focus();
        }
    }

    /**
    * Adds the given user Entity as user to specify the capcity.
    * @param {Identities_Picker_RestClient.IEntity} entity  - User Entity
    */
    public addUser() {
        if (this.isAddEnabled()) {
            this._context.usersAddedUsingAddUser++;
            var entity = this.selectedEntity();
            this._addLocalUser(entity);
            if (this._identityPickerSearchControl) {
                this._identityPickerSearchControl.clear();
                this.focus();
            }
            this.selectedEntity(null);
        }
    }

    /**
    * Hides the Add Panel
    */
    public hideAddPanel() {
        this.isVisible(false);
    }

    /**
    * Dispose the object
    */
    public dispose() {
        if (this._identityPickerSearchControl) {
            this._identityPickerSearchControl.dispose();
            this._identityPickerSearchControl = null;
        }

        super.dispose();
    }

    /**
     * Handles the identity changed event
    */
    private _onIdentityPickerSelectionChanged() {
        var resolvedIdentities = this._identityPickerSearchControl.getIdentitySearchResult().resolvedEntities;
        if (resolvedIdentities && resolvedIdentities.length > 0) {
            this.selectedEntity(resolvedIdentities[0]);
            var $addButton = this._$rootContainer.find('.capacity-add-panel-add-button');
            if ($addButton.length > 0 && this.isAddEnabled()) {
                $addButton[0].focus();
            }
        } else {
            this.selectedEntity(null);
        }
    }

    private _addLocalUser(entity: Identities_Picker_RestClient.IEntity) {
        Diag.Debug.assertIsStringNotEmpty(entity.localId, "Entity should have localId");

        //Add only if not already added
        if (!this._teamCapacityModel.teamMemberCapacityMap[entity.localId]) {
            var distinctDisplayName = this._getDistinctDisplayName(entity);
            var teamMemberCapacity: Work_Contracts.TeamMemberCapacity = <Work_Contracts.TeamMemberCapacity>{
                teamMember: { id: entity.localId, displayName: distinctDisplayName, uniqueName: this._getDisambiguationPart(entity) },
                activities: [{ name: Capacity_Models.TeamCapacityModel.DEFAULT_ACTIVITY_NAME, capacityPerDay: 0 }],
                daysOff: [],
                url: "",
                _links: []

            };

            var teamMemberCapacityModel: Capacity_Models.TeamMemberCapacityModel = new Capacity_Models.TeamMemberCapacityModel(this._teamCapacityModel.iterationInfo, teamMemberCapacity, this._teamCapacityModel.pauseCalculations, this._teamCapacityModel.pauseIsDirty, false);
            this._teamCapacityModel.capacities.splice(0, 0, teamMemberCapacityModel);
        }
    }

    /*
    * Returns Distinct display name for the user (Logic is same as Tfs\Service\Framework\ServerCore\IdentityManagement\TeamFoundationIdentity.cs::DistinctDisplayName
    */
    private _getDistinctDisplayName(entity: Identities_Picker_RestClient.IEntity): string {

        return Utils_String.format("{0} <{1}>", entity.displayName, this._getDisambiguationPart(entity));
    }

    /*
    * Returns Distinct display name for the user (Logic is same as Tfs\Service\Framework\ServerCore\IdentityManagement\TeamFoundationIdentity.cs::GetDisambiguationPart
    *  For OnPrem: 
    *     AD users/group -> domain\alias
    *  For Hosted:
    *     User           -> email
    */
    private _getDisambiguationPart(entity: Identities_Picker_RestClient.IEntity): string {
        Diag.Debug.assert(entity.entityType === "User", "Entity should be of user");

        if (TFS_Host_TfsContext.TfsContext.getDefault().isHosted) {
            return entity.signInAddress;
        }

        return entity.scopeName + "\\" + entity.samAccountName;
    }
}

/**
* It a class representing a bullet item with an icon in the end. 
**/
export class BulletIconModel {
    public name: string;
    public iconClass: string;

    constructor(name: string, iconClass: string) {
        this.name = name;
        this.iconClass = iconClass;
    }
}

/** 
 * Exposes the TeamCapacity No content message box for binding to Views
 */
export class TeamCapacityNoContentViewModel extends Capacity_Models.DisposableBase {
    public isVisible: KnockoutComputed<boolean>;
    public heading: string;
    public message: string;
    public bullets: Array<BulletIconModel>;
    private _isVisible: boolean;
    private static CAPACITY_BULLET_ADDUSER_ICON_CLASS = "bowtie-icon bowtie-math-plus";
    private static CAPACITY_BULLET_ADDMISSINGTEAMMEMBERS_ICON_CLASS = "bowtie-icon bowtie-add-team";
    private static CAPACITY_BULLET_COPYCAPACITY_ICON_CLASS = "bowtie-icon bowtie-edit-copy"; // Using CopyCapacity in variable name as it makes more sense in the context

    private _teamCapacityModel: Capacity_Models.TeamCapacityModel
    constructor(teamCapacity: Capacity_Models.TeamCapacityModel) {
        super();

        this._teamCapacityModel = teamCapacity;
        this.heading = SprintPlanningResources.Iteration_NoData_NoItemsToShow_Heading;
        this.message = Utils_String.format(SprintPlanningResources.Capacity_NoUser_NoItemsToShow_Message, "<em>"
            + TFS_OM_Common.ProjectCollection.getConnection(TFS_Host_TfsContext.TfsContext.getDefault()).getService<TFS_Agile.AgileContext>(TFS_Agile.AgileContext).getContext().iteration.path
            + "</em>");

        this._initializeBulletIcons();

        if (this._teamCapacityModel.capacities().length > 0) {
            this._isVisible = false;
        }
        else {
            this._isVisible = true;
        }

        this._disposables.push(this.isVisible = ko.computed(() => {
            this._isVisible = this._isVisible && this._teamCapacityModel.capacities().length === 0;
            return this._isVisible;
        }));
    }

    private _initializeBulletIcons() {
        this.bullets = new Array();
        this.bullets.push(new BulletIconModel(SprintPlanningResources.Capacity_NoUser_NoItemsToShow_AddPeople_Action, TeamCapacityNoContentViewModel.CAPACITY_BULLET_ADDUSER_ICON_CLASS));
        this.bullets.push(new BulletIconModel(SprintPlanningResources.Capacity_NoUser_NoItemsToShow_AddAllTeamMembers_ActioCapacity_NoUser_NoItemsToShow_AddAllTeamMembers_Action, TeamCapacityNoContentViewModel.CAPACITY_BULLET_ADDMISSINGTEAMMEMBERS_ICON_CLASS));
        this.bullets.push(new BulletIconModel(SprintPlanningResources.Capacity_NoUser_NoItemsToShow_CopyCapacity_Action, TeamCapacityNoContentViewModel.CAPACITY_BULLET_COPYCAPACITY_ICON_CLASS));
    }
}

/** 
 * Exposes the TeamCapacity for binding to Views
 */
export class TeamCapacityViewModel extends Capacity_Models.DisposableBase {
    public static DEFAULT_VALIDATION_DELAY = 500;
    public activityValues: string[];
    public activityEnabled: boolean;
    public isValid: KnockoutComputed<boolean>;
    public isDirty: KnockoutComputed<boolean>;
    public totalTeamDaysOff: KnockoutComputed<string>;
    public capacities: KnockoutObservableArray<TeamMemberCapacityViewModel> = ko.observableArray([]);
    public isEmpty: KnockoutComputed<boolean>;
    public isProcessing: KnockoutObservable<boolean> = ko.observable(false);
    public controlIsEditable: boolean;

    private _teamDaysOff: KnockoutObservableArray<Work_Contracts.DateRange>;

    private _model: Capacity_Models.TeamCapacityModel;
    private _context: TeamCapacityContext;
    private _validationMessageComputed: KnockoutComputed<void> = null;
    private _validationDelay: number = 0;

    constructor(model: Capacity_Models.TeamCapacityModel, context: TeamCapacityContext, validationDelay: number, controlIsEditable: boolean) {
        super();
        this.controlIsEditable = controlIsEditable;
        this._validationDelay = validationDelay;
        this._model = model;
        this._context = context;
        this.activityValues = model.activityValues;
        this.activityEnabled = model.activityEnabled;
        this.isValid = model.isValid;
        this.isDirty = model.isDirty;
        this.isEmpty = model.isEmpty;
        this.totalTeamDaysOff = model.totalTeamDaysOff;

        this._recreateTeamMemberCapacityViewModel();
        this._teamDaysOff = model.teamDaysOff;
        this._setupValidationMessageComputed();
        //Subscribe to capacity model changes to add/remove view models
        this._model.capacities.subscribeArrayChanged((addedTMC: Capacity_Models.TeamMemberCapacityModel) => {
            var addedIndex = this._model.capacities.indexOf(addedTMC);
            var vm = new TeamMemberCapacityViewModel(addedTMC, this._context, this);
            this.capacities.splice(addedIndex, 0, vm);
        }, (removedTMC: Capacity_Models.TeamMemberCapacityModel) => {

            var vmToRemove: TeamMemberCapacityViewModel = Utils_Array.first(this.capacities(), vm => vm.model === removedTMC);
            if (vmToRemove) {
                this.capacities.remove(vmToRemove);
            }
        });
    }

    /**
     * <summary>Inserts custom controls in the given element</summary>
     * 
     * @param {HTMLElement} element - Container element
     * @param {TeamMemberCapacityViewModel} data     
     */
    public insertCustomControls = (element: HTMLElement, data: TeamMemberCapacityViewModel) => {
        let $displayNameDiv = $(element).children('.capacity-display-name');

        if (FeatureAvailability_Services.FeatureAvailabilityService.isFeatureEnabled(ServerConstants.FeatureAvailabilityFlags.WebAccessAgileUseNewIdentityControls)) {
            // Create the new 'identity display control'.

            // We have available to us:
            //  (A) data.teamMemberId: User GUID as a string.
            //  (B) data.uniqueName:   Unique identifier - e.g. "FOO\john", "john@hotmail.com", etc.
            //  (C) data.displayName:  Actually a disambiguated display name - a combination of display & unique names - e.g. "John <FOO\john>", "John <john@hotmail.com", etc.
            // The IdentityDisplayControl accepts either a complete IEntity (which we do not have), or the unique identifier (which it will use to acquire a
            // complete IEntity via REST). For the latter, it also accepts a transient display name to use until successful resolution.

            // Determine the user-friendly display name (e.g. "John") to be shown until resolution.
            var identityRef: TFS_OM_Identities.IIdentityReference = TFS_OM_Identities.IdentityHelper.parseUniquefiedIdentityName(data.displayName);
            var userFriendlyDisplayName = (identityRef && identityRef.displayName) || data.displayName;

            // Create the actual control.
            let options: Identities_Picker_Controls.IIdentityDisplayOptions = {
                identityType: { User: true },
                operationScope: { IMS: true },
                item: data.uniqueName || identityRef.displayName,     // We should have unique name, but fall back to display name just in case (will work unless name is ambiguous).
                friendlyDisplayName: userFriendlyDisplayName,  // Display this name until the identity is asynchronously resolved.
                size: Identities_Picker_Controls.IdentityPickerControlSize.Small,  // (Currently 16px.)
                consumerId: TFS_Agile.IdentityControlConsumerIds.CapacityDisplayControl
            };
            Controls.BaseControl.createIn(Identities_Picker_Controls.IdentityDisplayControl, $displayNameDiv, options);
        }
        else {
            // Create the classic 'identity view control'.
            let options = { identifier: data.displayName };
            <TFS_UI_Controls_Identities.IdentityViewControl>Controls.BaseControl.createIn(TFS_UI_Controls_Identities.IdentityViewControl, $displayNameDiv, options);
        }
    }



    /**
     * Saves the data from underlying KO model.
     */
    public beginSave = (): IPromise<TeamCapacityViewModel> => {
        if (this.isProcessing()) {
            return;
        }

        this._context.publishTelemetryData();
        this.isProcessing(true);

        var capacityDataService = Capacity_Models.getService();
        var capacityOptions = capacityDataService.getCapacityOptions();
        const capacitySavePromise = capacityDataService.beginSaveCapacityModel(capacityOptions.iterationId).then(() => {

            this._context.clearMessage();
            this.isProcessing(false);

            return this;
        }, (reason) => {
            var message = VSS.getErrorMessage(reason);
            var details: TfsError = {
                name: "ErrorWhileSavingCapacity",
                message: message
            };
            VSSError.publishErrorToTelemetry(details);

            var processedMessage = TeamCapacityViewModel._replaceTfIdWithDisplayName(this._model.teamMemberCapacityMap, message);
            this._context.message(<IMessage>{
                message: processedMessage,
                type: Notifications.MessageAreaType.Error
            });
            this.isProcessing(false);
            throw reason;
        });
        // Accesible saving experience
        ProgressAnnouncer.forPromise(capacitySavePromise, {
            announceStartMessage: SprintPlanningResources.CapacityLoading_SaveStart,
            announceEndMessage: SprintPlanningResources.CapacityLoading_SaveEnd,
            announceErrorMessage: SprintPlanningResources.CapacityLoading_SaveError
        });
        return capacitySavePromise;
    }

    public static _concatIdName(id: string, name: string): string {
        return `${id}(${name})`;
    }

    public static _replaceTfIdWithDisplayName(teamMemberCapacityMap: IDictionaryStringTo<Capacity_Models.TeamMemberCapacityModel>, message: string): string {
        var allGuidsInStringRegex = /\{?([\dA-F]{8})-?([\dA-F]{4})-?([\dA-F]{4})-?([\dA-F]{4})-?([\dA-F]{12})\}?/ig;
        if (!teamMemberCapacityMap || !message) {
            Diag.Debug.fail("TeamMemberCapacityMap and/or message are not defined.");
            return message;
        }

        var output = message;
        var ids = output.match(allGuidsInStringRegex);
        if (ids) {
            ids = Utils_Array.unique(ids);
            $.each(ids, (index, id) => {
                var member = teamMemberCapacityMap[id];
                if (member) {
                    var regex = new RegExp(id, 'ig');
                    output = output.replace(regex, TeamCapacityViewModel._concatIdName(id, member.getTeamMemberDisplayName()));
                }
            });
        }
        return output;
    }

    /**
     * Reverts the data in underlying KO model back to original raw JSON data.
     */
    public undo = () => {
        this._model.undo();
        this._context.clearMessage();
    }

    /**
     * Copies capacity data from previous iteration.
     */
    public copyFromPrevious = (): IPromise<void> => {
        this._context.capacityCopiedFromLastSprint++;
        var tfsContext = TFS_Host_TfsContext.TfsContext.getDefault();
        var capacityDataService = Capacity_Models.getService();

        //Get iterations
        var teamAwareness = TFS_OM_Common.ProjectCollection.getConnection(tfsContext).getService<TFS_TeamAwarenessService.TeamAwarenessService>(TFS_TeamAwarenessService.TeamAwarenessService);
        var teamSettings = teamAwareness.getTeamSettings(tfsContext.currentTeam.identity.id);
        var iterations: TFS_AgileCommon.IIterationData[] = teamSettings.previousIterations.concat([teamSettings.currentIteration]).concat(teamSettings.futureIterations);
        var index = Utils_Array.findIndex(iterations, (iteration: TFS_AgileCommon.IIterationData) => {
            if (iteration.id === this._model.iterationInfo.iterationId) {
                return true;
            }
            else {
                return false;
            }
        });

        if (index < 1) {
            // if index is 0 or negative, there will be no previous iteration and we will do nothing
            var details: TfsError = {
                name: "ArgumentError",
                message: "Iteration with unexpected index less than one"
            };
            VSSError.publishErrorToTelemetry(details);
            return Q<void>(null);
        }

        const getPreviousCapacityPromise = capacityDataService.beginGetCapacities(iterations[index - 1].id).then((capacities) => {
            var isEmpty: boolean = true;
            $.each(capacities, (index: number, capacity: Work_Contracts.TeamMemberCapacity) => {
                if (capacity.activities.length !== 0) {
                    if (capacity.activities.length > 1 ||
                        capacity.activities[0].capacityPerDay > 0 ||
                        capacity.activities[0].name !== Capacity_Models.TeamCapacityModel.DEFAULT_ACTIVITY_NAME) {
                        isEmpty = false;
                        return;
                    }
                }
            });

            capacities.sort(function (c1: Work_Contracts.TeamMemberCapacity, c2: Work_Contracts.TeamMemberCapacity): number {
                return Utils_String.localeIgnoreCaseComparer(c1.teamMember.displayName, c2.teamMember.displayName);
            });

            capacities.forEach((value: Work_Contracts.TeamMemberCapacity) => {
                value.daysOff = [];
            });

            if (!isEmpty) {
                this._model.setupMerge();
                this._model.mergeCapacities(capacities, false);

                this._context.clearMessage();
                this._model.endMerge();
            }
            else {
                this._context.message(<IMessage>{
                    message: SprintPlanningResources.Capacity_CopyPrevious_NoCapacity,
                    type: Notifications.MessageAreaType.Warning
                });
            }
            return null;
        });
        // Accessible loading experience
        ProgressAnnouncer.forPromise(getPreviousCapacityPromise, {
            announceStartMessage: SprintPlanningResources.CapacityLoading_CopyFromPreviousStart,
            announceEndMessage: SprintPlanningResources.CapacityLoading_CopyFromPreviousEnd,
            announceErrorMessage: SprintPlanningResources.CapacityLoading_CopyFromPreviousError
        });
        return getPreviousCapacityPromise;
    }

    public removeUser(tmcvm: TeamMemberCapacityViewModel) {
        this._context.usersRemovedUsingRemoveUser++;
        this._model.capacities.remove(tmcvm.model);
    }

    private _recreateTeamMemberCapacityViewModel() {
        var capacities: TeamMemberCapacityViewModel[] = []
        this._model.capacities().forEach((teamMemberCapacity: Capacity_Models.TeamMemberCapacityModel) => {
            capacities.push(new TeamMemberCapacityViewModel(teamMemberCapacity, this._context, this));
        });
        this.capacities(capacities);
    }

    /**
    * Launched the dialog to display/edit TeamDaysOff values.
    */
    public editTeamDaysOff = (data: CapacityControlViewModel, e: Event) => {
        Dialogs.Dialog.beginExecuteDialogAction(() => {

            // Wait to invoke the dialog so it does not get closed immediately
            // when opening from a keyboard event.
            Utils_Core.delay(this, 0, () => {
                Dialogs.show(Capacity_Models.DaysOffDialog, {
                    title: SprintPlanningResources.DaysOffDialog_DialogTitleTeamWideDaysOff,
                    dateRanges: $.extend(true, [], this._teamDaysOff()),
                    excludeTeamDaysOff: false,
                    okCallback: (updatedDateRanges: Work_Contracts.DateRange[]) => {
                        this._model.teamDaysOff(updatedDateRanges);
                    }
                });
            });
        });
    }

    /**
    * Adds missing team members 
    */
    public addMissingTeamMembers() {
        this.isProcessing(true);
        this._context.addMissingTeamMembersUsed++;
        const teamMembersPromise = this._beginGetExpandedTeamMembers().then((members: Work_Contracts.Member[]) => {
            this._clearValidationMessageComputed();
            this._model.setupMerge();
            var totalMembersAdded = this._model.mergeMembers(members);
            this._model.endMerge();
            this.isProcessing(false);
            this._setupValidationMessageComputed();
            //We need to clear the previous value so knockout subscribers get the notifications
            this._context.teamMembersAdded(TeamCapacityContext.CLEAR_TEAMMEMBER_ADDED_VALUE);
            this._context.teamMembersAdded(totalMembersAdded);
        }, (reason) => {
            if (!reason) {
                reason = SprintPlanningResources.Capacity_CannotGetMembers;
            }
            this._context.message(<IMessage>{
                message: reason,
                type: Notifications.MessageAreaType.Error
            });
            this.isProcessing(false);
        });
        // Accessible loading experience
        ProgressAnnouncer.forPromise(teamMembersPromise, {
            announceStartMessage: SprintPlanningResources.CapacityLoading_PopulateTeamMembersStart,
            announceEndMessage: SprintPlanningResources.CapacityLoading_PopulateTeamMembersEnd,
            announceErrorMessage: SprintPlanningResources.CapacityLoading_PopulateTeamMembersError
        });
    }

    private _beginGetExpandedTeamMembers(): IPromise<Work_Contracts.Member[]> {
        var tfsContext = TFS_Host_TfsContext.TfsContext.getDefault();
        var deferred = Q.defer<Work_Contracts.Member[]>();
        var actionUrl = tfsContext.getActionUrl(
            "getexpandedteammembers",
            "teamcapacity",
            {
                area: "api",
                includeVersion: true
            });

        Ajax.getMSJSON(actionUrl, null, (data) => {
            if (data.success) {
                deferred.resolve(data.users);
            }
            else {
                deferred.reject(data.message);
            }
        }, (error) => {
            deferred.reject(error);
        });

        return deferred.promise;
    }

    /** 
    * Disposed function
    */
    public dispose() {
        this._clearValidationMessageComputed();
        super.dispose();
    }

    /**
    * The message computed is throttled and it could execute after a bulk operation is done
    * There might be some errors in the bulk operation that we do not want to clear when the computed causes
    * messages to clear, ideally we should be using rateLimit instead of throttle, but that is not available in current version of Knockout
    * other option is to implement rateLimit extender our selves, but I do not see any value at this time.
    * We have a story in our backlog to improve the validation error messages and do not use this banner anyway
    * https://mseng.visualstudio.com/DefaultCollection/VSOnline/_workitems/edit/388249
    */
    private _clearValidationMessageComputed() {
        if (this._validationMessageComputed) {
            this._validationMessageComputed.dispose();
            this._validationMessageComputed = null;
        }
    }

    private _setupValidationMessageComputed() {
        this._clearValidationMessageComputed();
        this._validationMessageComputed = ko.computed(() => {
            if (!this._model.pauseCalculations()) {
                var isCpdsValid = true;
                var isNamesValid = true;
                var messages: string[] = []
                this.capacities().forEach((capacity: TeamMemberCapacityViewModel) => {
                    capacity.activities().forEach((activity: ActivityViewModel) => {
                        if (!activity.isCpdValid()) {
                            isCpdsValid = false;
                        }
                        if (!activity.isNameValid()) {
                            isNamesValid = false;
                        }
                    });
                });
                if (isCpdsValid && isNamesValid) {
                    this._context.clearMessage();
                    return;
                }
                if (!isCpdsValid) {
                    messages.push(Utils_String.format(SprintPlanningResources.Capacity_InvalidField, SprintPlanningResources.Capacity_CapacityHeader));
                }
                if (!isNamesValid) {
                    messages.push(Utils_String.format(SprintPlanningResources.Capacity_InvalidField, this._context.ACTIVITY_FIELD_DISPLAY_NAME));
                }
                this._context.message(<IMessage>{
                    message: messages.join('\n'),
                    type: Notifications.MessageAreaType.Error
                });
            }
        });
        this._validationMessageComputed.extend({ throttle: this._validationDelay });
    }
}

/**
 * Represents the View Model for Activity data for binding to UI.
 */
export class ActivityViewModel {
    //Max Length for capacity input
    public MAX_LENGTH: number = 6;

    public isValid: KnockoutComputed<boolean>;
    public isCpdValid: KnockoutObservable<boolean>;
    public isNameValid: KnockoutObservable<boolean>;
    public isDirty: KnockoutComputed<boolean>;
    public showEllipsisMenu: KnockoutObservable<boolean>;
    public capacityPerDay: KnockoutComputed<number>;
    public capacityPerDayString: KnockoutObservable<string>;
    public name: KnockoutObservable<string>;
    public model: Capacity_Models.ActivityModel;
    public activityNameControl: TFS_SimpleFieldControl.SimpleFieldControl;

    constructor(model: Capacity_Models.ActivityModel) {
        this.model = model;
        this.isValid = model.isValid;
        this.isCpdValid = model.isCpdValid;
        this.isNameValid = model.isNameValid;
        this.showEllipsisMenu = ko.observable(false);
        this.capacityPerDayString = model.capacityPerDayString;

        this.capacityPerDay = model.capacityPerDay;
        this.name = model.name;

        this.isDirty = model.isDirty;
        this.name.subscribe((activityName: string) => {
            if (this.activityNameControl) {
                if (this.activityNameControl.getText() !== activityName) {
                    this.activityNameControl.setText(activityName);
                }
            }
        });
    }
}

/**
 * View model for the capacity for a single team member
 */
export class TeamMemberCapacityViewModel {
    //Ellipsis Menu Commands
    public static ELLIPSIS_CMD_ADD: string = "add-activity";
    public static ELLIPSIS_CMD_REMOVE: string = "remove-activity";
    public static ELLIPSIS_CMD_REMOVE_USER: string = "remove-user";

    public isValid: KnockoutComputed<boolean>;
    public isDirty: KnockoutComputed<boolean>;
    public totalDaysOff: KnockoutComputed<string>;
    public totalCapacityPerDay: KnockoutComputed<number>;
    public totalRemainingActivityCapacityMap: KnockoutComputed<IDictionaryStringTo<number>>;
    public activities: KnockoutObservableArray<ActivityViewModel> = ko.observableArray([]);
    public daysOff: KnockoutObservableArray<Work_Contracts.DateRange>;

    public displayName: string;
    public teamMemberId: string;
    public uniqueName: string;
    public model: Capacity_Models.TeamMemberCapacityModel;
    private _context: TeamCapacityContext;
    private _container: TeamCapacityViewModel;

    constructor(model: Capacity_Models.TeamMemberCapacityModel, context: TeamCapacityContext, container: TeamCapacityViewModel) {
        this.model = model;
        this._context = context;
        this._container = container;
        this.displayName = model.displayName;
        this.teamMemberId = model.id;
        this.uniqueName = model.uniqueName;
        this._initialize(model);

        this.daysOff = model.daysOff;
        this.totalCapacityPerDay = model.totalCapacityPerDay;
        this.totalDaysOff = model.totalDaysOff;
        this.totalRemainingActivityCapacityMap = model.totalRemainingActivityCapacityMap;
        this.isDirty = model.isDirty;
        this.isValid = model.isValid;

        //Subscribe to activities array change to add/remove view models
        this.model.activities.subscribeArrayChanged((addedActivity: Capacity_Models.ActivityModel) => {
            var activityViewModel = new ActivityViewModel(addedActivity);
            var index = this.model.activities.indexOf(addedActivity);
            this.activities.splice(index, 0, activityViewModel); //Insert at same index as the activityModel for consistency
        }, (removedActivity: Capacity_Models.ActivityModel) => {
            var avmToRemove: ActivityViewModel = Utils_Array.first(this.activities(), vm => vm.model === removedActivity);

            if (avmToRemove) {
                this.activities.remove(avmToRemove);
            }
        });
    }

    public insertBlankActivity(insertAfterActivity: ActivityViewModel): void {
        var newActivity = this.model.newEmptyActivity();
        var index = this.activities.indexOf(insertAfterActivity);
        this.model.activities.splice(index + 1, 0, newActivity); //Insert at specific location
    }

    public removeActivity(activity: ActivityViewModel): void {
        this.model.activities.remove(activity.model);
        activity.model.dispose();
    }


    public insertCustomControls = (element: HTMLElement, data: ActivityViewModel) => {
        let editable: boolean = this._container.controlIsEditable;
        let activityEnabled: boolean = this._container.activityEnabled;
        if (activityEnabled) {
            //create the Activity Drop Down
            var $activityDropDownCell = $(element).find('.capacity-activity-cell');

            var activityControl = new TFS_SimpleFieldControl.SimpleFieldControl($activityDropDownCell, this._context.ActivityFieldDataProvider,
                {
                    label: Utils_String.format(SprintPlanningResources.Capacity_ActivityLabel, this.displayName),
                    enabled: editable
                });
            data.activityNameControl = activityControl;

            // Apply the initial value to the activity control.
            activityControl.setText(data.name());

            // Setup change handler to update the team member activity when the field is valid.
            activityControl.attachFieldChanged((sender, args) => {
                if (this._context.ActivityFieldDataProvider.isValidValue(args.textValue)) {
                    // NOTE: No need to go through the event queuing for this change as the value is only set when
                    //       the value is valid not on each user keystroke.
                    data.name(args.textValue);
                    data.isNameValid(true);
                }
                else {
                    data.isNameValid(false);
                }
                Diag.logTracePoint("CapacityView.activityFieldChanged.complete");
            });
        }

        //create the ellipsis menu
        var $ellipsisMenuContainer = $(element).find('.ellipsis-menu-container');

        var menu = <TFS_EllipsisMenuBar.EllipsisMenuBar>Controls.BaseControl.createIn(TFS_EllipsisMenuBar.EllipsisMenuBar, $ellipsisMenuContainer, {
            iconType: "bowtie-icon bowtie-ellipsis",
            subItems: this._createEllipsisMenuItems(),
            executeAction: this._onEllipsisMenuItemClick,
            arguments: { activity: data } //we have to do wrap it as an object, otherwise somewhere down the line data gets copied and it wont be the 'same' object anymore
        });

        this.activities.subscribe((activities: ActivityViewModel[]) => {
            menu.updateCommandStates(this._updatedEllipsisMenuItemStates(activities.length <= 1));
        });
        menu.updateCommandStates(this._updatedEllipsisMenuItemStates(this.activities().length <= 1));

        var $ellipsisMenuFocusReceiver = $ellipsisMenuContainer.find('.icon-only');

        $ellipsisMenuFocusReceiver.focusin((event: JQueryEventObject) => {
            data.showEllipsisMenu(true);
        });

        $ellipsisMenuFocusReceiver.focusout((event: JQueryEventObject) => {
            if ($ellipsisMenuFocusReceiver.find(".menu").css("display") === "none") {
                data.showEllipsisMenu(false);
            }
        });

        //bind to focus and blur to show ellipsis menu
        //There is a bug in old versions of Knockout that makes the 'hasFocus' binding not work (fixed in Knockout 3.0+)
        var $inputs = $(element).find('input');

        $inputs.focusin((event: JQueryEventObject) => {
            data.showEllipsisMenu(true);
        });

        $inputs.focusout((event: JQueryEventObject) => {
            Utils_Core.delay(this, 0, () => {
                if (!$ellipsisMenuFocusReceiver.is(":focus") && !$inputs.is(":focus")) {
                    data.showEllipsisMenu(false);
                }
            });
        });
    }

    /**
     * Launches the days off dialog for viewing/editing the days off for the team member.
     */
    public editDaysOff = (data: TeamMemberCapacityViewModel, e: Event) => {
        var teamMemberIdentity: TFS_OM_Identities.IIdentityReference = TFS_OM_Identities.IdentityHelper.parseUniquefiedIdentityName(this.displayName);
        Dialogs.Dialog.beginExecuteDialogAction(() => {

            // Wait to invoke the dialog so it does not get closed immediately
            // when opening from a keyboard event.
            Utils_Core.delay(this, 0, () => {
                Dialogs.show(Capacity_Models.DaysOffDialog, {
                    title: Utils_String.format(SprintPlanningResources.DaysOffDialog_TeamMemberTitle, teamMemberIdentity.displayName),
                    dateRanges: $.extend(true, [], this.daysOff()),
                    excludeTeamDaysOff: true,
                    okCallback: (updatedDateRanges: Work_Contracts.DateRange[]) => {
                        this.daysOff(updatedDateRanges);
                    }
                });
            });
        });
    }

    private _initialize(model: Capacity_Models.TeamMemberCapacityModel) {
        this.activities(model.activities().map((activity) => new ActivityViewModel(activity)));
    }

    private _createEllipsisMenuItems(): Menus.IMenuItemSpec[] {
        var menuItemSpec = <Menus.IMenuItemSpec[]>[
            {
                id: TeamMemberCapacityViewModel.ELLIPSIS_CMD_ADD,
                title: SprintPlanningResources.Capacity_AddActivity,
                text: SprintPlanningResources.Capacity_AddActivity
            },
            {
                id: TeamMemberCapacityViewModel.ELLIPSIS_CMD_REMOVE,
                title: SprintPlanningResources.Capacity_RemoveActivity,
                text: SprintPlanningResources.Capacity_RemoveActivity
            }];

        menuItemSpec.push({
            id: TeamMemberCapacityViewModel.ELLIPSIS_CMD_REMOVE_USER,
            title: SprintPlanningResources.Capacity_RemoveUser,
            text: SprintPlanningResources.Capacity_RemoveUser,
            icon: "bowtie-icon bowtie-edit-delete"
        });
        return menuItemSpec;

    }

    private _updatedEllipsisMenuItemStates(disableRemove: boolean): Menus.ICommand[] {
        return <Menus.ICommand[]>[
            { id: TeamMemberCapacityViewModel.ELLIPSIS_CMD_ADD },
            { id: TeamMemberCapacityViewModel.ELLIPSIS_CMD_REMOVE, disabled: disableRemove },
            { id: TeamMemberCapacityViewModel.ELLIPSIS_CMD_REMOVE_USER }
        ];
    }

    private _onEllipsisMenuItemClick = (e?: any) => {
        Diag.Debug.assertParamIsObject(e, "e");

        var command: string = e.get_commandName();
        var activity: ActivityViewModel = e.get_commandArgument().activity;
        switch (command) {
            case TeamMemberCapacityViewModel.ELLIPSIS_CMD_ADD:
                this.insertBlankActivity(activity);
                break;
            case TeamMemberCapacityViewModel.ELLIPSIS_CMD_REMOVE:
                this.removeActivity(activity);
                break;
            case TeamMemberCapacityViewModel.ELLIPSIS_CMD_REMOVE_USER:
                this._removeUser();
                break;
            default:
                Diag.Debug.fail("Ellipsis Menu command was not an expected string");
                break;
        }
        return false;
    }
    private _removeUser() {
        this._container.removeUser(this);
    }
}

