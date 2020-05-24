import { DirectionalHint } from "OfficeFabric/common/DirectionalHint";
import { TooltipHost } from "VSSUI/Tooltip";
import * as React from "react";
import { format } from "VSS/Utils/String";

// actions
import { Flux } from "VersionControl/Scenarios/PullRequestDetail/View/PullRequestDetail.Flux";

// contracts and controls
import {
    PullRequest_ResolvedDiscussionCount,
    PullRequest_ResolvedDiscussionCountAll,
    PullRequest_ResolvedDiscussionCountTooltip,
    PullRequest_ResolvedDiscussionCountTooltipAll
} from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import { DiscussionType } from "VersionControl/Scripts/Stores/PullRequestReview/DiscussionFilter";

export interface IResolvedDiscussionCountState {
    totalDiscussionCount: number;
    activeDiscussionCount: number;
    resolvedDiscussionCount: number;
}

/**
 * The resolved discussion count button below the pull request details component.
 */
export class ResolvedDiscussionCount extends React.Component<{}, IResolvedDiscussionCountState> {

    constructor(props) {
        super(props);

        this.state = this._getStateFromStores();
    }

    public render(): JSX.Element {
        if (!this.state.totalDiscussionCount) {
            return null;
        }

        const resolvedCountText: string = (this.state.resolvedDiscussionCount !== this.state.totalDiscussionCount)
            ? format(PullRequest_ResolvedDiscussionCount, this.state.resolvedDiscussionCount, this.state.totalDiscussionCount)
            : PullRequest_ResolvedDiscussionCountAll;

        const resolvedCountTooltipText: string = (this.state.resolvedDiscussionCount !== this.state.totalDiscussionCount)
            ? format(PullRequest_ResolvedDiscussionCountTooltip, this.state.resolvedDiscussionCount, this.state.totalDiscussionCount)
            : PullRequest_ResolvedDiscussionCountTooltipAll;

        return (
            <div className={"vc-pullrequest-resolved-comments-count"}>
                <TooltipHost
                    content={resolvedCountTooltipText}
                    directionalHint={DirectionalHint.bottomCenter}
                    calloutProps={{ gapSpace: 2 }}>
                    <span
                        tabIndex={0}
                        aria-label={resolvedCountTooltipText}>
                        <i className={"bowtie-icon bowtie-comment-discussion"} />
                        {resolvedCountText}
                    </span>
                </TooltipHost>
            </div>
        );
    }

    public componentDidMount(): void {
        Flux.instance().storesHub.discussionsStore.addChangedListener(this._onStoresChanged);
    }

    public componentWillUnmount(): void {
        Flux.instance().storesHub.discussionsStore.removeChangedListener(this._onStoresChanged);
    }

    private _onStoresChanged = () => {
        this.setState(this._getStateFromStores());
    }

    private _getStateFromStores(): IResolvedDiscussionCountState {
        const counts = Flux.instance().storesHub.discussionsStore.getDiscussionCountByType([
            DiscussionType.AllComments,
            DiscussionType.AllActiveComments,
            DiscussionType.AllResolvedComments
        ]);

        return {
            totalDiscussionCount: counts[DiscussionType.AllComments] || 0,
            activeDiscussionCount: counts[DiscussionType.AllActiveComments] || 0,
            resolvedDiscussionCount: counts[DiscussionType.AllResolvedComments] || 0
        } as IResolvedDiscussionCountState;
    }
}
