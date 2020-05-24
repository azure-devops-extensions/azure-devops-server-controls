import * as React from "react";
import * as ReactDOM from "react-dom";

import { PrimaryButton } from "OfficeFabric/Button";

import { Component, IProps, IStateless } from "DistributedTaskControls/Common/Components/Base";
import { SafeLink } from "DistributedTaskControls/Components/SafeLink";

import { HelpLinks } from "TaskGroup/Scripts/TaskGroups/Constants";
import * as Resources from "TaskGroup/Scripts/Resources/TFS.Resources.TaskGroup";

import "VSS/LoaderPlugins/Css!TaskGroup/Scripts/TaskGroups/ZeroDayExperience";

export interface IZeroDayExperienceProps extends IProps {
    onTaskGroupImportClick: (ev: React.MouseEvent<HTMLElement>) => void;
}

export class ZeroDayExperience extends Component<IZeroDayExperienceProps, IStateless>{

    public render(): JSX.Element {
        return (
            <div className={"task-groups-zero-day-exp"}>

                {this._taskGroupIcon}

                {this._importTaskGroupHeader}

                {this._taskGroupSummary}

                {this._importTaskGroupButton}

                {this._learnMoreLink}

            </div>
        );
    }

    private get _taskGroupIcon(): JSX.Element {
        return <div className={"bowtie-icon bowtie-task-group zero-day-task-group-icon"} />;
    }

    private get _importTaskGroupHeader(): JSX.Element {
        return (<div className={"zero-day-task-group-import-header"}>

            {Resources.ImportTaskGroupZeroDayHeaderText}

        </div>);
    }

    private get _taskGroupSummary(): JSX.Element {
        return (<div className={"zero-day-task-group-summary"}>
            <div className={"zero-day-task-group-summary-text"}>

                {Resources.TaskGroupSummaryZeroDayText}

            </div>
        </div>);
    }

    private get _importTaskGroupButton(): JSX.Element {
        return (
            <div>
                <PrimaryButton
                    className={"zero-day-task-group-import-button"}
                    ariaLabel={Resources.ImportTaskGroupZeroDayButtonText}
                    onClick={(ev: React.MouseEvent<HTMLButtonElement>) => { this.props.onTaskGroupImportClick(ev); }}>

                    {Resources.ImportTaskGroupZeroDayButtonText}

                </PrimaryButton>
            </div>);
    }

    private get _learnMoreLink(): JSX.Element {
        return (
            <div
                className={"zero-day-task-group-learn-link"}>
                <SafeLink
                    href={HelpLinks.TaskGroupsLearnMore}
                >
                    <span className="bowtie-icon bowtie-status-help-outline" />
                    {Resources.LearnMoreZeroDayLinkText}

                </SafeLink>
            </div>);
    }
}