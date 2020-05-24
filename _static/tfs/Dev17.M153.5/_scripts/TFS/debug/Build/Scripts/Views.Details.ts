import ko = require("knockout");
import Q = require("q");

import AdminSendMail = require("Admin/Scripts/TFS.Admin.SendMail");

import BaseDefinitionModel = require("Build/Scripts/BaseDefinitionModel");
import BuildDetails = require("Build/Scripts/BuildDetails");
import ArtifactsTab = require("Build/Scripts/BuildDetails.ArtifactsTab");
import ConsoleTab = require("Build/Scripts/BuildDetails.ConsoleTab");
import CustomTab = require("Build/Scripts/BuildDetails.CustomTab");
import LogsTab = require("Build/Scripts/BuildDetails.LogsTab");
import SummaryTab = require("Build/Scripts/BuildDetails.SummaryTab");
import TimelineTab = require("Build/Scripts/BuildDetails.TimelineTab");
import XamlBuildDetails = require("Build/Scripts/BuildDetails.Xaml");
import BuildVariables = require("Build/Scripts/Common.Variables");
import Context = require("Build/Scripts/Context");
import { ContributionHelper, WellKnownContributionData } from "Build/Scripts/Contribution";
import { getContributionsForTarget, getContributionsForTargets, contributionExists } from "Build/Scripts/Contributions";
import QueueDefinitionDialog = require("Build/Scripts/Controls.QueueDefinitionDialog");
import XamlBuildControls = require("Build/Scripts/Controls.Xaml");
import DemandViewModel = require("Build/Scripts/DemandViewModel");
import PlanTree = require("Build/Scripts/Explorer.BuildPlanTree");
import Extensibility = require("Build/Scripts/Extensibility");
import ModelContext = require("Build/Scripts/ModelContext");
import BuildDetailsViewModel = require("Build/Scripts/Models.BuildDetailsViewModel");
import TimelineRecordViewModel = require("Build/Scripts/Models.TimelineRecordViewModel");
import TimelineViewModel = require("Build/Scripts/Models.TimelineViewModel");
import { endPageLoadScenario } from "Build/Scripts/Performance";
import { ArtifactAddedEvent, BuildEvent, BuildRealtimeEvent, HubBase, HubFactory } from "Build/Scripts/Realtime";
import BuildResources = require("Build/Scripts/Resources/TFS.Resources.Build");
import { hasDefinitionPermission, canCancelBuild, canRetainBuild } from "Build/Scripts/Security";
import { loadSignalR } from "Build/Scripts/SignalR";
import { getRealtimeStore, RealtimeStore } from "Build/Scripts/Stores/Realtime";
import Telemetry = require("Build/Scripts/Telemetry");
import BuildUtils = require("Build/Scripts/Utilities/Utils");
import BuildViews = require("Build/Scripts/Views");
import ViewsCommon = require("Build/Scripts/Views.Common");

import { BuildReason } from "Build.Common/Scripts/BuildReason";
import { getSortedBuilds } from "Build.Common/Scripts/BuildReference";
import { GetBuildsResult, IBuildFilter, InformationNodesUpdatedEvent } from "Build.Common/Scripts/ClientContracts";
import * as Histogram from "Build.Common/Scripts/Controls/Histogram";
import { getDurationText, getDurationTextFromTime, getBuildDurationQueueText } from "Build.Common/Scripts/Duration";
import { BuildCustomerIntelligenceInfo, ArtifactResourceTypes, BuildPermissions } from "Build.Common/Scripts/Generated/TFS.Build2.Common";
import { BuildActions, XamlBuildActions, BuildLinks } from "Build.Common/Scripts/Linking";
import BuildCommonResources = require("Build.Common/Scripts/Resources/TFS.Resources.Build.Common");
import Xaml = require("Build.Common/Scripts/Xaml/Xaml.Legacy");

import KnockoutPivot = require("DistributedTasksCommon/TFS.Knockout.HubPageExplorerPivot");

import ServerConstants = require("Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");

import BuildContracts = require("TFS/Build/Contracts");
import VCContracts = require("TFS/VersionControl/Contracts");

import Adapters_Knockout = require("VSS/Adapters/Knockout");
import { getPageContext } from "VSS/Context";
import Contributions_Contracts = require("VSS/Contributions/Contracts");
import Contributions_Services = require("VSS/Contributions/Services");
import Controls = require("VSS/Controls");
import Menus = require("VSS/Controls/Menus");
import Splitter = require("VSS/Controls/Splitter");
import Events_Action = require("VSS/Events/Action");
import VSS_Events = require("VSS/Events/Services");
import FeatureAvailability_Services = require("VSS/FeatureAvailability/Services");
import Navigation_Services = require("VSS/Navigation/Services");
import Performance = require("VSS/Performance");
import * as Resources_Platform from "VSS/Resources/VSS.Resources.Platform";
import Service = require("VSS/Service");
import Utils_Array = require("VSS/Utils/Array");
import Utils_Clipboard = require("VSS/Utils/Clipboard");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import Utils_UI = require("VSS/Utils/UI");
import VSS = require("VSS/VSS");

var domElem = Utils_UI.domElem;

export class DetailsTabViewModel extends KnockoutPivot.BaseTabViewModel {
    public showErrorPanel: KnockoutObservable<boolean> = ko.observable(false);
    public showCopyButton: KnockoutObservable<boolean> = ko.observable(false);
    public errorMessage: KnockoutObservable<string> = ko.observable("");

    constructor() {
        super();
    }

    public isTabVisible(tab: string): boolean {
        return true;
    }

    _onSelectedTabChanged(tab: string): void {
        super._onSelectedTabChanged(tab);
        var historySvc = Navigation_Services.getHistoryService();
        var currentState = historySvc.getCurrentState();
        if (currentState) {
            let action = currentState.action || "summary";
            currentState[ViewsCommon.BuildNavigationStateProperties.tab] = tab;
            historySvc.addHistoryPoint(action, currentState);
        }
    }
}

interface TabState {
    visible: boolean;
    selected: boolean;
    tab: KnockoutPivot.PivotTab;
}

// represents the details views - console, summary, logs, timeline
export class DetailsViewModel extends DetailsTabViewModel {
    public currentState: ViewsCommon.DetailsViewNavigationState;

    private _summaryTab: SummaryTab.BuildSummaryTab;

    // tabs for builds
    private _logsTab: LogsTab.BuildLogsTab;
    private _timelineTab: TimelineTab.BuildTimelineTab;
    private _consoleTab: ConsoleTab.BuildConsoleTab;
    private _artifactsTab: ArtifactsTab.ArtifactsTab;

    // tabs for xaml builds
    private _xamlLogTab: BuildDetails.BuildDetailsTab;
    private _xamlDiagnosticsTab: BuildDetails.BuildDetailsTab;

    private _tabSwitchReactor: IDisposable;
    private _buildSubscription: IDisposable;
    private _timelineRecordsSubscription: IDisposable;
    private _currentTimeLineSubscription: IDisposable;
    private _viewContext: Context.ViewContext;
    private _buildDetailsContext: Context.BuildDetailsContext;

    private _contributedTabIdToTabMap: { id: string, tab: CustomTab.BuildCustomTab } = <any>{};
    private _contributedTabIds: string[] = [];
    private _contributionPromise: IPromise<Contribution[]>;

    private _wasCopied: KnockoutObservable<boolean> = ko.observable(false);
    private _copyLabel: KnockoutComputed<string>;
    private _contributedTabsInitialized = false;

