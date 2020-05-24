/// <reference types="jquery" />
/// <reference types="react" />
/// <reference types="react-dom" />

import React = require("react");

import Charting_Contracts = require("Charting/Scripts/Contracts");
import PieControls = require("Charting/Scripts/Controls/PieChart");
import { BuildDetailLink } from "Build/Scripts/Components/BuildDetailLink";
import BuildMetricPassRate = require("Build/Scripts/Components/BuildMetricPassRate");
import { injectTime } from "Build/Scripts/Components/Environment";
import BuildResources = require("Build/Scripts/Resources/TFS.Resources.Build");
import * as Constants from "Build/Scripts/Constants";
import DefinitionSummaryStore = require("Build/Scenarios/Definition/Summary/Stores/DefinitionSummary");
import { BuildStatus } from "Build/Scripts/Components/BuildStatus";
import DefinitionStatus = require("Build/Scripts/Components/DefinitionStatus");
import { injectSourceProvider } from "Build/Scripts/Components/InjectSourceProvider";
import { RepositoryLink } from "Build/Scripts/Components/RepositoryLink";
import { SourceBranchLink } from "Build/Scripts/Components/SourceBranchLink";
import { getQueueStatusHandler } from "Build/Scripts/QueueStatus";
import { hasPoolPermission, DistributedTaskPermissions } from "Build/Scripts/Security";
import * as ViewState from "Build/Scenarios/Definition/ViewState";
import { RenderScenarios, StateScenarios } from "Build/Scripts/Performance";
import { QueryResult } from "Build/Scripts/QueryResult";

import { BuildLinks } from "Build.Common/Scripts/Linking";
import { BuildCustomerIntelligenceInfo, DefinitionMetrics } from "Build.Common/Scripts/Generated/TFS.Build2.Common";

import BuildContracts = require("TFS/Build/Contracts");

import { MessageBar } from "OfficeFabric/MessageBar";
import { DefaultButton } from "OfficeFabric/components/Button/DefaultButton/DefaultButton";
import { MessageBarType } from "OfficeFabric/components/MessageBar/MessageBar.types";

import TFS_React = require("Presentation/Scripts/TFS/TFS.React");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");

import Utils_Array = require("VSS/Utils/Array");
import Utils_Date = require("VSS/Utils/Date");
import Utils_Number = require("VSS/Utils/Number");
import Utils_String = require("VSS/Utils/String");

import Controls = require("VSS/Controls");
import Performance = require("VSS/Performance");
import VSS_Events = require("VSS/Events/Services");

import "VSS/LoaderPlugins/Css!Build/Scenarios/Definition/Summary/DefinitionSummary";

export interface State {
    definitionRow: DefinitionSummaryStore.DefinitionRow;
    buildsPerBranchInfo: DefinitionSummaryStore.IBuildBranchInfo;
}

export interface Props extends React.Props<any> {
}

export class ControllerView extends React.Component<Props, State> {
    private _onStoresUpdated: () => void;
    private _definitionSummaryStore: DefinitionSummaryStore.DefinitionSummaryStore = null;
    private _viewState: ViewState.ViewStateStore = null;

    constructor(props: Props) {
        super(props);
        this._definitionSummaryStore = DefinitionSummaryStore.getStore();
        this._viewState = ViewState.getInstance();

        this.state = this._getState();

        this._onStoresUpdated = () => {
            this.setState(this._getState());
        }
    }

