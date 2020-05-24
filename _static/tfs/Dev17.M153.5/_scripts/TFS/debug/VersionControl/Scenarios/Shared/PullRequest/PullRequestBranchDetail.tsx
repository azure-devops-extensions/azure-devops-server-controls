import * as React from "react";

import { DirectionalHint } from "OfficeFabric/common/DirectionalHint";
import { Link } from "OfficeFabric/Link";
import { TooltipHost, TooltipOverflowMode } from "VSSUI/Tooltip";
import { css, divProperties, getNativeProps } from "OfficeFabric/Utilities";
import { IconButton } from "OfficeFabric/Button";

import { FavoriteStar } from "Favorites/Controls/FavoriteStar";
import { PullRequestCardInfo } from "VersionControl/Scenarios/Shared/PullRequest/PullRequestCardDataModel";
import { CodeHubContributionIds } from "VersionControl/Scripts/CodeHubContributionIds";
import * as BranchResources from "VersionControl/Scripts/Resources/TFS.Resources.Branches";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import { FormattedComponent } from "VersionControl/Scripts/Utils/Format";
import { onClickNavigationHandler } from "VersionControl/Scripts/Utils/XhrNavigationUtils";
import { RetargetDialog } from "VersionControl/Scripts/Components/PullRequestReview/RetargetDialog";
import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";
import { Spinner, SpinnerSize } from "OfficeFabric/Spinner";

import "VSS/LoaderPlugins/Css!VersionControl/PullRequestBranchDetail";

export interface PullRequestBranchDetailProps extends React.Props<void> {
    className: string;
    pullRequestInfo: PullRequestCardInfo;
    onFavoriteBranch(refName: string): void;
    onUnfavoriteBranch(favoriteId: number): void;
    repositoryContext: GitRepositoryContext;
    allowRetargeting: boolean;
    retargetInProgress: boolean;
    onRetarget(newTargetRefName: string): void;
    autoCompleteSet: boolean;
}

export interface BranchDetailProps  extends React.HTMLProps<HTMLElement> {
    branchExplorerUrl: string;
    branchName: string;
    branchLabel: string;
    showBranchFavorite?: boolean;
    isBranchFavorite?: boolean;
    onToggleBranchFavorite?(): void;
    showRepository?: boolean;
    repositoryClass?: string;
    repositoryUrl?: string;
    repositoryName?: string;
    repositoryTooltip?: string;
}

/**
 * Single branch detail (will render repo/branch combo depending on passed in options).
 */
export class BranchDetail extends React.Component<BranchDetailProps, {}> {
    public render(): JSX.Element {
        const branchItems = [];
        const { className: spanClassName, ...spanProps } = getNativeProps(this.props, divProperties);

        const {
            repositoryUrl,
            repositoryName,
            repositoryTooltip,
            repositoryClass,
            branchExplorerUrl,
            branchName,
            branchLabel,
            showRepository,
        } = this.props;

        // add repo if necessary
        if (this.props.showRepository) {
            branchItems.push(<span
                key="repoIcon"
                className={css("bowtie-icon", repositoryClass)}
                role="img"
                aria-label={VCResources.RelatedArtifactRepositoryTitle}/>);

            if (repositoryUrl) {
                branchItems.push(<Link
                    key="repoLink"
                    className="vc-pullrequest-repoLink"
                    href={repositoryUrl}
                    title={repositoryTooltip}>{repositoryName}</Link>);
            } else {
                branchItems.push(<span
                    key="repoSpan"
                    className="vc-pullrequest-repoLink"
                    title={repositoryTooltip}>{repositoryName}</span>);
            }
        }

        branchItems.push(<span
            key="branchIcon"
            className="bowtie-icon bowtie-tfvc-branch"
            role="img"
            aria-label={VCResources.RelatedArtifactBranchTitle} />);

        if (branchExplorerUrl) {
            branchItems.push(<BranchLink
                key="branchLink"
                className="branch-link"
                onClick={showRepository ? null : this._onLinkClick}
                branchUrl={branchExplorerUrl}
                branchLabel={branchLabel}
                branchFriendlyName={branchName} />);
        } else {
            branchItems.push(<span
                className="branch-link"
                key="branchSpan"
                title={branchLabel}
                >{branchName}</span>);
        }

        return (
            <span
                className={css("inner-padding-span", "vc-pullrequest-branchLink", spanClassName)}
                {...spanProps}
            >
                {branchItems}
                {
                    this.props.showBranchFavorite &&
                    <FavoriteStar
                        onToggle={this.props.onToggleBranchFavorite}
                        isFavorite={this.props.isBranchFavorite}
                        arialabel={BranchResources.FavoriteMenuItemLabel}
                    />
                }
            </span>
        );
    }

    private _onLinkClick = (event: React.MouseEvent<HTMLAnchorElement>): void => {
        const url = (event.currentTarget as HTMLAnchorElement).href;
        onClickNavigationHandler(event, CodeHubContributionIds.gitFilesHub, url);
    }
}

