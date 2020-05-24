/// <reference types="jquery" />
/// <reference types="react" />
/// <reference types="react-dom" />

import React = require("react");

import {combineClassNames} from "Build/Scripts/ClassNames";
import {QueryResult} from "Build/Scripts/QueryResult";
import * as BuildResources from "Build/Scripts/Resources/TFS.Resources.Build";

import {BuildResult as BuildResultHelper, DisplayValues} from "Build.Common/Scripts/BuildResult";
import {BuildStatus as BuildStatusHelper} from "Build.Common/Scripts/BuildStatus";

import {IState} from "Presentation/Scripts/TFS/TFS.React";

import {BuildReference, BuildStatus, BuildResult} from "TFS/Build/Contracts";

export interface PureProps {
    className: string;
    iconClassName: string;
    textClassName: string;
    statusText: string;
}

export const DefinitionStatusPure = (props: PureProps): JSX.Element => {
    let containerClassName = combineClassNames("build-status-container", props.className);
    let textClassName = combineClassNames("build-status-text", props.textClassName);

    return <span className={containerClassName}>
        <span className={ props.iconClassName }></span>&nbsp; <span title={ props.statusText } className={ textClassName }>{ props.statusText }</span>
    </span>;
};

export interface Props {
    className?: string;
    history: QueryResult<BuildReference[]>;
}

export class DefinitionStatus extends React.Component<Props, IState> {
    public render(): JSX.Element {
        let displayValues = this._getDisplayValues(this.props.history);
        let iconClassName = displayValues.iconClassName;
        let textClassName = displayValues.textClassName;

        return <DefinitionStatusPure className={this.props.className} iconClassName={ iconClassName } textClassName={ textClassName } statusText={ displayValues.text } />
    }

    protected _getDisplayValues(history: QueryResult<BuildReference[]>): DisplayValues {
        let result: DisplayValues = {
            iconClassName: "",
            textClassName: "not-built",
            text: ""
        };

        let mostRecentBuild: BuildReference = null;
        let previousBuild: BuildReference = null;

        let index: number = 0;
        if (history && !history.pending && history.result.length > 0) {
            mostRecentBuild = history.result[0];
            // once builds start coming in via SignalR some will be NotStarted
            while (mostRecentBuild.status === BuildStatus.NotStarted && history.result.length > index + 1) {
                index = index + 1;
                mostRecentBuild = history.result[index];
            }
        }
        if (history && !history.pending && history.result.length > index + 1) {
            previousBuild = history.result[index + 1];
        }

        if (!mostRecentBuild) {
            result.text = BuildResources.BuildStatusTextNotBuilt;
        }
        else {
            result.iconClassName = BuildStatusHelper.getIconClassName(mostRecentBuild.status, mostRecentBuild.result);

            // note that the text and styles for definition status are not necessarily the same as for build status
            if (mostRecentBuild.status === BuildStatus.InProgress) {
                result.textClassName = "inprogress";
                result.text = BuildResources.BuildStatusTextInProgress;
            }
            else if (mostRecentBuild.status === BuildStatus.Cancelling) {
                result.textClassName = "canceled";
                result.text = BuildResources.BuildStatusTextCancelling;
            }
            else if (mostRecentBuild.status === BuildStatus.NotStarted || mostRecentBuild.status === BuildStatus.Postponed) {
                result.textClassName = "queued";
                result.text = BuildResources.BuildStatusTextQueued;
            }
            else {
                switch (mostRecentBuild.result) {
                    case BuildResult.Canceled:
                        result.textClassName = "canceled"
                        result.text = BuildResources.BuildStatusTextCanceled;
                        break;
                    case BuildResult.Failed:
                        result.textClassName = "failure";
                        result.text = BuildResources.BuildStatusTextBroken;
                        result.iconClassName = "build-failure-icon-color bowtie-icon bowtie-edit-delete";
                        break;
                    case BuildResult.PartiallySucceeded:
                        result.textClassName = "warning";
                        result.text = BuildResources.BuildStatusTextIssues;
                        result.iconClassName = "build-warning-icon-color bowtie-icon bowtie-status-warning-outline";
                        break;
                    case BuildResult.Succeeded:
                        result.textClassName = "success";
                        result.text = BuildResources.BuildStatusTextPassing;
                        result.iconClassName = "build-success-icon-color bowtie-icon bowtie-check-light";
                        break;
                }

                if (!!previousBuild && previousBuild.result !== mostRecentBuild.result && previousBuild.result !== BuildResult.Canceled) {
                    // status changed
                    switch (mostRecentBuild.result) {
                        case BuildResult.Failed:
                            result.text = BuildResources.BuildStatusTextFailed;
                            result.iconClassName = "build-failure-icon-color bowtie-icon bowtie-edit-remove";
                            break;
                        case BuildResult.PartiallySucceeded:
                            result.text = BuildResources.BuildStatusTextNewIssues;
                            result.iconClassName = "build-warning-icon-color bowtie-icon bowtie-status-warning";
                            break;
                        case BuildResult.Succeeded:
                            result.text = BuildResources.BuildStatusTextFixed;
                            result.iconClassName = "build-success-icon-color bowtie-icon bowtie-check";
                            break;
                    }
                }
            }
        }

        return result;
    }
}
