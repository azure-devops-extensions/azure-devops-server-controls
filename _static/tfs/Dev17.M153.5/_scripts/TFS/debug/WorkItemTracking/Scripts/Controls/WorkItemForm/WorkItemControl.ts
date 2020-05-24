import WITOM = require("WorkItemTracking/Scripts/TFS.WorkItemTracking");
import Utils_Core = require("VSS/Utils/Core");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import Utils_UI = require("VSS/Utils/UI");
import Utils_String = require("VSS/Utils/String");
import FormModels = require("WorkItemTracking/Scripts/Form/Models");
import Events = require("WorkItemTracking/Scripts/Form/Events");
import Events_Services = require("VSS/Events/Services");
import { IWorkItemTypeExtension } from "WorkItemTracking/Scripts/OM/WorkItemInterfaces";
import { WorkItemLabel } from "WorkItemTracking/Scripts/Controls/WorkItemForm/LabelControl";
import FormRendererHelpers = require("WorkItemTracking/Scripts/Utils/FormRendererHelpers");
import { RichContentTooltip } from "VSS/Controls/PopupContent";
import WorkItemTrackingResources = require("WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking");
import { WIFormCIDataHelper } from "WorkItemTracking/Scripts/Utils/WIFormCIDataHelper";
import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import { FeatureAvailabilityFlags } from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";

import Q = require("q");

let eventSvc = Events_Services.getService();
let delegate = Utils_Core.delegate;

export enum WorkItemControlEditState {
    Editable,
    RulesBasedReadOnly,
    ControlBasedReadOnly,
    WorkItemReadOnly
}

export interface ILabelData {
    link?: {
        params: ILabelParam[]
    };
    label?: JQuery;
    content?: string;
}

export interface ILabelParam {
    value: string;
    original?: any;
}

//
// Many of these options have been grandfathered in. Please think twice before adding any other properties here, in almost all cases
// you should derive an interface from IWorkItemControlOptions to specify additional options.
//
export interface IWorkItemControlOptions {
    /** Type of control, defaults to "FieldControl" */
    controlType?: string;
    controlId?: string;
    controlCss?: string;

    /** Reference name of field to bind control to */
    fieldName?: string;
    refName?: string;
    readOnly?: string;

    groupLabel?: string;

    label?: string;
    labelCss?: string;

    ariaLabel?: string;
    labelPosition?: string;
    hideLabel?: boolean;
    labelData?: ILabelData[];

    emptyText?: string;

    autoFitFormHeight?: boolean;

    /** If height is specified in XML */
    height?: number;

    // Options for specific controls
    linkColumns?: any;
    showUnsetImage?: boolean;

    contributionId?: string;

    isMaximized?: boolean;

    /** indicates whether or not the control is hosted in the 'FullScreenView' container */
    fullScreen?: boolean;

    // Properties used for the old work item form
    workItemLabel?: WorkItemLabel;
    instanceName?: string;
    dock?: any;
    padding?: any;
    margin?: any;
    minimumSize?: any;
    numberFormat?: any;
    format?: any;
    maxLength?: any;
    customFormat?: any;
    labelFontSize?: any;
    controlFontSize?: any;
    outputLayout?: any;
    limit?: any;
    commentHeight?: any;

    /** If set, the field and label will be hidden if the field is empty */
    hideWhenReadOnlyAndEmpty?: boolean;

    /**
     * Minimal control height.
     * This is used to calculate control height when autoFitFormHeight option set to true.
     */
    minHeight?: number;

    /**
     * Always show chrome border on input (when applicable)
     * This is ultimately read from user profile preference
     */
    chromeBorder?: boolean;

    /**
     * Determines whether read-only icon is hidden for this control
     */
    isReadOnlyIconHidden?: boolean;
}

export abstract class WorkItemControl {
    private static readonly DEFAULT_CONTROL_HEIGHT: number = 100;

    private _onFieldChangedDelegate: IEventHandler;
    private _controlContainer: JQuery;
    private _readOnlyContainer: JQuery;
    private _readOnlyToolTip: RichContentTooltip;