export interface IPullRequestBranchDetailState {
    showRetargetDialog?: boolean;
}

export class PullRequestBranchDetail extends React.Component<PullRequestBranchDetailProps, IPullRequestBranchDetailState> {
    constructor(props, state) {
        super(props, state);

        this.state = {
            showRetargetDialog: false,
        };
    }
    
    public render(): JSX.Element {
        const { pullRequestInfo } = this.props;

        return (
            <div className={this.props.className}>
                <FormattedComponent format={VCResources.PullRequest_SourceIntoTarget} className="secondary-text">
                    <BranchDetail
                        showRepository={pullRequestInfo.isFork}
                        repositoryClass={pullRequestInfo.sourceRepositoryContext.getRepositoryClass()}
                        repositoryUrl={pullRequestInfo.sourceRepositoryUrl}
                        repositoryName={pullRequestInfo.sourceRepositoryName}
                        repositoryTooltip={pullRequestInfo.sourceRepositoryToolTip}
                        branchExplorerUrl={pullRequestInfo.sourceBranchExplorerUrl}
                        branchName={pullRequestInfo.sourceBranchName}
                        branchLabel={pullRequestInfo.sourceBranchLabel}
                        showBranchFavorite={pullRequestInfo.sourceBranchCanFavorite}
                        isBranchFavorite={Boolean(pullRequestInfo.sourceBranchFavoriteId)}
                        onToggleBranchFavorite={this.onToggleSourceBranchFavorite}
                    />
                    <BranchDetail
                        branchExplorerUrl={pullRequestInfo.targetBranchExplorerUrl}
                        branchName={pullRequestInfo.targetBranchName}
                        branchLabel={pullRequestInfo.targetBranchLabel}
                        onToggleBranchFavorite={this.onToggleTargetBranchFavorite}
                    />
                </FormattedComponent>
                { this.props.allowRetargeting && !this.props.retargetInProgress && !this.state.showRetargetDialog &&
                    <TooltipHost
                    content={VCResources.PullRequest_Retarget_Title}
                    directionalHint={DirectionalHint.bottomCenter}>
                    <IconButton
                        ariaLabel={VCResources.PullRequest_Retarget_Title}
                        className={"retarget-pr-button"}
                        iconProps={{ className: "bowtie-icon bowtie-edit" }}
                        onClick={this._showRetargetDialog} />
                    </TooltipHost>
                }
                { this.props.retargetInProgress && <Spinner className={"retarget-spinner"} size={SpinnerSize.xSmall} />}
                { this.state.showRetargetDialog && 
                    <RetargetDialog 
                        sourceRepositoryContext={pullRequestInfo.sourceRepositoryContext}
                        targetRepositoryContext={this.props.repositoryContext}
                        sourceBranchRefName={this.props.pullRequestInfo.sourceBranchRefName}
                        currentTargetBranchRefName={this.props.pullRequestInfo.targetBranchRefName}
                        onDismiss={this._hideRetargetDialog}
                        onRetarget={this.props.onRetarget}
                        autoCompleteSet={this.props.autoCompleteSet}/>
                }
            </div>
        );
    }

    private onToggleSourceBranchFavorite = (): void => {
        this.onToggleBranchFavorite(this.props.pullRequestInfo.sourceBranchRefName, this.props.pullRequestInfo.sourceBranchFavoriteId);
    }

    private onToggleTargetBranchFavorite = (): void => {
        this.onToggleBranchFavorite(this.props.pullRequestInfo.targetBranchRefName, this.props.pullRequestInfo.targetBranchFavoriteId);
    }

    private onToggleBranchFavorite(branchName: string, favoriteId: number): void {
        if (favoriteId) {
            this.props.onUnfavoriteBranch(favoriteId);
        } else {
            this.props.onFavoriteBranch(branchName);
        }
    }
    
    private _showRetargetDialog = () => {
        this.setState({
            showRetargetDialog: true
        });
    }

    private _hideRetargetDialog = () => {
        this.setState({
            showRetargetDialog: false
        });
    }
}

interface IBranchLinkProps {
    branchLabel: string;
    branchFriendlyName: string;
    branchUrl: string;
    className?: string;
    onClick?(event: React.MouseEvent<HTMLAnchorElement>): void | boolean;
}

/**
 * Render a branch link with a tooltip that displays if the branch name is elided.
 */
const BranchLink = (props: IBranchLinkProps): JSX.Element => {
    return (
         <TooltipHost
            hostClassName={props.className}
            overflowMode={TooltipOverflowMode.Self}
            content={props.branchFriendlyName}
            directionalHint={DirectionalHint.bottomCenter}
            calloutProps={{ gapSpace: 2 }}>
            <Link
                className="vc-pullrequest-detail-branch-name"
                onClick={props.onClick}
                href={props.branchUrl}
                aria-label={props.branchLabel}>{props.branchFriendlyName}
            </Link>
        </TooltipHost>);
};
