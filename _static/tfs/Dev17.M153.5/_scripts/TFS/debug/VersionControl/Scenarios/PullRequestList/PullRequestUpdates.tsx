import * as React from "react";
import { PullRequestUpdatesInfo } from "VersionControl/Scenarios/PullRequestList/PullRequestListDataModel";
import { PullRequestStatus } from "TFS/VersionControl/Contracts";
import * as Utils_String from "VSS/Utils/String";
import * as VCDateUtils from "VersionControl/Scripts/Utils/VersionControlDateUtils";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";

export interface PullRequestUpdatesProps {
    hasNewUpdates: boolean;
    hasNotBeenVisited: boolean;
    highlightNewUpdates?: boolean;
    updatesInfo: PullRequestUpdatesInfo;
    updatedDate: Date;
    status: PullRequestStatus;
}

export interface DisplayDate {
    dateString: string;
    dateStringWithPrefix: string;
    tooltip: string;
}

export class PullRequestUpdates extends React.PureComponent<PullRequestUpdatesProps, {}> {
    public render(): JSX.Element {
        const numberOfUpdatesText: string = this._getNumberOfUpdatesText();
        const shouldDisplayNumberOfUpdates: boolean = this.props.highlightNewUpdates && this.props.hasNewUpdates && Boolean(numberOfUpdatesText);
        const displayDate = this._getDisplayDate();

        return <div className="pullRequest-updates">
            {shouldDisplayNumberOfUpdates && <span className="num-updates-text">{numberOfUpdatesText}</span>}
            {shouldDisplayNumberOfUpdates && <span className="dates-separator">&bull;</span>}
            {shouldDisplayNumberOfUpdates && <span className="last-updated-text" title={displayDate.tooltip}>{displayDate.dateString}</span>}
            {!shouldDisplayNumberOfUpdates && <span className="last-updated-text-with-prefix" title={displayDate.tooltip}>{displayDate.dateStringWithPrefix}</span>}
        </div>;
    }

    private _getDisplayDate(): DisplayDate {
        // only completed and abandoned get their own strings
        const stringToUse: string = 
            (this.props.status === PullRequestStatus.Completed && VCResources.PullRequest_Completed) ||
            (this.props.status === PullRequestStatus.Abandoned && VCResources.PullRequest_Abandoned) ||
            VCResources.PullRequest_Updated;

        let dateToUse: Date = this.props.updatedDate;

        // if the PR is active, use the updated date if we have one
        if (this.props.updatesInfo &&
            this.props.updatesInfo.artifactStatsInfo &&
            this.props.updatesInfo.artifactStatsInfo.lastUpdatedDate &&
            this.props.status !== PullRequestStatus.Completed &&
            this.props.status !== PullRequestStatus.Abandoned) {

            dateToUse = this.props.updatesInfo.artifactStatsInfo.lastUpdatedDate;
        }
        
        const isDateRecent: boolean = VCDateUtils.isDateRecent(dateToUse);

        return {
            dateString: VCDateUtils.getDateString(dateToUse, isDateRecent),
            dateStringWithPrefix: Utils_String.format(stringToUse, VCDateUtils.getDateString(dateToUse, isDateRecent)),
            tooltip: VCDateUtils.getDateStringWithUTCOffset(dateToUse, "F"),
        };
    }

    private _getNumberOfUpdatesText(): string {
        return this.props.updatesInfo && this.props.updatesInfo.artifactStatsInfo
            ? this.props.updatesInfo.artifactStatsInfo.numberOfUpdatesText
            : "";
    }
}