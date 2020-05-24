import * as React from "react";

import * as Base from "DistributedTaskControls/Common/Components/Base";
import { Component as InfoButton } from "DistributedTaskControls/Components/InfoButton";
import { TagList } from "DistributedTaskControls/Components/TagList";
import { StringInputComponent } from "DistributedTaskControls/SharedControls/InputControls/Components/StringInputComponent";

import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";

import * as ReleaseContracts from "ReleaseManagement/Core/Contracts";

import "VSS/LoaderPlugins/Css!RM:PipelineWorkflow/Scripts/ReleaseProgress/Release/ReleaseSummaryOptionsView";

export interface IReleaseSummaryOptionsViewProps extends Base.IProps {
    releaseNameFormat: string;
    reportDeploymentStatusToCodeEnvironmentList: ReleaseContracts.ReleaseEnvironment[];
}

export class ReleaseSummaryOptionsView extends Base.Component<IReleaseSummaryOptionsViewProps, Base.IStateless> {

    public render(): JSX.Element {

        return (
            <div className="release-options-view-container">
                { this._getReleaseNameFormatElement() }
                { this._getReportDeploymentStatusToCodeElement() }
            </div>
        );
    }

    private _getReleaseNameFormatElement(): JSX.Element {
        let infoProps = {
            calloutContentProps: {
                calloutMarkdown: Resources.ReleaseNameFormatInfo
            }
        };

        return (
            <StringInputComponent
                cssClass={"release-options-release-name-format"}
                label={Resources.ReleaseNameFormat}
                value={this.props.releaseNameFormat}
                ariaLevel={3}
                infoProps={infoProps}
                disabled={true} />
        );
    }

    private _getReportDeploymentStatusToCodeElement(): JSX.Element {

        return (
            <div className={"report-deployment-status-to-code"}>
                <TagList 
                    headerLabel={Resources.ReportEnvironmentDeploymentStatus}
                    infoContent={Resources.ReportEnvironmentDeploymentStatusHelpText}
                    tags={this._getTags()}
                    tagItemClassName={"report-deployment-status-to-code-item"}
                    ariaLevel={3}
                />
            </div>
        );
    }

    private _getTags(): string[] {

        return this.props.reportDeploymentStatusToCodeEnvironmentList.map((environment) => {
            return environment.name;
        });
    }
}
