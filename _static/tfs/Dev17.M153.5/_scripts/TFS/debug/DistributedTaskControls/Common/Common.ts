
//----Feature flag constants- Start-----
export const FeatureFlag_CDProcessParameters = "WebAccess.ReleaseManagement.ProcessParameters";
export const FeatureFlag_MarketplaceExtensionSupport = "WebAccess.Build.CIWorkflow.MarketplaceExtensionSupport";
export const FeatureFlag_EnableIdentityNavigation = "VisualStudio.Services.Framework.EnableIdentityNavigation";
export const FeatureFlag_TaskShowOutputVariables = "DistributedTask.TaskOutputVariables";
export const FeatureFlag_TaskValidateOutputVariables = "DistributedTask.TaskValidateOutputVariables";
export const FeatureFlag_EnableOldTaskGroupHub = "WebAccess.DistributedTask.EnableOldTaskGroupHub";
export const ContributionId_FeatureFlag_YamlCI = "ms.vss-ciworkflow.yaml-ci-feature-indicator";
export const FeatureFlag_PickListSearchEnabled = "DistributedTask.PickListSearchEnabled";
export const FeatureFlag_CanvasGraphPerformanceImprovement = "WebAccess.DistributedTask.CanvasGraphPerformanceImprovement";
export const FeatureFlag_ResourceAuthForVGEndpoint = "WebAccess.DistributedTask.ResourceAuthorization.VGEndpoint";

//----Feature flag constants: End ------

export namespace ActionsKeys {
    export const AgentsActions = "Common.AgentsActions";
    export const AgentPoolActions = "Common.AgentPoolActions";
    export const ConnectedServiceEndpointActions = "Common.ConnectedServiceEndpointActions";
    export const ContainerTabActions = "Common.ContainerTabActions";
    export const ContributionActions = "Common.ContributionActions";
    export const DemandActions = "Common.DemandActions";
    export const DependenciesActions = "Common.DependenciesActions";
    export const DeploymentGroupsActions = "Common.DeploymentGroupsActions";
    export const ExtensionItemListActions = "Common.ExtensionItemListActions";
    export const MachinesActions = "Common.MachinesActions";
    export const DeployPhaseActions = "Common.DeployPhaseActions";
    export const PhaseInputsActions = "Common.PhaseInputsActions";
    export const DeployPhaseListActions = "Common.DeployPhaseListActions";
    export const HistoryActions = "Common.HistoryActions";
    export const ItemSelectorActions = "Common.ItemSelectorActions";
    export const LinkUnlinkProcParamsDialogViewActions = "Common.LinkUnlinkProcParamsDialogViewActions";
    export const MessageHandlerActions = "Common.MessageHandlerActions";
    export const OverlayPanelActions = "Common.OverlayPanelActions";
    export const ProcessParameterActions = "Common.ProcessParameterActions";
    export const SaveStatusActions = "Common.SaveStatusActions";
    export const SecureFileActions = "Common.SecureFileActions";
    export const TaskAgentPoolActions = "Common.TaskAgentPoolActions";
    export const TaskItemListActions = "Common.TaskItemListActions";
    export const TaskGroupDialogActions = "Common.TaskGroupDialogActions";
    export const TaskGroupPropertiesActions = "Common.TaskGroupPropertiesActions";
    export const TaskGroupParametersActions = "Common.TaskGroupParametersActions";
    export const TaskListActions = "Common.TaskListActions";
    export const TemplateActions = "Common.TemplateActions";
    export const VariableGroupActions = "Common.VariableGroupActions";
    export const ValidatorActions = "Common.ValidatorActions";
    export const ConnectedServiceValidatorActions = "Common.ConnectedServiceValidatorActions";
    export const ConnectedServiceInputActions = "Common.ConnectedServiceInputActions";
    export const LiveLogsActions = "Common.LiveLogsActions";
    export const LogsExpandedViewActions = "Common.LogsExpandedViewActions";
    export const LoadableComponentActions = "Common.LoadableComponentActions";
    export const ProcessManagementActions = "Common.ProcessManagementActions";
}

