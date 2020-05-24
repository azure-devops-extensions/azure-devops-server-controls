/// <reference types="jquery" />

import ko = require("knockout");
import Q = require("q");

import BuildDetails = require("Build/Scripts/BuildDetails");
import Context = require("Build/Scripts/Context");
import { ContributionHelper, WellKnownContributionData } from "Build/Scripts/Contribution";
import { getContributionsForTarget, contributionExists } from "Build/Scripts/Contributions";
import { TagsControl, TagsViewModel } from "Build/Scripts/Controls.Tags";
import Extensibility = require("Build/Scripts/Extensibility");
import BuildDetailsViewModel = require("Build/Scripts/Models.BuildDetailsViewModel");
import BuildRequestValidationResult = require("Build/Scripts/Models.BuildRequestValidationResult");
import TimelineRecordViewModel = require("Build/Scripts/Models.TimelineRecordViewModel");
import BuildResources = require("Build/Scripts/Resources/TFS.Resources.Build");
import ViewsCommon = require("Build/Scripts/Views.Common");
import Information = require("Build/Scripts/Xaml.Information");

import { BuildActions, BuildLinks } from "Build.Common/Scripts/Linking";

import DTConstants = require("Presentation/Scripts/TFS/Generated/TFS.DistributedTask.Constants");
import ServerConstants = require("Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants");

import BuildContracts = require("TFS/Build/Contracts");
import DistributedTaskContracts = require("TFS/DistributedTask/Contracts");
import TMContracts = require("TFS/TestManagement/Contracts");
import VCContracts = require("TFS/VersionControl/Contracts");

import VCLegacyContracts = require("VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts");
import VCResources = require("VersionControl/Scripts/Resources/TFS.Resources.VersionControl");

import Adapters_Knockout = require("VSS/Adapters/Knockout");
import Ajax = require("VSS/Ajax");
import { Contribution } from "VSS/Contributions/Contracts";
import Diag = require("VSS/Diag");
import { getService as getEventService } from "VSS/Events/Services";
import FeatureAvailability_Services = require("VSS/FeatureAvailability/Services");
import Navigation_Services = require("VSS/Navigation/Services");
import Service = require("VSS/Service");
import Utils_Array = require("VSS/Utils/Array");
import Utils_Date = require("VSS/Utils/Date");
import Utils_String = require("VSS/Utils/String");
import { using, handleError } from "VSS/VSS";
import { hasDefinitionPermission } from "./Security";
import { BuildPermissions } from "../../Build.Common/Scripts/Generated/TFS.Build2.Common";

var __tagControl: TagsControl = null;

export class BuildSummaryTab extends BuildDetails.BuildDetailsTab {
    public summary: BuildSummaryViewModel;

    constructor(viewContext: Context.ViewContext, buildDetailsContext: Context.BuildDetailsContext) {
        super(BuildActions.Summary, BuildResources.BuildDetailSummaryTitle, "buildvnext_details_summary_tab");

        this.summary = new BuildSummaryViewModel(viewContext, buildDetailsContext);

        // this tab is visible when no timeline record is selected
        this.subscribe(buildDetailsContext.currentTimelineRecord, (newValue: TimelineRecordViewModel.TimelineRecordViewModel) => {
            this.visible(!newValue);
        });

        this.computed(() => {
            this.summary.isSelected(this.isSelected());
        });

        this.computed(() => {
            var currentBuild = buildDetailsContext.currentBuild();
            this.summary.currentBuild(currentBuild);
        });

        this._addDisposable(this.summary);
    }

    public dispose(): void {
        super.dispose();

        this.summary = null;
    }
}

export class BuildSummaryViewModel extends Adapters_Knockout.TemplateViewModel {
    public currentBuild: KnockoutObservable<BuildDetailsViewModel.BuildDetailsViewModel> = ko.observable(null);

    public definitionName: KnockoutComputed<string>;
    public sourceBranch: KnockoutComputed<string>;
    public sourceVersion: KnockoutComputed<string>;
    public requestedBy: KnockoutComputed<string>;
    public triggeredBy: KnockoutComputed<string>;
    public triggeredByUri: KnockoutComputed<string>;
    public triggeredByLabel: KnockoutComputed<string>;
    public startTime: KnockoutComputed<Date>;
    public finishTime: KnockoutComputed<Date>;
    public queueTime: KnockoutComputed<Date>;
    public deleted: KnockoutComputed<boolean>;
    public dateDeleted: KnockoutComputed<Date>;
    public deletedBy: KnockoutComputed<string>;
    public deletedReason: KnockoutComputed<string>;
    public definitionSummaryUrl: KnockoutComputed<string>;
    public definitionEditUrl: KnockoutComputed<string>;
    public definitionNameEditLabel: KnockoutComputed<string>;
    public retainStateText: KnockoutComputed<string>;
    public sourceBranchUrl: KnockoutComputed<string>;
    public sourceVersionUrl: KnockoutComputed<string>;
    public queueName: KnockoutComputed<string>;
    public queueManageLink: KnockoutComputed<string>;
    public queueManageLabel: KnockoutComputed<string>;

    public isSelected: KnockoutObservable<boolean> = ko.observable(false);

    public changes: KnockoutObservableArray<ChangeModel> = ko.observableArray(<ChangeModel[]>[]);
    public changesLoaded: KnockoutObservable<boolean> = ko.observable(false);
    public changesMessage: KnockoutObservable<string> = ko.observable("");

    public deploymentsLoaded: KnockoutObservable<boolean> = ko.observable(false);
    public canShowDeployments: KnockoutComputed<boolean>;
    public deploymentBuilds: KnockoutObservableArray<DeploymentBuildViewModel> = ko.observableArray(<DeploymentBuildViewModel[]>[]);
    public deploymentDeploys: KnockoutObservableArray<BuildContracts.DeploymentDeploy> = ko.observableArray(<BuildContracts.DeploymentDeploy[]>[]);
    public deploymentTests: KnockoutObservableArray<TestRunViewModel> = ko.observableArray(<TestRunViewModel[]>[]);

    public diagnosticLogsLoaded: KnockoutObservable<boolean> = ko.observable(false);
    public diagnosticLogs: KnockoutObservableArray<DiagnosticViewModel> = ko.observableArray(<DiagnosticViewModel[]>[]);
    public canShowDiagnosticLogs: KnockoutComputed<boolean>;

    public workItems: KnockoutObservableArray<WorkItemViewModel> = ko.observableArray(<WorkItemViewModel[]>[]);
    public workItemsLoaded: KnockoutObservable<boolean> = ko.observable(false);
    public workItemsMessage: KnockoutObservable<string> = ko.observable("");

    public codeCoverages: KnockoutObservableArray<BuildCoverageViewModel> = ko.observableArray(<BuildCoverageViewModel[]>[]);
    public codeCoverageSummaries: KnockoutObservableArray<BuildCoverageSummaryViewModel> = ko.observableArray(<BuildCoverageSummaryViewModel[]>[]);
    public codeCoveragesLoaded: KnockoutObservable<boolean> = ko.observable(false);
    public codeCoveragesMessage: KnockoutObservable<string> = ko.observable("");

    public sourceBranchLabel: KnockoutComputed<string>;
    public linkSourceVersion: KnockoutComputed<boolean>;

    public jobs: KnockoutObservableArray<JobViewModel> = ko.observableArray([]);

    public tagsViewModel: TagsViewModel = new TagsViewModel();

    public validationResults: KnockoutComputed<BuildRequestValidationResult.BuildRequestValidationResult[]>;
    public hasValidationResults: KnockoutComputed<boolean>;

    public xamlBuildIssues: KnockoutObservableArray<IssueViewModel> = ko.observableArray([]);
    public xamlBuildIssuesTruncated: KnockoutObservable<boolean> = ko.observable(false);
    public hasIssues: KnockoutComputed<boolean>;
    public canShowIssues: KnockoutComputed<boolean>;

    public canShowTags: KnockoutComputed<boolean>;
    public canEditDefinition: KnockoutComputed<boolean>;
    public canShowSourceBranch: KnockoutComputed<boolean>;

    public sections: KnockoutObservableArray<Extensibility.SummarySection> = ko.observableArray([]);

    public canLinkSourceBranch: KnockoutComputed<boolean>;

    private _sourceProviderInitialized: KnockoutObservable<boolean> = ko.observable(false);
    private _currentBuildId: KnockoutObservable<number> = ko.observable(-1);
    // Build's finished computed depends on status and finishtime observables, to trigger build finish only once this is used
    private _currentBuildFinished = false;

    private _informationNodesPromise: IPromise<BuildContracts.InformationNode[]>;
    private _xamlWITPromise: IPromise<BuildContracts.InformationNode[]>;

    private _sectionFactory: Extensibility.SectionFactory;

    private _viewContext: Context.ViewContext;
    private _buildDetailsContext: Context.BuildDetailsContext;

    private _codeCoverageSummary: KnockoutObservable<TMContracts.CodeCoverageSummary> = ko.observable(null);

