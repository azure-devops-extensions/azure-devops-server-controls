import * as React from "react";

import { Link } from "OfficeFabric/Link";
import { autobind } from "OfficeFabric/Utilities";

import { Flux } from "VersionControl/Scenarios/PullRequestDetail/View/PullRequestDetail.Flux";
import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";
import { RepositoryContext } from "VersionControl/Scripts/RepositoryContext";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import * as VersionControlUrls from "VersionControl/Scripts/VersionControlUrls";
import * as Utils_String from "VSS/Utils/String";

export interface IterationLinkProps {
    repoContext: RepositoryContext;
    pullRequestId: number;
    iterationId: number;
}

export class IterationLink extends React.PureComponent<IterationLinkProps, {}> {
    public render(): JSX.Element {
        const url = VersionControlUrls.getPullRequestIterationUrl(this.props.repoContext as GitRepositoryContext, this.props.pullRequestId, this.props.iterationId);

        return <Link onClick={this._onLinkClick}
            href={url}
            aria-label={Utils_String.format(VCResources.PullRequest_ActivityFeed_View_Update_Title, this.props.iterationId)}>
            {Utils_String.format(VCResources.PullRequest_ActivityFeed_Update_Name, this.props.iterationId)}
        </Link>;
    }

    @autobind
    private _onLinkClick(event: React.MouseEvent<HTMLAnchorElement>) {
        const nativeEvent = event.nativeEvent as any;

        if (event.shiftKey || event.metaKey || event.ctrlKey
            || (nativeEvent && nativeEvent.which === 2)) {
            // Use default link navigation if this is a ctrl-click, command-click, shift-click, or middle-click event.
            return;
        }

        event.stopPropagation();
        event.preventDefault();

        Flux.instance().actionCreator.navigationActionCreator.navigateWithState({
            action: "files",
            iteration: this.props.iterationId,
            base: this.props.iterationId - 1 || null,
            path: null,
            discussionId: null,
        });
    }
}
