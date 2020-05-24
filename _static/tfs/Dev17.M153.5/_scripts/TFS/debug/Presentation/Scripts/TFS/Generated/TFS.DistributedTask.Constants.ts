
//----------------------------------------------------------
// Generated file, DO NOT EDIT.
// To regenerate this file, run "GenerateConstants.cmd" .

// Generated data for the following assemblies:
// Microsoft.TeamFoundation.DistributedTask.WebApi
//----------------------------------------------------------


export module AzurePermissionResourceProviders {
    export var AzureRoleAssignmentPermission = "Microsoft.RoleAssignment";
    export var AzureKeyVaultPermission = "Microsoft.KeyVault";
}

export module CoreAttachmentType {
    export var Log = "DistributedTask.Core.Log";
    export var Summary = "DistributedTask.Core.Summary";
    export var FileAttachment = "DistributedTask.Core.FileAttachment";
    export var DiagnosticLog = "DistributedTask.Core.DiagnosticLog";
}

export module DeploymentGroupMetricsValidColumnNames {
    export var DeploymentTargetState = "DeploymentTargetState";
    export var LastDeploymentStatus = "LastDeploymentStatus";
    export var TotalDeploymentTargetCount = "TotalDeploymentTargetCount";
}

export module DeploymentGroupMetricsValidColumnValueTypes {
    export var Number = "number";
    export var String = "string";
}

export module DeploymentGroupMetricsValidJobStatus {
    export var Succeeded = "Succeeded";
    export var NotSucceeded = "Not succeeded";
    export var NotDeployed = "Not deployed";
}

export module DeploymentGroupMetricsValidTargetState {
    export var Online = "Online";
    export var Offline = "Offline";
}

export module EventConstants {
    export var AgentAdded = "MS.TF.DistributedTask.AgentAdded";
    export var AgentDeleted = "MS.TF.DistributedTask.AgentDeleted";
    export var AgentRequestAssigned = "MS.TF.DistributedTask.AgentRequestAssigned";
    export var AgentRequestCompleted = "MS.TF.DistributedTask.AgentRequestCompleted";
    export var AgentRequestQueued = "MS.TF.DistributedTask.AgentRequestQueued";
    export var AgentUpdated = "MS.TF.DistributedTask.AgentUpdated";
    export var DeploymentGatesChanged = "MS.TF.DistributedTask.DeploymentGatesChanged";
    export var DeploymentMachinesChanged = "MS.TF.DistributedTask.DeploymentMachinesChanged";
    export var PoolCreated = "MS.TF.DistributedTask.AgentPoolCreated";
    export var PoolDeleted = "MS.TF.DistributedTask.AgentPoolDeleted";
    export var QueueCreated = "MS.TF.DistributedTask.AgentQueueCreated";
    export var QueueDeleted = "MS.TF.DistributedTask.AgentQueueDeleted";
    export var QueuesDeleted = "MS.TF.DistributedTask.AgentQueuesDeleted";
    export var TasksChanged = "MS.TF.DistributedTask.TasksChanged";
    export var Version = "2.0";
}

export module InputValidationTypes {
    export var Expression = "expression";
    export var Input = "input";
}

export module ParallelismTagTypes {
    export var Public = "Public";
    export var Private = "Private";
}

export module ResourceLimitConstants {
    export var FreeCount = "FreeCount";
    export var PurchasedCount = "PurchasedCount";
    export var EnterpriseUsersCount = "EnterpriseUsersCount";
    export var IsPremium = "IsPremium";
}

export module TaskAgentPoolMetricsValidAgentState {
    export var Online = "Online";
    export var Offline = "Offline";
}

export module TaskAgentPoolMetricsValidColumnNames {
    export var AgentState = "AgentState";
    export var AgentsCount = "AgentsCount";
}

export module TaskAgentPoolMetricsValidColumnValueTypes {
    export var Number = "number";
    export var String = "string";
}