    public render(): JSX.Element {
        let performance = Performance.getScenarioManager().startScenario(BuildCustomerIntelligenceInfo.Area, RenderScenarios.DefinitionSummaryControllerView);

        if (!this.state.definitionRow) {
            return <div>{BuildResources.BuildDefinitionSummaryFailedToLead}</div>
        }

        let definitionName: string = "";
        let definitionStatus = BuildContracts.DefinitionQueueStatus.Enabled;
        if (this.state.definitionRow) {
            definitionName = this.state.definitionRow.definitionResult.result.name || "";
            definitionStatus = this.state.definitionRow.definitionResult.result.queueStatus;
        }

        const showQueueStatusMessage = (definitionStatus === BuildContracts.DefinitionQueueStatus.Paused || definitionStatus === BuildContracts.DefinitionQueueStatus.Disabled);

        document.title = Utils_String.format(BuildResources.DefinitionSummaryPageTitleFormat, definitionName);

        let detailsSectionProps: DefinitionSummarySectionProps = {
            title: BuildResources.BuildDefinitionSummaryDetailsHeader,
            definition: this.state.definitionRow
        };

        let queuedAndRunningSectionProps: DefinitionSummarySectionProps = {
            title: BuildResources.BuildDefinitionSummaryQueuedAndRunningHeader,
            definition: this.state.definitionRow
        };

        let recentlyCompletedSectionProps: DefinitionSummarySectionProps = {
            title: BuildResources.BuildDefinitionSummaryRecentlyCompletedHeader,
            definition: this.state.definitionRow
        };

        let analyticsSectionProps: DefinitionSummarySectionProps = {
            title: BuildResources.BuildDefinitionSummaryAnalyticsHeader,
            definition: this.state.definitionRow
        };

        let branchesSection: JSX.Element = null;

        let branchesInfo = this.state.buildsPerBranchInfo;

        performance.addSplitTiming("start calculating branches section");
        if (branchesInfo && branchesInfo.uniqueBranchNames && branchesInfo.branchBuildsMap) {

            let branchesSectionProps: BranchesSectionProps = {
                title: BuildResources.BuildDefinitionSummaryBranchesHeader,
                definition: this.state.definitionRow,
                uniqueBranchNames: branchesInfo.uniqueBranchNames,
                branchBuildsMap: branchesInfo.branchBuildsMap
            };

            branchesSection = <div className="summary-section-holder-right">
                <BranchesSectionComponent { ...branchesSectionProps } />
            </div>;
        }
        performance.addSplitTiming("end calculating branches section");

        performance.addSplitTiming("start rendering all sections");

        let component = <div>
            {showQueueStatusMessage &&
                <div className="queue-status-message-bar">
                    <MessageBar
                        messageBarType={definitionStatus == BuildContracts.DefinitionQueueStatus.Paused ? MessageBarType.warning : MessageBarType.severeWarning}
                        isMultiline={false}
                        actions={<DefaultButton onClick={this._resumeDefinition}>{BuildResources.ResumeText}</DefaultButton>}>
                        <QueueStatusMessagePureComponent queueStatus={definitionStatus} />
                    </MessageBar>
                </div>
            }
            <div className="build-details">
                <div className="summary-section-holder-left">
                    <DetailsSectionComponent { ...detailsSectionProps } />
                    <QueuedAndRunningSectionComponent { ...queuedAndRunningSectionProps } />
                    <RecentlyCompletedSectionComponent { ...recentlyCompletedSectionProps } />
                    <AnalyticsSectionComponent { ...analyticsSectionProps } />
                </div>
                {branchesSection}
            </div>
        </div>;

        performance.addSplitTiming("end rendering all sections");
        performance.end();

        return component;
    }

    public componentDidMount() {
        this._definitionSummaryStore.addChangedListener(this._onStoresUpdated);
        this._viewState.addChangedListener(this._onStoresUpdated);
    }

    public componentWillUnmount() {
        this._definitionSummaryStore.removeChangedListener(this._onStoresUpdated);
        this._viewState.removeChangedListener(this._onStoresUpdated);
    }

    private _resumeDefinition = () => {
        getQueueStatusHandler().enableDefinition(this.state.definitionRow.definitionResult.result.id);
    }

    private _getState(): State {
        let performance = Performance.getScenarioManager().startScenario(BuildCustomerIntelligenceInfo.Area, StateScenarios.DefinitionSummaryControllerView);
        let definitionId: number = this._viewState.getDefinitionId();
        if (definitionId < 1) {
            return {
                definitionRow: null,
                buildsPerBranchInfo: null
            };
        }

        let definition = this._definitionSummaryStore.getDefinitionRow(definitionId);
        let buildsPerBranchInfo = this._definitionSummaryStore.getBuildsPerBranchInfo(definitionId);
        performance.end();

        return {
            definitionRow: definition,
            buildsPerBranchInfo: buildsPerBranchInfo
        };
    }
}

