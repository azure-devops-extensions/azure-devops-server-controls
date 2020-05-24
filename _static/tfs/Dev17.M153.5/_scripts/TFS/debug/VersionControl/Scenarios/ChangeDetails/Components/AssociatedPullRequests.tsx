import * as React from "react";

import * as DetailsList from "OfficeFabric/DetailsList";
import { IGroup, IGroupDividerProps } from "OfficeFabric/GroupedList";
import { List } from "OfficeFabric/List";
import { MessageBar, MessageBarType } from "OfficeFabric/MessageBar";
import { Spinner } from "OfficeFabric/Spinner";

import * as Utils_String from "VSS/Utils/String";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import * as IdentityImage from "Presentation/Scripts/TFS/Components/IdentityImage";

import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import * as VCDateUtils from "VersionControl/Scripts/Utils/VersionControlDateUtils";
import { PullRequestCardInfo } from "VersionControl/Scenarios/Shared/PullRequest/PullRequestCardDataModel";
import { PullRequestCard } from "VersionControl/Scenarios/Shared/PullRequest/PullRequestCard";
import { ActionCreator } from "VersionControl/Scenarios/ChangeDetails/GitCommit/ActionCreator";
import { PullRequestStatsStore, IdentitesFetchedState } from "VersionControl/Scenarios/ChangeDetails/Stores/PullRequestStatsStore";

import "VSS/LoaderPlugins/Css!VersionControl/AssociatedPullRequests";
import "VSS/LoaderPlugins/Css!fabric";

export interface IAssociatedPullRequestsProps {
    associatedPullRequests: PullRequestCardInfo[];
    defaultBranchPrIndex: number;
    tfsContext: TfsContext;
    pullRequestStatsStore: PullRequestStatsStore;
    fetchIdentitiesCallback(AssociatedPullRequests: PullRequestCardInfo[]): void;
}

export interface IAssociatedPullRequestsState {
    identitiesFetchedState: IdentitesFetchedState;
}

export interface IPullRequestCardWithGroupInfo {
    pullRequestCard: PullRequestCardInfo;
    pullRequestType: IPullRequestType;
}

export enum IPullRequestType {
    first = 0,
    defaultBranch = 1,
    additional = 2,
    firstInDefault = 3
}

/**
* Rendering container for Associcated work items in flyout
*/
export class AssociatedPullRequests extends React.Component<IAssociatedPullRequestsProps, IAssociatedPullRequestsState> {

    constructor(props: IAssociatedPullRequestsProps) {
        super(props);

        let identitiesFetchedState = this.props.pullRequestStatsStore.identitiesFetchedState;
        if (identitiesFetchedState === IdentitesFetchedState.Failed) { // We want to try and fetch the data again when we open flyout next time, if it failed previously.
            identitiesFetchedState = IdentitesFetchedState.NotFetched;
        }

        this.state = {
            identitiesFetchedState: identitiesFetchedState,
        };

    }

    public componentDidMount(): void {
        this.props.pullRequestStatsStore.addChangedListener(this._onPullRequestStatsChanged);
    }

    public componentWillUnmount(): void {
        this.props.pullRequestStatsStore.removeChangedListener(this._onPullRequestStatsChanged);
    }

    public render(): JSX.Element {
        return <div className="pullrequest-list">
            {this._getPullRequestData()}
        </div>;
    }

    private _getPullRequestData(): JSX.Element {
        let pullRequestContentElement: JSX.Element;
        const pullRequestItems = getPullRequestItems(this.props.associatedPullRequests, this.props.defaultBranchPrIndex);
        switch (this.state.identitiesFetchedState) {
            case IdentitesFetchedState.NotFetched:
                this.props.fetchIdentitiesCallback(this.props.associatedPullRequests);
                pullRequestContentElement = this._showFetchingMessage();
                break;
            default:
                pullRequestContentElement = <DetailsList.DetailsList
                    columns={this._getColumn()}
                    initialFocusedIndex={0}
                    getRowAriaLabel={this._getRowAriaLabel}
                    items={pullRequestItems}
                    groups={getPullRequestsGroupsByType(pullRequestItems)}
                    groupProps={
                        {
                            onRenderHeader: this._onRenderHeader
                        }}
                    isHeaderVisible={false}
                    constrainMode={DetailsList.ConstrainMode.unconstrained}
                    selectionMode={DetailsList.SelectionMode.none} />;
                break;
        }

        return pullRequestContentElement;
    }

    private _onRenderHeader = (props: IGroupDividerProps): JSX.Element => {
        return (
            <div className="pullrequest-type-header">
                {props.group.name}
            </div>
        );
    }

    private _getColumn(): DetailsList.IColumn[] {
        return [{
            fieldName: null,
            key: "0",
            name: "Pull requests",
            minWidth: 500,
            maxWidth: Infinity,
            onRender: (item: IPullRequestCardWithGroupInfo, index, column) =>
                <PullRequestCard
                    primaryInfo={item.pullRequestCard}
                    tfsContext={this.props.tfsContext}
                    imageSize={IdentityImage.imageSizeSmall}
                    showCreatedDate={true}
                    showRepositoryDetails={false}
                    showSecondLineToolTip={true}
                />
            ,
            className: "pullrequest-row"
        } as DetailsList.IColumn];
    }