export module TaskResourceIds {
    export var Agents = "e298ef32-5878-4cab-993c-043836571f42";
    export var AgentMessages = "c3a054f6-7a8a-49c0-944e-3a8e5d7adfd7";
    export var AgentSessions = "134e239e-2df3-4794-a6f6-24f1f19ec8dc";
    export var AgentUpdates = "8cc1b02b-ae49-4516-b5ad-4f9b29967c30";
    export var UserCapabilities = "30ba3ada-fedf-4da8-bbb5-dacf2f82e176";
    export var AgentClouds = "bfa72b3d-0fc6-43fb-932b-a7f6559f93b9";
    export var AgentCloudRequests = "20189bd7-5134-49c2-b8e9-f9e856eea2b2";
    export var Packages = "8ffcd551-079c-493a-9c02-54346299d144";
    export var Pools = "a8c47e17-4d56-4a56-92bb-de7ea7dc65be";
    export var AgentCloudTypes = "5932e193-f376-469d-9c3e-e5588ce12cb5";
    export var DeploymentPoolsSummary = "6525d6c6-258f-40e0-a1a9-8a24a3957625";
    export var PoolMaintenanceDefinitions = "80572e16-58f0-4419-ac07-d19fde32195c";
    export var PoolMaintenanceJobs = "15e7ab6e-abce-4601-a6d8-e111fe148f46";
    export var Queues = "900fa995-c559-4923-aae7-f8424fe4fbea";
    export var DeploymentGroupAccessToken = "3d197ba2-c3e9-4253-882f-0ee2440f8174";
    export var DeploymentPoolAccessToken = "e077ee4a-399b-420b-841f-c43fbc058e0b";
    export var DeploymentGroupsMetrics = "281c6308-427a-49e1-b83a-dac0f4862189";
    export var DeploymentGroups = "083c4d89-ab35-45af-aa11-7cf66895c53e";
    export var DeploymentMachineGroups = "d4adf50f-80c6-4ac8-9ca1-6e4e544286e9";
    export var DeploymentMachines = "6f6d406f-cfe6-409c-9327-7009928077e7";
    export var DeploymentMachineGroupMachines = "966c3874-c347-4b18-a90c-d509116717fd";
    export var DeploymentTargets = "2f0aa599-c121-4256-a5fd-ba370e0ae7b6";
    export var DeploymentMachineGroupAccessToken = "f8c7c0de-ac0d-469b-9cb1-c21f72d67693";
    export var PoolRolesCompat = "9e627af6-3635-4ddf-a275-dca904802338";
    export var QueueRoles = "b0c6d64d-c9fa-4946-b8de-77de623ee585";
    export var PoolRoles = "381dd2bb-35cf-4103-ae8c-3c815b25763c";
    export var PoolMetadata = "0d62f887-9f53-48b9-9161-4c35d5735b0f";
    export var JobRequestsDeprecated = "fc825784-c92a-4299-9221-998a02d1b54f";
    export var AgentRequests = "f5f81ffb-f396-498d-85b1-5ada145e648a";
    export var DeploymentMachineJobRequests = "a3540e5b-f0dc-4668-963b-b752459be545";
    export var DeploymentTargetJobRequests = "2fac0be3-8c8f-4473-ab93-c1389b08a2c9";
    export var DeploymentMachineMessages = "91006ac4-0f68-4d82-a2bc-540676bd73ce";
    export var DeploymentTargetMessages = "1c1a817f-f23d-41c6-bf8d-14b638f64152";
    export var Tasks = "60aac929-f0cd-4bc8-9ce4-6b30e8f1b1bd";
    export var TaskEndpoint = "f223b809-8c33-4b7d-b53f-07232569b5d6";
    export var TaskIcons = "63463108-174d-49d4-b8cb-235eea42a5e1";
    export var Logs = "46f5667d-263a-4684-91b1-dff7fdcf64e2";
    export var Logs_Compat = "15344176-9e77-4cf4-a7c3-8bc4d0a3c4eb";
    export var Plans = "5cecd946-d704-471e-a45f-3b4064fcfaba";
    export var Plans_Compat = "f8d10759-6e90-48bc-96b0-d19440116797";
    export var PlanEvents = "557624af-b29e-4c20-8ab0-0399d2204f3f";
    export var PlanEvents_Compat = "dfed02fb-deee-4039-a04d-aa21d0241995";
    export var PlanAttachments = "eb55e5d6-2f30-4295-b5ed-38da50b1fc52";
    export var Attachments = "7898f959-9cdf-4096-b29e-7f293031629e";
    export var Timelines = "83597576-cc2c-453c-bea6-2882ae6a1653";
    export var Timelines_Compat = "ffe38397-3a9d-4ca6-b06d-49303f287ba5";
    export var TimelineRecords = "8893bc5b-35b2-4be7-83cb-99e683551db4";
    export var TimelineRecords_Compat = "50170d5d-f122-492f-9816-e2ef9f8d1756";
    export var TimelineRecordFeeds = "858983e4-19bd-4c5e-864c-507b59b58b12";
    export var TimelineRecordFeeds_Compat = "9ae056f6-d4e4-4d0c-bd26-aee2a22f01f2";
    export var ServiceEndpoints = "ca373c13-fec3-4b30-9525-35a117731384";
    export var ServiceEndpoints2 = "dca61d2f-3444-410a-b5ec-db2fc4efb4c5";
    export var ServiceEndpointTypes = "7c74af83-8605-45c1-a30b-7a05d5d7f8c1";
    export var ServiceEndpointProxy = "e3a44534-7b94-4add-a053-8af449589c62";
    export var ServiceEndpointProxy2 = "f956a7de-d766-43af-81b1-e9e349245634";
    export var AzureSubscriptions = "bcd6189c-0303-471f-a8e1-acb22b74d700";
    export var AzureManagementGroups = "39fe3bf2-7ee0-4198-a469-4a29929afa9c";
    export var TaskGroups = "6c08ffbf-dbf1-4f9a-94e5-a1cbd47005e7";
    export var TaskGroupHistory = "100cc92a-b255-47fa-9ab3-e44a2985a3ac";
    export var ExtensionEvents = "96c86d26-36fb-4649-9215-36e03a8bbc7d";
    export var TaskHubLicense = "f9f0f436-b8a1-4475-9041-1ccdbf8f0128";
    export var ResourceLimits = "1f1f0557-c445-42a6-b4a0-0df605a3a0f8";
    export var ResourceUsage = "eae1d376-a8b1-4475-9041-1dfdbe8f0143";
    export var VariableGroups = "f5b09dd5-9d54-45a1-8b5a-1c8287d634cc";
    export var SecureFiles = "adcfd8bc-b184-43ba-bd84-7c8c6a2ff421";
    export var PlanGroupsQueue = "0dd73091-3e36-4f43-b443-1b76dd426d84";
    export var QueuedPlanGroup = "65fd0708-bc1e-447b-a731-0587c5464e5b";
    export var PlanGroupsQueueMetrics = "038fd4d5-cda7-44ca-92c0-935843fee1a7";
    export var VstsAadOAuth = "9c63205e-3a0f-42a0-ad88-095200f13607";
    export var InputValidation = "58475b1e-adaf-4155-9bc1-e04bf1fff4c2";
    export var GetServiceEndpointExecutionHistory = "3ad71e20-7586-45f9-a6c8-0342e00835ac";
    export var PostServiceEndpointExecutionHistory = "11a45c69-2cce-4ade-a361-c9f5a37239ee";
    export var AreaId = "A85B8835-C1A1-4AAC-AE97-1C3D0BA72DBD";
    export var AreaName = "distributedtask";
    export var AgentsResource = "agents";
    export var AgentMessagesResource = "messages";
    export var AgentSessionsResource = "sessions";
    export var AgentUpdatesResource = "updates";
    export var UserCapabilitiesResource = "usercapabilities";
    export var AgentCloudsResource = "agentclouds";
    export var AgentCloudRequestsResource = "requests";
    export var PackagesResource = "packages";
    export var PoolsResource = "pools";
    export var AgentCloudTypesResource = "agentcloudtypes";
    export var DeploymentPoolsResource = "deploymentPools";
    export var DeploymentPoolsSummaryResource = "deploymentPoolsSummary";
    export var PoolMaintenanceDefinitionsResource = "maintenancedefinitions";
    export var PoolMaintenanceJobsResource = "maintenancejobs";
    export var QueuesResource = "queues";
    export var DeploymentGroupAccessTokenResource = "deploymentgroupaccesstoken";
    export var DeploymentPoolAccessTokenResource = "deploymentpoolaccesstoken";
    export var DeploymentGroupsMetricsLocationIdString = "281C6308-427A-49E1-B83A-DAC0F4862189";
    export var DeploymentGroupsMetricsResource = "deploymentgroupsmetrics";
    export var DeploymentGroupsResource = "deploymentgroups";
    export var DeploymentMachineGroupsResource = "machinegroups";
    export var DeploymentMachinesLocationIdString = "6F6D406F-CFE6-409C-9327-7009928077E7";
    export var DeploymentMachineGroupMachinesLocationIdString = "966C3874-C347-4B18-A90C-D509116717FD";
    export var DeploymentMachinesResource = "machines";
    export var DeploymentTargetsLocationIdString = "2F0AA599-C121-4256-A5FD-BA370E0AE7B6";
    export var DeploymentTargetsResource = "targets";
    export var DeploymentMachineGroupAccessTokenResource = "machinegroupaccesstoken";
    export var PoolRolesCompatResource = "roles";
    export var QueueRolesResource = "queueroles";
    export var PoolRolesResource = "poolroles";
    export var PoolMetadataResource = "poolmetadata";
    export var JobRequestsDeprecatedResource = "jobrequests";
    export var AgentRequestsResource = "agentrequests";
    export var DeploymentMachineJobRequestsResource = "deploymentmachinejobrequests";
    export var DeploymentTargetJobRequestsResource = "deploymentTargetJobRequests";
    export var DeploymentMachineMessagesResource = "deploymentmachinemessages";
    export var DeploymentTargetMessagesResource = "deploymentTargetMessages";
    export var TasksResource = "tasks";
    export var TaskEndpointResource = "endpoint";
    export var TaskIconsResource = "icon";
    export var LogsResource = "logs";
    export var PlansResource = "plans";
    export var PlanEventsResource = "events";
    export var PlanAttachmentsLocationIdString = "EB55E5D6-2F30-4295-B5ED-38DA50B1FC52";
    export var AttachmentsLocationIdString = "7898F959-9CDF-4096-B29E-7F293031629E";
    export var AttachmentsResource = "attachments";
    export var TimelinesResource = "timelines";
    export var TimelineRecordsResource = "records";
    export var TimelineRecordFeedsResource = "feed";
    export var ServiceEndpoints2LocationIdString = "DCA61D2F-3444-410A-B5EC-DB2FC4EFB4C5";
    export var ServiceEndpointsResource = "serviceendpoints";
    export var ServiceEndpointTypesResource = "serviceendpointtypes";
    export var ServiceEndpointProxy2LocationIdString = "F956A7DE-D766-43AF-81B1-E9E349245634";
    export var ServiceEndpointProxyResource = "serviceendpointproxy";
    export var AzureRmSubscriptionsResource = "azurermsubscriptions";
    export var AzureRmManagementGroupsResource = "azurermmanagementgroups";
    export var TaskGroupsResource = "taskgroups";
    export var TaskGroupHistoryResource = "revisions";
    export var ExtensionEventsResource = "extensionevents";
    export var ExtensionPreInstallResource = "preinstall";
    export var TaskHubLicenseResource = "hublicense";
    export var ResourceLimitsLocationIdString = "1F1F0557-C445-42A6-B4A0-0DF605A3A0F8";
    export var ResourceLimitsResource = "resourcelimits";
    export var ResourceUsageLocationIdString = "EAE1D376-A8B1-4475-9041-1DFDBE8F0143";
    export var ResourceUsageResource = "resourceusage";
    export var VariableGroupsResource = "variablegroups";
    export var SecureFilesResource = "securefiles";
    export var PlanGroupsQueueLocationIdString = "0DD73091-3E36-4F43-B443-1B76DD426D84";
    export var QueuedPlanGroupLocationIdString = "65FD0708-BC1E-447B-A731-0587C5464E5B";
    export var PlanGroupsQueueResource = "plangroupsqueue";
    export var PlanGroupsQueueMetricsLocationIdString = "038FD4D5-CDA7-44CA-92C0-935843FEE1A7";
    export var PlanGroupsQueueMetricsResource = "metrics";
    export var VstsAadOAuthResource = "vstsaadoauth";
    export var InputValidationResource = "inputvalidation";
    export var GetServiceEndpointExecutionHistoryLocationIdString = "3AD71E20-7586-45F9-A6C8-0342E00835AC";
    export var PostServiceEndpointExecutionHistoryLocationIdString = "11A45C69-2CCE-4ADE-A361-C9F5A37239EE";
    export var ServiceEndpointExecutionHistoryResource = "executionhistory";
}

export module TaskRunsOnConstants {
    export var RunsOnAgent = "Agent";
    export var RunsOnMachineGroup = "MachineGroup";
    export var RunsOnDeploymentGroup = "DeploymentGroup";
    export var RunsOnServer = "Server";
}

export module TaskWellKnownItems {
    export var TASKPREVIEW_VISIBILITY_AREA = "Preview";
}

export module VariableGroupType {
    export var Vsts = "Vsts";
    export var AzureKeyVault = "AzureKeyVault";
}

