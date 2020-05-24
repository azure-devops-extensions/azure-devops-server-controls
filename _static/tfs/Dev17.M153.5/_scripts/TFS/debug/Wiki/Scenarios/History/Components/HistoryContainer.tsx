import * as React from "react";
import { IBreadcrumbItem } from "OfficeFabric/Breadcrumb";
import { IColumn } from "OfficeFabric/DetailsList";
import { autobind } from "OfficeFabric/Utilities";
import * as Utils_String from "VSS/Utils/String";

import * as SharedSearchConstants from "SearchUI/Constants";
import { removeExtensionfromPagePath } from "SearchUI/Helpers/WikiHelper";
import { GitCommitExtended, GitTag } from "VersionControl/Scenarios/History/GitHistory/GitCommitExtendedContracts";
import { GitHistorySearchCriteria } from "VersionControl/Scenarios/History/GitHistory/Actions/HistoryTabActionsHub";
import { GitShortCommentWithTags } from "VersionControl/Scenarios/History/GitHistory/Components/GitShortCommentWithTags";
import { HistoryListColumns } from "VersionControl/Scenarios/History/GitHistory/Components/HistoryListColumns";
import { HistoryListItem, HistoryListColumnMapper, HistoryListProps } from "VersionControl/Scenarios/History/GitHistory/Components/HistoryListInterfaces";
import { AvatarBadge } from "VersionControl/Scenarios/Shared/AvatarControls";
import { GitHistoryList, GitHistoryListProps } from "VersionControl/Scenarios/Shared/GitHistoryList";
import { CommitHash } from "VersionControl/Scenarios/Shared/CommitHash";
import { CustomerIntelligenceData } from "VersionControl/Scripts/CustomerIntelligenceData";
import { GitCommit, GitObjectType, HistoryEntry } from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";
import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";

import { Header } from "Wiki/Scenarios/Shared/Components/Header";
import { WikiBreadCrumb } from "Wiki/Scenarios/Shared/Components/WikiBreadCrumb";
import { UrlParameters } from "Wiki/Scenarios/Shared/SharedActionsHub";

import { WikiActionIds } from "Wiki/Scripts/CommonConstants";
import {
    getGitItemPathForPage,
    getPageNameFromPath,
    getPagePathForGitItemPath,
    versionDescriptorToString,
} from "Wiki/Scripts/Helpers";
import {
    getWikiPageCompareUrl,
    getWikiPageViewUrl,
    linkOnClickEventHelper,
    redirectToUrlReact,
} from "Wiki/Scripts/WikiUrls";
import * as WikiResources from "Wiki/Scripts/Resources/TFS.Resources.Wiki";

import { HistoryActionCreator } from "Wiki/Scenarios/History/HistoryActionCreator";
import { HistoryStoresHub } from "Wiki/Scenarios/History/HistoryStoresHub";

import "VSS/LoaderPlugins/Css!Wiki/Scenarios/History/Components/HistoryContainer";

export interface HistoryPageProps {
    actionCreator: HistoryActionCreator;
    storesHub: HistoryStoresHub;
    onScenarioComplete?: (scenario?: string) => void;
}

export interface HistoryPageState {
    shouldLoadGitHistoryList: boolean;
}

export class HistoryContainer extends React.Component<HistoryPageProps, HistoryPageState> {
    constructor(props: HistoryPageProps) {
        super(props);
        this.state = { shouldLoadGitHistoryList: false };
    }

    public componentDidMount(): void {
        // hack: since historylist if firing an action for an non user event, and we are firing an action,
        // we hit into action invoked in action issues. Added todo for fixing action in historylist
        setTimeout(() => this.setState({ shouldLoadGitHistoryList: true, }), 0);
    }

    public render(): JSX.Element {
        const sharedState = this.props.storesHub.state.sharedState;
        const urlState = sharedState.urlState;
        const commonState = sharedState.commonState;

        const pageName = getPageNameFromPath(urlState.pagePath);

        // Since we are using a non-Wiki API, we will have to adhere to server friendly path
        const gitItemPath = getGitItemPathForPage(urlState.pagePath, commonState.wiki.mappedPath);

        const searchCriteria = {
            itemPath: gitItemPath,
            itemVersion: versionDescriptorToString(sharedState.commonState.wikiVersion),
        } as GitHistorySearchCriteria;

        const repositoryContext = commonState.repositoryContext;
        const gitHistoryListProps: GitHistoryListProps = {
            columns: this._getHistoryListColumns(),
            dataOptions: {
                fetchBuildStatuses: false,
                fetchGraph: false,
                fetchPullRequests: false,
                fetchTags: true,
            },
            headerVisible: true,
            historySearchCriteria: searchCriteria,
            repositoryContext,
            onScenarioComplete: this.props.onScenarioComplete,
            shouldDisplayError: true,
        };

        return (
            <div className={"history-container"}>
                <WikiBreadCrumb
                    currentAction={WikiActionIds.History}
                    currentWiki={commonState.wiki}
                    currentWikiVersion={commonState.wikiVersion}
                    currentPagePath={sharedState.urlState.pagePath} />
                <Header
                    title={WikiResources.RevisionsString}
                />
                <div className={"wiki-history-list"}>
                    {this.state.shouldLoadGitHistoryList && <GitHistoryList {...gitHistoryListProps} />}
                </div>
            </div>
        );
    }

