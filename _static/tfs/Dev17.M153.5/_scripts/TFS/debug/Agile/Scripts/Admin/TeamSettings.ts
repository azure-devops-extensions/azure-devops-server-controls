import Q = require("q");

import * as AdminResources from "Admin/Scripts/Resources/TFS.Resources.Admin";
import * as AgileResources from "Agile/Scripts/Resources/TFS.Resources.Agile";
import * as AgileAdminResources from "Agile/Scripts/Resources/TFS.Resources.AgileAdmin";
import {
  BacklogConfiguration,
  BacklogConfigurationService,
  IBacklogLevelConfiguration
} from "Presentation/Scripts/TFS/FeatureRef/BacklogConfiguration/Service";
import { ITeamSettings } from "Presentation/Scripts/TFS/FeatureRef/TFS.AgileCommon";
import { WorkItemTypeColorAndIcons } from "Presentation/Scripts/TFS/FeatureRef/WorkItemTypeColorAndIconsProvider";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { TeamContext } from "TFS/Core/Contracts";
import {
  BugsBehavior,
  TeamSetting,
  TeamSettingsPatch
} from "TFS/Work/Contracts";
import { WorkHttpClient } from "TFS/Work/RestClient";
import {
  ITeamPermissions,
  TeamPermissionService
} from "TfsCommon/Scripts/Team/Services";
import { DayOfWeek } from "VSS/Common/Contracts/System";
import { WebPageDataService } from "VSS/Contributions/Services";
import * as Controls from "VSS/Controls";
import { CheckboxList, ICheckboxListItem } from "VSS/Controls/CheckboxList";
import * as Notifications from "VSS/Controls/Notifications";
import { RichContentTooltip } from "VSS/Controls/PopupContent";
import { Debug, logTracePoint } from "VSS/Diag";
import { getHistoryService } from "VSS/Navigation/Services";
import * as VSS_Resources_Common from "VSS/Resources/VSS.Resources.Common";
import * as Service from "VSS/Service";
import { delegate, parseMSJSON, throttledDelegate } from "VSS/Utils/Core";
import * as Utils_String from "VSS/Utils/String";
import * as VSS from "VSS/VSS";

const tfsContext = TfsContext.getDefault();

export enum BugsBehaviorSettingVisibility {
  ShowInvalidConfigurationMessage = 0, // Show a message the process configuration is invalid
  ShowInvalidConfigurationMessageHosted = 1, // Show a message that the process configuration is valid for hosted
  Show = 2, // Show the Setting
  ShowWithMissingFieldsWarning = 3 // Show the Setting Enabled with the appropriate warning message for Missing Fields
}

export interface IBugSettingData {
  uiState: BugsBehaviorSettingVisibility;
  missingFields: string;
  workItemType: string;
}

/// <summary>
///     Provides controls to support changing team level settings from the admin page
/// </summary>
export class TeamSettingsControl extends Controls.BaseControl {
  public static enhancementTypeName: string = "tfs.admin.TeamSettingsControl";

  private _workHttpClient: WorkHttpClient = null;

  private _teamSettings: ITeamSettings;

  constructor(options?) {
    super(options);

    const tfsConnection = new Service.VssConnection(tfsContext.contextData);
    this._workHttpClient = tfsConnection.getHttpClient<WorkHttpClient>(
      WorkHttpClient
    );
    this._teamSettings = options.teamSettings;
  }

  public initialize() {
    super.initialize();

    const element = this.getElement();

    const { projectId, teamId } = this._teamSettings;
    const permissionsPromise = Service.getService(
      TeamPermissionService
    ).beginGetTeamPermissions(projectId, teamId);
    const backlogConfigurationPromise = BacklogConfigurationService.beginGetBacklogConfiguration(
      teamId,
      tfsContext
    );

    Promise.all([permissionsPromise, backlogConfigurationPromise]).then(
      ([permissions, backlogConfiguration]) => {
        // No Permissions Error message
        if (!permissions.currentUserHasTeamAdminPermission) {
          const messageAreaOption: Notifications.IMessageAreaControlOptions = {
            closeable: false,
            showIcon: true,
            type: Notifications.MessageAreaType.Warning
          };
          const $messageAreaContainer: JQuery = $("<div/>").appendTo(element);
          const noPermissionsMessageArea = Controls.Control.create(
            Notifications.MessageAreaControl,
            $messageAreaContainer,
            messageAreaOption
          );
          noPermissionsMessageArea.setMessage(
            Utils_String.format(
              AgileResources.TeamSettings_NoPermissionsWarning,
              AgileResources.TeamSettings_NoPermissionsGeneral
            ),
            Notifications.MessageAreaType.Warning
          );
        }

        /////////  BACKLOG LEVELS  /////////

        const $blSettings = $("<div />")
          .addClass("backlog-levels-settings-control")
          .appendTo(element);

        <BacklogVisibilitiesTeamSettingControl>Controls.BaseControl.createIn(
          BacklogVisibilitiesTeamSettingControl,
          $blSettings,
          {
            workHttpClient: this._workHttpClient,
            teamSettings: this._teamSettings,
            backlogConfiguration: backlogConfiguration,
            editable: permissions.currentUserHasTeamAdminPermission,
            currentUserTeamPermissions: permissions,
            immediateSave: true
          }
        );

        //////////  WORKING DAYS  //////////
        const $WorkingDaysContainer = $("<div />")
          .addClass("working-days-container")
          .appendTo(element);

        <WorkingDaysTeamSettingControl>Controls.BaseControl.createIn(
          WorkingDaysTeamSettingControl,
          $WorkingDaysContainer,
          {
            workHttpClient: this._workHttpClient,
            teamSettings: this._teamSettings,
            backlogConfiguration: backlogConfiguration,
            editable: permissions.currentUserHasTeamAdminPermission,
            currentUserTeamPermissions: permissions,
            immediateSave: true
          }
        );

        /////////  BUGS BEHAVIOR  //////////
        // Section header
        const $bbSettings = $("<div />")
          .addClass("bugs-behavior-settings-container")
          .appendTo(element);

        <BugsBehaviorTeamSettingControl>Controls.BaseControl.createIn(
          BugsBehaviorTeamSettingControl,
          $bbSettings,
          {
            workHttpClient: this._workHttpClient,
            teamSettings: this._teamSettings,
            bugSettingData: this._options.bugsBehaviorState,
            editable: permissions.currentUserHasTeamAdminPermission,
            currentUserTeamPermissions: permissions,
            immediateSave: true
          }
        );
      }
    );
  }

