/// <reference types="react" />
import "VSS/LoaderPlugins/Css!TestManagement/Scripts/Scenarios/Common/DetailsPanel/Components/ResultDetailsHeader";

import { Icon } from "OfficeFabric/Icon";
import { Link } from "OfficeFabric/Link";
import { TooltipHost } from "VSSUI/Tooltip";
import * as OfficeFabricUtility from "OfficeFabric/Utilities";
import * as React from "react";
import * as Resources from "TestManagement/Scripts/Resources/TFS.Resources.TestManagement";
import { TestMode } from "TestManagement/Scripts/Scenarios/Common/DetailsPanel/Stores/TestResultDetailsViewStore";
import * as CommonHelper from "TestManagement/Scripts/Scenarios/TestTabExtension/CommonHelper";
import { TestTabTelemetryService } from "TestManagement/Scripts/Scenarios/TestTabExtension/Telemetry";
import * as CommonBase from "TestManagement/Scripts/TestReporting/Common/Common";
import * as ValueMap from "TestManagement/Scripts/TFS.TestManagement.RunsView.ValueMap";
import * as TMUtils from "TestManagement/Scripts/TFS.TestManagement.Utils";
import { TestOutcome } from "TFS/TestManagement/Contracts";
import * as ComponentBase from "VSS/Flux/Component";
import * as Utils_Date from "VSS/Utils/Date";
import * as Utils_String from "VSS/Utils/String";


export interface IResultHeaderDetailsProps extends ComponentBase.Props {
    outcome?: TestOutcome;
    duration?: string;
    startedDate?: Date;
    completedDate?: Date;
    state?: string;
    failingContextName?: string;
    failingContextId?: number;
    owner?: string;
    computerName?: string;
    testMode: TestMode;
    viewContext?: CommonBase.ViewContext;
    isCurrentArtifact?: boolean;
}

export class ResultDetailsHeaderComponent extends ComponentBase.Component<IResultHeaderDetailsProps> {
    public render(): JSX.Element {        
        return (
            <div className="test-result-header-content">
                <div className="result-header-row result-outcome-and-duration">
                {
                    this.props.testMode === TestMode.TestResult && this.props.state &&
                    this._getResultOutcomeField()
                }
                {
                    this.props.testMode === TestMode.TestRun && this.props.state &&
                    this._getRunStateField()
                }
                {
                    this._getDurationField()
                }
                </div>
                {
                    this.props.testMode === TestMode.TestResult &&
                    <div className="result-header-row result-artifact-info-and-owner">
                    {
                        this.props.failingContextName
                            ? this._getFailingBuildReleaseLinkDiv()
                            : <div className="result-header-info artifact-info" />
                    }
                    {
                        this._getResultOwnerField()
                    }
                    </div>
                }
            </div>
        );
    }

    private _getRunStateField(): JSX.Element {
        const completedSince: string = this._calculateCompletedSince();
        return (
            this.props.state
            ? <div className="result-header-info result-outcome-status">
                <span className="run-outcome-status">
                {
                    Utils_String.format(
                        Resources.ResultOutcomeInfo,
                        this.props.state,
                        completedSince
                    )
                }
                </span>
            </div>
            : null
        );
    }

    private _getResultOutcomeField(): JSX.Element {
        return (
            <div className="result-header-info result-outcome-status">
                <span>
                    {this._getOutcomeIcon()}
                </span>
                <span className="result-outcome-status-computerName">
                    {this._getOutcomeAndComputerNameInfoText()}
                </span>
            </div>
        );
    }

    private _getDurationField(): JSX.Element {
        return (
            <div className="result-header-info run-duration-info">
                <label className="result-header-label">
                    {Resources.ResultGridHeader_Duration}
                </label>
                <TooltipHost content={this.props.duration}>
                    <span className="run-duration">{this.props.duration}</span>
                </TooltipHost>
            </div>
        );
    }

    private _getResultOwnerField(): JSX.Element {
        const owner: string = this.props.owner
            ? this.props.owner
            : Resources.NotAvailableText;
            
        return (
            <div className="result-header-info owner-info">
                <label className="owner-label">{Resources.Owner}</label>
                {
                    <TooltipHost content={owner}>
                        <span className="owner-name">{owner}</span>
                    </TooltipHost>
                }
            </div>
        );
    }

