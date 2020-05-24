import React = require("react");
import * as Tooltip from "VSSUI/Tooltip";

import Utils_String = require("VSS/Utils/String");
import VCResources = require("VersionControl/Scripts/Resources/TFS.Resources.VersionControl");

import "VSS/LoaderPlugins/Css!VersionControl/SourcePath";

export interface ISourcePathProps extends React.Props<void> {
    path: string;
    linesDeleted?: number;
    linesAdded?: number;
}

/**
 * This control renders a bar with file name and its full path
 */
export class SourcePath extends React.Component<ISourcePathProps, {}> {
    public render(): JSX.Element {
        return (
            <div className="vc-source-path">
                <div className="file-name">
                    <span role="heading" aria-level={2}>{this._fileName()}</span>
                    <DiffLineCountContainer
                        linesAdded={this.props.linesAdded}
                        linesDeleted={this.props.linesDeleted} />
                </div>
                <div className="full-path" title={this.props.path}>{this.props.path}</div>
            </div>
        );
    }

    private _fileName(): string {
        if (!this.props.path) {
            return "";
        }

        let fileName = this.props.path.substring(this.props.path.lastIndexOf("/") + 1);

        if (fileName.length === 0) {
            fileName = " ";
        }

        return fileName;
    }
}

export interface DiffLineCountContainerProps {
    linesAdded: number;
    linesDeleted: number;
}

export const DiffLineCountContainer = (props: DiffLineCountContainerProps): JSX.Element => {
    let linesAddedClassName: string = "";
    let linesAdded: string = "";

    if (props.linesAdded) {
        linesAdded = Utils_String.format(VCResources.LinesAddedHeader, props.linesAdded)
        linesAddedClassName = "file-lines-added";
    }

    let linesDeletedClassName: string = "";
    let linesDeleted: string = "";
    if (props.linesDeleted) {
        linesDeleted = Utils_String.format(VCResources.LinesDeletedHeader, props.linesDeleted)
        linesDeletedClassName = "file-lines-deleted";
    }

    return (
        <span className="diff-line-count-container">
            <Tooltip.TooltipHost content={Utils_String.format(VCResources.LinesAddedToolTip, props.linesAdded)}>
                <span className={linesAddedClassName}>{linesAdded}</span>
            </Tooltip.TooltipHost>
            <Tooltip.TooltipHost content={Utils_String.format(VCResources.LinesDeletedToolTip, props.linesDeleted)}>
                <span className={linesDeletedClassName}>{linesDeleted}</span>
            </Tooltip.TooltipHost>
        </span>
    );
}