    private _contributionPromise: IPromise<Contribution[]>;

    private _customSectionsInitializedForBuild: IDictionaryNumberTo<boolean> = {};
    private _contributedSectionsInitialized = false;

    constructor(viewContext: Context.ViewContext, buildDetailsContext: Context.BuildDetailsContext) {
        super();

        this._viewContext = viewContext;
        this._buildDetailsContext = buildDetailsContext;
        // create section factory first
        this._sectionFactory = new Extensibility.SectionFactory();

        this._contributionPromise = getContributionsForTarget(viewContext.tfsContext, WellKnownContributionData.ResultsViewSummaryTab);

        // notify when source provider manager is initialized
        this._viewContext.sourceProviderManager.waitForInitialized().then(() => {
            this._sourceProviderInitialized(true);
        });

        this.definitionName = this.computed(() => {
            let build = this.currentBuild();
            if (build) {
                return build.definitionName();
            }
        });

        // definition summary url, so users can open in a new tab
        this.definitionSummaryUrl = this.computed(() => {
            let build = this.currentBuild();
            if (build) {
                return BuildLinks.getDefinitionLink(build.definitionId());
            }
        });

        // definition edit url, so users can open in a new tab
        this.definitionEditUrl = this.computed(() => {
            let build = this.currentBuild();
            if (build) {
                return BuildLinks.getDefinitionEditorLink(build.definitionId());
            }
        });

        this.definitionNameEditLabel = this.computed(() => {
            return Utils_String.format(BuildResources.EditDefinitionPageTitleFormat, this.definitionName());
        });

        this.queueName = this.computed(() => {
            const build = this.currentBuild();
            if (build) {
                const isXaml = build.definitionType() === BuildContracts.DefinitionType.Xaml;
                if (isXaml) {
                    // return empty string so that template won't be showing row for queue if it's xaml
                    return "";
                }

                const queue = build.queue();
                if (queue) {
                    return queue.name;
                }
            }
        });

        this.queueManageLink = this.computed(() => {
            const build = this.currentBuild();
            if (build) {
                const queue = build.queue();
                if (queue) {
                    return BuildLinks.getQueueLink(queue.id);
                }
            }
        });

        this.queueManageLabel = this.computed(() => {
            return Utils_String.format(BuildResources.ManageQueueLinkText, this.queueName());
        });

        this.sourceBranch = this.computed(() => {
            let build = this.currentBuild();
            if (build) {
                // getSourceBranch has a default value for when the provider is not initialized, but we need to ensure it's reevaluated when it becomes initialized
                this._sourceProviderInitialized();
                return this._viewContext.sourceProviderManager.getSourceBranch(build.value());
            }
        });

        // The source branch can change which means the label should react to the change
        this.sourceBranchLabel = this.computed(() => {
            let build = this.currentBuild();
            if (build) {
                // getSourceBranchLabel has a default value for when the provider is not initialized, but we need to ensure it's reevaluated when it becomes initialized
                this._sourceProviderInitialized();

                let repositoryType = build.repositoryType.peek();
                let sourceBranch = build.sourceBranch();
                return this._viewContext.sourceProviderManager.getSourceBranchLabel(repositoryType, sourceBranch);
            }
        });

        // the source branch url, so users can open in a new tab
        this.sourceBranchUrl = this.computed(() => {
            let build = this.currentBuild();
            if (build) {
                return this._viewContext.sourceProviderManager.getSourceBranchLink(this._viewContext.tfsContext, build.projectId(), build.repositoryId(), build.repositoryType(), build.sourceBranch());
            }
        });

        this.sourceVersion = this.computed(() => {
            let build = this.currentBuild();
            if (build && this._sourceProviderInitialized()) {
                // getSourceVersionText has a default value for when the provider is not initialized, but we need to ensure it's reevaluated when it becomes initialized
                this._sourceProviderInitialized();

                // touching these observables to make sure this changes, since we pass the raw contract to the source provider
                let sourceVersion = build.sourceVersion();
                let sourceBranch = build.sourceBranch();

                return this._viewContext.sourceProviderManager.getSourceVersionText(build.value());
            }
        });

        // the source version url, so users can open in a new tab
        this.sourceVersionUrl = this.computed(() => {
            let build = this.currentBuild();
            if (build) {
                return this._viewContext.sourceProviderManager.getSourceVersionLink(this._viewContext.tfsContext, build.value());
            }
        });

        this.requestedBy = this.computed(() => {
            var build = this.currentBuild();
            if (build) {
                var requestedBy = build.requestedBy();
                var requestedFor = build.requestedFor();

                if (Utils_String.localeIgnoreCaseComparer(requestedBy, requestedFor) === 0) {
                    return requestedBy;
                }
                else {
                    return Utils_String.format(BuildResources.BuildSummaryRequestedByFormat, requestedBy, requestedFor);
                }
            }
        });

        this.triggeredBy = this.computed(() => {
            var build = this.currentBuild();
            if (build) {
                return build.triggeredBy();
            }

            return "";
        });

        this.triggeredByUri = this.computed(() => {
            var build = this.currentBuild();
            if (build && build.value() && build.value().triggeredByBuild) {
                return BuildLinks.getBuildDetailLink(build.value().triggeredByBuild.id);
            }

            return "";
        });

        this.triggeredByLabel = this.computed(() => {
            var build = this.currentBuild();
            if (build) {
                return Utils_String.format(BuildResources.BuildDetailLinkTooltip, build.triggeredBy());
            }

            return "";
        });

        this.startTime = this.computed(() => {
            var build = this.currentBuild();
            if (build) {
                var startTime = build.startTime();
                if (startTime) {
                    return Utils_Date.localeFormat(startTime, "f");
                }
            }

            return "";
        });

        this.finishTime = this.computed(() => {
            var build = this.currentBuild();
            if (build) {
                var finishTime = build.finishTime();
                if (finishTime) {
                    return Utils_Date.localeFormat(finishTime, "f");
                }
            }

            return "";
        });

        this.queueTime = this.computed(() => {
            var build = this.currentBuild();
            if (build) {
                var queueTime = build.queueTime();
                if (queueTime) {
                    return Utils_Date.localeFormat(queueTime, "f");
                }
            }

            return "";
        });

        this.deleted = this.computed(() => {
            var build = this.currentBuild();
            if (build) {
                return build.deleted();
            }

            return false;
        });

        this.dateDeleted = this.computed(() => {
            var build = this.currentBuild();
            if (build && build.deleted()) {
                var dateDeleted = build.dateDeleted();
                if (dateDeleted) {
                    return Utils_Date.localeFormat(dateDeleted, "f");
                }
            }

            return "";
        });

        this.deletedBy = this.computed(() => {
            var build = this.currentBuild();
            if (build && build.deleted()) {
                return build.deletedBy() || "";
            }

            return "";
        });

        this.deletedReason = this.computed(() => {
            var build = this.currentBuild();
            if (build && build.deleted()) {
                return build.deletedReason() || "";
            }

            return "";
        });

        // load commits and associated workitems when the tab becomes selected
        this.computed(() => {
            var currentBuild = this.currentBuild();
            if (!currentBuild) {
                this.changesLoaded(true);
                this.workItemsLoaded(true);
            }
            else {
                const selected = this.isSelected();
                const buildId = currentBuild.id();

                if (selected && this._currentBuildId.peek() !== buildId) {
                    const cleanSections = this._currentBuildId.peek() != -1;
                    this._currentBuildId(buildId);
                    this._currentBuildFinished = false;

                    if (cleanSections) {
                        // clean sections
                        this._createWellKnownSections(true);
                        this._contributedSectionsInitialized = false;
                    }

                    this._loadAssociatedChangesAndWorkItems();

                    const definitionReference = {
                        id: currentBuild.definitionId.peek(),
                        name: currentBuild.definitionName.peek(),
                        path: currentBuild.definitionPath.peek()
                    } as BuildContracts.DefinitionReference;

                    // check permissions if they're available
                    // they are not available until the data provider is available
                    // if the data provider is not here, err on the side of permissiveness
                    // the server will do the right thing
                    const permissionsAvailable = contributionExists("ms.vss-build-web.build-detail-data-provider");
                    if (permissionsAvailable) {
                        this.tagsViewModel.setReadOnly(!hasDefinitionPermission(definitionReference, BuildPermissions.EditBuildQuality));
                    }
                    this.tagsViewModel.tags(currentBuild.tags() || []);
                }
            }
        });

        this.linkSourceVersion = this.computed(() => {
            var build = this.currentBuild();
            if (build && this._sourceProviderInitialized()) {
                return this._viewContext.sourceProviderManager.canLinkChange(build.repositoryType());
            }
            else {
                return false;
            }
        });

        this.canLinkSourceBranch = this.computed(() => {
            var build = this.currentBuild();
            if (build && this._sourceProviderInitialized()) {
                return this._viewContext.sourceProviderManager.canLinkBranch(build.repositoryType());
            }
            else {
                return false;
            }
        });

        // reactor for build when it's finished
        this.computed(() => {
            var currentBuild = this.currentBuild();
            var currentBuildId = this._currentBuildId();
            if (currentBuild && currentBuild.id.peek() === currentBuildId) {
                if (!this._customSectionsInitializedForBuild[currentBuildId] && currentBuild.finished() && !this._currentBuildFinished) {
                    this._currentBuildFinished = true;
                    this._loadCustomSections(currentBuild);
                    this._loadBuildRelatedSections(currentBuild);
                    this._customSectionsInitializedForBuild[currentBuildId] = true;
                }
            }
        });

        // react for build timeline records
        this.computed(() => {
            const timeline = this._buildDetailsContext.currentTimeline();
            if (timeline) {
                // react to any kind of record updates
                timeline.updateRecordNodes();
                const timelineContract = timeline.getTimeline();
                const timelineRecords = (timelineContract && timelineContract.records) || [];
                this._loadContributedSections(timelineRecords);
            }
        });

        // reactor for build and current timeline
        this.computed(() => {
            var build = this.currentBuild();
            var timeline = this._buildDetailsContext.currentTimeline();

            var previousJobs = this.jobs.peek();

            if (!build || !timeline) {
                this.jobs([]);
            }
            else {
                let jobs: JobViewModel[] = [];

                timeline.records().forEach((record) => {
                    if (!record.parentId()) {
                        jobs.push(new JobViewModel(build, record, this._viewContext));
                    }
                });

                this.jobs(jobs);
            }

            // dispose previous job models
            $.each(previousJobs, (index: number, job: JobViewModel) => {
                job.dispose();
            });
        });

        this.hasIssues = this.computed(() => {
            var result: boolean = false;

            $.each(this.jobs(), (index: number, job: JobViewModel) => {
                result = job.hasIssues() || result;
            });

            return result;
        });

        this.retainStateText = this.computed(() => {
            var build = this.currentBuild();
            let state = BuildResources.BuildNotRetainedText;
            if (build) {
                if (build.keepForever()) {
                    if (build.retainedByRelease()) {
                        state = BuildResources.RetainedByBuildAndReleaseText;
                    }
                    else {
                        state = BuildResources.RetainedByBuildText;
                    }
                }
                else if (build.retainedByRelease()) {
                    state = BuildResources.RetainedByReleaseText;
                }
            }

            return state;
        });

        this.validationResults = this.computed(() => {
            var build = this.currentBuild();

            if (build) {
                return build.validationResults();
            }
            else {
                return [];
            }
        });

        this.hasValidationResults = this.computed(() => {
            return this.validationResults().length > 0;
        });

        this.canShowIssues = this.computed(() => {
            var hasValidationResults = this.hasValidationResults();
            var hasIssues = this.hasIssues();
            var hasXamlBuildIssues = this.xamlBuildIssues().length > 0;

            return hasValidationResults || hasIssues || hasXamlBuildIssues;
        });

        this.canShowDiagnosticLogs = this.computed(() => {
            return this.diagnosticLogs().length > 0;
        });

        this.canShowTags = this.computed(() => {
            var build = this.currentBuild();
            if (build) {
                return build.definitionType() === BuildContracts.DefinitionType.Build &&
                    !build.deleted.peek();
            }
        });

        this.canShowDeployments = this.computed(() => {
            var build = this.currentBuild();
            if (build) {
                return (build.definitionType() === BuildContracts.DefinitionType.Xaml) &&
                    ((this.deploymentBuilds().length > 0) || (this.deploymentDeploys().length > 0) || (this.deploymentTests().length > 0));
            }
        });

        this.canEditDefinition = this.computed(() => {
            var build = this.currentBuild();
            if (build) {
                return build.definitionType() === BuildContracts.DefinitionType.Build;
            }
        });

        this.canShowSourceBranch = this.computed(() => {
            var build = this.currentBuild();
            if (build) {
                // canShowSourceBranch has a default value for when the provider is not initialized, but we need to ensure it's reevaluated when it becomes initialized
                this._sourceProviderInitialized();

                return this._viewContext.sourceProviderManager.canShowSourceBranch(build.repositoryType(), build.sourceBranch());
            }
        });

        this._createWellKnownSections();

        // reactor for code coverage
        this.computed(() => {
            var codeCoverageSummary: TMContracts.CodeCoverageSummary = this._codeCoverageSummary();
            if (codeCoverageSummary) {
                var currentBuild = this.currentBuild();
                if (currentBuild) {
                    var buildId = currentBuild.id.peek();

                    var artifacts = currentBuild.artifacts();
                    var filteredArtifacts = artifacts.filter((artifact) => {
                        // for now the uploaded coverage artifact name is called "CodeCoverageReport", the artifact download link will 
                        // ultimately be needed to be provided by the CodeCoverageSummary object 
                        return (Utils_String.equals(artifact.name, Utils_String.format("Code Coverage Report_{0}", buildId)));
                    });
                    var downloadLink = "";
                    var summaryReportUrl = "";
                    if (filteredArtifacts.length >= 1) {
                        if (filteredArtifacts[0].resource.downloadUrl) {
                            downloadLink = filteredArtifacts[0].resource.downloadUrl;
                        }
                        if (this._isCodeCoverageBrowsingFeatureEnabled() && filteredArtifacts[0].resource._links && filteredArtifacts[0].resource._links.web && filteredArtifacts[0].resource._links.web.href) {
                            summaryReportUrl = filteredArtifacts[0].resource._links.web.href;
                        }
                    }

                    if (codeCoverageSummary.coverageData) {
                        let codeCoverageSummaryModels = codeCoverageSummary.coverageData.map((bc: TMContracts.CodeCoverageData) => new BuildCoverageSummaryViewModel(bc, downloadLink, summaryReportUrl));
                        if (codeCoverageSummaryModels.length > 0) {
                            this.codeCoveragesMessage("");
                        }
                        else {
                            this.codeCoveragesMessage(Utils_String.format(BuildResources.BuildDetailsSummaryNoCodeCoverageNoLink));
                        }
                        this.codeCoverageSummaries(codeCoverageSummaryModels);
                    }

                    this.codeCoveragesLoaded(true);
                }
            }
        });

        getEventService().attachEvent(Context.BuildSummaryViewEvents.HideSection, (payload: Context.IHideSectionEventPayload) => {
            const existingSections = this.sections.peek();
            let section = existingSections.filter((section) => {
                return Utils_String.equals(section.key, payload.id, true);
            })[0];

            if (section) {
                section.isVisible(payload.value);
            }
        });

    }

