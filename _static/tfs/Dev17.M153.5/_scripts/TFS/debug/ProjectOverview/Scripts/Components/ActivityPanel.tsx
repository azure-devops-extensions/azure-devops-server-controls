/// <reference types="react" />

import * as React from "react";
import { Dropdown, IDropdownProps, IDropdownOption } from "OfficeFabric/Dropdown";
import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import { format } from "VSS/Utils/String";
import { FeatureAvailabilityFlags } from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import ProjectOverviewResources = require("ProjectOverview/Scripts/Resources/TFS.Resources.ProjectOverview");
import { GitCodeMetricsData, TfvcCodeMetricsData, WitMetricsData } from "ProjectOverview/Scripts/Generated/Contracts";
import {
    MetricSubSectionProps,
    MetricSection,
    RightPanelUpsellProps,
    IndividualMetricData,
} from "ProjectOverview/Scripts/Components/MetricSection";
import { ChartType } from "ProjectOverview/Scripts/Components/Charts/ChartProps";
import { MetricState, BuildMetrics, ReleaseMetrics } from "ProjectOverview/Scripts/Stores/MetricsStore"
import { WitAvailabilityStatus, ReleaseAvailabilityStatus, DeploymentMetricsData, BuildMetricsPayload } from "ProjectOverview/Scripts/ActionsHub";
import { UrlHelper } from "ProjectOverview/Scripts/Utils";
import { Constants, RMConstants } from "ProjectOverview/Scripts/Constants";
import "VSS/LoaderPlugins/Css!ProjectOverview/Scripts/Components/ActivityPanel";

const maxCodeMetricValue = 10000;
const maxCodeMetricString = "10K";

export interface ActivityPanelProps {
    numberOfDaysSelected: number;
    numberOfDaysOptions: number[];
    codeMetricsAvailableDays: number;
    hasWriteAccess: boolean;
    onNumberOfDaysChanged: (numberOfDays: number) => void;
    metricsState: MetricState;
    onAddCodeClicked: () => void;
    onAddWorkClicked: () => void;
    onSetupBuildClicked: () => void;
    onSetupReleaseClicked: () => void;
    headingLevel: number;
}

export interface ActivityPanelState {
    numberOfDaysSelected: number;
}

export class ActivityPanel extends React.Component<ActivityPanelProps, ActivityPanelState> {
    private _useNewBranding: boolean;

    constructor(props) {
        super(props);
        this.state = {
            numberOfDaysSelected: this.props.numberOfDaysSelected
        }
        this._useNewBranding = FeatureAvailabilityService.isFeatureEnabled("VisualStudio.Services.WebPlatform.UseNewBranding", false);
    }

    public render(): JSX.Element {

        let buildReleaseSection: JSX.Element = null;
        let showCodeDataUnavailableInfo: boolean = false;
        if (this.props.metricsState.codeMetrics.hasCode
            && this.props.numberOfDaysSelected > this.props.codeMetricsAvailableDays) {
            showCodeDataUnavailableInfo = true;
        }

        if (FeatureAvailabilityService.isFeatureEnabled(
            FeatureAvailabilityFlags.NewProjectOVerviewPageBuildReleaseMetrics, false)) {

            // @TODO: Remove the any below. BuildReleaseMetrics' props interface does not 
            // inherit from MetricState, so don't try to spread metricState!
            buildReleaseSection = <BuildReleaseMetrics
                {...this.props.metricsState as any}
                hasWriteAccess={this.props.hasWriteAccess}
                onSetupBuildClicked={this.props.onSetupBuildClicked}
                onSetupReleaseClicked={this.props.onSetupReleaseClicked}
                useNewBranding={this._useNewBranding}
                headingLevel={this.props.headingLevel + 1} />;
        }

        return (
            <div className="activity-panel">
                <div className="title">
                    <label
                        className="label"
                        role="heading"
                        aria-level={this.props.headingLevel}>
                        {ProjectOverviewResources.ActivityPanel_Header}
                    </label>
                    <div className="dropdown">
                        <Dropdown
                            options={createDropdownOptions(this.props.numberOfDaysOptions)}
                            label=""
                            ariaLabel={ProjectOverviewResources.ActivityPanel_DropDownLabel}
                            onChanged={this._numberOfDaysChanged}
                            selectedKey={this.state.numberOfDaysSelected.toString()} />
                    </div>
                    <div className="clear-float" />
                </div>
                <CodeMetricsContainer
                    gitMetrics={this.props.metricsState.codeMetrics.gitMetrics}
                    tfvcMetrics={this.props.metricsState.codeMetrics.tfvcMetrics}
                    hasWriteAccess={this.props.hasWriteAccess}
                    isEmpty={!this.props.metricsState.codeMetrics.hasCode}
                    onAddCodeClicked={this.props.onAddCodeClicked}
                    dataAvailableForDays={this.props.codeMetricsAvailableDays}
                    showDataUnavailableInfo={showCodeDataUnavailableInfo}
                    useNewBranding={this._useNewBranding}
                    headingLevel={this.props.headingLevel + 1} />
                {buildReleaseSection}
                <WorkMetricsContainer
                    workMetrics={this.props.metricsState.workMetrics.metrics}
                    witAvailable={this.props.metricsState.workMetrics.witAvailable}
                    hasWriteAccess={this.props.hasWriteAccess}
                    onAddWorkClicked={this.props.onAddWorkClicked}
                    useNewBranding={this._useNewBranding}
                    headingLevel={this.props.headingLevel + 1} />
            </div>);
    }

