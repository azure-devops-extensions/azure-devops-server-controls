
//----------------------------------------------------------
// Generated file, DO NOT EDIT.
// To regenerate this file, run "GenerateConstants.cmd" .

// Generated data for the following assemblies:
// Microsoft.TeamFoundation.SourceControl.WebApi
//----------------------------------------------------------


export module CodeReviewDiscussionIdentityConstants {
    export var CodeReviewRefUpdatedByIdentity = "CodeReviewRefUpdatedByIdentity";
    export var CodeReviewVotedByIdentity = "CodeReviewVotedByIdentity";
    export var CodeReviewVotedByInitiatorIdentity = "CodeReviewVotedByInitiatorIdentity";
    export var CodeReviewResetAllVotesInitiatorIdentity = "CodeReviewResetAllVotesInitiatorIdentity";
    export var CodeReviewResetMultipleVotesInitiatorIdentity = "CodeReviewResetMultipleVotesInitiatorIdentity";
    export var CodeReviewResetMultipleVotesExampleVoterIdentities = "CodeReviewResetMultipleVotesExampleVoterIdentities";
    export var CodeReviewStatusUpdatedByIdentity = "CodeReviewStatusUpdatedByIdentity";
    export var CodeReviewReviewersUpdatedByIdentity = "CodeReviewReviewersUpdatedByIdentity";
    export var CodeReviewReviewersUpdatedAddedIdentity = "CodeReviewReviewersUpdatedAddedIdentity";
    export var CodeReviewReviewersUpdatedRemovedIdentity = "CodeReviewReviewersUpdatedRemovedIdentity";
    export var CodeReviewAutoCompleteUpdatedByIdentity = "CodeReviewAutoCompleteUpdatedByIdentity";
    export var CodeReviewIsDraftUpdatedByIdentity = "CodeReviewIsDraftUpdatedByIdentity";
    export var CodeReviewAssociatedStatusUpdatedByIdentity = "CodeReviewAssociatedStatusUpdatedByIdentity";
    export var CodeReviewRequiredReviewerExampleReviewerIdentities = "CodeReviewRequiredReviewerExampleReviewerIdentities";
}

export module GitConstants {
    export var GitSecurityNamespaceId = "2e9eb7ed-3c0a-47d4-87c1-0ffdd275fd87";
    /**
    * The current maximum ref name length supported by the TFS Git Server
    */
    export var MaxGitRefNameLength = 400;
    export var SourceControlCapabilityFlag = 2;
    export var MaxRepositoryNameLength = 256;
    /**
    * Key used when storing the compare branch in the ISettingsService for a user
    */
    export var SettingsServiceCompareBranchKey = "Branches.Compare";
    export var RefsPrefix = "refs/";
    export var RefsHeadsMaster = "refs/heads/master";
    export var RefsHeadsPrefix = "refs/heads/";
    export var RefsNotesPrefix = "refs/notes/";
    export var RefsPullPrefix = "refs/pull/";
    export var RefsRemotesPrefix = "refs/remotes/";
    export var RefsTagsPrefix = "refs/tags/";
    export var RefsBreadcrumbsPrefix = "refs/internal/bc/";
    export var RefsPullForkSourceSuffix = "source";
    export var RefsPullMergeSuffix = "merge";
    export var RefsPullSourceFixupSuffix = "sourceFixup";
    export var RefsPullTargetFixupSuffix = "targetFixup";
    export var RefsPullMergedBlobSuffix = "mergedBlob/";
    export var RefDereferencedSuffix = "^{}";
    export var GitModulesFileName = ".gitmodules";
    export var SecurableRoot = "repoV2/";
}

