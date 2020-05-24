import * as Controls from "VSS/Controls";
import * as EditableGrid from "VSS/Controls/EditableGrid";
import * as Identities_Picker from "VSS/Identities/Picker/Controls";
import * as Identities_Picker_RestClient from "VSS/Identities/Picker/RestClient";
import * as Identities_Services from "VSS/Identities/Picker/Services";
import * as Utils_Core from "VSS/Utils/Core";
import * as Utils_UI from "VSS/Utils/UI";

export abstract class CommonIdentityPickerCellEditor extends EditableGrid.CellEditor {

    public static INPUT_CHANGED_EVENT: string = "identity-picker-input_changed";
    protected _identityPickerControl: Identities_Picker.IdentityPickerSearchControl;
    private _rootDiv: JQuery;
    protected getScope() { return null };
    protected getPreDropdownRender: (entityList: Identities_Picker_RestClient.IEntity[]) => Identities_Picker_RestClient.IEntity[] = null;
    protected getCustomTooltip: () => string = null;

    public initialize() {
        super.initialize();
        this._resetPosition();
    }

    public getIdentityPickerControl() {
        return this._identityPickerControl;
    }

    private _getPrevDisplayName(value: string) {
        if (value) {
            var index = value.indexOf("<");
            if (index > 1) {
                value = value.substring(0, index - 1);
            }
        }

        return value;
    }

    public createIn(container) {
        super.createIn(container);
        var operationScope: Identities_Services.IOperationScope = {
            IMS: true
        };
        var identityType: Identities_Services.IEntityType = {
            User: true
        };

        this._rootDiv = $("<div>").addClass("common-identity-picker-cell-editor").appendTo(this._element).css("position", "fixed");
        this._identityPickerControl = Controls.create(Identities_Picker.IdentityPickerSearchControl, this._rootDiv, <Identities_Picker.IIdentityPickerSearchOptions>{
            container: this._rootDiv,
            operationScope: operationScope,
            identityType: identityType,
            multiIdentitySearch: false,
            showContactCard: false,
            showMruTriangle: false,
            consumerId: this.getIdentityPickerConsumerId(),
            callbacks: {
                onInputBlur: () => {
                    var currentInput = this._identityPickerControl.getElement().children().val();
                    var previousInput = this._getPrevDisplayName(this._prevValue);
                    if (currentInput !== previousInput) {
                        this._prevValue = "";
                        this._fire(CommonIdentityPickerCellEditor.INPUT_CHANGED_EVENT, null);
                    }
                },
                preDropdownRender: this.getPreDropdownRender,
                getCustomTooltip: this.getCustomTooltip
            },
            getFilterByScope: () => this.getScope()
        });
        this._resetPosition();
    }

    public setSize($cellContext: JQuery) {
        this._rootDiv.width($cellContext.outerWidth() - 1);
        this._rootDiv.height($cellContext.outerHeight());
    }

    public setPosition(top: number, left: number) {
        this._rootDiv.css({ top: top, left: left, position: "absolute" });
        super.setPosition(top, left);
    }

    public getHeight() {
        return this._rootDiv.outerHeight();
    }

    public _resetPosition() {
        if (this._identityPickerControl) {
            this._rootDiv.css({ top: 0, left: -100000, position: "fixed" });
            super._resetPosition();
        }
    }

    public getValue(): string {
        var result = this._identityPickerControl.getIdentitySearchResult();
        if (result && result.resolvedEntities && result.resolvedEntities.length > 0) {
            var signInAddress = result.resolvedEntities[0].signInAddress;
            var displayName = result.resolvedEntities[0].displayName
            var uniqueName = displayName + " <" + signInAddress + ">";
            return uniqueName;
        }
        else {
            return this._prevValue;
        }
    }

    public getDisplayValue(): string {
        var result = this._identityPickerControl.getIdentitySearchResult();
        if (result && result.resolvedEntities && result.resolvedEntities.length > 0) {
            return result.resolvedEntities[0].displayName;
        }
        else {
            var displayValue = this._getPrevDisplayName(this._prevValue);
            return displayValue;
        }
    }

    public setValue(value: string, doNotSavePrevious?: boolean) {
        this._prevValue = value;

        this._identityPickerControl.getElement().children().val(this._getPrevDisplayName(value));
        this.focus();
    }

    public clearValue(setEmpty?: boolean) {
        this._identityPickerControl.clear();
        this._prevValue = "";
    }

    public _attachEvents() {
        this._bind(this._identityPickerControl.getElement(), "keydown ", (e: JQueryEventObject) => {
            if (e.type === "keydown") {
                Utils_Core.delay(this, 100, () => {
                    this._handleKeydown(e);
                });
            }
            else {
                this._fireChangedIfNeeded();
                this.fireEndEdit();
            }

        });
    }

    public _detachEvents() {
        this._unbind(this._identityPickerControl.getElement(), "keydown");
    }

    public focus() {
        this._identityPickerControl.getElement().children().on("focus", function (e) {
            $(this).select();
        });

        this._identityPickerControl.getElement().children().on("mouseup", function (e) {
            return e.preventDefault();
        });

        Utils_UI.tryFocus(this._identityPickerControl.getElement().children(), 20);
    }

    public _createElement() {
        super._createElement();
        super._decorateElement();
    }

    protected abstract getIdentityPickerConsumerId(): string;
}