    public _options: IWorkItemControlOptions;
    public _readOnly: boolean;
    public _flushing: boolean;
    public _workItemType: WITOM.WorkItemType;
    public _extensions: IWorkItemTypeExtension[];
    public _workItem: WITOM.WorkItem;
    public _fieldName: string;
    public _fieldEvents: (string | number)[];
    public _workItemLabel: WorkItemLabel;
    public _container: JQuery;
    public suppressInvalidate: boolean;
    private _isFieldValueChanged: boolean; // Used to publish telemetry

    constructor(container: JQuery, options?: IWorkItemControlOptions, workItemType?: WITOM.WorkItemType, extensions?: IWorkItemTypeExtension[]) {
        if (this["constructor"] === WorkItemControl) {
            throw new Error("You cannot instantiate an abstract type.");
        }

        this._container = container;
        this._controlContainer = container.parents(".control:first");
        this._options = { ...options };
        this._workItemType = workItemType;
        this._extensions = extensions || [];

        this._readOnly = this._options.readOnly === "True";
        this._fieldName = this._options.fieldName;

        if (this._options.workItemLabel) {
            this._workItemLabel = this._options.workItemLabel;
        }

        if (this._options.minHeight === undefined) {
            this._options.minHeight = WorkItemControl.DEFAULT_CONTROL_HEIGHT;
        }

        // For old form, we read hide readonly settings from xml and store in layout data. 
        // hideWhenReadOnlyAndEmpty is always true for new form.
        let formOptions = container.parents(".witform-layout:first").data("wit-options");
        if (formOptions && !this._options.hideWhenReadOnlyAndEmpty) {
            this._options.hideWhenReadOnlyAndEmpty = formOptions.hideReadOnlyEmptyFields;
        }

        this._onFieldChangedDelegate = delegate(this, this._onFieldChanged);

        this._init();

        // Capturing the focus event to publish telemetry for each field changed by the user
        this._container.focusout(() => {
            if (this._isFieldValueChanged && this._workItem) {
                WIFormCIDataHelper.fieldValueChanged(this._workItem.sessionId, this._fieldName, this._options.controlType);
            }

            this._isFieldValueChanged = false;
        });
    }

    public getControlId(): string {
        return this._options.controlId;
    }

    public getControlType(): string {
        return this._options.controlType;
    }

    public _getFieldType() {
        let fieldDefinition = null;
        if (this._fieldName && this._workItemType) {
            fieldDefinition = this._workItemType.getFieldDefinition(this._fieldName);
            if (fieldDefinition) {
                return fieldDefinition.type;
            }
        }
        return 0;
    }

    public getFieldDefinition(fieldReferenceOrId: string | number) {
        const key = ("" + fieldReferenceOrId).toUpperCase();
        let fieldDefinition = this._workItemType.getFieldDefinition(fieldReferenceOrId);
        if (!fieldDefinition) {
            fieldDefinition = this.getExtensionField(fieldReferenceOrId);
        }

        return fieldDefinition;
    }

    public getExtensionField(fieldReferenceOrId: string | number) {
        const key = ("" + fieldReferenceOrId).toUpperCase();
        let result = null;
        for (let i = 0; i < this._extensions.length && !result; i++) {
            const extension = this._extensions[i];
            extension.fields.forEach((fieldDefinition) => {
                if (fieldDefinition.field.referenceName.toUpperCase() === key) {
                    result = fieldDefinition;
                    return false;
                }
            });
        }

        return result;
    }

    public _getField(): WITOM.Field {
        let result = null;
        if (this._fieldName && this._workItem) {
            result = this._workItem.getField(this._fieldName);
        }
        return result;
    }

    public _getFieldTextValue(field?: WITOM.Field) {
        field = field || this._getField();

        if (field) {
            return field.getDisplayText();
        }

        return "";
    }

    public isReadOnly(): boolean {
        return this.getEditState() !== WorkItemControlEditState.Editable;
    }

    public getEditState(): WorkItemControlEditState {
        let field;

        // this is if the control is set to be readonly through rest apis for form controls
        if (this._readOnly) {
            return WorkItemControlEditState.ControlBasedReadOnly;
        }

        // this is if the work item is readonly
        if (!this._workItem || this._workItem.isReadOnly()) {
            return WorkItemControlEditState.WorkItemReadOnly;
        }

        // this is if a rule is making this field readonly
        field = this._getField();
        if (field && field.isReadOnly()) {
            return WorkItemControlEditState.RulesBasedReadOnly;
        }

        return WorkItemControlEditState.Editable;
    }

