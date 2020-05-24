
//----------------------------------------------------------
// Generated file, DO NOT EDIT.
// To regenerate this file, run "GenerateConstants.cmd" .

// Generated data for the following assemblies:
// Microsoft.TeamFoundation.Build.Common
// Microsoft.TeamFoundation.Build2.Server
// Microsoft.TeamFoundation.Build2.WebApi
//----------------------------------------------------------


export module AgentTargetExecutionType {
    export var Normal = 0;
    export var VariableMultipliers = 1;
    export var MultipleAgents = 2;
}

export module ArtifactResourceTypes {
    /**
    * UNC or local folder path E.g. \\vscsstor\CIDrops\CloudU.Gated\140317.115955 or file://vscsstor/CIDrops/CloudU.Gated/140317.115955
    */
    export var FilePath = "FilePath";
    /**
    * Symbol store UNC path E.g. \\symbolstore
    */
    export var SymbolStore = "SymbolStore";
    /**
    * TF VC server folder path E.g. $/Dev1/Drops/CloudU.Gated/140317.115955
    */
    export var VersionControl = "VersionControl";
    /**
    * Build container reference E.g. #/2121/drop
    */
    export var Container = "Container";
    /**
    * Git ref E.g. refs/tags/MyCIDefinition.Buildable
    */
    export var GitRef = "GitRef";
    /**
    * TFVC label
    */
    export var TfvcLabel = "TfvcLabel";
    /**
    * Symbol store URL E.g. https://mseng.artifacts.visualstudio.com/...
    */
    export var SymbolRequest = "SymbolRequest";
    /**
    * Dedup'ed pipeline artifact E.g. artifact1
    */
    export var PipelineArtifact = "PipelineArtifact";
}

