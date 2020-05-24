import * as React from "react";
import { IconButton } from "OfficeFabric/Button";
import { FocusZone, FocusZoneDirection } from "OfficeFabric/FocusZone";
import {
    getRTLSafeKeyCode,
    KeyCodes,
} from "OfficeFabric/Utilities";
import { getId } from "OfficeFabric/Utilities";

import * as Utils_Date from "VSS/Utils/Date";
import * as Utils_String from "VSS/Utils/String";
import { PushesHubRoutes } from "VersionControl/Scenarios/History/HistoryPushesRoutes";
import { AvatarCard } from "VersionControl/Scenarios/Shared/AvatarControls";
import { IAvatarImageProperties, AvatarImageSize } from "VersionControl/Scenarios/Shared/AvatarImageInterfaces";
import { AvatarUtils } from "VersionControl/Scenarios/Shared/AvatarUtils";
import { StatusTextIcon } from "VersionControl/Scenarios/Shared/StatusBadge";

import { CodeHubContributionIds } from "VersionControl/Scripts/CodeHubContributionIds";
import * as VCDateUtils from "VersionControl/Scripts/Utils/VersionControlDateUtils";
import {
    HistoryList_PushesList_Pushed,
    HistoryList_PushesList_Merged,
    PushRefCreatedShortFormat,
    PushesListPullRequestTitleFormat,
    PushRefUpdateShortFormat,
    PushRefDeletedShortFormat,
    PushesPage_ForcePushBadgeLabel,
    PushesPage_ForcePushBadgeTooltip,
} from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import { CustomerIntelligenceData } from "VersionControl/Scripts/CustomerIntelligenceData";
import { BRANCH_UPDATES_LIST_ITEM_EXPANDED, VERSION_CONTROL_AREA } from "VersionControl/Scripts/CustomerIntelligenceConstants";
import { isEmptyObjectId, getShortCommitId } from "VersionControl/Scripts/CommitIdHelper";
import { GitCommitVersionSpec } from "VersionControl/Scripts/TFS.VersionControl.VersionSpecs";
import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";
import * as VersionControlUrls from "VersionControl/Scripts/VersionControlUrls";

import { HistoryTabActionsHub, GitHistorySearchCriteria, GitHistoryDataOptions } from "VersionControl/Scenarios/History/GitHistory/Actions/HistoryTabActionsHub";
import { HistoryTabActionCreator } from "VersionControl/Scenarios/History/GitHistory/Actions/HistoryTabActionCreator";
import { HistoryTabStoresHub } from "VersionControl/Scenarios/History/GitHistory/Stores/HistoryTabStoresHub";
import { HistoryCommitsSource } from "VersionControl/Scenarios/History/GitHistory/Sources/HistoryCommitsSource";
import { HistorySourcesHub } from "VersionControl/Scenarios/History/GitHistory/Sources/HistorySourcesHub";
import { SimpleLruCache } from "VersionControl/Scenarios/History/GitHistory/SimpleLruCache";
import { GitPushRefExtended } from "VersionControl/Scenarios/Pushes/ActionsHub";
import { BranchUpdateListItemExpanded, HistoryListFlux } from "VersionControl/Scenarios/Pushes/Components/BranchUpdateListItemExpanded";
import { GitPermissionsSource } from "VersionControl/Scenarios/Shared/Permissions/GitPermissionsSource";
import { BadgeProps } from "VersionControl/Scenarios/Shared/TwoLineView";
import {
    BranchUpdateListItemToggleButtonLabel,
} from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import { GitBranchVersionSpec, VersionSpec } from "VersionControl/Scripts/TFS.VersionControl.VersionSpecs";
import { onClickNavigationHandler } from "VersionControl/Scripts/Utils/XhrNavigationUtils";

export interface BranchUpdateListItemProps {
    refUpdate: GitPushRefExtended;
    repositoryContext: GitRepositoryContext;
    searchFilterItemVersion: VersionSpec;
    customerIntelligenceData?: CustomerIntelligenceData;
    branchUpdateListItemRef?: (ref: HTMLDivElement | null) => void;
    historyListCache?: SimpleLruCache<HistoryListFlux>;
}

export interface BranchUpdateListItemState {
    // Whether the branch update list item is expanded or collapsed. If true, full message is shown.
    isExpanded: boolean;
}

export class BranchUpdateListItem extends React.Component<BranchUpdateListItemProps, BranchUpdateListItemState>{
    private _branchUpdateListItemExpandedId = "";
    private _historyListFlux: HistoryListFlux = null;

    constructor(props: BranchUpdateListItemProps) {
        super(props);

        this.state = {
            isExpanded: false,
        };
        this._branchUpdateListItemExpandedId = getId("expanded-list-item");
    }

