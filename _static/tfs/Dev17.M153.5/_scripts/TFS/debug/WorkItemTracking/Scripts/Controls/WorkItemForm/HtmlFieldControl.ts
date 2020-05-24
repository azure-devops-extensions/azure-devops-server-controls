import Controls = require("VSS/Controls");
import Diag = require("VSS/Diag");
import VSS = require("VSS/VSS");
import Utils_Core = require("VSS/Utils/Core");
import WITConstants = require("Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants");
import WITOM = require("WorkItemTracking/Scripts/TFS.WorkItemTracking");
import { IRichEditorOptions, RichEditorExternalLinkMode } from "VSS/Controls/RichEditor";
import { WorkItemRichText } from "WorkItemTracking/Scripts/Utils/WorkItemRichText";
import { MaximizableWorkItemControl } from "WorkItemTracking/Scripts/Controls/WorkItemForm/MaximizableWorkItemControl";
import { IHtmlFieldTextAdapter, PlainTextControlAdapter, HtmlControlAdapter, IMultilineTextAdapterOptions } from "WorkItemTracking/Scripts/Controls/WorkItemForm/TextAdapters/MultiLineTextAdapters";
import { WorkItemChangeType, PageSizes } from "WorkItemTracking/Scripts/OM/WorkItemConstants";
import { WorkItemControlEditState } from "WorkItemTracking/Scripts/Controls/WorkItemForm/WorkItemControl";
import * as Resources from "WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking";
import StringUtils = require("VSS/Utils/String");
import { RichTextAdapter } from "WorkItemTracking/Scripts/Controls/WorkItemForm/TextAdapters/RichTextAdapter";
import { isNewHtmlEditorEnabled } from "WorkItemTracking/Scripts/Utils/WitControlMode";

const delegate = Utils_Core.delegate;

interface ISize {
    width: number;
    height: number;
}

function parseSize(sizeDefinition: string): ISize {
    /// <summary>Parse a size from a string representation in the format "width,height"</summary>
    /// <param name="sizeDefinition" type="string">String containing size definition in format (width,height)</param>
    /// <returns type="ISize">Parsed size definition or null if the input string cannot be parsed to a valid size</returns>

    Diag.Debug.assertParamIsStringNotEmpty(sizeDefinition, "sizeDefinition");

    var values = Utils_Core.parseIntArray(sizeDefinition);
    if (!values || values.length != 2) {
        return null;
    }

    return {
        width: values[0],
        height: values[1]
    };
}

export class HtmlFieldControl extends MaximizableWorkItemControl {
    private static DEFAULT_SIZE: ISize = { width: 200, height: 250 };
    private static MINIMUM_SIZE: ISize = { width: 200, height: 50 };

    private _controlAdapter: IHtmlFieldTextAdapter;
    private _noValueReadOnlyLabel: JQuery;
    private _onWorkItemChangedDelegate: any;

    constructor(container, options?, workItemType?: WITOM.WorkItemType) {
        super(container, options, workItemType);
        this._onWorkItemChangedDelegate = delegate(this, this._onWorkItemChanged);
    }

    public invalidate(flushing) {
        const fieldValue = this._getFieldTextValue();
        const inputState: WorkItemControlEditState = this.getEditState();

        if (!flushing) {
            super.invalidate(flushing);
            this._controlAdapter.setValue(fieldValue, this.getEditState());
            this._controlAdapter.setEnabled(!this.isReadOnly());
            this._controlAdapter.invalidate();
            this._updateImageUploadLocation();

            if (fieldValue === "" && inputState === WorkItemControlEditState.WorkItemReadOnly) {
                this._controlAdapter.hide();
                if (!this._noValueReadOnlyLabel) {
                    this._noValueReadOnlyLabel = $("<label class=\"zero-data-read-only-label\"></label>").text(StringUtils.format(Resources.NoValueForMultiLineControl, this._options.groupLabel || this._getField().fieldDefinition.name));
                    this._container.append(this._noValueReadOnlyLabel);
                }
            } else {
                if (this._noValueReadOnlyLabel) {
                    this._noValueReadOnlyLabel.remove();
                    this._noValueReadOnlyLabel = null;
                }

            }

        }

        this._controlAdapter.setInvalid(!this.getFieldIsValid());
    }

