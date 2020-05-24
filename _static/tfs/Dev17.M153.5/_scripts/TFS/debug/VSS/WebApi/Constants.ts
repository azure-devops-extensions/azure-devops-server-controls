
//----------------------------------------------------------
// Generated file, DO NOT EDIT.
// To regenerate this file, run "GenerateConstants.cmd" .

// Generated data for the following assemblies:
// Microsoft.VisualStudio.Services.WebApi
// Microsoft.VisualStudio.Services.ExtensionManagement.WebApi
//----------------------------------------------------------


export module AccessMappingConstants {
    export var PublicAccessMappingMoniker = "PublicAccessMapping";
    export var ServerAccessMappingMoniker = "ServerAccessMapping";
    export var ClientAccessMappingMoniker = "ClientAccessMapping";
    export var HostGuidAccessMappingMoniker = "HostGuidAccessMapping";
    export var RootDomainMappingMoniker = "RootDomainMapping";
    export var AzureInstanceMappingMoniker = "AzureInstanceMapping";
    export var ServicePathMappingMoniker = "ServicePathMapping";
    export var ServiceDomainMappingMoniker = "ServiceDomainMapping";
    export var LegacyPublicAccessMappingMoniker = "LegacyPublicAccessMapping";
    export var MessageQueueAccessMappingMoniker = "MessageQueueAccessMapping";
    export var LegacyAppDotAccessMappingMoniker = "LegacyAppDotDomain";
    export var AffinitizedMultiInstanceAccessMappingMoniker = "AffinitizedMultiInstanceAccessMapping";
    export var VstsAccessMapping = "VstsAccessMapping";
    export var CodexAccessMapping = "CodexAccessMapping";
    export var ServiceAccessMappingMoniker = "ServiceAccessMappingMoniker";
}

export module AuthenticationResourceIds {
    export var AuthenticationLocationId = "11420b6b-3324-490a-848d-b8aafdb906ba";
    export var AreaId = "A084B81B-0F23-4136-BAEA-98E07F3C7446";
    export var AuthenticationAreaName = "WebPlatformAuth";
    export var SessionTokenResource = "SessionToken";
}

export module BlobCopyLocationIds {
    export var ResourceId = "8907fe1c-346a-455b-9ab9-dde883687231";
    export var ResourceString = "{8907fe1c-346a-455b-9ab9-dde883687231}";
    export var ResouceName = "BlobCopyRequest";
    export var AreaName = "BlobCopyRequest";
}

export module ClientTraceResourceIds {
    export var EventsLocationId = "06bcc74a-1491-4eb8-a0eb-704778f9d041";
    export var AreaId = "054EEB0E-108E-47DC-848A-7074B14774A9";
    export var ClientTraceAreaName = "ClientTrace";
    export var ClientTraceEventsResource = "Events";
}

export module CommonIdentityPickerResourceIds {
    export var IdentitiesLocationId = "4102f006-0b23-4b26-bb1b-b661605e6b33";
    export var IdentityAvatarLocationId = "4d9b6936-e96a-4a42-8c3b-81e8337cd010";
    export var IdentityFeatureMruLocationId = "839e4258-f559-421b-a38e-b6e691967ab3";
    export var IdentityConnectionsLocationId = "c01af8fd-2a61-4811-a7a3-b85bcec080af";
    export var ServiceArea = "IdentityPicker";
    export var IdentitiesResource = "Identities";
}

export module ContributionsResourceIds {
    export var DataProvidersQueryLocationId = "738368db-35ee-4b85-9f94-77ed34af2b0d";
    export var InstalledAppsLocationId = "2648442b-fd63-4b9a-902f-0c913510f139";
    export var InstalledAppsByNameLocationId = "3e2f6668-0798-4dcb-b592-bfe2fa57fde2";
    export var VDiscId = "0edf7a35-282d-44f1-a0cf-d7ec1c1afeff";
    export var VersionDiscoveryLocationId = "c2088efa-e2c2-4025-8062-4dd27b6ac83e";
    export var VDiscCompatLocationId = "5c026a00-bd90-4fde-862a-268345cc58b0";
    export var ContributionQueryLocationId = "db7f2146-2309-4cee-b39c-c767777a1c55";
    export var LocalExtensionAssetsLocationId = "01c3d915-4b98-4948-8e16-c8cc68b17afe";
    export var AreaId = "8477AEC9-A4C7-4BD4-A456-BA4C53C989CB";
    export var ContributionsAreaName = "Contribution";
    export var ExtensionsAreaName = "Extensions";
    export var AssetsResource = "Assets";
    export var DataProvidersQueryLocationIdString = "738368DB-35EE-4B85-9F94-77ED34AF2B0D";
    export var InstalledExtensionsLocationIdString = "2648442B-FD63-4B9A-902F-0C913510F139";
    export var InstalledExtensionsByNameLocationIdString = "3E2F6668-0798-4DCB-B592-BFE2FA57FDE2";
    export var VersionDiscoveryLocationIdString = "C2088EFA-E2C2-4025-8062-4DD27B6AC83E";
    export var VDiscCompatLocationIdString = "5C026A00-BD90-4FDE-862A-268345CC58B0";
    export var ContributionQueryLocationIdString = "DB7F2146-2309-4CEE-B39C-C767777A1C55";
    export var LocalExtensionAssetsLocationIdString = "01C3D915-4B98-4948-8E16-C8CC68B17AFE";
}