  public show() {
    this.getElement().show();
  }

  public hide() {
    this.getElement().hide();
  }
}

VSS.classExtend(TeamSettingsControl, TfsContext.ControlExtensions);

export interface IBaseTeamSettingControlOptions {
  /** A Work REST API client to use for saving any changes to the team settings. */
  workHttpClient: WorkHttpClient;

  /** A flag to check if immediateSave is enabled. If not set, caller must explicitly call beginSave to save changes. */
  immediateSave?: boolean;

  /** A flag to check if the non admin error message is enabled. */
  displayNoPermissionsMessage?: boolean;

  currentUserTeamPermissions: ITeamPermissions;
}

export interface IBacklogLevel {
  id: string;
  name: string;
  color: string;
}

export class BaseTeamSettingControl extends Controls.BaseControl {
  protected _isDirty: boolean;
  protected _isValid: boolean;

  protected _immediateSave: boolean;

  // Set value for this in implementing class constructor to use
  protected _noPermissionsWarningMessageTarget: string;

  protected _titleText: string;
  protected _valuePropositionText: string;
  protected _sectionHeaderText: string;
  protected _explanationText: string;
  protected _$title: JQuery;
  protected _$valueProposition: JQuery;
  protected _$sectionContainer: JQuery;
  protected _$sectionHeader: JQuery;
  protected _$explanation: JQuery;
  protected _$contentContainer: JQuery;

  protected _sectionWarningMessageArea: Notifications.MessageAreaControl;
  protected _$errorMessageArea;
  protected _$errorMessageTextArea;

  protected _workHttpClient: WorkHttpClient = null;
  protected _currentUserTeamPermissions: ITeamPermissions;

  private _onDirtyStateChanged: Function;
  private _onValidStateChanged: Function;

  constructor(options: IBaseTeamSettingControlOptions) {
    super(options);

    this._immediateSave = options.immediateSave;
    this._isDirty = false;
    this._isValid = true;
    this._currentUserTeamPermissions = options.currentUserTeamPermissions;

    // Gracefully create a Work HTTP Client if we weren't given one.
    this._workHttpClient = options.workHttpClient;
    if (!this._workHttpClient) {
      Debug.fail(
        "Team settings controls should be given a Work HTTP Client, to avoid re-creating one."
      );
      const tfsConnection = new Service.VssConnection(tfsContext.contextData);
      this._workHttpClient = tfsConnection.getHttpClient<WorkHttpClient>(
        WorkHttpClient
      );
    }
  }

  public initialize() {
    super.initialize();

    this._completeBaseControlSetup();
  }

  private _completeBaseControlSetup(): void {
    const element = this.getElement();

    // prepare to create warning messages
    const messageAreaOption: Notifications.IMessageAreaControlOptions = {
      closeable: false,
      showIcon: true,
      type: Notifications.MessageAreaType.Warning
    };
    let $messageAreaContainer: JQuery;

    if (
      this._options.displayNoPermissionsMessage &&
      !this._currentUserTeamPermissions.currentUserHasTeamAdminPermission &&
      this._noPermissionsWarningMessageTarget !== null
    ) {
      $messageAreaContainer = $("<div/>").appendTo(element);
      const noPermissionsMessageArea = Controls.Control.create(
        Notifications.MessageAreaControl,
        $messageAreaContainer,
        messageAreaOption
      );
      noPermissionsMessageArea.setMessage(
        Utils_String.format(
          AdminResources.TeamSettings_NoPermissionsWarning,
          this._noPermissionsWarningMessageTarget
        ),
        Notifications.MessageAreaType.Warning
      );
    }

    this._$title = $("<h2 />")
      .addClass("main-header")
      .appendTo(element);
    if (this._titleText !== null) {
      this._$title.text(this._titleText);
    }

    this._$valueProposition = $("<div />")
      .addClass("main-description")
      .appendTo(element);
    if (this._valuePropositionText != null) {
      this._$valueProposition.html(this._valuePropositionText);
    }

    this._$sectionContainer = $("<div />")
      .addClass("team-settings-section")
      .appendTo(element);

    if (this._sectionHeaderText != null) {
      this._$sectionHeader = $("<div />")
        .addClass("section-header")
        .appendTo(this._$sectionContainer);
      this._$sectionHeader.text(this._sectionHeaderText);
    }

    this._$explanation = $("<div />")
      .addClass("section-description")
      .appendTo(this._$sectionContainer);
    if (this._explanationText != null) {
      this._$explanation.text(this._explanationText);
    }

    // Add warning message area in section
    $messageAreaContainer = $("<div/>").appendTo(this._$sectionContainer);
    this._sectionWarningMessageArea = Controls.Control.create(
      Notifications.MessageAreaControl,
      $messageAreaContainer,
      messageAreaOption
    );

    this._$errorMessageTextArea = $("<div>").addClass("error-message");
    this._$errorMessageArea = $("<div>")
      .addClass("common-message-area")
      .append($("<div>").addClass("bowtie-icon bowtie-status-error"))
      .append(this._$errorMessageTextArea)
      .appendTo(this._$sectionContainer);
    this._$errorMessageArea.hide();

    // Note: CSC should eventually moved to bowtie from bowtie-style. Then this bowtie class can be removed.
    // This is to keep consistency between CSC and Work admin page.
    this._$contentContainer = $("<div />")
      .addClass("team-settings bowtie")
      .appendTo(this._$sectionContainer);

    this._completeInitialization();
  }