    public _init() {
        super._init();

        const fieldType = this._getFieldType();

        let size = HtmlFieldControl.DEFAULT_SIZE;
        if (this._options.minimumSize) {
            size = parseSize(this._options.minimumSize) || size;
        }

        const options: IMultilineTextAdapterOptions = {
            controlId: this._options.controlId,
            change: () => { this.flush() },
            customCommandGroups: WorkItemRichText.getCustomCommandGroups(this),
            height: Math.max(HtmlFieldControl.MINIMUM_SIZE.height, size.height),
            ariaLabel: this._options.ariaLabel,
            disableViewPortScaling: this._options.fullScreen,
            enableSingleClickImageOpen: this._options.fullScreen,
            noToolbar: this._options.fullScreen,
            fullScreen: this._options.fullScreen,
            emptyText: this._options.emptyText,
            showChromeBorder: this._options.chromeBorder
        };

        if (this._options.height) {
            options.height = this._options.height;
        }

        if (this._options.fullScreen) {
            this._container.addClass("fullscreen");
        }

        if (fieldType === WITConstants.FieldType.Html || fieldType === WITConstants.FieldType.History) {
            if (this._options.fullScreen) {
                options.externalLinkMode = RichEditorExternalLinkMode.SingleClick;
            }

            if (!isNewHtmlEditorEnabled()) {
                this._controlAdapter = <HtmlControlAdapter>Controls.BaseControl.createIn(HtmlControlAdapter, this._container, options);
            } else {
                this._container.addClass("html-editor-container");
                this._controlAdapter = new RichTextAdapter(this._container[0], options);

                this._windowResizeEventHandler = (ev: JQueryEventObject) => {
                    // ignore window resize, only handle custom modal resize event
                    if (!$.isWindow(ev.target)) {
                        const richTextAdapter = this._controlAdapter as RichTextAdapter;
                        richTextAdapter.refreshCommandBar();
                    }
                };
                $(window).resize(this._windowResizeEventHandler);
            }
        } else {
            this._controlAdapter = <PlainTextControlAdapter>Controls.BaseControl.createIn(PlainTextControlAdapter, this._container, options);
        }

    }

    public _createMaximizedWorkItemControl($target: JQuery, options: any, workItemType: WITOM.WorkItemType) {
        options.height = "100%";
        return new HtmlFieldControl($target, options, workItemType);
    }

    public _onMaximized() {
        if (this._controlAdapter.setFullScreen) {
            this._controlAdapter.setFullScreen(true);
        }
        this._controlAdapter.selectText(true);
    }

    public _onRestored() {
        if (this._controlAdapter.setFullScreen) {
            this._controlAdapter.setFullScreen(false);
        }
        this._controlAdapter.selectText(true);
    }

    public maximizeInPlace(top: number): void {
        if (!isNewHtmlEditorEnabled()) {
            super.maximizeInPlace(top);
            return;
        }
        if (this._controlAdapter && this._controlAdapter.setFullScreen) {
            this._controlAdapter.setFullScreen(true);
        }
    }

    public restoreInPlace() {
        if (!isNewHtmlEditorEnabled()) {
            super.restoreInPlace();
            return;
        }
        if (this._controlAdapter && this._controlAdapter.setFullScreen) {
            this._controlAdapter.setFullScreen(false);
        }
    }

    public _getControlValue(): any {
        /// <returns type="any" />

        return this._controlAdapter.getValue();
    }

    public bind(workItem: WITOM.WorkItem, disabled?: boolean) {
        super.bind(workItem, disabled);

        if (this._workItem) {
            this._workItem.attachWorkItemChanged(this._onWorkItemChangedDelegate);
        }
    }

    public unbind(isDisposing?: boolean) {
        if (this._workItem) {
            this._workItem.detachWorkItemChanged(this._onWorkItemChangedDelegate);
        }

        if (!this.suppressInvalidate) {
            this._controlAdapter.flushChanges();
        }

        this._controlAdapter.setInvalid(false);

        super.unbind(isDisposing);
    }

    public focus() {
        this._controlAdapter.focus();
    }

    public clear() {
        this._controlAdapter.clear();
    }

    public flush(element?: any, preventFire?: boolean) {
        ///<param name="element" type="any" optional="true" />
        ///<param name="preventFire" type="boolean" optional="true" />
        if (this._controlAdapter instanceof PlainTextControlAdapter) {
            super.flush();
            return;
        }
        else {
            this._smartFlush(element, preventFire);
        }
    }

    public getFieldIsValid(): boolean {
        var field: WITOM.Field = this._getField();

        if (field) {
            return field.isValid();
        }

        // Default to valid if the control is not bound to a work item at this time.
        return true;
    }

    public dispose() {
        if (this._controlAdapter) {
            this._windowResizeEventHandler && $(window).off("resize", this._windowResizeEventHandler);
            this._controlAdapter.dispose();
            this._controlAdapter = null;
        }

        super.dispose();
    }

    public _onBeforeRestore() {
        if (this._controlAdapter) {
            this._controlAdapter.flushChanges();
        }

        super._onBeforeRestore();
    }

    private _windowResizeEventHandler: (ev: JQueryEventObject) => void;

    private _onWorkItemChanged(workitem: WITOM.WorkItem, eventData: WITOM.IWorkItemChangedArgs) {
        if (eventData && eventData.change === WorkItemChangeType.PreSave && this._controlAdapter) {
            this._controlAdapter.flushChanges();
        } else if (eventData && eventData.change === WorkItemChangeType.FieldChange && this._controlAdapter && eventData.changedFields[WITConstants.CoreField.AreaId]) {
            // If the areaId has changed update the url so we get the right permission check
            this._updateImageUploadLocation();
        }
    }

    private _updateImageUploadLocation(): void {
        if (isNewHtmlEditorEnabled()) {
            this._controlAdapter.setWorkItem(this._workItem);
            return;
        }

        this._controlAdapter.setUploadAttachmentApiLoc(WorkItemRichText.getUploadAttachmentApiLocation(this));
    }
}

VSS.initClassPrototype(HtmlFieldControl, {
    _controlAdapter: null
});