export interface DefinitionSummarySectionProps extends React.Props<any> {
    title: string;
    definition: DefinitionSummaryStore.DefinitionRow;
}

export class DefinitionSummarySectionComponent extends React.Component<DefinitionSummarySectionProps, any> {
    public render(): JSX.Element {
        if (this.props.definition.definitionResult.pending) {
            return <div className="summary-section">
                <h2 className="header">
                    {this.props.title}
                </h2>
            </div>;
        }

        return <div className="summary-section">
            <h2 className="header">
                {this.props.title}
            </h2>
            {this.renderContents()}
        </div>;
    }

    public renderContents(): JSX.Element {
        return <div>
            {this.props.definition.definitionResult.result.name}
        </div>;
    }
}

class DetailsSectionComponent extends DefinitionSummarySectionComponent {
    public renderContents(): JSX.Element {
        let definition = this.props.definition.definitionResult.result as BuildContracts.BuildDefinition;
        let queue = definition ? definition.queue : null;
        let queueStatus = definition ? definition.queueStatus : null;
        let queueElement: JSX.Element = null;

        const canManageQueues = hasPoolPermission(DistributedTaskPermissions.Manage);
        if (!!queue) {
            queueElement = <DefaultQueueComponent queueName={queue.name} queueId={queue.id} canManage={canManageQueues} />;
        }
        else {
            // show that there is no queue if it doesn't exist rather than hiding it
            queueElement = <SummaryItemComponent label={BuildResources.DefaultQueueLabel}>
                <ManageQueuesLinkComponent canManage={canManageQueues} />
            </SummaryItemComponent>;
        }

        // Defaults to enabled
        let queueStatusName: string = "";
        switch (queueStatus) {
            case BuildContracts.DefinitionQueueStatus.Paused:
                queueStatusName = BuildResources.Paused;
                break;
            case BuildContracts.DefinitionQueueStatus.Disabled:
                queueStatusName = BuildResources.Disabled;
                break;
            case BuildContracts.DefinitionQueueStatus.Enabled:
            default:
                queueStatusName = BuildResources.Enabled;
                break;
        }


        if (!definition.repository) {
            return <div className="summary-section-contents">
                {queueElement}
                <QueueStatusComponent queueStatus={queueStatusName} />
                <LastUpdatedByComponent definition={this.props.definition.definitionResult.result} />
            </div>;
        }

        return <div className="summary-section-contents">
            <SummaryItemComponent label={BuildResources.RepositoriesTitle}>
                <RepositoryLink repository={definition.repository} />
            </SummaryItemComponent>

            {queueElement}
            <QueueStatusComponent queueStatus={queueStatusName} />

            <LastUpdatedByComponent definition={this.props.definition.definitionResult.result} />
        </div>;
    }
}

interface LastUpdatedByPureProps {
    lastUpdatedBy: string;
    lastUpdatedTime: string;
}

const LastUpdatedByComponentPure = (props: LastUpdatedByPureProps): JSX.Element => {
    return <SummaryItemComponent label={BuildResources.LastUpdatedByLabel}>
        <span className="summary-item-detail">{props.lastUpdatedBy}</span> | {props.lastUpdatedTime}
    </SummaryItemComponent>;
}

interface LastUpdatedByProps {
    definition: BuildContracts.BuildDefinitionReference;
}

const LastUpdatedByComponent = (props: LastUpdatedByProps): JSX.Element => {
    return <LastUpdatedByComponentPure lastUpdatedBy={props.definition.authoredBy ? props.definition.authoredBy.displayName : ""} lastUpdatedTime={Utils_Date.localeFormat(props.definition.createdDate, "f")} />;
}

interface QueueStatusMessagePureProps {
    queueStatus: BuildContracts.DefinitionQueueStatus;
}

