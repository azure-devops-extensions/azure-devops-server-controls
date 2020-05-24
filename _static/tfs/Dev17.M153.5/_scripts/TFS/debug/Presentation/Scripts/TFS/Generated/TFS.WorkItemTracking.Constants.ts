
//----------------------------------------------------------
// Generated file, DO NOT EDIT.
// To regenerate this file, run "GenerateConstants.cmd" .

// Generated data for the following assemblies:
// Microsoft.TeamFoundation.WorkItemTracking.Common
// Microsoft.TeamFoundation.WorkItemTracking.Server
// Microsoft.TeamFoundation.Server.WebAccess.WorkItemTracking
// Microsoft.TeamFoundation.Server.WebAccess.WorkItemTracking.PlugIns
// Microsoft.TeamFoundation.WorkItemTracking.Client
// Microsoft.TeamFoundation.Server.WebAccess.WorkItemTracking.Common
//----------------------------------------------------------


export enum CacheStatus {
    UpToDate = 0,
    NewData = 1,
    StaleData = 2,
}

export enum CoreField {
    Id = -3,
    Rev = 8,
    Title = 1,
    Description = 52,
    WorkItemType = 25,
    TeamProject = -42,
    State = 2,
    Reason = 22,
    CreatedBy = 33,
    AssignedTo = 24,
    ChangedBy = 9,
    ChangedDate = -4,
    CreatedDate = 32,
    RevisedDate = -5,
    AuthorizedDate = 3,
    AuthorizedAs = -1,
    History = 54,
    AreaPath = -7,
    AreaId = -2,
    IterationPath = -105,
    IterationId = -104,
    NodeName = -12,
    RelatedLinkCount = 75,
    HyperLinkCount = -32,
    AttachedFileCount = -31,
    ExternalLinkCount = -57,
    CommentCount = -33,
    LinkType = 100,
    Tags = 80,
    Watermark = 7,
    BoardColumn = 90,
    BoardColumnDone = 91,
    BoardLane = 92,
    IsDeleted = -404,
}

export module CoreFieldRefNames {
    export var AreaId = "System.AreaId";
    export var AreaPath = "System.AreaPath";
    export var AssignedTo = "System.AssignedTo";
    export var AttachedFileCount = "System.AttachedFileCount";
    export var AuthorizedAs = "System.AuthorizedAs";
    export var BoardColumn = "System.BoardColumn";
    export var BoardColumnDone = "System.BoardColumnDone";
    export var BoardLane = "System.BoardLane";
    export var ChangedBy = "System.ChangedBy";
    export var ChangedDate = "System.ChangedDate";
    export var CreatedBy = "System.CreatedBy";
    export var CreatedDate = "System.CreatedDate";
    export var Description = "System.Description";
    export var CommentCount = "System.CommentCount";
    export var ExternalLinkCount = "System.ExternalLinkCount";
    export var History = "System.History";
    export var HyperLinkCount = "System.HyperLinkCount";
    export var RemoteLinkCount = "System.RemoteLinkCount";
    export var Id = "System.Id";
    export var IterationId = "System.IterationId";
    export var IterationPath = "System.IterationPath";
    export var LinkType = "System.Links.LinkType";
    export var NodeName = "System.NodeName";
    export var Reason = "System.Reason";
    export var RelatedLinkCount = "System.RelatedLinkCount";
    export var Rev = "System.Rev";
    export var RevisedDate = "System.RevisedDate";
    export var State = "System.State";
    export var AuthorizedDate = "System.AuthorizedDate";
    export var TeamProject = "System.TeamProject";
    export var Tags = "System.Tags";
    export var Title = "System.Title";
    export var WorkItemType = "System.WorkItemType";
    export var Watermark = "System.Watermark";
    export var IsDeleted = "System.IsDeleted";
}

/**
* CoreLinkTypeReferenceNames
*/
export module CoreLinkTypeReferenceNames {
    export var Related = "System.LinkTypes.Related";
    export var Hierarchy = "System.LinkTypes.Hierarchy";
    export var Dependency = "System.LinkTypes.Dependency";
    export var Duplicate = "System.LinkTypes.Duplicate";
}

