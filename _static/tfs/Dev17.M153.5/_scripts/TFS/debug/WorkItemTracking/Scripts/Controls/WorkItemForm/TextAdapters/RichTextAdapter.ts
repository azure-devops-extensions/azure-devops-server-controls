import * as React from "react";
import * as ReactDOM from "react-dom";
import { format } from "VSS/Utils/String";
import { WorkItemControlEditState } from "WorkItemTracking/Scripts/Controls/WorkItemForm/WorkItemControl";
import { IHtmlFieldTextAdapter, IMultilineTextAdapterOptions } from "WorkItemTracking/Scripts/Controls/WorkItemForm/TextAdapters/MultiLineTextAdapters";
import { ITelemetryContext, HtmlEditor, IHtmlEditorProps } from "WorkItemTracking/Scripts/Components/HtmlEditor";
import { ImageUploader } from "WorkItemTracking/Scripts/Utils/ImageUploader";
import * as Resources from "WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking";
import { WorkItem } from "WorkItemTracking/Scripts/TFS.WorkItemTracking";

const TelemetryContext: ITelemetryContext = { controlName: "RichTextAdapter" };

export class RichTextAdapter implements IHtmlFieldTextAdapter {
    protected _control: HtmlEditor;
    private _imageUploader: ImageUploader;

    constructor(private _containerElement: HTMLElement, private _options: IMultilineTextAdapterOptions) {
        this._imageUploader = new ImageUploader();
        this._createHtmlControl();
    }

    public setValue(value: string, editState?: WorkItemControlEditState): void {
        if (value === "" && editState === WorkItemControlEditState.WorkItemReadOnly) {
            this.hide();
        } else if (this._control) {
            this._control.setContent(value);
        }
    }

    public getValue(): string {
        return this._control ? this._control.htmlContent : null;
    }

    public setEnabled(enabled: boolean): void {
        if (this._control) {
            this._control.setEnabled(enabled);
        }
    }

    public setInvalid(value: boolean): void {
        // Not implemented
    }

    public setUploadAttachmentApiLoc(location: string): void {
        // Not implemented
    }

    public setWorkItem(workItem: WorkItem): void {
        this._imageUploader.setWorkItem(workItem);
    }

    public selectText(): void {
        if (this._control) {
            this._control.selectAll();
        }
    }

    public focus(): void {
        if (this._control) {
            this._control.focus();
        }
    }

    public setFullScreen(fullScreen?: boolean): void {
        if (this._control) {
            this._control.setFullScreen(fullScreen);
        }
    }

    public clear(): void {
        if (this._control) {
            this._control.setContent("");
        }
    }

    public flushChanges(): void {
        // The WIT form depends on our CHANGE event to know when it's necessary to re-read our value.
        // Our underlying control, though, does not fire its CHANGE event synchronously after every user input.
        // So, when we are notified that the form is about to save, we need to call _control.checkModified() to
        //  force the control to immediately fire any pending CHANGE events.
        if (this._control) {
            this._control.flushChanges();
        }
    }

    public dispose(): void {
        if (this._control) {
            ReactDOM.unmountComponentAtNode(this._containerElement);
            this._control = null;
        }
    }

    public show(): void {
        if (this._control) {
            this._control.setVisible(true);
        }
    }

    public hide(): void {
        if (this._control) {
            this._control.setVisible(false);
        }
    }

    /**
     * Placeholder for legacy contract, DO NOT USE
     */
    public invalidate(): void {
        // Not implemented
    }

    public refreshCommandBar(): void {
        if (this._control) {
            this._control.refreshCommandBar();
        }
    }

    private _createHtmlControl(): void {
        const { ariaLabel, showChromeBorder } = this._options;
        const placeholder = ariaLabel ? format(Resources.HtmlFieldPlaceholder, ariaLabel) : "";
        ReactDOM.render(
            React.createElement(HtmlEditor, {
                htmlContent: "",
                ref: ref => (this._control = ref),
                onChange: this._onChange,
                uploadImageHandler: this._imageUploader.upload.bind(this._imageUploader),
                helpText: placeholder,
                placeholder,
                telemetryContext: TelemetryContext,
                showChromeBorder,
                ariaLabel,
                forceDelayLoad: true
            } as IHtmlEditorProps),
            this._containerElement
        );
    }

    private _onChange = (): void => {
        this._options.change();
    };
}