/**
* Defines the permission bitmasks used in the database for git repositories. If modifying, see NOTE at the bottom.
*/
export enum GitRepositoryPermissions {
    None = 0,
    Administer = 1,
    GenericRead = 2,
    GenericContribute = 4,
    ForcePush = 8,
    CreateBranch = 16,
    CreateTag = 32,
    ManageNote = 64,
    PolicyExempt = 128,
    CreateRepository = 256,
    DeleteRepository = 512,
    RenameRepository = 1024,
    EditPolicies = 2048,
    RemoveOthersLocks = 4096,
    ManagePermissions = 8192,
    PullRequestContribute = 16384,
    PullRequestBypassPolicy = 32768,
    ProjectLevelPermissions = 65534,
    RepositoryLevelPermissions = 65278,
    BranchLevelPermissions = 47244,
    NonBranchRefLevelPermissions = 8200,
    BranchesRootLevelPermissions = 47260,
}

export module GitWebApiConstants {
    export var RefsLocationId = "2d874a60-a811-4f62-9c9f-963a6ea0a55b";
    export var RefsBatchLocationId = "d5e42319-9c64-4acd-a906-f524a578a7fe";
    export var ProjectRefsLocationId = "4c36aadb-af42-45bb-80ca-6df5cd443e0d";
    export var RepositoriesLocationId = "225f7195-f9c7-4d14-ab28-a83f7ff77e1f";
    export var ProjectRepositoriesLocationId = "88aea7e8-9501-45dd-ac58-b069aa73b926";
    export var ProjectDeletedRepositoriesLocationId = "2b6869c4-cb25-42b5-b7a3-0d3e6be0a11a";
    export var ProjectRecycleBinRepositoriesLocationId = "a663da97-81db-4eb3-8b83-287670f63073";
    export var ItemsLocationId = "fb93c0db-47ed-4a31-8c20-47552878fb44";
    export var ProjectItemsLocationId = "433ab753-6ed9-4169-9841-dd3f7611834a";
    export var ItemsBatchLocationId = "630fd2e4-fb88-4f85-ad21-13f3fd1fbca9";
    export var ProjectItemsBatchLocationId = "567ef866-886b-44cc-81e2-6cc075905ce5";
    export var TreesLocationId = "729f6437-6f92-44ec-8bee-273a7111063c";
    export var ProjectTreesLocationId = "11e0a184-7e28-4b77-9523-1d4d6dc29241";
    export var BlobsLocationId = "7b28e929-2c99-405d-9c5c-6167a06e6816";
    export var ProjectBlobsLocationId = "cffac033-c2f1-41a2-acb3-b765e50a8d29";
    export var CommitsLocationId = "c2570c3b-5b3f-41b8-98bf-5407bfde8d58";
    export var ProjectCommitsLocationId = "41a3de30-8d9e-4f79-a7e3-ef8cf1299454";
    export var DeltificationLocationId = "c873bfc6-3138-40ec-a3ed-837e9a7c0ac0";
    export var PushesLocationId = "ea98d07b-3c87-4971-8ede-a613694ffb55";
    export var ProjectPushesLocationId = "9777557b-f5a5-4a6b-94f8-39aff53b5b41";
    export var BranchesStatsLocationId = "d5b216de-d8d5-4d32-ae76-51df755b16d3";
    export var RepositoryStatsLocationId = "616a5255-74b3-40f5-ae1d-bbae2eec8db5";
    export var ProjectBranchesStatsLocationId = "b32dc299-abe2-41e9-bd15-1e6856b95c9c";
    export var BranchStatsLocationId = "40c1f5b7-2bb6-4c28-b844-0f47cd6bb610";
    export var ProjectBranchStatsLocationId = "9b2552e4-9e48-4557-98ec-1982f699615f";
    export var CommitChangesLocationId = "5bf884f5-3e07-42e9-afb8-1b872267bf16";
    export var CommitStatuesLocationId = "428dd4fb-fda5-4722-af02-9313b80305da";
    export var ProjectCommitChangesLocationId = "074db773-d674-4de9-a0dd-fcb6adddecf9";
    export var PushCommitsLocationId = "168b4bb9-d936-4cd9-8a5f-66d6f6b23192";
    export var ProjectPushCommitsLocationId = "cc7a4cb0-7377-494a-80d4-ef4d607f6eb2";
    export var CommitDiffsLocationId = "615588d5-c0c7-4b88-88f8-e625306446e8";
    export var ProjectCommitDiffsLocationId = "29ba9926-be39-4db5-bbdf-d6c9458195c6";
    export var CommitsBatchLocationId = "6400dfb2-0bcb-462b-b992-5a57f8f1416c";
    export var ForksLocationId = "158c0340-bf6f-489c-9625-d572a1480d57";
    export var ForkSyncRequestsLocationId = "1703f858-b9d1-46af-ab62-483e9e1055b5";
    export var MergeBasesLocationId = "7cf2abb6-c964-4f7e-9872-f78c66e72e9c";
    export var ProjectCommitsBatchLocationId = "fed1587d-f1c8-475d-925c-b97f2c9dde50";
    export var PullRequestsLocationId = "9946fd70-0d40-406e-b686-b4744cbbcc37";
    export var ProjectRepoPullRequestsLocationId = "5318bf6c-115f-4828-ba3e-73eca825c276";
    export var PullRequestByIdLocationId = "01a46dea-7d46-4d40-bc84-319e7c260d99";
    export var ProjectPullRequestsLocationId = "a5d28130-9cd2-40fa-9f08-902e7daa9efb";
    export var PullRequestReviewersLocationId = "4b6702c7-aa35-4b89-9c96-b9abf6d3e540";
    export var SuggestionsLocationId = "9393b4fb-4445-4919-972b-9ad16f442d83";
    export var PullRequestConflictsLocationId = "d840fb74-bbef-42d3-b250-564604c054a4";
    export var PullRequestCommitsLocationId = "52823034-34a8-4576-922c-8d8b77e9e4c4";
    export var ProjectPullRequestReviewersLocationId = "1d5702f2-90e2-4fe0-8794-4fcd822adb9b";
    export var PullRequestWorkItemsLocationId = "0a637fcc-5370-4ce8-b0e8-98091f5f9482";
    export var ProjectPullRequestWorkItemsLocationId = "a92ec66c-5851-41a4-a96b-4a0860958844";
    export var ProjectMediaLocationId = "c96a81cd-52f6-41d9-843c-58c584967ba5";
    export var LimitedRefCriteriaLocationId = "f1d5d07a-6b89-4384-bef6-446461e31a39";
    export var PullRequestQueryLocationId = "b3a6eebe-9cf0-49ea-b6cb-1a4c5f5007b0";
    export var PullRequestIterationsLocationId = "d43911ee-6958-46b0-a42b-8445b8a0d004";
    export var PullRequestIterationChangesLocationId = "4216bdcf-b6b1-4d59-8b82-c34cc183fc8b";
    export var PullRequestStatusesLocationId = "b5f6bb4f-8d1e-4d79-8d11-4c9172c99c35";
    export var PullRequestIterationStatusesLocationId = "75cf11c5-979f-4038-a76e-058a06adf2bf";
    export var PullRequestPropertiesLocationId = "48a52185-5b9e-4736-9dc1-bb1e2feac80b";
    export var PullRequestThreadsLocationId = "ab6e2e5d-a0b7-4153-b64a-a4efe0d49449";
    export var PullRequestThreadCommentsLocationId = "965a3ec7-5ed8-455a-bdcb-835a5ea7fe7b";
    export var PullRequestCommentLikesLocationId = "5f2e2851-1389-425b-a00b-fb2adb3ef31b";
    export var PullRequestAttachmentsLocationId = "965d9361-878b-413b-a494-45d5b5fd8ab7";
    export var PolicyConfigurationsLocationId = "2c420070-a0a2-49cc-9639-c9f271c5ff07";
    export var PullRequestShareLocationId = "696f3a82-47c9-487f-9117-b9d00972ca84";
    export var RefFavoritesLocationId = "876f70af-5792-485a-a1c7-d0a7b2f42bbb";
    export var CherryPickLocationId = "033bad68-9a14-43d1-90e0-59cb8856fef6";
    export var RevertLocationId = "bc866058-5449-4715-9cf1-a510b6ff193c";
    export var PullRequestIterationCommitsLocationId = "e7ea0883-095f-4926-b5fb-f24691c26fb9";
    export var ImportRequestsLocationId = "01828ddc-3600-4a41-8633-99b3a73a0eb3";
    export var FilePathsLocationId = "e74b530c-edfa-402b-88e2-8d04671134f7";
    export var TemplatesLocationId = "f88d498e-52c3-422a-a5f2-994f4265a25b";
    export var TreeDiffsLocationId = "e264ef02-4e92-4cfc-a4b1-5e71894d7b31";
    export var ImportRepositoryValidationsLocationId = "d8c00958-dedd-491f-93e6-73f3c06f5bba";
    export var AnnotatedTagsLocationId = "5e8a8081-3851-4626-b677-9891cc04102e";
    export var PullRequestLabelsId = "f22387e3-984e-4c52-9c6d-fbb8f14c812d";
    export var CherryPickRelationshipsId = "8af142a4-27c2-4168-9e82-46b8629aaa0d";
    export var FileDiffsLocationId = "c4c5a7e6-e9f3-4730-a92b-84baacff694b";
    export var HeadsFilter = "heads";
    export var TagsFilter = "tags";
    export var AreaId = "4E080C62-FA21-4FBC-8FEF-2A10A2B38049";
    export var AreaName = "git";
    export var RefsLocationIdString = "2D874A60-A811-4F62-9C9F-963A6EA0A55B";
    export var RefsBatchLocationIdString = "D5E42319-9C64-4ACD-A906-F524A578A7FE";
    export var ProjectRefsLocationIdString = "4C36AADB-AF42-45BB-80CA-6DF5CD443E0D";
    export var RepositoriesLocationIdString = "225F7195-F9C7-4D14-AB28-A83F7FF77E1F";
    export var ProjectRepositoriesLocationIdString = "88AEA7E8-9501-45DD-AC58-B069AA73B926";
    export var ProjectDeletedRepositoriesLocationIdString = "2B6869C4-CB25-42B5-B7A3-0D3E6BE0A11A";
    export var ProjectRecycleBinRepositoriesLocationIdString = "A663DA97-81DB-4EB3-8B83-287670F63073";
    export var ItemsLocationIdString = "FB93C0DB-47ED-4A31-8C20-47552878FB44";
    export var ProjectItemsLocationIdString = "433AB753-6ED9-4169-9841-DD3F7611834A";
    export var ItemsBatchLocationIdString = "630FD2E4-FB88-4F85-AD21-13F3FD1FBCA9";
    export var ProjectItemsBatchLocationIdString = "567EF866-886B-44CC-81E2-6CC075905CE5";
    export var TreesLocationIdString = "729F6437-6F92-44EC-8BEE-273A7111063C";
    export var ProjectTreesLocationIdString = "11E0A184-7E28-4B77-9523-1D4D6DC29241";
    export var BlobsLocationIdString = "7B28E929-2C99-405D-9C5C-6167A06E6816";
    export var ProjectBlobsLocationIdString = "CFFAC033-C2F1-41A2-ACB3-B765E50A8D29";
    export var CommitsLocationIdString = "C2570C3B-5B3F-41B8-98BF-5407BFDE8D58";
    export var ProjectCommitsLocationIdString = "41A3DE30-8D9E-4F79-A7E3-EF8CF1299454";
    export var DeltificationLocationIdString = "C873BFC6-3138-40EC-A3ED-837E9A7C0AC0";
    export var PushesLocationIdString = "EA98D07B-3C87-4971-8EDE-A613694FFB55";
    export var ProjectPushesLocationIdString = "9777557B-F5A5-4A6B-94F8-39AFF53B5B41";
    export var BranchesStatsLocationIdString = "D5B216DE-D8D5-4D32-AE76-51DF755B16D3";
    export var RepositoryStatsLocationIdString = "616A5255-74B3-40F5-AE1D-BBAE2EEC8DB5";
    export var ProjectBranchesStatsLocationIdString = "B32DC299-ABE2-41E9-BD15-1E6856B95C9C";
    export var BranchStatsLocationIdString = "40C1F5B7-2BB6-4C28-B844-0F47CD6BB610";
    export var ProjectBranchStatsLocationIdString = "9B2552E4-9E48-4557-98EC-1982F699615F";
    export var CommitChangesLocationIdString = "5BF884F5-3E07-42E9-AFB8-1B872267BF16";
    export var CommitStatusesLocationIdString = "428DD4FB-FDA5-4722-AF02-9313B80305DA";
    export var ProjectCommitChangesLocationIdString = "074DB773-D674-4DE9-A0DD-FCB6ADDDECF9";
    export var PushCommitsLocationIdString = "168B4BB9-D936-4CD9-8A5F-66D6F6B23192";
    export var ProjectPushCommitsLocationIdString = "CC7A4CB0-7377-494A-80D4-EF4D607F6EB2";
    export var CommitDiffsLocationIdString = "615588D5-C0C7-4B88-88F8-E625306446E8";
    export var ProjectCommitDiffsLocationIdString = "29BA9926-BE39-4DB5-BBDF-D6C9458195C6";
    export var CommitsBatchLocationIdString = "6400DFB2-0BCB-462B-B992-5A57F8F1416C";
    export var ForksLocationIdString = "158C0340-BF6F-489C-9625-D572A1480D57";
    export var ForkSyncRequestsLocationIdString = "1703F858-B9D1-46AF-AB62-483E9E1055B5";
    export var MergeBaseLocationIdString = "7CF2ABB6-C964-4F7E-9872-F78C66E72E9C";
    export var ProjectCommitsBatchLocationIdString = "FED1587D-F1C8-475D-925C-B97F2C9DDE50";
    export var PullRequestsLocationIdString = "9946FD70-0D40-406E-B686-B4744CBBCC37";
    export var ProjectRepoPullRequestsLocationIdString = "5318BF6C-115F-4828-BA3E-73ECA825C276";
    export var PullRequestByIdLocationIdString = "01A46DEA-7D46-4D40-BC84-319E7C260D99";
    export var ProjectPullRequestsLocationIdString = "A5D28130-9CD2-40FA-9F08-902E7DAA9EFB";
    export var PullRequestReviewersLocationIdString = "4B6702C7-AA35-4B89-9C96-B9ABF6D3E540";
    export var SuggestionsLocationIdString = "9393B4FB-4445-4919-972B-9AD16F442D83";
    export var PullRequestConflictsLocationIdString = "D840FB74-BBEF-42D3-B250-564604C054A4";
    export var PullRequestCommitsLocationIdString = "52823034-34a8-4576-922c-8d8b77e9e4c4";
    export var ProjectPullRequestReviewersLocationIdString = "1D5702F2-90E2-4FE0-8794-4FCD822ADB9B";
    export var PullRequestWorkItemsLocationIdString = "0A637FCC-5370-4CE8-B0E8-98091F5F9482";
    export var ProjectPullRequestWorkItemsLocationIdString = "A92EC66C-5851-41A4-A96B-4A0860958844";
    export var ProjectMediaLocationIdString = "C96A81CD-52F6-41D9-843C-58C584967BA5";
    export var LimitedRefCriteriaLocationIdString = "F1D5D07A-6B89-4384-BEF6-446461E31A39";
    export var PullRequestQueryLocationIdString = "B3A6EEBE-9CF0-49EA-B6CB-1A4C5F5007B0";
    export var PullRequestIterationsLocationIdString = "D43911EE-6958-46B0-A42B-8445B8A0D004";
    export var PullRequestIterationChangesLocationIdString = "4216BDCF-B6B1-4D59-8B82-C34CC183FC8B";
    export var PullRequestStatusesLocationIdString = "B5F6BB4F-8D1E-4D79-8D11-4C9172C99C35";
    export var PullRequestIterationStatusesLocationIdString = "75CF11C5-979F-4038-A76E-058A06ADF2BF";
    export var PullRequestPropertiesLocationIdString = "48A52185-5B9E-4736-9DC1-BB1E2FEAC80B";
    export var PullRequestThreadsLocationIdString = "AB6E2E5D-A0B7-4153-B64A-A4EFE0D49449";
    export var PullRequestThreadCommentsLocationIdString = "965A3EC7-5ED8-455A-BDCB-835A5EA7FE7B";
    export var PullRequestCommentLikesLocationIdString = "5F2E2851-1389-425B-A00B-FB2ADB3EF31B";
    export var PullRequestAttachmentsLocationIdString = "965D9361-878B-413B-A494-45D5B5FD8AB7";
    export var PolicyConfigurationsLocationIdString = "2C420070-A0A2-49CC-9639-C9F271C5FF07";
    export var PolicyConfigurationsResourceName = "policyConfigurations";
    export var PullRequestShareLocationIdString = "696F3A82-47C9-487F-9117-B9D00972CA84";
    export var RefFavoritesLocationIdString = "876F70AF-5792-485A-A1C7-D0A7B2F42BBB";
    export var CherryPickLocationIdString = "033BAD68-9A14-43D1-90E0-59CB8856FEF6";
    export var RevertLocationIdString = "BC866058-5449-4715-9CF1-A510B6FF193C";
    export var PullRequestIterationCommitsLocationIdString = "E7EA0883-095F-4926-B5FB-F24691C26FB9";
    export var ImportRequestsLocationIdString = "01828DDC-3600-4A41-8633-99B3A73A0EB3";
    export var FilePathsLocationIdString = "E74B530C-EDFA-402B-88E2-8D04671134F7";
    export var TemplatesLocationIdString = "F88D498E-52C3-422A-A5F2-994F4265A25B";
    export var TreeDiffsLocationIdString = "E264EF02-4E92-4CFC-A4B1-5E71894D7B31";
    export var ImportRepositoryValidationsLocationIdString = "D8C00958-DEDD-491F-93E6-73F3C06F5BBA";
    export var AnnotatedTagsLocationIdString = "5E8A8081-3851-4626-B677-9891CC04102E";
    export var PullRequestLabelsIdString = "F22387E3-984E-4C52-9C6D-FBB8F14C812D";
    export var CherryPickRelationshipsIdString = "8AF142A4-27C2-4168-9E82-46B8629AAA0D";
    export var FileDiffsLocationIdString = "C4C5A7E6-E9F3-4730-A92B-84BAACFF694B";
}