    private _isCodeCoverageBrowsingFeatureEnabled(): boolean {
        return FeatureAvailability_Services.FeatureAvailabilityService.isFeatureEnabled(ServerConstants.FeatureAvailabilityFlags.BuildSummaryCodeCoverage);
    }

    private _createWellKnownSections(clearSections: boolean = false) {
        if (clearSections) {
            this.sections([]);
            this._sectionFactory.clearSectionsMap();
            this._emptyBuildRelatedSections();

            this.changes([]);
            this.changesLoaded(true);

            this.workItems([]);
            this.workItemsLoaded(true);

            this.diagnosticLogs([]);
            this.diagnosticLogsLoaded(true);

            this.xamlBuildIssues([]);
            this.tagsViewModel.tags([]);
        }

        let sections: Extensibility.SummarySection[] = [];
        // add well known sections
        $.each(Extensibility.WellKnownSections, (key, data) => {
            let section: Extensibility.SummarySection = null;
            switch (key) {
                case Extensibility.WellKnownSections.BuildIssues.key:
                    section = this._sectionFactory.createWellKnownSection(key, this.canShowIssues);
                    break;
                case Extensibility.WellKnownSections.DeploymentInformation.key:
                    section = this._sectionFactory.createWellKnownSection(key, this.canShowDeployments);
                    break;
                case Extensibility.WellKnownSections.BuildTags.key:
                    section = this._sectionFactory.createWellKnownSection(key, this.canShowTags);
                    break;
                case Extensibility.WellKnownSections.DiagnosticLogs.key:
                    section = this._sectionFactory.createWellKnownSection(key, this.canShowDiagnosticLogs);
                    break;
                default:
                    section = this._sectionFactory.createWellKnownSection(key);
                    break;
            }
            if (section) {
                sections.push(section);
            }
        });

        if (sections.length > 0) {
            this._sectionFactory.insertSections(this.sections, sections, true);
        }
    }

    private _loadBuildRelatedSections(build: BuildDetailsViewModel.BuildDetailsViewModel) {
        var buildUri = build.uri();
        var buildId = build.id();
        var isXamlBuild = (build.definitionType() === BuildContracts.DefinitionType.Xaml);

        this._loadBuildCodeCoverage(buildId, isXamlBuild);
        this._loadBuildDeployments(buildId, isXamlBuild);
        this._loadDiagnosticLogs(build);
    }

