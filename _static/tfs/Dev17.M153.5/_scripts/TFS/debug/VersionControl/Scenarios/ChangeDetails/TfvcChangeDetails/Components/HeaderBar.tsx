import * as React from "react";
import * as Utils_String from "VSS/Utils/String";

import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";

import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";
import * as VCDateUtils from "VersionControl/Scripts/Utils/VersionControlDateUtils";
import { onClickNavigationHandler } from "VersionControl/Scripts/Utils/XhrNavigationUtils";
import * as VersionControlUrls from "VersionControl/Scripts/VersionControlUrls";

import { AvatarImageSize, IAvatarImageProperties } from "VersionControl/Scenarios/Shared/AvatarImageInterfaces";
import { ContextStore } from "VersionControl/Scenarios/Shared/Stores/ContextStore";

import { IChangeListAuthorDetails } from "VersionControl/Scenarios/ChangeDetails/Actions/ActionsHub";
import { AssociatedWorkItemsBadge } from "VersionControl/Scenarios/ChangeDetails/Components/AssociatedWorkItemsBadge";
import { IChangeDetailsPropsBase } from "VersionControl/Scenarios/ChangeDetails/IChangeDetailsPropsBase";
import { AuthorDetailsStore } from "VersionControl/Scenarios/ChangeDetails/Stores/AuthorDetailsStore";
import { UrlParametersStore } from "VersionControl/Scenarios/ChangeDetails/Stores/UrlParametersStore";
import { WorkItemsStore } from "VersionControl/Scenarios/ChangeDetails/Stores/WorkItemsStore";
import { AuthorBadge } from "VersionControl/Scenarios/ChangeDetails/TfvcChangeDetails/Components/AuthorBadge";

import "VSS/LoaderPlugins/Css!VersionControl/HeaderBar";

export interface HeaderBarProps extends IChangeDetailsPropsBase {
    authorDetailsStore: AuthorDetailsStore;
    workItemsStore: WorkItemsStore;
    contextStore: ContextStore;
    urlParametersStore: UrlParametersStore;
}

export interface HeaderBarState {
    tfsContext: TfsContext;
    gitRepositoryContext: GitRepositoryContext;
    authorDetails: IChangeListAuthorDetails;
    associatedWorkItemIds: number[];
    refName: string;
    isLoading: boolean;
    areChangeStatsLoading: boolean;
}

/**
 * Container for the ChangeDetails HeaderBar, containing the createdBy and associated workItems
 */
export class HeaderBar extends React.Component<HeaderBarProps, HeaderBarState> {

    constructor(props: HeaderBarProps, context?: any) {
        super(props, context);

        this.state = {
            tfsContext: this.props.contextStore.getTfsContext(),
            gitRepositoryContext: this.props.contextStore.getRepositoryContext() as GitRepositoryContext,
            authorDetails: this.props.authorDetailsStore.state,
            associatedWorkItemIds: this.props.workItemsStore.state,
            refName: this.props.urlParametersStore.refName,
            areChangeStatsLoading: this._areChangeStatsLoading(),
            isLoading: this._isLoading()
        };

    }

    public componentDidMount(): void {
        this.props.authorDetailsStore.addChangedListener(this._onStakeholdersLoaded);
        this.props.contextStore.addChangedListener(this._onContextsLoaded);
        this.props.workItemsStore.addChangedListener(this._onWorkItemsChanged);
    }

    public componentWillUnmount(): void {
        this.props.authorDetailsStore.removeChangedListener(this._onStakeholdersLoaded);
        this.props.contextStore.removeChangedListener(this._onContextsLoaded);
        this.props.workItemsStore.removeChangedListener(this._onWorkItemsChanged);
    }

    public shouldComponentUpdate(nextProps: HeaderBarProps, nextState: HeaderBarState): boolean {
        if (nextState.isLoading && this.state.isLoading) {
            return false;
        }

        return true;
    }

    public render(): JSX.Element {
        return (
            <div className={"vc-changedetails-headerbar"}>
                <div className={"author-container"}>
                    {this._getAuthorDetailsBadge()}
                </div>
                {this.state.areChangeStatsLoading ? null :
                    (
                        <div className={"changelist-metadata-container"}>
                            {this._getWorkItemsStatsBadge()}
                        </div>
                    )
                }
            </div>
        );
    }

    private _onStakeholdersLoaded = (): void => {
        this.setState({ authorDetails: this.props.authorDetailsStore.state } as HeaderBarState);
    };

    private _onContextsLoaded = (): void => {
        const isLoading = this._isLoading();
        const areStatsLoading = this._areChangeStatsLoading();
        this.setState({
            tfsContext: this.props.contextStore.getTfsContext(),
            gitRepositoryContext: this.props.contextStore.getRepositoryContext() as GitRepositoryContext,
            areChangeStatsLoading: areStatsLoading,
            isLoading: isLoading
        } as HeaderBarState);
    };

    private _onWorkItemsChanged = (): void => {
        const isLoading = this._isLoading();
        const areStatsLoading = this._areChangeStatsLoading();
        this.setState({
            associatedWorkItemIds: this.props.workItemsStore.state,
            areChangeStatsLoading: areStatsLoading,
            isLoading: isLoading
        } as HeaderBarState);
    };

    private _getAuthorDetailsBadge(): JSX.Element {
        const { authorDetails } = this.state;

        if (!authorDetails || !authorDetails.author) {
            return null;
        }

        const {author, authoredDate} = authorDetails;
        const badgeHeader = $.extend(true, {}, author) as IAvatarImageProperties;
        badgeHeader.size = AvatarImageSize.SmallMinus;

        return (
            <AuthorBadge 
                authoredDateString={VCDateUtils.getDateStringWithUTCOffset(authoredDate)} 
                imageProperties={badgeHeader} />
        );
    }

    private _getWorkItemsStatsBadge(): JSX.Element {
        const workItemsIds = this.state.associatedWorkItemIds;

        if (!workItemsIds || workItemsIds.length === 0) {
            return null;
        }

        return (
            <div className={"stats-badges-container"}>
                <AssociatedWorkItemsBadge
                    associatedWorkItemIds={workItemsIds}
                    tfsContext={this.state.tfsContext}
                    telemetryEventData={this.props.customerIntelligenceData ? this.props.customerIntelligenceData.clone() : null} />
            </div>
        );
    }

    private _areChangeStatsLoading(): boolean {
        // using 'or' between isLoading controls so that LinkBar only shows up once all controls are ready
        return (this.props.contextStore.isLoading() ||
            this.props.workItemsStore.isLoading());
    }

    private _isLoading(): boolean {
        return this.props.contextStore.isLoading();
    }
}

