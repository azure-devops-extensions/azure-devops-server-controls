/// <reference types="react" />
/// <reference types="react-dom" />

// React
import * as React from "react";
import * as ReactDOM from "react-dom";
// Office Fabric
import { DetailsRow, IDetailsRowProps } from "OfficeFabric/DetailsList";
import { IItem } from "Presentation/Scripts/TFS/Stores/TreeStore";

import { KeyCode } from "VSS/Utils/UI";

/**
* Component that wraps DetailsRow, this allows us to access the row and perform actions on the left and right arrows
**/
export interface ExpandCollapseRowProps {
    rowProps: IDetailsRowProps;
    item: IItem;
    onFolderExpanded(fullName: string): void;
    onFolderCollapsed(fullName: string): void;
}

export class ExpandCollapseRow extends React.Component<ExpandCollapseRowProps, {}>{
    public render(): JSX.Element {
        return (
            <div onKeyDown={this._onKeyDown}>
                <DetailsRow
                    aria-expanded={this.props.item.isFolder ? this.props.item.expanded : null}
                    ref="row"
                    {...this.props.rowProps}
                />
            </div>
        );
    }

    /* If the row is selected (not an item in the row) and left/right are pressed expand/collapse the row */
    private _onKeyDown = (ev) => {
        if (this.props.item.isFolder && !this.props.item.expanding) {
            if (ev.keyCode === KeyCode.RIGHT && !this.props.item.expanded) {
                this.props.onFolderExpanded(this.props.item.fullName);
                ev.stopPropagation();
                ev.preventDefault();
            }
            else if (ev.keyCode === KeyCode.LEFT && this.props.item.expanded) {
                this.props.onFolderCollapsed(this.props.item.fullName);
                ev.stopPropagation();
                ev.preventDefault();

                //If the instruction came from a cell in the row, set focus to be the row
                if (ev._targetInst._currentElement.ref !== "root" && this.refs["row"]) {
                    (this.refs["row"] as any).focus();
                }
            }
        }
    }
}