export module DalFields {
    export var IDId = -3;
    export var RevId = 8;
    export var TitleId = 1;
    export var DescriptionId = 52;
    export var WorkItemTypeId = 25;
    export var PortfolioProjectId = -42;
    export var WorkItemFormIDId = -14;
    export var WorkItemFormId = -15;
    export var StateId = 2;
    export var ReasonId = 22;
    export var CreatedById = 33;
    export var WatermarkId = 7;
    export var AssignedToId = 24;
    export var LastChangedById = 9;
    export var LastChangedDateId = -4;
    export var AuthorizedDateId = 3;
    export var CreatedDateId = 32;
    export var RevisedDateId = -5;
    export var PersonNameId = -1;
    export var AuthorizedAsId = -1;
    export var HistoryId = 54;
    export var AreaPathId = -7;
    export var AreaIDId = -2;
    export var IterationPathId = -105;
    export var IterationIDId = -104;
    export var NodeNameId = -12;
    export var RelatedLinkCountId = 75;
    export var RemoteLinkCountId = -34;
    export var LinkedFileCountId = -32;
    export var AttachedFileCountId = -31;
    export var CommentCountId = -33;
    export var BISURICountId = -57;
    export var Tags = 80;
    export var BoardColumnId = 90;
    export var BoardColumnDoneId = 91;
    export var BoardLaneId = 92;
    export var RelatedLinks = 37;
    export var PersonID = -6;
    export var LinkedFiles = 51;
    export var BISURI = 58;
    export var AttachedFiles = 50;
    export var HiddenAttachedFiles = 49;
    export var AreaLevel1 = -43;
    export var AreaLevel2 = -44;
    export var AreaLevel3 = -45;
    export var AreaLevel4 = -46;
    export var AreaLevel5 = -47;
    export var AreaLevel6 = -48;
    export var AreaLevel7 = -49;
    export var IterationLevel1 = -50;
    export var IterationLevel2 = -51;
    export var IterationLevel3 = -52;
    export var IterationLevel4 = -53;
    export var IterationLevel5 = -54;
    export var IterationLevel6 = -55;
    export var IterationLevel7 = -56;
    export var IsDeleted = -404;
    export var ZZZDummyField = -58;
}

export enum FieldType {
    Internal = 0,
    String = 1,
    Integer = 2,
    DateTime = 3,
    PlainText = 5,
    Html = 7,
    TreePath = 8,
    History = 9,
    Double = 10,
    Guid = 11,
    Boolean = 12,
    PicklistInteger = 14,
    PicklistString = 15,
}

export module FollowsConstants {
    export var ArtifactType = "WorkItem";
    export var UnfollowResult = "UnfollowResult";
}

export enum FormLayoutType {
    Desktop = 0,
    Mobile = 1,
}

export module OobFieldRefNames {
    export var BacklogPriority = "Microsoft.VSTS.Common.BacklogPriority";
    export var StackRank = "Microsoft.VSTS.Common.StackRank";
    export var ActivatedBy = "Microsoft.VSTS.Common.ActivatedBy";
    export var ActivatedDate = "Microsoft.VSTS.Common.ActivatedDate";
    export var ClosedBy = "Microsoft.VSTS.Common.ClosedBy";
    export var ClosedDate = "Microsoft.VSTS.Common.ClosedDate";
    export var ResolvedBy = "Microsoft.VSTS.Common.ResolvedBy";
    export var ResolvedDate = "Microsoft.VSTS.Common.ResolvedDate";
    export var StateChangeDate = "Microsoft.VSTS.Common.StateChangeDate";
}

export module QueriesConstants {
    export var LastVisitedQueryGroupKey = "LAST_VISITED_QUERY_GROUP";
    export var MyFavoritesGroupKey = "MY_FAVORITES_GROUP";
    export var LastVisitedQueryMruKey = "Queries/LastVisited";
    export var TeamFavoriteGroupsExpandStatesMruKey = "Queries/FavoriteGroupExpandStates";
}

/**
* The format to generate for a query result
*/
export enum QueryResultFormat {
    Json = 0,
    Html = 1,
}

export enum UnfollowResultStatus {
    unfollowFailed = 0,
    unfollowSuccess = 1,
}

export module WellKnownControlNames {
    export var HtmlControl = "HtmlFieldControl";
    export var PlainTextControl = "PlainTextControl";
    export var FreshnessIndicatorControl = "FreshnessIndicatorControl";
    export var FieldControl = "FieldControl";
    export var DateControl = "DateTimeControl";
    export var ClassificationControl = "WorkItemClassificationControl";
    export var WorkItemLogControl = "WorkItemLogControl";
    export var WorkItemHistoryControl = "WorkItemHistoryControl";
    export var WorkItemStateGraphControl = "WorkItemStateGraphControl";
    export var LinksControl = "LinksControl";
    export var AttachmentsControl = "AttachmentsControl";
    export var WebpageControl = "WebpageControl";
    export var LabelControl = "LabelControl";
    export var TagFieldControl = "TagFieldControl";
    export var TestStepsControl = "TestStepsControl";
    export var AssociatedAutomationControl = "AssociatedAutomationControl";
    export var StageControl = "StageControl";
    export var StageBuildControl = "StageBuildControl";
    export var ReleaseBuildControl = "ReleaseBuildControl";
    export var AcceptanceCriteriaControl = "AcceptanceCriteriaControl";
    export var DevelopmentControl = "DevelopmentControl";
    export var WorkItemDiscussionControl = "WorkItemDiscussionControl";
    export var ParameterSetControl = "ParameterSetControl";
}