    public _init() {
        if (this._fieldName) {
            this._fieldEvents = [this._fieldName];
        }

        this._container.keydown(delegate(this, this._onKeyDownHandler));
    }

    public _onFieldChanged(workitem: WITOM.WorkItem, field: WITOM.Field) {
        if (!this.suppressInvalidate) {
            this.invalidate(this._flushing);
        }

        this._isFieldValueChanged = true;
    }

    /**
     * Binds a workitem to the control
     *
     * @param workItem The work item object to bind to
     * @param disabled If true, disable the control, else revert to original readOnly setting. 
     *   This value is being passed from the WorkItemView class to disable the whole form
     */
    public bind(workItem: WITOM.WorkItem, disabled?: boolean) {
        this.cleanUp();

        if (this._workItemLabel) {
            this._workItemLabel.bind(workItem);
        }

        if (disabled) {
            // if disabled is true, set the control as readonly
            this._readOnly = true;
        }
        else {
            // if disabled is false or undefined, restore the original readonly setting for the control
            this._readOnly = this._options.readOnly === "True";
        }

        this._workItem = workItem;

        if (this._fieldEvents) {
            for (const fieldEvent of this._fieldEvents) {
                workItem.attachFieldChange(fieldEvent, this._onFieldChangedDelegate);
            }
        }

        this.invalidate(false);
    }

    public unbind(isDisposing?: boolean) {
        if (this._workItemLabel) {
            this._workItemLabel.unbind();
        }

        this.cleanUp();
        if (!isDisposing && this.shouldClearOnUnbind()) {
            this.clear();
        }

    }

    public shouldClearOnUnbind(): boolean {
        return false;
    }

    public cleanUp() {
        if (this._workItem) {
            if (this._fieldEvents) {
                for (const fieldEvent of this._fieldEvents) {
                    this._workItem.detachFieldChange(fieldEvent, this._onFieldChangedDelegate);
                }
            }

            this._workItem = null;
        }
    }

    public invalidate(flushing: boolean) {
        const field = this._getField();

        // Only hide read only empty fields if it is enabled for the form.
        if (this._options.hideWhenReadOnlyAndEmpty) {
            // If there is a field, see if the control needs to be shown/hidden.
            if (field) {

                const isHidden: boolean = this._controlContainer.css("display") === "none";

                const controlVisibilityChangedArgs: Events.IControlVisibilityChangedArgs = {
                    controlElement: this._controlContainer,
                    isVisible: !isHidden
                };

                // Hide the field if it is read only and does not have a value.
                if (field.isReadOnly() && this.isEmpty()) {
                    if (!isHidden) {
                        this._controlContainer.hide();
                        eventSvc.fire(Events.FormEvents.ControlVisibilityChangedEvent(), controlVisibilityChangedArgs);
                    }
                }
                else {
                    if (isHidden) {
                        this._controlContainer.show();
                        eventSvc.fire(Events.FormEvents.ControlVisibilityChangedEvent(), controlVisibilityChangedArgs);
                    }
                }
            }
        }

        if (field) {
            if (this._workItemLabel) {
                this._workItemLabel.setFieldIsValid(field.isValid());
            }
            this._controlContainer.toggleClass("invalid", !field.isValid());
        }

        if (this._workItemLabel) {
            this._workItemLabel.invalidate();
        }

        // Resets readOnlyContainer to null if field is changed to non read-only.
        if (!this.isReadOnly() && this._readOnlyContainer) {
            this._readOnlyContainer.remove();
            this._readOnlyContainer = null;
            if (this._readOnlyToolTip) {
                this._readOnlyToolTip.dispose();
            }
        }

        // Creates read-only icon and tool tip only if it does not already exist.
        if (!this._readOnlyContainer
            && (this.getEditState() === WorkItemControlEditState.RulesBasedReadOnly || this.getEditState() === WorkItemControlEditState.ControlBasedReadOnly)
            && !FormRendererHelpers.isReadOnlyFieldIconHidden(this._options.controlType) && !this.isReadOnlyIconHidden()) {
            this._createReadOnlyIconAndTooltip();
        }
    }

    public flush(fireIdentityEagerValidation: boolean = false) {
        if (!this.isReadOnly()) {
            let field = this._getField();
            if (field) {
                try {
                    this._flushing = true;
                    field.setValue(this._getControlValue(), false, fireIdentityEagerValidation);
                }
                finally {
                    this._flushing = false;
                }
            }
        }
    }

