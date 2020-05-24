import * as React from "react";
import {css} from "OfficeFabric/Utilities";

import { IDragDropDataTransferItem } from "Discussion/Scripts/DiscussionHelpers";
import { WikiPage } from "TFS/Wiki/Contracts";
import { WikiTreeNodeConstants } from "Wiki/Scripts/CommonConstants";
import { getRandomId } from "Wiki/Scripts/Helpers";
import "VSS/LoaderPlugins/Css!Wiki/Scenarios/Overview/Components/WikiTreeNodeDraggable";

export interface WikiTreeNodeDraggableProps {
    item: WikiPage;
    canDrag: boolean;
    onDrag(source: WikiPage): void;
    onDrop(target: WikiPage, isReorderOperation?: boolean, isReorderAbove?: boolean): void;
    canDrop(target: WikiPage, isReorderOperation?: boolean): boolean;
}

export interface WikiTreeNodeDraggableState {
    isOverReparentTarget: boolean;
    isOverTopReorderTarget: boolean;
    isOverBottomReorderTarget: boolean;
}

const AllowedDragEffect = "all";
const DragDataTransferType = "text";

export class WikiTreeNodeDraggable extends React.Component<WikiTreeNodeDraggableProps, WikiTreeNodeDraggableState> {
    private _topReorderTargetId: string = null;
    private _bottomReorderTargetId: string = null;

    constructor(props: WikiTreeNodeDraggableProps) {
        super(props);
        this.state = {
            isOverReparentTarget: false,
            isOverTopReorderTarget: false,
            isOverBottomReorderTarget: false
        };

        const randomDOMId = getRandomId();
        this._topReorderTargetId = "top-reorder-target-" + randomDOMId;
        this._bottomReorderTargetId = "bottom-reorder-target-" + randomDOMId;
    }

    public render(): JSX.Element {
        // The reorder-target, though placed after reparent-target, is not below it.
        // Reorder-target will overlap reparent-target and will be placed such that the top of both targets align
        return (
            <div className={"wiki-node-draggable"}>
                <div
                    className={css("reparent-target", (this.state.isOverReparentTarget === true ? " dragging" : ""))}
                    draggable={this.props.canDrag}
                    onDragStart={this._onDragStart}
                    onDragEnter={this._onReparentDragEnter}
                    onDragOver={this._onReparentDragEnter}
                    onDragLeave={this._onReparentDragExit}
                    onDrop={this._onReparentDrop}>
                    {this.props.children}
                </div>
                <div
                    id={this._topReorderTargetId}
                    className={css("top-target", (this.state.isOverTopReorderTarget === true ? " dragging" : ""))}
                    onDragEnter={this._onReorderDragEnter}
                    onDragOver={this._onReorderDragEnter}
                    onDragLeave={this._onReorderDragExit}
                    onDrop={this._onReorderDrop} />
                <div
                    id={this._bottomReorderTargetId}
                    className={css("bottom-target", (this.state.isOverBottomReorderTarget === true ? " dragging" : ""))}
                    onDragEnter={this._onReorderDragEnter}
                    onDragOver={this._onReorderDragEnter}
                    onDragLeave={this._onReorderDragExit}
                    onDrop={this._onReorderDrop} />
            </div>
        );
    }

    // Drag and drop handlers for the reparent and copy link operation
    private _onDragStart = (event: React.DragEvent<HTMLDivElement>): void => {
        if(this.props.canDrag) {
            event.dataTransfer.effectAllowed = AllowedDragEffect;
            this.props.onDrag(this.props.item);

            //Required for creating link when wiki tree node is dropped on editor
            event.dataTransfer.setData(DragDataTransferType,
                JSON.stringify({
                    "source": WikiTreeNodeConstants.WikiTreeNodeDragEvent,
                    "text": this.props.item.path
                } as IDragDropDataTransferItem));
        }
    }

    private _onReparentDragEnter = (event: React.DragEvent<HTMLDivElement>): void => {
        if (this._isDragOperationSupported(event)) {
            this._stop(event);
            this.setState({ isOverReparentTarget: true });
        }
    }

    private _onReparentDragExit = (event: React.DragEvent<HTMLDivElement>): void => {
        if (this._isDragOperationSupported(event)) {
            this._stop(event);
            this.setState({ isOverReparentTarget: false });
        }
    }        

    private _onReparentDrop = (event: React.DragEvent<HTMLDivElement>): void => {
        if (this._isDragOperationSupported(event)) {
            this._stop(event);
            this.setState({ isOverReparentTarget: false });
            this.props.onDrop(this.props.item);
        } 
    }

    // Drag and drop handlers for the reorder operation
    private _onReorderDragEnter = (event: React.DragEvent<HTMLDivElement>): void => {
        const isReorderAboveOperation = this._isTopReorderTargetEvent(event);
        if (this._isDragOperationSupported(event, true)) {
            this._stop(event);

            if (isReorderAboveOperation) {
                this.setState({ isOverTopReorderTarget: true });
            } else {
                this.setState({ isOverBottomReorderTarget: true });
            }
        }
    }

    private _onReorderDragExit = (event: React.DragEvent<HTMLDivElement>): void => {
        const isReorderAboveOperation = this._isTopReorderTargetEvent(event);
        if (this._isDragOperationSupported(event, true)) {
            this._stop(event);

            if (isReorderAboveOperation) {
                this.setState({ isOverTopReorderTarget: false });
            } else {
                this.setState({ isOverBottomReorderTarget: false });
            }
        }
    }

    private _onReorderDrop = (event: React.DragEvent<HTMLDivElement>): void => {
        const isReorderAboveOperation = this._isTopReorderTargetEvent(event);
        if (this._isDragOperationSupported(event, true)) {
            this._stop(event);

            if (isReorderAboveOperation) {
                this.setState({ isOverTopReorderTarget: false });
            } else {
                this.setState({ isOverBottomReorderTarget: false });
            }

            this.props.onDrop(this.props.item, true, isReorderAboveOperation);
        }
    }

    private _stop(event: React.DragEvent<HTMLDivElement>): void {
        event.preventDefault();
        event.stopPropagation();
    }

    private _isDragOperationSupported(event: React.DragEvent<HTMLDivElement>, isReorderOperation?: boolean): boolean {
        const isDragEffectAllowed = event.dataTransfer.effectAllowed === AllowedDragEffect;
        const isDragTargetValid = this.props.canDrop(this.props.item, isReorderOperation);

        return isDragEffectAllowed && isDragTargetValid && this.props.canDrag;
    }

    private _isTopReorderTargetEvent(event: React.DragEvent<HTMLDivElement>): boolean {
        const target: HTMLDivElement = event.target as HTMLDivElement;

        return target.id === this._topReorderTargetId;
    }
}
