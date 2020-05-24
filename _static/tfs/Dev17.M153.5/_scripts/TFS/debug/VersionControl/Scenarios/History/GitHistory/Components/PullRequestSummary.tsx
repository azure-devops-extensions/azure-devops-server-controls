/// <reference types="react" />

import React = require("react");

import "VSS/LoaderPlugins/Css!VersionControl/PullRequestSummary";

export interface IPullRequestSummaryProps extends React.Props<void> {
    pullRequestId: string;
    pullRequestUri: string;
    pullRequestTitle?: string;
}

/**
 * Renders PullRequestSummary control.
 */
export class PullRequestSummary extends React.Component<IPullRequestSummaryProps, {}> {
    public render(): JSX.Element {
        let pullRequestSummaryText: string = this.props.pullRequestId;

        if (this.props.pullRequestTitle) {
            pullRequestSummaryText = pullRequestSummaryText + " : " + this.props.pullRequestTitle;
        }

        return (
            <div className={'vc-pr-summary'}>
                <span className='bowtie-icon bowtie-tfvc-pull-request' />
                <a className='pr-title' title={pullRequestSummaryText} aria-label={pullRequestSummaryText} href={this.props.pullRequestUri}>{pullRequestSummaryText}</a>
            </div>);
    }
}
