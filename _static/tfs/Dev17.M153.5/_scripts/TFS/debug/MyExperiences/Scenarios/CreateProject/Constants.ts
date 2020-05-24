export module Constants {
    export var Area = "MyExperiences";
    export var Feature = "NewProjectCreation";
    export var DataProvider = "ms.vss-tfs-web.project-creation-data-provider";
}

export module UrlParameters {
    export var Source = "SOURCE";
    export var VersionControl = "VERSIONCONTROL";
    export var ProcessTemplate = "PROCESSTEMPLATE";
}

export module ProjectParameterConstants {
    export var ProjectNameBufferLength = 1; // This is used to show error message, when the project name length increases above the length
    export var MaxProjectNameLength = 64;
    export var MaxProjectDescLength = 16000;
}