// This file is targeted to contain only constants and interfaces that are common accross Definition scenario. Do not import any other TS module in this file

/* tslint:disable: max-classes-per-file*/

export class ActionCreatorKeys {
    public static BuildDefintion_ActionCreator = "ACTION_CREATOR_KEY_BUILD_DEFINITION_ACTION_CREATOR";
    public static Triggers_ActionCreator = "ACTION_CREATOR_KEY_TRIGGERS_ACTION_CREATOR";
    public static PullRequestTrigger_ActionCreator = "ACTION_CREATOR_KEY_PULLREQUESTTRIGGER_ACTION_CREATOR";
    public static RepositoryWebhook_ActionCreator = "ACTION_CREATOR_KEY_REPOSITORYWEBHOOK_ACTION_CREATOR";
    public static DtcAdapter_ActionCreator = "ACTION_CREATOR_KEY_DTC_ADAPTER_ACTION_CREATOR";
    public static QueueBuild_ActionCreator = "ACTION_CREATOR_KEY_QUEUE_BUILD_ACTION_CREATOR";
    public static Resources_ActionCreator = "ACTION_CREATOR_KEY_RESOURCES_ACTION_CREATOR";
    public static RetentionPolicyList_ActionCreator = "ACTION_CREATOR_KEY_RETENTION_POLICY_LIST_ACTION_CREATOR";
    public static RetentionPolicy_ActionCreator = "ACTION_CREATOR_KEY_RETENTION_POLICY_ACTION_CREATOR";
    public static History_ActionCreator = "ACTION_CREATOR_KEY_HISTORY_ACTION_CREATOR";
    public static Folders_ActionCreator = "ACTION_CREATOR_KEY_FOLDERS_ACTION_CREATOR";
    public static VersionControl_ActionCreator = "ACTION_CREATOR_KEY_VERSION_CONTROL_ACTION_CREATOR";
    public static Yaml_ActionCreator = "ACTION_CREATOR_KEY_YAML_ACTION_CREATOR";
    public static YamlDefinition_ActionCreator = "ACTION_CREATOR_KEY_YAML_DEFINITION_ACTION_CREATOR";
    public static Process_ActionCreator = "ACTION_CREATOR_KEY_PROCESS_ACTION_CREATOR";
}

export class BuildDefinitionStoreKeys {
    public static StoreKey_BuildDefinitionStore = "STORE_KEY_BUILD_DEFINITION_STORE";
    public static StoreKey_BuildJobStore = "STORE_KEY_BUILD_JOB_STORE";
    public static StoreKey_BuildOptionsListStore = "STORE_KEY_BUILD_OPTIONS_LIST_STORE";
    public static StoreKey_CoreDefinitionStore = "STORE_KEY_CORE_DEFINITION_STORE";
    public static StoreKey_DtcAdapterStore = "STORE_KEY_DTC_ADAPTER_STORE";
    public static StoreKey_GatedCheckInStore = "STORE_KEY_GATED_CHECK_IN_STORE";
    public static StoreKey_HistoryStore = "STORE_KEY_HISTORY_STORE";
    public static StoreKey_ManageFolderDialogStore = "STORE_KEY_MANAGE_FOLDER_DIALOG_STORE";
    public static StoreKey_ProcessResourceStore = "STORE_PROCESS_RESOURCE_STORE";
    public static StoreKey_PullRequestTriggerStore = "STORE_KEY_PULLREQUEST_TRIGGERS_STORE";
    public static StoreKey_QueueBuildStore = "STORE_KEY_QUEUE_BUILD_STORE";
    public static StoreKey_RetentionPolicyListStore = "STORE_KEY_RETENTION_POLICY_LIST_STORE";
    public static StoreKey_RetentionPolicyStore = "STORE_KEY_RETENTION_POLICY_STORE";
    public static StoreKey_ScheduledTriggerStore = "STORE_KEY_SI_TRIGGERS_STORE";
    public static StoreKey_SaveDefinitionStore = "STORE_KEY_SAVE_DEFINITION_STORE";
    public static StoreKey_SourceProvidersStore = "STORE_KEY_SOURCE_PROVIDERS_STORE";
    public static StoreKey_SourcesSelectionStore = "STORE_KEY_SOURCES_SELECTION_STORE";
    public static StoreKey_SubversionStore = "STORE_KEY_SUBVERSION_STORE";
    public static StoreKey_TasksTabStore = "STORE_KEY_TASKS_TAB";
    public static StoreKey_TfGitStore = "STORE_KEY_TFGIT_STORE";
    public static StoreKey_TfvcStore = "STORE_KEY_TFVC_STORE";
    public static StoreKey_TriggersStore = "STORE_KEY_TRIGGERS_STORE";
    public static StoreKey_VersionControlStore = "STORE_KEY_VERSION_CONTROL_STORE";
    public static StoreKey_YamlDefinitionStore = "STORE_KEY_YAML_DEFINITION_STORE";
    public static StoreKey_BuildCompletionTriggerStore = "STORE_KEY_BUILD_COMPLETION_TRIGGER_STORE";
    public static StoreKey_DraftsStore = "STORE_KEY_DEFINITION_DRAFTS_STORE";
}

