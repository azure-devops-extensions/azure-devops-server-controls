import * as VSS from "VSS/VSS";
import { delay } from "VSS/Utils/Core";
import { delegate } from "VSS/Utils/Core";
import { WorkItemControl, IWorkItemControlOptions } from "WorkItemTracking/Scripts/Controls/WorkItemForm/WorkItemControl";
import { IContainedFieldControl } from "WorkItemTracking/Scripts/Controls/WorkItemForm/Interfaces";
import { TextWorkItemControl } from "WorkItemTracking/Scripts/Controls/WorkItemForm/TextWorkItemControl";
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import WorkItemTrackingResources = require("WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking");
import IdentityPicker = require("VSS/Identities/Picker/Controls");
import WITOM = require("WorkItemTracking/Scripts/TFS.WorkItemTracking");
import WITConstants = require("Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants");
import WITHelpers = require("WorkItemTracking/Scripts/TFS.WorkItemTracking.Helpers");
import ServerConstants = require("Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants");
import FeatureAvailability_Services = require("VSS/FeatureAvailability/Services");
import Identities_RestClient = require("VSS/Identities/Picker/RestClient");
import Events_Services = require("VSS/Events/Services");
import Controls = require("VSS/Controls");
import { WitIdentityImages } from "WorkItemTracking/Scripts/Utils/WitIdentityImages";
import { FullScreenEvents } from "WorkItemTracking/Scripts/Utils/Events";
import { WorkItemStateControl } from "WorkItemTracking/Scripts/Controls/WorkItemForm/WorkItemStateControl";
import { WITIdentityHelpers } from "TfsCommon/Scripts/WITIdentityHelpers";
import { IWorkItemTypeExtension } from "WorkItemTracking/Scripts/OM/WorkItemInterfaces";
import { RichContentTooltip } from "VSS/Controls/PopupContent";

import * as Resources_Platform from "VSS/Resources/VSS.Resources.Platform";
import * as React from "react";
import * as ReactDOM from "react-dom";
import { Toggle, IToggleProps } from "OfficeFabric/Toggle";
import { createWorkItemIdentityRefFromEntity } from "WorkItemTracking/Scripts/Utils/WorkItemIdentityHelper";

const eventSvc = Events_Services.getService();

class CheckboxControl implements IContainedFieldControl {
    private static CHECKBOX_CLASSNAME = "toggle-control";
    private _workItemControl: FieldControl;
    private _control: JQuery;
    private _checked: boolean;

    constructor(workItemControl: FieldControl) {
        this._workItemControl = workItemControl;
        this._control = $("<div/>").appendTo(this._workItemControl._container);
        // default option for rendering
        this._render(false, true);
    }

    public invalidate(flushing: boolean, field: WITOM.Field) {
        const checked = field.getValue();
        const disabled = this._workItemControl.isReadOnly();
        this._render(checked, disabled);
    }

    public getValue() {
        return this._checked;
    }

    public setValue(value: boolean, disabled?: boolean) {
        this._render(value, !!disabled);
    }

    public clear() {
        this._checked = false;
    }

    private _onChanged(checked: boolean) {
        this._workItemControl._getField().setValue(checked);
    }

    private _render(checked: boolean, disabled: boolean) {
        const toggleProps: IToggleProps & React.ClassAttributes<Toggle> = {
            className: CheckboxControl.CHECKBOX_CLASSNAME,
            checked: checked,
            disabled: disabled,
            onChanged: delegate(this, this._onChanged),
            onText: WorkItemTrackingResources.BooleanFieldTrueValue,
            offText: WorkItemTrackingResources.BooleanFieldFalseValue,
        };
        ReactDOM.render(
            React.createElement<IToggleProps>(
                Toggle,
                toggleProps),
            this._control[0]);
        this._checked = checked;
    }

    public setInvalid(invalid: boolean) {
        // Not implemented, control handles this.
    }

    public setEnabled(enabled: boolean) {
        // Not implemented, control handles this.
    }

    public setAdditionalValues(allowedValues: string[]): void {
        // Not implemented for checkbox.
    }

    public onBind(workItem: WITOM.WorkItem): void {
        // Not implemented for checkbox controls.
    }

    public onUnbind(): void {
        // Not implemented for checkbox controls.
    }

    public onResize(): void {
        // Not implemented for checkbox controls.
    }
}

VSS.initClassPrototype(CheckboxControl, {
    _workItemControl: null,
    _control: null
});

class CommonIdentityWorkItemControl implements IContainedFieldControl {

