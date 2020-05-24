/// <reference types="react" />
import "VSS/LoaderPlugins/Css!TestManagement/Scripts/Scenarios/Common/Components/TreeListView";

import { IColumn } from "OfficeFabric/DetailsList";
import { Spinner, SpinnerSize } from "OfficeFabric/Spinner";
import { autobind, css } from "OfficeFabric/Utilities";
import * as React from "react";
import * as Resources from "TestManagement/Scripts/Resources/TFS.Resources.TestManagement";
import { ITreeItem, TreeNodeType } from "TestManagement/Scripts/Scenarios/Common/Common";
import * as ComponentBase from "VSS/Flux/Component";
import * as Utils_Array from "VSS/Utils/Array";
import { KeyCode } from "VSS/Utils/UI";
import { IVssDetailsListProps } from "VSSUI/Components/VssDetailsList/VssDetailsList.Props";
import { VssDetailsList, IVssDetailsList } from "VSSUI/VssDetailsList";


export interface ITreeListViewProps extends IVssDetailsListProps {
    onGroupCollapsed?: (item: ITreeItem, index?: number) => void;
    onGroupExpanded?: (item: ITreeItem, index?: number) => void;
    onLoadMore?: (item: ITreeItem) => void;
    groupHeaderIconClassName?: string;
}

export class TreeListView extends ComponentBase.Component<ITreeListViewProps, ComponentBase.State> {

    public render(): JSX.Element {

        this._adjustGroupedColumnItemData();

        return (
            <VssDetailsList
                columns={this.props.columns}
                className={this.props.className}
                layoutMode={this.props.layoutMode}
                items={this.props.items}
                usePresentationStyles={this.props.usePresentationStyles}
                checkboxVisibility={this.props.checkboxVisibility}
                selection={this.props.selection}
                initialFocusedIndex={this.props.initialFocusedIndex}
                selectionMode={this.props.selectionMode}
                constrainMode={this.props.constrainMode}
                onItemInvoked={this.props.onItemInvoked}
                onActiveItemChanged={this.props.onActiveItemChanged}
                compact={this.props.compact}
                onRenderItemColumn={this.props.onRenderItemColumn}
                ariaLabelForSelectAllCheckbox={this.props.ariaLabelForSelectAllCheckbox}
                ariaLabelForGrid={this.props.ariaLabelForGrid}
                ariaLabelForSelectionColumn={this.props.ariaLabelForSelectionColumn}
                onRowDidMount={this.onRowDidMount}
                selectionPreservedOnEmptyClick={true}
                componentRef={this._onDetailsListRef}>
            </VssDetailsList>
        );
    }

    @autobind
    private _onDetailsListRef(ref: IVssDetailsList): void {
        this._vssDetailsList = ref;
    }

    @autobind
    private onRowDidMount(item?: ITreeItem, index?: number) {
        if (item.nodeType === TreeNodeType.showMore && this.props.onLoadMore) {
            this.props.onLoadMore(item);
        }

        if (!this._vssDetailsList || !this._vssDetailsList.detailsList || !this.props.selection || this.props.initialFocusedIndex == null) {
            return;
        }

        if (index === 0) {
            // This is the same technique used by DetailsList internally (to set focus on a row), we're
            // waiting for the first row mount and then scrolling to our target row and setting selection on it; we're only
            // scroll and select once
            const initialIndex = this.props.initialFocusedIndex;

            this._vssDetailsList.detailsList.scrollToIndex(initialIndex);

            requestAnimationFrame(() => this.props.selection.setIndexSelected(initialIndex, true, true));
        }
    }