    private _numberOfDaysChanged = (numberOfDaysOption: IDropdownOption) => {
        this.setState({
            numberOfDaysSelected: Number(numberOfDaysOption.key)
        });
        this.props.onNumberOfDaysChanged(Number(numberOfDaysOption.key));
    }
}

interface CodeMetricsContainerProps {
    gitMetrics: GitCodeMetricsData;
    tfvcMetrics: TfvcCodeMetricsData;
    hasWriteAccess: boolean;
    isEmpty: boolean;
    onAddCodeClicked: () => void;
    dataAvailableForDays: number;
    showDataUnavailableInfo: boolean;
    useNewBranding: boolean;
    headingLevel: number;
}

const CodeMetricsContainer = (props: CodeMetricsContainerProps): JSX.Element => {

    let dataUnavailableMessage = props.dataAvailableForDays === 0
        ? ProjectOverviewResources.CodeMetrics_DataUnavailable_ConciseMessage
        : format(ProjectOverviewResources.CodeMetrics_DataUnavailable_DetailFormat, props.dataAvailableForDays);

    let codeSectionMetricProps = getCodeMetricSectionProp(props.gitMetrics, props.tfvcMetrics);
    if (!codeSectionMetricProps.length && !props.isEmpty)
        return null;

    let upsell: RightPanelUpsellProps = {
        text: ProjectOverviewResources.CodeUpsell_AddCode,
        link: TfsContext.getDefault().getActionUrl("index", "code"),
        onClick: props.onAddCodeClicked,
        showUpsell: props.isEmpty && props.hasWriteAccess,
    };
    const header = props.useNewBranding
        ? ProjectOverviewResources.MetricContainer_Repos
        : ProjectOverviewResources.MetricContainer_Code;

    return (
        <MetricSection
            header={header}
            metricsSubSections={codeSectionMetricProps}
            isMetricsEmpty={props.isEmpty}
            emptyMetricsMsg={ProjectOverviewResources.CodeUpsell_CodeEmpty}
            upsellProps={upsell}
            showMetricInfo={props.showDataUnavailableInfo}
            metricsInfoMsg={dataUnavailableMessage}
            headingLevel={props.headingLevel}
        />
    );
}