    public render(): JSX.Element {
        const refUpdate = this.props.refUpdate;
        return (
            <div ref={this.props.branchUpdateListItemRef} className={"history-result" + (this.state.isExpanded ? " expanded" : "")}>
                <div
                    className={"list-item-header"}
                    data-is-focusable={true}
                    aria-label={this._getRefUpdateDescription() + " " + this._getSecondaryText()}
                    role={"row"}>
                    <FocusZone
                        direction={FocusZoneDirection.horizontal}
                        isInnerZoneKeystroke={(ev: React.KeyboardEvent<HTMLElement>) => (ev.which === getRTLSafeKeyCode(KeyCodes.down))}>
                        <div className={"expandable"}>
                            {!this._isDeletedRef() &&
                                <IconButton
                                    ariaLabel={BranchUpdateListItemToggleButtonLabel}
                                    aria-expanded={this.state.isExpanded}
                                    aria-controls={this.state.isExpanded ? this._branchUpdateListItemExpandedId : null}
                                    aria-owns={this.state.isExpanded ? this._branchUpdateListItemExpandedId : null}
                                    className={"branch-update-toggle-button"}
                                    onClick={this._onExpandClicked.bind(this)}
                                    iconProps={{iconName: "ChevronDown", className: "branch-update-expand"}} />
                            }
                        </div>
                        <AvatarCard
                            imageProperties={
                                {
                                    email: refUpdate.push.pushedBy.uniqueName,
                                    displayName: refUpdate.push.pushedBy.displayName,
                                    identityId: refUpdate.push.pushedBy.id,
                                    size: AvatarImageSize.SmallPlus,
                                    imageUrl: AvatarUtils.getAvatarUrl(refUpdate.push.pushedBy),
                                } as IAvatarImageProperties
                            }
                            imageTooltip={refUpdate.push.pushedBy.displayName + " <" + refUpdate.push.pushedBy.uniqueName + ">"}
                            primaryLinkText={this._getRefUpdateDescription()}
                            primaryLinkUrl={this._getRefUpdateLinkUrl()}
                            onPrimaryLinkClick={
                                (event: React.MouseEvent<HTMLAnchorElement>) =>
                                    onClickNavigationHandler(
                                        event,
                                        this.props.refUpdate.pullRequest ? CodeHubContributionIds.pullRequestHub : PushesHubRoutes.pushViewHubId,
                                        (event.currentTarget as HTMLAnchorElement).href)
                            }
                            secondaryText={this._getSecondaryText()}
                            badges={this._getBadgeProps()}
                            additionalComponent={this.props.refUpdate.status
                            ? <StatusTextIcon 
                                 className={"vc-build-status"} 
                                 statuses={this.props.refUpdate.status} 
                                 isSetupExperienceVisible={false} 
                                 isSetupReleaseExperienceVisible={false} />
                             : null}
                            />
                    </FocusZone>
                </div>

                {this.state.isExpanded &&
                    <BranchUpdateListItemExpanded
                        id={this._branchUpdateListItemExpandedId}
                        repositoryContext={this.props.repositoryContext}
                        searchFilterItemVersion={this.props.searchFilterItemVersion}
                        historyListFlux={this._historyListFlux} />
                }
            </div>
        );
    }

    public componentWillUpdate(nextProps: BranchUpdateListItemProps, nextState: BranchUpdateListItemState): void {
        if (!this.state.isExpanded && nextState.isExpanded) {
            this._historyListFlux = this._getHistoryListFlux();
            this._historyListFlux.isItemOpen = true;
        }
        else if (this.state.isExpanded && !nextState.isExpanded) {
            this._historyListFlux.isItemOpen = false;
            if (!this.props.historyListCache.hasItem(this.props.refUpdate.push.pushId)) {
                this._historyListFlux.dispose();
            }
            this._historyListFlux = null;
        }
    }

    public componentWillUnmount(): void {
        if (this._historyListFlux) {
            this._historyListFlux.dispose();
            this._historyListFlux = null;
        }
    }

    private _onExpandClicked(): void {
        this.setState({
            isExpanded: !this.state.isExpanded,
        });
    }

    private _getSecondaryText(): string {
        const refUpdate = this.props.refUpdate;
        if (this._isDeletedRef()) {
            return refUpdate.push.pushedBy.displayName;
        }

        const dateString: string = VCDateUtils.getDateStringWithFriendlyText(refUpdate.push.date)
        const formatString: string = refUpdate.pullRequest ? HistoryList_PushesList_Merged : HistoryList_PushesList_Pushed;
        const secondaryText = Utils_String.format(formatString,
            refUpdate.push.pushedBy.displayName,
            getShortCommitId(this.props.refUpdate.push.refUpdates[0].newObjectId),
            dateString);

        return secondaryText;
    }

    private _getSearchCriteria(): GitHistorySearchCriteria {
        const refUpdate = this.props.refUpdate.push.refUpdates[0];

        const searchCriteria: GitHistorySearchCriteria = {
            itemVersion: new GitCommitVersionSpec(this._isNewRef() ? refUpdate.newObjectId : refUpdate.oldObjectId).toVersionString(),
            compareVersion: this._isNewRef() ? undefined : new GitCommitVersionSpec(refUpdate.newObjectId).toVersionString(),
            top: 25,
        } as GitHistorySearchCriteria;

        return searchCriteria;
    }

    private _getDataOptions(): GitHistoryDataOptions {
        return {
            fetchBuildStatuses: false,
            fetchPullRequests: false,
            fetchTags: true,
            fetchGraph: false,
        } as GitHistoryDataOptions;
    }

