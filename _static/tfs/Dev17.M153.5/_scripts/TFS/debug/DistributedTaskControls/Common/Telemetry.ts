import { Singleton } from "DistributedTaskControls/Common/Factory";

import VssTelemetry = require("VSS/Telemetry/Services");

export namespace TelemetryConstants {
    export const DefaultArea = "Dtc-Default-Temeletry-Area";
}

export class Telemetry extends Singleton {

    public static instance(): Telemetry {
        return super.getInstance<Telemetry>(Telemetry);
    }

    public setArea(area: string) {
        this._area = area;
    }

    public publishEvent(feature: string, properties?: IDictionaryStringTo<any>, source?: string, immediate: boolean = false, startTime?: number, elapsedTime?: number): void {
        this._area = this._area || TelemetryConstants.DefaultArea;

        properties = properties || {};
        if (source) {
            properties[Properties.Source] = source;
        }

        VssTelemetry.publishEvent(new VssTelemetry.TelemetryEventData(this._area, feature, properties, startTime, elapsedTime), immediate);
    }

    private _area: string;
}

export class Feature {
    // Common Feature Start
    public static CreateProcessParameter = "CreateProcessParameter";
    public static LinkToProcessParameter = "LinkToProcessParameter";
    public static LinkPicklistAsProcessParameter = "LinkPicklistAsProcessParameter";
    public static UnlinkProcessParameterFromDialog = "UnlinkProcessParameterFromDialog";
    public static UnlinkToProcessParameter = "unlinkToProcessParameter";
    public static UnlinkAllProcessParameters = "UnlinkAllProcessParameters";
    public static CommandBar = "commandBar";
    public static AddTask = "addTask";
    public static MarketplaceExtensionInstallButtonClicked = "marketplaceExtensionInstallButtonClicked";
    public static MarketplaceExtensionLearnMoreButtonClicked = "marketplaceExtensionLearnMoreButtonClicked";
    public static MarketplaceExtensionLoad = "marketplaceExtensionLoad";
    public static TasksLoad = "tasksLoad";
    public static TasksFailed = "tasksFailed";
    public static MarketplaceExtensionFailed = "marketplaceExtensionFailed";
    public static EMSExtensionFailed = "emsExtensionFailed";
    public static MarketplaceExtensionInSearch = "marketplaceExtensionInSearch";
    public static RefreshTask = "refreshTask";
    public static TaskTab = "TaskTab";
    public static RemoveTask = "removeTask";
    public static CloneTask = "cloneTask";
    public static ViewAsYaml = "viewAsYaml";
    public static CopyYaml = "copyYaml";
    public static EnableTask = "enableTask";
    public static DisableTask = "disableTask";
    public static CreateTaskGroup = "createTaskGroup";
    public static ManageTaskGroup = "manageTaskGroup";
    public static ScreenProperties = "screenProperties";
    public static AddPhase = "addPhase";
    public static AddServiceConnection = "addServiceConnection";
    public static AddServiceConnectionSuccess = "addServiceConnectionSuccess";
    public static TaskGroupCreationBlockedDueToProcessParam = "TaskGroupCreationBlockedDueToProcessParam";
    public static FolderBreadcrumb = "folderBreadcrumb";
    public static VariableGroups = "variableGroups";
    public static MoveTask = "moveTask";
    public static MovePhase = "movePhase";
    public static Variables = "variables";
    public static VariablesViewChange = "variablesViewChange";
    public static VariablesDefaultFilterChange = "variablesDefaultFilterChange";
    public static VariablesTabClick = "variablesTabClick";
    public static VariablesItemClick = "variablesItemClick";
    public static TemplatesInSearch = "templatesInSearch";
    public static ViewIssuesInPanel = "viewIssuesInPanel";
    public static TaskNotInstalled = "taskNotInstalled";
    public static NotInstalledTaskInCall = "notInstalledTaskFoundInCall";
    // Common Feature End