const QueueStatusMessagePureComponent = (props: QueueStatusMessagePureProps): JSX.Element => {
    return <span> {props.queueStatus == BuildContracts.DefinitionQueueStatus.Paused ?
        BuildResources.MessageBarPausedDefinitionText : BuildResources.MessageBarDisabledDefinitionText}
    </span>;
}

interface DefaultQueueProps {
    queueName: string;
    queueId: number;
    canManage: boolean;
}

const DefaultQueueComponent = (props: DefaultQueueProps): JSX.Element => {
    if (props.canManage) {
        return <SummaryItemComponent label={BuildResources.DefaultQueueLabel}>
            <span className="summary-item-detail">{props.queueName}</span> | <ManageQueuesLinkComponent queueId={props.queueId} queueName={props.queueName} canManage={true} />
        </SummaryItemComponent>;
    }
    else {
        return <SummaryItemComponent label={BuildResources.DefaultQueueLabel}>
            <span className="summary-item-detail">{props.queueName}</span>
        </SummaryItemComponent>;
    }
}

interface QueueStatusProps {
    queueStatus: string;
}

const QueueStatusComponent = (props: QueueStatusProps): JSX.Element => {
    return <SummaryItemComponent label={BuildResources.QueueStatusLabel}>
        <span className="summary-item-detail">{props.queueStatus}</span>
    </SummaryItemComponent>
}

interface SummaryItemProps {
    label: string;
    children?: React.ReactNode;
}

const SummaryItemComponent = (props: SummaryItemProps): JSX.Element => {
    return <div className="summary-item">
        <label className="summary-item-label">{props.label}</label>
        {props.children}
    </div>;
};

interface ManageQueuesLinkPureProps {
    title: string;
    text: string;
    href: string;
    disabled: boolean;
}

const ManageQueuesLinkComponentPure = (props: ManageQueuesLinkPureProps): JSX.Element => {
    if (props.disabled) {
        return null;
    }
    else {
        return <a aria-label={props.title} href={props.href}>{props.text}</a>
    }
}

interface ManageQueuesLinkProps {
    queueId?: number;
    queueName?: string;
    canManage: boolean;
}

const ManageQueuesLinkComponent = (props: ManageQueuesLinkProps): JSX.Element => {
    var tfsContext = TFS_Host_TfsContext.TfsContext.getDefault();
    var projectName = tfsContext.contextData.project.name;
    var queueManageLink = tfsContext.getActionUrl(null, "AgentQueue", { project: projectName, area: "admin", queueId: props.queueId } as TFS_Host_TfsContext.IRouteData);

    return <ManageQueuesLinkComponentPure title={Utils_String.format(BuildResources.ManageQueueLinkText, props.queueName)} href={queueManageLink} text={BuildResources.ManageText} disabled={!props.canManage} />
}

class QueuedAndRunningSectionComponent extends DefinitionSummarySectionComponent {
    public renderContents(): JSX.Element {
        var buildRefs = this.props.definition.queuedOrRunningHistory.result;

        if (this.props.definition.queuedOrRunningHistory.pending || buildRefs.length === 0) {
            return <div className="summary-section-contents">
                <label className="inline">{BuildResources.NoBuildsQueuedOrRunningLabel}</label>
            </div>;
        }

        return <div className="summary-section-contents">
            {
                buildRefs.map((buildRef: BuildContracts.Build) => <BuildRowComponent key={buildRef.id} build={buildRef} />)
            }
        </div>;
    }
}

class RecentlyCompletedSectionComponent extends DefinitionSummarySectionComponent {
    public renderContents(): JSX.Element {
        var buildRefs = this.props.definition.completedHistory.result;

        if (this.props.definition.completedHistory.pending || buildRefs.length === 0) {
            return <div className="summary-section-contents">
                <label className="inline">{BuildResources.NoRecentlyCompletedBuildsLabel}</label>
            </div>;
        }

        return <div className="summary-section-contents">
            {
                buildRefs.map((buildRef: BuildContracts.Build) => <BuildRowComponent key={buildRef.id} build={buildRef} />)
            }
        </div>;
    }
}

