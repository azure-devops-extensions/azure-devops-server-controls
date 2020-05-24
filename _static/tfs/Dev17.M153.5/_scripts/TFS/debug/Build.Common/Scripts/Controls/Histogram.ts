/// <reference types="jquery" />

import ko = require("knockout");

import BuildClient = require("Build.Common/Scripts/Api2.2/ClientServices");
import { BuildArtifact } from "Build.Common/Scripts/BuildArtifacts";
import { BuildResult } from "Build.Common/Scripts/BuildResult";
import { BuildStatus } from "Build.Common/Scripts/BuildStatus";
import ClientContracts = require("Build.Common/Scripts/ClientContracts");
import { getBuildDurationText, getDurationText } from "Build.Common/Scripts/Duration";
import { IBuildClient } from "Build.Common/Scripts/IBuildClient";
import BuildCommonResources = require("Build.Common/Scripts/Resources/TFS.Resources.Build.Common");

import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import TFS_OM_Common = require("Presentation/Scripts/TFS/TFS.OM.Common");

import BuildContracts = require("TFS/Build/Contracts");

import Adapters_Knockout = require("VSS/Adapters/Knockout");
import Artifacts_Services = require("VSS/Artifacts/Services");
import Controls = require("VSS/Controls");
import Histogram = require("VSS/Controls/Histogram");
import Utils_Core = require("VSS/Utils/Core");
import Utils_Date = require("VSS/Utils/Date");
import Utils_String = require("VSS/Utils/String");
import Utils_UI = require("VSS/Utils/UI");
import VSS = require("VSS/VSS");

var domElem = Utils_UI.domElem;
var TfsContext = TFS_Host_TfsContext.TfsContext;
var delegate = Utils_Core.delegate;

export var BUILD_HISTOGRAM_BAR_COUNT = 10;

export class BuildsInfo {
    public builds: KnockoutObservableArray<BuildContracts.Build> = ko.observableArray(<BuildContracts.Build[]>[]);
    public currentBuildId: KnockoutObservable<number> = ko.observable(0);

    constructor(builds: BuildContracts.Build[], currentBuildId: number) {
        this.builds(builds);
        this.currentBuildId(currentBuildId);
    }
}

export class BuildHistogramViewModel extends Adapters_Knockout.TemplateViewModel {
    public buildsInfo: KnockoutObservable<BuildsInfo> = ko.observable(null);
    public clickAction: (build: BuildContracts.Build) => void;

    constructor(buildsInfo: BuildsInfo, clickAction: (build: BuildContracts.Build) => void) {
        super();
        this.buildsInfo(buildsInfo);
        this.clickAction = clickAction;
    }
}

export class BuildHistogramControl extends Adapters_Knockout.TemplateControl<BuildHistogramViewModel> {
    private _histogram: BuildHistogram;

    constructor(viewModel: BuildHistogramViewModel, options?: any) {
        super(viewModel, options);
    }

    initialize(): void {
        let histogramElement = $("<div />").appendTo(this.getElement());
        let viewModel = this.getViewModel();

        this._histogram = <BuildHistogram>Controls.BaseControl.createIn(BuildHistogram, histogramElement, {
            cssClass: "build-histogram definition-histogram",
            barCount: 10,
            barWidth: 6,
            barHeight: 35,
            barSpacing: 2,
            selectedState: "selected",
            hoverState: "hover",
            clickAction: viewModel.clickAction
        });

        this.subscribe(viewModel.buildsInfo, (newValue: BuildsInfo) => {
            if (newValue) {
                this._histogram.updateData(newValue);
            }
        });

        this._histogram.updateData(viewModel.buildsInfo());
    }

    public dispose(): void {
        if (this._histogram) {
            this._histogram.dispose();
            this._histogram = null;
        }

        super.dispose();
    }
}

export interface BuildHistogramOptions extends Histogram.IHistogramOptions {
    projectId?: string;
    tfsContext?: TFS_Host_TfsContext.TfsContext;
    clickAction?: Function;
    buildClient?: IBuildClient;
}

export class BuildHistogram extends Histogram.HistogramO<BuildHistogramOptions> {
    private _buildDefinitionId: number;
    private _buildCount: number = 10;
    private _buildClient: IBuildClient;

    private buildCssIconId = "#latestBuildCss";
    private summaryId = "#latestBuildSummary";

    constructor(options?) {
        super(options);

        if (options) {
            if (options.buildDefinitionId) {
                this._buildDefinitionId = options.buildDefinitionId;
            }
            else if (options.buildDefinitionUri) {
                this._buildDefinitionId = parseInt(Artifacts_Services.LinkingUtilities.decodeUri(options.buildDefinitionUri).id);
            }

            if (options.barCount) {
                this._buildCount = options.barCount;
            }

            this._buildClient = options.buildClient;
        }
    }