    private _adjustGroupedColumnItemData(): void {

        let columns: IColumn[] = this.props.columns;
        if (!columns || columns.length === 0) {
            return;
        }

        let firstColumn: IColumn = Utils_Array.first(columns);
        let firstColumnRenderCell = firstColumn.onRender;

        firstColumn.onRender = (item: ITreeItem, index: number, column?: IColumn) => {
            let groupHeaderIcon: JSX.Element = null;
            let paddingLeft: number = 50 * (item.depth);
            if (item.nodeType === TreeNodeType.group) {
                if (item.depth > 0) {
                    paddingLeft = paddingLeft - 24;
                }

                let cssClassName: string = "treelistview-groupitem-groupicon";
                if (this.props.groupHeaderIconClassName) {
                    cssClassName = cssClassName + " " + this.props.groupHeaderIconClassName;
                }
                groupHeaderIcon = (
                    <GroupHeaderIcon
                        cssClass={cssClassName}
                        isExpanded={item.expanded}
                        onGroupHeaderIconClicked={() => this._toggleGroupHeader(item, index)
                        }
                        onGroupHeaderIconKeyDown={(e: React.KeyboardEvent<HTMLSpanElement>) => { this._onKeyDownOnGroupIcon(e, item, index); }} />
                );
            }

            let divStyle = {
    paddingLeft: paddingLeft.toString() + "px"
};

return (
    <div style={divStyle} className="treelistview-groupitem-cell">
        {groupHeaderIcon}
        <div className={css("treelistview-groupitem-cell-content")}>
            {firstColumnRenderCell ? firstColumnRenderCell(item, index, column) : null}
        </div>
    </div>
);
        };
    }

    private _onKeyDownOnGroupIcon(e: React.KeyboardEvent < HTMLSpanElement >, item: ITreeItem, index ?: number) {
    if (e.keyCode === KeyCode.ENTER || e.keyCode === KeyCode.SPACE) {
        this._toggleGroupHeader(item, index);
    }
}

    private _toggleGroupHeader(item: ITreeItem, index ?: number) {
    if (item.expanded) {
        if (this.props.onGroupCollapsed) {
            this.props.onGroupCollapsed(item, index);
        }
    }
    else {
        if (this.props.onGroupExpanded) {
            this.props.onGroupExpanded(item, index);
        }
    }
}

    private _vssDetailsList: IVssDetailsList;
}

export interface IGroupHeaderIconProps extends ComponentBase.Props {
    isExpanded: boolean;
    onGroupHeaderIconClicked: () => void;
    onGroupHeaderIconKeyDown: (e: React.KeyboardEvent<HTMLSpanElement>) => void;
}

export interface IGroupHeaderIconState extends ComponentBase.State {
    isExpanding?: boolean;
}

export class GroupHeaderIcon extends ComponentBase.Component<IGroupHeaderIconProps, IGroupHeaderIconState>{
    public componentWillReceiveProps(newProps: IGroupHeaderIconProps) {
        if (newProps && !!newProps.isExpanded !== !!this.props.isExpanded) {
            this.setState({ isExpanding: false });
        }
    }

    public render(): JSX.Element {

        if (this.state && this.state.isExpanding) {
            return (
                <Spinner className={css(this.props.cssClass, "treelistview-groupitem-groupicon-spinner")} size={SpinnerSize.small} />
            );
        }
        else {
            let bowtieClassName = css(this.props.cssClass, this.props.isExpanded ? "bowtie-chevron-down bowtie-icon expand-collapse-icon" : "bowtie-chevron-right bowtie-icon expand-collapse-icon");
            return (<span className={bowtieClassName} role="button" aria-label={Resources.ExpandOrCollapseButton}
                aria-expanded={this.props.isExpanded} onClick={this._onIconClick} onKeyDown={e => this.props.onGroupHeaderIconKeyDown && this.props.onGroupHeaderIconKeyDown(e)} />);
        }
    }

    @autobind
    private _onIconClick(): void {
        if (!this.props.isExpanded) {
            this.setState({ isExpanding: true });
        }

        if (this.props.onGroupHeaderIconClicked) {
            this.props.onGroupHeaderIconClicked();
        }
    }
}