class AnalyticsSectionComponent extends DefinitionSummarySectionComponent {
    public renderContents(): JSX.Element {
        var metrics = this.props.definition.metrics;

        // no success rate section if there are no metrics
        if (!metrics) {
            return <div className="summary-section-contents">
                <NumberOfBuildsComponent metrics={metrics} />
            </div>
        }

        return <div className="summary-section-contents">
            <NumberOfBuildsComponent metrics={metrics} />
            <SuccessRateComponent metrics={metrics} />
        </div>;
    }
}

export interface AnalyticsProps extends React.Props<any> {
    metrics: BuildContracts.BuildMetric[];
}

interface NumberOfBuildsPureProps {
    totalBuilds: number;
}

const NumberOfBuildsComponentPure = (props: NumberOfBuildsPureProps): JSX.Element => {
    return <div className="analytics-section leftmost-analytics-section">
        <label className="analytics-section-header">{BuildResources.NumberOfBuildsTitle}</label>
        <h1 aria-label={Utils_String.format(BuildResources.DefinitionSummaryTotalBuildsLabel, props.totalBuilds)} className="total-builds">
            {props.totalBuilds}
        </h1>
    </div>;
};

const NumberOfBuildsComponent = (props: AnalyticsProps): JSX.Element => {
    let metrics = props.metrics;
    let totalBuilds = 0;

    // metrics are created on the fly, so if they're undefined/null, no builds have been run yet
    if (metrics) {
        let totalBuildsMetric = metrics.filter((metric) => {
            return metric.name === DefinitionMetrics.TotalBuilds;
        }) || [];

        totalBuildsMetric.forEach((metric) => {
            totalBuilds += metric.intValue;
        });
    }

    return <NumberOfBuildsComponentPure totalBuilds={totalBuilds} />;
};

interface SuccessRatePureProps {
    metrics: BuildContracts.BuildMetric[];
    successRate: string;
}

const SuccessRateComponentPure = (props: SuccessRatePureProps): JSX.Element => {
    return <div className="analytics-section">
        <label className="analytics-section-header">{BuildResources.SuccessRateTitle}</label>
        <div className="success-rate-pie-chart">
            <AnalyticsPieChartComponent metrics={props.metrics} />
        </div>
        <h1 aria-label={Utils_String.format(BuildResources.DefinitionSummarySuccessRateLabel, props.successRate)} className="success-rate">{props.successRate}</h1>
    </div>;
};

const SuccessRateComponent = (props: AnalyticsProps): JSX.Element => {
    let metrics = props.metrics;

    let successfulBuilds = 0;
    let successfulBuildsMetric = metrics.filter((metric) => {
        return metric.name === DefinitionMetrics.SuccessfulBuilds;
    }) || [];

    successfulBuildsMetric.forEach((metric) => {
        successfulBuilds += metric.intValue;
    });

    // other builds are failed and partially succeeded. 
    // we don't want to include cancelled builds or builds that haven't finished yet
    let otherBuilds = 0;
    let otherBuildsMetric = metrics.filter((metric) => {
        return metric.name === DefinitionMetrics.FailedBuilds ||
            metric.name === DefinitionMetrics.PartiallySuccessfulBuilds;
    }) || [];

    otherBuildsMetric.forEach((metric) => {
        otherBuilds += metric.intValue;
    });

    let totalBuilds = successfulBuilds + otherBuilds;

    // no builds have completed to show in pie chart
    if (totalBuilds === 0) {
        return <div />;
    }

    return <SuccessRateComponentPure metrics={metrics} successRate={Utils_Number.localeFormat((successfulBuilds / totalBuilds) * 100, "N") + '%'} />
};

class AnalyticsPieChartComponent extends TFS_React.TfsComponent<AnalyticsProps, TFS_React.IState> {
    private _pieChart: PieControls.PieChart;
    private _onStoresUpdated: () => void;