export module WITCommonConstants {
    export var LinkTypes = "LinkTypes";
    export var WorkItemTypes = "WorkItemTypes";
    export var Nodes = "Nodes";
    export var Fields = "Fields";
    export var AllowedValues = "AllowedValues";
    export var ConstantSets = "ConstantSets";
    export var WorkItemTypeCategories = "WorkItemTypeCategories";
    export var TeamProjects = "TeamProjects";
    export var AdhocQueries = "AdhocQueries";
}

export module WorkItemFeatureStateConstants {
    export var DataProviderName = "ms.vss-work-web.work-item-feature-state-data-provider";
    export var NewWebPlatform = "ms.vss-web.new-platform-support-feature";
}

export module WorkItemFormContributionProperties {
    export var ShowOnDeletedWorkItem = "showOnDeletedWorkItem";
    export var Height = "height";
    export var Name = "name";
    export var Inputs = "inputs";
    export var InputId = "id";
    export var InputRequired = "isRequired";
    export var InputMode = "inputMode";
    export var InputValidation = "validation";
    export var InputDataType = "dataType";
    export var InputDescription = "description";
    export var InputType = "type";
    export var InputProperties = "properties";
    export var InputType_WorkItemField = "WorkItemField";
    export var FieldType = "Field";
    export var InputProperties_WorkItemFieldTypes = "workItemFieldTypes";
}

export module WorkItemFormExtensionsConstants {
    export var ContributionDefaultHeight_Group = 150;
    export var ContributionDefaultHeight_Control = 75;
    export var ContributionTarget_Form = "ms.vss-work-web.work-item-form";
    export var ContributionType_Page = "ms.vss-work-web.work-item-form-page";
    export var ContributionType_Group = "ms.vss-work-web.work-item-form-group";
    export var ContributionType_Control = "ms.vss-work-web.work-item-form-control";
    export var ContributionType_Notifications = "ms.vss-work-web.work-item-notifications";
}

export module WorkItemLinkConstants {
    export var RESOURCELINKTYPES = ["Hyperlink", "ArtifactLink"];
    export var WORKITEMLINKUSAGE = "workItemLink";
    export var RESOURCELINKUSAGE = "resourceLink";
    export var ATTACHEDLINKTYPE = "AttachedFile";
    export var HYPERLINKLINKTYPE = "Hyperlink";
    export var ARTIFACTLINKTYPE = "ArtifactLink";
    export var EXTERNALLINKTYPE = "ExternalLink";
    export var ATTRIBUTES_USAGE = "usage";
    export var ATTRIBUTES_EDITABLE = "editable";
    export var ATTRIBUTES_ENABLED = "enabled";
    export var ATTRIBUTES_ACYCLIC = "acyclic";
    export var ATTRIBUTES_DIRECTIONAL = "directional";
    export var ATTRIBUTES_SINGLETARGET = "singleTarget";
    export var ATTRIBUTES_TOPOLOGY = "topology";
    export var ATTRIBUTES_ID = "id";
    export var ATTRIBUTES_AUTHORIZEDDATE = "authorizedDate";
    export var ATTRIBUTES_RESOURCECREATEDDATE = "resourceCreatedDate";
    export var ATTRIBUTES_RESOURCEMODIFIEDDATE = "resourceModifiedDate";
    export var ATTRIBUTES_REVISEDDATE = "revisedDate";
    export var ATTRIBUTES_RESOURCESIZE = "resourceSize";
    export var ATTRIBUTES_COMMENT = "comment";
    export var ATTRIBUTES_NAME = "name";
    export var ATTRIBUTES_ISLOCKED = "isLocked";
}

export module WorkItemSettingsConstants {
    export var DataProviderName = "ms.vss-work-web.work-item-settings-data-provider";
    export var Path = "WorkItemTracking/Settings";
}

export module WorkItemTrackingMetadataCacheConstants {
    export var CookieFormat = "WIT";
    export var DataProviderExperimentId = "ms.vss-work-web.work-item-form-data-providers-experiment";
}

export module WorkItemTypeIcons {
    export var WorkItemTypeIconNames = ["icon_clipboard", "icon_crown", "icon_trophy", "icon_list", "icon_book", "icon_sticky_note", "icon_insect", "icon_traffic_cone", "icon_chat_bubble", "icon_flame", "icon_megaphone", "icon_code_review", "icon_code_response", "icon_review", "icon_response", "icon_test_plan", "icon_test_suite", "icon_test_case", "icon_test_step", "icon_test_parameter", "icon_star", "icon_ribbon", "icon_chart", "icon_headphone", "icon_key", "icon_airplane", "icon_car", "icon_diamond", "icon_asterisk", "icon_database_storage", "icon_government", "icon_gavel", "icon_parachute", "icon_paint_brush", "icon_palette", "icon_gear", "icon_check_box", "icon_gift", "icon_test_beaker", "icon_broken_lightbulb", "icon_clipboard_issue"];
    export var DefaultWorkItemTypeIconName = "icon_clipboard";
}