    // cleanup tests, codecoverage, builddeployments
    private _emptyBuildRelatedSections() {
        this.codeCoveragesMessage(Utils_String.format(BuildResources.BuildDetailsSummaryNoCodeCoverageNoLink));
        this.codeCoverages([]);
        this.deploymentBuilds([]);
        this.codeCoveragesLoaded(true);
        this.deploymentsLoaded(true);

        this.diagnosticLogs([]);
        this.diagnosticLogsLoaded(false);
    }

    private _addTaskDataStillLoadingMessage(request: JQueryXHR, path: string) {
        if (request.status === 404) {
            // The file isn't uploaded yet
            var section = this._sectionFactory.createCustomSection(path, getCustomSummaryNameFromFilePath(path));
            if (section) {
                section.messages([]);
                section.addMessage(BuildResources.BuildTaskAttachmentIsStillUploading);
                this._sectionFactory.insertSections(this.sections, [section]);
            }
        }
        Diag.logInfo(request.responseText);
    }

    private _loadCustomSections(build: BuildDetailsViewModel.BuildDetailsViewModel) {
        var buildId = build.id();
        if (build.definitionType() === BuildContracts.DefinitionType.Xaml) {
            this._loadXamlInformationNodes(buildId);
        }
        else {
            // get build custom summaries - of MarkDownType only  - getting items added through ##vso[task.addattachment type=Distributedtask.Core.Summary;name=sectionname]
            this._viewContext.buildClient.getAttachments(buildId, DTConstants.CoreAttachmentType.Summary).then((taskAttachments) => {
                taskAttachments.forEach((taskAttachment: BuildContracts.Attachment) => {
                    if (taskAttachment._links && taskAttachment._links.self && taskAttachment._links.self.href) {
                        var link = taskAttachment._links.self.href;
                        var attachmentName = taskAttachment.name || BuildResources.BuildCustomSection;
                        $.get(link).then((markDown: string) => {
                            var section = this._sectionFactory.createCustomSection(taskAttachment.name, taskAttachment.name);
                            if (section) {
                                section.addMessage(markDown);
                                this._sectionFactory.insertSections(this.sections, [section]);
                            }
                        }, (request: JQueryXHR) => {
                            this._addTaskDataStillLoadingMessage(request, taskAttachment.name);
                        });
                    }
                });
            });
        }
    }

    private _loadContributedSections(records: BuildContracts.TimelineRecord[]) {
        // get contributed sections for summary tab
        this._contributionPromise.then((contributions) => {
            // To make sure wellknown sections come first in general, order within them and ask createContributedSection to not to honor order if the extension isn't internal
            const orderedContributions = contributions.sort((a, b) => {
                var order1 = a.properties["order"] || 100;
                var order2 = b.properties["order"] || 100;
                return order1 - order2;
            });

            const contributionHelper = new ContributionHelper(orderedContributions);
            const contributionsVisibilityMap = contributionHelper.getTaskContributionVisibilityMap(records);

            if (!this._contributedSectionsInitialized) {
                let contributionsToAdd: Contribution[] = [];

                orderedContributions.forEach((contribution, index) => {
                    if (contributionHelper.isBuildDetailsSectionContribution(contribution)) {
                        contributionsToAdd.push(contribution);
                    }
                });

                let contributedSections = this._sectionFactory.createContributedSections(contributionsToAdd);
                if (contributedSections.length > 0) {
                    contributedSections.forEach((section) => {
                        if (contributionsVisibilityMap[section.key] === false) {
                            section.isVisible(false);
                        }
                    });

                    this._sectionFactory.insertSections(this.sections, contributedSections);
                }

                this._contributedSectionsInitialized = true;
            }
            else {
                // update visibility for existing sections
                const existingSections = this.sections();
                existingSections.forEach((section) => {
                    if (contributionsVisibilityMap[section.key] === true) {
                        section.isVisible(true);
                    }
                    else if (contributionsVisibilityMap[section.key] === false) {
                        section.isVisible(false);
                    }
                });
            }

        }, (error) => {
            handleError(error);
            this._contributedSectionsInitialized = false;
        });
    }

    public setChangesAndWorkItems(changes: BuildContracts.Change[]) {
        var currentBuild = this.currentBuild.peek();
        if (currentBuild) {
            var changeModels = changes.map((change: BuildContracts.Change) => new ChangeModel(change, currentBuild, this._viewContext));

            if (changeModels.length > 0) {
                this.changesMessage("");
            }
            else {
                this.changesMessage(BuildResources.BuildDetailsSummaryNoChanges);
            }

            this.changes(changeModels);
            this.changesLoaded(true);

            // work items
            var changeDescriptors = changes.map((change: BuildContracts.Change) => change.id);
            if (currentBuild.definitionType() === BuildContracts.DefinitionType.Xaml) {
                // XAML specific WIT
                if (!this._xamlWITPromise) {
                    this._xamlWITPromise = this._viewContext.buildClient.getInformationNodes(currentBuild.id.peek(), [Information.InformationTypes.OpenedWorkItem, Information.InformationTypes.AssociatedWorkItem]);
                }
                this._xamlWITPromise.then((nodes: BuildContracts.InformationNode[]) => {
                    var workItemModels = [];
                    $.each(nodes, (index, value: BuildContracts.InformationNode) => {
                        var assignedTo = value.fields[Information.InformationFields.AssignedTo] || "";
                        var status = value.fields[Information.InformationFields.Status] || "";
                        var title = value.fields[Information.InformationFields.Title] || "";
                        var id = parseInt(value.fields[Information.InformationFields.WorkItemId] || "-1");
                        var workItem: VCContracts.AssociatedWorkItem = {
                            assignedTo: assignedTo,
                            id: id,
                            state: status,
                            title: title,
                            url: "",
                            webUrl: "",
                            workItemType: ""
                        };
                        workItemModels.push(new WorkItemViewModel(workItem, this._viewContext))
                    });
                    this.workItems(workItemModels);
                    if (workItemModels.length === 0) {
                        this.workItemsMessage(BuildResources.BuildDetailsSummaryNoWorkItems);
                    }
                    this.workItemsLoaded(true);
                });
            }
            else {
                var buildId = currentBuild.id.peek();
                this._viewContext.buildClient.getBuildWorkItems(
                    currentBuild.id(),
                    changeDescriptors)
                    .then((associatedWorkItems: VCContracts.AssociatedWorkItem[]) => {
                        this.setWorkitems(associatedWorkItems, buildId);
                    }, (error: any) => {
                        if (this._currentBuildId.peek() === buildId) {
                            this.workItemsMessage(BuildResources.BuildDetailsSummaryNoWorkItems);
                            this.workItemsLoaded(true);
                        }
                    });
            }
        }
    }

    private setWorkitems(associatedWorkItems: VCContracts.AssociatedWorkItem[], buildId: number) {
        if (this._currentBuildId.peek() === buildId) {
            var workItemModels = associatedWorkItems.map((workItem: VCContracts.AssociatedWorkItem) => {
                return new WorkItemViewModel(workItem, this._viewContext);
            });
            if (workItemModels.length > 0) {
                this.workItemsMessage("");
            }
            else {
                this.workItemsMessage(BuildResources.BuildDetailsSummaryNoWorkItems);
            }
            this.workItems(workItemModels);
            this.workItemsLoaded(true);
        }
    }

    private _loadAssociatedChangesAndWorkItems() {
        var currentBuild = this.currentBuild();

        if (currentBuild) {
            var buildId = currentBuild.id();
            this.changesLoaded(false);
            this.workItemsLoaded(false);
            this._viewContext.buildClient.getBuildChanges(buildId).then(
                (changes: BuildContracts.Change[]) => {
                    if (this._currentBuildId.peek() === buildId) {
                        this.setChangesAndWorkItems(changes);
                    }
                },
                (error: any) => {
                    if (this._currentBuildId.peek() === buildId) {
                        this.changesMessage(BuildResources.BuildDetailSummaryCouldNotRetrieveChanges);
                        this.changesLoaded(true);
                        this.workItemsLoaded(true); // workitems depend on changes
                    }
                });
        }
    }

