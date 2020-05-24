import { Combo } from "VSS/Controls/Combos";
import Diag = require("VSS/Diag");
import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import { FieldsFilterControlOptions, FieldsFilterControl } from "WorkItemTracking/Scripts/Controls/Fields/FieldsFilterControl";
import { FieldType, CoreField } from "Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants";
import IdentityPicker = require("VSS/Identities/Picker/Controls");
import { IEntity } from "VSS/Identities/Picker/RestClient";
import MultiEditModel = require("WorkItemTracking/Scripts/Controls/Fields/Models/MultiFieldEditModel");
import Filters = require("VSS/Controls/Filters");
import { FeatureAvailabilityFlags } from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";
import VSS = require("VSS/VSS");
import WitHelpers = require("WorkItemTracking/Scripts/TFS.WorkItemTracking.Helpers");
import WitResources = require("WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking");
import { FieldDefinition } from "WorkItemTracking/Scripts/TFS.WorkItemTracking";
import { WiqlOperators, getLocalizedOperator } from "WorkItemTracking/Scripts/OM/WiqlOperators";
import Utils_String = require("VSS/Utils/String");
import { WITIdentityHelpers } from "TfsCommon/Scripts/WITIdentityHelpers";
import { FieldsFilterClassificationControl, IFieldsFilterClassificationControlOptions } from "WorkItemTracking/Scripts/Controls/Fields/FieldsFilterClassificationControl";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { INodeStructureType } from "Presentation/Scripts/TFS/FeatureRef/TFS.AgileCommon";

export interface IMultFieldEditDataProvider {
    /**
     * Returns a promise that will resolve to field definitions
     */
    getAllFields(): IPromise<FieldDefinition[]>;

    /**
     * Returns true if the field is editable
     */
    isEditable(field: FieldDefinition): boolean;

    /**
     * Returns a promise that resolves to allowed values of given field
     */
    getAllowedValues(field: FieldDefinition): IPromise<any[]>;
}

export interface MultiFieldEditControlOptions extends FieldsFilterControlOptions {
    /**
     * Data provider to retrive field and allowed values data
     */
    dataProvider: IMultFieldEditDataProvider;

    /**
     * *Optional* Allow host control to respond to all fields being loaded
     */
    afterFieldsLoaded?: (fields: FieldDefinition[]) => void;

    /**
     * Optional* Delegate fired on every change to MultiFIeldEditControl
     */
    onChange?: () => void;

    /**
     * *optional* Delegate fired on errors
     */
    onError?: (error: Error) => void;
}

export class MultiFieldEditControl extends FieldsFilterControl {

    public static enhancementTypeName: string = "tfs.presentation.MultiFieldEditControl";

    protected _model: MultiEditModel.MultiFieldEditModel;
    protected _dataProvider: IMultFieldEditDataProvider;
    protected _initPromise: IPromise<void>;

    // Cast for correct options
    public _options: MultiFieldEditControlOptions = this._options;

    constructor(options?: MultiFieldEditControlOptions) {
        super(options);
        Diag.Debug.assertIsNotNull(options, "Options should be passed in");
        this._dataProvider = options.dataProvider;
    }

    /**
     * Initilize the control
     */
    public initialize() {
        super.initialize();
        this._createModel();
        this._createClauseTable();
    }

    /**
     * Initialize the options for control.
     * @param options
     */
    public initializeOptions(options?: MultiFieldEditControlOptions) {
        super.initializeOptions($.extend({
            enableGrouping: false,
            hideLogicalOperator: true,
            hideOperatorHeader: true,
            coreCssClass: "multi-field-edit"
        }, options));
    }

    /**
     * Return current result state of the control
     */
    public getResults(): MultiEditModel.FieldChange[] {
        return this._model.getFieldChanges();
    }

    /**
     * Return the valid state of the control
     */
    public isValid(validateFieldValues: boolean): boolean {
        return this._model.isValid(validateFieldValues);
    }

    /**
     * Overrides the base class version to show DatePicker for DateTime fields.
     * @param valueControl The value control.
     * @param fieldType The type of the field.
     * @param values The values to be populated in the value control.
     */
    public _updateFieldValues(valueControl: any, fieldType: FieldType, values: any[]) {
        Diag.Debug.assertParamIsObject(valueControl, "valueControl");
        super._updateFieldValues(valueControl, fieldType, values, true);

        if (fieldType === FieldType.DateTime) {
            valueControl.setType("date-time");
            valueControl.setMode("drop");
        }
    }

