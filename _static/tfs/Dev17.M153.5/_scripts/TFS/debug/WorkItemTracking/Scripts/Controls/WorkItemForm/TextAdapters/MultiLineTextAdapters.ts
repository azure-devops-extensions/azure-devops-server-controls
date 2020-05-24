import RichEditor = require("VSS/Controls/RichEditor");
import Controls = require("VSS/Controls");
import ServerConstants = require("Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants");
import VSS = require("VSS/VSS");
import Events_Services = require("VSS/Events/Services");
import TFS_Core_Ajax = require("Presentation/Scripts/TFS/TFS.Legacy.Ajax");
import Utils_Core = require("VSS/Utils/Core");
import FeatureAvailability_Services = require("VSS/FeatureAvailability/Services");
import FormEvents = require("WorkItemTracking/Scripts/Form/Events");
import Q = require("q");
import { WorkItemRichTextHelper } from "WorkItemTracking/Scripts/Utils/WorkItemRichTextHelper";
import { KeyboardShortcuts } from "WorkItemTracking/Scripts/WorkItemFormShortcutGroup";
import { WorkItem } from "WorkItemTracking/Scripts/TFS.WorkItemTracking";
import { WorkItemControlEditState } from "WorkItemTracking/Scripts/Controls/WorkItemForm/WorkItemControl";

const eventSvc = Events_Services.getService();

export interface IHtmlFieldTextAdapter {
    invalidate();

    setValue(value: string, editState?: WorkItemControlEditState);
    getValue(): string;

    setEnabled(enabled: boolean);
    setInvalid(isInvalid: boolean);

    setUploadAttachmentApiLoc(location: string);
    setWorkItem(workItem: WorkItem);

    selectText(collapseToEnd?: boolean);
    setFullScreen?(fullScreen?: boolean);

    focus();
    clear();

    flushChanges();

    dispose();
    show();
    hide();
}

export interface IMultilineTextAdapterOptions {
    controlId: string;
    change: () => void;
    customCommandGroups: RichEditor.IRichEditorCommandGroup[];
    height: number | string;
    ariaLabel: string;
    disableViewPortScaling: boolean;
    enableSingleClickImageOpen: boolean;
    noToolbar: boolean;
    fullScreen: boolean;
    showChromeBorder?: boolean;
    emptyText: string;
    externalLinkMode?: RichEditor.RichEditorExternalLinkMode;
}

// Class is exported for unit testing only, should not be used directly.
export class MultilineTextAdapter extends Controls.BaseControl {
    private _initialBrowserValue: any;
    private _initialSetValue: any;
    private _valueHasBeenSet: boolean = false;

    protected _control: any;

    constructor(options?: IMultilineTextAdapterOptions) {
        super(options);
    }

    public _getControlValue(): any {
        /// <returns type="any" />
    }

    public _setControlValue(value) {
        // noop
    }

    public _controlReady(): boolean {
        /// <returns type="any" />
        return true;
    }

    public getControl() {
        return this._control;
    }

    public getValue() {
        const controlValue = this._getControlValue();
        // Compare to initial value to determine if value has really changed
        if (this._initialBrowserValue && this._initialBrowserValue === controlValue) {
            return this._initialSetValue;
        }
        return controlValue;
    }

    public setValue(value) {
        this._setControlValue(value);

        if (!this._valueHasBeenSet) {
            this._valueHasBeenSet = true;
            this._initialBrowserValue = this._getControlValue();

            // Save initial values if browser changed it
            if (this._initialBrowserValue !== value) {
                this._initialSetValue = value;
            } else {
                this._initialBrowserValue = null;
            }
        }
    }

    public clear() {
        this.setValue("");
        this._resetValueSynchronization();
    }

    public invalidate() {
        // For some controls, browsers change the value (e.g., reformat HTML content) after it's set. When the field
        // is invalidated, we resynchronize the value so that we take the browser modified value as new baseline.
        this._resetValueSynchronization();
    }

    public setUploadAttachmentApiLoc(apiLocation: string) {
        // NoOp as a default scenario.  Extending classes can implement
    }

    public setWorkItem() {
        // No-op for legacy control
    }

    public focus() {
        // noop
    }

    public _resetValueSynchronization() {
        this._valueHasBeenSet = false;
        this._initialBrowserValue = null;
        this._initialSetValue = null;
    }

    public _dispose() {
        if (this._control && $.isFunction(this._control.dispose)) {
            this._control.dispose();
            this._control = null;
        }

        super._dispose();
    }
}

export class HtmlControlAdapter extends MultilineTextAdapter implements IHtmlFieldTextAdapter {
    public static CONTROLHEIGHT_NOCONTENT: number = 60;
    public static CONTROLHEIGHT_HASCONTENT: number = 200;

