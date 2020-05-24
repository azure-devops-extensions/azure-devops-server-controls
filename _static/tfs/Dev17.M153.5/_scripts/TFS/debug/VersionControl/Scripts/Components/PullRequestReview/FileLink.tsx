import React = require("react");

import Navigation_Services = require("VSS/Navigation/Services");
import { INavigationState } from "VersionControl/Scripts/Actions/PullRequestReview/ActionsHub";

export interface FileLinkProps {
    id?: string;
    itemPath: string;
    discussionId?: number;
    iteration?: number;
    base?: number;
    text?: string;
    cssClass?: string;
}

export class FileLink extends React.Component<FileLinkProps, {}> {
    public render(): JSX.Element {
        const state: INavigationState = {
            path: this.props.itemPath,
            discussionId: this.props.discussionId || null,
            iteration: this.props.iteration || null,
            base: this.props.base || null,
        };
        const text = this.props.text || this.props.itemPath;
        return <a id={this.props.id} className={this.props.cssClass} href={Navigation_Services.getHistoryService().getFragmentActionLink("files", state)}>{text}</a>;
    }
}