    @autobind
    public createWikiCompareLink(fullCommitId: string, pagePath: string, latestPagePath: string): string {
        const revisionDetailsPagePath = pagePath;
        const urlStatePagePath = latestPagePath;
        const urlParams: UrlParameters = {
            pagePath: revisionDetailsPagePath,
            latestPagePath: revisionDetailsPagePath === urlStatePagePath ? null : urlStatePagePath,
            version: fullCommitId,
        };
        return getWikiPageCompareUrl(urlParams);
    }

    @autobind
    private _getViewPageUrl(): string {
        return getWikiPageViewUrl(
            {
                pagePath: this.props.storesHub.state.sharedState.urlState.pagePath,
            });
    }

    @autobind
    private _getHistoryListColumns(): HistoryListColumnMapper[] {
        let columns: HistoryListColumnMapper[] = [
            this._getAuthorColumn,
            this._getMessageColumn,
            this._getAuthoredDateColumn,
            this._getCommitHashColumn,
        ];
        return columns;
    }

    @autobind
    private _getAuthorColumn(props: HistoryListProps): IColumn {
        const column = HistoryListColumns.AuthorColumn(props);
        column.onRender = (historyListItem: HistoryListItem) => {
            const item: HistoryEntry = historyListItem.item;
            const stakeholders = HistoryListColumns._getStakeholders(item.changeList);
            return (
                <AvatarBadge
                    imageProperties={stakeholders.badgeHeader}
                    tooltip={stakeholders.badgeHeader.email}
                    showProfileCardOnClick={true} />
            );
        };
        return column;
    }

    @autobind
    private _getCommitHashColumn(props: HistoryListProps): IColumn {
        const column = HistoryListColumns.CommitHashColumn(props);
        column.name = WikiResources.WikiHistoryCommitHashColumnName;
        column.onRender = (historyListItem: HistoryListItem) => {
            const item: HistoryEntry = historyListItem.item;
            const gitCommit = item.changeList as GitCommit;
            return (
                <CommitHash
                    href={this._createWikiCompareLinkHelper(item)}
                    commitId={gitCommit.commitId}
                    showCopyButton={true}
                />
            );
        };
        return column;
    }

    @autobind
    private _getMessageColumn(props: HistoryListProps): IColumn {
        const column = HistoryListColumns.MessageColumn(props);
        column.onRender = (historyListItem: HistoryListItem, index: number) => {
            const item: HistoryEntry = historyListItem.item;
            const tags: GitTag[] = item.changeList ? (item.changeList as GitCommitExtended).tags : null;
            const commitHref = this._createWikiCompareLinkHelper(item);
            return (
                <GitShortCommentWithTags
                    repositoryContext={props.repositoryContext as GitRepositoryContext}
                    onClickedHref={commitHref}
                    onItemClicked={this._onWikiCompareLinkClick}
                    tagsList={tags}
                    fullComment={item.changeList.comment}
                    isCommentTruncated={item.changeList.commentTruncated}
                    serverItemPath={item.serverItem} />
            );
        };
        column.maxWidth = 800;
        return column;
    }

    @autobind
    private _getAuthoredDateColumn(props: HistoryListProps): IColumn {
        const column = HistoryListColumns.AuthoredDateColumn(props);
        column.name = WikiResources.WikiHistoryDateColumnName;
        return column;
    }

    @autobind
    private _createWikiCompareLinkHelper(item: HistoryEntry): string {
        const sharedState = this.props.storesHub.state.sharedState;
        const wikiRootPath = sharedState.commonState.wiki.mappedPath;
        const pagePath = getPagePathForGitItemPath(item.serverItem, wikiRootPath);
        const latestPagePath = sharedState.urlState.pagePath;

        return this.createWikiCompareLink((item.changeList as GitCommit).commitId.full, pagePath, latestPagePath);
    }

    @autobind
    private _onWikiCompareLinkClick(event: React.MouseEvent<HTMLAnchorElement>, customerIntelligenceData: CustomerIntelligenceData): void {
        linkOnClickEventHelper(event, () => redirectToUrlReact<HTMLAnchorElement>((event.currentTarget as HTMLAnchorElement).href, event));
    }
}
