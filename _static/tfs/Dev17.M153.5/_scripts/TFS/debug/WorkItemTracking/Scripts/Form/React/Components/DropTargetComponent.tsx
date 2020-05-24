import "VSS/LoaderPlugins/Css!WorkItemTracking/Form/React/Components/DropTargetComponent";
import { Async, css } from "OfficeFabric/Utilities";
import * as React from "react";
import * as WITOM from "WorkItemTracking/Scripts/TFS.WorkItemTracking";
import * as WorkItemTrackingResources from "WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking";
import { Icon } from "OfficeFabric/Icon";
import { WITFileHelper } from "WorkItemTracking/Scripts/TFS.WorkItemTracking.Helpers";
import { WorkItemForm } from "WorkItemTracking/Scripts/Controls/WorkItemForm";

export interface DropTargetProps {
    workItem: WITOM.WorkItem;
    /** listener uses a drag event listener to trigger conditional rendering of the drop target */
    form: WorkItemForm;
}

export interface DropTargetState {
    isFocused: boolean;
    isHidden: boolean;
    workItem: WITOM.WorkItem;
}

export class DropTargetComponent extends React.Component<DropTargetProps, DropTargetState> {
    private _async: Async;
    private _timeoutId: number;
    private _dragCount: number = 0;
    private _overlayTimeout: number;

    constructor(props: DropTargetProps) {
        super(props);
        this._async = new Async(this);
        this.state = {
            isFocused: false,
            isHidden: true,
            workItem: this.props.workItem
        };
    }

    componentDidMount() {
        document.body.addEventListener("dragover", this._onBodyDragOver);
        document.body.addEventListener("dragenter", this._onBodyDragEnter);
        document.body.addEventListener("dragleave", this._onBodyDragLeave);
    }

    componentWillUnmount() {
        document.body.removeEventListener("dragover", this._onBodyDragOver);
        document.body.removeEventListener("dragenter", this._onBodyDragEnter);
        document.body.removeEventListener("dragleave", this._onBodyDragLeave);
        this._async.dispose();
    }

    componentDidCatch() {
        this.setState({ isHidden: true });
    }

    private _isValidDraggable = (event: React.DragEvent<HTMLElement> | DragEvent): boolean => {

        let fileTypeFound = false;
        for (const type of event.dataTransfer.types) {
            /** check to make sure user is dragging files to upload, not text */
            if (type === "Files" || type === "application/x-moz-file") {
                fileTypeFound = true;
                break;
            }
        }

        return fileTypeFound;
    }

    public updateWorkItem(newWorkItem: WITOM.WorkItem) {
        this._async.clearTimeout(this._timeoutId);
        this.setState({ workItem: newWorkItem });
    }

    private _onBodyDragOver = (event: DragEvent): void => {
        if (!this._isValidDraggable(event)) {
            return;
        }

        // IE11 dragleave behaves inconsistently.
        // This timeout should only fire when the user has left the screen.
        if (this._overlayTimeout) {
            clearTimeout(this._overlayTimeout);
        }
        this._overlayTimeout = setTimeout(() => {
            this._hide();
        }, 200);
    }

    private _onBodyDragEnter = (event: DragEvent): void => {
        if (!this._isValidDraggable(event)) {
            return;
        }

        this._dragCount++;

        this._show();
    }

    private _onBodyDragLeave = (event: DragEvent): void => {
        if (!this._isValidDraggable(event)) {
            return;
        }

        this._dragCount--;

        // _dragCount === 0 means the mouse left the window
        if (this._dragCount === 0) {
            this._hide();
        }
    }

    private _show = (): void => {
        this.setState({
            isHidden: false
        });
    }

    private _hide = (): void => {
        this.setState({
            isHidden: true
        });
    }

    private _processFiles = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        const files = e.dataTransfer.files;
        this._hide();
        this._dragCount = 0;
        this._showProgressNotification();
        WITFileHelper.uploadFiles(files, this.state.workItem)
            .then(this._showSuccessNotification, this._rejectNotification);
    }

    private _removeNotification = () => {
        this.props.form.clearNotification();
    }

    private _rejectNotification = () => {
        this._timeoutId = this._async.setTimeout(this._removeNotification, 1);
    }

    private _showProgressNotification = () => {
        this.props.form.showNotification(WorkItemTrackingResources.AttachmentUploadProgressNotification);
    }

    private _showSuccessNotification = () => {
        this.props.form.showNotification(WorkItemTrackingResources.AttachmentUploadSuccessNotification);
        this._timeoutId = this._async.setTimeout(this._removeNotification, 2000);
    }

    private _onDragEnter = (event: React.DragEvent<HTMLDivElement>): void => {
        if (!this._isValidDraggable(event)) {
            return;
        }

        event.preventDefault();

        this.setState({
            isFocused: true
        });
    }

    // In order to allow drop, both "dragenter" and "dragover" events must call preventDefault
    // Check out https://developer.mozilla.org/en-US/docs/Web/API/HTML_Drag_and_Drop_API/Drag_operations#droptargets
    private _onDragOver = (event: React.DragEvent<HTMLDivElement>): void => {
        event.preventDefault();
    }

    private _onDragLeave = (): void => {
        this.setState({
            isFocused: false
        });
    }

    public render() {
        if (this.state.isHidden) {
            return null;
        }

        return (
            <div className="focused-background absolute-fill drop-target-overlay">
                <div className={css("drop-target-component", this.state.isFocused && "target-focus")}
                    onDragEnter={this._onDragEnter}
                    onDragOver={this._onDragOver}
                    onDragLeave={this._onDragLeave}
                    onDrop={this._processFiles} >
                    <div className="drop-target-component-icon">
                        <Icon iconName="Upload" />
                        <h2>{WorkItemTrackingResources.AttachmentDropMessageHeader}</h2>
                        {WorkItemTrackingResources.AttachmentDropMessage}
                    </div>
                </div>
            </div>
        );
    }
}