export module CustomerIntelligenceResourceIds {
    export var EventsLocationId = "b5cc35c2-ff2b-491d-a085-24b6e9f396fd";
    export var AreaId = "40132BEE-F5F3-4F39-847F-80CC44AD9ADD";
    export var CustomerIntelligenceAreaName = "CustomerIntelligence";
}

export module DatabaseMigrationLocationIds {
    export var ResourceId = "d56223df-8ccd-45c9-89b4-eddf69240000";
    export var ResourceString = "{D56223DF-8CCD-45C9-89B4-EDDF69240000}";
    export var ResouceName = "DatabaseMigration";
    export var AreaName = "DatabaseMigration";
}

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

/**
* Mustache items names available in replacement oject while resolving a mustache template
*/
export module ExtensionTemplateContextItemNames {
    export var ServiceInstanceType = "$ServiceInstanceType";
}

export module FeatureAvailabilityResourceIds {
    export var FeatureFlagsLocationId = "3e2b80f8-9e6f-441e-8393-005610692d9c";
    export var AreaId = "C8E5AF97-4B95-4E73-9E7F-69A06507967C";
    export var FeatureAvailabilityAreaName = "FeatureAvailability";
}

export module FeatureManagementResourceIds {
    export var FeaturesLocationId = "c4209f25-7a27-41dd-9f04-06080c7b6afd";
    export var FeatureStatesLocationId = "98911314-3f9b-4eaf-80e8-83900d8e85d9";
    export var NamedScopeFeatureStatesLocationId = "dd291e43-aa9f-4cee-8465-a93c78e414a4";
    export var FeatureStatesQueryLocationId = "2b4486ad-122b-400c-ae65-17b6672c1f9d";
    export var FeatureStatesQueryForScopeLocationId = "f29e997b-c2da-4d15-8380-765788a1a74c";
    export var FeatureStatesQueryForDefaultScopeLocationId = "3f810f28-03e2-4239-b0bc-788add3005e5";
    export var FeatureManagementAreaName = "FeatureManagement";
    export var FeaturesResource = "Features";
    export var FeatureStatesResource = "FeatureStates";
    export var FeatureStatesLocationIdString = "98911314-3F9B-4EAF-80E8-83900D8E85D9";
    export var NamedScopeFeatureStatesLocationIdString = "DD291E43-AA9F-4CEE-8465-A93C78E414A4";
    export var FeatureStatesQueryResource = "FeatureStatesQuery";
    export var FeatureStatesQueryLocationIdString = "2B4486AD-122B-400C-AE65-17B6672C1F9D";
    export var FeatureStatesQueryForScopeLocationIdString = "F29E997B-C2DA-4D15-8380-765788A1A74C";
    export var FeatureStatesQueryForDefaultScopeLocationIdString = "3F810F28-03E2-4239-B0BC-788ADD3005E5";
}

export module GraphProfileResourceIds {
    export var AreaIdGuid = "4e40f190-2e3f-4d9f-8331-c7788e833080";
    export var AreaId = "4E40F190-2E3F-4D9F-8331-C7788E833080";
    export var AreaName = "GraphProfile";
}

export module IdentityMruResourceIds {
    export var MruIdentitiesLocationId = "15d952a1-bb4e-436c-88ca-cfe1e9ff3331";
    export var AreaId = "FC3682BE-3D6C-427A-87C8-E527B16A1D05";
    export var AreaName = "Identity";
    export var MruIdentitiesResource = "MruIdentities";
}