    private _getRowAriaLabel = (item: IPullRequestCardWithGroupInfo): string => {
        const isDateRecent = VCDateUtils.isDateRecent(item.pullRequestCard.gitPullRequest.creationDate);
        const baseDateString = VCDateUtils.getDateString(item.pullRequestCard.gitPullRequest.creationDate, isDateRecent);
        const dateString = (isDateRecent ? baseDateString : Utils_String.format(VCResources.PRCardOnDate, baseDateString));
        let ariaLabelString: string = VCResources.CommitDetails_PRdetailsRow_AriaLabel;
        if (item.pullRequestType === IPullRequestType.first) {
            ariaLabelString = VCResources.CommitDetails_FirstPRdetailsRow_AriaLabel;
        }
        else if (item.pullRequestType === IPullRequestType.defaultBranch) {
            ariaLabelString = VCResources.CommitDetails_DefaultBranchPRdetailsRow_AriaLabel;
        }
        else if (item.pullRequestType === IPullRequestType.firstInDefault) {
            ariaLabelString = VCResources.CommitDetails_FirstPRInDefaultBranchdetailsRow_AriaLabel;
        }

        return Utils_String.format(
            ariaLabelString,
            item.pullRequestCard.authorDisplayName,
            item.pullRequestCard.gitPullRequest.pullRequestId,
            item.pullRequestCard.targetBranchName,
            dateString
        );
    }

    private _showErrorMessage(): JSX.Element {
        return <MessageBar
            messageBarType={MessageBarType.error}>
            {VCResources.CommitDetails_PRdetailsNotFetchedErrorMessage}
        </MessageBar>;
    }

    private _showFetchingMessage(): JSX.Element {
        return <Spinner key={"Spinner"} className={"vc-prflyout-spinner"} label={VCResources.FetchingResultsText} />;
    }

    private _onPullRequestStatsChanged = (): void => {
        this.setState({
            identitiesFetchedState: this.props.pullRequestStatsStore.identitiesFetchedState
        });
    }
}

export function getPullRequestItems(pullRequestItems: PullRequestCardInfo[], defaultBranchPrIndex: number): IPullRequestCardWithGroupInfo[] {
    let pullRequestCards: PullRequestCardInfo[] = $.extend(true, [], pullRequestItems);
    let allPullRequestItems: IPullRequestCardWithGroupInfo[] = [];
    if (defaultBranchPrIndex > 1) {
        const defaultBranchPr = pullRequestCards[defaultBranchPrIndex];
        pullRequestCards.splice(defaultBranchPrIndex, 1);
        pullRequestCards.splice(1, 0, defaultBranchPr);
    }

    pullRequestCards.forEach((item, index) => {
        allPullRequestItems.push({ pullRequestCard: item, pullRequestType: IPullRequestType.additional });
    });

    // The PR at index 0 is either "first PR in default branch" or simply "first PR"
    // If first PR is not in default branch then the one at index 1 is default branch PR if it exists.
    allPullRequestItems[0].pullRequestType = IPullRequestType.first;
    if (defaultBranchPrIndex === 0) {
        allPullRequestItems[0].pullRequestType = IPullRequestType.firstInDefault;
    }
    else if (defaultBranchPrIndex > 0) {
        allPullRequestItems[1].pullRequestType = IPullRequestType.defaultBranch;
    }
    return allPullRequestItems;
}

export function getPullRequestsGroupsByType(pullRequestItems: IPullRequestCardWithGroupInfo[]): IGroup[] {
    if (!pullRequestItems || pullRequestItems.length === 0) {
        return [];
    }

    let groupsByType: IGroup[] = [];
    if (pullRequestItems[0].pullRequestType === IPullRequestType.first) {
        const firstPullrequestGroup: IGroup = {
            key: "FirstPullRequest",
            name: VCResources.CommitDetails_PullRequestCallout_FirstPR,
            count: 1,
            startIndex: 0
        }
        groupsByType.push(firstPullrequestGroup);
    }
    else {
        const firstPullrequestInDefaultGroup: IGroup = {
            key: "FirstPullRequestInDefault",
            name: VCResources.CommitDetails_PullRequestCallout_FirstPRInDefaultBranch,
            count: 1,
            startIndex: 0
        }
        groupsByType.push(firstPullrequestInDefaultGroup);
    }

    if (pullRequestItems.length > 1) {
        let defaultPrPresent = false;
        if (pullRequestItems[1].pullRequestType === IPullRequestType.defaultBranch) {
            const defaultBranchPullrequestGroup: IGroup = {
                key: "DefaultBranchPullRequest",
                name: VCResources.CommitDetails_PullRequestCallout_DefaultBranchPR,
                count: 1,
                startIndex: 1
            }
            defaultPrPresent = true;
            groupsByType.push(defaultBranchPullrequestGroup);
        }
        let groupLength: number;
        let groupStartIndex: number;
        if (!defaultPrPresent) {
            groupLength = pullRequestItems.length - 1;
            groupStartIndex = 1;
        }
        else if (pullRequestItems.length > 2) {
            groupLength = pullRequestItems.length - 2;
            groupStartIndex = 2;
        }
        if (groupLength) {
            const additionalPullrequestGroup: IGroup = {
                key: "AdditionalPullRequests",
                name: VCResources.CommitDetails_PullRequestCallout_AdditionalPRs,
                count: groupLength,
                startIndex: groupStartIndex
            }
            groupsByType.push(additionalPullrequestGroup);
        }
    }

    return groupsByType;
}
