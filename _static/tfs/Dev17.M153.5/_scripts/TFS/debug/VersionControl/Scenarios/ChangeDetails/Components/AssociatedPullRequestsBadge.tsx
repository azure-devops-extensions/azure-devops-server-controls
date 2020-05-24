import * as React from "react";
import { autobind, getId } from 'OfficeFabric/Utilities';

import { getAsyncLoadedComponent } from "VSS/Flux/AsyncLoadedComponent";
import * as Telemetry from "VSS/Telemetry/Services";
import * as Number from "VSS/Utils/Number";
import * as Utils_String from "VSS/Utils/String";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";

import * as CustomerIntelligenceConstants from "VersionControl/Scripts/CustomerIntelligenceConstants";
import { queueModulePreload } from "VersionControl/Scripts/DeferredJobQueue";
import {
    CommitDetails_PullRequestsCalloutTitle,
    AssociatedPullRequests_AriaDescription,
    PullRequestStatBadgeTitle,
    PullRequestsStatBadgeTitle,
    OneAssociatedPullRequestBadgeText,
    NAssociatedPullRequestsBadgeTextFormat,
} from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import * as AssociatedPullRequests_Async from "VersionControl/Scenarios/ChangeDetails/Components/AssociatedPullRequests";
import { PullRequestStatsStore } from "VersionControl/Scenarios/ChangeDetails/Stores/PullRequestStatsStore";
import { Flyout } from "VersionControl/Scenarios/Shared/Flyout";
import { PullRequestCardInfo } from "VersionControl/Scenarios/Shared/PullRequest/PullRequestCardDataModel";
import { StatBadge } from "VersionControl/Scenarios/Shared/StatBadge";

export interface IAssociatedPullRequestsBadgeProps {
    associatedPullRequests: PullRequestCardInfo[];
    defaultBranchPrIndex: number;
    tfsContext: TfsContext;
    fetchIdentitiesCallback(AssociatedPullRequests: PullRequestCardInfo[]): void;
    pullRequestStatsStore: PullRequestStatsStore;
    telemetryEventData?: Telemetry.TelemetryEventData;
}

// We want to delay load of the Associated pull requests in flyout content
const AsyncAssociatedPullRequests = getAsyncLoadedComponent(
    ["VersionControl/Scenarios/ChangeDetails/Components/AssociatedPullRequests"],
    (m: typeof AssociatedPullRequests_Async) => m.AssociatedPullRequests);

/**
* Rendering container for Associcated pull requests Badge control 
 */
export class AssociatedPullRequestsBadge extends React.Component<IAssociatedPullRequestsBadgeProps, {}> {
    private _ariaDescribedById: string;

    constructor(props: IAssociatedPullRequestsBadgeProps, context?: any) {
        super(props, context);

        this._ariaDescribedById = getId("pr-flyout-describedby");
        const pullRequests = this.props.associatedPullRequests;
        if (!pullRequests || pullRequests.length === 0) {
            return null;
        } else {
            queueModulePreload("VersionControl/Scenarios/ChangeDetails/Components/AssociatedPullRequests");
        }
    }

    public render(): JSX.Element {
        const pullRequests = this.props.associatedPullRequests;
        const pullRequestBadgeAriaLabel = this._getPullRequestsBadgeAriaLabel(pullRequests.length);
        return (
            <Flyout
                className={"associated-pull-requests-flyout"}
                headerClassName={"stats-badge-header"}
                isEnabled={true}
                calloutHasFocusableElements={true}
                setInitialFocus={true}
                ariaLabel={pullRequestBadgeAriaLabel}
                ariaDescribedBy={this._ariaDescribedById}
                dropdownContent={this._getPullRequestsFlyoutContent()}
                onOpen={this._onFlyoutOpened}>
                <StatBadge
                    title={this._getPullRequestString(pullRequests.length)}
                    count={pullRequests.length}
                    iconClassName={"bowtie-tfvc-pull-request"} />
                <div className="hidden" id={this._ariaDescribedById}>
                    {AssociatedPullRequests_AriaDescription}
                </div>
            </Flyout>
        );
    }

    private _getPullRequestsFlyoutContent(): JSX.Element {
        return (
            <div className={"pullrequests-flyout-content"} >
                <div className={"flyout-content-title"} aria-label={CommitDetails_PullRequestsCalloutTitle} >
                    {CommitDetails_PullRequestsCalloutTitle}
                </div>

                <AsyncAssociatedPullRequests
                    associatedPullRequests={this.props.associatedPullRequests}
                    tfsContext={this.props.tfsContext}
                    defaultBranchPrIndex={this.props.defaultBranchPrIndex}
                    pullRequestStatsStore={this.props.pullRequestStatsStore}
                    fetchIdentitiesCallback={this.props.fetchIdentitiesCallback} />
            </div>
        );
    }

    private _getPullRequestString(count: number): string {
        return count === 1 ? PullRequestStatBadgeTitle : PullRequestsStatBadgeTitle;
    }

    private _getPullRequestsBadgeAriaLabel(count: number): string {
        if (count === 1) {
            return OneAssociatedPullRequestBadgeText;
        } else {
            return Utils_String.format(NAssociatedPullRequestsBadgeTextFormat, Number.toDecimalLocaleString(count, true));
        }
    }

    @autobind
    private _onFlyoutOpened(): void {
        this._logTelemetry();
    }

    private _logTelemetry(): void {
        const ciData: Telemetry.TelemetryEventData = $.extend({}, this.props.telemetryEventData);
        ciData.feature = CustomerIntelligenceConstants.STATS_BADGE;
        ciData.properties[CustomerIntelligenceConstants.STATS_BADGE_NAME_PROPERTY] = "AssoicatedPullRequestsStatsBadge";
        Telemetry.publishEvent(ciData);
    }
}