export module Build2ResourceIds {
    export var Builds = "0cd358e1-9217-4d94-8269-1c1ee6f93dcf";
    export var LatestBuildLocationId = "54481611-01f4-47f3-998f-160da0f0c229";
    export var Definitions = "dbeaf647-6167-421a-bda9-c9327b25e2e6";
    export var Templates = "e884571e-7f92-4d6a-9274-3f5649900835";
    export var Settings = "aa8c1c9c-ef8b-474a-b8c4-785c7b191d0d";
    export var DefinitionRevisions = "7c116775-52e5-453e-8c5d-914d9762d8c4";
    export var DefinitionMetrics = "d973b939-0ce0-4fec-91d8-da3940fa1827";
    export var Folders = "a906531b-d2da-4f55-bda7-f3e676cc50d9";
    export var Options = "591cb5a4-2d46-4f3a-a697-5cd42b6bd332";
    export var Queues = "09f2a4b8-08c9-4991-85c3-d698937568be";
    export var Artifacts = "1db06c96-014e-44e1-ac91-90b2d4b3e984";
    export var TicketedArtifacts = "731b7e7a-0b6c-4912-af75-de04fe4899db";
    export var TicketedLogs = "917890d1-a6b5-432d-832a-6afcf6bb0734";
    export var BuildChangesBetweenBuilds = "f10f0ea5-18a1-43ec-a8fb-2042c7be9b43";
    export var BuildChanges = "54572c7b-bbd3-45d4-80dc-28be08941620";
    export var Sources = "56efdcdc-cf90-4028-9d2f-d41000682202";
    export var BuildDeployments = "f275be9a-556a-4ee9-b72f-f9c8370ccaee";
    export var BuildReport = "45bcaa88-67e1-4042-a035-56d3b4a7d44c";
    export var BuildWorkItemsBetweenBuilds = "52ba8915-5518-42e3-a4bb-b0182d159e2d";
    export var BuildWorkItems = "5a21f5d2-5642-47e4-a0bd-1356e6731bee";
    export var BuildLogs = "35a80daf-7f30-45fc-86e8-6b813d9c90df";
    export var Tags = "d84ac5c6-edc7-43d5-adc9-1b34be5dea09";
    export var BuildTags = "6e6114b2-8161-44c8-8f6c-c5505782427f";
    export var DefinitionTags = "cb894432-134a-4d31-a839-83beceaace4b";
    export var InputValuesQuery = "2182a7f0-b363-4b2d-b89e-ed0a0b721e95";
    export var SourceProviders = "3ce81729-954f-423d-a581-9fea01d25186";
    export var SourceProviderRepositoriesLocationId = "d44d1680-f978-4834-9b93-8c6e132329c9";
    export var SourceProviderBranchesLocationId = "e05d4403-9b81-4244-8763-20fde28d1976";
    export var SourceProviderWebhooksLocationId = "8f20ff82-9498-4812-9f6e-9c01bdc50e99";
    export var SourceProviderRestoreWebhooksLocationId = "793bceb8-9736-4030-bd2f-fb3ce6d6b478";
    export var SourceProviderFileContentsLocationId = "29d12225-b1d9-425f-b668-6c594a981313";
    export var SourceProviderPathContentsLocationId = "7944d6fb-df01-4709-920a-7a189aa34037";
    export var SourceProviderPullRequestsLocationId = "d8763ec7-9ff0-4fb4-b2b2-9d757906ff14";
    export var SourceProviderRelatedWorkItemsLocationId = "caca4f48-db96-4935-9b76-71de7d9d69dc";
    export var BuildDefinitionBadge = "de6a4df8-22cd-44ee-af2d-39f6aa7a4261";
    export var BuildBadge = "21b3b9ce-fad5-4567-9ad0-80679794e003";
    export var StatusBadgeLocationId = "07acfdce-4757-4439-b422-ddd13a2fcc10";
    export var Controllers = "fcac1932-2ee1-437f-9b6f-7f696be858f6";
    export var Timelines = "8baac422-4c6e-4de5-8532-db96d92acffa";
    export var Usage = "3813d06c-9e36-4ea1-aac3-61a485d60e3d";
    export var Metrics = "104ad424-b758-4699-97b7-7e7da427f9c2";
    export var ProjectMetrics = "7433fae7-a6bc-41dc-a6e2-eef9005ce41a";
    export var BuildProperties = "0a6312e9-0627-49b7-8083-7d74a64849c9";
    export var DefinitionProperties = "d9826ad7-2a68-46a9-a6e9-677698777895";
    export var Attachments = "f2192269-89fa-4f94-baf6-8fb128c55159";
    export var Attachment = "af5122d3-3438-485e-a25a-2dbbfde84ee6";
    export var InformationNodes = "9f094d42-b41c-4920-95aa-597581a79821";
    export var AreaId = "5D6898BB-45EC-463F-95F9-54D49C71752E";
    export var AreaName = "build";
    export var BuildsResource = "builds";
    export var LatestBuildResource = "latest";
    export var DefinitionsResource = "definitions";
    export var TemplatesResource = "templates";
    export var SettingsResource = "settings";
    export var DefinitionRevisionsResource = "revisions";
    export var DefinitionMetricsLocationString = "D973B939-0CE0-4FEC-91D8-DA3940FA1827";
    export var DefinitionMetricsResource = "metrics";
    export var FoldersResource = "folders";
    export var OptionsResource = "options";
    export var QueuesResource = "queues";
    export var ArtifactsResource = "artifacts";
    export var TicketedArtifactsResource = "ticketedArtifacts";
    export var TicketedLogsResource = "ticketedLogs";
    export var BuildChangesLocationId = "54572C7B-BBD3-45D4-80DC-28BE08941620";
    export var BuildChangesResource = "changes";
    export var SourcesLocationId = "56EFDCDC-CF90-4028-9D2F-D41000682202";
    export var SourcesResource = "sources";
    export var BuildDeploymentsResource = "deployments";
    export var BuildReportResource = "report";
    export var BuildWorkItemsLocationId = "5A21F5D2-5642-47E4-A0BD-1356E6731BEE";
    export var BuildWorkItemsResource = "workitems";
    export var BuildLogsResource = "logs";
    export var TagsLocationIdString = "D84AC5C6-EDC7-43D5-ADC9-1B34BE5DEA09";
    export var BuildTagsLocationIdString = "6E6114B2-8161-44C8-8F6C-C5505782427F";
    export var DefinitionTagsLocationIdString = "CB894432-134A-4D31-A839-83BECEAACE4B";
    export var BuildTagsResource = "tags";
    export var InputValuesQueryResource = "InputValuesQuery";
    export var SourceProvidersResource = "sourceProviders";
    export var SourceProvidersLocationIdString = "3CE81729-954F-423D-A581-9FEA01D25186";
    export var SourceProviderRepositoriesResource = "repositories";
    export var SourceProviderRepositoriesLocationIdString = "D44D1680-F978-4834-9B93-8C6E132329C9";
    export var SourceProviderBranchesResource = "branches";
    export var SourceProviderBranchesLocationIdString = "E05D4403-9B81-4244-8763-20FDE28D1976";
    export var SourceProviderWebhooksResource = "webhooks";
    export var SourceProviderWebhooksLocationIdString = "8F20FF82-9498-4812-9F6E-9C01BDC50E99";
    export var SourceProviderRestoreWebhooksLocationIdString = "793BCEB8-9736-4030-BD2F-FB3CE6D6B478";
    export var SourceProviderFileContentsResource = "fileContents";
    export var SourceProviderFileContentsLocationIdString = "29D12225-B1D9-425F-B668-6C594A981313";
    export var SourceProviderPathContentsResource = "pathContents";
    export var SourceProviderPathContentsLocationIdString = "7944D6FB-DF01-4709-920A-7A189AA34037";
    export var SourceProviderPullRequestsResource = "pullRequests";
    export var SourceProviderPullRequestsLocationIdString = "D8763EC7-9FF0-4FB4-B2B2-9D757906FF14";
    export var SourceProviderRelatedWorkItemsResource = "relatedWorkItems";
    export var SourceProviderRelatedWorkItemsLocationIdString = "CACA4F48-DB96-4935-9B76-71DE7D9D69DC";
    export var BuildDefinitionBadgeResource = "badge";
    export var BuildBadgeResource = "buildbadge";
    export var StatusBadgeLocationIdString = "07ACFDCE-4757-4439-B422-DDD13A2FCC10";
    export var StatusBadgeResource = "status";
    export var ControllersLocationString = "{FCAC1932-2EE1-437F-9B6F-7F696BE858F6}";
    export var ControllersResource = "Controllers";
    export var TimelinesResource = "Timeline";
    export var UsageResource = "ResourceUsage";
    export var MetricsResource = "Metrics";
    export var ProjectMetricsLocationString = "7433FAE7-A6BC-41DC-A6E2-EEF9005CE41A";
    export var BuildPropertiesLocationString = "0A6312E9-0627-49B7-8083-7D74A64849C9";
    export var DefinitionPropertiesLocationString = "D9826AD7-2A68-46A9-A6E9-677698777895";
    export var PropertiesResource = "properties";
    export var AttachmentsLocation = "F2192269-89FA-4F94-BAF6-8FB128C55159";
    export var AttachmentLocation = "AF5122D3-3438-485E-A25A-2DBBFDE84EE6";
    export var AttachmentsResource = "attachments";
}

