import {BuildCustomerIntelligenceInfo} from "Build.Common/Scripts/Generated/TFS.Build2.Common";

import Telemetry = require("VSS/Telemetry/Services");

export class Features {
    public static AllDefinitionsTabLoaded = "Definitions_All_PageLoad";
    public static BuildQueued = "BuildQueued";
    public static BuildResultLoaded = "BuildResult_PageLoad";
    public static DefinitionsHelpClicked = "Definitions_Help_Clicked";
    public static Folder = "Folder";
    public static MineTabLoaded = "Definitions_Mine_PageLoad";
    public static NewBuildDefinition = "NewBuildDefinition";
    public static QueuedTabLoaded = "Definitions_Queued_PageLoad";
    public static SignalR = "Build.SignalR";
}

export class Sources {
    public static AllDefinitions = "AllDefinitions";
    public static Code = "Code";
    public static DefinitionEditor = "DefinitionEditor";
    public static DefinitionHistory = "DefinitionHistory";
    public static DefinitionSummary = "DefinitionSummary";
    public static DefinitionView = "DefinitionView";
    public static DeletedBuilds = "DeletedBuilds";
    public static Explorer = "Explorer";
    public static Mine = "Mine";
    public static Queued = "Queued";
    public static QueryParameter = "QueryParameter";
    public static ResultView = "ResultView";
}

export class Properties {
    public static AbandonedCount = "AbandonedCount";
    public static ArtifactCount = "ArtifactCount";
    public static BuildRecordOldEvent = "BuildRecordOldEvent";
    public static BuildRecordEvent = "BuildRecordEvent";
    public static CancelledCount = "CancelledCount";
    public static CIChecked = "CIChecked";
    public static DefaultQueueName = "DefaultQueueName";
    public static FailedCount = "FailedCount";
    public static HasFolders = "HasFolders";
    public static NewFolder = "NewFolder";
    public static IssueCount = "IssueCount";
    public static JobCount = "JobCount";
    public static MyFavoritesCount = "MyFavoritesCount";
    public static Outcome = "Outcome";
    public static RepositoryType = "RepositoryType";
    public static RequestedByMeCount = "RequestedByMeCount";
    public static SectionExtensionCount = "SectionExtensionCount";
    public static SkippedCount = "SkippedCount";
    public static Source = "Source";
    public static SucceededCount = "SucceededCount";
    public static SucceededWithIssuesCount = "SucceededWithIssuesCount";
    public static SignalRSoftReconnect = "SignalRSoftReconnect";
    public static SignalRSyncEventCalledForBuild = "SignalRSyncEventCalledForBuild";
    public static TabExtensionCount = "TabExtensionCount";
    public static TeamFavoritesCount = "TeamFavoritesCount";
    public static TemplateName = "TemplateName";
    public static TimelineRecordCount = "TimelineRecordCount";
    public static TimelineRecordMissedEvent = "TimelineRecordMissedEvent";
    public static TimelineRecordOldEvent = "TimelineRecordOldEvent";
}

export function publishEvent(feature: string, source?: string, properties?: IDictionaryStringTo<any>, startTime?: number, elapsedTime?: number): void {
    properties = properties || {};
    if (source) {
        properties[Properties.Source] = source;
    }

    Telemetry.publishEvent(new Telemetry.TelemetryEventData(BuildCustomerIntelligenceInfo.Area, feature, properties, startTime, elapsedTime));
}