export module LocationResourceIds {
    export var ConnectionData = "00d9565f-ed9c-4a06-9a50-00e7896ccab4";
    export var ServiceDefinitions = "d810a47d-f4f4-4a62-a03f-fa1860585c4c";
    export var AccessMappings = "a52f2f69-b171-4e88-9dfe-34b44cf7e386";
    export var ResourceAreas = "e81700f7-3be2-46de-8624-2eb35882fcaa";
    export var SpsServiceDefinition = "df5f298a-4e06-4815-a13e-6ce90a37efa4";
    export var LocationServiceArea = "Location";
    export var ConnectionDataResource = "ConnectionData";
    export var ServiceDefinitionsResource = "ServiceDefinitions";
    export var AccessMappingsResource = "AccessMappings";
    export var ResourceAreasResource = "ResourceAreas";
    export var SpsServiceDefintionResource = "SpsServiceDefinition";
}

export module NameResolutionResourceIds {
    export var EntriesLocationId = "cae3d437-cd60-485a-b8b0-ce6acf234e44";
    export var AreaId = "{81AEC033-EAE2-42B8-82F6-90B93A662EF5}";
    export var AreaName = "NameResolution";
    export var EntriesResource = "Entries";
}

export module OperationsResourceIds {
    export var OperationsLocationId = "9a1b74b4-2ca8-4a9f-8470-c2f2e6fdc949";
    export var OperationsPluginLocationId = "7f82df6d-7d09-46c1-a015-643b556b3a1e";
    export var AreaName = "operations";
    export var OperationsResource = "operations";
    export var OperationsRouteName = "Operations";
    export var OperationsPluginRouteName = "OperationsPlugin";
    export var OperationsApi = "OperationsApi";
    export var TagOperationsLocationId = "9A1B74B4-2CA8-4A9F-8470-C2F2E6FDC949";
    export var TagOperationsPluginLocationId = "7F82DF6D-7D09-46C1-A015-643B556B3A1E";
}

export module OriginName {
    export var AzureActiveDirectory = "aad";
    export var MicrosoftAccount = "msa";
    export var VisualStudioTeamServices = "vsts";
}

export module PartitioningResourceIds {
    export var PartitionContainers = "55fdd96f-cbfe-461a-b0ac-890454ff434a";
    export var Partitions = "4ece3a4b-1d02-4313-8843-dd7b02c8f639";
    export var AreaName = "Partitioning";
    export var AreaId = "{0129E64E-3F98-43F8-9073-212C19D832CB}";
    export var PartitionContainersResource = "Containers";
    export var PartitionsResource = "Partitions";
}

export module ServiceInstanceTypes {
    export var MPS = "00000000-0000-8888-8000-000000000000";
    export var SPS = "951917ac-a960-4999-8464-e3f0aa25b381";
    export var TFS = "00025394-6065-48ca-87d9-7f5672854ef7";
    export var TFSOnPremises = "87966eaa-cb2a-443f-be3c-47bd3b5bf3cb";
    export var SpsExtension = "00000024-0000-8888-8000-000000000000";
    export var SDKSample = "ffffffff-0000-8888-8000-000000000000";
    export var MPSString = "00000000-0000-8888-8000-000000000000";
    export var SPSString = "951917AC-A960-4999-8464-E3F0AA25B381";
    export var TFSString = "00025394-6065-48CA-87D9-7F5672854EF7";
    export var TFSOnPremisesString = "87966EAA-CB2A-443F-BE3C-47BD3B5BF3CB";
    export var SpsExtensionString = "00000024-0000-8888-8000-000000000000";
    export var SDKSampleString = "FFFFFFFF-0000-8888-8000-000000000000";
}

export module SettingsApiResourceIds {
    export var SettingEntriesLocationId = "cd006711-163d-4cd4-a597-b05bad2556ff";
    export var NamedScopeSettingEntriesLocationId = "4cbaafaf-e8af-4570-98d1-79ee99c56327";
    export var SettingsAreaName = "Settings";
    export var SettingEntriesResource = "Entries";
    export var SettingEntriesLocationIdString = "CD006711-163D-4CD4-A597-B05BAD2556FF";
    export var NamedScopeSettingEntriesLocationIdString = "4CBAAFAF-E8AF-4570-98D1-79EE99C56327";
}

export module SubjectKind {
    export var Group = "group";
    export var User = "user";
}

export module SubjectType {
    export var AadGroup = "aadgp";
}

export module UserMetaType {
    export var Guest = "guest";
}

