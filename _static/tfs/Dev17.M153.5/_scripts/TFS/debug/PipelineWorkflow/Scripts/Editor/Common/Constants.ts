/**
 * This file contains constants to be used across Definition scenario
 */

export namespace EditorActions {
    export const ACTION_CREATE_DEFINITION: string = "action-create-definition";
    export const ACTION_CLONE_DEFINITION: string = "action-clone-definition";
    export const ACTION_IMPORT_DEFINITION: string = "action-import-definition";
    export const ACTION_EDIT_DEFINITION: string = "environments-editor-preview";
    export const ACTION_PIPELINE_TAB: string = "definition-pipeline";
    export const ACTION_TASKS_TAB: string = "definition-tasks";
    export const ACTION_HISTORY_TAB: string = "definition-history";
    export const ACTION_VARIABLES_TAB: string = "definition-variables";
    export const ACTION_RETENTIONS_TAB: string = "definition-retentions";
    export const ACTION_OPTIONS_TAB: string = "definition-options";
}

export namespace OldReleaseDefinitionNavigateStateActions {
    export const ACTION_ENVIRONMENTS_EDITOR = "environments-editor";
    export const ACTION_ARTIFACTS_EDITOR = "artifacts-editor";
    export const ACTION_VARIABLES_EDITOR = "variables-editor";
    export const ACTION_CONFIGURATIONS_EDITOR = "configurations-editor";
    export const ACTION_TRIGGERS_EDITOR = "triggers-editor";
    export const ACTION_GENERAL_SETTINGS_EDITOR = "general-settings-editor";
    export const ACTION_RETENTION_POLICY_EDITOR = "retention-policy-editor";
    export const ACTION_DEFINITIONS_HISTORY = "definition-history";
    export const ACTION_ENVIRONMENTS_EDITOR_PREVIEW = "environments-editor-preview";
    export const ACTION_CREATE_DEFINITION = "action-create-definition";
    export const ACTION_IMPORT_DEFINITION = "action-import-definition";
    export const ACTION_CLONE_DEFINITION = "action-clone-definition";
}

export class ArtifactsConstants {
    public static GuidMinLengthValidationPattern: string = "^[0-9a-fA-F]{8}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{12}$";
    public static GuidValidationPattern: string = "^\{[0-9a-fA-F]{8}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{12}\}$";
    public static HttpUrlValidationPattern: string = "^https?://.+$";
    public static NumberMinValue: number = -2147483647;
    public static NumberMaxValue: number = 2147483647;
    public static PossbileTagsKey: string = "possibleTags";
    public static BuildRepository: string = "repository";
    public static LatestWithBranchAndTagsTypeValue: string = "latestWithBranchAndTagsType";
    public static BuildDefinitionFolderPath: string = "folderPath";
    public static TagSeparator: string = "; ";
    public static ArtifactAlias: string = "alias";
    public static TagSplittingSeparator = /[,;]/;
    public static ArtifactAliasRegx: RegExp = new RegExp("^.*[\\\\/:*?\"<>|]+.*$");
    public static MaxNumberOfArtifactsToDisplay: number = 3;
    public static DefaultArtifactType: string = "Build";
    public static ArtifactAliasMaxLength = 256;
    public static ConnectedServicePrefix = "connectedservice:";
    public static BuildArtifactSourceType = "buildArtifactSourceType";
    public static IsSearchable: string = "isSearchable";
    public static SearchText: string = "name";
}

export namespace ErrorMessageParentKeyConstants {
    export const MainParentKey: string = "Main";
}

export namespace CanvasSelectorConstants {
    export const CanvasSelectorInstance = "cd-canvas-selector-instance";
}

export namespace RetentionTabConstants {
    export const RetentionTabInstanceId = "cd-retention-tab-instance";
}

export namespace EnvironmentPropertiesConstants {
    export const EnvironmentNameMaxLength = 256;
}

export namespace TemplateConstants {
    export const EmptyTemplateGuid = "00000000-0000-0000-0000-000000000000";
}

export namespace HubIds {
    export const ReleaseDefinitionHubId = "ms.vss-releaseManagement-web.cd-workflow-hub";
}

export module WellKnownRepositoryTypes {
    export const TfsVersionControl = "TfsVersionControl";
    export const TfsGit = "TfsGit";
    export const Git = "Git";
    export const GitHub = "GitHub";
    export const GitHubEnterprise = "GitHubEnterprise";
    export const Bitbucket = "Bitbucket";
    export const Svn = "Svn";
}

export namespace EditorFeatures {
    export const EnvironmentSelector = "ReleaseEnvironmentSelector";
}

export enum ArtifactMode {
    Add = 0,
    Edit = 1,
}

export enum ArtifactInputState {
    Uninitialized = 0,
    Initializing,
    FetchingDependencies,
    Initialized
}

export enum BranchInputType {
    TfGitBranchFilter = 0,
    Combo,
    Text,
    None
}