  protected _completeInitialization(): void {}

  // NOTE(!IMP): Always override this method.
  public beginSave(): IPromise<TeamSetting> {
    throw new Error("This is an abstract method.");
  }

  public isValid(): boolean {
    return this._isValid;
  }

  public isDirty(): boolean {
    return this._isDirty;
  }

  /**
   * Do nothing unless subclass decides to override
   */
  public onTabActivated() {}

  public registerStateChangedEvents(
    onDirtyStateChanged: Function,
    onValidStateChanged: Function
  ) {
    this._onDirtyStateChanged = onDirtyStateChanged;
    this._onValidStateChanged = onValidStateChanged;
  }

  protected resetDirtyAndValidStates() {
    this.raiseDirtyStateChange(false);
    this.raiseValidStateChange(true);
  }

  protected raiseDirtyStateChange(newState: boolean): void {
    if (this._isDirty !== newState) {
      this._isDirty = newState;
      if ($.isFunction(this._onDirtyStateChanged)) {
        this._onDirtyStateChanged();
      }
    }
  }

  protected raiseValidStateChange(newState: boolean): void {
    if (this._isValid !== newState) {
      this._isValid = newState;
      if ($.isFunction(this._onValidStateChanged)) {
        this._onValidStateChanged();
      }
    }
  }

  protected _saveHelper(
    patch: TeamSettingsPatch,
    logPrefix: string,
    resetOriginalValue: Function,
    errorPrefix?: string
  ): IPromise<TeamSetting> {
    const teamSettings: ITeamSettings = this._options.teamSettings;

    const teamContext: TeamContext = {
      projectId: teamSettings.projectId,
      teamId: teamSettings.teamId,
      project: undefined,
      team: undefined
    };
    const deferred = Q.defer<TeamSetting>();

    //Update team settings with patch that was passed in
    this._workHttpClient.updateTeamSettings(patch, teamContext).then(
      //Successful save
      (value: TeamSetting) => {
        logTracePoint(`${logPrefix}.complete`);
        this.resetDirtyAndValidStates();
        resetOriginalValue();
        deferred.resolve(value);
      },
      //Error handling
      (reason: Error) => {
        logTracePoint(`${logPrefix}.error`);
        //Optional error prefix to add to the error message
        if (errorPrefix) {
          reason.message = errorPrefix + reason.message;
        }
        //Admin page uses immediate save, display error message since these pages will not get the promise
        if (this._immediateSave) {
          VSS.errorHandler.showError(reason.message);
        }
        deferred.reject(reason);
      }
    );
    return deferred.promise;
  }

  public onResize() {
    // Interface implementation, no-op
  }
}

export interface IBugsBehaviorTeamSettingControlOptions {
  /** A Work REST API client to use for saving any changes to the team settings. */
  workHttpClient: WorkHttpClient;

  /** The current team settings.
   *  NOTE: This must be in the Admin- area serialization format, not in 'TFS_OM_Common.ITeamSettings' format.
   */
  teamSettings: ITeamSettings;

  /** The Bug Settings. */
  bugSettingData: IBugSettingData;

  /** The delay (in ms) to wait & collate changes to the backlog visibilities before saving the team setting. */
  saveDelay?: number;

  currentUserTeamPermissions: ITeamPermissions;
}

/** Displays a radio button list with images of Bug Behavior */
export class BugsBehaviorTeamSettingControl extends BaseTeamSettingControl {
  protected static _doNotShowBugsId = "Off";
  protected static _showBugsAsRequirementsId = "AsRequirements";
  protected static _showBugsAsTasksId = "AsTasks";
  protected static _radioBugsName = "bugs-behavior-radio";

  private _throttledSetBugsBehaviorDelegate: Function;

  private _bugSettingData: IBugSettingData;
  private _origBugsBehavior: string;

  constructor(options: IBugsBehaviorTeamSettingControlOptions) {
    super(options);

    // Throttle the save, unless asked not to.
    if (options.saveDelay === 0) {
      this._throttledSetBugsBehaviorDelegate = delegate(this, this.beginSave);
    } else {
      const throttledDelay: number = options.saveDelay || 300;
      this._throttledSetBugsBehaviorDelegate = throttledDelegate(
        this,
        throttledDelay,
        this.beginSave
      );
    }

    this._titleText = AgileAdminResources.TeamSettings_BugsBehavior_Title;
    this._valuePropositionText = Utils_String.format(
      AgileAdminResources.TeamSettings_BugsBehavior_ValueProp,
      Utils_String.format(
        "<a href='{0}' class='learn-more-link' target='_blank' rel='noopener noreferrer'>{1}</a>",
        AgileAdminResources.TeamSettings_BugsBehavior_FwdLink,
        AgileAdminResources.TeamSettings_BugsBehavior_FwdLinkText
      )
    );

    if (
      options.bugSettingData === undefined ||
      options.bugSettingData === null
    ) {
      this._bugSettingData = this._checkCachedDataForBugsUIState();
    } else {
      this._bugSettingData = options.bugSettingData;
    }

    this._noPermissionsWarningMessageTarget =
      AgileAdminResources.TeamSettings_BugsBehavior_NoPermissions;

    //Input asserts
    Debug.assertIsObject(
      this._bugSettingData,
      "Bug setting data must be provided to the BugsBehaviorTeamSettingControl."
    );
  }

