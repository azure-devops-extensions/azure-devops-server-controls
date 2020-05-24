
//----------------------------------------------------------
// Generated file, DO NOT EDIT.
// To regenerate this file, run "GenerateConstants.cmd" .

// Generated data for the following assemblies:
// Microsoft.VisualStudio.Services.MemberEntitlementManagement.WebApi
// Microsoft.VisualStudio.Services.WebApi
//----------------------------------------------------------


export module DirectoryEntityType {
    /**
    * This concrete type implies that the directory entity represents a user.
    */
    export var User = "User";
    /**
    * This concrete type implies that the directory entity represents a group.
    */
    export var Group = "Group";
}

export module DirectoryName {
    /**
    * This is a concrete directory.
    */
    export var VisualStudioDirectory = "vsd";
    /**
    * This is a concrete directory.
    */
    export var AzureActiveDirectory = "aad";
}

export module OperationTarget {
    export var AccessLevel = "accessLevel";
    export var ProjectEntitlements = "projectEntitlements";
    export var Extensions = "extensions";
    export var TeamRefs = "teamRefs";
}

export module OriginName {
    export var AzureActiveDirectory = "aad";
    export var MicrosoftAccount = "msa";
    export var VisualStudioTeamServices = "vsts";
}

export module SubjectKind {
    export var Group = "group";
    export var User = "user";
}

export module SortOrder {
    export var Ascending = "ascending";
    export var Descending = "descending";
}

export module UserEntitlementFilterNames {
    export var AccessLevel = "licenseId";
    export var Extensions = "extensionId";
    export var UserType = "userType";
    export var DisplayName = "name";
}

export module UserEntitlementPropertyNames {
    export var Projects = "projects";
    export var Extensions = "extensions";
    export var GroupRules = "grouprules";
}

export module UserEntitlementSortColumns {
    export var DisplayName = "displayName";
    export var LastAccessDate = "lastAccessDate";
}

export module UserMetaType {
    export var Guest = "guest";
}