export namespace ActionCreatorKeys {
    export const AgentsActionsCreator = "Common.AgentsActionsCreator";
    export const AgentPoolActionsCreator = "Common.AgentPoolActionsCreator";
    export const ARMInputActionsCreator = "Common.ARMInputActionsCreator";
    export const ConnectedServiceEndpoint_ActionCreator = "Common.ConnectedServiceEndpointActionsCreator";
    export const ConnectedServiceInputActionsCreator = "Common.ConnectedServiceInputActionsCreator";
    export const ContributionActionsCreator = "Common.ContributionActionsCreator";
    export const DemandActionsCreator = "Common.DemandActionsCreator";
    export const DependenciesActionsCreator = "Common.DependenciesActionsCreator";
    export const DeploymentGroupsActionsCreator = "Common.DeploymentGroupsActionsCreator";
    export const MachinesActionsCreator = "Common.MachinesActionsCreator";
    export const DeployPhaseActionsCreator = "Common.DeployPhaseActionsCreator";
    export const ExtensionActionsCreator = "Common.ExtensionActionsCreator";
    export const PhaseInputsActionsCreator = "Common.PhaseInputsActionsCreator";
    export const DeployPhaseListActionsCreator = "Common.DeployPhaseLitActionsCreator";
    export const HistoryActionsCreator = "Common.HistoryActionsCreator";
    export const LinkUnlinkProcParamsDialogViewActionCreator = "Common.LinkUnlinkProcParamsDialogViewActionsCreator";
    export const MessageHandlerActionsCreator = "Common.MessageHandlerActionsCreator";
    export const OverlayPanelActionsCreator = "Common.OverlayPanelActionsCreator";
    export const PickListInputActionsCreator = "Common.PickListInputActionsCreator";
    export const ProcessParameterActionsCreator = "Common.ProcessParameterActionsCreator";
    export const SaveStatusActionsCreator = "Common.SaveStatusActionsCreator";
    export const SecureFileActionsCreator = "Common.SecureFileActionsCreator";
    export const TaskActionsCreator = "Common.TaskActionsCreator";
    export const TaskAgentPoolActionsCreator = "Common.TaskAgentPoolActionsCreator";
    export const TaskDetailsActionsCreator = "Common.TaskDetailsActionsCreator";
    export const TaskGroupDialogActionsCreator = "Common.TaskGroupDialogActionsCreator";
    export const TaskGroupPropertiesActionCreator = "Common.TaskGroupPropertiesActionCreator";
    export const TaskGroupParametersActionCreator = "Common.TaskGroupParametersActionCreator";
    export const TaskListActionsCreator = "Common.TaskListActionsActionsCreator";
    export const TemplateActionsCreator = "Common.TemplatesActionsCreator";
    export const VariableGroupActionsCreator = "Common.VariableGroupActionsCreator";
    export const ValidatorActionsCreator = "Common.ValidatorActionsCreator";
    export const LogsExpandedViewActionsCreator = "Common.LogsExpandedViewActionsCreator";
    export const LiveLogsActionsCreator = "Common.LiveLogsActionsCreator";
    export const LoadableComponentActionsCreator = "Common.LoadableComponentActionsCreator";
}