    // CI Feature Start
    public static EmptyProcessTemplate = "emptyProcessTemplate";
    public static DeleteBuildTemplate = "deleteBuildTemplate";
    public static SelectBuildTemplate = "selectBuildTemplate";
    public static SaveBuildDefinition = "saveBuildDefinition";
    public static SaveBuildDefinitionWithDirtyProcessParameters = "saveBuildDefinitionWithDirtyProcessParameters";
    public static CloneBuildDefinition = "cloneBuildDefinition";
    public static PublishDraftBuildDefinition = "publishDraftBuildDefinition";
    public static SaveAsDraftBuildDefinition = "saveAsDraftBuildDefinition";
    public static NewBuildDefinitionCreation = "newBuildDefinitionCreation";
    public static QueueBuild = "queueBuild";
    public static AdvancedSettings = "advancedSettings";
    public static EditBuildDefinition = "editBuildDefinition";
    // CI Feature End

    // CD Feature Start
    public static SaveReleaseDefinition = "saveReleaseDefinition";
    public static EditReleaseDefinition = "editReleaseDefinition";
    public static ImportReleaseDefinition = "importReleaseDefinition";
    public static CloneReleaseDefinition = "cloneReleaseDefinition";
    public static RevertReleaseDefinition = "revertReleaseDefinition";
    public static NewReleaseDefinitionCreation = "newReleaseDefinitionCreation";
    public static NewReleaseDefinitionTemplateSelection = "newReleaseDefinitionTemplateSelection";
    public static NewEnvironmentTemplateSelection = "newEnvironmentTemplateSelection";
    public static AddNewEnvironment = "addNewEnvironment";
    public static CloneEnvironment = "cloneEnvironment";
    public static DeleteEnvironment = "deleteEnvironment";
    public static QueueRelease = "queueRelease";
    public static CreateReleasePanelQueueRelease = "createReleasePanelQueueRelease";
    public static EnvironmentTriggerCondition = "environmentTriggerCondition";
    public static EnvironmentTriggerConditionsUpdate = "environmentTriggerConditionsUpdate";
    public static EnvironmentScheduleTriggerToggle = "environmentScheduleTriggerToggle";
    public static EnvironmentNameUpdate = "environmentNameUpdate";
    public static EnvironmentOwnerUpdate = "environmentOwnerUpdate";
    public static ContinuosDeploymentTriggerToggle = "continuosDeploymentTriggerToggle";
    public static ReleaseScheduleTriggerToggle = "releaseScheduleTriggerToggle";
    public static EnvironmentNavigationFromCanvas = "environmentNavigationFromCanvas";
    public static EnvironmentNavigationFromPivot = "environmentNavigationFromPivot";
    public static PreDeploymentApprovalType = "preDeploymentApprovalType";
    public static PostDeploymentApprovalType = "postDeploymentApprovalType";
    public static AddNewArtifact = "addNewArtifact";
    public static RemoveArtifact = "removeArtifact";
    public static OpenEnvironmentSecurityDialog = "openEnvironmentSecurityDialog";
    public static SaveEnvironmentAsTemplate = "saveEnvironmentAsTemplate";
    public static ArtifactInputModified = "artifactInputModified";
    public static EnvironmentRankUpdated = "environmentRankUpdated";
    public static ReleaseProgressBreadcrumb = "releaseProgressBreadcrumb";
    public static ReleaseProgressView = "releaseProgressView";
    public static ReleaseProgressViewUserRefresh = "releaseProgressViewUserRefresh";
    public static ManualIntervention = "manualIntervention";
    public static DeploymentGroupPhaseView = "deploymentGroupPhaseView";

    // Telemetry point to understand if the user is able to determine the use of 
    // some keyboard shortcuts like F6 to switch between overview and details.
    public static CanvasKeyboardAccess = "canvasKeyboardAccess";

    // Release Progress feature
    public static ReleaseSummaryView = "releaseSummaryView";
    public static ReleasePreApprovalsPanel = "releasePreApproval";
    public static ReleasePostApprovalsPanel = "releasePostApproval";
    public static CommitsWorkItemsInsights = "commitsWorkItemsInsights";

    //  Release progress telemetry to understand variables edit scenarios
    public static ReleaseProgressVariablesEdit = "releaseProgressVariablesEdit";

    //Release Actions feature
    public static EnvironmentAction = "environmentAction";
    public static EnvironmentCancel = "environmentCancel";
    public static EnvironmentDeploy = "environmentDeploy";
    public static MultipleEnvironmentsDeploy_OpenPanel = "multipleEnvironmentsDeployOpenPanel";
    public static MultipleEnvironmentsDeploy_Action = "multipleEnvironmentsDeployAction";
    public static MultipleEnvironmentsApprove_OpenPanel = "multipleEnvironmentsApproveOpenPanel";
    public static MultipleEnvironmentsApprove_Action = "multipleEnvironmentsApproveAction";
    public static ReleaseAbandon = "releaseAbandon";