    constructor(viewContext: Context.ViewContext, buildDetailsContext: Context.BuildDetailsContext) {
        super();
        this._contributionPromise = getContributionsForTarget(viewContext.tfsContext, WellKnownContributionData.ResultsView);

        this._viewContext = viewContext;
        this._buildDetailsContext = buildDetailsContext;

        this._summaryTab = new SummaryTab.BuildSummaryTab(viewContext, buildDetailsContext);
        this._logsTab = new LogsTab.BuildLogsTab(Context.buildDetailsContext);
        this._timelineTab = new TimelineTab.BuildTimelineTab(viewContext, buildDetailsContext);
        this._consoleTab = new ConsoleTab.BuildConsoleTab();
        this._artifactsTab = new ArtifactsTab.ArtifactsTab(viewContext, buildDetailsContext);
        this._xamlDiagnosticsTab = new BuildDetails.BuildDetailsTab(XamlBuildActions.Log, BuildResources.BuildDetailLogTitle, XamlBuildDetails.XamlBuildLogControl.TemplateName)
        this._xamlLogTab = new BuildDetails.BuildDetailsTab(XamlBuildActions.Diagnostics, BuildResources.BuildDetailDiagnosticsTitle, XamlBuildDetails.XamlBuildDiagnosticsControl.TemplateName);

        const filePathArtifactDeletionEnabled = FeatureAvailability_Services.FeatureAvailabilityService.isFeatureEnabled(ServerConstants.FeatureAvailabilityFlags.FilePathArtifactsAndSymbolsDeleteFeature, false);

        this._copyLabel = ko.computed(() => {
            return this._wasCopied() ? Resources_Platform.CopiedContentDialogTitle : Resources_Platform.CopyContentDialogTitle;
        });

        // reactor to switch tabs when the current tab becomes invisible
        this._tabSwitchReactor = ko.computed({
            read: () => {
                let selectedVisibleTab: BuildDetails.BuildDetailsTab = null;
                let firstVisibleTab: BuildDetails.BuildDetailsTab = null;

                let tabIdToSelect: string = null;
                if (this.currentState && this.currentState.tab) {
                    tabIdToSelect = this.currentState.tab;
                }

                this.tabs.peek().forEach((tab: BuildDetails.BuildDetailsTab) => {
                    let visible = tab.isVisible(); // don't peek since we need to listen on changes to this
                    let selected = tab.isSelected.peek();
                    if (visible && Utils_String.equals(tabIdToSelect, tab.id, true)) {
                        // found the tab specified from the state
                        firstVisibleTab = tab;
                        selectedVisibleTab = null; // make this null so that this tab can be selected
                        return false;
                    }
                    if (!firstVisibleTab && visible) {
                        firstVisibleTab = tab;
                    }
                    if (!selectedVisibleTab && visible && selected && !(tab instanceof CustomTab.BuildCustomTab)) {
                        selectedVisibleTab = tab;
                    }
                });

                if (!selectedVisibleTab) {
                    // the selected tab is not visible
                    if (firstVisibleTab) {
                        this.selectedTab(firstVisibleTab.id);
                        this.showCopyButton(firstVisibleTab.showCopyButton());
                    }
                    else {
                        this.selectedTab(null);
                        this.showCopyButton(false);
                    }
                }
                else {
                    this.showCopyButton(selectedVisibleTab.showCopyButton());
                }
            }
        });

        this.selectedTab.subscribe((tabId: string) => {
            let tab = Utils_Array.first(this.tabs.peek(), (t) => t.id === tabId) as BuildDetails.BuildDetailsTab;
            let showCopyButton: boolean = false;
            if (tab) {
                showCopyButton = tab.showCopyButton.peek();
            }
            this.showCopyButton(showCopyButton);
        });

        // subscribe to timeline first, before we can update the timeline later
        this._currentTimeLineSubscription = this._buildDetailsContext.currentTimeline.subscribe((timelineModel) => {
            if (!timelineModel) {
                return false;
            }

            // react to any kind of record updates
            timelineModel.updateRecordNodes();

            const recordToSelect = this._getNodeToSelect(timelineModel.records());
            if (!!recordToSelect) {
                this._buildDetailsContext.currentTimelineRecord(recordToSelect);
            }
        });

        this._timelineRecordsSubscription = ko.computed(() => {
            const timeline = this._buildDetailsContext.currentTimeline();
            if (timeline) {
                // react to any kind of record updates
                timeline.updateRecordNodes();
                const timelineContract = timeline.getTimeline();
                const timelineRecords = (timelineContract && timelineContract.records) || [];
                this._loadContributedTabs(timelineRecords);
            }
        });

        this._buildSubscription = this._buildDetailsContext.currentBuild.subscribe((newValue: BuildDetailsViewModel.BuildDetailsViewModel) => {
            if (!newValue) {
                return;
            }

            let buildLoaded = Q.defer<IDictionaryStringTo<number>>();
            let buildId: number = newValue.id.peek();
            let telemetry: IDictionaryStringTo<number> = {};

            let issueCount = newValue.validationResults.peek().filter((vr) => vr.type.peek() !== BuildContracts.ValidationResult.OK).length;
            telemetry[Telemetry.Properties.IssueCount] = issueCount;

            // If the build is not deleted, then we need to fetch the build timeline
            // But if it is deleted, we need to fetch cleanup timeline.
            var planId: string;
            if (!filePathArtifactDeletionEnabled ||
                (!newValue.deleted()) ||
                newValue.cleanupPlanId() == null) {
                planId = newValue.planId();
            }
            else {
                planId = newValue.cleanupPlanId();
            }

            // trigger recalculation of durationText values
            ModelContext.ModelContext.currentDate(new Date());

            let contributionsLoaded = Q.defer<IDictionaryStringTo<number>>();

            // get the timeline for the build
            let timelinePromise: IPromise<any> = this._viewContext.buildClient.getTimeline(buildId, "", 0, planId)
                .then((timeline: BuildContracts.Timeline) => {
                    const timelineRecords = (timeline && timeline.records) ? timeline.records : [];
                    this._loadContributedTabs(timelineRecords, contributionsLoaded);
                    if (!timeline) {
                        return;
                    }

                    let timelineModel: TimelineViewModel.TimelineViewModel = new TimelineViewModel.TimelineViewModel(buildId, planId, timeline);
                    this._buildDetailsContext.currentTimeline(timelineModel);
                    telemetry[Telemetry.Properties.TimelineRecordCount] = timelineRecords.length;
                    telemetry[Telemetry.Properties.JobCount] = timelineRecords.filter((r) => Utils_String.localeIgnoreCaseComparer(r.type, "job") === 0).length;


                    // task result telemetry
                    let telemetryKeyMap: IDictionaryNumberTo<string> = {};
                    telemetryKeyMap[BuildContracts.TaskResult.Succeeded] = Telemetry.Properties.SucceededCount;
                    telemetryKeyMap[BuildContracts.TaskResult.SucceededWithIssues] = Telemetry.Properties.SucceededWithIssuesCount;
                    telemetryKeyMap[BuildContracts.TaskResult.Failed] = Telemetry.Properties.FailedCount;
                    telemetryKeyMap[BuildContracts.TaskResult.Canceled] = Telemetry.Properties.CancelledCount;
                    telemetryKeyMap[BuildContracts.TaskResult.Skipped] = Telemetry.Properties.SkippedCount;
                    telemetryKeyMap[BuildContracts.TaskResult.Abandoned] = Telemetry.Properties.AbandonedCount;

                    telemetry[Telemetry.Properties.SucceededCount] = 0;
                    telemetry[Telemetry.Properties.SucceededWithIssuesCount] = 0;
                    telemetry[Telemetry.Properties.FailedCount] = 0;
                    telemetry[Telemetry.Properties.CancelledCount] = 0;
                    telemetry[Telemetry.Properties.SkippedCount] = 0;
                    telemetry[Telemetry.Properties.AbandonedCount] = 0;
                    timelineRecords.forEach((timelineRecord) => {
                        if (timelineRecord.issues) {
                            issueCount += timelineRecord.issues.length;
                        }
                        telemetry[telemetryKeyMap[timelineRecord.result]] = telemetry[telemetryKeyMap[timelineRecord.result]] + 1;
                    });

                    telemetry[Telemetry.Properties.IssueCount] = issueCount;

                    buildLoaded.resolve(telemetry);
                },
                (reason) => {
                    // if there is no timeline for the build, reset to empty
                    if (reason.status === 404) {
                        let timelineModel: TimelineViewModel.TimelineViewModel = new TimelineViewModel.TimelineViewModel(buildId, planId, null);
                        this._buildDetailsContext.currentTimeline(timelineModel);
                    }
                    else {
                        VSS.handleError(reason);
                    }

                    telemetry[Telemetry.Properties.TimelineRecordCount] = 0;

                    buildLoaded.resolve(telemetry);
                });

            let artifactsPromise = newValue.waitForArtifacts();

            Q.all([contributionsLoaded.promise, buildLoaded.promise, artifactsPromise]).spread((contributionsTelemetry: IDictionaryStringTo<number>, buildTelemetry: IDictionaryStringTo<number>, artifacts: BuildContracts.BuildArtifact[]) => {
                // if there's a page-load scenario, this is a good time to end it
                endPageLoadScenario();

                let telemetry = $.extend(contributionsTelemetry, buildTelemetry);
                telemetry[Telemetry.Properties.ArtifactCount] = artifacts.length;

                Telemetry.publishEvent(Telemetry.Features.BuildResultLoaded, null, telemetry);
            });
        });
    }

    public isTabVisible(tab: string): boolean {
        switch (tab) {
            case BuildActions.Console:
                return this._consoleTab.isVisible.peek();
            case BuildActions.Summary:
                return this._summaryTab.isVisible.peek();
            case BuildActions.Logs:
                return this._logsTab.isVisible.peek();
            case BuildActions.Timeline:
                return this._timelineTab.isVisible.peek();
            case BuildActions.Artifacts:
                return this._artifactsTab.isVisible.peek();
            default:
                return super.isTabVisible(tab);
        }
    }

    /// Get the Build Summary View Model for exposing data to the email function
    public getBuildSummaryViewModel(): SummaryTab.BuildSummaryViewModel {
        return this._summaryTab.summary;
    }

    public dispose(): void {
        super.dispose();
        if (this._tabSwitchReactor) {
            this._tabSwitchReactor.dispose();
            this._tabSwitchReactor = null;
        }

        if (this._buildSubscription) {
            this._buildSubscription.dispose();
            this._buildSubscription = null;
        }

        if (this._currentTimeLineSubscription) {
            this._currentTimeLineSubscription.dispose();
            this._currentTimeLineSubscription = null;
        }

        $.each(this.tabs(), (index: number, tab: KnockoutPivot.PivotTab) => {
            tab.dispose();
        });
        this.tabs([]);
    }