  public initialize(): void {
    super.initialize();
  }

  /**
   * Set first tabbable element to focus when this control is activated
   */
  public onTabActivated() {
    $(".learn-more-link", this._element).focus();
  }

  protected _completeInitialization(): void {
    const $bugsBehaviorRadioDiv = $("<div>").addClass("teamsettings-radiolist");
    // Team settings may be passed in with camelcasing
    const bugsBehavior = this._getBugsBehaviorFromTeamSettings();

    // Set the original behavior
    switch (bugsBehavior) {
      case BugsBehavior.AsRequirements:
        this._origBugsBehavior =
          BugsBehaviorTeamSettingControl._showBugsAsRequirementsId;
        break;
      case BugsBehavior.AsTasks:
        this._origBugsBehavior =
          BugsBehaviorTeamSettingControl._showBugsAsTasksId;
        break;
      default:
        this._origBugsBehavior =
          BugsBehaviorTeamSettingControl._doNotShowBugsId;
    }

    // Bugs as Requirements Radio Button
    const bugsAsRequirements = this._createNewRadioButton(
      BugsBehaviorTeamSettingControl._showBugsAsRequirementsId,
      AgileAdminResources.TeamSettings_BugsBehavior_ShowBugsAsRequirements,
      AgileAdminResources.TeamSettings_BugsBehavior_ShowBugsAsRequirementsAdditional,
      bugsBehavior === BugsBehavior.AsRequirements,
      this._currentUserTeamPermissions.currentUserHasTeamAdminPermission
    );

    // Bugs as Tasks Radio Button
    const bugsAsTasks = this._createNewRadioButton(
      BugsBehaviorTeamSettingControl._showBugsAsTasksId,
      AgileAdminResources.TeamSettings_BugsBehavior_ShowBugsAsTasks,
      AgileAdminResources.TeamSettings_BugsBehavior_ShowBugsAsTasksAdditional,
      bugsBehavior === BugsBehavior.AsTasks,
      this._currentUserTeamPermissions.currentUserHasTeamAdminPermission
    );

    // Dont show bugs option
    // Do not show comes in as undefined
    const dontShowBugs = this._createNewRadioButton(
      BugsBehaviorTeamSettingControl._doNotShowBugsId,
      AgileAdminResources.TeamSettings_BugsBehavior_DoNotShowBugs,
      AgileAdminResources.TeamSettings_BugsBehavior_DoNotShowBugsAdditional,
      !bugsBehavior,
      this._currentUserTeamPermissions.currentUserHasTeamAdminPermission
    );

    $bugsBehaviorRadioDiv
      .append(bugsAsRequirements)
      .append(bugsAsTasks)
      .append(dontShowBugs);

    this._$contentContainer.append($bugsBehaviorRadioDiv);

    if (
      this._bugSettingData.uiState ===
      BugsBehaviorSettingVisibility.ShowWithMissingFieldsWarning
    ) {
      // show the warning for missing effort field
      this._sectionWarningMessageArea.setMessage(
        $("<span>").html(
          Utils_String.format(
            AgileAdminResources.TeamSettings_BugsBehavior_FieldsMissingWarning,
            this._bugSettingData.workItemType,
            this._bugSettingData.missingFields,
            Utils_String.format(
              "<a href='{0}' target='_blank' rel='noopener noreferrer'>{1}</a>",
              this._getEnableFeaturesUrl(),
              AdminResources.FeatureEnablementLinkText
            ),
            Utils_String.format(
              "<a href='{0}' target='_blank' rel='noopener noreferrer'>{1}</a>",
              VSS_Resources_Common.TeamSettings_ManualCorrectionLink,
              VSS_Resources_Common.TeamSettings_ManualCorrectionStepsLinkText
            )
          )
        ),
        Notifications.MessageAreaType.Warning
      );
    }

    if (
      this._bugSettingData.uiState ===
        BugsBehaviorSettingVisibility.ShowInvalidConfigurationMessage ||
      this._bugSettingData.uiState ===
        BugsBehaviorSettingVisibility.ShowInvalidConfigurationMessageHosted
    ) {
      this._sectionWarningMessageArea.setMessage(
        $("<span>").html(
          VSS_Resources_Common.FeatureEnablementSettings_Error_Invalid_Admin +
            " " +
            Utils_String.format(
              AdminResources.TeamSettings_AttemptToFixConfiguration,
              Utils_String.format(
                "<a href='{0}' target='_blank' rel='noopener noreferrer'>{1}</a>",
                this._getEnableFeaturesUrl(),
                AdminResources.FeatureEnablementLinkText
              ),
              Utils_String.format(
                "<a href='{0}' target='_blank' rel='noopener noreferrer'>{1}</a>",
                VSS_Resources_Common.TeamSettings_ManualCorrectionLink,
                VSS_Resources_Common.TeamSettings_ManualCorrectionStepsLinkText
              )
            )
        ),
        Notifications.MessageAreaType.Warning
      );
    }
  }

