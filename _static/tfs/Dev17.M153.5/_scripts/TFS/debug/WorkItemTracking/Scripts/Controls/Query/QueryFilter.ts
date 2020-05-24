import Combos = require("VSS/Controls/Combos");
import Utils_String = require("VSS/Utils/String");
import Utils_Array = require("VSS/Utils/Array");
import Diag = require("VSS/Diag");
import FieldsFilter = require("WorkItemTracking/Scripts/Controls/Fields/FieldsFilterControl");
import Resources = require("WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking");
import { FeatureAvailabilityFlags } from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";
import { WITIdentityHelpers } from "TfsCommon/Scripts/WITIdentityHelpers";
import { IFilterClause, IFilterClauseInfo } from "VSS/Controls/Filters";
import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import { FieldsFilterAreaControl, IAreaControlOptions } from "WorkItemTracking/Scripts/Controls/Fields/FieldsFilterAreaControl";
import { FieldsFilterClassificationControl, IFieldsFilterClassificationControlOptions } from "WorkItemTracking/Scripts/Controls/Fields/FieldsFilterClassificationControl";
import { FieldsFilterEmptyControl } from "WorkItemTracking/Scripts/Controls/Fields/FieldsFilterEmptyControl";
import { FieldsFilterIterationControl, IIterationControlOptions } from "WorkItemTracking/Scripts/Controls/Fields/FieldsFilterIterationControl";
import { QueryResultsProvider } from "WorkItemTracking/Scripts/Controls/WorkItemsProvider";
import { QueryAdapter } from "WorkItemTracking/Scripts/OM/QueryAdapter";
import { IFilter } from "WorkItemTracking/Scripts/OM/QueryInterfaces";
import { getInvariantOperator, WiqlOperators } from "WorkItemTracking/Scripts/OM/WiqlOperators";
import { WITIdentityControlHelpers } from "WorkItemTracking/Scripts/TFS.WorkItemTracking.Helpers";
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import Service = require("VSS/Service");
import WITCommonResources = require("WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking.Common");
import WITConstants = require("Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants");
import WITOM = require("WorkItemTracking/Scripts/TFS.WorkItemTracking");
import Identities_RestClient = require("VSS/Identities/Picker/RestClient");
import IdentityPicker = require("VSS/Identities/Picker/Controls");

export interface IQueryFilterOptions {
    cssClass: string;
    tfsContext: TFS_Host_TfsContext.TfsContext;
}

export class QueryFilter extends FieldsFilter.FieldsFilterControl {

    public static enhancementTypeName: string = "tfs.wit.queryFilter";

    private _queryProvider: QueryResultsProvider;
    private _queryAdapter: QueryAdapter;
    private _project: WITOM.Project;

    private _prevId: string;

    public initializeOptions(options?: IQueryFilterOptions) {
        super.initializeOptions($.extend({
            coreCssClass: "query-filter"
        }, options));
    }

    public setParameters(queryProvider: QueryResultsProvider, filter: IFilter, project: WITOM.Project) {
        this._queryProvider = queryProvider;
        this._queryAdapter = (<Service.VssConnection>queryProvider.project.store.tfsConnection).getService<QueryAdapter>(QueryAdapter);
        const prevProject = this._project;
        this._project = project;
        if (!this.setFilter(filter) && project !== prevProject) {
            this._createClauseTable();
        }
    }

    public _getDefaultClause() {
        return { logicalOperator: WITCommonResources.WiqlOperators_And, fieldName: "", operator: WITCommonResources.WiqlOperators_EqualTo, value: "", index: 0 };
    }

    public _updateAndOrControl(andOrControl: Combos.Combo, clause: IFilterClause) {
        andOrControl.setText(clause.logicalOperator);
        andOrControl.setSource([WITCommonResources.WiqlOperators_And, WITCommonResources.WiqlOperators_Or]);
    }

    public _updateFieldControl(fieldControl: FieldsFilter.FieldsFilterValueControl, clause: IFilterClause) {
        fieldControl.setText(clause.fieldName);

        this._queryAdapter.beginGetQueryableFields(this._project, function (fields: WITOM.FieldDefinition[]) {
            if (!fieldControl._disposed) {
                fieldControl.setSource(fields);
            }
        });
    }

