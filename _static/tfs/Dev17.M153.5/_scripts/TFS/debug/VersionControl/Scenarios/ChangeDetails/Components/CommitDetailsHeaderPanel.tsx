import * as React from "react";
import * as ReactDOM from "react-dom";

import * as VSS from "VSS/VSS";

import { DefaultButton } from "OfficeFabric/Button";
import { TooltipHost } from "VSSUI/Tooltip";
import { getId } from "OfficeFabric/Utilities";
import { DirectionalHint } from "OfficeFabric/common/DirectionalHint";

import { CodeHubContributionIds } from "VersionControl/Scripts/CodeHubContributionIds";
import { GitCommit } from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";
import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";
import {
    BrowseFiles,
    ChangeDetailsTitleCommit,
    ExploreThisVersionMenuTooltip,
    SearchCommitInBranchesDialog_SearchInBranches,
    SearchCommitInBranchesDialog_TitleDescription,
} from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import { RepositoryContext } from "VersionControl/Scripts/RepositoryContext";
import { getChangeListUrl, getExplorerUrl } from "VersionControl/Scripts/VersionControlUrls";
import { onClickNavigationHandler } from "VersionControl/Scripts/Utils/XhrNavigationUtils";

import { StatBadge } from "VersionControl/Scenarios/Shared/StatBadge";
import { getCustomerIntelligenceData, ChangeDetailsTelemetryFeatures } from "VersionControl/Scenarios/ChangeDetails/ChangeDetailsTelemetry";
import { ActionCreator } from "VersionControl/Scenarios/ChangeDetails/GitCommit/ActionCreator";
import { CommitDetailsActionMenu } from "VersionControl/Scenarios/ChangeDetails/Components/CommitActionMenu";
import { ChangeListTitle } from "VersionControl/Scenarios/ChangeDetails/Components/ChangeListTitle";
import { LinkBar } from "VersionControl/Scenarios/ChangeDetails/Components/LinkBar";
import { StoresHub } from "VersionControl/Scenarios/ChangeDetails/GitCommit/StoresHub";
import { IChangeDetailsPropsBase } from "VersionControl/Scenarios/ChangeDetails/IChangeDetailsPropsBase";
import * as VC_SearchCommitInBranchesDialog_NO_REQUIRE from "VersionControl/Scenarios/ChangeDetails/Components/Dialogs/SearchCommitInBranchesDialog";
import { BranchStats } from "VersionControl/Scenarios/ChangeDetails/GitCommit/ActionsHub";
import { GitCommitPermissionsStore } from "VersionControl/Scenarios/ChangeDetails/GitCommit/GitCommitPermissionsStore";

import "VSS/LoaderPlugins/Css!VersionControl/CommitDetailsHeaderPanel";

export interface ICommitDetailsHeaderPanelProps extends IChangeDetailsPropsBase {
    actionCreator: ActionCreator;
    storesHub: StoresHub;
}

export interface ICommitDetailsHeaderPanelState {
    gitCommit: GitCommit;
    repositoryContext: RepositoryContext;
    branchStat: BranchStats;
    version: string;
    isLoading: boolean;
    isSearchInBranchesBtnEnabled: boolean;
}

/**
 *  Container for components present in the Header panel of the ChangeListView
 */
export class CommitDetailsHeaderPanel extends React.Component<ICommitDetailsHeaderPanelProps, ICommitDetailsHeaderPanelState> {
    private _searchInBranchesButtonTooltipId: string;

    constructor(props: ICommitDetailsHeaderPanelProps, context?: any) {
        super(props, context);

        this.state = this._getStateFromStores();
        this._searchInBranchesButtonTooltipId = getId("search-in-branches-tooltip");
    }

    public componentDidMount(): void {
        this.props.storesHub.changeListStore.addChangedListener(this._onChange);
        this.props.storesHub.contextStore.addChangedListener(this._onChange);
        this.props.storesHub.branchStatsStore.addChangedListener(this._onChange);
        this.props.storesHub.permissionsStore.addChangedListener(this._onChange);
    }

    public componentWillUnmount(): void {
        this.props.storesHub.changeListStore.removeChangedListener(this._onChange);
        this.props.storesHub.contextStore.removeChangedListener(this._onChange);
        this.props.storesHub.branchStatsStore.removeChangedListener(this._onChange);
        this.props.storesHub.permissionsStore.removeChangedListener(this._onChange);
    }

    public shouldComponentUpdate(nextProps: ICommitDetailsHeaderPanelProps, nextState: ICommitDetailsHeaderPanelState): boolean {
        if (nextState.isLoading && this.state.isLoading) {
            return false;
        }

        return true;
    }