    private _loadContributedTabs(records: BuildContracts.TimelineRecord[], telemetryPromise?: Q.Deferred<IDictionaryStringTo<number>>) {
        const existingTabs = [
            this._consoleTab,
            this._summaryTab,
            this._logsTab,
            this._timelineTab,
            this._artifactsTab,

            this._xamlLogTab,
            this._xamlDiagnosticsTab
        ];

        this._contributionPromise.then((contributions) => {
            let telemetry: IDictionaryStringTo<number> = {};
            let customTabs: CustomTab.BuildCustomTab[] = [];

            let tabContributions: Contribution[] = [];
            const contributionHelper = new ContributionHelper(contributions);

            contributions.forEach((contribution, index) => {
                let resultTabExtensions: number = 0;

                if (contributionHelper.isBuildDetailsTabContribution(contribution)) {
                    resultTabExtensions++;

                    tabContributions.push(contribution);

                    var customTab = new CustomTab.BuildCustomTab(new CustomTab.BuildCustomTabViewModel(contribution));
                    customTabs.push(customTab);

                    // see this._getCustomTab
                    this._contributedTabIdToTabMap[contribution.id] = customTab;
                    this._contributedTabIds.push(contribution.id);
                }

                telemetry[Telemetry.Properties.TabExtensionCount] = resultTabExtensions;
            });

            const contributionsVisibilityMap = contributionHelper.getTaskContributionVisibilityMap(records);

            // hide it initially if we have to, before we finally update the tabs to the observable
            customTabs.forEach((customTab) => {
                if (contributionsVisibilityMap[customTab.id] === false) {
                    customTab.visible(false);
                }
            });

            if (!this._contributedTabsInitialized) {
                getContributionsForTargets(this._viewContext.tfsContext, this._contributedTabIds).then((subContributions: Contribution[]) => {
                    let sectionExtensions: number = 0;

                    subContributions.forEach((subContribution) => {
                        if (contributionHelper.isBuildDetailsSectionContribution(subContribution)) {
                            sectionExtensions++;

                            // TODO: render contributions of type 'action' targetting to a section as a section dropdown or something => render actions for a section
                            let customTab = this._getCustomTab(subContribution);
                            if (customTab) {
                                customTab.vm.createSection(subContribution);
                            }

                            // hide it initially if we have to, before we finally update the tabs to the observable
                            if (contributionsVisibilityMap[customTab.id] === false) {
                                customTab.visible(false);
                            }
                        }
                    });

                    telemetry[Telemetry.Properties.SectionExtensionCount] = sectionExtensions;

                    telemetryPromise && telemetryPromise.resolve(telemetry);
                }, (error) => {
                    telemetryPromise && telemetryPromise.resolve(telemetry);
                });

                this.tabs(existingTabs.concat(customTabs));
                this.tabs.valueHasMutated();
            }
            else {
                // update visibility for existing tabs
                const existingTabs = this.tabs.peek();
                existingTabs.forEach((tab) => {
                    if (contributionsVisibilityMap[tab.id] === true) {
                        (tab as CustomTab.BuildCustomTab).visible(true);
                    }
                    else if (contributionsVisibilityMap[tab.id] === false) {
                        (tab as CustomTab.BuildCustomTab).visible(false);
                    }
                });
            }

            this._contributedTabsInitialized = true;

        }, (error) => {
            telemetryPromise && telemetryPromise.resolve({});

            // fall back to builtin tabs
            this.tabs(existingTabs);
            VSS.handleError(error);
        });
    }

    private _getCustomTab(contribution: Contribution): CustomTab.BuildCustomTab {
        var matchedIds = Utils_Array.intersect(contribution.targets, this._contributedTabIds, (a, b) => {
            if (Utils_String.caseInsensitiveContains(a, b)) {
                return 0;
            }
        });
        if (matchedIds && matchedIds[0]) {
            return this._contributedTabIdToTabMap[matchedIds[0]];
        }
        return null;
    }

    private _onCopyButtonClick(): void {
        VSS_Events.getService().fire(BuildDetails.BuildDetailsTab.CopyButtonClicked);
        this._wasCopied(true);
    }

    private _resetCopy(): void {
        this._wasCopied(false);
    }

    private _getNodeToSelect(records: TimelineRecordViewModel.TimelineRecordViewModel[]) {
        let record: TimelineRecordViewModel.TimelineRecordViewModel = null;

        // If the build is running, find a running job and select it
        records.some((currentRecord) => {
            const jobNode = this._getJobNode(currentRecord);
            if (jobNode && jobNode.state() === BuildContracts.TimelineRecordState.InProgress) {
                record = jobNode;
                return true;
            }

            return false;
        });

        // No job is running, select the first non-completed job
        if (!record) {
            records.some((currentRecord) => {
                const jobNode = this._getJobNode(currentRecord);
                if (jobNode && jobNode.state() !== BuildContracts.TimelineRecordState.Completed) {
                    record = jobNode;
                    return true;
                }

                return false;
            });
        }

        return record;
    }

    private _getJobNode(record: TimelineRecordViewModel.TimelineRecordViewModel) {
        let jobRecord: TimelineRecordViewModel.TimelineRecordViewModel = null;

        if (record.isPhaseNode()) {
            // This is a phase, just try to get the very first job at just level 1
            const subRecords = record.nodes() as TimelineRecordViewModel.TimelineRecordViewModel[];
            if (subRecords.length > 0) {
                if (subRecords[0].isJobNode()) {
                    jobRecord = subRecords[0];
                }
            }
        }

        // No job record is already found, so let's select even a phase or job
        if (!jobRecord && record.isJobOrPhaseNode()) {
            jobRecord = record;
        }

        return jobRecord;
    }
}

class ProjectInfoModel {
    public projectId: KnockoutObservable<string> = ko.observable("");
    public projectName: KnockoutObservable<string> = ko.observable("");
    public supportsGit: KnockoutObservable<boolean> = ko.observable(false);
    public supportsTfvc: KnockoutObservable<boolean> = ko.observable(false);

    public update(projectInfo: VCContracts.VersionControlProjectInfo) {
        if (projectInfo) {
            this.projectId(projectInfo.project.id);
            this.projectName(projectInfo.project.name);
            this.supportsGit(projectInfo.supportsGit);
            this.supportsTfvc(projectInfo.supportsTFVC);
        }
        else {
            this.projectId("");
            this.projectName("");
            this.supportsGit(false);
            this.supportsTfvc(false);
        }
    }
}

export class ViewModel extends Adapters_Knockout.TemplateViewModel {
    private _eventManager: VSS_Events.EventService;
    private _eventsAttached: boolean = false;
    private _projectInfo: ProjectInfoModel = new ProjectInfoModel();
    private _planTreeTab: PlanTree.BuildPlanNodesTreeTab;
    private _realtimeStore: RealtimeStore;
    private _viewContext: Context.ViewContext;
    private _buildDetailsContext: Context.BuildDetailsContext;

    public buildNumber: KnockoutComputed<string>;
    public statusText: KnockoutComputed<string>;
    public statusClass: KnockoutComputed<string>;
    public durationText: KnockoutObservable<string> = ko.observable("");
    public definitionName: KnockoutComputed<string>;

    public selectedView: KnockoutObservable<DetailsTabViewModel> = ko.observable(null);
    private _detailsView: DetailsViewModel;

    public selectedTab: KnockoutComputed<string>;

    public hideLeftPane: boolean = false;

    // navigation state
    private _navigating: boolean = false;

    private _cancellationTimeoutTimer: number;
    private _durationTimer: number;
    private _buildDurationSubscription: IDisposable;
    private _timelineDurationSubscription: IDisposable;

    private _parentTimelineRecord: KnockoutComputed<TimelineRecordViewModel.TimelineRecordViewModel>;

    // hub title parts
    public parentTimelineRecordName: KnockoutComputed<string>;
    public currentTimelineRecordName: KnockoutComputed<string>;
    public currentTimelineRecordResult: KnockoutComputed<string>;
    public buildReasonCss: KnockoutComputed<string>;
    public buildReasonDisplayText: KnockoutObservable<string> = ko.observable("");
    public realtimeConnectionError: KnockoutObservable<boolean> = ko.observable(false);
    public showRealtimeConnectionErrorMessage: KnockoutComputed<boolean>;
    public definitionSummaryUrl: KnockoutComputed<string>;
    public retainedByRelease: KnockoutComputed<boolean>;

    // histogram
    public histogram: Histogram.BuildHistogramViewModel = new Histogram.BuildHistogramViewModel(new Histogram.BuildsInfo([], 0), (build) => {
        Context.viewContext.viewBuild(build);
    });
    private _previousBuilds: KnockoutObservableArray<BuildContracts.Build> = ko.observableArray(<BuildContracts.Build[]>[]);

    public onParentTimelineRecordClicked: () => void;
    public onDefinitionNameClicked: () => void;

    private _timelineRecordsUpdatedHandler: (sender, args) => void;
    private _buildUpdatedHandler: (sender, args) => void;
    private _artifactAddedHandler: (sender, args) => void;
    private _informationNodesUpdatedHandler: (sender, args) => void;
    private _changesCalculatedHandler: (sender, args) => void;

    private _hideSplitterInitialized: boolean = false;

