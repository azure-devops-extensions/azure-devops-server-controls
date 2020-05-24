import * as React from "react";
import * as ReactDOM from "react-dom";
import * as VSS_RichEditor_NOREQUIRE from "VSS/Controls/RichEditor";
import { DiscussionEditor, IDiscussionEditorProps } from "WorkItemTracking/Scripts/Components/DiscussionEditor";
import { IDiscussionEditorControl } from "WorkItemTracking/Scripts/Controls/WorkItemForm/DiscussionEditorInterfaces";
import { IDiscussionEditorControlOptions } from "WorkItemTracking/Scripts/Controls/WorkItemForm/TFS.Social.Discussion";
import { WorkItem } from "WorkItemTracking/Scripts/TFS.WorkItemTracking";
import { ImageUploader } from "WorkItemTracking/Scripts/Utils/ImageUploader";

export class DiscussionRichEditorControl implements IDiscussionEditorControl {
    private _control: DiscussionEditor;
    private _imageUploader: ImageUploader;

    constructor(private _container: HTMLElement, private _options: IDiscussionEditorControlOptions) {
        this._imageUploader = new ImageUploader();
        this._createDiscussionEditor();
    }

    public getMessageEntryControl(): DiscussionEditor {
        return this._control;
    }

    public isVisible(): boolean {
        return this._control && this._control.isVisible();
    }

    public showElement(): void {
        if (this._control) {
            this._control.showElement();
        }
    }

    public hideElement(): void {
        if (this._control) {
            this._control.hideElement();
        }
    }

    public setUploadAttachmentApiLocation(apiLocation: string): void {
        // Not implemented
    }

    public setFullScreen(fullScreen: boolean): void {
        this._control && this._control.setFullScreen(fullScreen);
    }

    public setWorkItem(workItem: WorkItem): void {
        this._imageUploader.setWorkItem(workItem);
    }

    public refreshCommandBar(): void {
        this._control && this._control.refreshCommandBar();
    }

    public dispose(): void {
        if (this._control) {
            ReactDOM.unmountComponentAtNode(this._container);
            this._control = null;
        }
    }

    private _createDiscussionEditor(): void {
        const { messageEntryControlOptions = {} as VSS_RichEditor_NOREQUIRE.IRichEditorOptions } = this._options;
        ReactDOM.render(
            React.createElement(DiscussionEditor, {
                ref: ref => (this._control = ref),
                onChange: this._onChange,
                uploadImageHandler: this._imageUploader.upload.bind(this._imageUploader),
                currentIdentity: this._options.currentIdentity,
                placeholder: messageEntryControlOptions.waterMark,
                helpText: messageEntryControlOptions.helpText,
                ariaLabel: messageEntryControlOptions.ariaLabel
            } as IDiscussionEditorProps),
            this._container
        );
    }

    private _onChange = (): void => {
        const { messageEntryControlOptions } = this._options;
        if (messageEntryControlOptions && messageEntryControlOptions.change) {
            messageEntryControlOptions.change();
        }
    };
}