export namespace StoreKeys {
    export const AgentsStore = "Common.AgentsStore";
    export const ARMInputStore = "Common.ARMInputStore";
    export const ConnectedServiceEndpointStore = "Common.ConnectedServiceEndpointStore";
    export const ContainerTabStore = "Common.ContainerTabStore";
    export const ContributionsStore = "Common.ContributionsStore";
    export const DemandsStore = "Common.DemandsStore";
    export const DependenciesStore = "Common.DependenciesStore";
    export const DeploymentGroupDemandsStore = "Common.DeploymentGroupDemandsStore";
    export const DeploymentGroupsStore = "Common.DeploymentGroupsStore";
    export const MachinesStore = "Common.MachinesStore";
    export const DeployPhaseListStore = "Common.DeployPhaseListStore";
    export const ExecutionPlanStore = "Common.ExecutionPlanStore";
    export const ExtensionItemListStore = "Common.ExtensionItemListStore";
    export const HistoryStore = "Common.HistoryStore";
    export const LinkUnlinkProcParamsDialogViewStore = "Common.LinkUnlinkProcParamsDialogViewStore";
    export const MessageHandlerStore = "Common.MessageHandlerStore";
    export const OverlayPanelStore = "Common.OverlayPanelStore";
    export const PhaseStoreBase = "Common.PhaseStoreBase";
    export const PhaseInputsStore = "Common.PhaseInputsStore";
    export const MachineGroupInputsStore = "Common.MachineGroupInputsStore";
    export const DefaultPhaseStore = "Common.DefaultPhaseStore";
    export const RunOnAgentPhaseStore = "Common.RunOnAgentPhaseStore";
    export const RunOnMachineGroupPhaseStore = "Common.RunOnMachineGroupPhaseStore";
    export const RunOnServerPhaseStore = "Common.RunOnServerPhaseStore";
    export const SaveStatusStore = "Common.SaveStatusStore";
    export const SecureFilesStore = "Common.SecureFilesStore";
    export const TaskAgentPoolStore = "Common.TaskAgentPoolStore";
    export const TaskItemListStore = "Common.TaskItemListStore";
    export const TaskDetailsStore = "Common.TaskDetailsStore";
    export const TaskGroupDialogStore = "Common.TaskGroupDialogStore";
    export const TaskGroupPropertiesStore = "Common.TaskGroupPropertiesStore";
    export const TaskGroupParametersStore = "Common.TaskGroupParametersStore";
    export const TaskListStore = "Common.TaskListStore";
    export const TemplatesStore = "Common.TemplatesStore";
    export const VariableGroupDataStore = "Common.VariableGroupDataStore";
    export const VariableGroupViewStore = "Common.VariableGroupViewStore";
    export const ProcessParameterViewStore = "Common.ProcessParameterViewStore";
    export const LinkVariableGroupPanelDataStore = "Common.LinkVariableGroupPanelDataStore";
    export const LinkVariableGroupPanelViewStore = "Common.LinkVariableGroupPanelViewStore";
    export const VariablesListStore = "Common.VariablesListStore";
    export const ConnectedServiceInputStore = "Common.ConnectedServiceInputStore";
    export const LiveLogsStore = "Common.LiveLogsStore";
    export const LoadableComponentStore = "Common.LoadableComponentStore";
    export const ScopePickerStore = "Common.ScopePickerStore";
    export const LogsExpandedViewStore = "Common.LogsExpandedViewStore";
    export const EditVariableGroupPanelStore = "Common.EditVariableGroupPanelStore";
    export const ProcessManagementStore = "Common.ProcessManagementStore";
}

export namespace MessageParentKeyConstants {
    export const MainParentKey: string = "Main";
}

export namespace ConnectedServiceIds {
    export const GitHub = "github";
}

export namespace ServiceEndpointConstants {
    export const GitHubServerUrl = "https://github.com";
}

export namespace EndpointAuthorizationSchemes {
    export const UsernamePassword = "UsernamePassword";
    export const Certificate = "Certificate";
    export const ServicePrincipal = "ServicePrincipal";
    export const PersonalAccessToken = "PersonalAccessToken";
    export const OAuth = "OAuth";
}

export namespace ServiceEndpointType {
    export const ExternalGit = "git";
    export const GitHub = "github";
    export const Bitbucket = "bitbucket";
    export const Subversion = "subversion";
}

export namespace ProcessParameterConstants {
    export const OldProcessParameterPrefix = "ProcParam";
    export const OldProcessParameterBoundInputValueFormat = "$(" + ProcessParameterConstants.OldProcessParameterPrefix + ".{0})";
    export const OldProcessParameterVariableNameFormat = ProcessParameterConstants.OldProcessParameterPrefix + ".{0}";