    private _loadBuildDeployments(buildId: number, isXamlBuild: boolean) {
        if (isXamlBuild) {
            this.deploymentsLoaded(false);
            this._viewContext.buildClient.getBuildDeployments(buildId).then(
                (deployments: BuildContracts.Deployment[]) => {
                    if (this._currentBuildId.peek() === buildId) {
                        if (deployments.length > 0) {
                            var buildPromises: Q.IPromise<BuildContracts.Build>[] = [];
                            var testPromises: Q.IPromise<TMContracts.TestRun>[] = [];
                            var deploys: BuildContracts.DeploymentDeploy[] = [];

                            deployments.forEach((deployment: BuildContracts.Deployment) => {
                                if (deployment.type === "Build") {
                                    var deploymentBuild: BuildContracts.DeploymentBuild = <BuildContracts.DeploymentBuild>deployment;
                                    buildPromises.push(this._viewContext.buildClient.getBuild(deploymentBuild.buildId));
                                }
                                else if (deployment.type === "Deploy") {
                                    deploys.push(<BuildContracts.DeploymentDeploy>deployment);
                                }
                                else if (deployment.type === "Test") {
                                    var deploymentTest: BuildContracts.DeploymentTest = <BuildContracts.DeploymentTest>deployment;
                                    testPromises.push(this._viewContext.testManagementClient.getTestRunById(deploymentTest.runId));
                                }
                            });

                            Q.all(buildPromises).then((builds: BuildContracts.Build[]) => {
                                var buildViews = builds.map((build: BuildContracts.Build) => new DeploymentBuildViewModel(build));
                                this.deploymentBuilds(buildViews);
                            });
                            Q.all(testPromises).then((testRuns: TMContracts.TestRun[]) => {
                                var testRunViews = testRuns.map((testRun: TMContracts.TestRun) => new TestRunViewModel(testRun));
                                this.deploymentTests(testRunViews);
                            });
                            this.deploymentDeploys(deploys);
                        }
                        else {
                            this.deploymentBuilds.removeAll();
                            this.deploymentDeploys.removeAll();
                            this.deploymentTests.removeAll();
                        }

                        this.deploymentsLoaded(true);
                    }
                },
                (error: any) => {
                    if (this._currentBuildId.peek() === buildId) {
                        this.deploymentsLoaded(true);
                    }
                });
        }
        else {
            // deployments only exist in xaml build
            this.deploymentBuilds.removeAll();
            this.deploymentDeploys.removeAll();
            this.deploymentTests.removeAll();
            this.deploymentsLoaded(true);
        }
    }

    /**
     * Load diagnostic logs, if there are any.
     * 
     * When diagnostic logs are pushed to the server it's a pairing of a zip file(per phase)
     * and a metadata file. The metadata file, shown below, describes the context of the zip.
     * That is, it tells us the agent and phase associated with the zip.
     * 
     * In this method we iterate all of the metadata files, get the associated file, and 
     * display them grouped by the Agent they ran on.
     * @param build 
     */
    private async _loadDiagnosticLogs(build: BuildDetailsViewModel.BuildDetailsViewModel) {
        this.diagnosticLogsLoaded(false);
        this.diagnosticLogs([]);

        const diagLogAttachments: BuildContracts.Attachment[] = await this._viewContext.buildClient.getAttachments(build.id(), DTConstants.CoreAttachmentType.DiagnosticLog);
        const metadataFiles: BuildContracts.Attachment[] = 
            diagLogAttachments.filter(a => Utils_String.startsWith(a.name, "diagnostics-") && Utils_String.endsWith(a.name, ".json")).sort((a: DistributedTaskContracts.TaskAttachment, b: DistributedTaskContracts.TaskAttachment) => {
                return Utils_Date.defaultComparer(a.createdOn, b.createdOn);
            });

        const sections: DiagnosticViewModel[] = [];

        for (const diagLogAttachment of metadataFiles) {
            if (diagLogAttachment._links && diagLogAttachment._links.self && diagLogAttachment._links.self.href) {
                const link = diagLogAttachment._links.self.href;
                const attachmentName: string = diagLogAttachment.name || BuildResources.BuildCustomSection;

                const jsonText: string = await Ajax.issueRequest(link, {});
                let metaDataDetails: DistributedTaskContracts.DiagnosticLogMetadata;
                try {
                    metaDataDetails = JSON.parse(jsonText);
                }
                catch (error) {
                    Diag.Debug.fail("Error parsing diagnostic JSON text.");
                    throw error;
                }

                // Check if we have a view model for this name, if not create it
                let agentViewModel: DiagnosticViewModel = Utils_Array.first(sections, (s: DiagnosticViewModel) => {
                    return s.agentName.peek() === metaDataDetails.agentName;
                });

                const poolPageConfig: BuildLinks.IPoolPageConfiguration = new BuildLinks.PoolPageConfiguration();
                poolPageConfig.agentId = metaDataDetails.agentId;
                let agentUrl = BuildLinks.getPoolLink(metaDataDetails.poolId, BuildLinks.PoolPageAction.Agents, poolPageConfig);

                agentViewModel = new DiagnosticViewModel(metaDataDetails.agentName, agentUrl);
                sections.push(agentViewModel);

                // now we have the view model, we can add the name/link of this phase to it
                const phaseZipAttachment: BuildContracts.Attachment = Utils_Array.first(diagLogAttachments, (a: DistributedTaskContracts.TaskAttachment) => {
                    return a.name === metaDataDetails.fileName;
                });

                if (phaseZipAttachment && phaseZipAttachment._links && phaseZipAttachment._links.self && phaseZipAttachment._links.self.href) {
                    const newPhaseUrl: string = phaseZipAttachment._links.self.href;
                    const phaseFailed: boolean = metaDataDetails.phaseResult.toLowerCase() === "failed";
                    const newPhaseLink: DiagnosticPhaseLink = new DiagnosticPhaseLink(metaDataDetails.fileName, newPhaseUrl, phaseFailed);

                    agentViewModel.phaseLink(newPhaseLink);
                }
            }
        }

        this.diagnosticLogs(sections);
        this.diagnosticLogsLoaded(true);
    }

    private _loadXamlInformationNodes(buildId: number) {
        const maxNodes = 1000;
        let currentBuild = this.currentBuild();
        let types = [
            Information.InformationTypes.BuildError,
            Information.InformationTypes.BuildWarning,
            Information.InformationTypes.CustomSummaryInformation
        ];

        // the UI will show a limited number of nodes
        this._viewContext.buildClient.getInformationNodes(buildId, types, 0, maxNodes + 1)
            .then((nodes: BuildContracts.InformationNode[]) => {
                let nodesTruncated: boolean = nodes.length > maxNodes;
                nodes = nodes.slice(0, maxNodes);

                let issues: IssueViewModel[] = [];
                let currentBuildValue = currentBuild.value();
                let repoPromise = this._viewContext.sourceProviderManager.getRepoName(this._viewContext.tfsContext, currentBuildValue);
                let customSummarySectionMessages: { key: string; messages: string[] } = <any>{};
                let customSummarySections: Extensibility.SummarySection[] = [];
                repoPromise.then((repoName: string) => {
                    let branchName = "";
                    if (currentBuildValue.repository && currentBuildValue.repository.defaultBranch) {
                        // replicating GitRefUtility.getRefFriendlyName, no need to download the big file just for this function
                        if (currentBuildValue.repository.defaultBranch.indexOf("refs/heads/") === 0) {
                            branchName = currentBuildValue.repository.defaultBranch.substring("refs/heads/".length);
                        }
                    }

                    $.each(nodes, (index, value: BuildContracts.InformationNode) => {
                        // Errors or warnings - issues
                        if (value.type === Information.InformationTypes.BuildError ||
                            value.type === Information.InformationTypes.BuildWarning) {
                            let codeCategory = "Code";
                            let generalCategory = "General";
                            let category = codeCategory;
                            let type = BuildContracts.IssueType.Error;
                            let fieldType = value.fields[Information.InformationFields.ErrorType] || "";
                            if (fieldType === "") {
                                category = generalCategory;
                            }
                            if (value.type === Information.InformationTypes.BuildWarning) {
                                type = BuildContracts.IssueType.Warning;
                            }
                            let issue: BuildContracts.Issue = {
                                category: category,
                                type: type,
                                message: value.fields[Information.InformationFields.Message],
                                data: value.fields
                            };
                            issue.data["repo"] = repoName;
                            if (branchName && issue.data[Information.InformationFields.File] && issue.data[Information.InformationFields.GitUri]) {
                                // example gituri "vstfs:///Git/VersionedItem/test/test/master/ConsoleApplication3/ConsoleApplication3/Program.cs"
                                let gitUriPrefix = Utils_String.format("vstfs:///Git/VersionedItem/{0}/{1}/{2}", this._viewContext.tfsContext.navigation.project, repoName, branchName);
                                if (issue.data[Information.InformationFields.GitUri].indexOf(gitUriPrefix) === 0) {
                                    // correct file path to have the ful path
                                    issue.data[Information.InformationFields.File] = issue.data[Information.InformationFields.GitUri].substr(gitUriPrefix.length);
                                }
                            }
                            if (category === codeCategory) {
                                issues.push(new CodeIssueViewModel(currentBuild, issue, this._viewContext));
                            }
                            else {
                                issues.push(new IssueViewModel(issue));
                            }
                        }
                        // custom summary sections
                        if (value.type === Information.InformationTypes.CustomSummaryInformation) {
                            let key = value.fields[Information.InformationFields.SectionName] || "";
                            let displayName = value.fields[Information.InformationFields.SectionHeader] || "";
                            let message = value.fields[Information.InformationFields.Message] || "";
                            let priority = parseInt(value.fields[Information.InformationFields.SectionPriority] || "100");
                            if (key && displayName && message) {
                                let existingMessages: string[] = customSummarySectionMessages[key];
                                if (existingMessages) {
                                    // section is already pushed to customSummarySections, append message
                                    customSummarySectionMessages[key] = existingMessages.concat(message);
                                }
                                else {
                                    var section = new Extensibility.SummarySection(key, null, displayName, priority, 0);
                                    customSummarySections.push(section);
                                    customSummarySectionMessages[key] = [message];
                                }
                            }
                        }
                    });
                    // To honor priority of custom sections within them, but not within wellknown sections ...
                    // create sections based on order of their priority - with out sending the priority while creating - so that default priority will be applied
                    let orderedSections = customSummarySections.sort((a, b) => {
                        return a.order - b.order;
                    });
                    $.each(orderedSections, (index: number, section: Extensibility.SummarySection) => {
                        let key = section.key;
                        let customSection = this._sectionFactory.createCustomSection(key, section.displayName); // don't include section priority/order here
                        let messagesFromMap: string[] = customSummarySectionMessages[key];
                        if (customSection) {
                            if (messagesFromMap) {
                                customSection.addMessages(messagesFromMap);
                            }
                            this._sectionFactory.insertSections(this.sections, [customSection]);
                        }
                    });
                    this.xamlBuildIssues(issues);
                    this.xamlBuildIssuesTruncated(nodesTruncated);
                }, handleError);
            }, handleError);
    }