    protected _control: RichEditor.RichEditor;
    private _controlHeight: number;
    private _controlPromise: Q.Promise<void>;
    private _shouldToggleControlHeight: boolean;
    private _hideRichEditor: boolean;

    constructor(options?: IMultilineTextAdapterOptions) {

        // Handling the height input before initializing when new form is used:
        // 1. If user inputs no height, sets height to default which is 200
        // 2. If user inputs lower than minimal (60), sets height to 60
        let controlHeight: number;
        const shouldToggleControlHeight = !options.fullScreen
            && FeatureAvailability_Services.FeatureAvailabilityService.isFeatureEnabled(ServerConstants.FeatureAvailabilityFlags.WorkItemTrackingNewFormToggleHtmlControlHeight);

        if (shouldToggleControlHeight && options) {
            const inputHeight = typeof options.height === "number" ? options.height : parseInt(options.height || "", 10);
            controlHeight = inputHeight || HtmlControlAdapter.CONTROLHEIGHT_HASCONTENT;

            if (controlHeight < HtmlControlAdapter.CONTROLHEIGHT_NOCONTENT) {
                controlHeight = HtmlControlAdapter.CONTROLHEIGHT_NOCONTENT;
            }

            // Control will be initialized with minimal height and it will expand when content changes
            options.height = HtmlControlAdapter.CONTROLHEIGHT_NOCONTENT;
        }

        if (options.fullScreen) {
            options.height = "100%";
        }

        super(options);

        this._controlHeight = controlHeight || HtmlControlAdapter.CONTROLHEIGHT_HASCONTENT;
        this._shouldToggleControlHeight = shouldToggleControlHeight;
    }

    public initialize() {
        super.initialize();
    }

    /**
     *  Initialize the rich editor and invoke the callback when ready.
     *  The callback will be called synchronously if possible
     */
    private _initializeRichEditor(callback: () => void): Q.Promise<void> {

        if (this._hideRichEditor) {
            return Q.reject(VSS.ErrorHandler.ignoreRejectedPromiseTag);
        }

        const executeCallback = (): void => {
            if (this._control && !this._control.isDisposed() && !this.isDisposed()) {
                callback.call(this, this._control);
            }
        };

        if (this._controlReady() && (!this._controlPromise || !this._controlPromise.isPending())) {
            // If we are already initialize just call the callback synchronously
            // To be consistent with existing behavior
            // However, if we have pending promises wait for them to finish
            executeCallback();
            if (!this._controlPromise) {
                this._controlPromise = Q<void>(null);
            }
            return this._controlPromise;
        } else if (!this._controlPromise) {
            const deferred = Q.defer<void>();
            this._controlPromise = deferred.promise;

            // Lazily create the control
            Utils_Core.delay(this, 0, () => {
                this._createHtmlControl();
                // NOTE: This second delay should not be needed but it is working
                //       around a weird rendering issue in Chrome where it loads partial HTML and then a fraction of time
                //       later will render the rest. This delay seems to resolve that.
                Utils_Core.delay(this, 0, () => {
                    this._control ? this._control.ready(() => {
                        deferred.resolve(null);
                    }) : deferred.resolve(null);
                });
            });
        }
        // If we fall to here we need to hook the callback up to the creation of the control and its
        // ready state to ensure it is called when ready
        this._controlPromise = this._controlPromise.then(executeCallback);
        return this._controlPromise;
    }

    private _createHtmlControl() {

        // Don't create control if it already is created
        if (this._control) {
            return;
        }

        const controlOptions: RichEditor.IRichEditorOptions = {
            ...this._options,
            altKeyShortcuts: KeyboardShortcuts.AltShortcuts,
            ctrlKeyShortcuts: KeyboardShortcuts.CtrlShortcuts,
            fireOnEveryChange: true,
            pageHtml: WorkItemRichTextHelper.getPageHtml(null, this._options.disableViewPortScaling),
            height: "100%",
            change: this._options.change,
            id: this._options.controlId,
            internal: true,
            locale: VSS.uiCulture,
            waterMark: this._options.emptyText
        };

        if (this._shouldToggleControlHeight) {
            controlOptions.focusIn = () => this._toggleHeight();
            controlOptions.focusOut = () => this._toggleHeight();
        }
        this._control = Controls.BaseControl.createIn(RichEditor.RichEditor, this._element, controlOptions) as RichEditor.RichEditor;
    }

    private _toggleHeight(): void {

        const $element = this.getElement();

        // No op when control height is less or equal than minimal
        if ($element && this._controlHeight > HtmlControlAdapter.CONTROLHEIGHT_NOCONTENT) {
            if (!this._hasFocus() && !this.getValue()) {
                $element.height(HtmlControlAdapter.CONTROLHEIGHT_NOCONTENT);
            } else {
                $element.height(this._controlHeight);
            }

            eventSvc.fire(FormEvents.FormEvents.ControlResizedEvent());
        }
    }

