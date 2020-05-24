import * as React from "react";
import * as ReactDOM from "react-dom";

import { SearchBox } from "Presentation/Scripts/TFS/Components/SearchBox";
import { CodeHubContributionIds } from "VersionControl/Scripts/CodeHubContributionIds";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import { navigateToUrl } from "VersionControl/Scripts/Utils/XhrNavigationUtilsNonReact";
import * as VersionControlUrls from "VersionControl/Scripts/VersionControlUrls";

import { PullRequestListActionCreator } from "VersionControl/Scenarios/PullRequestList/Actions/PullRequestListActionCreator";
import { StoresHub } from "VersionControl/Scenarios/PullRequestList/Stores/StoresHub";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";

export interface PullRequestListSearchBoxProps {
    storesHub: StoresHub;
    actionCreator: PullRequestListActionCreator;
    tfsContext: TfsContext;
}

export class PullRequestListSearchBox extends React.Component<PullRequestListSearchBoxProps> {
    private static invalidPr: number = -1;
    private static MAX_PR_ID: number = 2147483647; //The server expects a 32 bit integer for pull request ids so we can't have values over 2^31 - 1

    public componentDidMount() {
        this.props.storesHub.searchPullRequestStore.addChangedListener(this._onChange);
    }

    public componentWillUnmount() {
        this.props.storesHub.searchPullRequestStore.removeChangedListener(this._onChange);
    }

    public render(): JSX.Element {
        return <SearchBox
            title={VCResources.PullRequestSearchToolTip}
            placeholderText={VCResources.PullRequestSearchWaterMark}
            onSearch={this._performSearch}
        />;
    }

    private _performSearch = (searchText: string) => {
        const pullRequestId = this._searchTextToId(searchText);
        if (pullRequestId <= 0) {
            return;
        }

        this.props.actionCreator.searchPullRequest(pullRequestId);
    }

    private _searchTextToId(searchText: string): number{
        if (searchText) {
            const matchInteger = searchText.match(/^\d+$/);
            let pullRequestId = matchInteger ? parseInt(matchInteger[0], 10) : PullRequestListSearchBox.invalidPr;
            if (pullRequestId <= 0 || pullRequestId > PullRequestListSearchBox.MAX_PR_ID) {
                this.props.actionCreator.addError(new Error(VCResources.PullRequest_invalidID));
                pullRequestId = PullRequestListSearchBox.invalidPr;
            }
            return pullRequestId;
        }
        return PullRequestListSearchBox.invalidPr;
    }

    private _onChange = (): void => {
        const searchResult = this.props.storesHub.searchPullRequestStore.getState();
        if (searchResult.status === "found") {
            const routeData: any = {
                project: searchResult.pullRequest.repository.project.name,
            };

            if (this.props.tfsContext.currentTeam) {
                routeData.team = this.props.tfsContext.contextData.project.id === searchResult.pullRequest.repository.project.id
                    ? this.props.tfsContext.currentTeam.name
                    : null;
            }

            const url = VersionControlUrls.getPullRequestUrl(
                GitRepositoryContext.create(searchResult.pullRequest.repository, this.props.tfsContext),
                searchResult.pullRequest.pullRequestId,
                false,
                null,
                routeData);

            this._redirect(url);
            return;
        }
    }

    private _redirect(url: string){
        //a pull request was found so browser will be redirected
        //this method is here to facilitate testing
        navigateToUrl(url, CodeHubContributionIds.pullRequestHub);
    }
}