    constructor(props: AnalyticsProps) {
        super(props);
    }

    public shouldComponentUpdate(nextProps: AnalyticsProps, nextState: TFS_React.IState): boolean {
        return !this._areMetricsEqual(this.props.metrics, nextProps.metrics);
    }

    protected onRender(element: HTMLElement) {
        let data = this._getPieChartData(this.props.metrics || []);
        if (!this._pieChart) {

            this._pieChart = Controls.Control.create<PieControls.PieChart, Charting_Contracts.PieChartOptions>(
                PieControls.PieChart,
                $(element),
                this._getPieChartOptions(data));
        }
        else {
            this._pieChart.update(data);
        }
    }

    private _areMetricsEqual(metricsA: BuildContracts.BuildMetric[], metricsB: BuildContracts.BuildMetric[]) {
        return metricsA.length === metricsB.length && Utils_Array.arrayEquals(metricsA, metricsB, (a, b) => {
            return a.name === b.name && a.intValue === b.intValue;
        });
    }

    private _getPieChartOptions(data: Charting_Contracts.PieChartDataPoint[]): Charting_Contracts.PieChartOptions {
        return {
            height: 75,
            width: 75,
            tooltipOptions: {
                enabled: false,
            },
            spacing: [0, 0, 0, 0],
            margin: [0, 0, 0, 0],
            data: data,
            innerSizePercentage: "45%",
            enableHover: false,
            dataLabelOptions: {
                enabled: false
            }
        };
    }

    private _getPieChartData(metrics: BuildContracts.BuildMetric[]): Charting_Contracts.PieChartDataPoint[] {
        let pieChartData: Charting_Contracts.PieChartDataPoint[] = [];
        let failedSlice: Charting_Contracts.PieChartDataPoint = null;
        let succeededSlice: Charting_Contracts.PieChartDataPoint = null;
        let partiallySucceededSlice: Charting_Contracts.PieChartDataPoint = null;

        metrics.forEach((metric) => {
            switch (metric.name) {
                case DefinitionMetrics.FailedBuilds:
                    if (!failedSlice) {
                        failedSlice = {
                            name: DefinitionMetrics.FailedBuilds,
                            value: metric.intValue,
                            color: "#da0a00"
                        };
                        pieChartData.push(failedSlice);
                    }
                    else {
                        failedSlice.value += metric.intValue;
                    }
                    break;
                case DefinitionMetrics.SuccessfulBuilds:
                    if (!succeededSlice) {
                        succeededSlice = {
                            name: DefinitionMetrics.SuccessfulBuilds,
                            value: metric.intValue,
                            color: "#339933"
                        };
                        pieChartData.push(succeededSlice);
                    }
                    else {
                        succeededSlice.value += metric.intValue;
                    }
                    break;
                case DefinitionMetrics.PartiallySuccessfulBuilds:
                    if (!partiallySucceededSlice) {
                        partiallySucceededSlice = {
                            name: DefinitionMetrics.PartiallySuccessfulBuilds,
                            value: metric.intValue,
                            color: "#ffcc00"
                        };
                        pieChartData.push(partiallySucceededSlice);
                    }
                    else {
                        partiallySucceededSlice.value += metric.intValue;
                    }
                    break;
            }
        });

        return pieChartData;
    }
}

interface BuildRowProps {
    build: BuildContracts.Build;
}

class BuildRowComponent extends React.Component<BuildRowProps, TFS_React.IState> {
    constructor(props: BuildRowProps) {
        super(props);

        this.state = {
            isHovering: false
        };
    }