    // Telemetry point to understand if the user is able to determine the user of 
    // keyboard shortcut to navigate in and out of keyzone.
    public static InnerFocusZoneAccess = "innerFocusZoneAccess";

    public static DeleteEnvironmentTemplate = "deleteEnvironmentTemplate";

    // Telemetry to understand how many times we are showing permission indicator to the user
    public static PermissionIndicator = "permissionIndicator";

    // Telemetry to understand how many times user got permission denied errors. 
    public static PermissionDeniedError = "permissionDeniedError";

    // Telemetry to understand canvas dimensions. 
    public static CanvasDimensions = "canvasDimensions";

    // Telemetry to understand if there are manual environments interspersed b/w release triggered environment.
    public static InterspersedManualEnvironments = "interspersedManualEnvironments";

    // Telemetry to understand the move environment operations
    public static MoveEnvironments = "moveEnvironments";

    // Telemetry to understand release progress environment properties details panel
    public static EnvironmentDetailsPanel = "environmentDetailsPanel";

    // Telemetry to understand settable at release time variables usage
    public static SettableAtReleaseTime = "settableAtReleaseTime";

    // Telemetry to understand release progress contributions
    public static Contributions = "contributions";
    public static ExtensionInvokedForContribution = "extensionInvokedForContribution";

    public static SaveReleaseAction = "saveReleaseAction";
    public static EditReleaseAction = "editReleaseAction";
    public static DiscardReleaseAction = "discardReleaseAction";
    public static OldReleaseView = "navigateOldReleaseView";

    // Telemetry to understand fre and help dialog usage
    public static ReleaseProgressHelpDialog = "releaseProgressHelpDialog";

    // Telemetry to understand signalr events
    public static SignalR = "signalR";

    // CD Feature End

    // Telemetry to capture input method
    public static ArtifactVersionInputMethod = "ArtifactVersionInputMethod";
}