const BuildReleaseMetrics = (props: {
    releaseMetrics: ReleaseMetrics,
    buildMetrics: BuildMetrics,
    hasWriteAccess: boolean,
    onSetupBuildClicked: () => void,
    onSetupReleaseClicked: () => void,
    useNewBranding: boolean,
    headingLevel: number,
}): JSX.Element => {

    if (!FeatureAvailabilityService.isFeatureEnabled(
        FeatureAvailabilityFlags.NewProjectOVerviewPageBuildReleaseMetrics, false)) {
        return null;
    }

    let releaseSectionMetricProps = getReleaseMetricSectionProp(props.releaseMetrics.deploymentMetrics);
    let buildMetricProps = getBuildMetricSectionProp(props.buildMetrics.buildMetrics);
    let allMetrics = buildMetricProps.concat(releaseSectionMetricProps);

    let upsellText: string;
    let upsellLink: string;
    let emptyMsg = "";
    let showBuildUpsell = !props.buildMetrics.buildDefinitionsPresent;
    let showReleaseUpsell: boolean;
    let showUpsell: boolean = true;
    let metricsToShow: MetricSubSectionProps[];
    let isMetricEmpty: boolean = false;
    let clickHandler = props.onSetupBuildClicked;

    if (props.releaseMetrics.releaseAvailability === ReleaseAvailabilityStatus.ProviderAbsent
        || props.releaseMetrics.releaseAvailability === ReleaseAvailabilityStatus.DefinitionsPresent
        || (props.releaseMetrics.releaseAvailability === ReleaseAvailabilityStatus.AvailabilityUnknown
            && props.releaseMetrics.isRMFaultedIn)) {
        showReleaseUpsell = false;
    } else {
        showReleaseUpsell = true;
    }

    if (showBuildUpsell) {
        // show priority to BuildUpsell, over Release
        upsellText = ProjectOverviewResources.BuildUpsell_SetupBuild;
        upsellLink = UrlHelper.getNewBuildDefinitionUrl();

        if (showReleaseUpsell || props.releaseMetrics.releaseAvailability === ReleaseAvailabilityStatus.ProviderAbsent) {
            emptyMsg = ProjectOverviewResources.BuildUpsell_BuildEmpty;
            isMetricEmpty = true;
        } else {
            metricsToShow = releaseSectionMetricProps;
        }
    }
    else {
        if (showReleaseUpsell) {
            metricsToShow = buildMetricProps;
            upsellText = ProjectOverviewResources.ReleaseUpsell_SetupRelease;
            upsellLink =  UrlHelper.getNewReleaseDefinitionUrl();
            clickHandler = props.onSetupReleaseClicked;
        } else {
            showUpsell = false;
            metricsToShow = buildMetricProps.concat(releaseSectionMetricProps);
        }
    }
    //if not empty and still we dont have data 
    //then the metrics calls have not yet returned, dont show the section till then
    if (!isMetricEmpty && !metricsToShow.length) {
        return null;
    }

    let upsell: RightPanelUpsellProps = {
        text: upsellText,
        link: upsellLink,
        showUpsell: showUpsell && props.hasWriteAccess,
        onClick: clickHandler,
    }
    const header = props.useNewBranding
        ? ProjectOverviewResources.MetricContainer_Pipelines
        : ProjectOverviewResources.MetricContainer_BuildRelease;

    return (
        <MetricSection
            header={header}
            metricsSubSections={metricsToShow}
            isMetricsEmpty={isMetricEmpty}
            emptyMetricsMsg={emptyMsg}
            upsellProps={upsell}
            headingLevel={props.headingLevel} />
    );
}

const WorkMetricsContainer = (props: {
    workMetrics: WitMetricsData,
    witAvailable: WitAvailabilityStatus,
    hasWriteAccess: boolean,
    onAddWorkClicked: () => void,
    useNewBranding: boolean,
    headingLevel: number,
}): JSX.Element => {

    if ((!props.workMetrics && props.witAvailable === WitAvailabilityStatus.Created)
        || props.witAvailable === WitAvailabilityStatus.AvailabilityUnknown)
        return null;
    let workSectionMetricProps = getWorkMetricSectionProp(props.workMetrics);

    let upsell: RightPanelUpsellProps = {
        text: ProjectOverviewResources.WorkUpsell_AddWork,
        link: UrlHelper.getWorkTabUrl(),
        onClick: props.onAddWorkClicked,
        showUpsell: (props.witAvailable === WitAvailabilityStatus.NoneCreated) && props.hasWriteAccess,
    }
    const header = props.useNewBranding
        ? ProjectOverviewResources.MetricContainer_Boards
        : ProjectOverviewResources.MetricContainer_Work;

    return (
        <MetricSection
            header={header}
            metricsSubSections={workSectionMetricProps}
            isMetricsEmpty={props.witAvailable === WitAvailabilityStatus.NoneCreated}
            emptyMetricsMsg={ProjectOverviewResources.WorkUpsell_WorkEmpty}
            upsellProps={upsell}
            headingLevel={props.headingLevel} />
    );
}