    private _workItemControl: WorkItemControl;
    private _control: IdentityPicker.IdentityPickerSearchControl;
    private _inputText: JQuery;
    private _flushing: boolean = false;
    private _nonIdentityValues: string[];
    private _dontLayer: boolean;
    private _fullScreen: boolean;
    private _isInvalid: boolean;
    private _isEnabled: boolean;

    constructor(workItemControl: WorkItemControl, fullScreen?: boolean, readonly allowEmpty?: boolean, dontLayer?: boolean) {
        this._workItemControl = workItemControl;
        this._nonIdentityValues = [];
        this._dontLayer = dontLayer;
        this._fullScreen = fullScreen;
        this._isInvalid = null;
        this._isEnabled = null;

        var getAllowedNonIdentityValues = () => {
            return this._nonIdentityValues;
        }

        workItemControl._container.addClass("identity-picker-container");

        var dropdownContainer: (container?: JQuery) => JQuery;

        if (this._fullScreen || this._dontLayer) {
            dropdownContainer = (container?: JQuery) => {
                return this._workItemControl._container;
            };
        }

        var commonIdentityPickerOptions: IdentityPicker.IIdentityPickerSearchOptions = WITHelpers.WITIdentityControlHelpers.setupCommonIdentityPickerOptions(false,
            true,
            FeatureAvailability_Services.FeatureAvailabilityService.isFeatureEnabled(ServerConstants.FeatureAvailabilityFlags.WorkItemTrackingAADSupport),
            getAllowedNonIdentityValues,
            (item: Identities_RestClient.IEntity) => {
                // add the entity to the work item identity cache
                createWorkItemIdentityRefFromEntity(item);

                // On select, set the field value and fire eager validation
                workItemControl.flush(true);
                if (this._fullScreen) {
                    // If we are fullscreen then close the full screen view.
                    delay(null, 450, () => eventSvc.fire(FullScreenEvents.EXIT_FULL_SCREEN));
                }
            },
            () => {
                return this._control.getDropdownPrefix();
            },
            () => this._workItemControl._getField() && this._workItemControl._getField().filterByScope
        );

        $.extend(commonIdentityPickerOptions, {
            ariaLabel: workItemControl._options.ariaLabel,
            elementId: workItemControl._options.controlId + "_txt",
            placeholderText: workItemControl._options.emptyText,
            dropdownContainer: dropdownContainer,
            consumerId: WITHelpers.WITIdentityControlHelpers.IdentityPickerConsumerId,
            forceOpen: this._fullScreen,
            showMruTriangle: !this._fullScreen,
            showContactCard: !this._fullScreen,
            useRemainingSpace: this._fullScreen,
            smallScreenRender: this._fullScreen,
            pageSize: this._fullScreen ? 40 : undefined,
            size: this._fullScreen ? IdentityPicker.IdentityPickerControlSize.Large : undefined,
            watermark: IdentityPicker.EntityFactory.createStringEntity(WorkItemTrackingResources.AssignedToEmptyText, WitIdentityImages.UnassignedImageUrl)
        });
        $.extend(commonIdentityPickerOptions.callbacks, {
            onInputBlur: () => {
                if (!this._fullScreen && this._inputText.val()) {
                    // On input blur, set the field value from current text and fire eager validation
                    workItemControl.flush(true);
                }

                workItemControl._container.removeClass("focus");
            },
        });

        this._control = <IdentityPicker.IdentityPickerSearchControl>Controls.BaseControl.createIn(IdentityPicker.IdentityPickerSearchControl, workItemControl._container, commonIdentityPickerOptions);

        this._inputText = this._control.getElement().find("input");

        workItemControl._container.focus(() => {
            if (this._isEnabled) {
                workItemControl._container.addClass("focus");
            }
        })

        // Using keyup instead of input to overcome IE11 issues
        this._inputText.on("keyup", () => {
            if (!this._inputText.val()) {
                workItemControl.flush(true);
            }
        });

        if (this._fullScreen) {
            this._control._bind(IdentityPicker.IdentityPickerSearchControl.RESOLVED_INPUT_REMOVED_EVENT, () => {
                // Handle clearing the input.  Have to wait though since this gets fired before the input text
                // is reset.
                Utils_Core.delay(null, 0, () => {
                    // Only handle the case where the input is cleared, otherwise we will try to set
                    // a non-resolved string value as the field value which we do not want to handle.
                    var currentText = this.getValue();
                    if (!currentText) {
                        workItemControl.flush(false);
                    }
                });
            });

            this._control.focusOnSearchInput();
        }
    }

    public dispose() {
        if (this._control) {
            this._control.dispose();
            this._control = null;
        }
    }

