import * as React from "react";

import { Flux } from "VersionControl/Scenarios/PullRequestDetail/View/PullRequestDetail.Flux";
import { SourcePath } from "VersionControl/Scenarios/Shared/SourcePath";
import { FullScreenButton } from "VersionControl/Scripts/Components/PullRequestReview/FullScreenButton";
import * as VCFileIconPicker from "VersionControl/Scripts/VersionControlFileIconPicker";

export interface IFileBarProps extends React.Props<void> {
    path: string;
    style: React.CSSProperties;
    linesDeleted?: number;
    linesAdded?: number;
}

/**
 * File bar that renders above file view for selected items in the pull request.
 */
export class FileBar extends React.PureComponent<IFileBarProps> {
    public render(): JSX.Element {
        const icon = "file-icon bowtie-icon " + VCFileIconPicker.getIconNameForFile(this.props.path);
        return (
            <div className="vc-pullrequest-file-bar" style={this.props.style}>
                <div className={icon} />
                <SourcePath path={this.props.path} linesDeleted={this.props.linesDeleted} linesAdded={this.props.linesAdded} />
                <div className="vc-pullrequest-file-bar-toolbar pr-diffviewer-toolbar toolbar" />
                <div className="vc-pullrequest-file-bar-toolbar pr-fileviewer-toolbar toolbar" />
                <div className="fullscreen-container">
                    <FullScreenButton fullScreenCallback={this._fullScreenCallback} />
                </div>
            </div>
        );
    }

    private _fullScreenCallback = (isFullScreen: boolean, hasChanged: boolean) => {
        if (hasChanged) {
            Flux.instance().actionCreator.toggleFullScreen(isFullScreen);
        }
    }
}