    public _updateOperatorControl(operatorControl: Combos.Combo, clause: IFilterClause, updateClause?: boolean) {
        const that = this;
        let asynch = true;

        function setSource(operators: string[]) {
            let field;

            operators = operators || [];

            if (operators.length) {
                operatorControl.setSource(operators);
                operatorControl.setMode(operators.length ? "drop" : "text");
            } else {
                operatorControl.setSource([]);
                operatorControl.setMode("text");
            }

            if (updateClause) {
                if (clause.operator) {
                    if (!Utils_Array.contains(operators, clause.operator, Utils_String.localeIgnoreCaseComparer)) {
                        clause.operator = "";
                        clause.value = "";
                    }
                }

                if (!clause.operator && operators.length) {
                    field = that._queryAdapter.getField(clause.fieldName);

                    if (field && field.id === WITConstants.CoreField.Title) {
                        // Title is special case
                        let operator;
                        if (field.supportsTextQuery()) {
                            operator = WiqlOperators.OperatorContainsWords;
                        } else {
                            operator = WiqlOperators.OperatorContains;
                        }
                        clause.operator = that._queryAdapter.getLocalizedOperator(operator);
                    } else {
                        clause.operator = operators[0];
                    }
                }
            }

            operatorControl.setText(clause.operator || "");
        }

        if (clause.fieldName) {
            Diag.logTracePoint("QueryEditor._updateOperatorControl.async-pending");
            this._queryAdapter.beginGetAvailableOperators(clause.fieldName, function (operators: string[]) {
                asynch = false;

                if (!operatorControl._disposed) {
                    setSource(operators);
                }
                Diag.logTracePoint("QueryEditor._updateOperatorControl.async-complete");
            });

            if (asynch) {
                setSource([WITCommonResources.WiqlOperators_EqualTo]);
            }
        } else {
            setSource([WITCommonResources.WiqlOperators_EqualTo]);
        }
    }

    public getClauseValue(valueControl: FieldsFilter.FieldsFilterValueControl, clause: IFilterClause): string {
        if (this._isIdentityPickerSupported(clause) && !this._queryAdapter.isIdentityFieldStringOperator(clause.operator)) {
            const control: IdentityPicker.IdentityPickerSearchControl = valueControl.getControl();
            if (this._queryAdapter.isMultipleValueOperator(clause.operator)) {
                const selectedItems = $.map(control.getIdentitySearchResult().resolvedEntities || [], (item: Identities_RestClient.IEntity) => {
                    return WITIdentityHelpers.getUniquefiedIdentityName(item);
                });

                return WITIdentityControlHelpers.toIdentityListString(selectedItems);
            } else {
                const resolvedEntities = control.getIdentitySearchResult().resolvedEntities;

                if (resolvedEntities && resolvedEntities.length === 1) {
                    return WITIdentityHelpers.getUniquefiedIdentityName(resolvedEntities[0]);
                } else {
                    const inputText = control.getElement().find("input");
                    return inputText.val();
                }
            }
        } else {
            return valueControl.getText();
        }
    }

