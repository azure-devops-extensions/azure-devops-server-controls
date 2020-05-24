import * as Resources from "CIWorkflow/Scripts/Resources/TFS.Resources.CIWorkflow";

/* tslint:disable: max-classes-per-file*/

export class CommonConstants {
    public static FeatureArea: string = "CI";
}

export namespace PerfScenarios {
    export const Split_ServerInteractionComplete: string = "VSO.TFS.CI.Server.Interaction.Complete";
    export const Split_GetBuildDefinitionTemplateComplete: string = "VSO.TFS.CI.GetBuildDefinitionTemplate.Complete";
    export const Split_GetDefaultRepositoryForProjectComplete: string = "VSO.TFS.CI.GetDefaultRepositoryForProject.Complete";
    export const Split_UpdateRepositoriesComplete: string = "VSO.TFS.CI.UpdateRepositories.Complete";
    export const Split_UpdateBranchesComplete: string = "VSO.TFS.CI.UpdateBranches.Complete";
    export const Split_SaveAsDraftServerInteractionComplete: string = "VSO.TFS.CI.SaveAsDraftServerInteraction.Complete";
    export const Split_DiscardParentDefinitionInteractionComplete: string = "VSO.TFS.CI.DiscardParentDefinitionInteraction.Complete";
    export const Split_GetParentDefinitionInteractionComplete: string = "VSO.TFS.CI.GetParentDefinitionInteraction.Complete";
    export const Split_PublishDraftDefinitionInteractionComplete: string = "VSO.TFS.CI.PublishDraftDefinitionInteraction.Complete";

    export const RepositorySelected: string = "selected";

    export const GettingStarted: string = "VSO.TFS.CI.GettingStarted";
    export const CreateNewDefinition: string = "VSO.TFS.CI.CreateNewDefinition";
    export const EditDefinition: string = "VSO.TFS.CI.EditDefinition";
    export const CloneDefinition: string = "VSO.TFS.CI.CloneDefinition";
    export const ImportDefinition: string = "VSO.TFS.CI.ImportDefinition";
    export const SaveDefinition: string = "VSO.TFS.CI.SaveDefinition";
    export const ValidateDefinition: string = "VSO.TFS.CI.ValidateDefinition";
    export const SaveAsDraft: string = "VSO.TFS.CI.SaveAsDraft";
    export const PublishDraft: string = "VSO.TFS.CI.PublishDraft";
}

export namespace GitServiceConstants {
    export const accessToken: string = "accessToken";
    export const repo: string = "repo";
    export const branchesUrl: string = "branchesUrl";
    export const repoBranches: string = "repoBranches";
    export const apiUrl: string = "apiUrl";
    export const cloneUrl: string = "cloneUrl";
    export const refsUrl: string = "refsUrl";
    export const username: string = "username";
    export const repos: string = "repos";
    export const branch: string = "branch";
    export const repoContent: string = "repoContent";
    export const path: string = "path";
    export const defaultBranch: string = "defaultBranch";
    export const repositoryType: string = "repositoryType";
    export const definitionId: string = "definitionId";
    export const isFolder: string = "isFolder";
    export const url: string = "url";
    export const children: string = "children";
    export const connectedServiceId = "connectedServiceId";
    export const project: string = "project";
    export const repoFileContent: string = "repoFileContent";
    export const version: string = "version";
    export const repoWebhooks: string = "repoWebhooks";
    export const type: string = "type";
    export const fullName: string = "fullName";
}

export namespace BuildOptionsConstants {
    export const oauthTokenBuildOptionId = "57578776-4C22-4526-AEB0-86B6DA17EE9C";
}

export class TfvcConstants {
    public static DefaultTfvcPrefix = "$/";
    public static MappingType_Map = "map";
    public static MappingType_Cloak = "cloak";
}

export class ContributionConstants {
    public static ACTION_CREATE_BUILD_DEFINITION: string = "create-build-definition";
    public static ACTION_EDIT_BUILD_DEFINITION: string = "edit-build-definition";
    public static ACTION_CLONE_BUILD_DEFINITION: string = "clone-build-definition";
    public static ACTION_IMPORT_BUILD_DEFINITION: string = "import-build-definition";
    public static ACTION_BUILD_DEFINITION_GETTING_STARTED: string = "build-definition-getting-started";
    public static ACTION_BUILD_DEFINITION_GETTING_STARTED_TEMPLATE: string = "build-definition-getting-started-template";
    public static BUILD_DEFINITION_DATA_PROVIDER_ID: string = "ms.vss-ciworkflow.ciworkflow.webpage.data-provider";
}

export class ErrorMessageParentKeyConstants {
    public static Main: string = "Main";
    public static Options: string = "Options";
    public static Tasks: string = "Tasks";
    public static Triggers: string = "Triggers";
}

export class DemandInstances {
    public static DefinitionInstance: string = "ci-demands-definition-instance";
    public static RuntimeInstance: string = "ci-demands-runtime-instance";
}

export class CloneConstants {
    public static defaultNameSuffix: string = "-clone";
}

export class ImportConstants {
    public static ImportStorageKey: string = "TFS-Build-Import";
}

export namespace AgentsConstants {
    export const instance = "ci-agents-instance";
}

/**
 * Unique key for each column in the resourcs grids
 */
export namespace ResourceColumnKeys {
    export const IconColumnKey: string = "icon";
    export const NameColumnKey: string = "name";
    export const TypeColumnKey: string = "type";
    export const DeleteColumnKey: string = "delete";
}

export const BuildTasksVisibilityFilter = ["Build"];

export const OthersSource: string = "others";

/* tslint:enable: max-classes-per-file*/