    private _loadBuildCodeCoverage(buildId: number, isXamlBuild: boolean) {
        this.codeCoveragesLoaded(false);

        var infoMessage = Utils_String.format(BuildResources.BuildDetailsSummaryNoCodeCoverageNoLink);
        if (!isXamlBuild) {
            infoMessage = Utils_String.format(infoMessage + " " + BuildResources.BuildDetailsSummaryNoCodeCoverageLink);
        }

        // Try to load the the module level summary; only if its not present then load the extensible coverage summary
        this._viewContext.testManagementClient.getBuildCoverage(buildId).then(
            (codeCoverages: TMContracts.BuildCoverage[]) => {
                if (this._currentBuildId.peek() === buildId) {
                    // this is  module level summary flow
                    var codeCoverageModels = codeCoverages.map((bc: TMContracts.BuildCoverage) => new BuildCoverageViewModel(bc, this._viewContext));
                    this.codeCoverages(codeCoverageModels);
                    if (codeCoverageModels.length > 0) {
                        this.codeCoveragesMessage("");
                        this.codeCoveragesLoaded(true);
                    }
                    else {
                        // this is new build codecoverage summary flow
                        this._viewContext.testManagementClient.getCodeCoverageSummary(buildId).then(
                            (codeCoverageSummary: TMContracts.CodeCoverageSummary) => {
                                if (this._currentBuildId.peek() === buildId) {
                                    this._codeCoverageSummary(codeCoverageSummary);
                                    this.codeCoveragesMessage(infoMessage);
                                    this.codeCoveragesLoaded(true);
                                }
                            },
                            (error: any) => {
                                if (this._currentBuildId.peek() === buildId) {
                                    this.codeCoveragesMessage(infoMessage);
                                    this.codeCoveragesLoaded(true);
                                }
                            });
                    }
                }
            },
            (error: any) => {
                if (this._currentBuildId.peek() === buildId) {
                    this.codeCoveragesMessage(infoMessage);
                    this.codeCoveragesLoaded(true);
                }
            });
    }

    public onDefinitionClick() {
        let build = this.currentBuild.peek();
        if (build) {
            Context.viewContext.viewDefinition(build.definitionId.peek());
        }
    }

    public onDefinitionEdit() {
        var build = this.currentBuild.peek();
        if (build) {
            Context.viewContext.editDefinition(build.definitionId.peek());
        }
    }

    public onBranchClick() {
        var build = this.currentBuild();
        if (build) {
            this._viewContext.sourceProviderManager.onBranchClick(this._viewContext.tfsContext, build.projectId(), build.repositoryId(), build.repositoryType(), build.sourceBranch());
        }
    }

    public onSourceVersionClick() {
        var build = this.currentBuild();
        if (build) {
            this._viewContext.sourceProviderManager.onSourceVersionClick(this._viewContext.tfsContext, build.value());
        }
    }

    public dispose() {
        super.dispose();

        $.each(this.jobs(), (index: number, job: JobViewModel) => {
            job.dispose();
        });
    }

    public refreshCodeCoverage() {
        var currentBuild = this.currentBuild();
        this._loadBuildCodeCoverage(currentBuild.id(), currentBuild.definitionType() === BuildContracts.DefinitionType.Xaml);
    }

    public refreshDeployments() {
        const currentBuild = this.currentBuild();
        if (currentBuild) {
            this._loadBuildDeployments(currentBuild.id(), (currentBuild.definitionType() === BuildContracts.DefinitionType.Xaml));
        }
    }

    public refreshDiagnosticLogs() {
        var currentBuild = this.currentBuild();
        this._loadDiagnosticLogs(currentBuild);
    }

    public addTag(event: JQueryEventObject, tag: string) {
        var summaryVM = <BuildSummaryViewModel>ko.dataFor(event.target);
        var build = summaryVM._buildDetailsContext.currentBuild();
        if (build) {
            summaryVM._viewContext.buildClient.addBuildTag(build.id(), tag)
                .then((tags: string[]) => {
                    build.tags(tags);
                });
        }
    }

    public deleteTag(event: JQueryEventObject, tag: string) {
        var summaryVM = <BuildSummaryViewModel>ko.dataFor(event.target);
        var build = summaryVM._buildDetailsContext.currentBuild();
        if (build) {
            summaryVM._viewContext.buildClient.deleteBuildTag(build.id(), tag)
                .then((tags: string[]) => {
                    build.tags(tags);
                    // WIT tags control by default brings focus to "delete button" of next available tag
                    // we will lose focus since we make async call and items are updated
                    // let's bring back focus to at least the add button
                    __tagControl && __tagControl.focusAddButton();
                });
        }
    }

    public tagControlInitialized(tagControl: TagsControl) {
        __tagControl = tagControl;
    }

    public getSectionFactory() {
        return this._sectionFactory;
    }
}

export class ChangeModel {
    private _change: BuildContracts.Change;
    private _build: BuildDetailsViewModel.BuildDetailsViewModel;
    private _changeListPromise: IPromise<VCLegacyContracts.ChangeList> = null;
    private _message = "";
    private _fullMessage = "";
    private _messageToDisplay = "";
    private _viewContext: Context.ViewContext;

    public changeText: KnockoutObservable<string> = ko.observable("");
    public authoredBy: KnockoutObservable<string> = ko.observable("");
    public message: KnockoutObservable<string> = ko.observable("");
    public messageTruncated: KnockoutObservable<boolean> = ko.observable(false);
    public changeUrl: KnockoutObservable<string> = ko.observable("");

    // public property for accessing the change object
    public change(): BuildContracts.Change {
        return this._change;
    }

    constructor(change: BuildContracts.Change, build: BuildDetailsViewModel.BuildDetailsViewModel, viewContext: Context.ViewContext) {
        this._change = change;
        this._build = build;
        this._viewContext = viewContext;

        if (change) {
            this.changeText(this._viewContext.sourceProviderManager.getChangeText(change));
            this.changeUrl(this._viewContext.sourceProviderManager.getChangeUrl(this._viewContext.tfsContext, this._build.value(), change));
            this._message = change.message;

            this.message(this._message);

            if (change.messageTruncated) {
                this.messageTruncated(true);
            }

            if (change.author) {
                this.authoredBy(Utils_String.format(BuildResources.BuildDetailViewCommittedBy, change.author.displayName));
            }
        }
    }

    public openChange() {
        if (this._change) {
            var tfsContext = this._viewContext.tfsContext;
            this._viewContext.sourceProviderManager.onChangeClick(tfsContext, this._build.value(), this._change);
        }
    }

    public showMore() {
        if (this._change) {
            if (this._fullMessage.length === 0) {
                if (!this._changeListPromise) {
                    this._changeListPromise = this._viewContext.sourceProviderManager.getChangeList(this._viewContext.tfsContext,
                        this._build.repositoryType(),
                        this._change.id,
                        this._build.repositoryId());
                }

                this._changeListPromise.then((fullChangeList: VCLegacyContracts.ChangeList) => {
                    if (fullChangeList) {
                        this._fullMessage = fullChangeList.comment;
                        this._messageToDisplay = this._fullMessage;
                        this._toggleMessages();
                    }
                });
            }
            else {
                this._toggleMessages();
            }
        }
    }

    private _toggleMessages() {
        var currentMessage = this.message.peek();
        this.message(this._messageToDisplay);
        this._messageToDisplay = currentMessage;
    }
}

/**
 * Viewmodel for a build job
 */
export class JobViewModel extends Adapters_Knockout.TemplateViewModel {
    private _build: BuildDetailsViewModel.BuildDetailsViewModel;
    private _viewContext: Context.ViewContext;