    public invalidate(flushing, field) {
        const witControl = this._workItemControl;
        let readOnly: boolean;
        this._flushing = true;

        if (field) {
            const invalid = this.allowEmpty ? !field.isValidValueOrEmpty() : !field.isValid();
            if (!flushing) {
                readOnly = witControl.isReadOnly();

                const value = witControl._getFieldTextValue(field);

                this.setValue(value);
                this.setInvalid(invalid);
                this.setEnabled(!readOnly);
                if (!readOnly) {
                    const field = this._workItemControl && this._workItemControl._getField();
                    const placeholder = field && field.filterByScope && field.filterByScope.excludeGroups ?
                        Resources_Platform.IdentityPicker_PlaceholderTextUser
                        : Resources_Platform.IdentityPicker_PlaceholderTextUserGroup;
                    $("input", this._control.getElement()).attr({ "placeholder": placeholder, "aria-label": placeholder });
                }
            } else {
                this.setInvalid(invalid);
            }
        }
        else {
            this.clear();
            this.setEnabled(false);
        }
        this._flushing = false;
    }

    public getValue(): string {
        const searchResult = this._control.getIdentitySearchResult();
        const resolvedEntities = searchResult.resolvedEntities;
        const unresolvedEntities = searchResult.unresolvedQueryTokens;

        if (resolvedEntities && resolvedEntities.length === 1) {
            return WITIdentityHelpers.getUniquefiedIdentityName(resolvedEntities[0]);
        }
        else if (unresolvedEntities && unresolvedEntities.length === 1) {
            return unresolvedEntities[0];
        }
        else {
            return this._inputText.val();
        }
    }

    public setAdditionalValues(values: string[]) {
        this._nonIdentityValues = values;
    }

    public setValue(value: string) {
        if (value) {
            const entity = WITIdentityHelpers.parseUniquefiedIdentityName(value);
            const entityIdentifier = WITIdentityHelpers.getEntityIdentifier(entity);

            // only set the value if its not equal to the current value of the control
            if (!Utils_String.equals(value, this.getValue(), true)) {
                // clear the value before setting a new value to avoid any inconsistent data in the control
                this.clear();

                if (entityIdentifier) {
                    this._control.setEntities([], [entityIdentifier]);
                }
                else {
                    // If the value is a non identity string - we cant ask the control to resolve it
                    // So we pass the value as a dummy string entity object
                    this._control.setEntities([entity], []);
                }
            }
        }
        else {
            this.clear();
        }
    }

    public clear() {
        // On unbind workitem object will be undefined, at this stage we have to call controls.clear to clear any resolved value.
        // Checking for pending requests since getValue will return an empty string while it's resolving the request, and we want
        // the full clear to run if there is a pending request.
        if (this._workItemControl._workItem
            && this.getValue() === ""
            && !this._control.hasPendingRequests()) {
            // If scoped identity is enabled, we want to update the tooltip with the latest scope information.
            const field = this._workItemControl._getField();
            if (field && field.filterByScope) {
                const tooltip = WITHelpers.WITIdentityControlHelpers.getCustomTooltip(field.filterByScope);
                RichContentTooltip.add(tooltip, this._control.getElement().find(".identity-picker-resolved"));
            }
            return;
        }

        this._control.clear();
    }

    public onResize(): void {
        // Not implemented for this controls.
    }

    public setInvalid(invalid: boolean) {
        if (this._isInvalid === invalid) {
            return;
        }

        this._isInvalid = invalid;
        this._workItemControl._container.toggleClass("invalid", invalid);;
    }

    public setEnabled(enabled: boolean) {
        if (this._isEnabled === enabled) {
            return;
        }

        this._isEnabled = enabled;
        if (enabled) {
            this._control.disableReadOnlyMode();
            this._workItemControl._container.removeClass("readonly");
            this._workItemControl._container.find(".identity-picker-search-box").removeClass("readonly");
        }
        else {
            this._control.enableReadOnlyMode();
            this._workItemControl._container.addClass("readonly");
            this._workItemControl._container.find(".identity-picker-search-box").addClass("readonly");
        }
    }

    public onBind(workItem: WITOM.WorkItem): void {
        // Not implemented for identity controls.
    }

    public onUnbind(): void {
        // Not implemented for identity controls.
    }
}

export interface IFieldControlOptions extends IWorkItemControlOptions {
    allowEmpty?: boolean;
    comboCssClass?: string;
    dontLayer?: boolean;
}

export class FieldControl extends WorkItemControl {
    public _options: IFieldControlOptions;
    private _control: IContainedFieldControl;
    private _controlType: string;
    private _setInvalidDelegate: () => void;
    private _setValidDelegate: () => void;

    constructor(container: JQuery, options?: IFieldControlOptions, workItemType?: WITOM.WorkItemType, extensions?: IWorkItemTypeExtension[]) {
        super(container, options, workItemType, extensions);
    }