  private _getBugsBehaviorFromTeamSettings(): number {
    let bugsBehavior: number = this._options.teamSettings.bugsBehavior;

    if (typeof bugsBehavior === "string") {
      if (
        Utils_String.ignoreCaseComparer(
          bugsBehavior,
          BugsBehaviorTeamSettingControl._showBugsAsRequirementsId
        ) === 0
      ) {
        bugsBehavior = BugsBehavior.AsRequirements;
      } else if (
        Utils_String.ignoreCaseComparer(
          bugsBehavior,
          BugsBehaviorTeamSettingControl._showBugsAsTasksId
        ) === 0
      ) {
        bugsBehavior = BugsBehavior.AsTasks;
      } else if (
        Utils_String.ignoreCaseComparer(
          bugsBehavior,
          BugsBehaviorTeamSettingControl._doNotShowBugsId
        ) === 0
      ) {
        bugsBehavior = BugsBehavior.Off;
      }
    }
    return bugsBehavior;
  }

  private _createNewRadioButton(
    id: string,
    label: string,
    additionalInfo: string,
    isChecked: boolean,
    currentUserHasTeamAdminPermission: boolean
  ): JQuery {
    // Radio Button
    const $newRadioButton = $("<div>");
    const $newInput = $("<input>")
      .attr("type", "radio")
      .attr("name", BugsBehaviorTeamSettingControl._radioBugsName)
      .attr("id", id)
      .prop("checked", isChecked && this._isBugsBehaviorSettingEnabled())
      .prop("disabled", e => {
        // disable if permissions are insufficient
        if (
          !currentUserHasTeamAdminPermission ||
          !this._isBugsBehaviorSettingEnabled()
        ) {
          return true;
        } else {
          return false;
        }
      })
      .bind("change", delegate(this, this._onBugsBehaviorChanged));

    // Label
    const radioButtonLabel = $("<label>")
      .text(label)
      .attr("for", id);

    // Additional info
    const $infoIcon = $("<span>").addClass(
      "bugs-behavior-info bowtie-icon bowtie-status-info-outline"
    );
    const tooltipControl = RichContentTooltip.add(additionalInfo, $infoIcon);
    // Keyboard Navigation behavior
    $newInput.keyup(() => tooltipControl.show());
    $newInput.focusout(() => tooltipControl.hide());
    // Attach all content divs
    $newRadioButton
      .append($newInput)
      .append(radioButtonLabel)
      .append($infoIcon);
    return $newRadioButton;
  }

  private _isBugsBehaviorSettingEnabled(): boolean {
    return (
      this._bugSettingData.uiState === BugsBehaviorSettingVisibility.Show ||
      this._bugSettingData.uiState ===
        BugsBehaviorSettingVisibility.ShowWithMissingFieldsWarning
    );
  }

  protected _onBugsBehaviorChanged() {
    logTracePoint("TFS.Admin.Overview.Bugs._onBugsBehaviorChanged");
    if (this._immediateSave && this._isValid) {
      this._throttledSetBugsBehaviorDelegate();
    }

    this.raiseDirtyStateChange(
      this._origBugsBehavior !== this._getBugsBehavior()
    );
    this.raiseValidStateChange(this._isValid);
  }

  protected _resetOriginalBugsBehavior() {
    this._origBugsBehavior = this._getBugsBehavior();
  }

  public beginSave(): IPromise<TeamSetting> {
    const bugsBehavior = this._getBugsBehavior();
    const patch = <TeamSettingsPatch>{
      bugsBehavior: BugsBehavior[bugsBehavior]
    };

    return this._saveHelper(
      patch,
      "TFS.Admin.Overview.ShowBugCategoryWorkItem._setBugsBehavior",
      delegate(this, this._resetOriginalBugsBehavior)
    );
  }

  protected _getBugsBehavior(): string {
    return $(
      `input[name=${BugsBehaviorTeamSettingControl._radioBugsName}]:checked`
    ).attr("id");
  }

  /// <summary>Gets the launch-anywhere feature enablement URL</summary>
  /// <returns type="String" />
  private _getEnableFeaturesUrl(): string {
    Debug.assert(
      Boolean(tfsContext.navigation.project),
      "Expected project context to build enable features URL"
    );
    const actionUrl = tfsContext.getActionUrl(null, null, {
      team: null,
      area: "admin"
    });
    return actionUrl;
  }

  /**
   * Checks the data island for the bug settings data
   */
  private _checkCachedDataForBugsUIState(): IBugSettingData {
    let $dataIsland: JQuery;

    // Check for the data island for bugs ui state if not passed in.
    $dataIsland = $(".bugs-behavior-ui-state");

    if ($dataIsland.length > 0) {
      return parseMSJSON($dataIsland.eq(0).html(), false).bugsBehaviorState;
    }

    const pageDataService = Service.getService(WebPageDataService);
    return pageDataService.getPageData(
      "ms.vss-work-web.bugsbehavior-ui-state-data-provider"
    ) as IBugSettingData;
  }
}

export interface IWorkingDaysTeamSettingControlOptions {
  /** A Work REST API client to use for saving any changes to the team settings. */
  workHttpClient: WorkHttpClient;

  /**
   * The current team settings.
   * NOTE: This must be in the Admin- area serialization format, not in 'TFS_OM_Common.ITeamSettings' format.
   */
  teamSettings: ITeamSettings;

  /** The delay (in ms) to wait & collate changes to the workingDays before saving the team setting. */
  saveDelay?: number;