    public record: TimelineRecordViewModel.TimelineRecordViewModel;

    public name: KnockoutComputed<string>;
    public issues: KnockoutComputed<IssueViewModel[]>;
    public hasIssues: KnockoutComputed<boolean>;

    constructor(build: BuildDetailsViewModel.BuildDetailsViewModel, record: TimelineRecordViewModel.TimelineRecordViewModel, viewContext: Context.ViewContext) {
        super();
        this._viewContext = viewContext;
        this._build = build;
        this.record = record;

        this.name = this.computed(() => {
            return this.record.name();
        });

        this.issues = this.computed(() => {
            var issues: IssueViewModel[] = $.map(this.record.issues(), (issues) => this._createIssueViewModel(build, issues, this._viewContext));

            this._appendIssues(issues, <TimelineRecordViewModel.TimelineRecordViewModel[]>record.nodes());

            return issues;
        });

        this.hasIssues = this.computed(() => {
            return this.issues().length > 0;
        });
    }

    private _appendIssues(issues: IssueViewModel[], records: TimelineRecordViewModel.TimelineRecordViewModel[]) {
        $.each(records, (index: number, record: TimelineRecordViewModel.TimelineRecordViewModel) => {
            issues.push.apply(issues, $.map(record.issues(), (issue: BuildContracts.Issue) => {
                return this._createIssueViewModel(this._build, issue, this._viewContext);
            }));

            this._appendIssues(issues, <TimelineRecordViewModel.TimelineRecordViewModel[]>record.nodes());
        });
    }

    private _createIssueViewModel(build: BuildDetailsViewModel.BuildDetailsViewModel, issue: BuildContracts.Issue, viewContext: Context.ViewContext): IssueViewModel {
        if (issue && issue.message) {
            if (Utils_String.localeIgnoreCaseComparer(issue.category, "code") === 0) {
                return new CodeIssueViewModel(build, issue, viewContext);
            }
            else {
                return new IssueViewModel(issue);
            }
        }
    }
}

/**
 * Viewmodel for diagnostic logs.
 */
export class DiagnosticViewModel {
    public agentName: KnockoutObservable<string> = ko.observable("");

    public agentUrl: KnockoutObservable<string> = ko.observable("");

    public phaseLink: KnockoutObservable<DiagnosticPhaseLink> = ko.observable({} as DiagnosticPhaseLink);

    constructor(agentName: string, agentUrl: string) {
        this.agentName(agentName || "");
        this.agentUrl(agentUrl || "");
    }
}

export class DiagnosticPhaseLink {
    public name: KnockoutObservable<string> = ko.observable("");

    public url: KnockoutObservable<string> = ko.observable("");

    public phaseFailed: KnockoutObservable<boolean> = ko.observable(false);

    constructor(name: string, url: string, phaseFailed: boolean) {
        this.name(name || "");
        this.url(url || "");
        this.phaseFailed(phaseFailed);
    }
}

/**
 * Viewmodel for a timeline record issue
 */
export class IssueViewModel {
    private _issue: BuildContracts.Issue;

    /**
     * The issue type
     */
    public type: KnockoutObservable<BuildContracts.IssueType> = ko.observable(BuildContracts.IssueType.Error);

    /**
     * The category
     */
    public category: KnockoutObservable<string> = ko.observable("");

    /**
     * The message
     */
    public messageLines: KnockoutObservableArray<string> = ko.observableArray([]);

    /**
     * The CSS class to use for the icon
     */
    public iconCssClass: KnockoutComputed<string>;

    /**
     * The label for the icon
     */
    public iconAriaLabel: KnockoutComputed<string>;

    constructor(issue: BuildContracts.Issue) {
        this.update(issue);

        this.iconCssClass = ko.computed(() => {
            switch (this.type()) {
                case BuildContracts.IssueType.Warning:
                    return "build-warning-icon-color bowtie-icon bowtie-status-warning";
                case BuildContracts.IssueType.Error:
                default:
                    return "build-failure-icon-color bowtie-icon bowtie-edit-delete";
            }
        });

        this.iconAriaLabel = ko.computed(() => {
            switch (this.type()) {
                case BuildContracts.IssueType.Warning:
                    return BuildResources.WarningText;
                case BuildContracts.IssueType.Error:
                default:
                    return BuildResources.ErrorText;
            }
        });
    }

    /**
     * Updates the model from a data contract
     * @param issue The data contract
     */
    public update(issue: BuildContracts.Issue) {
        this._issue = issue;

        this.type(issue.type);
        this.category(issue.category || "");
        this.messageLines((issue.message || "").split('\n'));
    }

    /**
     * Gets the name of the html template used by the editor
     */
    public getTemplateName(): string {
        return "buildvnext_issue";
    }
}

/**
 * Viewmodel for a code issue
 */
export class CodeIssueViewModel extends IssueViewModel {
    private _viewContext: Context.ViewContext;

    /**
     * The column number
     */
    public columnNumber: KnockoutObservable<number> = ko.observable(0);

    /**
     * The line number
     */
    public lineNumber: KnockoutObservable<number> = ko.observable(0);

    /**
     * The repository name
     */
    public repo: KnockoutObservable<string> = ko.observable("");

    /**
     * The source path
     */
    public sourcePath: KnockoutObservable<string> = ko.observable("");

    /**
     * The text that describes the error location
     */
    public locationText: KnockoutComputed<string>;

    /**
     * The url to the file content
     */
    public contentUrl: KnockoutComputed<string>;

    constructor(build: BuildDetailsViewModel.BuildDetailsViewModel, issue: BuildContracts.Issue, viewContext: Context.ViewContext) {
        super(issue);
        this._viewContext = viewContext;
        this.update(issue);

        this.locationText = ko.computed(() => {
            return Utils_String.format(BuildResources.BuildIssueLocationFormat, this.sourcePath(), this.lineNumber(), this.columnNumber());
        });

        this.contentUrl = ko.computed(() => {
            let messageLine: string = "";
            let messageLines = this.messageLines();
            if (messageLines && messageLines.length > 0) {
                messageLine = messageLines[0];
            }
            return this._viewContext.sourceProviderManager.getContentUrl(this._viewContext.tfsContext, build.value(), this.repo(), this.sourcePath(), this.lineNumber(), this.columnNumber(), this.type(), messageLine);
        });
    }

    /**
     * Updates the model from a data contract
     * @param issue The data contract
     */
    public update(issue: BuildContracts.Issue) {
        super.update(issue);

        // don't do this until the constructor has run
        if (this.columnNumber) {
            for (var prop in issue.data) {
                if (issue.data.hasOwnProperty(prop)) {
                    if (Utils_String.ignoreCaseComparer("columnNumber", prop) === 0)
                        this.columnNumber(parseInt(issue.data[prop] || "0"));
                    if (Utils_String.ignoreCaseComparer("lineNumber", prop) === 0)
                        this.lineNumber(parseInt(issue.data[prop] || "0"));
                    if (Utils_String.ignoreCaseComparer("repo", prop) === 0)
                        this.repo(issue.data[prop] || "");
                    if (Utils_String.ignoreCaseComparer("message", prop) === 0)
                        this.messageLines((issue.data[prop] || "").split('\n'));
                    if (Utils_String.ignoreCaseComparer("sourcePath", prop) === 0 ||
                        Utils_String.ignoreCaseComparer(Information.InformationFields.File, prop) === 0)
                        this.sourcePath(issue.data[prop] || "");
                }
            }
        }
    }

    /**
     * Gets the name of the html template used by the editor
     */
    public getTemplateName(): string {
        return "buildvnext_code_issue";
    }
}

export class DeploymentBuildViewModel {
    public linkText: string;
    public linkValue: string;

    public statusMessage: string;

    constructor(build: BuildContracts.Build) {
        if (build) {
            this.linkText = build.buildNumber;

            if (build._links && build._links.web) {
                this.linkValue = build._links.web.href;
            }

            this.statusMessage = new BuildDetailsViewModel.BuildDetailsViewModel(build).statusText.peek();
        }
    }
}

/**
 * Viewmodel for a test run
 */
export class TestRunViewModel {
    public linkText: string; // Run Id + Title
    public linkValue: string; // url

    public statusClass: string; // success or failure icon
    public statusText: string; // "state" + "completedDate" - "startDate" Eg: Completed 2 hours ago

    public resultText: string; // use "totalTests" , "passedTests" to something like - 88 of 90 tests passed

