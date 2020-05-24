import * as Resources from "Search/Scripts/Resources/TFS.Resources.Search.Scenarios";
import { WorkItemFieldType } from "Search/Scenarios/WebApi/Workitem.Contracts";

export namespace SortActionIds {
    export const AssignedTo = "system.assignedto";
    export const ChangedDate = "system.changeddate";
    export const CreatedDate = "system.createddate";
    export const ID = "system.id";
    export const State = "system.state";
    export const Tags = "system.tags";
    export const Title = "system.title";
    export const WorkItemType = "system.workitemtype";
    export const Relevance = "relevance";
    export const Ascending = "asc";
    export const Descending = "desc";
}

export const FieldType: IDictionaryStringTo<WorkItemFieldType> = {
    "system.assignedto": WorkItemFieldType.Identity,
    "system.changeddate": WorkItemFieldType.DateTime,
    "system.createddate": WorkItemFieldType.DateTime,
    "system.id": WorkItemFieldType.Integer,
    "system.state": WorkItemFieldType.String,
    "system.tags": WorkItemFieldType.String,
    "system.title": WorkItemFieldType.String,
    "system.workitemtype": WorkItemFieldType.String
}


export namespace Fields {
    export const AssignedTo = "assigned to";
    export const CreatedBy = "created by";
    export const State = "state";
    export const WorkItemType = "work item type";
    export const shortcutTexts = {
        [AssignedTo]: "a",
        [CreatedBy]: "c",
        [State]: "s",
        [WorkItemType]: "t",
    };
}

export namespace FilterKeys {
    export const ProjectFiltersKey = "Projects";
    export const WorkItemTypesFiltersKey = "Work Item Types";
    export const StateFiltersKey = "States";
    export const AssignedToFiltersKey = "Assigned To";
    export const AreaPathsFilterKey = "Area Paths";
}

export namespace ResultsViewConstants {
    export const WhiteSpaceRegex = /(\s+)/g;
    export const HashGlobalRegex = /#/g;
    export const HitHighlightLightHtmlEncodedStartTagRegex = /(&lt;highlighthit&gt;)/gi;
    export const HitHighlightLightHtmlEncodedEndTagRegex = /(&lt;\/highlighthit&gt;)/gi;
    export const HighlightStartTag = "<highlighthit>";
    export const HighlightEndTag = "</highlighthit>";
    export const AvatarAliasHitRegex = /<<highlighthit\s*[\/]?>([\w\.]+)<\s*[\/]highlighthit>@[<>\/\w\.]+>/;
    export const AssignedToEmailRegex = /(<[\/<>\w\.]+@[\/<>\w\.]+>)/g;
    export const HighlightRegex = /(<highlighthit\s*[\/]?>)|(<\s*[\/]highlighthit>)/gi;
    export const Ellipsis = "...";
    export const MetadataFields: Array<string> = [
        "system.state",
        "system.id",
        "system.assignedto",
        "system.tags",
        "system.title",
        "system.workitemtype"];

    export const FieldNameToDisplayName = {
        "history": Resources.WorkItemSearchDiscussion
    };
    export const AvatarWidth = 130;
    export const AvatarColonWidth = 160;
    export const SnippetColumnWidth = 100;
    export const AvatarColumnHeight = 16;
    export const WidthForEachDigit = 8;
    export const BufferWidthForWorkItemId = 3;
}

export namespace PreviewOrientationActionIds {
    export const OffPreviewOrientation = "off";
    export const RightPreviewOrientation = "right";
    export const BottomPreviewOrientation = "bottom";
}

export namespace CustomerIntelligenceConstants {
    export const TTIScenarioName: string = "WorkItemSearchTTIScenario";
    export const TabSwitchScenarioName: string = "WorkItemSearchTabSwitchScenario";
    export const SubsequentSearchScenarioName = "WorkItemSearchSubsequentSearchScenario";
    export const RedirectedPreviewScenario: string = "RedirectedWorkItemSearchPreviewScenario";
    export const PreviewOnTabSwitchScenario: string = "WorkItemSearchPreviewOnTabSwitchScenario";
    export const QueryResultScenarioName = "WorkItemSearchQueryResultsScenario";
    export const EntityName: string = "WorkItem";
    export const SearchStarted: string = "SearchStarted";
    export const ResultsLoaded: string = "ResultsLoaded";
    export const FilterPaneVisibilityChanged: string = "FilterPaneVisibilityChanged";
    export const ItemChanged: string = "ItemChanged";
    export const SortOptionChanged: string = "SortOptionChanged";
    export const PreviewOrientationChanged: string = "PreviewOrientationChanged";
    export const PreviewMessageBanner: string = "PreviewMessageBanner";
    export const ZeroData: string = "ZeroData";
    export const NotificationBanner: string = "NotificationBanner";
    export const SearchHelpFilterActivated: string = "SearchHelpFilterActivated";
    export const SearchInNewTab: string = "SearchInNewTab";
    export const SearchTextRemoved: string = "SearchTextRemoved";
    export const AccountLinkClicked: string = "AccountLinkClicked";
    export const AccountButtonClicked: string = "AccountButtonClicked";
    export const FeedbackLinkClicked: string = "FeedbackLinkClicked";
    export const FeedbackMailLinkClicked: string = "FeedbackMailLinkClicked";
    export const FilterResetClicked: string = "FilterResetClicked";
    export const FiltersUpdated: string = "FiltersUpdated";
    export const LaunchPoint: string = "LaunchPoint";
    export const OrgSearchNavigationFromWorkItemSearchPageSource = "tfs.Search.workItem";
    export const WorkItemOpenForm = "OpenForm";
}

export namespace IndexingErrorCodeConstants {
    export const AccountIsBeingIndexed = "AccountIsBeingIndexed";
    export const AccountIsBeingReindexed = "AccountIsBeingReindexed";
    export const AccountIsBeingOnboarded = "AccountIsBeingOnboarded";
}

export const AreaNodePathSeparator = "\\";
export const EntityTypeUrlParam = "workitem";
export const WorkItemSearchTakeResults = 50;
export const WorkItemSearchShowMoreTakeResults = 1000;
export const FeedbackMailToLinkFormat: string =
    "mailto:vstssearch@microsoft.com?Subject=Feedback on Azure DevOps Services Work item Search [Reference ID: {0}]";
export const CodexFeedbackMailToLinkFormat: string =
    "https://developercommunity.visualstudio.com/content/problem/post.html?space=21&version=NONE&azActivityId={0}";
export const LearnMoreLink: string = "https://go.microsoft.com/fwlink/?linkid=859316";