    export const NewProcessParameterPrefix = "Parameters";
    export const NewProcessParameterBoundInputValueFormat = "$(" + ProcessParameterConstants.NewProcessParameterPrefix + ".{0})";
    export const NewProcessParameterVariableNameFormat = ProcessParameterConstants.NewProcessParameterPrefix + ".{0}";
}

export namespace DemandCondition {
    export const Exists = "exists";
    export const Equals = "equals";
}

export namespace DemandConstants {
    export const nameColumnKey = "name";
    export const conditionColumnKey = "condition";
    export const valueColumnKey = "value";
    export const machinesMissingDemandColumnKey = "machinesMissingDemand";
    export const iconColumnKey = "icon";
    export const deleteColumnKey = "delete";
    export const maxTargetToShow = 10;
}

export namespace DeploymentGroupConstants {
    export const InvalidDeploymentGroupId = "-1";
}

export namespace EnvironmentVariableConstants {
    export const iconColumnKey = "icon";
    export const nameColumnKey = "name";
    export const valueColumnKey = "value";
    export const deleteColumnKey = "delete";
}

export enum InputState {
    Valid = 0,
    Invalid_NonPositiveNumber = 1,
    Invalid_InputRequired = 2,
    Invalid_VariableOrNonPositiveNumber = 4,
    Invalid = 5,
    Invalid_SelectedOptionNotPresent = 6
}

/**
 * Constants - TaskDefinition unique key
 */
export const TASK_DEFINITION_DATA_KEY = "task-definition-data-key";

export const AGENTS_STORE_INSTANCE_ID = "ci-agents-instance";

/**
 * Constants - TaskItem unique key prefix
 */
export const TASK_ITEM_PREFIX = "common-taskitem-";

/**
 * Constants - DeployPhaseItem unique key prefix
 */
export const DEPLOY_PHASE_ITEM_PREFIX = "common-phaseitem";

/**
 * Constants - BranchFilterComponent unique instanceId prefix
 */
export const BRANCH_FILTER_PREFIX = "common-branch-filter-";

export const MetaTaskHubContributionId = "ms.vss-releaseManagement-web.hub-metatask";
export const TaskCIHubContributionId = "ms.vss-ciworkflow.build-ci-hub";

export const TaskListStoreInstanceId = "default-task-list-store-instance-id";

export namespace TaskControlOptionsConstants {
    export const ControlOptionsInputName_Enabled = "ControlOptionEnabled";
    export const ControlOptionsInputName_ContinueOnError = "ControlOptionContinueOnError";
    export const ControlOptionsInputName_AlwaysRun = "ControlOptionAlwaysRun";
    export const ControlOptionsInputName_TimeOut = "ControlOptionTimeOut";
    export const ControlOptionsInputName_ConditionSelector = "ControlOptionConditionSelector";
    export const ControlOptionsInputName_ConditionEditor = "ControlOptionConditionEditor";
}

export namespace TaskControlOptionsOverridInputConstants {
    export const TimeoutInMinutes = "timeoutInMinutes";
}

export namespace TaskConditions {
    export const Succeeded = "succeeded()";
    export const SucceededOrFailed = "succeededOrFailed()";
    export const Failed = "failed()";
    export const Always = "always()";
    export const Custom = "";
}

/* Phase constants */
export namespace PhaseConstants {
    export const DefaultPhaseRefNameFormat = "Phase_{0}";
}

/* Constants: Links */
export namespace HelpLinks {
    export const DefaultMarketplaceLink = "https://go.microsoft.com/fwlink/?LinkId=797831";
    export const BuildReleaseHelpLink = "https://go.microsoft.com/fwlink/?LinkId=619385";
}

/* Property key constants */
export namespace Properties {
    export const IsSearchable = "IsSearchable";
}

export enum Workflow {
    Build = 0,
    Release
}

/**
 * Constants for keyboard keys
 */
export const CNTRL_KEY = "ctrl-key";
export const SHIFT_KEY = "shift-key";

/**
 * Constants: Task context menu keys
 */
