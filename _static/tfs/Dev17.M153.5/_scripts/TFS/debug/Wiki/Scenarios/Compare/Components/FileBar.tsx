import * as React from "react";

import { DiffLineCountContainer, DiffLineCountContainerProps } from "VersionControl/Scenarios/Shared/SourcePath";

import "VSS/LoaderPlugins/Css!Wiki/Scenarios/Compare/Components/FileBar";

export interface FileBarProps {
    fileName: string;
    iconClass?: string;
    linesAdded?: number;
    linesDeleted?: number;
}

export const FileBar = (props: FileBarProps): JSX.Element => {
    return (
        <div className="file-bar">
            {props.iconClass ? <span className={"title-icon " + props.iconClass} /> : null}
            <span className="file-name" role="heading">{props.fileName}</span>
            <DiffLineCountContainer
                linesAdded={props.linesAdded}
                linesDeleted={props.linesDeleted} />
        </div>
    );
}