    public render(): JSX.Element {
        let buildRef = this.props.build;
        if (!buildRef) {
            return <div className="summary-build-row" />;
        }

        // display branch information if we have a full build loaded
        let fullBuild: any = buildRef;
        let sourceBranchColumn: JSX.Element = null;
        if (!!fullBuild.sourceBranch) {
            sourceBranchColumn = <SourceBranchLink build={fullBuild} />;
        }

        return <div className="summary-build-row" onMouseOver={() => this._mouseOver()}>
            <span className="build-detail-link-column">
                <BuildDetailLink
                    className="build-definition-entry-details-subtitle"
                    build={this.props.build}
                    buildNumberFormat={BuildResources.BuildNumberLinkFormat} />
            </span>
            <span className="build-status-column"><BuildStatus build={buildRef} /></span>
            <span className="build-source-branch-column">{sourceBranchColumn}</span>
            <span className="build-requested-for-column">{buildRef.requestedFor ? buildRef.requestedFor.displayName: "" }</span>
        </div>;
    }

    private _mouseOver() {
        this.setState({
            isHovering: true
        });
    }
}

interface BranchesSectionProps extends DefinitionSummarySectionProps {
    uniqueBranchNames: string[];
    branchBuildsMap: any;
}

class BranchesSectionComponent extends DefinitionSummarySectionComponent {
    public renderContents(): JSX.Element {
        let props = this.props as BranchesSectionProps;

        let branchNames = [];

        // filter out only loaded branches with at least one build
        branchNames = props.uniqueBranchNames.filter((branchName) => {
            let builds = props.branchBuildsMap[branchName];
            return (!builds.pending && builds.result.length > 0);
        });

        // sort branch names by most recently completed build time
        branchNames = branchNames.sort((a: string, b: string) => {
            return props.branchBuildsMap[b].result[0].finishTime - props.branchBuildsMap[a].result[0].finishTime;
        });

        if (branchNames.length == 0) {
            return <div className="summary-section-contents">
                <label className="inline">{BuildResources.NoDataText}</label>
            </div>;
        }

        return <div className="summary-section-contents">
            {
                branchNames.map((name: string) => <BranchRowComponent key={name} builds={props.branchBuildsMap[name]} branchName={name} />)
            }
        </div>;
    }
}

interface BranchRowProps extends React.Props<any> {
    builds: QueryResult<BuildContracts.Build[]>;
    branchName: string;
}

class BranchRowComponent extends React.Component<BranchRowProps, TFS_React.IState> {
    constructor(props: BranchRowProps) {
        super(props);

        this.state = {
            isHovering: false
        };
    }

    public render(): JSX.Element {
        if (this.props.builds.pending) {
            return <div>
                {this.props.branchName}
            </div>;
        }

        if (this.props.builds.result.length === 0) {
            // show nothing if the branch has no builds (they've all been deleted)
            return <div />;
        }

        let build = this.props.builds.result[0];
        return <div className="definition-branch-row" onMouseOver={() => this._mouseOver()}>
            <span className="branch-link-column"><SourceBranchLink build={build} /></span>
            <span className="branch-status-column"><DefinitionStatus.DefinitionStatus history={this.props.builds} /></span>
            <span className="branch-last-build-time-column"><BuildTimeLink build={build} /></span>
        </div>;
    }

    private _mouseOver() {
        this.setState({
            isHovering: true
        });
    }
}

interface BuildTimeLinkPureProps {
    href: string;
    text: string;
}

const BuildTimeLinkPure = (props: BuildTimeLinkPureProps): JSX.Element => {
    return <span className="build-definition-entry-time"><a aria-label={Utils_String.format(BuildResources.ViewLatestBuildText, props.text)} href={props.href}>{props.text}</a></span>;
}

export interface BuildTimeLinkProps {
    build: BuildContracts.Build;
}

export const BuildTimeLink = (props: BuildTimeLinkProps): JSX.Element => {
    return injectTime((time: Date) => {
        let build = props.build;
        let buildTime: Date = time;
        if (build.status === BuildContracts.BuildStatus.Completed && build.finishTime) {
            buildTime = build.finishTime;
        }
        else if (build.status === BuildContracts.BuildStatus.InProgress && build.startTime) {
            buildTime = build.startTime;
        }
        else {
            buildTime = build.queueTime;
        }

        let friendlyTime: string = Utils_Date.friendly(buildTime);

        return <BuildTimeLinkPure text={friendlyTime} href={BuildLinks.getBuildDetailLink(build.id)} />
    });
};