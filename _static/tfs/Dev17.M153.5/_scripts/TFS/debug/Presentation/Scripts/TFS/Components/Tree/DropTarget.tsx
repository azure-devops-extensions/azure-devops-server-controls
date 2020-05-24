import { autobind } from "OfficeFabric/Utilities";
import * as React from "react";
import { cloneDataTransfer } from "VSS/Controls/FileInput";

import "VSS/LoaderPlugins/Css!Presentation/Components/Tree/DropTarget";

export interface FileDropTargetProps {
    className?: string;
    isEnabled: boolean;
    onFilesDrop: (dataDrop: DataTransfer) => void;
}

export interface FileDropTargetState {
    isDraggingOver: boolean;
}

export class FileDropTarget extends React.Component<FileDropTargetProps, FileDropTargetState> {
    state = { isDraggingOver: false };

    public render(): JSX.Element {
        const className = "file-drop-target " +
            (this.props.className || "") +
            (this.state.isDraggingOver ? " dragging" : "");

        return (
            <div
                className={className}
                onDragEnter={this.onDragEnter}
                onDragOver={this.onDragEnter}
                onDragLeave={this.onDragExit}
                onDrop={this.onDrop}>
                {this.props.children}
            </div>
        );
    }

    @autobind
    private onDragEnter(event: React.DragEvent<HTMLDivElement>): void {
        if (this.canDrop(event)) {
            stop(event);
            this.setState({ isDraggingOver: true });
        }
    }

    @autobind
    private onDragExit(event: React.DragEvent<HTMLDivElement>): void {
        if (this.canDrop(event)) {
            stop(event);
            this.setState({ isDraggingOver: false });
        }
    }

    @autobind
    private onDrop(event: React.DragEvent<HTMLDivElement>): void {
        if (this.canDrop(event)) {
            stop(event);
            this.setState({ isDraggingOver: false });
            this.props.onFilesDrop(cloneDataTransfer(event.dataTransfer));
        }
    }

    private canDrop(event: React.DragEvent<HTMLDivElement>): boolean {
        return this.props.isEnabled &&
            hasFiles(event.dataTransfer);
    }
}

function hasFiles(dataTransfer: DataTransfer): boolean {
    // types property is not a regular array in Edge, so cannot use indexOf
    for (const typeName of dataTransfer.types) {
        if (typeName === "Files") {
            return true;
        }
    }

    return false;
}

export interface DropForbiddenTargetProps {
    className: string;
    children?: any;
}

export const DropForbiddenTarget = (props: DropForbiddenTargetProps): JSX.Element =>
    <div className={props.className} onDragOver={stop} onDrop={stop}>
        {props.children}
    </div>;

function stop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
}