    private _getFailingBuildReleaseLinkDiv(): JSX.Element {
        let failingContextLabel: string;
        let failingUrl: string;
        let telemetryEvent: string;

        if (this.props.viewContext === CommonBase.ViewContext.Build) {
            failingContextLabel = Resources.ResultGridHeader_FailingBuild;
            failingUrl = TMUtils.UrlHelper.getBuildSummaryTestTabUrl(this.props.failingContextId);
            telemetryEvent = TestTabTelemetryService.featureTestTab_BuildLinkClicked;
        } else if (this.props.viewContext === CommonBase.ViewContext.Release) {
            failingContextLabel = Resources.ResultGridHeader_FailingRelease;
            failingUrl = TMUtils.UrlHelper.getNewReleaseSummaryTestTabUrl(this.props.failingContextId);
            telemetryEvent = TestTabTelemetryService.featureTestTab_ReleaseLinkClicked;
        }

        return <div className="result-header-info artifact-info">
            <label className="failingContext-label">{failingContextLabel}</label>
            <TooltipHost content={this.props.failingContextName}>
                <span>
                    {
                        this.props.isCurrentArtifact ? this.props.failingContextName : this._getFailingArtifactLink(failingUrl, telemetryEvent)
                    }
                </span>
            </TooltipHost>
        </div>;
    }

    private _getFailingArtifactLink(failingUrl: string, telemetryEvent: string): JSX.Element {
       return <Link href={failingUrl}
            target={"_blank"}
            className={"artifact-url"}
            onClick={() => {
                TestTabTelemetryService.getInstance().publishDetailsPaneEvents(telemetryEvent, {});
            }}
            rel={"nofollow noopener noreferrer"} >
            { this.props.failingContextName }
        </Link>
    }

    private _calculateOutcome(): string {
        return ValueMap.TestOutcome.getFriendlyName(this.props.outcome);
    }

    private _calculateCompletedSince(): string {
        let sb: Utils_String.StringBuilder = new Utils_String.StringBuilder();

        if (Utils_String.defaultComparer(this.props.state, "Completed") === 0 && this.props.completedDate) {
            sb.append(" ");

            // date will be in client time zone. ago will compare date in client time zone.
            sb.append(Utils_Date.ago(this.props.completedDate));
        }
        else if (this.props.startedDate) {
            sb.append(" ");

            // date will be in client time zone. ago will compare date in client time zone.
            sb.append(Utils_Date.ago(this.props.startedDate));
        }

        return sb.toString();
    }

    private _getOutcomeAndComputerNameInfoText(): JSX.Element {
        const outcome: string = this._calculateOutcome();
        const completedSince: string = this._calculateCompletedSince();
        return (
            this.props.computerName
                ? <span className="test-results-outcome-machine-name-info">
                    {
                            Utils_String.format(
                            Resources.ResultOutcomeAndMachineNameInfo,
                            outcome,
                            completedSince,
                            this.props.computerName
                        )
                    }
                </span>
                : <span className="test-result-outcome-info">
                    {
                        Utils_String.format(
                            Resources.ResultOutcomeInfo,
                            outcome,
                            completedSince
                        )
                    }
                </span>
        );
    }

    private _getOutcomeIcon(): JSX.Element {
        const iconDetails: CommonHelper.IconDetails = CommonHelper.TestOutcome.getIconDetails(this.props.outcome);
        return (
            <Icon iconName={iconDetails.iconName} className={`${iconDetails.className} testresult-outcome-icon`} />
        );
    }

    private _calculateOutcomeIconClass(): string {
        let outcomeIconClass: string;

        if (Utils_String.defaultComparer(this.props.state, "Completed") === 0) {
            outcomeIconClass = OfficeFabricUtility.css("testresult-outcome-shade bowtie-icon icon", ValueMap.TestOutcome.getIconClassName(this.props.outcome));
        }

        return outcomeIconClass;
    }
}