    constructor(planTreeTab: PlanTree.BuildPlanNodesTreeTab, viewContext: Context.ViewContext, buildDetailsContext: Context.BuildDetailsContext) {
        super();

        this._planTreeTab = planTreeTab;
        this._viewContext = viewContext;
        this._buildDetailsContext = buildDetailsContext;

        this._timelineRecordsUpdatedHandler = (sender, args) => {
            this._refreshTimelineRecords(<BuildContracts.TimelineRecordsUpdatedEvent>args);
        };

        this._buildUpdatedHandler = (sender, args) => {
            this._refreshBuild(<BuildContracts.BuildUpdatedEvent>args);
        };

        this._artifactAddedHandler = (sender, args) => {
            this._refreshArtifacts(<ArtifactAddedEvent>args);
        };

        this._informationNodesUpdatedHandler = (sender, args) => {
            this._refreshInformationNodes(<InformationNodesUpdatedEvent>args);
        }

        this._changesCalculatedHandler = (sender, args) => {
            this._refreshChanges(<BuildEvent>args);
        };

        this._eventManager = VSS_Events.getService();

        this._realtimeStore = getRealtimeStore();
        this._realtimeStore.addChangedListener(this._onRealtimeStoreChanged);

        // main views
        this._detailsView = new DetailsViewModel(this._viewContext, this._buildDetailsContext);
        this.selectedView(this._detailsView);

        this.buildNumber = this.computed(() => {
            var build: BuildDetailsViewModel.BuildDetailsViewModel = this._buildDetailsContext.currentBuild();
            if (!!build) {
                return build.buildNumber();
            }
        });

        // selected tab
        this.selectedTab = ko.computed({
            read: () => {
                return this.selectedView().selectedTab();
            },
            write: (newValue: string) => {
                // select tab if it's visible
                if (this.selectedView().isTabVisible(newValue)) {
                    this.selectedView().selectedTab(newValue);
                }
            }
        });
        this._addDisposable(this.selectedTab);

        this._parentTimelineRecord = this.computed(() => {
            var timelineRecord: TimelineRecordViewModel.TimelineRecordViewModel = this._buildDetailsContext.currentTimelineRecord();
            if (!!timelineRecord) {
                return <TimelineRecordViewModel.TimelineRecordViewModel>timelineRecord.parent();
            }
        });

        // build title clicked
        this.subscribe(this._planTreeTab.buildTitleClicked, () => {
            this.onBuildTitleClicked();
        });

        // parent timeline record clicked 
        this.onParentTimelineRecordClicked = () => {
            // TODO: it would be nice if these were tied together somehow
            var parentTimelineRecord: TimelineRecordViewModel.TimelineRecordViewModel = this._parentTimelineRecord();
            this._planTreeTab.selectNode(parentTimelineRecord);
            this._buildDetailsContext.currentTimelineRecord(parentTimelineRecord);
        };

        // definition name clicked
        this.onDefinitionNameClicked = () => {
            this._buildDetailsContext.currentTimelineRecord(null);
            let build = this._buildDetailsContext.currentBuild.peek();
            if (build) {
                Context.viewContext.viewDefinition(build.definitionId.peek());
            }
        }

        // definition summary url, so users can open in a new tab
        this.definitionSummaryUrl = this.computed(() => {
            let build = this._buildDetailsContext.currentBuild();
            if (build) {
                return BuildLinks.getDefinitionLink(build.definitionId());
            }
        });

        this.retainedByRelease = this.computed(() => {
            let build = this._buildDetailsContext.currentBuild();
            if (build) {
                return build.retainedByRelease();
            }
        });

        // subscription to refresh current timeline
        this.subscribe(this._buildDetailsContext.currentTimeline, (currentTimeline: TimelineViewModel.TimelineViewModel) => {
            if (!!currentTimeline) {
                // trigger recalculation of durationText values
                ModelContext.ModelContext.currentDate(new Date());
            }
        });

        this.subscribe(this._buildDetailsContext.currentTimelineRecord, (currentTimelineRecord: TimelineRecordViewModel.TimelineRecordViewModel) => {
            // trigger recalculation of durationText values
            ModelContext.ModelContext.currentDate(new Date());

            // select the node in the tree
            this._planTreeTab.selectNode(currentTimelineRecord);
        });

        // parent timeline record name
        this.parentTimelineRecordName = this.computed(() => {
            var parent: TimelineRecordViewModel.TimelineRecordViewModel = this._parentTimelineRecord();
            if (!!parent && $.isFunction(parent.name)) {
                return parent.name();
            }
        });

        // current timeline record name
        this.currentTimelineRecordName = this.computed(() => {
            var timelineRecord: TimelineRecordViewModel.TimelineRecordViewModel = this._buildDetailsContext.currentTimelineRecord();
            if (!!timelineRecord) {
                return timelineRecord.name();
            }
        });

        // current timeline record result (succeeded, failed)
        this.currentTimelineRecordResult = this.computed(() => {
            var timelineRecord: TimelineRecordViewModel.TimelineRecordViewModel = this._buildDetailsContext.currentTimelineRecord();
            if (!!timelineRecord) {
                return timelineRecord.resultString();
            }
        });

        // build reason css
        this.buildReasonCss = this.computed(() => {
            var currentBuild = this._buildDetailsContext.currentBuild();
            if (currentBuild) {
                var buildValue = currentBuild.value();
                if (buildValue) {
                    var reason = buildValue.reason;
                    if (!!reason) {
                        this.buildReasonDisplayText(BuildReason.getName(reason, true));
                        return BuildReason.getStyles(reason).join(" ");
                    }
                }
            }
        });

        // status text
        this.statusText = this.computed(() => {
            var build: BuildDetailsViewModel.BuildDetailsViewModel = this._buildDetailsContext.currentBuild();
            if (!!build) {
                return build.statusText();
            }
        });

        // status class
        this.statusClass = this.computed(() => {
            var build: BuildDetailsViewModel.BuildDetailsViewModel = this._buildDetailsContext.currentBuild();
            if (!!build) {
                switch (build.result()) {
                    case BuildContracts.BuildResult.Canceled:
                        return "buildvnext-build-canceled";
                    case BuildContracts.BuildResult.Failed:
                        return "buildvnext-build-not-succeded";
                    case BuildContracts.BuildResult.Succeeded:
                        return "buildvnext-build-succeded";
                    case BuildContracts.BuildResult.PartiallySucceeded:
                        return "buildvnext-build-partially-succeded";
                    default:
                        return "buildvnext-build-unknown";
                }
            }
        });

        // Set initial duration texts
        this.computed(() => {
            var build: BuildDetailsViewModel.BuildDetailsViewModel = this._buildDetailsContext.currentBuild();

            // if the build hasn't started yet...
            if (!!build && build.status() === BuildContracts.BuildStatus.NotStarted) {
                this.durationText(BuildResources.BuildDurationQueued);
            }

            // if a timeline record is selected, use it
            var timelineRecord: TimelineRecordViewModel.TimelineRecordViewModel = this._buildDetailsContext.currentTimelineRecord();
            if (!!timelineRecord) {
                if (!!build && build.status() !== BuildContracts.BuildStatus.Completed && build.queueStatus() === BuildContracts.DefinitionQueueStatus.Paused) {
                    this.durationText(BuildResources.DefinitionPaused);
                }
                else {
                    this.durationText(timelineRecord.durationDescription());
                }
            }
            // otherwise use the current build
            else if (!!build) {
                this.durationText(build.durationText());
            }
        });

        // Handle duration timer, keeping this separated from - initial duration texts -
        this.computed(() => {
            var timelineRecord: TimelineRecordViewModel.TimelineRecordViewModel = this._buildDetailsContext.currentTimelineRecord();
            var build: BuildDetailsViewModel.BuildDetailsViewModel = this._buildDetailsContext.currentBuild();

            if (!!timelineRecord) {
                // Timeline record is selected, clear existing timer
                clearTimeout(this._durationTimer);
                // Create new timer if timeline record has no finish time => still running
                if (!timelineRecord.finishTime()) {
                    this._durationTimer = setInterval(() => {
                        if (!!build && build.isWaitingForPipeline.peek()) {
                            this.durationText(BuildResources.WaitingForAPipeline);
                            return;
                        }

                        if (timelineRecord.state() === BuildContracts.TimelineRecordState.Pending && (timelineRecord.isJobOrPhaseNode.peek())) {
                            if (!!build && build.status.peek() !== BuildContracts.BuildStatus.Completed && build.queueStatus.peek() === BuildContracts.DefinitionQueueStatus.Paused) {
                                this.durationText(BuildResources.DefinitionPaused);
                            }
                            else {
                                this.durationText(timelineRecord.durationDescription());
                            }
                        }
                        else {
                            this.durationText(Utils_String.format(BuildCommonResources.BuildDurationInProgressQueueFormat, getDurationText(timelineRecord.startTime(), new Date()), timelineRecord.workerName()));
                        }
                    }, 1000);
                }
                // Dispose any existing subscription
                if (this._timelineDurationSubscription) {
                    this._timelineDurationSubscription.dispose();
                }
                // Subscribe to clear the timer - when that timeline record's job is finished
                this._timelineDurationSubscription = this.subscribe(timelineRecord.finishTime, (finishedTime: Date) => {
                    if (finishedTime) {
                        clearTimeout(this._durationTimer);
                    }
                });
            }
            else {
                var build = this._buildDetailsContext.currentBuild();
                if (!!build) {
                    // Timeline record is null => root node is selected => show build info, clear existing timer
                    clearTimeout(this._durationTimer);
                    // Create new timer if build is not finished
                    if (!build.finished()) {
                        this._durationTimer = setInterval(() => {
                            var buildContract = build.value();
                            var queueName: string = buildContract.queue ? buildContract.queue.name : BuildCommonResources.BuildDurationNoQueueName;
                            if (buildContract.definition.type === BuildContracts.DefinitionType.Xaml) {
                                if (buildContract.controller) {
                                    queueName = buildContract.controller.name;
                                }
                            }
                            this.durationText(getBuildDurationQueueText(build.status(), build.startTime(), new Date(), queueName));
                        }, 1000);
                    }
                    // Dispose any existing subscription
                    if (this._buildDurationSubscription) {
                        this._buildDurationSubscription.dispose();
                    }
                    // Subscribe to clear the timer - when the build is finished
                    this._buildDurationSubscription = this.subscribe(build.finished, (finished: boolean) => {
                        if (finished) {
                            clearTimeout(this._durationTimer);
                        }
                    });
                }
            }
        });

        // definition name
        this.definitionName = this.computed(() => {
            var build = this._buildDetailsContext.currentBuild();
            if (build) {
                return build.definitionName();
            }
        });

        // previous builds
        // TODO: if the build is completed, this should retrieve up to N/2 of the builds that completed after this one
        this.computed(() => {
            var projectId: string = this._projectInfo.projectId();
            var build: BuildDetailsViewModel.BuildDetailsViewModel = this._buildDetailsContext.currentBuild();

            if (projectId && build) {
                var definitionId = build.definitionId();
                var finishTime = build.finishTime();
                var previousBuildFilter: IBuildFilter = <any>{
                    project: projectId,
                    definitions: definitionId.toString(),
                    statusFilter: BuildContracts.BuildStatus.Completed,
                    maxFinishTime: finishTime,
                    $top: Histogram.BUILD_HISTOGRAM_BAR_COUNT
                };

                this._viewContext.buildClient.getBuilds(previousBuildFilter)
                    .then((result: GetBuildsResult) => {
                        // builds come back ordered by finish time descending
                        this._previousBuilds(result.builds.reverse());
                    });
            }
            else {
                this._previousBuilds([]);
            }
        });

        // histogram reactor
        this.computed(() => {
            var previousBuilds: BuildContracts.Build[] = this._previousBuilds();
            var build: BuildDetailsViewModel.BuildDetailsViewModel = this._buildDetailsContext.currentBuild();
            var currentBuildId: number = 0;
            var builds: BuildContracts.Build[] = [].concat(previousBuilds);
            if (build) {
                currentBuildId = build.id();
                // if the current build is not already in the list, just insert it, we sort them later
                if (!Utils_Array.first(builds, (b) => b.id === currentBuildId)) {
                    builds.push(build.value());
                }
            }

            let sortedBuilds = getSortedBuilds(builds);

            // for histogram in build summary page - ignore queued builds that are not running, running builds comes first and then finished builds
            builds = sortedBuilds.runningBuilds.concat(sortedBuilds.finishedBuilds) as BuildContracts.Build[];

            var buildsInfo: Histogram.BuildsInfo = new Histogram.BuildsInfo(builds.slice(0, Histogram.BUILD_HISTOGRAM_BAR_COUNT), currentBuildId);
            this.histogram.buildsInfo(buildsInfo);
        });

        // Handle cancellation timeout timer
        this.computed(() => {
            var build: BuildDetailsViewModel.BuildDetailsViewModel = this._buildDetailsContext.currentBuild();
            if (build && build.definitionType() === BuildContracts.DefinitionType.Build) {
                if (build.status() === BuildContracts.BuildStatus.Cancelling) {
                    let promise = this._viewContext.buildClient.getDefinition(build.definitionId.peek()) as IPromise<BuildContracts.BuildDefinition>;
                    promise.then((definition: BuildContracts.BuildDefinition) => {
                        let cancelTimeout = definition.jobCancelTimeoutInMinutes
                        let cancelledOn = build.lastChanged.peek();

                        // Timeline record is selected, clear existing timer
                        clearTimeout(this._cancellationTimeoutTimer);

                        this._cancellationTimeoutTimer = setInterval(() => {
                            let currentTime = new Date();
                            var diff: number = Math.abs(currentTime.valueOf() - cancelledOn.valueOf());
                            var seconds: number = diff / 1000;

                            let remainingTimeInSeconds = cancelTimeout * 60 - seconds;
                            if (remainingTimeInSeconds > 0) {
                                build.remainingCancellationTime(getDurationTextFromTime(remainingTimeInSeconds * 1000));
                            }
                            else {
                                clearTimeout(this._cancellationTimeoutTimer);
                                build.remainingCancellationTime("");
                            }
                        }, 1000);
                    });
                }
                else {
                    clearTimeout(this._cancellationTimeoutTimer);
                    build.remainingCancellationTime("");
                }
            }
        });

        this.showRealtimeConnectionErrorMessage = ko.computed(() => {
            let showConnectionError: boolean = false;
            let isConnectionError = this.realtimeConnectionError();
            if (isConnectionError) {
                let build = this._buildDetailsContext.currentBuild();
                if (!!build && build.status() !== BuildContracts.BuildStatus.Completed) {
                    showConnectionError = true;
                }
            }

            let container = $(".right-hub-content");
            if (showConnectionError) {
                container.addClass("realtime-connection-error");
            }
            else {
                container.removeClass("realtime-connection-error");
            }

            return showConnectionError;
        });
        this._addDisposable(this.showRealtimeConnectionErrorMessage);

        this._attachRealtimeEvents();
    }