    public render(): JSX.Element {
        const {gitCommit, branchStat, version, repositoryContext, isLoading, isSearchInBranchesBtnEnabled} = this.state;
        const {storesHub, actionCreator, customerIntelligenceData} = this.props;
        const permissions = (storesHub.permissionsStore as GitCommitPermissionsStore).getState();

        return (
            !isLoading &&
            <div className="vc-headerpane-section">
                <div className="hub-title">
                    <ChangeListTitle
                        changeList={gitCommit}
                        pageUrl={getChangeListUrl(repositoryContext, gitCommit, true)}
                        changeListType={'commit'}
                        customerIntelligenceData={customerIntelligenceData ? customerIntelligenceData.clone() : null} />
                    <div className="vc-page-summary-area bowtie-fabric">
                        <div className="vc-header-tool-bar">
                            <LinkBar
                                stakeholdersStore={storesHub.commitStakeholdersStore}
                                pullRequestStatsStore={storesHub.pullRequestStatsStore}
                                branchStatsStore={storesHub.branchStatsStore}
                                workItemsStore={storesHub.workItemsStore}
                                buildStatusStore={storesHub.buildStatusStore}
                                contextStore={storesHub.contextStore}
                                urlParametersStore={storesHub.urlParametersStore}
                                tagsStore={storesHub.tagsStore}
                                commitId={gitCommit.commitId.full}
                                actionCreator={actionCreator}
                                customerIntelligenceData = {customerIntelligenceData ? customerIntelligenceData.clone() : null} />

                            <div className="vc-actions-toolbar">
                                <div className="stats-badges-container">
                                    <StatBadge
                                        title={BrowseFiles}
                                        iconClassName={"bowtie-file-preview"}
                                        url={getExplorerUrl(repositoryContext, null, null, { version: version, })}
                                        tooltip={ExploreThisVersionMenuTooltip }
                                        onLinkClick={
                                            (event: React.MouseEvent<HTMLAnchorElement>) =>
                                                onClickNavigationHandler(event, CodeHubContributionIds.gitFilesHub, (event.currentTarget as HTMLAnchorElement).href) }
                                        badgeName={"BrowseFilesBadge"}
                                        telemetryEventData={customerIntelligenceData} />
                                </div>
                                <TooltipHost
                                    id={this._searchInBranchesButtonTooltipId}
                                    content={SearchCommitInBranchesDialog_TitleDescription}
                                    directionalHint={DirectionalHint.bottomCenter}>
                                    <DefaultButton
                                        disabled={!isSearchInBranchesBtnEnabled}
                                        className="search-in-branches-button"
                                        onClick={() => this._onSearchInBranchesClicked()}
                                        aria-describedby={this._searchInBranchesButtonTooltipId}>
                                        {SearchCommitInBranchesDialog_SearchInBranches}
                                    </DefaultButton>
                                </TooltipHost>
                                <CommitDetailsActionMenu
                                    commitId={gitCommit.commitId}
                                    comment={gitCommit.comment}
                                    branchName={branchStat ? branchStat.name : ''}
                                    telemetryEventData={customerIntelligenceData}
                                    contextStore={storesHub.contextStore}
                                    hasCreateBranchPermissions={permissions.createBranch}
                                    hasCreateTagPermissions={permissions.createTag}
                                    hasCherryPickPermissions={permissions.cherryPick}
                                    hasRevertPermissions={permissions.revertCommit}
                                    commentTruncated={gitCommit.commentTruncated}
                                    />
                            </div>
                            <div className="clear-float"></div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    private _onChange = (): void => {
        this.setState(this._getStateFromStores());
    };

    private _getStateFromStores(): ICommitDetailsHeaderPanelState {
        const isLoading = this.props.storesHub.contextStore.isLoading() ||
            this.props.storesHub.changeListStore.isLoading();

        return {
            gitCommit: this.props.storesHub.changeListStore.originalChangeList as GitCommit,
            repositoryContext: this.props.storesHub.contextStore.getRepositoryContext(),
            version: this.props.storesHub.changeListStore.versionSpec && this.props.storesHub.changeListStore.versionSpec.toVersionString(),
            isLoading: isLoading,
            branchStat: this.props.storesHub.branchStatsStore.state,
            isSearchInBranchesBtnEnabled: !this.props.storesHub.changeListStore.isSearchInBranchesDialogLoading
        };
    }

    private _onSearchInBranchesClicked = (): void => {
        this.props.actionCreator.changeListActionCreator.onSearchInBranchesDialogStateUpdated(true);

        VSS.using(["VersionControl/Scenarios/ChangeDetails/Components/Dialogs/SearchCommitInBranchesDialog"],
            (VC_SearchCommitInBranchesDialog: typeof VC_SearchCommitInBranchesDialog_NO_REQUIRE) => {
                VC_SearchCommitInBranchesDialog.SearchCommitInBranchesDialog.show(
                    VC_SearchCommitInBranchesDialog.SearchCommitInBranchesDialog,
                    {
                        repositoryContext: this.state.repositoryContext,
                        commitId: this.state.gitCommit.commitId.full,
                        currentCommitBranchStats: this.props.storesHub.branchStatsStore.state,
                        renderCallback: this._onDialogRender
                    } as VC_SearchCommitInBranchesDialog_NO_REQUIRE.SearchCommitInBranchesDialogOptions
                );
            }
        );

        const ciData = getCustomerIntelligenceData(this.props.customerIntelligenceData);
        ciData.publish(ChangeDetailsTelemetryFeatures.SearchCommitInBranches);
    }

    private _onDialogRender = (): void => {
        this.props.actionCreator.changeListActionCreator.onSearchInBranchesDialogStateUpdated(false);
    }
}