export class Properties {
    public static Source = "source";
    public static InputName = "inputName";
    public static InputType = "inputType";
    public static IsExistingProcessParameter = "isExistingProcessParameter";
    public static Length = "length";
    public static TemplateId = "templateId";
    public static TemplateName = "templateName";
    public static TemplateCategory = "templateCategory";
    public static GroupId = "groupId";
    public static ActionName = "actionName";
    public static DraftDefinition = "draftDefinition";
    public static TasksCount = "tasksCount";
    public static BuildDefinitionId = "buildDefinitionId";
    public static ProcessParameterCount = "processParameterCount";
    public static VariablesCount = "variablesCount";
    public static SourceVersionType = "sourceVersionType";
    public static CustomDemandsCount = "customDemandsCount";
    public static RetentionRulesCount = "retentionRulesCount";
    public static TriggersInfo = "triggersInfo";
    public static TaskCategory = "taskCategory";
    public static TaskName = "taskName";
    public static ExtensionName = "extensionName";
    public static PositionInSet = "positionInSet";
    public static SizeOfSet = "sizeOfSet";
    public static TaskId = "taskId";
    public static TaskDefinitionType = "taskDefinitionType";
    public static TaskRefName = "taskRefName";
    public static TaskVersionSpec = "taskVersionSpec";
    public static SelectedCategoryTab = "selectedCategoryTab";
    public static SelectedTasksLength = "selectedTasksLength";
    public static ViewYamlArtifact = "viewYamlArtifact";
    public static VariableParameters = "variableParameters";
    public static FilterText = "filterText";
    public static SourceDataChangedForDraft = "sourceDataChangedForDraft";
    public static WindowOuterHeight = "windowOuterHeight";
    public static WindowOuterWidth = "windowOuterWidth";
    public static ScreenHeight = "screenHeight";
    public static ScreenWidth = "screenWidth";
    public static ScreenAvailHeight = "screenAvailHeight";
    public static ScreenAvailWidth = "screenAvailWidth";
    public static PixelDepth = "pixelDepth";
    public static ColorDepth = "colorDepth";
    public static BrowserZoomLevel = "browserZoomLevel";
    public static PhaseType = "phaseType";
    public static EnvironmentCount = "environmentCount";
    public static ArtifactSourceTypes = "artifactSourceTypes";
    public static ReleaseVariablesCount = "releaseVariablesCount";
    public static EnvironmentVariablesCount = "environmentVariablesCount";
    public static VariableGroupCount = "variableGroupCount";
    public static ReleaseDefinitionId = "releaseDefinitionId";
    public static PhasesCount = "phasesCount";
    public static EnvironmentSelected = "environmentSelected";
    public static CanQueueRelease = "canQueueRelease";
    public static TriggerTab = "triggerTab";
    public static TriggerConditionsCount = "triggerConditionsCount";
    public static ToggleState = "toggleState";
    public static ApprovalType = "approvalType";
    public static ServiceEndpointType = "serviceEndpointType";
    public static ServiceEndpointAuthScheme = "serviceEndpointAuthScheme";
    public static SourcesCleanOption = "cleanOption";
    public static FolderPath = "folderPath";
    public static ReadOnlyDemandsCount = "readOnlyDemandsCount";
    public static ArtifactType = "artifactType";
    public static DefinitionDescriptionSet = "descriptionSet";
    public static ReportStatusEnabled = "reportStatusEnabled";
    public static AutoLinkWorkItemsEnabled = "autoLinkWorkItemsEnabled";
    public static RetentionPoliciesChanged = "retentionPoliciesChanged";
    public static ArtifactInputId = "artifactInputId";
    public static KeyCode = "keyCode";
    public static OpenLinkVariableGroupPanel = "openLinkVariableGroupPanel";
    public static LinkVariableGroup = "LinkVariableGroup";
    public static UnlinkVariableGroup = "UnlinkVariableGroup";
    public static TaskAccepted = "TaskAccepted";
    public static permissionIndicatorType = "permissionIndicatorType";
    public static permissionToken = "permissionToken";
    public static permissionIndicatorSource = "permissionIndicatorSource";
    public static permissionIndictorOnVariablesCount = "permissionIndicatorOnVariablesCount";
    public static permissionDeniedErrorMessage = "permissionDeniedErrorMessage";
    public static selectedPivotView = "selectedPivotView";
    public static selectedTab = "selectedTab";
    public static extensionStatus = "extensionStatus";
    public static filterByKeyword = "filterByKeyword";
    public static filterByScope = "filterByScope";
    public static editVariableInListView = "editVariableInListView";
    public static editVariableInGridView = "editVariableInGridView";
    public static emptyVariableRows = "emptyVariableRows";
    public static variablesItemType = "variablesItemType";
    public static isEditMode = "isEditMode";
    public static progressView = "progressView";
    public static EnvironmentsInProgress = "environmentsInProgress";
    public static isADataProviderCall = "isADataProviderCall";
    public static promiseStatus = "promiseStatus";
    public static prefetchedTaskGuids = "prefetchedTaskGuids";
    public static ReleaseToCompareId = "releaseToCompareId";
    public static ExcecutionTime = "executionTime";

    // Canvas dimension telemetry properties. 
    public static canvasRowCount = "canvasRows";
    public static canvasColumnCount = "canvasColumns";

    //Release and ReleaseDefinition request source telemetry properties
    public static DefinitionCreationSource = "DefinitionCreationSource";
    public static ReleaseCreationSource = "ReleaseCreationSource";

    // Interspersed manual environment properties.
    public static interspersedManualEnvironmentCount = "interspersedManualEnvironmentCount";
    public static sizeOfEachInterspersedManualEnvironment = "sizeOfEachInterspersedManualEnvironment";

    //Release summary view properties
    public static autoSaveDescriptionCount = "autoSaveDescriptionCount";
    public static addTagCount = "addTagCount";
    public static deleteTagCount = "deleteTagCount";

    // Create Release Properties
    public static ToggledEnvironmentsCount = "toggledEnvironmentsCount";
    public static EnvironmentToggledByCanvas = "environmentToggledByCanvas";
    public static EnvironmentToggledByPicklist = "environmentToggledByPicklist";
    public static DescriptionAdded = "descriptionAdded";
    