    private _setupCommonIdentityControl(valueControl: FieldsFilter.FieldsFilterValueControl, clause: IFilterClause, getAllowedNonIdentityValues: () => string[]) {
        const isMultipleValueOperator = this._queryAdapter.isMultipleValueOperator(clause.operator);
        const isGroupOperator = this._queryAdapter.isGroupOperator(clause.operator);
        let containerCssClass: string;
        const initialItems: Identities_RestClient.IEntity[] = [];
        const initialItemsIdentifiers: string[] = [];

        const addInitialItem = (value: string) => {
            const entity = WITIdentityHelpers.parseUniquefiedIdentityName(value);
            const entityIdentifier = WITIdentityHelpers.getEntityIdentifier(entity, false, true);

            if (entityIdentifier) {
                initialItemsIdentifiers.push(entityIdentifier);
            } else {
                // If the value is a non identity string or a non materialized aad group
                // there is no resolution possible given the data we have, so we pass the
                // value as a dummy entity object.
                initialItems.push(entity);
            }
        };

        if (isMultipleValueOperator) {
            if (clause.value) {
                const initialValues = WITIdentityControlHelpers.parseIdentityListString(clause.value);
                if (initialValues && initialValues.length > 0) {
                    $.each(initialValues, (index: number, value: string) => {
                        addInitialItem(value);
                    });
                }
            }
            this._bind(IdentityPicker.IdentityPickerSearchControl.RESOLVED_INPUT_REMOVED_EVENT, () => {
                // fired when the user removes an item by clicking on the delete icon on an item in multiselect control
                valueControl.fireChange();
            });
            containerCssClass = "identity-picker-container multi-select";
        } else {
            if (clause.value) {
                addInitialItem(clause.value);
            }
            containerCssClass = "identity-picker-container";
        }

        const commonIdentityPickerOptions = WITIdentityControlHelpers.setupCommonIdentityPickerOptions(isMultipleValueOperator,
            !isGroupOperator,
            isGroupOperator ?
                FeatureAvailabilityService.isFeatureEnabled(FeatureAvailabilityFlags.WorkItemTrackingAADSupportForInGroup) :
                FeatureAvailabilityService.isFeatureEnabled(FeatureAvailabilityFlags.WorkItemTrackingAADSupport),
            getAllowedNonIdentityValues,
            () => {
                valueControl.fireChange();
            },
            () => {
                return valueControl.getControl().getDropdownPrefix();
            },
            null);
        commonIdentityPickerOptions["containerCssClass"] = containerCssClass;
        commonIdentityPickerOptions["consumerId"] = "78379551-82F5-48A3-9AC5-6A810CB22599";
        commonIdentityPickerOptions["ariaLabel"] = Utils_String.format(Resources.FieldValueIdentityPickerAriaLabel, clause && clause.fieldName ? clause.fieldName : "");

        valueControl.setControl(IdentityPicker.IdentityPickerSearchControl, commonIdentityPickerOptions);

        const inputText = valueControl.getControl().getElement().find("input");
        inputText.keyup(() => {
            // on each key type, we want to dirty the query
            valueControl.fireChange();
        });

        valueControl.getControl().setEntities(initialItems, initialItemsIdentifiers);
    }

    public _updateValueControl(valueControl: FieldsFilter.FieldsFilterValueControl, clause: IFilterClause) {
        let allowedNonIdentityValues: string[];

        const getAllowedNonIdentityValues = () => {
            return allowedNonIdentityValues;
        };

        const identityPickerSupported = this._isIdentityPickerSupported(clause);
        const isIdentityFieldStringOperator = this._queryAdapter.isIdentityFieldStringOperator(clause.operator);

        const project: WITOM.Project = this._project || this._queryProvider.project;
        const projectId = project ? project.guid : this._options.tfsContext.navigation.projectId;
        const projectName = project ? project.name : this._options.tfsContext.navigation.project;
        const crossProject = !this._project;

        const field: WITOM.FieldDefinition = this._queryAdapter.getField(clause.fieldName);
        const label: string = Utils_String.format(Resources.FieldValueComboAriaLabel, clause && clause.fieldName ? clause.fieldName : "");
        if (identityPickerSupported && !isIdentityFieldStringOperator) {
            this._setupCommonIdentityControl(valueControl, clause, getAllowedNonIdentityValues);
        } else if (this._isIterationPickerSupported(clause)) {
            const options: IIterationControlOptions = { projectId, projectName, crossProject, label, field };
            valueControl.setControl(FieldsFilterIterationControl, options);
            valueControl.setText(clause.value);
        } else if (this._isAreaPickerSupported(clause)) {
            const options: IAreaControlOptions = { projectId, projectName, crossProject, label, field };
            valueControl.setControl(FieldsFilterAreaControl, options);
            valueControl.setText(clause.value);
        } else if (this._isReactClassificationPickerSupported(clause)) {
            valueControl.setControl(FieldsFilterClassificationControl, {
                inputAriaLabel: label,
                field: field,
                projectId: projectId,
                skipPathTruncation: true
            } as IFieldsFilterClassificationControlOptions);
            valueControl.setText(clause.value);
        } else if (this._isEmptySupported(clause)) {
            valueControl.setControl(FieldsFilterEmptyControl, {});
            clause.value = "";
        } else {
            valueControl.setControl(Combos.Combo, { label });
            valueControl.setText(clause.value);
        }

        if (!clause.fieldName || !clause.operator) {
            valueControl.setEnabled(false);
        }
        // dont put any values in the drop down for identity field using string operators.
        // for all other fields continue to get values for the combo box.
        // We dont put any value in combo box because we dont want to match exact identity from identity picker. String operators
        // should not use identity picker instead we provide users with text box to just put a string in there.
        else if (identityPickerSupported && isIdentityFieldStringOperator) {
            valueControl.setEnabled(true);
        } else {
            Diag.logTracePoint("QueryEditor._updateValueControl.async-pending"); // TODO:merge-check
            valueControl.setEnabled(true);
            const control = valueControl.getControl();
            const scopeAllowedValuesToProject = !!this._project;

            this._queryAdapter.beginGetAvailableFieldValues(project, clause.fieldName, clause.operator, true, scopeAllowedValuesToProject, (values) => {
                if (control && !control._disposed) {
                    const fieldType: WITConstants.FieldType = this._queryAdapter.getFieldType(null, clause.fieldName);
                    const field = this._queryAdapter.getField(clause.fieldName);

                    if (identityPickerSupported && !isIdentityFieldStringOperator) {
                        allowedNonIdentityValues = values;
                    } else {
                        // We only want to provide the allowed value for Follows when operators == In
                        if (
                            field && field.id === WITConstants.CoreField.Id
                            && Utils_String.localeIgnoreCaseComparer(clause.operator, WiqlOperators.OperatorIn) !== 0
                            && Utils_String.localeIgnoreCaseComparer(clause.operator, WiqlOperators.OperatorNotIn) !== 0
                        ) {
                            values = [];
                        }

                        this._updateFieldValues(valueControl, fieldType, values, true);
                    }
                }
                Diag.logTracePoint("QueryEditor._updateValueControl.async-complete");
            });
        }
    }