export module BuildArtifactConstants {
    export var Drop = "drop";
    export var SourceLabel = "build.SourceLabel";
}

export module BuildConstants {
    export var BuildOptionAdditionalFieldsName = "additionalFields";
}

export module BuildCustomerIntelligenceInfo {
    export var Area = "Build";
}

export module BuildEvents {
    export var ArtifactAdded = "artifactAdded";
    export var BuildUpdated = "buildUpdated";
    export var ChangesCalculated = "changesCalculated";
    export var ConsoleLinesReceived = "consoleLinesReceived";
    export var TagsAdded = "tagsAdded";
    export var TimelineRecordsUpdated = "timelineRecordsUpdated";
}

export module BuildOrchestrationType {
    export var Build = 1;
    export var Cleanup = 2;
}

export module BuildPermissions {
    export var ViewBuilds = 1;
    export var EditBuildQuality = 2;
    export var RetainIndefinitely = 4;
    export var DeleteBuilds = 8;
    export var ManageBuildQualities = 16;
    export var DestroyBuilds = 32;
    export var UpdateBuildInformation = 64;
    export var QueueBuilds = 128;
    export var ManageBuildQueue = 256;
    export var StopBuilds = 512;
    export var ViewBuildDefinition = 1024;
    export var EditBuildDefinition = 2048;
    export var DeleteBuildDefinition = 4096;
    export var OverrideBuildCheckInValidation = 8192;
    export var AdministerBuildPermissions = 16384;
    export var AllPermissions = 32767;
}

export module BuildSecurity {
    export var BuildNamespaceId = "33344d9c-fc72-4d6f-aba5-fa317101a7e9";
}

export module BuildTemplateCategories {
    export var All = "All";
    export var Build = "Build";
    export var Utility = "Utility";
    export var Test = "Test";
    export var Package = "Package";
    export var Deploy = "Deploy";
    export var Tool = "Tool";
    export var Custom = "Custom";
    export var AllCategories = ["All", "Build", "Utility", "Test", "Package", "Deploy", "Tool", "Custom"];
}

