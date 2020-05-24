
//----------------------------------------------------------
// Generated file, DO NOT EDIT.
// To regenerate this file, run "GenerateConstants.cmd" .

// Generated data for the following assemblies:
// Microsoft.TeamFoundation.Core.WebApi
//----------------------------------------------------------


export module CoreConstants {
    export var ProjectCollectionsLocationId = "8031090f-ef1d-4af6-85fc-698cd75d42bf";
    export var ProjectsLocationId = "603fe2ac-9723-48b9-88ad-09305aa6c6e1";
    export var ProcessLocationId = "93878975-88c5-4e6a-8abb-7ddd77a8a7d8";
    export var ProjectHistoryLocationId = "6488a877-4749-4954-82ea-7340d36be9f2";
    export var TeamsLocationId = "d30a3dd1-f8ba-442a-b86a-bd0c0c383e59";
    export var CollectionTeamsLocationId = "7a4d9ee9-3433-4347-b47a-7a80f1cf307e";
    export var TeamMembersLocationId = "294c494c-2600-4d7e-b76c-3dd50c3c95be";
    export var ConnectedServicesId = "b4f70219-e18b-42c5-abe3-98b07d35525e";
    export var ProxyId = "ec1f4311-f2b4-4c15-b2b8-8990b80d2908";
    export var PropertiesLocationId = "4976a71a-4487-49aa-8aab-a1eda469037a";
    export var AreaId = "79134C72-4A58-4B42-976C-04E7115F32BF";
    export var AreaName = "core";
    export var ProcessAreaName = "process";
    export var ApiString = "_apis";
    export var JsonPatchMediaType = "application/json-patch+json";
    export var ProcessResource = "processes";
    export var ProjectsResource = "projects";
    export var ProjectHistoryResource = "projectHistory";
    export var ProjectCollectionsResource = "projectCollections";
    export var TeamsResource = "teams";
    export var TeamMembersResource = "members";
    export var ConnectedServicesResource = "connectedServices";
    export var ProxyResource = "proxies";
    export var ProxyAuthorizationResource = "proxyauthorization";
    export var PropertiesResource = "properties";
    export var ProjectCollectionsRouteName = "ProjectCollections";
    export var ProjectsRouteName = "Projects";
    export var ProjectHistoryRouteName = "ProjectHistory";
    export var ProcessesRouteName = "Processes";
    export var TeamsRouteName = "Teams";
    export var CollectionTeamsRouteName = "CollectionTeams";
    export var TeamMembersRouteName = "TeamMembers";
    export var ConnectedServicesRouteName = "ConnectedServices";
    export var ProxyRouteName = "Proxies";
    export var PropertiesRouteName = "Properties";
    export var TeamsLocationIdString = "D30A3DD1-F8BA-442A-B86A-BD0C0C383E59";
    export var CollectionTeamsLocationIdString = "7A4D9EE9-3433-4347-B47A-7A80F1CF307E";
}

export enum ProjectState {
    /**
    * Project is in the process of being deleted.
    */
    Deleting = 2,
    /**
    * Project is in the process of being created.
    */
    New = 0,
    /**
    * Project is completely created and ready to use.
    */
    WellFormed = 1,
    /**
    * Project has been queued for creation, but the process has not yet started.
    */
    CreatePending = 3,
    /**
    * All projects regardless of state.
    */
    All = -1,
    /**
    * Project has not been changed.
    */
    Unchanged = -2,
    /**
    * Project has been deleted.
    */
    Deleted = 4,
}

/**
* Used to help build the capabilities for a project.
*/
export module TeamProjectCapabilitiesConstants {
    /**
    * The name of the capability for features.
    */
    export var FeaturesCapabilityName = "features";
    /**
    * The name of the attribute for features that should be enabled.
    */
    export var FeaturesEnabled = "featuresEnabled";
    /**
    * The name of the capability for version control.
    */
    export var VersionControlCapabilityName = "versioncontrol";
    /**
    * The name of the attribute for the version control type.
    */
    export var VersionControlCapabilityAttributeName = "sourceControlType";
    /**
    * The name of the attribute that indicates if Git is enabled
    */
    export var VersionControlGitEnabledAttributeName = "gitEnabled";
    /**
    * The name of the attribute that indicates if TFVC is enabled
    */
    export var VersionControlTfvcEnabledAttributeName = "tfvcEnabled";
    /**
    * The name of the capability for process templates.
    */
    export var ProcessTemplateCapabilityName = "processTemplate";
    /**
    * The name of the attribute for the process template name.
    */
    export var ProcessTemplateCapabilityTemplateNameAttributeName = "templateName";
    /**
    * The name of the attribute for the process template type ID.
    */
    export var ProcessTemplateCapabilityTemplateTypeIdAttributeName = "templateTypeId";
}

export module TfsSettingsScopeNames {
    /**
    * Project-scoped settings use this as the scope name
    */
    export var Project = "Project";
    /**
    * [DEPRECATED] This value may not work with team removal from L1 naviagation
    */
    export var Team = "Team";
    /**
    * Team-scoped settings use this as the scope name
    */
    export var WebTeam = "WebTeam";
    /**
    * Repo-scoped settings use this as the scope name
    */
    export var Repository = "Repository";
}