    /**
     * Override FilterControl abstract method to get the default clause.
     */
    public _getDefaultClause(): Filters.IFilterClause {
        return { logicalOperator: "", fieldName: "", operator: "", value: "", index: 0 };
    }

    /**
     * Override as a no op, this control is not used
     * @param andOrControl
     * @param clause
     */
    public _updateAndOrControl(andOrControl, clause: Filters.IFilterClause) { /* no-op */ }

    /**
     * Implement FilterControl abstract method to update the field control.
     * @param fieldControl The field control to be updated.
     * @param clause The clause associated with the control.
     */
    public _updateFieldControl(fieldControl: Combo, clause: Filters.IFilterClause) {
        Diag.Debug.assertParamIsObject(fieldControl, "fieldControl");
        Diag.Debug.assertParamIsObject(clause, "clause");

        fieldControl.setText(clause.fieldName);

        // Update field options
        Diag.Debug.assertIsObject(this._model, "this._model");
        const remainingFields: string[] = this._model.getRemainingEditableFieldNames();
        // Handle race condition when this get executed the clause is gone
        if (fieldControl && fieldControl.isDisposed() !== true) {
            fieldControl.setSource(remainingFields);
        }
    }

    /**
     * Implement FilterControl abstract method to update the operator control.
     * Note: we always display '=' in plain text.
     * @param operatorControl The control to be updated.
     * @param clause The clause associated with the control.
     * @param updateClause True to update the clause with the new operator/value.
     */
    public _updateOperatorControl(operatorControl: any, clause: Filters.IFilterClause, updateClause?: boolean) {
        Diag.Debug.assertParamIsObject(operatorControl, "operatorControl");

        operatorControl.setSource(["="]);
        operatorControl.setText(["="]);
        operatorControl.setMode("text");
        operatorControl.setEnabled(false);
        operatorControl._element.addClass("multifieldedit-operator-control");

        // Because we don't actually disable the input element, it still gets the focus. However, in this
        // particular case, we want to skip focus for this element because there only a single value.
        operatorControl.getInput().attr("tabIndex", -1);
    }

    /**
     * Override: Implement FilterControl abstract method to update the value control.
     * @param valueControl The control to be updated.
     * @param clause The clause associated with the control.
     */
    public _updateValueControl(valueControl, clause: Filters.IFilterClause) {
        Diag.Debug.assertParamIsObject(valueControl, "valueControl");
        Diag.Debug.assertParamIsObject(clause, "clause");

        let allowedNonIdentityValues: string[];

        const getAllowedNonIdentityValues = () => {
            return allowedNonIdentityValues;
        };

        // If identity, set up MRU control
        const identityPickerSupported = this._isIdentityPickerSupported(clause);
        if (identityPickerSupported) {
            this._setupCommonIdentityControl(valueControl, clause, getAllowedNonIdentityValues);
        } else if (this._isReactClassificationPickerSupported(clause)) {
            const field: FieldDefinition = this._model.getField(clause.fieldName);

            valueControl.setControl(FieldsFilterClassificationControl, {
                inputAriaLabel: Utils_String.format(WitResources.FieldValueComboAriaLabel, clause && clause.fieldName ? clause.fieldName : ""),
                field: field,
                projectId: TfsContext.getDefault().navigation.projectId
            } as IFieldsFilterClassificationControlOptions);
            valueControl.setText(clause.value);
        } else {
            // Set up combobox for all other field types
            valueControl.setControl(Combo, { label: Utils_String.format(WitResources.FieldValueComboAriaLabel, clause && clause.fieldName ? clause.fieldName : "") });
            valueControl.setText(clause.value);
        }

        // No field name, value control should not be enabled
        if (!clause.fieldName) {
            valueControl.setEnabled(false);
        } else {
            valueControl.setEnabled(true);
            const control = valueControl.getControl();

            const field = this._model.getField(clause.fieldName);
            if (!field || !field.isEditable()) {
                // User has typed something that does not match a field
                return;
            }

            // Boolean fields' values are not dependent on work item type.
            if (field.type === FieldType.Boolean) {
                this._updateFieldValues(valueControl, field.type, ["True", "False"]);
            } else if (field.type === FieldType.DateTime) {
                // No allowed values for datetime fields
                this._updateFieldValues(valueControl, field.type, []);
            } else {
                const getFieldValuesWithMacros = (fieldDef: FieldDefinition, allowedValues: any[]): any[] => {
                    if (!allowedValues) {
                        allowedValues = [];
                    }
                    if (fieldDef.id === CoreField.IterationPath) {

                        // Add the current iteration macro only if there is a team context
                        if (TfsContext.getDefault().currentTeam) {
                            const currentIterationMacro = getLocalizedOperator(WiqlOperators.MacroCurrentIteration);
                            if (!allowedValues.some(x => Utils_String.equals(x.name, currentIterationMacro, true))) {
                                allowedValues.splice(0, 0, { id: 0, guid: currentIterationMacro, name: currentIterationMacro, children: [], structure: INodeStructureType.Project });
                            }
                        }
                    } else if (fieldDef.isIdentity) {
                        const meMacro = getLocalizedOperator(WiqlOperators.MacroMe);
                        if (!allowedValues.some(x => Utils_String.equals(x, meMacro, true))) {
                            allowedValues.push(getLocalizedOperator(WiqlOperators.MacroMe));
                        }
                        allowedNonIdentityValues = allowedValues;
                    }
                    return allowedValues;
                };

                // Check if the model has allowed values cached
                const allowedValues = this._model.getAllowedValues(field.name);
                if (allowedValues) {
                    if (allowedValues.length > 0) {
                        this._updateFieldValues(valueControl, field.type, getFieldValuesWithMacros(field, allowedValues));
                    }
                } else {
                    // Async retrieve allowed values
                    Diag.logTracePoint("MultiFieldEditControl._updateValueControl.async-pending");
                    this._dataProvider.getAllowedValues(field).then((values) => {
                        // Allowed values have been returned, set field values
                        if (control && !control._disposed && values.length > 0) {
                            this._updateFieldValues(valueControl, field.type, getFieldValuesWithMacros(field, values));
                        }
                        // save values to model for caching and validation
                        this._model.setAllowedValues(field.name, values);

                        Diag.logTracePoint("MultiFieldEditControl._updateValueControl.async-complete");
                    }, (error) => this._onError(error));
                }
            }
        }
    }

