import * as React from "react";
import * as ReactDOM from "react-dom";

import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import * as CustomerIntelligenceConstants from "VersionControl/Scripts/CustomerIntelligenceConstants";

import { PullRequestListActionCreator } from "VersionControl/Scenarios/PullRequestList/Actions/PullRequestListActionCreator";
import { StoresHub } from "VersionControl/Scenarios/PullRequestList/Stores/StoresHub";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";

import { Fabric } from "OfficeFabric/Fabric";
import { PrimaryButton } from "OfficeFabric/Button";
import { PullRequestStatus } from "TFS/VersionControl/Contracts";
import { PullRequestListFilter, PullRequestFilterSearchCriteria, PullRequestFilterProps } from "VersionControl/Scenarios/PullRequestList/PullRequestListFilter";
import { PullRequestListQueryCriteria } from "VersionControl/Scenarios/PullRequestList/PullRequestListQueryCriteria";
import { PullRequestListSearchBox } from "VersionControl/Scenarios/PullRequestList/PullRequestListSearchBox";
import * as SearchCriteriaUtil from "VersionControl/Scripts/Utils/SearchCriteriaUtil";
import * as VCPullRequestsControls from "VersionControl/Scripts/Controls/PullRequest";

import { autobind } from "OfficeFabric/Utilities";
import { CodeHubContributionIds } from "VersionControl/Scripts/CodeHubContributionIds";
import { onClickNavigationHandler } from "VersionControl/Scripts/Utils/XhrNavigationUtils";

import "VSS/LoaderPlugins/Css!VersionControl/PullRequestListTitle";

export interface PullRequestListTitleProps {
    repositoryContext: GitRepositoryContext;
    storesHub: StoresHub;
    actionCreators: PullRequestListActionCreator;
    tfsContext: TfsContext;
    initialSearchCriteria: PullRequestFilterSearchCriteria;
    hasPermissionToCreatePullRequest: boolean;
    onSearchCriteriaUpdated(searchCriteria?: PullRequestFilterSearchCriteria): void;
    pickerEnabled: boolean;
}

export class PullRequestListTitle extends React.Component<PullRequestListTitleProps, {}> {
    public static attach(element: HTMLElement, props: PullRequestListTitleProps): React.Component<any, {}> {
        return ReactDOM.render(<PullRequestListTitle {...props} />, element) as React.Component<any, {}>;
    }

    public render(): JSX.Element {
        const filterSearchCriteria = $.extend({}, this.props.initialSearchCriteria);
        const filterUpdatedCallback = (searchCriteria: PullRequestFilterSearchCriteria) => this.props.onSearchCriteriaUpdated(searchCriteria);
        return <div className="vc-pullrequest-list-titleArea flex flex-noshrink">
            <h1 className="page-title flex-grow">{VCResources.PullRequest_HubName}</h1>
            <div className="vc-pullrequest-filtered-list-right flex flex-noshrink">
                <div className="vc-pullrequest-filters">
                    {
                        this.props.pickerEnabled &&
                        <PullRequestListFilter
                            initialSearchCriteria={filterSearchCriteria}
                            filterUpdatedCallback={filterUpdatedCallback}
                            tfsContext={this.props.tfsContext}
                            repositoryId={this.props.repositoryContext.getRepositoryId()} mruAuthors={[]} />
                    }
                    <PullRequestListSearchBox storesHub={this.props.storesHub} actionCreator={this.props.actionCreators} tfsContext={this.props.tfsContext} />
                </div>
                <div className="new-pr-button-container">
                    {this.props.hasPermissionToCreatePullRequest &&
                        <PrimaryButton className="vc-pullrequest-list-new-button"
                            onClick={this.onNewPullRequestClick}
                            href={this.props.storesHub.pullRequestListStore.getNewPullRequestUrl()}>
                            {VCResources.PullRequest_CreatePullRequestButtonCaption}
                        </PrimaryButton>
                    }
                </div>
            </div>
        </div>;
    }

    @autobind
    private onNewPullRequestClick(event: React.MouseEvent<HTMLAnchorElement>) {
        this.props.actionCreators.onNavigateToNewPullRequest(CustomerIntelligenceConstants.PULL_REQUEST_CREATE_SOURCEUI_TOOLBAR);
        onClickNavigationHandler(event, CodeHubContributionIds.pullRequestHub, (event.currentTarget as HTMLAnchorElement).href);
    }
}