export module TfvcConstants {
    export var TfvcChangesetsLocationId = "0bc8f0a4-6bfb-42a9-ba84-139da7b99c49";
    export var TfvcChangesetChangesLocationId = "f32b86f2-15b9-4fe6-81b1-6f8938617ee5";
    export var TfvcChangesetWorkItemsLocationId = "64ae0bea-1d71-47c9-a9e5-fe73f5ea0ff4";
    export var TfvcChangesetBatchLocationId = "b7e7c173-803c-4fea-9ec8-31ee35c5502a";
    export var VersionControlProjectInfoLocationId = "0755ef73-0a92-4221-a902-6aae57503c2c";
    export var VersionControlProjectInfosLocationId = "252d9c40-0643-41cf-85b2-044d80f9b675";
    export var TfvcItemsLocationId = "ba9fc436-9a38-4578-89d6-e4f3241f5040";
    export var TfvcItemBatchLocationId = "fe6f827b-5f64-480f-b8af-1eca3b80e833";
    export var TfvcShelvesetsLocationId = "e36d44fb-e907-4b0a-b194-f83f1ed32ad3";
    export var TfvcShelvesetLocationId = "6aad49e3-4ded-45da-aabd-2f19d35266c7";
    export var TfvcShelvesetChangesLocationId = "31db9770-7614-4718-b0a5-75d2a1e625ff";
    export var TfvcQueryParamShelvesetChangesLocationId = "dbaf075b-0445-4c34-9e5b-82292f856522";
    export var TfvcShelvesetWorkItemsLocationId = "9a1a13e2-a285-4bc9-aa26-b0906cd3c851";
    export var TfvcQueryParamShelvesetWorkItemsLocationId = "a7a0c1c1-373e-425a-b031-a519474d743d";
    export var TfvcLabelsLocationId = "a5d9bd7f-b661-4d0e-b9be-d9c16affae54";
    export var TfvcLabelItemsLocationId = "06166e34-de17-4b60-8cd1-23182a346fda";
    export var TfvcBranchesLocationId = "bc1f417e-239d-42e7-85e1-76e80cb2d6eb";
    export var TfvcStatisticsLocationId = "e15c74c0-3605-40e0-aed4-4cc61e549ed8";
    export var AreaId = "8AA40520-446D-40E6-89F6-9C9F9CE44C48";
    export var AreaName = "tfvc";
    export var RootFolder = "$/";
    export var Separator = "/";
    export var TfvcChangesetsLocationIdString = "0BC8F0A4-6BFB-42A9-BA84-139DA7B99C49";
    export var TfvcChangesetChangesLocationIdString = "F32B86F2-15B9-4FE6-81B1-6F8938617EE5";
    export var TfvcChangesetWorkItemsLocationIdString = "64AE0BEA-1D71-47C9-A9E5-FE73F5EA0FF4";
    export var TfvcChangesetBatchLocationIdString = "B7E7C173-803C-4FEA-9EC8-31EE35C5502A";
    export var VersionControlProjectInfoLocationIdString = "0755EF73-0A92-4221-A902-6AAE57503C2C";
    export var VersionControlProjectInfosLocationIdString = "252D9C40-0643-41CF-85B2-044D80F9B675";
    export var TfvcItemsLocationIdString = "BA9FC436-9A38-4578-89D6-E4F3241F5040";
    export var TfvcItemBatchLocationIdString = "FE6F827B-5F64-480F-B8AF-1ECA3B80E833";
    export var TfvcShelvesetsLocationIdString = "E36D44FB-E907-4B0A-B194-F83F1ED32AD3";
    export var TfvcShelvesetLocationIdString = "6aad49e3-4ded-45da-aabd-2f19d35266c7";
    export var TfvcShelvesetChangesLocationIdString = "31DB9770-7614-4718-B0A5-75D2A1E625FF";
    export var TfvcQueryParamShelvesetChangesLocationIdString = "DBAF075B-0445-4C34-9E5B-82292F856522";
    export var TfvcShelvesetWorkItemsLocationIdString = "9A1A13E2-A285-4BC9-AA26-B0906CD3C851";
    export var TfvcQueryParamShelvesetWorkItemsLocationIdString = "A7A0C1C1-373E-425A-B031-A519474D743D";
    export var TfvcLabelsLocationIdString = "A5D9BD7F-B661-4D0E-B9BE-D9C16AFFAE54";
    export var TfvcLabelItemsLocationIdString = "06166E34-DE17-4B60-8CD1-23182A346FDA";
    export var TfvcBranchesLocationIdString = "BC1F417E-239D-42E7-85E1-76E80CB2D6EB";
    export var TfvcStatisticsLocationIdString = "E15C74C0-3605-40E0-AED4-4CC61E549ED8";
}