    /**
     * Gets value from clause. If identity resolve to string, otherwise return text value
     * @param valueControl
     * @param clause
     */
    public getClauseValue(valueControl: any, clause: Filters.IFilterClause): string {
        const field: FieldDefinition = this._model.getField(clause.fieldName);
        let retVal: string = "";

        // We must get value from identity control
        if (this._isIdentityPickerSupported(clause)) {
            const resolvedEntities: IEntity[] = valueControl.getControl().getIdentitySearchResult().resolvedEntities;
            const unresolvedEntities = valueControl.getControl().getIdentitySearchResult().unresolvedQueryTokens;

            // We have a resolved entity
            if (resolvedEntities && resolvedEntities.length === 1) {
                retVal = WITIdentityHelpers.getUniquefiedIdentityName(resolvedEntities[0]);
            } else {
                // The text did not resolve to an entity, send input text
                retVal = valueControl.getControl().getElement().find("input").val();
            }
        } else {
            // Get text for all other controls
            retVal = valueControl.getText();
        }
        return retVal;
    }

    /**
     * Override: Implement FilterControl abstract method to validate a clause. Fired on every change
     * @param clauseInfo The clause info
     */
    public _validateClause(clauseInfo: Filters.IFilterClauseInfo) {
        Diag.Debug.assertParamIsObject(clauseInfo, "clauseInfo");
        Diag.Debug.assertIsObject(this._model, "this._model");

        let isFieldValid = this._model.isFieldValid(clauseInfo.clause.fieldName),
            isValueValid = true,
            field = this._model.getField(clauseInfo.clause.fieldName);

        // We have a valid field and non empty input, check value
        if (isFieldValid) {
            if (!this._model.isFieldValueValid(clauseInfo.clause.fieldName, clauseInfo.clause.value)) {
                isValueValid = false;
            }
        }

        // Set control validity
        clauseInfo.fieldNameControl.setInvalid(!isFieldValid);
        clauseInfo.valueControl.setInvalid(!isValueValid);

        // Fire onChange option if passed in
        if ($.isFunction(this._options.onChange)) {
            this._options.onChange();
        }
    }

    /**
     * Override: Implement FilterControl abstract method to handle field name changed event.
     * @param clauseInfo The clause info.
     * @param oldValue The old field name.
     */
    public _handleFieldNameChanged(clauseInfo: Filters.IFilterClauseInfo, oldValue: string) {
        Diag.Debug.assertIsObject(clauseInfo.clause, "clauseInfo.clause");

        // field has changed, we need to reset the value accordingly
        clauseInfo.clause.value = "";

        this._updateValueControl(clauseInfo.valueControl, clauseInfo.clause);
    }