    public onBuildTitleClicked() {
        this._buildDetailsContext.currentTimelineRecord(null);
        this._planTreeTab.clearSelection();
        this._detailsView.selectedTab(BuildActions.Summary);
    }

    // Gets the Details View Model for email functionality
    public getDetailsViewModel(): DetailsViewModel {
        return this._detailsView;
    }

    private _attachRealtimeEvents() {
        if (!this._eventsAttached) {
            // subscribe to timeline updates
            this._eventManager.attachEvent(BuildRealtimeEvent.TIMELINE_RECORDS_UPDATED, this._timelineRecordsUpdatedHandler);

            // subscribe to build updates
            this._eventManager.attachEvent(BuildRealtimeEvent.BUILD_UPDATED, this._buildUpdatedHandler);

            // subscribe to artifact updates
            this._eventManager.attachEvent(BuildRealtimeEvent.ARTIFACT_ADDED, this._artifactAddedHandler);

            // subscribe to information nodes
            this._eventManager.attachEvent(BuildRealtimeEvent.INFORMATION_NODES_UPDATED, this._informationNodesUpdatedHandler);

            // subscribe to change updates
            this._eventManager.attachEvent(BuildRealtimeEvent.CHANGES_CALCULATED, this._changesCalculatedHandler);

            this._eventsAttached = true;
        }
    }

    private _detachRealtimeEvents() {
        if (this._eventsAttached) {
            // unsubscribe from timeline updates
            this._eventManager.detachEvent(BuildRealtimeEvent.TIMELINE_RECORDS_UPDATED, this._timelineRecordsUpdatedHandler);

            // unsubscribe from build updates
            this._eventManager.detachEvent(BuildRealtimeEvent.BUILD_UPDATED, this._buildUpdatedHandler);

            // unsubscribe from artifact updates
            this._eventManager.detachEvent(BuildRealtimeEvent.ARTIFACT_ADDED, this._artifactAddedHandler);

            // unsubscribe from information nodes
            this._eventManager.detachEvent(BuildRealtimeEvent.INFORMATION_NODES_UPDATED, this._informationNodesUpdatedHandler);

            // unsubscribe from change updates
            this._eventManager.detachEvent(BuildRealtimeEvent.CHANGES_CALCULATED, this._changesCalculatedHandler);

            this._eventsAttached = false;
        }
    }

    private _refreshTimelineRecords(timelineRecordsEvent: BuildContracts.TimelineRecordsUpdatedEvent) {
        var currentTimeline: TimelineViewModel.TimelineViewModel = this._buildDetailsContext.currentTimeline();
        var currentBuild = this._buildDetailsContext.currentBuild();
        if (!!currentTimeline && !!currentBuild && currentBuild.id() === timelineRecordsEvent.buildId) {
            currentTimeline.updateRecords(timelineRecordsEvent.timelineRecords);
        }

        // if the current timeline record becomes abandoned, select the build node
        // this happens (for example) when the build is cancelled while viewing the console for a job has not started
        var currentTimelineRecord = this._buildDetailsContext.currentTimelineRecord.peek();
        if (currentTimelineRecord && currentTimelineRecord.abandoned.peek()) {
            this.onBuildTitleClicked();
        }
    }

    private _refreshBuild(buildEvent: BuildContracts.BuildUpdatedEvent) {
        var currentBuild: BuildDetailsViewModel.BuildDetailsViewModel = this._buildDetailsContext.currentBuild();
        if (!!currentBuild && currentBuild.id() === buildEvent.buildId) {
            currentBuild.update(buildEvent.build);
        }
    }

    private _refreshArtifacts(event: ArtifactAddedEvent) {
        var currentBuild: BuildDetailsViewModel.BuildDetailsViewModel = this._buildDetailsContext.currentBuild();
        if (!!currentBuild && currentBuild.id() === event.buildId) {
            this._viewContext.buildClient.getBuildArtifact(event.buildId, event.artifactName).then((artifact: BuildContracts.BuildArtifact) => {
                currentBuild.artifacts.push(artifact);
            });
        }
    }

    private _refreshInformationNodes(informationNodesEvent: InformationNodesUpdatedEvent) {
        var currentBuild: BuildDetailsViewModel.BuildDetailsViewModel = this._buildDetailsContext.currentBuild();
        if (!!currentBuild && currentBuild.id() === informationNodesEvent.buildId && currentBuild.definitionType() === BuildContracts.DefinitionType.Xaml) {
            currentBuild.informationNodes(informationNodesEvent.nodes);
        }
    }

    private _refreshChanges(event: BuildEvent) {
        const currentBuild: BuildDetailsViewModel.BuildDetailsViewModel = this._buildDetailsContext.currentBuild();
        if (!!currentBuild && currentBuild.id() === event.buildId) {
            this._viewContext.buildClient.getBuildChanges(event.buildId).then((changes: BuildContracts.Change[]) => {
                this.getDetailsViewModel().getBuildSummaryViewModel().setChangesAndWorkItems(changes);
            });
        }
    }

    public navigateOrRefresh(tab: string, state: any, addHistoryPointOnNavigate: boolean, addHistoryPointOnRefresh: boolean) {
        if (this.selectedTab() === tab) {
            this.selectedView().refresh();

            if (addHistoryPointOnRefresh === true) {
                this._addHistoryPoint(state);
            }
        }
        else {
            var navigating: boolean = this._navigating;

            // avoid duplicate history points
            this._navigating = true;
            this.selectedTab(tab);
            this._navigating = navigating;

            if (addHistoryPointOnNavigate === true) {
                this._addHistoryPoint(state);
            }
        }
    }

    public getNavigationState(baseState: ViewsCommon.DetailsViewNavigationState): any {
        var tabId: string = this.selectedTab();
        var selectedBuild: BuildDetailsViewModel.BuildDetailsViewModel = this._buildDetailsContext.currentBuild();
        var selectedTimeline: TimelineViewModel.TimelineViewModel = this._buildDetailsContext.currentTimeline();

        if (!baseState.action) {
            baseState.action = tabId;
        }

        if (!baseState.buildId) {
            if (!!selectedBuild) {
                baseState.buildId = selectedBuild.id();

                // there may also be a timeline specified
                if (!baseState.timelineId) {
                    if (!!selectedTimeline) {
                        baseState.timelineId = selectedTimeline.id();
                    }
                    else {
                        baseState.timelineId = null;
                    }
                }
            }
            else {
                baseState.buildId = null;
            }
        }

        return baseState;
    }