function createDropdownOptions(numberOfDaysOptions: number[]): IDropdownOption[] {
    let numberOfDaysWindow: IDropdownOption[] = [];
    numberOfDaysOptions.map(option => {
        let numberOfDaysOptionText = option.toString() + " ";

        numberOfDaysOptionText += (option === 1
            ? ProjectOverviewResources.ActivityPanel_DropDownText_Day
            : ProjectOverviewResources.ActivityPanel_DropDownText_Days);
        numberOfDaysWindow.push({ key: option.toString(), text: numberOfDaysOptionText });
    });
    return numberOfDaysWindow;
}

function getCodeMetricSectionProp(gitMetrics: GitCodeMetricsData, tfvcMetrics: TfvcCodeMetricsData): MetricSubSectionProps[] {
    if (!gitMetrics && !tfvcMetrics) {
        return [];
    }

    let result: MetricSubSectionProps[] = [];
    let checkinMetrics: IndividualMetricData[] = [];
    let pullRequestsMetrics: IndividualMetricData[] = [];
    let authorCt = 0;
    let checkinMetricsTitle: string;
    let codeMetricType: string;
    let graphData: number[] = [];

    if (!!gitMetrics) {
        authorCt += gitMetrics.authorsCount;
    }

    if (!!tfvcMetrics) {
        authorCt += tfvcMetrics.authors;
    }

    if (gitMetrics) {
        pullRequestsMetrics.push({
            value: gitMetrics.pullRequestsCreatedCount,
            capValue: maxCodeMetricValue,
            capText: maxCodeMetricString,
            icon: "bowtie-tfvc-pull-request",
            iconColorCss: "blue",
            metricTitle: ProjectOverviewResources.MetricsCreated,
        }, {
                value: gitMetrics.pullRequestsCompletedCount,
                capValue: maxCodeMetricValue,
                capText: maxCodeMetricString,
                icon: "bowtie-tfvc-merge",
                iconColorCss: "green",
                metricTitle: ProjectOverviewResources.MetricsCompleted,
            });

        //Both tfvc and git
        if (tfvcMetrics) {
            checkinMetrics.push({
                value: tfvcMetrics.changesets + gitMetrics.commitsPushedCount,
                capValue: maxCodeMetricValue,
                capText: maxCodeMetricString,
                icon: "bowtie-tfvc-commit",
            });

            if (tfvcMetrics.changesets > 0
                && gitMetrics.commitsPushedCount > 0) {
                codeMetricType = ProjectOverviewResources.CodeMetrics_CommitsAndChangesets;
            }
            else if (gitMetrics.commitsPushedCount > 0) {
                codeMetricType = ProjectOverviewResources.GitMetrics_Commits;
            }
            else {
                codeMetricType = ProjectOverviewResources.TfvcMetrics_Changesets;
            }

            graphData = SumArray(tfvcMetrics.changesetsTrend, gitMetrics.commitsTrend);
        }
        else {  //Git only
            checkinMetrics.push({
                value: gitMetrics.commitsPushedCount,
                capValue: maxCodeMetricValue,
                capText: maxCodeMetricString,
                icon: "bowtie-tfvc-commit"
            });
            codeMetricType = ProjectOverviewResources.GitMetrics_Commits;
            graphData = gitMetrics.commitsTrend;
        }

        checkinMetricsTitle = format(ProjectOverviewResources.CodeMetric_Authors_Format, codeMetricType, authorCt);
        
        return [{
            individualMetrics: checkinMetrics,
            chartType: ChartType.AreaChart,
            name: checkinMetricsTitle,
            chartData: {
                data: graphData,
                screenReaderTableHeader: getScreenReaderHeaderString(graphData.length, codeMetricType),
            },
        },
        {
            individualMetrics: pullRequestsMetrics,
            chartType: ChartType.BarChart,
            name: ProjectOverviewResources.GitMetrics_PullRequests
        }];

    }

    //tfvc Metrics only
    checkinMetrics.push({
        value: tfvcMetrics.changesets,
        capValue: maxCodeMetricValue,
        capText: maxCodeMetricString,
        icon: "bowtie-tfvc-commit"
    });
    codeMetricType = ProjectOverviewResources.TfvcMetrics_Changesets;
    graphData = tfvcMetrics.changesetsTrend;

    checkinMetricsTitle = format(ProjectOverviewResources.CodeMetric_Authors_Format, codeMetricType, authorCt);

    return [{
        individualMetrics: checkinMetrics,
        chartType: ChartType.AreaChart,
        name: checkinMetricsTitle,
        chartData: {
            data: graphData,
            screenReaderTableHeader: getScreenReaderHeaderString(graphData.length, codeMetricType),
        },
    }];
}