    constructor(testRun: TMContracts.TestRun) {
        this.linkText = testRun.id + ":" + testRun.name;
        this.linkValue = testRun.webAccessUrl;

        var passed = 0;
        var total = 0;
        if (testRun.passedTests) {
            passed = testRun.passedTests;
        }
        if (testRun.totalTests) {
            total = testRun.totalTests;
        }
        this.resultText = Utils_String.format(BuildResources.BuildDetailSummaryTestRunsPassed, passed, total);

        switch (testRun.state.toLowerCase()) {
            case "inprogress":
                this.statusClass = "build-brand-icon-color bowtie-icon bowtie-play-fill";
                this.statusText = BuildResources.BuildDetailSummaryTestRunsProgress;
                break;
            case "completed":
            case "needs investigation":
            case "needsinvestigation":
                if (passed < testRun.totalTests) {
                    // some passed
                    this.statusClass = "build-warning-icon-color bowtie-icon bowtie-status-warning";
                }
                else {
                    // all passed
                    this.statusClass = "build-success-icon-color bowtie-icon bowtie-check";
                    this.resultText = Utils_String.format(BuildResources.BuildDetailSummaryTestRunsAllPassed, testRun.totalTests);
                }
                this.statusText = Utils_String.format(BuildResources.BuildDetailSummaryTestRunsCompleted, Utils_Date.ago(testRun.completedDate, new Date()));
                break;
            case "aborted":
                this.statusClass = "build-failure-icon-color bowtie-icon bowtie-edit-delete";
                this.statusText = BuildResources.BuildDetailSummaryTestRunsAborted;
                break;
            default:
                this.statusClass = "build-brand-icon-color bowtie-icon bowtie-play-fill";
                this.statusText = BuildResources.BuildDetailSummaryTestRunsProgress;
        }
    }
}

/**
 * Viewmodel for a work item
 */
export class WorkItemViewModel {
    private _viewContext: Context.ViewContext;

    public id: string;
    public url: string;
    public title: string;
    public fullStatus: string;
    constructor(workItem: VCContracts.AssociatedWorkItem, viewContext: Context.ViewContext) {
        this._viewContext = viewContext;
        var tfsContext = this._viewContext.tfsContext;
        this.id = Utils_String.format("{0} {1}", workItem.workItemType, workItem.id);
        this.url = tfsContext.getActionUrl("edit", "workitems", {
            project: tfsContext.navigation.project,
            parameters: [workItem.id]
        });;
        this.title = workItem.title;
        this.fullStatus = (workItem.assignedTo) ?
            Utils_String.format(VCResources.WorkItemDetail, workItem.state, workItem.assignedTo) :
            Utils_String.format(VCResources.WorkItemDetailNotAssigned, workItem.state);
    }
}

/**
 * Viewmodel for build level code coverage module
 */
export class BuildCoverageModuleViewModel {
    public summary: string;
    constructor(module: TMContracts.ModuleCoverage) {
        this.summary = Utils_String.format(BuildResources.BuildCodeCoverageModuleSummary, module.name, module.statistics.blocksCovered || "0", module.statistics.linesCovered || "0");
    }
}

/**
 * Viewmodel for build level code coverage
 */
export class BuildCoverageViewModel {
    // Sometimes, there are duplicate modules coming from the endpoint, map is to make them unique
    private _modulesMap: { moduleName: string; value: TMContracts.ModuleCoverage } = <any>{};
    private _viewContext: Context.ViewContext;

    public summary: string;
    public state: string;
    public url: string;
    public lastError: string;
    public modules: BuildCoverageModuleViewModel[] = [];
    constructor(buildCoverage: TMContracts.BuildCoverage, viewContext: Context.ViewContext) {
        this._viewContext = viewContext;
        var tfsContext = this._viewContext.tfsContext;
        this.url = buildCoverage.codeCoverageFileUrl;
        this.state = buildCoverage.state;
        this.lastError = buildCoverage.lastError || "";
        var totalBlocksNotCovered: number = 0;
        var totalBlocksCovered: number = 0;
        $.each(buildCoverage.modules, (index, module: TMContracts.ModuleCoverage) => {
            totalBlocksNotCovered += module.statistics.blocksNotCovered || 0;
            totalBlocksCovered += module.statistics.blocksCovered || 0;
            this._modulesMap[module.name] = module;
        });
        var coveredPercentage = 0;
        if (totalBlocksCovered != 0 || totalBlocksNotCovered != 0) {
            coveredPercentage = (totalBlocksCovered / (totalBlocksNotCovered + totalBlocksCovered)) * 100;
            coveredPercentage = parseFloat(coveredPercentage.toFixed(2));
        }
        var uniqueModules: BuildCoverageModuleViewModel[] = [];
        $.each(this._modulesMap, (name: string, module: TMContracts.ModuleCoverage) => {
            uniqueModules.push(new BuildCoverageModuleViewModel(module));
        });
        this.modules = uniqueModules;

        var platformFlavor = "";
        if (buildCoverage.configuration) {
            platformFlavor = BuildCoverageSummaryViewModel.getPlatformFlavor(buildCoverage.configuration.platform, buildCoverage.configuration.flavor);
        }

        this.summary = Utils_String.format(BuildResources.BuildCodeCoverageSummary, platformFlavor, this.modules.length, coveredPercentage);
    }

    public downloadCC() {
        using(["TestManagement/Scripts/TFS.TestManagement.Utils"], (TcmUtils) => {
            TcmUtils.TelemetryService.publishEvent(TcmUtils.TelemetryService.featureDownloadCodeCoverageResults, TcmUtils.TelemetryService.eventClicked, 1);
            window.open(this.url, "_blank");
        });
    }

}

/**
 * Viewmodel for build level code coverage summary
 */
export class BuildCoverageSummaryViewModel {
    public summary: string;
    public summaries: string[] = [];
    public differences: string[] = [];
    public url: string;
    public summaryUrl: string;
    public lastError: string;
    constructor(codeCoverage: TMContracts.CodeCoverageData, downloadLink: string, summaryReportUrl: string) {
        this.url = downloadLink;
        this.lastError = "";
        this.summary = "";
        this.summaryUrl = summaryReportUrl;

        if (codeCoverage.coverageStats) {
            // sort the stats array using position field
            codeCoverage.coverageStats.sort((a, b) => a.position - b.position);
            var percentage: number[] = [];
            var diff: number[] = [];

            for (var i = 0; i < codeCoverage.coverageStats.length; i++) {
                percentage[i] = parseFloat((codeCoverage.coverageStats[i].covered * 100 / codeCoverage.coverageStats[i].total).toFixed(2));
                diff[i] = codeCoverage.coverageStats[i].isDeltaAvailable ? parseFloat(codeCoverage.coverageStats[i].delta.toFixed(2)) : 0;
                var sign: string = "";
                if (diff[i] > 0) {
                    sign = "+"
                }

                this.summaries.push(Utils_String.format(BuildResources.BuildCodeCoverageSummaryShort,
                    codeCoverage.coverageStats[i].label,
                    percentage[i],
                    codeCoverage.coverageStats[i].covered,
                    codeCoverage.coverageStats[i].total));
                this.differences.push(Utils_String.format(BuildResources.BuildCodeCoverageDifferenceShort, sign, diff[i]));
            }

            // we are using these text values to decide if we will display this data or not
            if (this.summaries.length != 0) {
                var platformFlavor = BuildCoverageSummaryViewModel.getPlatformFlavor(codeCoverage.buildPlatform, codeCoverage.buildFlavor);
                this.summary = Utils_String.format(BuildResources.BuildCodeCoverageSummaryExtended, platformFlavor);
            }
        }

    }

    public static getPlatformFlavor(plat: string, flav: string): string {
        var platformFlavor = "";
        if (plat && flav) {
            // (any cpu, debug)
            platformFlavor = "(" + plat + ", " + flav + ") "; // extra space at end on purpose
        }
        return platformFlavor;
    }

    public downloadCCSummary() {
        using(["TestManagement/Scripts/TFS.TestManagement.Utils"], (TcmUtils) => {
            TcmUtils.TelemetryService.publishEvent(TcmUtils.TelemetryService.featureDownloadCodeCoverageResults, TcmUtils.TelemetryService.eventClicked, 1);
            window.open(this.url, "_blank");
        });
    }
}

export function getCustomSummaryNameFromFilePath(path: string): string {
    // We don't have a good way to get custom section display header if it is uploaded through ##vso[build.uploadsummary], so try our best to use filename
    // Itempath eg: attachments/DistributedTask.Core.Summary/CustomMarkDownSummary-testsummary.md/2f67fcdf-5e28-49c8-bfe8-e66b5ceac4b7
    // Transform that to testsummary.md/2f67fcdf-5e28-49c8-bfe8-e66b5ceac4b7
    // and grab the first part
    //var itemPath = path.replace(new RegExp("\\-[0-9a-z]+/[0-9]*_"), "*");
    var itemPath = path.replace("attachments/DistributedTask.Core.Summary/CustomMarkDownSummary-", "");
    var itemPathPairs = itemPath.split("/");
    var displayName = BuildResources.BuildCustomSection;
    if (itemPathPairs.length == 2 && itemPathPairs[0]) {
        // name: testsummary.md
        var name = itemPathPairs[0].replace(".md", "");
        name = name.replace(new RegExp("[_-]*", "g"), "");
        name = name.charAt(0).toUpperCase() + name.slice(1);
        if (name) {
            displayName = name;
        }
    }
    return displayName;
}