    public setNavigationState(state: ViewsCommon.DetailsViewNavigationState, performance: Performance.IScenarioDescriptor): Q.IPromise<any> {
        var deferred = Q.defer();

        this.selectedView().showErrorPanel(false);
        state = state || this.getNavigationState(<ViewsCommon.DetailsViewNavigationState>{});

        this._navigating = true;

        this._detailsView.currentState = state;

        // if a build is specified, select it
        if (!!state.buildId && state.buildId > 0) {
            Q.all([this._viewContext.buildClient.getBuild(state.buildId), this._viewContext.buildDefinitionManager.getProjectInfo()]).spread((build: BuildContracts.Build, projectInfo: VCContracts.VersionControlProjectInfo) => {
                performance.addSplitTiming("got build and project");

                this._projectInfo.update(projectInfo);

                let buildViewModel = this._buildDetailsContext.currentBuild();

                if (shouldUpdateBuildViewModel(buildViewModel, state)) {
                    buildViewModel = new BuildDetailsViewModel.BuildDetailsViewModel(build);
                    this._buildDetailsContext.currentBuild(buildViewModel);
                    performance.addSplitTiming("updated view model");
                }

                // get artifacts
                if (!build.deleted) {
                    this._viewContext.buildClient.getBuildArtifacts(state.buildId)
                        .then((artifacts: BuildContracts.BuildArtifact[]) => {
                            buildViewModel.artifacts(artifacts);
                        });
                }

                this.hideLeftPane = (buildViewModel.definitionType() === BuildContracts.DefinitionType.Xaml);
                if (!this._hideSplitterInitialized) {
                    // very first time on page load, we wouldn't have set this property yet for onNavigate on BuildDefinitionDetailsView to work
                    // so let's hide if needed to begin with
                    // splitter is shown by default, so call toggle it only if we need to hide
                    var splitter = <Splitter.Splitter>Controls.Enhancement.getInstance(Splitter.Splitter, $(".hub-content > .splitter.horizontal"));
                    if (splitter && this.hideLeftPane) {
                        splitter.toggleSplit(false);
                    }
                    this._hideSplitterInitialized = true;
                }

                // navigate to logs tab if build is xaml and not finished
                if (build.definition.type === BuildContracts.DefinitionType.Xaml &&
                    build.status != BuildContracts.BuildStatus.Completed) {
                    this._selectTab(state, true);
                }
                else {
                    this._selectTab(state);
                }
                this._navigating = false;

                deferred.resolve(null);
            },
                () => {
                    this.selectedView().showErrorPanel(true);
                    this.selectedView().errorMessage(Utils_String.format(BuildResources.BuildNotFound, state.buildId));

                    this._selectTab(state);
                    this._navigating = false;

                    deferred.resolve(null);
                });
        }
        else {
            this._selectTab(state);
            this._navigating = false;
            deferred.resolve(null);
        }

        return deferred.promise;
    }

    private _selectTab(state: ViewsCommon.DetailsViewNavigationState, isXaml = false) {
        var defaultTab = isXaml ? XamlBuildActions.Log : (state.action || BuildActions.Summary);
        if (state.tab) {
            // let's make sure the tab is available and isVisible
            let vm = this.getDetailsViewModel();
            var tabs = vm.tabs.peek();
            var requestedTab = Utils_Array.first(tabs, (tab) => {
                return tab.isVisible.peek() && Utils_String.equals(tab.id, state.tab, true);
            });
            if (requestedTab) {
                defaultTab = state.tab;
            }
        }
        this.selectedTab(defaultTab);
    }

    private _addHistoryPoint(state: any) {
        if (!this._navigating) {
            Navigation_Services.getHistoryService().addHistoryPoint(this.selectedTab(), state, null, true);
        }
    }

    private _onRealtimeStoreChanged = (): void => {
        this.realtimeConnectionError(this._realtimeStore.isErrorCondition());
    };

    public dispose(): void {
        if (this._detailsView) {
            this._detailsView.dispose();
            this._detailsView = null;
        }

        this._detachRealtimeEvents();
        if (this._realtimeStore) {
            this._realtimeStore.removeChangedListener(this._onRealtimeStoreChanged);
        }

        if (this._timelineDurationSubscription) {
            this._timelineDurationSubscription.dispose();
        }

        if (this._buildDurationSubscription) {
            this._buildDurationSubscription.dispose();
        }

        super.dispose();
    }
}

export class BuildDefinitionDetailsView extends BuildViews.BuildView {
    public static INSTANCE_NAME = "result";

    private _tfsContext: TFS_Host_TfsContext.TfsContext;
    private _viewModel: ViewModel = null;
    private _buildHub: HubBase;
    private _menuReactor: KnockoutComputed<any>;
    private _buildSubscription: IDisposable;
    private _detailsMenuBar: Menus.MenuBar;
    private _histogram: Histogram.BuildHistogramControl;
    private _viewContext: Context.ViewContext;
    private _buildDetailsContext: Context.BuildDetailsContext;
    private _timelineRecordsExist: KnockoutComputed<boolean>;

    private _reactInitialized = false;

    private _disposableManager: Utils_Core.DisposalManager;

    constructor(options?: any) {
        super($.extend({
            attachNavigate: true
        }, options));

        this._tfsContext = options.tfsContext || TFS_Host_TfsContext.TfsContext.getDefault();

        this._viewContext = options.viewContext || Context.viewContext;
        this._buildDetailsContext = options.buildDetailsContext || Context.buildDetailsContext;

        this._disposableManager = new Utils_Core.DisposalManager();
    }

    _dispose(): void {
        super._dispose();
        // Clean hub-title
        if (this._titleElement) {
            ko.cleanNode(this._titleElement[0]);
            this._titleElement.remove();
            this._titleElement = null;
        }

        if (this._detailsMenuBar) {
            this._detailsMenuBar.dispose();
            this._detailsMenuBar = null;
        }

        if (this._histogram) {
            this._histogram.dispose();
            this._histogram = null;
        }

        if (this._viewModel) {
            this._viewModel.dispose();
            this._viewModel = null;
        }

        if (this._menuReactor) {
            this._menuReactor.dispose();
            this._menuReactor = null;
        }

        if (this._buildSubscription) {
            this._buildSubscription.dispose();
            this._buildSubscription = null;
        }

        if (this._buildHub) {
            this._buildHub.stop();
            this._buildHub = null;
        }

        var timelineControl = Controls.Enhancement.getInstance(Controls.BaseControl, this.getElement().find(".timeline-grid").parents());
        if (timelineControl) {
            timelineControl.dispose();
        }

        this._disposableManager.dispose();
    }

    public initialize() {
        var performance = Performance.getScenarioManager().startScenario(BuildCustomerIntelligenceInfo.Area, "BuildDefinitionDetailsView.initialize");

        super.initialize();

        this._viewModel = new ViewModel(<PlanTree.BuildPlanNodesTreeTab>this._options.leftTree, this._viewContext, this._buildDetailsContext);
        ko.applyBindings(this._viewModel, this._element[0]);

        let detailsViewModel = this._viewModel.getDetailsViewModel();
        detailsViewModel.renderPivotView(this._element);

        // react to tab changes
        this._disposableManager.addDisposable(ko.computed({
            read: () => {
                let tabs = detailsViewModel.tabs();
                tabs.forEach((tab) => {
                    // touch the things we need to react to
                    tab.isSelected();
                    tab.isVisible();
                });
                detailsViewModel.renderPivotView(this._element);
            }
        }));

        var updatePromise = this._updateState(this._getCurrentState(), performance);

        // initialize hub
        performance.addSplitTiming("initialized connection hub");

        this._buildSubscription = this._buildDetailsContext.currentBuild.subscribe((newValue: BuildDetailsViewModel.BuildDetailsViewModel) => {
            if (newValue) {
                if (!this._buildHub) {
                    // if we're coming from a new contributed hub, we need to pull in SignalR
                    loadSignalR().then(() => {
                        this._buildHub = HubFactory.createRealTimeHub(this._viewContext.buildClient);
                        this._subscribeToProjectAndProjectCollection(newValue);
                    });
                }
                else {
                    this._subscribeToProjectAndProjectCollection(newValue);
                }
            }
        });

        // _createBuildDetailsMenuItems looks at this computed
        this._timelineRecordsExist = ko.computed({
            read: () => {
                var timeline = this._buildDetailsContext.currentTimeline();
                if (!timeline) {
                    return false;
                }
                var records = timeline.records();
                if (!records) {
                    return false;
                }
                return records.length > 0;
            }
        });

        // right pane toolbar
        var $detailsMenuBarContainer: JQuery = this._element.find("#build-detail-toolbar-container");
        var $detailsMenuBar: JQuery = $(domElem("div", "toolbar hub-pivot-toolbar"))
            .appendTo($detailsMenuBarContainer);

        this._detailsMenuBar = <Menus.MenuBar>Controls.BaseControl.createIn(Menus.MenuBar, $detailsMenuBar, {
            items: this._createBuildDetailsMenuItems(this._buildDetailsContext.currentBuild())
        });

        // menu
        this._menuReactor = ko.computed({
            read: () => {
                var currentBuild = this._buildDetailsContext.currentBuild();
                if (!currentBuild) {
                    var menuItems: any[] = this._createBuildDetailsMenuItems(currentBuild);
                    this._detailsMenuBar.updateItems(menuItems);
                }
                else {
                    if (!!this._detailsMenuBar) {
                        this._detailsMenuBar.dispose();
                        this._detailsMenuBar = null;
                    }
                    this._detailsMenuBar = <Menus.MenuBar>Controls.BaseControl.createIn(Menus.MenuBar, $detailsMenuBar, {
                        items: this._createBuildDetailsMenuItems(currentBuild),
                        contributionIds: ["ms.vss-build-web.completed-build-actions-menu"],
                        getContributionContext: () => {
                            if (!!currentBuild) {
                                return currentBuild.value();
                            }
                            else {
                                return null;
                            }
                        }
                    });
                }
            }
        });

        // histogram
        var $histogram: JQuery = this._element.find(".build-histogram");
        this._histogram = <Histogram.BuildHistogramControl>Controls.BaseControl.createIn(Histogram.BuildHistogramControl, $histogram, this._viewModel.histogram);

        // Apply hub-title
        this._titleElement = $("<div />")
            .attr("data-bind", "template: 'buildvnext_view_" + BuildDefinitionDetailsView.INSTANCE_NAME + "_hubtitle'")
            .appendTo(".hub-title.ko-target");

        ko.applyBindings(this._viewModel, this._titleElement[0]);

        performance.addSplitTiming("initialized");

        updatePromise.then(() => {
            performance.addSplitTiming("state updated");
            performance.end();
        });
    }

