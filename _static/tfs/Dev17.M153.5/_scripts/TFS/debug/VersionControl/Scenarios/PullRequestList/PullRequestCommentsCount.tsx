import * as React from "react";
import { ArtifactStatsInfo } from "VersionControl/Scenarios/PullRequestList/PullRequestListDataModel";
import { Link } from "OfficeFabric/Link";
import { onClickNavigationHandler } from "VersionControl/Scripts/Utils/XhrNavigationUtils";
import { CodeHubContributionIds } from "VersionControl/Scripts/CodeHubContributionIds";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";

import "VSS/LoaderPlugins/Css!VersionControl/PullRequestCommentsCount";

export interface PullRequestCommentsCountProps {
    pullRequestHref: string;
    artifactStatsInfo: ArtifactStatsInfo;
    onLinkNavigation: (cidata: IDictionaryStringTo<any>) => void;
    cidata: IDictionaryStringTo<any>;
}

export class PullRequestCommentsCount extends React.Component<PullRequestCommentsCountProps, {}> {
    public shouldComponentUpdate(nextProps: PullRequestCommentsCountProps, nextState): boolean {
        return nextProps.pullRequestHref !== this.props.pullRequestHref
            || nextProps.artifactStatsInfo !== this.props.artifactStatsInfo;
    }

    private _onLinkClick(event: React.MouseEvent<HTMLAnchorElement>, hubId:string) {
        if (this.props.onLinkNavigation) {
            this.props.onLinkNavigation({component: "PullRequestCommentsCount", ...this.props.cidata});
        }
        onClickNavigationHandler(event, hubId, (event.currentTarget as HTMLAnchorElement).href);
    }

    public render(): JSX.Element {
        return <div className="vc-pullrequest-comments-count">
                {this.props.artifactStatsInfo.commentsCount > 0 ?
                    <Link className="vc-pullrequest-comments-link"
                        title={this.props.artifactStatsInfo.commentsToolTip}
                        href={this.props.pullRequestHref}
                        aria-label={VCResources.PullRequest_CommentsCount_LinkTitle}
                        onClick={(event: React.MouseEvent<HTMLAnchorElement>)=>this._onLinkClick(event, CodeHubContributionIds.pullRequestHub)}>
                        <div>
                            <span className="bowtie-icon bowtie-comment-discussion vc-pullrequest-comment-icon"></span>
                            <span className="vc-pullrequest-comments-number">{this.props.artifactStatsInfo.commentsCountText}</span>
                        </div>
                    </Link>
                    : <div aria-disabled="true" 
                        className="vc-pullrequest-commentcount-zero"
                        title={this.props.artifactStatsInfo.commentsToolTip} >
                        <span className="bowtie-icon bowtie-comment-discussion vc-pullrequest-comment-icon"></span>
                        <span className="vc-pullrequest-comments-number">{this.props.artifactStatsInfo.commentsCountText}</span>
                        <span className="visually-hidden">{this.props.artifactStatsInfo.commentsToolTip}</span>
                    </div>
                }
            </div>;
    }
}