    public initialize() {
        super.initialize();
        this._loadData();
    }

    private _loadData() {
        if (!!this._buildDefinitionId) {
            // load up tile in home page
            var tileTemplateElement = this._element.parent().parent();
            var summarySpan = tileTemplateElement.find(this.summaryId).text(BuildCommonResources.NoBuildExistsForDefinition);
            var iconSpan = tileTemplateElement.find(this.buildCssIconId)
            var buildFilter: ClientContracts.IBuildFilter = {
                project: this._options.projectId,
                definitions: this._buildDefinitionId.toString(),
                statusFilter: BuildContracts.BuildStatus.Completed,
                $top: this._buildCount
            };

            if (!this._buildClient) {
                this._buildClient = TFS_OM_Common.ProjectCollection.getConnection(this._options.tfsContext).getService<BuildClient.BuildClientService>(BuildClient.BuildClientService);
            }

            this._buildClient.getBuilds(buildFilter).then((result: ClientContracts.GetBuildsResult) => {
                var latestBuild: BuildContracts.Build = result.builds[0];
                if (latestBuild) {
                    summarySpan.text(getBuildDurationText(latestBuild.status, latestBuild.startTime, latestBuild.finishTime));
                    iconSpan.attr("class", "icon " + BuildStatus.getIconClassName(latestBuild.status, latestBuild.result));
                }
                this.updateData(new BuildsInfo(result.builds, 0));
            });
        }
    }

    public clear() {
        this._clearBars();
    }

    public updateData(buildsInfo: BuildsInfo) {
        var maxDuration = Number.MIN_VALUE;
        var currentBuildId = buildsInfo.currentBuildId();
        var builds = buildsInfo.builds();
        var reverse = false;
        // Do a quick check to see if reversing items is needed, this can probably be added to the map/foreach, but to make the code cleaner -
        var topTwoBuilds = builds.slice(0, 2);
        if (topTwoBuilds.length === 2) {
            // If the Most recent build is at the top, we need to reverse builds so that it goes to the very right of histogram
            if (topTwoBuilds[0].startTime && topTwoBuilds[1].startTime) {
                if (topTwoBuilds[0].startTime > topTwoBuilds[1].startTime) {
                    reverse = true;
                }
            }
        }
        var items = builds.map((build: BuildContracts.Build): Histogram.HistogramBarData => {
            var duration: any;
            if (build.startTime && build.finishTime) {
                duration = <any>build.finishTime - <any>build.startTime;
            }
            else if (build.startTime) {
                duration = <any>(new Date()) - <any>build.startTime;
            }
            else {
                duration = 0;
            }
            maxDuration = Math.max(maxDuration, duration);

            return {
                selected: build.id === currentBuildId,
                value: duration,
                state: BuildResult.getTextClassName(build.result),
                action: (item: BuildContracts.Build) => {
                    if (this._options && this._options.clickAction) {
                        this._options.clickAction(item);
                    }
                },
                actionArgs: build,
                title: this.getBuildTooltipText(build)
            };
        });

        items.forEach((item) => {
            item.value = ((item.value / maxDuration) * 1000) / 10;
        });
        if (reverse) {
            items = items.reverse();
        }
        this.refresh(items);
    }

    private _renderError(error) {
        this._clearBars();
        this._element.attr("title", error.message || error);
    }

    private _onBuildClick(args?) {
        var artifact = new BuildArtifact(Artifacts_Services.LinkingUtilities.decodeUri(args.uri));
        artifact.execute(this._options.tfsContext.contextData);
    }

    private getBuildTooltipText(build: BuildContracts.Build): string {
        if (build.status === BuildContracts.BuildStatus.Completed && build.finishTime) {
            if (Utils_Date.isMinDate(build.finishTime)) {
                return Utils_String.format(BuildCommonResources.BuildCompletedDuration, build.buildNumber, BuildResult.getDisplayText(build.result), getDurationText(build.startTime, build.startTime));
            }
            else {
                return Utils_String.format(BuildCommonResources.BuildCompletedDuration, build.buildNumber, BuildResult.getDisplayText(build.result), getDurationText(build.startTime, build.finishTime));
            }
        }
        else if (build.status === BuildContracts.BuildStatus.InProgress) {
            return Utils_String.format(BuildCommonResources.BuildInProgressDuration, build.buildNumber, getDurationText(build.startTime, new Date()));
        }
    }
}

VSS.classExtend(BuildHistogram, TfsContext.ControlExtensions);

Controls.Enhancement.registerEnhancement(BuildHistogram, ".build-definition-histogram")

// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("Controls.Histogram", exports);