    // Telemetry properties to understand the usage of overridable variables
    public static OverridableReleaseVariables = "totalOverridableReleaseVariables";
    public static OverridableEnvironmentVariables = "totalOverridableEnvironmentVariables";
    public static OverridenReleaseVariables = "overriddenReleaseVariables";
    public static OverridenEnvironmentVariables = "overriddenEnvironmentVariables";

    // Environment Action Properties
    public static Action = "action";
    public static ReleaseId = "releaseId";
    public static ReleaseName = "releaseName";
    public static EnvironmentId = "environmentId";
    public static EnvironmentName = "environmentName";
    public static EnvironmentDefinitionId = "environmentDefinitionId";
    public static EnvironmentStatus = "environmentStatus";
    public static IsRollback = "isRollback";
    public static IsCommentPresent = "isCommentPresent";
    public static IsRedeploy = "isRedeploy";
    public static IsCommandbarAction = "isCommandbarAction";
    public static ApplicableEnvironmentsCount = "ApplicableEnvironmentsCount";
    public static DeployedEnvironmentsCount = "DeployedEnvironmentsCount";
    public static ApprovalEnvironmentsCount = "ApprovalEnvironmentsCount";
    public static actionClickTarget = "actionClickTarget";

    // Move environment properties
    public static moveDirection = "moveDirection";
    public static sourceEnvironmentCount = "sourceEnvironmentCount";
    public static targetEnvironmentCount = "targetEnvironmentCount";

    // Release progress environment properties
    public static environmentPropertiesSelectedTab = "environmentPropertiesSelectedTab";
    public static rollbackScenario = "rollbackScenario";
    public static commitsOrWorkItems = "commitsOrWorkItems";
    public static specialCaseMessage = "specialCaseMessage";
    public static artifactType = "artifactType";

    // Release progress contribution properties
    public static contributionId = "contributionId";
    public static extensionCountOnContribution = "extensionCountOnContribution";
    public static extensionIdsOnContribution = "extensionIdsOnContribution";
    public static extensionInvokedId = "extensionInvokedId";

    //  Release progress approval properties
    public static approveRejectIndicator = "approveRejectIndicator";
    public static approvalOverridden = "approvalOverridden";
    public static approvalReassigned = "approvalReassigned";
    public static approvalReassignedWithComment = "approvalReassignedWithComment";
    public static deploymentDeferred = "deploymentDeferred";
    public static containsOBOEnabledAuthorization = "containsOBOEnabledAuthorization";
    public static approvalSource = "approvalSource";

    // Release propgress logs tab properties
    public static phaseIssuesErrorCount = "phaseIssuesErrorCount";
    public static phaseIssuesWarningCount = "phaseIssuesWarningCount";

    public static breadcumbItem = "breadcumbItem";
    public static view = "view";

    // Help dialog properties
    public static helpDismissedTarget = "helpDismissedTarget";
    public static selectedTabWhenDismissed = "selectedTabWhenDismissed";

    // Manual Intervention properties
    public static viewLogsNavigation = "viewLogsNavigation";
    public static manualInterventionResumeRejectSource = "manualInterventionResumeRejectSource";
    public static manualInterventionPanelSourceLogs = "manualInterventionPanelSourceLogs";
    public static manualInterventionStatus = "manualInterventionStatus";
    public static isUserHavingPermissions = "isUserHavingPermissions";

    // signalr properties
    public static forceUpdateTriggered = "forceUpdateTriggered";

    // Deployment Group phase properties
    public static Jobstate = "jobstate";
    public static MachineCount = "machineCount";
    public static MachineState = "machineState";

    // Create Release Version Select Property
    public static IsVersionManuallyEntered = "IsVersionManuallyEntered";
    public static AreVersionsAvailable = "AreVersionsAvailable";
}

export namespace PermissionIndicatorSource {
    export const pipelineTab = "pipelineTab";
    export const tasksTab = "tasksTab";
    export const retentionTab = "retentionTab";
    export const releaseDefinition = "releaseDefinition";
    export const variablesTab = "variablesTab";
}

export class Source {
    public static ContextMenu = "contextMenu";
    public static CommandButton = "commandButton";
    public static DragAndDrop = "dragAndDrop";
    public static Keyboard = "keyboard";
    public static Hover = "hover";
    public static MenuItem = "menuItem";
}

export class ApproveRejectIndicator {
    public static Approved = "approved";
    public static Rejected = "rejected";
}