  currentUserTeamPermissions: ITeamPermissions;
}

export class WorkingDaysTeamSettingControl extends BaseTeamSettingControl {
  protected _checkboxList: CheckboxList = null;
  protected _weekdaysBeforeSave: number[];
  protected _allDays: ICheckboxListItem[] = [
    { checked: true, value: 1, text: AdminResources.Monday },
    { checked: true, value: 2, text: AdminResources.Tuesday },
    { checked: true, value: 3, text: AdminResources.Wednesday },
    { checked: true, value: 4, text: AdminResources.Thursday },
    { checked: true, value: 5, text: AdminResources.Friday },
    { checked: true, value: 6, text: AdminResources.Saturday },
    { checked: true, value: 0, text: AdminResources.Sunday }
  ];
  private _saveDelayInMilliseconds = 300;
  private _throttledSetTeamWeekendsDelegate: Function;

  constructor(options: IWorkingDaysTeamSettingControlOptions) {
    super(options);
    this._titleText = AdminResources.TeamSettings_WorkingDaysTitle;
    this._valuePropositionText =
      AdminResources.TeamSettings_WorkingDaysValueProp;
    this._sectionHeaderText =
      AdminResources.TeamSettings_WorkingDaysSectionHeader;
    this._weekdaysBeforeSave = [];
    this._saveDelayInMilliseconds =
      options.saveDelay === 0 ? 0 : this._saveDelayInMilliseconds;
    this._noPermissionsWarningMessageTarget =
      AdminResources.TeamSettings_NoPermissionsWorkingDays;
  }

  public initialize() {
    super.initialize();
  }

  protected _completeInitialization(): void {
    this._checkboxList = <CheckboxList>Controls.BaseControl.createIn(
      CheckboxList,
      this._$contentContainer,
      {
        id: "checkbox-days",
        cssClass: "teamsettings-checkbox",
        change: delegate(this, this._onCheckBoxChanged)
      }
    );

    const hasDays =
      this._options.teamSettings &&
      this._options.teamSettings.weekends &&
      this._options.teamSettings.weekends.days &&
      this._options.teamSettings.weekends.days.length > 0;

    if (hasDays) {
      this._allDays = $.map(this._allDays, (day: ICheckboxListItem) => {
        // If current day is stored as weekend day, uncheck it
        const isWeekendDay =
          $.inArray(day.value, this._options.teamSettings.weekends.days) === -1;
        return $.extend(day, { checked: isWeekendDay });
      });
    }

    this._checkboxList.setItems(this._allDays);
    this._weekdaysBeforeSave = this._getWeekends();
    this._processAllDaysWeekendsWarning();

    this._setCheckboxPermissions();

    if (this._saveDelayInMilliseconds === 0) {
      this._throttledSetTeamWeekendsDelegate = delegate(this, this.beginSave);
    } else {
      this._throttledSetTeamWeekendsDelegate = throttledDelegate(
        this,
        this._saveDelayInMilliseconds,
        this.beginSave
      );
    }
  }

  protected _resetBeforeSaveWeekends() {
    this._weekdaysBeforeSave = this._getWeekends();
  }

  public beginSave(): IPromise<TeamSetting> {
    const weekdaysKeys = this._checkboxList.getCheckedValues();
    const weekdaysValues = $.map(weekdaysKeys, (val: string) => {
      return DayOfWeek[val];
    });

    const patch = <TeamSettingsPatch>{ workingDays: weekdaysValues };

    return this._saveHelper(
      patch,
      "TFS.Admin.Overview.WorkingDays._setTeamWeekends",
      delegate(this, this._resetBeforeSaveWeekends)
    );
  }

  private _processAllDaysWeekendsWarning() {
    const weekendValues = this._getWeekends();
    if (weekendValues.length === 7) {
      this.raiseValidStateChange(false);
      this._$errorMessageTextArea.text(
        AdminResources.ErrorNoWorkingDaySelected
      );
      this._$errorMessageArea.show();
    } else {
      this.raiseValidStateChange(true);
      this._$errorMessageTextArea.text("");
      this._$errorMessageArea.hide();
    }
  }

  private _setCheckboxPermissions(): void {
    this._checkboxList.enableElement(
      this._currentUserTeamPermissions.currentUserHasTeamAdminPermission
    );
  }

  protected _getWeekends(): number[] {
    const weekendKeys = this._checkboxList.getUncheckedValues();
    return $.map(weekendKeys, (val: string) => {
      return parseInt(val);
    });
  }

  protected _onCheckBoxChanged() {
    logTracePoint("TFS.Admin.Overview.WorkingDays._onCheckBoxChanged");
    let isDirty =
      this._getWeekends().length !== this._weekdaysBeforeSave.length;

    this._processAllDaysWeekendsWarning();
    $.each(this._getWeekends(), (idx, value) => {
      if ($.inArray(value, this._weekdaysBeforeSave) < 0) {
        isDirty = true;
      }
    });
    if (this._immediateSave && this.isValid()) {
      this._throttledSetTeamWeekendsDelegate();
    }

    this.raiseDirtyStateChange(isDirty);
  }
}

export interface IBacklogVisibilitiesTeamSettingControlOptions {
  /** A Work REST API client to use for saving any changes to the team settings. */
  workHttpClient: WorkHttpClient;

  /**
   * The current team settings.
   * NOTE: This must be in the Admin-area serialization format, not in 'TFS_OM_Common.ITeamSettings' format.
   */
  teamSettings: ITeamSettings;

  /** The backlog Configuration. */
  backlogConfiguration: BacklogConfiguration;