    /**
     * Override: Implement FilterControl abstract method to handle operator changed event.
     * Note: no-op for this control because the operator is of the type "text" and should never change.
     * @param clauseInfo The clause info.
     * @param oldValue The old operator name.
     */
    public _handleOperatorChanged(clauseInfo: Filters.IFilterClauseInfo, oldValue: string) { /* no-op */ }

    /**
     * Override: Implement FilterControl abstract method to set filter to be dirty.
     * Note: no-op for this control.
     */
    public _setDirty() { /* no-op */ }

    /**
     * Overrides base class version to show bulk-edit-specific string.
     */
    public _getAddNewClauseText(): string {
        return WitResources.MultiFieldAddNewField;
    }

    /**
     * Overrides base class version to show bulk-edit-specific string.
     */
    public _getInsertClauseTooltipText(): string {
        return WitResources.MultiFieldInsertNewFieldTooltip;
    }

    /**
     * Overrides base class version to show bulk-edit-specific string.
     */
    public _getRemoveClauseTooltipText(): string {
        return WitResources.MultiFieldRemoveFieldTooltip;
    }

    /**
     * Creates and populates model for the control
     */
    private _createModel(): void {
        this._model = new MultiEditModel.MultiFieldEditModel();

        // Set filter to get user changes before we have retrieved all fields
        this.setFilter(this._model.fields);

        // Retrieve all fields with data provider
        this._initPromise = this._dataProvider.getAllFields().then<void>((fields) => {
            this._model.setFields(fields, (field) => this._dataProvider.isEditable(field));
            this._createClauseTable();

            // Call option to let parent control know fields have been loaded
            if ($.isFunction(this._options.afterFieldsLoaded)) {
                this._options.afterFieldsLoaded(fields);
            }
        }, (error) => this._onError(error));
    }

    /**
     * Setup Identity control for identity fields
     * @param valueControl The control to be updated.
     * @param clause The clause associated with the control.
     */
    private _setupCommonIdentityControl(valueControl: any, clause: any, getAllowedNonIdentityValues: () => string[]) {
        // Setup options
        const allowedNonIdentityValues: string[] = [];

        const commonIdentityPickerOptions = WitHelpers.WITIdentityControlHelpers.setupCommonIdentityPickerOptions(false,
            true,
            FeatureAvailabilityService.isFeatureEnabled(FeatureAvailabilityFlags.WorkItemTrackingAADSupport),
            getAllowedNonIdentityValues,
            (item: IEntity) => {
                valueControl.fireChange();
            },
            () => {
                return valueControl.getControl().getDropdownPrefix();
            },
            null
        );

        commonIdentityPickerOptions["consumerId"] = "96E87D23-FF46-415C-9D1E-C6642F551816";
        commonIdentityPickerOptions["ariaLabel"] = Utils_String.format(WitResources.FieldValueIdentityPickerAriaLabel, clause && clause.fieldName ? clause.fieldName : "");

        // Create Control
        valueControl.setControl(IdentityPicker.IdentityPickerSearchControl, commonIdentityPickerOptions);

        // on each key type we want to update valid status
        const inputText = valueControl.getControl().getElement().find("input");
        inputText.change(() => {
            valueControl.fireChange();
        });

        if (clause.value) {
            const entity = WITIdentityHelpers.parseUniquefiedIdentityName(clause.value);
            const entityIdentifier = WITIdentityHelpers.getEntityIdentifier(entity);

            if (entityIdentifier) {
                valueControl.getControl().setEntities([], [entityIdentifier]);
            } else {
                // If the value is a non identity string - we cant ask the control to resolve it
                // So we pass the value as a dummy string entity object
                valueControl.getControl().setEntities([entity], []);
            }
        }
    }

    /**
     * Check if field supports identity control
     * @param clause
     */
    private _isIdentityPickerSupported(clause: Filters.IFilterClause): boolean {
        const field: FieldDefinition = this._model.getField(clause.fieldName);
        return field && field.isIdentity;
    }

    /**
     * Check if field supports new classification control control
     * @param clause
     */
    private _isReactClassificationPickerSupported(clause: any): boolean {
        const field: FieldDefinition = this._model.getField(clause.fieldName);
        return field && field.type === FieldType.TreePath;
    }

    /**
     * Handle errors for control. Use option if passed in, otherwise use VSS handleError
     * @param error
     */
    private _onError(error: Error) {
        if ($.isFunction(this._options.onError)) {
            this._options.onError(error);
        } else {
            // Backup error so its always show, option can choose to hide
            VSS.handleError(error);
        }
    }
}