function getScreenReaderHeaderString(dataLength: number, codeMetricTypeString: string): string {
    const isHourlyData: boolean = (dataLength === 25); // server always returns 1 extra entry (24 + 1) 
    return format(
        ProjectOverviewResources.CodeMetric_Table_Header,
        codeMetricTypeString,
        isHourlyData ? ProjectOverviewResources.CodeMetric_Chart_TimeUnit_Hour : ProjectOverviewResources.CodeMetric_Chart_TimeUnit_Day);
}

function getWorkMetricSectionProp(workMetrics: WitMetricsData): MetricSubSectionProps[] {
    let subSectionProp: MetricSubSectionProps[] = [];
    if (workMetrics) {
        subSectionProp.push({
            name: ProjectOverviewResources.WorkMetrics_WorkItems,
            chartType: ChartType.BarChart,
            individualMetrics: [{
                value: workMetrics.workItemsCreated,
                capValue: Constants.MaxWorkItemsMetric,
                capText: Constants.MaxWorkItemsMetricString,
                icon: "bowtie-backlog",
                iconColorCss: "blue",
                metricTitle: ProjectOverviewResources.MetricsCreated,
            }, {
                value: workMetrics.workItemsCompleted,
                capValue: Constants.MaxWorkItemsMetric,
                capText: Constants.MaxWorkItemsMetricString,
                icon: "bowtie-backlog",
                iconColorCss: "green",
                metricTitle: ProjectOverviewResources.MetricsClosed,
            }]
        });
    }
    return subSectionProp;
}

function getReleaseMetricSectionProp(deploymentMetrics: DeploymentMetricsData): MetricSubSectionProps[] {
    let subSectionProp: MetricSubSectionProps[] = [];

    if (!deploymentMetrics) {
        return subSectionProp;
    }

    let totalDeployments = deploymentMetrics.deploymentsPassed + deploymentMetrics.deploymentsNotPassed;
    let passPercentage = totalDeployments > 0 ?
        Math.round((deploymentMetrics.deploymentsPassed / totalDeployments) * 100)
        : -1;

    subSectionProp.push({
        name: totalDeployments > 0 ?
            ProjectOverviewResources.ReleaseMetrics_Succeeded
            : ProjectOverviewResources.ReleaseMetrics_NoDeployements,
        chartType: ChartType.PieChart,
        individualMetrics: [{
            value: passPercentage,
            icon: "bowtie-deploy",
            iconColorCss: "black",
        }]
    });
    return subSectionProp;
}

function getBuildMetricSectionProp(buildMetrics: BuildMetricsPayload): MetricSubSectionProps[] {
    let subSectionProp: MetricSubSectionProps[] = [];

    if (!buildMetrics) {
        return subSectionProp;
    }

    let totalBuilds = buildMetrics.buildsNotPassed + buildMetrics.buildsPassed;
    let passPercentage = totalBuilds > 0 ?
        Math.round((buildMetrics.buildsPassed / totalBuilds) * 100)
        : -1;

    subSectionProp.push({
        name: totalBuilds > 0 ?
            ProjectOverviewResources.BuildMetrics_Succeeded
            : ProjectOverviewResources.BuildMetrics_NoBuild,
        chartType: ChartType.PieChart,
        individualMetrics: [{
            value: passPercentage,
            icon: "bowtie-build",
            iconColorCss: "black",
        }]
    });
    return subSectionProp;
}

//sum of two number arrays assuming either only one exists or both arrays have same length. 
function SumArray(arr1: number[], arr2: number[]): number[] {
    let result: number[] = [];

    if (arr1 && arr2) {
        //assuming equal length array
        for (let i = 0; i < arr1.length; i++) {
            result.push(arr1[i] + arr2[i])
        }
    }
    else if (arr1) {
        result = arr1;
    }
    else {
        result = arr2;
    }

    return result;
}     