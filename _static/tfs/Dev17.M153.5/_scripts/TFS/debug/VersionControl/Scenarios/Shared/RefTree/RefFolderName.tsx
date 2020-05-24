/// <reference types="react" />
/// <reference types="react-dom" />

import * as React from "react";
import { Spacer } from "VersionControl/Scenarios/Shared/RefTree/Spacer";
import { HighlightableSpan } from "Presentation/Scripts/TFS/Components/HighlightableSpan";

import "VSS/LoaderPlugins/Css!VersionControl/Shared/RefTree/RefFolderName";

export interface FolderNameProperties {
    key: string;
    depth: number;
    name: string;
    fullname: string;
    expanded: boolean;
    expanding: boolean;
    highlightText: string;
    expandHandler(): void;
}

export class FolderName extends React.Component<FolderNameProperties, {}> {
    public render() {
        let chevronClass = "vc-chevron bowtie-icon bowtie-chevron-right " + (this.props.expanded ? "vc-expanded" : "");

        //If refs are loading show a spinner
        if (this.props.expanding) {
            chevronClass = "vc-chevron status-progress";
        }

        return (
            <div className="refs-name-cell" onClick={(event: React.MouseEvent<HTMLElement>) => { this.props.expandHandler() }}>
                <Spacer depth={this.props.depth}/>
                <span className={chevronClass}></span>
                <span className="vc-folder-icon bowtie-icon bowtie-folder"></span>
                <HighlightableSpan className="vc-ref-name-margin"
                    highlight={this.props.highlightText}
                    text={this.props.name} />
            </div>
        );
    }
}