    private _getRefUpdateLinkUrl(): string {
        if (this.props.refUpdate.pullRequest) {
            return VersionControlUrls.getPullRequestUrl(this.props.repositoryContext, this.props.refUpdate.pullRequest.pullRequestId);
        }
        return VersionControlUrls.getPushUrl(
            this.props.repositoryContext,
            this.props.refUpdate.push.pushId,
            this._getRefNameAsBranch(this.props.searchFilterItemVersion));
    }

    private _getRefUpdateDescription(): string {
        if (this._isDeletedRef()) {
            return PushRefDeletedShortFormat;
        }

        if (this.props.refUpdate.pullRequest) {
            return Utils_String.format(PushesListPullRequestTitleFormat, this.props.refUpdate.pullRequest.pullRequestId, this.props.refUpdate.pullRequest.title);
        } else {
            let refUpdateDescription = "";

            if (this._isNewRef()) {
                refUpdateDescription = Utils_String.format(PushRefCreatedShortFormat, getShortCommitId(this.props.refUpdate.push.refUpdates[0].newObjectId));
            } else {
                refUpdateDescription = Utils_String.format(PushRefUpdateShortFormat, getShortCommitId(this.props.refUpdate.push.refUpdates[0].newObjectId));
            }
            let comment = "";
            if (this.props.refUpdate.headCommit) {
                comment = this.props.refUpdate.headCommit.comment;
            }
            return refUpdateDescription + ": " + comment;
        }
    }

    private _getHistoryListFlux(): HistoryListFlux {
        let historyListFlux: HistoryListFlux;
        let cacheHit = true;

        if (this.props.historyListCache) {
            historyListFlux = this.props.historyListCache.getItem(this.props.refUpdate.push.pushId);
        }

        if (!historyListFlux || !historyListFlux.actionCreator || !historyListFlux.storesHub) {
            cacheHit = false;

            const actionsHub = new HistoryTabActionsHub();
            const storesHub = new HistoryTabStoresHub(actionsHub);
            const sourcesHub: HistorySourcesHub = {
                historyCommitsSource: new HistoryCommitsSource(this.props.repositoryContext),
                permissionsSource: new GitPermissionsSource(this.props.repositoryContext.getRepository().project.id, this.props.repositoryContext.getRepositoryId())
            };
            
            const actionCreator = new HistoryTabActionCreator(actionsHub, sourcesHub, storesHub.getAggregatedState);

            actionCreator.fetchHistory(this._getSearchCriteria(), this._getDataOptions());

            historyListFlux = new HistoryListFlux(storesHub, actionCreator);

            if (this.props.historyListCache) {
                this.props.historyListCache.setItem(this.props.refUpdate.push.pushId, historyListFlux);
            }
        }

        this._recordRowItemExpandedTelemetry(cacheHit);
        return historyListFlux;
    }

    private _isDeletedRef(): boolean {
        return isEmptyObjectId(this.props.refUpdate.push.refUpdates[0].newObjectId);
    }

    private _isNewRef(): boolean {
        return isEmptyObjectId(this.props.refUpdate.push.refUpdates[0].oldObjectId);
    }

    private _recordRowItemExpandedTelemetry(cacheHit: boolean): void {
        const ciData = new CustomerIntelligenceData();

        ciData.properties = {
            pushId: this.props.refUpdate.push.pushId,
            isHistorylistCacheHit: cacheHit,
            cacheLength: this.props.historyListCache ? this.props.historyListCache.length : 0,
        };

        if (this.props.customerIntelligenceData) {
            ciData.area = this.props.customerIntelligenceData.area ? this.props.customerIntelligenceData.area : VERSION_CONTROL_AREA;
            ciData.properties = $.extend(ciData.properties, this.props.customerIntelligenceData.properties);
        }

        ciData.publish(BRANCH_UPDATES_LIST_ITEM_EXPANDED, false, null);
    }

    private _getForcePushBadgeClickUrl(): string {
        return VersionControlUrls.getRemovedCommitsInPushUrl(
            this.props.repositoryContext,
            this.props.refUpdate.push.pushId,
            this._getRefNameAsBranch(this.props.searchFilterItemVersion));
    }

    private _getBadgeProps(): BadgeProps[] {
        const badgeProps: BadgeProps[] = [];

        // Force-push badge
        if (!!this.props.refUpdate.isForcePush) {
            badgeProps.push({
                badgeText: PushesPage_ForcePushBadgeLabel,
                badgeCss: "vc-force-push-badge",
                tooltip: PushesPage_ForcePushBadgeTooltip,
                url: this._getForcePushBadgeClickUrl(),
                onClick: (event: React.MouseEvent<HTMLAnchorElement>) =>
                    onClickNavigationHandler(
                        event,
                        PushesHubRoutes.pushViewHubId,
                        (event.currentTarget as HTMLAnchorElement).href)
            });
        }

        return badgeProps;
    }

    private _getRefNameAsBranch(itemVersion: VersionSpec): string {
        return itemVersion ? (itemVersion as GitBranchVersionSpec).toFullName() : "" ;
    }
}