    public onNavigate(state: any) {
        var performance = Performance.getScenarioManager().startScenario(BuildCustomerIntelligenceInfo.Area, "BuildDefinitionDetailsView.onNavigate");
        if (this._viewModel) {
            state.hideLeftPane = this._viewModel.hideLeftPane;
        }
        super.onNavigate(state);
        this._updateState(state, performance).then(() => {
            performance.end();
        });;
    }

    public getTabs(): KnockoutPivot.PivotTab[] {
        var detailsView = this._viewModel.getDetailsViewModel();
        if (detailsView) {
            return detailsView.tabs.peek();
        }
        return [];
    }

    public _onToolbarItemClick(sender: any, args?: any) {
        var command = args.get_commandName(),
            commandArgument = args.get_commandArgument(),
            build = this._buildDetailsContext.currentBuild();
        switch (command) {
            case "build-quality":
                var quality = commandArgument.selectedQuality || "";
                if (quality !== (build.quality || "")) {
                    this._viewContext.buildClient.updateXamlBuildQuality(build.id(), quality).then(() => {
                        build.quality(quality);
                        this._updateQualityText(quality);
                    }, VSS.handleError);
                }
                break;
        }
    }

    private _subscribeToProjectAndProjectCollection(newValue: BuildDetailsViewModel.BuildDetailsViewModel): void {
        if (this._buildHub) {
            // create timer if this is a xaml build to simulate signalR updates
            this._buildHub.subscribeToBuild(newValue.projectId(), newValue.id(), newValue.definitionType.peek() === BuildContracts.DefinitionType.Xaml);

            if (ConsoleTab.PipelineQueueViewModel.canShowPipelinePlanGroupsQueuePosition() && newValue.status() === BuildContracts.BuildStatus.NotStarted) {
                this._buildHub.subscribeToCollection();
            }
        }
    }

    private _createBuildDetailsMenuItems(currentBuild: BuildDetailsViewModel.BuildDetailsViewModel): Menus.IMenuItemSpec[] {
        var menuItems: Menus.IMenuItemSpec[] = [];
        const summaryViewModel: SummaryTab.BuildSummaryViewModel = this._viewModel.getDetailsViewModel().getBuildSummaryViewModel();
        if (!!currentBuild) {
            const finished = currentBuild.finished();

            // we are not converting the new security stuff to work with knockout models.
            // if the security checks need anything else, add it to these little hacks here.
            const definitionReference = {
                id: currentBuild.definitionId.peek(),
                name: currentBuild.definitionName.peek(),
                path: currentBuild.definitionPath.peek()
            } as BuildContracts.DefinitionReference;

            const buildData = currentBuild.value();

            const log: BuildContracts.BuildLogReference = currentBuild.log();
            const downloadLogEnabled = finished && !!log;

            // check permissions if they're available
            // they are not available until the data provider is available
            // if the data provider is not here, err on the side of permissiveness
            // the server will do the right thing
            const userId = getPageContext().webContext.user.id;
            const permissionsAvailable = contributionExists("ms.vss-build-web.build-detail-data-provider");

            const cancelDisabled = currentBuild.status() === BuildContracts.BuildStatus.Cancelling || !permissionsAvailable || !canCancelBuild(userId, buildData);
            const queueDisabled = permissionsAvailable && !hasDefinitionPermission(definitionReference, BuildPermissions.QueueBuilds);

            // disable edit for XAML or if the user can't see the edit route
            // if the user doesn't have edit, but they can see the route (i.e. they are authenticated) then they can view the editor but it won't let them save
            const editDisabled = currentBuild.definitionType() === BuildContracts.DefinitionType.Xaml || !BuildLinks.getEditDefinitionUrl(currentBuild.definitionId.peek());
            if (!editDisabled) {
                menuItems.push({
                    id: "edit-build-definition",
                    title: BuildResources.BuildDetailViewEditDefinitionButtonText,
                    text: BuildResources.BuildDetailViewEditDefinitionButtonText,
                    setTitleOnlyOnOverflow: true,
                    showText: true,
                    icon: "bowtie-icon bowtie-edit-outline",
                    action: () => {
                        Context.viewContext.editDefinition(currentBuild.definitionId.peek());
                    }
                });
            }

            if (!finished && !cancelDisabled) {
                menuItems.push({
                    id: "cancel-build",
                    title: BuildResources.CancelBuild,
                    text: BuildResources.CancelBuild,
                    setTitleOnlyOnOverflow: true,
                    icon: "icon-tfs-build-status-canceled",
                    showText: true,
                    action: () => {
                        this._cancelBuildAction();
                    },
                });
            }

            if (!queueDisabled) {
                const queueNewBuildButton: Menus.IMenuItemSpec = {
                    id: "queue-new-build",
                    title: BuildResources.QueueNewBuildMenuItemText,
                    text: BuildResources.QueueNewBuildMenuItemText,
                    setTitleOnlyOnOverflow: true,
                    showText: true,
                    icon: "bowtie-icon bowtie-build-queue-new",
                    action: () => {
                        let definitionModel = Context.definitionContext.selectedDefinition();
                        let currentDefinitionId = currentBuild.definitionId.peek();
                        let performance = Performance.getScenarioManager().startScenario(BuildCustomerIntelligenceInfo.Area, "QueueBuild");

                        // There is no guarantee that current definition matches with current build, so check ID too
                        if (!definitionModel || (definitionModel && definitionModel.id() !== currentDefinitionId)) {
                            let definitionPromise: IPromise<BuildContracts.DefinitionReference> = null;
                            if (currentBuild.definitionType.peek() === BuildContracts.DefinitionType.Xaml) {
                                definitionPromise = this._viewContext.buildDefinitionManager.getXamlDefinition(currentDefinitionId);
                            }
                            else {
                                definitionPromise = this._viewContext.buildDefinitionManager.getDefinition(currentDefinitionId);
                            }

                            definitionPromise.then((definition: BuildContracts.DefinitionReference) => {
                                performance.addSplitTiming("retrieved definition");

                                this._viewContext.queueBuild(new BaseDefinitionModel.BaseDefinitionModel(definition), performance, Telemetry.Sources.ResultView).then(() => {
                                    performance.end();
                                });
                            });
                        }
                        else {
                            this._viewContext.queueBuild(definitionModel, performance, Telemetry.Sources.ResultView).then(() => {
                                performance.end();
                            });
                        }
                    }
                };

                if (FeatureAvailability_Services.FeatureAvailabilityService.isFeatureEnabled(ServerConstants.FeatureAvailabilityFlags.WebAccessBuildDiagnosticLogs, false) && currentBuild.definitionType.peek() !== BuildContracts.DefinitionType.Xaml) {
                    queueNewBuildButton.splitDropOptions = {
                        id: "queue-new-build-dropdown",
                        title: "See queue options", //WorkItemTrackingResources.MoreSaveOptions
                    };

                    queueNewBuildButton.childItems = [{
                        id: "queue-new-build-diagnostic-logs",
                        text: BuildResources.QueueNewBuildWithDiagnosticLogsMenuItemText,
                        title: BuildResources.QueueNewBuildWithDiagnosticLogsMenuItemText,
                        showText: true,
                        hidden: false,
                        icon: "bowtie-icon bowtie-build-queue-new",
                        action: () => {
                            // Setup variables for diagnostic logs
                            const queueTimeVariables: QueueDefinitionDialog.QueueTimeBuildDefinitionVariableViewModel[] = this._getDiagnosticLogVariables();

                            // Continue with the same code used in the normal queue button
                            let definitionModel = Context.definitionContext.selectedDefinition();
                            let currentDefinitionId = currentBuild.definitionId.peek();
                            let performance = Performance.getScenarioManager().startScenario(BuildCustomerIntelligenceInfo.Area, "QueueBuild");

                            // There is no guarantee that current definition matches with current build, so check ID too
                            if (!definitionModel || (definitionModel && definitionModel.id() !== currentDefinitionId)) {
                                const definitionPromise: IPromise<BuildContracts.DefinitionReference> = this._viewContext.buildDefinitionManager.getDefinition(currentDefinitionId);
                                definitionPromise.then((definition: BuildContracts.DefinitionReference) => {
                                    performance.addSplitTiming("retrieved definition");

                                    this._viewContext.queueBuild(new BaseDefinitionModel.BaseDefinitionModel(definition), performance, Telemetry.Sources.ResultView, queueTimeVariables).then(() => {
                                        performance.end();
                                    });
                                });
                            }
                            else {
                                this._viewContext.queueBuild(definitionModel, performance, Telemetry.Sources.ResultView, queueTimeVariables).then(() => {
                                    performance.end();
                                });
                            }
                        }
                    }];
                }

                menuItems.push(queueNewBuildButton);
            }

            menuItems.push({
                id: "download-log-zip",
                title: BuildResources.BuildDetailViewDownloadLogs,
                text: BuildResources.BuildDetailViewDownloadLogs,
                setTitleOnlyOnOverflow: true,
                showText: true,
                icon: "bowtie-icon bowtie-transfer-download ",
                disabled: !(downloadLogEnabled && (currentBuild.definitionType() === BuildContracts.DefinitionType.Build ? this._timelineRecordsExist() : true)),
                action: () => {
                    let isXamlBuild = (currentBuild && currentBuild.definitionType.peek()) === BuildContracts.DefinitionType.Xaml;

                    if (Utils_String.localeIgnoreCaseComparer(log.type, ArtifactResourceTypes.Container) === 0) {
                        Events_Action.getService().performAction(Events_Action.CommonActions.ACTION_WINDOW_OPEN, {
                            url: log.url + "?$format=zip" + (isXamlBuild ? "&api-version=2.0" : ""),
                            target: "_blank"
                        });
                    }
                    else if (Utils_String.localeIgnoreCaseComparer(log.type, ArtifactResourceTypes.FilePath) === 0) {
                        if (confirm(Utils_String.format(BuildResources.OpenDropLocation, log.url))) {
                            // attempt to copy the location to the clipboard
                            Utils_Clipboard.copyToClipboard(log.url);
                        }
                    }
                }
            });

            const emailBuildSummaryEnabled = FeatureAvailability_Services.FeatureAvailabilityService.isFeatureEnabled(ServerConstants.FeatureAvailabilityFlags.WebAccessBuildvNextEmailBuildSummary, false);

            // If the feature flag is on, then use the new email feature, otherwise don't add this menu item
            if (emailBuildSummaryEnabled) {
                menuItems.push({
                    id: "email-build-summary",
                    title: BuildResources.BuildSummarySendEmail,
                    text: BuildResources.BuildSummarySendEmail,
                    setTitleOnlyOnOverflow: true,
                    showText: true,
                    icon: "bowtie-icon bowtie-mail-message",
                    action: () => {
                        // Launch the Share Dialog to send email
                        EmailBuildSummaryDialogModel.openShareDialog(currentBuild, summaryViewModel);
                        return false;
                    }
                });
            }

            if (finished && !currentBuild.deleted()) {
                let retainText = "";
                let icon = "bowtie-icon ";
                const isAlreadyRetainedByBuild = currentBuild.keepForever();
                if (isAlreadyRetainedByBuild) {
                    retainText = BuildResources.StopRetainingIndefinitely;
                    icon += "bowtie-security-lock";
                }
                else {
                    retainText = BuildResources.BuildRetainText;
                    icon += "bowtie-security-lock-fill";
                }

                if (!permissionsAvailable || canRetainBuild(definitionReference)) {
                    menuItems.push({
                        id: "retain-build-summary",
                        title: retainText,
                        text: retainText,
                        setTitleOnlyOnOverflow: true,
                        showText: true,
                        icon: icon,
                        action: () => {
                            Context.viewContext.buildClient.updateBuildRetainFlag(currentBuild.id(), !isAlreadyRetainedByBuild).then(null, VSS.handleError);
                        }
                    });
                }
            }

            if (currentBuild.definitionType() === BuildContracts.DefinitionType.Xaml) {
                var qualities = this._viewContext.xamlQualities.peek();
                menuItems = menuItems.concat(this._getXamlMenuItems(currentBuild, qualities));
            }
        }

        return menuItems;
    }