export module BuildVariables {
    export var CollectionId = "system.collectionId";
    export var DefinitionId = "system.definitionId";
    export var HostType = "system.hosttype";
    export var IsFork = "system.pullRequest.isFork";
    export var PullRequestId = "system.pullRequest.pullRequestId";
    export var PullRequestNumber = "system.pullRequest.pullRequestNumber";
    export var PullRequestSourceBranch = "system.pullRequest.sourceBranch";
    export var PullRequestTargetBranch = "system.pullRequest.targetBranch";
    export var PullRequestSourceRepositoryUri = "system.pullRequest.sourceRepositoryUri";
    export var PullRequestSourceCommitId = "system.pullRequest.sourceCommitId";
    export var PullRequestMergedAt = "system.pullRequest.mergedAt";
    export var System = "system";
    export var TeamProject = "system.teamProject";
    export var TeamProjectId = "system.teamProjectId";
    export var BuildId = "build.buildId";
    export var BuildNumber = "build.buildNumber";
    export var BuildUri = "build.buildUri";
    export var ContainerId = "build.containerId";
    export var DefinitionName = "build.definitionName";
    export var DefinitionVersion = "build.definitionVersion";
    export var JobAuthorizeAs = "Job.AuthorizeAs";
    export var JobAuthorizeAsId = "Job.AuthorizeAsId";
    export var QueuedBy = "build.queuedBy";
    export var QueuedById = "build.queuedById";
    export var Reason = "build.reason";
    export var RepoUri = "build.repository.uri";
    export var RequestedFor = "build.requestedFor";
    export var RequestedForEmail = "build.requestedForEmail";
    export var RequestedForId = "build.requestedForId";
    export var SourceBranch = "build.sourceBranch";
    export var SourceBranchName = "build.sourceBranchName";
    export var SourceTfvcShelveset = "build.sourceTfvcShelveset";
    export var SourceVersion = "build.sourceVersion";
    export var SourceVersionAuthor = "build.sourceVersionAuthor";
    export var SourceVersionMessage = "build.sourceVersionMessage";
    export var SyncSources = "build.syncSources";
}

export module DefinitionMetrics {
    export var SuccessfulBuilds = "SuccessfulBuilds";
    export var FailedBuilds = "FailedBuilds";
    export var PartiallySuccessfulBuilds = "PartiallySuccessfulBuilds";
    export var CanceledBuilds = "CanceledBuilds";
    export var TotalBuilds = "TotalBuilds";
    export var CurrentBuildsInQueue = "CurrentBuildsInQueue";
    export var CurrentBuildsInProgress = "CurrentBuildsInProgress";
}

export module Favorites {
    export var BuildDefinitionFavoriteId = "Microsoft.TeamFoundation.Build.Definition";
}

export module Links {
    export var Self = "self";
    export var Web = "web";
    export var Editor = "editor";
    export var Badge = "badge";
    export var Timeline = "timeline";
    export var Details = "details";
    export var SourceVersionDisplayUri = "sourceVersionDisplayUri";
}

export module MetricAggregationTypes {
    export var Hourly = "Hourly";
    export var Daily = "Daily";
}

export module PhaseTargetType {
    export var Agent = 1;
    export var Server = 2;
}

export module ProcessType {
    export var Designer = 1;
    export var Yaml = 2;
}

export module RepositoryProperties {
    export var AcceptUntrustedCertificates = "acceptUntrustedCerts";
    export var ApiUrl = "apiUrl";
    export var BranchesUrl = "branchesUrl";
    export var CheckoutNestedSubmodules = "checkoutNestedSubmodules";
    export var CleanOptions = "cleanOptions";
    export var CloneUrl = "cloneUrl";
    export var ConnectedServiceId = "connectedServiceId";
    export var FetchDepth = "fetchDepth";
    export var Fullname = "fullName";
    export var GitLfsSupport = "gitLfsSupport";
    export var ManageUrl = "manageUrl";
    export var LabelSources = "labelSources";
    export var LabelSourcesFormat = "labelSourcesFormat";
    export var Password = "password";
    export var ReportBuildStatus = "reportBuildStatus";
    export var SkipSyncSource = "skipSyncSource";
    export var SvnMapping = "svnMapping";
    export var TfvcMapping = "tfvcMapping";
    export var TokenType = "tokenType";
    export var Username = "username";
    export var IsPrivate = "isPrivate";
    export var DefaultBranch = "defaultBranch";
    export var RefsUrl = "refsUrl";
}

export module RepositoryTypes {
    export var TfsVersionControl = "TfsVersionControl";
    export var TfsGit = "TfsGit";
    export var Git = "Git";
    export var GitHub = "GitHub";
    export var GitHubEnterprise = "GitHubEnterprise";
    export var Bitbucket = "Bitbucket";
    export var Svn = "Svn";
}

export module ServerTargetExecutionType {
    export var Normal = 0;
    export var VariableMultipliers = 1;
}

export module SettingsSourceType {
    export var Definition = 1;
    export var Process = 2;
}