    private _hasFocus(): boolean {
        if (this._control && $.isFunction(this._control.hasFocus)) {
            return this._control.hasFocus();
        }
        return false;
    }

    public focus(): Q.Promise<void> {
        return this._initializeRichEditor(() => {
            this._control.focus();
        });
    }

    public _getControlValue(): string {
        return this._control ? this._control.getValue() : null;
    }

    public show() {
        if (this._control) {
            this._control.showElement();
        }
    }

    public hide() {
        if (this._control) {
            this._control.hideElement();
        }

        this.getElement().height(0);
    }

    public _setControlValue(value) {
        // This should only ever be called after we ensure the control is initialized
        this._control.setValue(value);
    }

    public setValue(value: string, editState?: WorkItemControlEditState): Q.Promise<void> {
        const that = this;
        const baseSetValue = super.setValue;

        if (value === "" && editState === WorkItemControlEditState.WorkItemReadOnly) {
            this.hide();
            this._hideRichEditor = true;
            return Q.resolve();
        }
        else {
            this._hideRichEditor = false;
            return this._initializeRichEditor(() => {
                this.show();
                baseSetValue.call(that, value);

                if (this._shouldToggleControlHeight) {
                    this._toggleHeight();
                }
            });
        }
    }

    public _controlReady(): boolean {
        /// <returns type="boolean" />

        // In IE when setting edit mode the document body is null
        // We need to wait until it it is initialized
        return this._control && this._control.isReady();
    }

    public setEnabled(enabled: boolean) {
        this._initializeRichEditor(() => {
            this._control.setEnabled(enabled);
        });
    }

    public setUploadAttachmentApiLoc(apiLocation: string) {
        /// <summary> OVERRIDE: this is defined on the MultiLineTextAdapter</summary>
        this._initializeRichEditor(() => {
            this._control.setUploadAttachmentHandler((attachment: RichEditor.RichEditorAttachmentRequestData) => {
                const deferred = $.Deferred<RichEditor.RichEditorAttachmentOperationResult>();
                TFS_Core_Ajax.postMSJSON(apiLocation, attachment, deferred.resolve, deferred.reject);
                return deferred.promise();
            });
        });
    }

    public setInvalid(value: boolean) {
        this._initializeRichEditor(() => {
            this._control.setInvalid(value, false);
        });
    }

    public selectText(collapseToEnd?: boolean) {
        // We're in HtmlControlAdapter.selectText
        this._initializeRichEditor(() => {
            this._control.selectText(collapseToEnd); // RichEditor.selectText
        });
    }

    public flushChanges() {
        this._initializeRichEditor(() => {
            // The WIT form depends on our CHANGE event to know when it's necessary to re-read our value.
            // Our underlying control, though, does not fire its CHANGE event synchronously after every user input.
            // So, when we are notified that the form is about to save, we need to call _control.checkModified() to
            //  force the control to immediately fire any pending CHANGE events.

            this._control.checkModified();
        });
    }
}

VSS.initClassPrototype(HtmlControlAdapter, {
});

export class PlainTextControlAdapter extends MultilineTextAdapter implements IHtmlFieldTextAdapter {
    private static DEFAULT_HEIGHT: number = 250;

    protected _control: JQuery;

    constructor(options?) {
        super(options);
    }

    public initialize() {
        super.initialize();

        this._control = $("<textarea class='plaintextcontrol' />")
            .height(this._options.height || PlainTextControlAdapter.DEFAULT_HEIGHT)
            .appendTo(this._element);

        if (this._options.emptyText) {
            this._control.attr("placeholder", this._options.emptyText);
        }

        this._bind(this._control, "input", (e?: JQueryEventObject) => this._onChange(e));
    }

    public _getControlValue(): any {
        return this._control.val();
    }

    public _setControlValue(value) {
        this._control.val(value);
    }

    public setEnabled(enabled: boolean) {
        if (enabled) {
            this._control.removeAttr("readonly");
        } else {
            this._control.attr("readonly", "readonly");
        }
    }

    public setInvalid(isInvalid: boolean) {
        this._control.toggleClass("invalid", isInvalid);
    }

    private _onChange(e?: JQueryEventObject) {
        this._fireChange();
    }

    public focus() {
        this._control.focus(); // JQuery Focus
    }

    public selectText(collapseToEnd?: boolean) {
        // Not supported in this implementation, default to a noop.
    }

    public flushChanges() {
        // noop
    }

    public show() {
        if (this._control) {
            this._control.show();
        }
    }

    public hide() {
        if (this._control) {
            this._control.hide();
        }

        this.getElement().height(0);
    }
}