    private _getDiagnosticLogVariables(): QueueDefinitionDialog.QueueTimeBuildDefinitionVariableViewModel[] {
        const systemDebugVariable = new QueueDefinitionDialog.QueueTimeBuildDefinitionVariableViewModel(new BuildVariables.DefinitionVariable("system.debug", "true"), false);
        const agentDiagnosticVariable = new QueueDefinitionDialog.QueueTimeBuildDefinitionVariableViewModel(new BuildVariables.DefinitionVariable("agent.diagnostic", "true"), false);

        const queueTimeVariables: QueueDefinitionDialog.QueueTimeBuildDefinitionVariableViewModel[] = [];
        queueTimeVariables.push(systemDebugVariable);
        queueTimeVariables.push(agentDiagnosticVariable);

        return queueTimeVariables;
    }

    private _updateState(state: any, performance: Performance.IScenarioDescriptor): Q.IPromise<any> {
        if (!!this._viewModel && !!state) {
            return this._viewModel.setNavigationState(state, performance);
        }
        else {
            return Q(null);
        }
    }

    private _cancelBuildAction(): void {
        var currentBuild = this._buildDetailsContext.currentBuild();
        if (confirm(Utils_String.format(BuildResources.ConfirmCancelBuild, currentBuild.buildNumber()))) {
            this._viewContext.buildClient.cancelBuild(currentBuild.id()).then(null, VSS.handleError);
        }
    }

    private _updateQualityText(quality) {
        var qualityItem = this._detailsMenuBar.getItem("build-qualities");
        if (qualityItem) {
            qualityItem.updateText(quality || BuildCommonResources.BuildDetailViewNoQualityAssignedText);
        }
    }

    private _getXamlMenuItems(currentBuild: BuildDetailsViewModel.BuildDetailsViewModel, qualities: string[]) {
        var menuItems: any[] = [];
        var existingQuality = currentBuild.quality() || BuildCommonResources.BuildDetailViewNoQualityAssignedText;
        if (currentBuild.finished()) {
            menuItems.push({
                id: "build-qualities",
                title: existingQuality,
                text: existingQuality,
                setTitleOnlyOnOverflow: true,
                showText: true,
                showIcon: false,
                noIcon: true,
                childItems: Xaml.convertQualitiesToMenuItems(qualities)
            });
        }
        menuItems.push({
            id: "manage-build-qualities",
            title: BuildResources.ManageBuildQualitiesToolbarText,
            text: BuildResources.ManageBuildQualitiesToolbarText,
            setTitleOnlyOnOverflow: true,
            showText: true,
            showIcon: false,
            noIcon: true,
            action: () => {
                XamlBuildControls.BuildDialogs.manageXamlQualities({
                    tfsContext: this._tfsContext,
                    okCallback: (buildQualityInfo: any) => {
                        this._updateBuildQualities(buildQualityInfo);
                    },
                    qualities: ko.utils.arrayPushAll([], this._viewContext.xamlQualities.peek())
                });
            }
        });

        return menuItems;
    }

    private _updateBuildQualities(buildQualityInfo: any) {
        var itemsAdded = buildQualityInfo.pendingAdds;
        var itemsRemoved = buildQualityInfo.pendingDeletes
        this._viewContext.buildClient.updateXamlQualities(itemsAdded, itemsRemoved).then(() => {
            this._viewContext.xamlQualities(buildQualityInfo.sourceList || []);
        });

    }
}

export class EmailBuildSummaryDialogModel extends AdminSendMail.SendMailDialogModel {

    private _currentBuild: BuildDetailsViewModel.BuildDetailsViewModel;
    private _summaryViewModel: SummaryTab.BuildSummaryViewModel;
    private _buildEmailMessageParams: { buildId: number };

    /// declare our constructor
    constructor(currentBuild: BuildDetailsViewModel.BuildDetailsViewModel, summaryViewModel: SummaryTab.BuildSummaryViewModel, options?) {
        super($.extend({
            title: BuildResources.BuildSummarySendEmail,
            useIdentityPickerForTo: true,
            defaultToStringAllowsMultipleRecipients: true,
            useCommonIdentityPicker: true
        }, options));

        this._currentBuild = currentBuild;
        this._summaryViewModel = summaryViewModel;
    }

    /// This method does all of the initialzation for the SendMail dialog, by preparing the HTML and send to recipients.
    public initializeModelData(successCallback: (...args: any[]) => any, errorCallback?: (...args: any[]) => any) {
        var subject: string;
        var buildId = this._currentBuild.id.peek();

        // get the unique list of recipients
        this.setDefaultSendToList(this.getUniqueRecipients(this._summaryViewModel.changes()).join(';'));

        //// Define the subject
        subject = Utils_String.format(BuildResources.HyphenSeperatedText, this._currentBuild.buildNumber(), this._currentBuild.statusText());
        this.setValue(AdminSendMail.SendMailDialogModel.SUBJECT_FIELD, subject);

        Context.viewContext.buildClient.getBuildReport(buildId).then((report) => {
            this.setValue(AdminSendMail.SendMailDialogModel.READ_ONLY_BODY_FIELD, report.content, true);
            this._buildEmailMessageParams = {
                buildId: buildId
            };
            this._initializedData(successCallback);
        }, (error) => {
            VSS.handleError(error);
        });
    }

    public getMessageParams() {
        return $.extend(super.getMessageParams(), this._buildEmailMessageParams);
    }

    private _initializedData(successCallback: (...args: any[]) => any) {
        // Only start tracking dirty state when we are fully initialized.
        this._trackDirtyState = true;
        // call the success callback
        if ($.isFunction(successCallback)) {
            successCallback();
        }
    }

    public getEndPoint(): string {
        var tfsContext = TFS_Host_TfsContext.TfsContext.getDefault();
        return tfsContext.getActionUrl("sendMail", "build", { project: tfsContext.navigation.projectId, area: "api" });
    }

    /// gets the unique recipients from the changes for the build
    private getUniqueRecipients(changes: SummaryTab.ChangeModel[]): string[] {
        // create a temporary dictionary using the unique name as the key
        var temp = {};

        // walk through each of the changes and put into a unique list
        for (var c = 0; c < changes.length; c++) {
            temp[changes[c].change().author.uniqueName] = true;
        }

        // now push those into a return string array
        var returnRecipients: string[] = [];
        for (var k in temp) {
            returnRecipients.push(k);
        }

        // return the string array of unique recipients to the caller
        return returnRecipients;
    }

    /// called when the defaultTo is set in the initialization
    public setDefaultToState() {
        // not implemented
    }

    /// Declare our static launcher method
    public static openShareDialog(currentBuild: BuildDetailsViewModel.BuildDetailsViewModel, summaryViewModel: SummaryTab.BuildSummaryViewModel, options?: any) {
        AdminSendMail.Dialogs.sendMail(new EmailBuildSummaryDialogModel(currentBuild, summaryViewModel));
        return false;
    }
}

export function shouldUpdateBuildViewModel(buildViewModel: BuildDetailsViewModel.BuildDetailsViewModel, state: ViewsCommon.DetailsViewNavigationState): boolean {
    // buildId is received as a string in state
    return !buildViewModel || buildViewModel.id.peek() !== parseInt(state.buildId + "");
}

BuildViews.buildViewUtils.registerBuildView(ViewsCommon.BuildViewType.Result, BuildDefinitionDetailsView);

// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("Views.Details", exports);