    public _init() {
        super._init();
        var field = this.getFieldDefinition(this._fieldName);

        this._setInvalidDelegate = () => {
            this._setInvalid(true);
        };
        this._setValidDelegate = () => {
            this._setInvalid(false);
        };

        if (this._fieldName && this._workItemType && (field.type === WITConstants.FieldType.Boolean)) {
            this._control = new CheckboxControl(this);
            this._controlType = "CheckboxControl";
        }
        else if (WITOM.isIdentityPickerSupportedForField(field) && this._workItemType.project) {
            this._control = new CommonIdentityWorkItemControl(this, this._options.fullScreen, this._options.allowEmpty, this._options.dontLayer);
            this._controlType = "CommonIdentityWorkItemControl";
        }
        else if (field.referenceName === WITConstants.CoreFieldRefNames.State) {
            this._control = new WorkItemStateControl(
                this,
                {
                    allowEmpty: this._options.allowEmpty
                },
                {
                    cssClass: this._options.comboCssClass,
                    fullScreen: this._options.fullScreen
                });
            this._controlType = "WorkItemStateControl";
        }
        else {
            this._control = new TextWorkItemControl(
                this,
                {
                    allowEmpty: this._options.allowEmpty
                },
                {
                    // Title doesn't have a "for" label. We need to add ariaLabel for it to satisfy accessibility requirements. 
                    // Other fields don't need it because "for" label takes care of the label requirement for them.
                    ariaLabel: (field.referenceName === WITConstants.CoreFieldRefNames.Title) ? (this._options.ariaLabel || field.name || "") : "",
                    cssClass: this._options.comboCssClass,
                    fullScreen: this._options.fullScreen
                });
                this._controlType = "TextWorkItemControl";
        }
    }

    public dispose() {
        super.dispose();

        if (this._control && this._control.dispose) {
            this._control.dispose();
        }
        this._control = null;
    }

    public invalidate(flushing) {
        super.invalidate(flushing);
        this._control.invalidate(flushing, this._getField());
    }

    public getControlType(): string {
        return this._controlType;
    }

    public _getControlValue(): any {
        return this._control.getValue();
    }

    public clear() {
        this._control.clear();
    }

    protected onControlResized() {
        this._control.onResize();
    }

    public bind(workItem: WITOM.WorkItem, disabled?: boolean) {
        super.bind(workItem, disabled);
        if (workItem) {
            let fieldDef = this.getFieldDefinition(this._fieldName);

            var error = workItem.getError();
            if (this._fieldName) {
                workItem.attachEvent("field-error:" + this._fieldName, this._setInvalidDelegate);
            }
            workItem.attachEvent(WITOM.WorkItem.FIELD_ERRORS_CLEARED, this._setValidDelegate);

            if (error && error.fieldReferenceName && Utils_String.localeIgnoreCaseComparer(this._fieldName, error.fieldReferenceName) === 0) {
                this._setInvalid(true);
            }
            else {
                this._setInvalid(false);
            }

            // For the special case of not showing the identity picker
            // for identity fields, we don't need to get the non-identity
            // allowed values, and we don't need to do this in read only mode.
            const field = this._getField();
            if (!workItem.isReadOnly() && WITOM.isIdentityPickerSupportedForField(fieldDef) && !(field && field.filterByScope)) {
                var project = workItem.workItemType.project;

                workItem.store.beginGetAllowedValues(fieldDef.id, project.guid, workItem.workItemType.name, (allowedValues: string[]) => {
                    if (this._workItem && workItem.id === this._workItem.id) {
                        this._control.setAdditionalValues(allowedValues);
                    }
                });
            }

            this._control.onBind(workItem);
        }
    }

    public unbind(isDisposing?: boolean) {
        if (this._workItem) {
            if (this._fieldName) {
                this._workItem.detachEvent("field-error:" + this._fieldName, this._setInvalidDelegate);
            }
            this._workItem.detachEvent(WITOM.WorkItem.FIELD_ERRORS_CLEARED, this._setValidDelegate);

            this._control.onUnbind();
        }

        super.unbind(isDisposing);
    }

    public shouldClearOnUnbind(): boolean {
        return this._control instanceof CommonIdentityWorkItemControl;
    }

    private _setInvalid(invalid: boolean) {
        var field = this._getField();
        if (field.isValid()) { // field invalidity exceeds WIT invalidity
            this._control.setInvalid(invalid);
        }
    }
}

VSS.initClassPrototype(FieldControl, {
    _control: null,
    _setInvalidDelegate: null,
    _setValidDelegate: null,
});