  /** Whether the control should be editable; defaults to true. */
  editable?: boolean;

  /** The delay (in ms) to wait & collate changes to the backlog visibilities before saving the team setting. */
  saveDelay?: number;

  currentUserTeamPermissions: ITeamPermissions;
}

/** Displays a checkbox list of backlog levels, reading & storing the team backlog visibilities setting. */
export class BacklogVisibilitiesTeamSettingControl extends BaseTeamSettingControl {
  public static enhancementTypeName: string =
    "tfs.admin.BacklogVisibilitiesTeamSettingControl";
  public _options: IBacklogVisibilitiesTeamSettingControlOptions;

  private _backlogVisibilitiesBeforeSave: IDictionaryStringTo<boolean>;
  private _throttledSaveBacklogVisibilitiesDelegate: Function;
  protected _checkboxListControl: CheckboxList;

  constructor(options: IBacklogVisibilitiesTeamSettingControlOptions) {
    super(options);

    // Throttle the save, unless asked not to.
    if (options.saveDelay === 0) {
      this._throttledSaveBacklogVisibilitiesDelegate = delegate(
        this,
        this.beginSave
      );
    } else {
      const throttledDelay: number = options.saveDelay || 300;
      this._throttledSaveBacklogVisibilitiesDelegate = throttledDelegate(
        this,
        throttledDelay,
        this.beginSave
      );
    }

    this._titleText = AdminResources.TeamSettings_BacklogVisbilityTitle;
    this._valuePropositionText =
      AdminResources.TeamSettings_BacklogVisbilityValueProp;
    this._sectionHeaderText =
      AdminResources.TeamSettings_BacklogVisbilitySectionHeader;
    this._backlogVisibilitiesBeforeSave = {};
    this._noPermissionsWarningMessageTarget =
      AdminResources.TeamSettings_NoPermissionsBacklog;

    // Ensure we were given the necessary data.
    Debug.assertIsObject(
      options.teamSettings,
      "Team settings must be provided to the BacklogVisibilitiesTeamSettingControl."
    );
  }

  public initialize() {
    super.initialize();
  }

  protected _completeInitialization(): void {
    // Determine whether the process configuration is valid.
    const backlogConfiguration: BacklogConfiguration = this._options
      .backlogConfiguration;
    const levels: IBacklogLevelConfiguration[] = backlogConfiguration
      ? (backlogConfiguration.portfolioBacklogs || []).concat(
          backlogConfiguration.requirementBacklog
        )
      : [];
    let backlogConfigIsValidForLevels = levels.length > 0;
    $.each(levels, (i, level) => {
      backlogConfigIsValidForLevels =
        backlogConfigIsValidForLevels && !!(level && level.id && level.name);
    });

    // Initialize the checkbox list or validation error.
    if (backlogConfigIsValidForLevels) {
      this._checkboxListControl = <CheckboxList>Controls.BaseControl.createIn(
        CheckboxList,
        this._$contentContainer,
        {
          id: "checkbox-levels",
          cssClass: "teamsettings-checkbox teamsettings-backlogs-checkbox",
          change: delegate(this, this._onCheckboxChanged)
        }
      );

      this._populateBacklogVisibilities();
      this._backlogVisibilitiesBeforeSave = this._getBacklogVisibilities();

      this._checkboxListControl.enableElement(!!this._options.editable);
    } else {
      const featureEnablementUrl =
        tfsContext.getActionUrl(null, null, { team: null, area: "admin" }) +
        getHistoryService().getFragmentActionLink("enableFeatures");
      const featureEnablementLinkHtml = Utils_String.format(
        "<a href='{0}' target='_blank' rel='noopener noreferrer'>{1}</a>",
        featureEnablementUrl,
        AdminResources.FeatureEnablementLinkText
      );

      const manualCorrectionLinkHtml = Utils_String.format(
        "<a href='{0}' target='_blank' rel='noopener noreferrer'>{1}</a>",
        VSS_Resources_Common.TeamSettings_ManualCorrectionLink,
        VSS_Resources_Common.TeamSettings_ManualCorrectionStepsLinkText
      );

      this._sectionWarningMessageArea.setMessage(
        $("<span>").html(
          VSS_Resources_Common.FeatureEnablementSettings_Error_Invalid_Admin +
            " " +
            Utils_String.format(
              AdminResources.TeamSettings_AttemptToFixConfiguration,
              featureEnablementLinkHtml,
              manualCorrectionLinkHtml
            )
        ),
        Notifications.MessageAreaType.Warning
      );
    }
  }

  protected _resetBeforeSaveBacklogs() {
    this._backlogVisibilitiesBeforeSave = this._getBacklogVisibilities();
  }

  public beginSave(): IPromise<TeamSetting> {
    // Settings might change due to throttle, check input
    if (!this._validateBacklogVisibilities()) {
      // Return a rejected promise for bad input
      var deferred = Q.defer<TeamSetting>();
      deferred.reject(AdminResources.ErrorNoBacklogLevelSelected);
      return deferred.promise;
    }

    const visibilityMap: IDictionaryStringTo<
      boolean
    > = this._getBacklogVisibilities();
    const patch = <TeamSettingsPatch>{ backlogVisibilities: visibilityMap };

    return this._saveHelper(
      patch,
      "TFS.Admin.Overview.BacklogLevels._setBacklogVisibilities",
      delegate(this, this._resetBeforeSaveBacklogs),
      AdminResources.ErrorSavingBacklogVisibilities + "\n"
    );
  }