    public flushSetText(valueToSet: string, fireIdentityEagerValidation: boolean = false) {
        if (!this.isReadOnly()) {
            const field = this._getField();
            if (field) {
                try {
                    this._flushing = true;
                    const val = (valueToSet !== null && valueToSet !== undefined) ? valueToSet : this._getControlValue();
                    field.setValue(val, false, fireIdentityEagerValidation);
                }
                finally {
                    this._flushing = false;
                }
            }
        }
    }

    public _getControlValue(): any {
        return null;
    }

    public clear() {
    }

    public getTfsContext(): TFS_Host_TfsContext.TfsContext {
        let tfsContext: TFS_Host_TfsContext.TfsContext = null;

        if (this._workItem) {
            tfsContext = this._workItem.store.getTfsContext();
        } else if (this._workItemType) {
            tfsContext = this._workItemType.store.getTfsContext();
        } else {
            tfsContext = TFS_Host_TfsContext.TfsContext.getDefault();
        }

        return tfsContext;
    }

    public dispose() {
    }

    /**
     *   Gets available space for control
     */
    public getAvailableSpaceImmediate(): FormModels.IAvailableDrawSpace {
        const groupContainer = this._container.closest(".grid-group");
        const formContainer = this._container.closest(".form-grid");

        if (!groupContainer.length || !formContainer.length) {
            return {
                width: this._container.width(),
                height: this._container.height()
            };
        }

        // Adjust for padding
        const groupVerticalPadding = groupContainer.innerHeight() - groupContainer.height() + 1;

        const groupContent = groupContainer.find(".tfs-collapsible-content");
        const headerOffset = groupContent.position().top;
        const isMaximized = groupContainer.hasClass("maximized-grid-group");

        if (isMaximized) {
            return {
                width: groupContainer.width(),
                height: groupContainer.height() - headerOffset - groupVerticalPadding
            };
        }

        if (this._options.autoFitFormHeight) {
            // Use minimal height if it is available.
            // This is to make sure the control render content properly on a small window size.
            // See #980954 for more details
            let availableHeight = formContainer.height() - headerOffset - groupVerticalPadding;
            if (this._options.minHeight && availableHeight < this._options.minHeight) {
                availableHeight = this._options.minHeight;
            }
            return {
                width: groupContainer.width(),
                height: availableHeight
            };
        }

        return {
            width: this._container.width(),
            height: this._container.height() - groupVerticalPadding
        };
    }

    /** Gets available space for control */
    public getAvailableSpace(): IPromise<FormModels.IAvailableDrawSpace> {
        return Q.delay(1).then<FormModels.IAvailableDrawSpace>(() => this.getAvailableSpaceImmediate());
    }

    public onResize(): void {
        this.onControlResized();
    }

    protected onControlResized() {
    }

    protected isEmpty(): boolean {
        const field = this._getField();

        if (field) {
            const fieldValue = field.getValue();
            return fieldValue === undefined || fieldValue === null || fieldValue === "";
        }

        return false;
    }

    protected isReadOnlyIconHidden() {
        return this._options.isReadOnlyIconHidden;
    }

    private _onKeyDownHandler(event: JQueryEventObject) {
        // For readonly fields, we need to eat the backspace key, otherwise it will invoke a "back" on the browser
        if (event.keyCode === Utils_UI.KeyCode.BACKSPACE && this.isReadOnly()) {
            return false;
        }
    }

    /** Sets the icon and tooltip for read-only fields */
    private _createReadOnlyIconAndTooltip() {
        this._readOnlyContainer = $("<div>")
            .disableSelection().addClass("read-only-field-icon")
            .attr({
                "unselectable": "on",
                "aria-hidden": "true"
            })
            .prependTo(this._container);
        $("<span>").addClass("bowtie-icon bowtie-security-lock read-only-icon-span").attr("unselectable", "on")
            .appendTo(this._readOnlyContainer);
        this._readOnlyToolTip = RichContentTooltip.add(Utils_String.format(WorkItemTrackingResources.WorkItemControlReadOnly, this.getFieldDefinition(this._fieldName).name), this._readOnlyContainer, { useMousePosition: true });
    }
}