export class StoreKeys {
    public static StoreKey_YamlStore = "STORE_KEY_YAML_STORE";
}

export class StoreChangedEvents {
    public static RemoteVersionControlDataUpdatedEvent = "STORE_EVENT_REMOTE_VERSION_CONTROL_DATA_UPDATED";
    public static VersionControlServerErrorEvent = "STORE_EVENT_VERSION_CONTROL_SERVER_ERROR";
}

export enum RepositoryTypes {
    LocalGit = 1,
    Tfvc,
    GitHub,
    GitHubEnteprise,
    Bitbucket,
    RemoteGit,
    SVN
}

export enum FilterType {
    BranchFilter = 1,
    PathFilter
}

export enum FilterOption {
    Include = 1,
    Exclude
}

export class FwLinks {
    public static GitAdvancedSettingsHelpLink = "https://go.microsoft.com/fwlink/?linkid=829603";
    public static TfvcCleanOptionsHelpLink = "https://go.microsoft.com/fwlink/?LinkId=747838";
}

export class TemplateConstants {
    public static EmptyTemplateId = "blank";
}

export interface INavigationView extends IDisposable {
    canNavigateAway(action?: string): boolean;
}

export class TabKeyConstants {
    public static Tasks: string = "Tab_Tasks";
    public static Triggers: string = "Tab_Triggers";
    public static Variables: string = "Tab_Variables";
    public static Options: string = "Tab_Options";
    public static Retention: string = "Tab_Retention";
    public static History: string = "Tab_History";
}

export class OptionsKeyConstants {
    public static BuildProperties: string = "63A57506-739B-48A4-A05E-6567229EB9E6";
    public static Agents: string = "3FDF0D13-F339-4929-B885-2770DF1B3447";
    public static Demands: string = "3A50DA86-9153-4A7F-A430-4C4853E5879F";
    public static StatusBadge: string = "ADD80B0E-1477-4B5D-AF18-DD50B09D4FAF";
    // below is taken from service
    public static MultiConfiguration: string = "7C555368-CA64-4199-ADD6-9EBAF0B0137D";
}

export class TaskTabInstance {
    public static TaskListStoreInstanceId: string = "ci.tasks-tab";
}

export enum JobAuthorizationScope {
    ProjectCollection = 1,
    Project = 2
}

export const MinPollingIntervalInSeconds = 60;
export const MaxPollingIntervalInSeconds = 86400;
export const MinConcurrentBuildsPerBranch = 1;
export const MaxConcurrentBuildsPerBranch = 2147483647;
export const RetentionInstanceId = "ci.retention";

export class ItemKeys {
    // RetentionPolicyItem unique key prefix
    public static readonly RetentionPolicyItemPrefix: string = "ci.retention.policy.item";
    // MaximunPolicyItem unique key prefix
    public static readonly MaxRetentionPolicyItemPrefix: string = "ci.maximum.retention.policy.item";
    // GetSourcesItem unique key
    public static readonly GetSourcesItemKey: string = "ci.getsources";
}

/* tslint:enable: max-classes-per-file*/