  protected _onCheckboxChanged() {
    const isValid = this._validateBacklogVisibilities();
    let isDirty = false;

    $.each(this._getBacklogVisibilities(), (refname, isvisible) => {
      if (this._backlogVisibilitiesBeforeSave[refname] !== isvisible) {
        isDirty = true;
      }
    });

    if (this._immediateSave && isValid) {
      this._throttledSaveBacklogVisibilitiesDelegate();
    }

    this.raiseDirtyStateChange(isDirty);
    this.raiseValidStateChange(isValid);
  }

  /** Gets the backlog visibilities represented by the checkbox list. */
  protected _getBacklogVisibilities(): IDictionaryStringTo<boolean> {
    // Get the checkbox list items.
    // TODO: Fix the CheckboxListControl to allow retrieval of all items (with correct 'checked' state).
    const checkedItems = this._checkboxListControl.getCheckedItems();
    const uncheckedItems = this._checkboxListControl.getUncheckedItems();
    const allItems = uncheckedItems.concat(checkedItems);

    // Build the visibility map from the items.
    const visibilityMap: IDictionaryStringTo<boolean> = {};
    $.each(allItems, (i, item) => {
      const levelRefName = item.value;
      //var levelVisible = item.checked;  // TODO: THE CONTROL DOES NOT UPDATE THE 'CHECKED' FLAG. FIX THIS.
      const levelVisible = checkedItems.indexOf(item) !== -1; // Working around the issue above.

      visibilityMap[levelRefName] = levelVisible;
    });

    return visibilityMap;
  }

  /**
   * Confirms the validity of the checkbox selections, showing/clearing the validation warning message.
   */
  private _validateBacklogVisibilities(): boolean {
    // Cannot hide all levels.
    const numSelectedLevels = (<any[]>(
      this._checkboxListControl.getCheckedItems()
    )).length;
    if (numSelectedLevels === 0) {
      this._$errorMessageTextArea.text(
        AdminResources.ErrorNoBacklogLevelSelected
      );
      this._$errorMessageArea.show();
      return false;
    }

    this._$errorMessageTextArea.text("");
    this._$errorMessageArea.hide();
    return true;
  }

  /** Populates the checkbox list with backlog levels and current team settings. */
  private _populateBacklogVisibilities() {
    // Get levels
    const backlogConfiguration = this._options.backlogConfiguration;

    //If we do not have backlog configuration available, show the error and have user correct it, this could happen when user has invalid team settings e.g. Invalid Backlog Iteration or Team Fields
    if (
      !backlogConfiguration ||
      !backlogConfiguration.portfolioBacklogs ||
      !backlogConfiguration.requirementBacklog
    ) {
      const teamSettings: ITeamSettings = this._options.teamSettings;
      const teamContext: TeamContext = {
        projectId: teamSettings.projectId,
        teamId: teamSettings.teamId,
        project: undefined,
        team: undefined
      };
      this._workHttpClient.getBacklogConfigurations(teamContext).then(
        bc => {
          this._displayBacklogVisibilities(backlogConfiguration);
        },
        error => {
          this._$errorMessageTextArea.text(
            Utils_String.format(
              AgileAdminResources.ErrorCorrectAndRefresh,
              error.message
            )
          );
          this._$errorMessageArea.show();
        }
      );
      return;
    } else {
      this._displayBacklogVisibilities(backlogConfiguration);
    }
  }

  private _displayBacklogVisibilities(backlogConfiguration) {
    const backlogLevels = backlogConfiguration.portfolioBacklogs
      .concat(backlogConfiguration.requirementBacklog)
      .sort((a, b) => b.rank - a.rank);
    const levels: IBacklogLevel[] = backlogLevels.map(
      x =>
        <IBacklogLevel>{
          id: x.id,
          name: x.name,
          color: x.color
        }
    );

    // Get the team-defined backlog visibilities.
    // Since the team setting is pre-validated, this should be a complete mapping for all process-defined levels.
    const levelVisibilitiesByRefName: IDictionaryStringTo<boolean> = {};
    if (this._options.teamSettings) {
      for (const levelName in this._options.teamSettings.backlogVisibilities) {
        const isVisible = this._options.teamSettings.backlogVisibilities[
          levelName
        ];
        levelVisibilitiesByRefName[levelName] = isVisible;
      }
    }

    // Compose & insert the checkbox list items.
    const levelItems: ICheckboxListItem[] = $.map(levels, (level, i) => {
      const name: string = level.name;
      const levelId: string = level.id;
      const levelVisibility: boolean = levelVisibilitiesByRefName[levelId];
      let levelColor: string =
        WorkItemTypeColorAndIcons.DEFAULT_WORKITEMTYPE_COLOR;
      if (level.color) {
        levelColor = `#${level.color.substring(level.color.length - 6)}`;
      }
      const $itemContainer = $("<div>");
      $("<span>")
        .addClass("bowtie-icon bowtie-backlog backlog-level")
        .css("color", levelColor)
        .appendTo($itemContainer);
      $("<span>")
        .addClass("text")
        .text(name)
        .appendTo($itemContainer);
      RichContentTooltip.addIfOverflow(name, $itemContainer);

      return {
        value: levelId,
        content: $itemContainer,
        text: name, // Not displayed (due to 'content'), but will provide the item with a tooltip.
        checked: levelVisibility != null ? levelVisibility : true // Assume visible if we couldn't determine team-mapped visibility.
      };
    });
    if (levelItems && levelItems.length > 0) {
      this._checkboxListControl.setItems(levelItems);
    } else {
      Debug.fail("Failed to populate the backlog visibilities checkbox list.");
    }
  }
}