    public _validateClause(clauseInfo: IFilterClauseInfo) {
        const clause = clauseInfo.clause;

        if (!clause.fieldName || !clause.operator) {
            clauseInfo.fieldNameControl.setInvalid(false);
            clauseInfo.operatorControl.setInvalid(false);
        } else {
            this._queryAdapter.beginEnsureFields(() => {
                const field = this._queryAdapter.getField(clause.fieldName);

                if (field) {
                    clauseInfo.fieldNameControl.setInvalid(false);

                    this._queryAdapter.beginGetAvailableOperators(clause.fieldName, function (operators: string[]) {
                        if (operators && Utils_Array.contains(operators, clause.operator, Utils_String.localeIgnoreCaseComparer)) {
                            clauseInfo.operatorControl.setInvalid(false);
                        } else {
                            clauseInfo.operatorControl.setInvalid(true);
                        }
                    });
                } else {
                    clauseInfo.fieldNameControl.setInvalid(true);
                    clauseInfo.operatorControl.setInvalid(Utils_String.localeIgnoreCaseComparer(clause.operator, WITCommonResources.WiqlOperators_EqualTo) !== 0);
                }
            });
        }
    }

    public _handleFieldNameChanged(clauseInfo: IFilterClauseInfo, oldValue: string) {
        const clause = clauseInfo.clause;
        Diag.logTracePoint("QueryEditor._onClauseChange.async-pending");
        this._queryAdapter.beginEnsureFields(() => {
            const field = this._queryAdapter.getField(clause.fieldName);
            const oldField = this._queryAdapter.getField(oldValue);
            
            if (field) {
                if (
                    (this._queryAdapter.getFieldType(field, oldValue) !== this._queryAdapter.getFieldType(field, clause.fieldName)) ||
                    (field.id === WITConstants.CoreField.Title) ||
                    (oldField && WITOM.isIdentityPickerSupportedForField(field) !== WITOM.isIdentityPickerSupportedForField(oldField))
                ) {
                    clause.operator = "";

                    if (this._shouldClearClauseValueOnFieldChange(field, oldField)) {
                        clause.value = "";
                    }
                }

                this._updateOperatorControl(clauseInfo.operatorControl, clause, true);
                this._updateValueControl(clauseInfo.valueControl, clause);
            }

            Diag.logTracePoint("QueryEditor._onClauseChange.async-complete");
        });
    }