export const KEY_ENABLE_TASKS = "enable-tasks";
export const KEY_DISABLE_TASKS = "disable-tasks";
export const KEY_REMOVE_TASKS = "remove-tasks";
export const KEY_CLONE_TASKS = "clone-tasks";
export const KEY_EXPORT_TASKS = "export-tasks";
export const KEY_CREATE_TASK_GROUP = "create-task-group";
export const KEY_MANAGE_TASK_GROUP = "manage-task-group";

export const KEY_VIEW_AS_YAML = "view-as-yaml";
export const KEY_COPY_AS_YAML = "copy-as-yaml";

export const MaxPositiveNumber = 1000000000;
export const CommaSeparator = ",";
export const CommaSeparatorWithSpace = ", ";
export const SemiColon = ";";
export const SemiColonWithSpace = "; ";
export const DotSeparator = ".";
/* Constants: Task input type -- Start */


/* INPUT TYPE SHOULD BE IN LOWERCASE */

export const INPUT_TYPE_FILE_PATH = "filepath";
export const INPUT_TYPE_ARTIFACT_PATH = "artifactpath";
export const INPUT_TYPE_BOOLEAN = "boolean";
export const INPUT_TYPE_AZURE_CONNECTION = "azureconnection";
export const INPUT_TYPE_CONNECTED_SERVICE = "connectedservice";
export const INPUT_TYPE_RADIO = "radio";
export const INPUT_TYPE_PICK_LIST = "picklist";
export const INPUT_TYPE_MULTI_LINE = "multiline";
export const INPUT_TYPE_STRING_LIST = "stringlist";
export const INPUT_TYPE_STRING = "string";
export const INPUT_TYPE_EXPRESSION_EDITOR = "expressioneditor";
export const INPUT_TYPE_IDENTITIES = "identities";
export const INPUT_TYPE_BRANCHFILTER = "branchfilter";

/* Constants: Task input type -- End */

export const CONTROL_OPTIONS_GROUP = "ControlOptions";

/* Boolean constants */
export const BOOLEAN_TRUE = "true";
export const BOOLEAN_FALSE = "false";

/*String constants */
export const STRING_SPACE: string = " ";
export const STRING_BACKSLASH: string = "\\";

export const INPUT_TYPE_PROPERTY_MULTI_SELECT = "MultiSelect";
export const INPUT_TYPE_PROPERTY_MULTI_SELECT_FLATLIST = "MultiSelectFlatList";
export const INPUT_TYPE_PROPERTY_EDITABLE_OPTIONS = "EditableOptions";
export const INPUT_TYPE_PROPERTY_DISABLED = "Disabled";
export const INPUT_TYPE_PROPERTY_ENABLE_MANAGE = "EnableManage";
export const INPUT_TYPE_PROPERTY_MANAGE_LINK = "ManageLink";
export const INPUT_TYPE_PROPERTY_MANAGE_BUTTON_NAME = "ManageButtonName";
export const INPUT_TYPE_PROPERTY_MANAGE_ICON = "ManageIcon";
export const PICKLIST_MULTI_SELECT_TREE_TYPE = "treeList";
export const PICKLIST_MULTI_SELECT_FLAT_LIST_TYPE = "flatList";

export const DefaultBreadcrumbDisplayedItems: number = 2;

export namespace DomAttributeConstants {
    export const TabIndex = "tabindex";
    export const TabIndexMinusOne = "-1";
    export const TabIndexZero = "0";
    export const DataIsFocusableAttrib = "data-is-focusable";
    export const ReadOnlyAttrib = "readonly";
    export const DisabledAttrib = "disabled";
    export const FirstFocusAttrib = "data-first-focus-element";
}

export namespace FunctionKeyCodes {
    export const F6 = 117;
}

export enum ReactCSSTransitionStates {
    // element will have its original state
    None = 0,
    // state to define a child node before adding to ReactCSSTransitionGroup
    Enter = 1,
    // state to define a child node while adding to ReactCSSTransitionGroup
    EnterActive = 2,
    // state to define a child node before removing from ReactCSSTransitionGroup
    Leave = 3,
    // state to define a child node while removing from ReactCSSTransitionGroup
    LeaveActive = 4
}