    public _handleOperatorChanged(clauseInfo: IFilterClauseInfo, oldValue: string) {
        const clause = clauseInfo.clause;
        const field = this._queryAdapter.getField(clause.fieldName);
        if (
            (this._queryAdapter.isGroupOperator(oldValue) !== this._queryAdapter.isGroupOperator(clause.operator)) ||
            (this._queryAdapter.isFieldComparisonOperator(oldValue) !== this._queryAdapter.isFieldComparisonOperator(clause.operator)) ||
            (WITOM.isIdentityPickerSupportedForField(field) && this._queryAdapter.isMultipleValueOperator(oldValue) !== this._queryAdapter.isMultipleValueOperator(clause.operator)) ||
            (WITOM.isIdentityPickerSupportedForField(field) && this._queryAdapter.isIdentityFieldStringOperator(oldValue) !== this._queryAdapter.isIdentityFieldStringOperator(clause.operator)) ||
            (this._queryAdapter.isMultipleValueOperator(oldValue) !== this._queryAdapter.isMultipleValueOperator(clause.operator)) ||
            (this._isEmptySupported(clause) !== this._isEmptySupported({ ...clause, operator: oldValue }))
        ) {
            clause.value = "";
        }
        this._updateValueControl(clauseInfo.valueControl, clause);
    }

    private _shouldClearClauseValueOnFieldChange(newField: WITOM.FieldDefinition, oldField: WITOM.FieldDefinition): boolean {
        const isNewFieldTreePath = newField ? newField.type === WITConstants.FieldType.TreePath : false;
        const isNewFieldIdentity = newField ? newField.isIdentity : false;

        const isOldFieldTreePath = oldField ? oldField.type === WITConstants.FieldType.TreePath : false;
        const isOldFieldIdentity = oldField ? oldField.isIdentity : false;

        if (isNewFieldTreePath !== isOldFieldTreePath || isNewFieldIdentity !== isOldFieldIdentity) {
            return true;
        }
        return false;
    }

    private _isEmptySupported(clause: IFilterClause): boolean {
        const operators = {
            [WiqlOperators.OperatorIsEmpty]: undefined,
            [WiqlOperators.OperatorIsNotEmpty]: undefined,
        };
        const types = {
            [WITConstants.FieldType.History]: undefined,
            [WITConstants.FieldType.PlainText]: undefined,
            [WITConstants.FieldType.Html]: undefined,
        };
        const field: WITOM.FieldDefinition = this._queryAdapter.getField(clause.fieldName);
        const invariantOp = getInvariantOperator(clause.operator);
        return field && field.type in types && invariantOp in operators;
    }

    private _isIterationPickerSupported(clause: IFilterClause): boolean {
        if (!FeatureAvailabilityService.isFeatureEnabled(FeatureAvailabilityFlags.CurrentIterationRequireTeamParameter)) {
            return false;
        }

        const groupOperators = {
            [WiqlOperators.OperatorIn]: undefined,
            [WiqlOperators.OperatorNotIn]: undefined,
        };
        if (this._queryAdapter.areFieldsLoaded()) {
            const field: WITOM.FieldDefinition = this._queryAdapter.getField(clause.fieldName);

            return field && field.referenceName === WITConstants.CoreFieldRefNames.IterationPath && !(getInvariantOperator(clause.operator) in groupOperators);
        }
        return false;
    }
    private _isAreaPickerSupported(clause: IFilterClause): boolean {
        if (
            !FeatureAvailabilityService.isFeatureEnabled(FeatureAvailabilityFlags.TeamAreasMacro) ||
            !this._queryAdapter.areFieldsLoaded()
        ) {
            return false;
        }
        const areasOperators: { [op: string]: undefined } = {
            [WiqlOperators.OperatorEqualTo]: undefined,
            [WiqlOperators.OperatorNotEqualTo]: undefined,
        };
        const field: WITOM.FieldDefinition = this._queryAdapter.getField(clause.fieldName);
        return field && field.referenceName === WITConstants.CoreFieldRefNames.AreaPath && (getInvariantOperator(clause.operator) in areasOperators);
    }

    private _isIdentityPickerSupported(clause: IFilterClause): boolean {
        if (this._queryAdapter.areFieldsLoaded()) {
            const field: WITOM.FieldDefinition = this._queryAdapter.getField(clause.fieldName);

            return WITOM.isIdentityPickerSupportedForField(field) &&
                !this._queryAdapter.isFieldComparisonOperator(clause.operator);
        }
        return false;
    }

    private _isReactClassificationPickerSupported(clause: IFilterClause): boolean {
        if (this._queryAdapter.areFieldsLoaded()) {
            const field: WITOM.FieldDefinition = this._queryAdapter.getField(clause.fieldName);

            return field && field.type === WITConstants.FieldType.TreePath;
        }
        return false;
    }

    public _setDirty() {
        this._queryProvider.setDirty(true);
    }
}