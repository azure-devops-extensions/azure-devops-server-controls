/// <reference types="jquery" />
import * as Q from "q";
import Agile = require('Agile/Scripts/Common/Agile');
import Predicate_WIT = require('Agile/Scripts/Common/PredicateWIT');
import AgileUtils = require('Agile/Scripts/Common/Utils');
import AgileControlsResources = require('Agile/Scripts/Resources/TFS.Resources.AgileControls');
import ServerConstants = require('Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants');
import WITConstants = require('Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants');
import TFS_Host_TfsContext = require('Presentation/Scripts/TFS/TFS.Host.TfsContext');
import TFS_OM_Common = require('Presentation/Scripts/TFS/TFS.OM.Common');
import TFS_OM_Identities = require('Presentation/Scripts/TFS/TFS.OM.Identities');
import TFS_UI_Controls_Identities = require('Presentation/Scripts/TFS/TFS.UI.Controls.Identities');
import { WITIdentityHelpers } from 'TfsCommon/Scripts/WITIdentityHelpers';
import Diag = require('VSS/Diag');
import FeatureAvailability_Services = require('VSS/FeatureAvailability/Services');
import IdentityPicker = require('VSS/Identities/Picker/Controls');
import Identities_RestClient = require('VSS/Identities/Picker/RestClient');
import VSS_Service = require('VSS/Service');
import Utils_Array = require('VSS/Utils/Array');
import Utils_Core = require('VSS/Utils/Core');
import Culture = require('VSS/Utils/Culture');
import Utils_Date = require('VSS/Utils/Date');
import Utils_String = require('VSS/Utils/String');
import Utils_UI = require('VSS/Utils/UI');
import Filters = require('VSS/Controls/Filters');
import FieldsFilter = require('WorkItemTracking/Scripts/Controls/Fields/FieldsFilterControl');
import { QueryAdapter } from 'WorkItemTracking/Scripts/OM/QueryAdapter';
import { IClause } from 'WorkItemTracking/Scripts/OM/QueryInterfaces';

import {
    isTodayMacro,
    isMeMacro,
    isCurrentIterationMacro,
    isProjectMacro,
    WiqlOperators 
} from 'WorkItemTracking/Scripts/OM/WiqlOperators';

import WITCommonResources = require('WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking.Common');
import WITOM = require('WorkItemTracking/Scripts/TFS.WorkItemTracking');
import WITHelpers = require('WorkItemTracking/Scripts/TFS.WorkItemTracking.Helpers');
import WitFormMode = require('WorkItemTracking/Scripts/Utils/WitControlMode');
import { IPredicateConfiguration } from 'Agile/Scripts/Common/Predicate';
import { Combo } from "VSS/Controls/Combos";
import { FieldType, CoreField } from "Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants";
import WitResources = require('WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking');
import * as WidgetResources from 'Widgets/Scripts/Resources/TFS.Resources.Widgets';
import { AnalyticsPredicateConfiguration } from 'Widgets/Scripts/Controls/FieldFilter/AnalyticsPredicateConfiguration';


/** Encapsulates the subset of operations required of a Query Adapter Implementation to satisfy the AnalyticsFieldsFilterControl */
export interface IQueryAdapterCore {
    getInvariantFieldName(localizedFieldName: string, throwError: boolean): string;
    getInvariantFieldValue(invariantFieldName: string, invariantOperator: string, localizedValue: string): string;

    beginGetAvailableOperators(localizedFieldName: string, callback: IResultCallback, errorCallback?: IErrorCallback);
    getField(fieldName: string): WITOM.FieldDefinition;
    areFieldsLoaded(): void;
    getFieldType(field: WITOM.FieldDefinition, fieldName?: string): WITConstants.FieldType;
    getLocalizedOperator(invariantOperator: string): string;
    beginEnsureFields(callback: (field: WITOM.FieldDefinition[]) => void, errorCallback?: IErrorCallback);
    getInvariantOperator(localizedOperator: string): string;

    isFieldComparisonOperator(localizedOperator: string): boolean;
    beginGetAvailableFieldValues(project: WITOM.Project, localizedFieldName: string, localizedOperator: string, includePredefinedValues: boolean, scopeAllowedValuesToProject: boolean, callback: IResultCallback, errorCallback?: IErrorCallback);
}

class FieldValueControlModes {
    public static DROP = "drop";
    public static TEXT = "text";
}

export class ClauseValueCombo extends Combo {
    public toggleDropDown(): any {
        super.toggleDropDown();
        var comboWidth = this.getElement().width();
        var $dropDown = this.getElement().find("." + "combo-drop-popup");
        $dropDown.css("width", comboWidth + 2);
        this.getBehavior().getDropPopup().setPosition();
    }
}

export interface AnalyticsFieldsFilterControlOptions extends FieldsFilter.FieldsFilterControlOptions {
    //Describes supported types, operators and macros allowed for use with this control. Stateless.
    predicateConfig: IPredicateConfiguration;
    maxClauseCount: number;
    onError(error: Error): void;
    onChange(): void;
}

/**
 *  This control allows for querying on a WIT dataset residing in Analytics service.
 *  As analytics metadata support improves, this control will be shift to a more abstracted provider model, and to use the WIT Agnostic Filter Control stack.
 *  The bulk of implementation is derived from prior WIT filter controls (Unfortunately, no one base is a good match).
 *
 *  Notable customizations revolve around cross project support, No macros, literal date handling, modified presentation in condensed Widget config UI.
 *
 *  StyleRuleCriteriaControl and MultiFieldEditControl were the strongest influences on this impl, but it does not directly derive from them.
 */
export class AnalyticsFieldsFilterControl extends FieldsFilter.FieldsFilterControlO<AnalyticsFieldsFilterControlOptions> {
    public isAddClauseDisabled = false;
    private clauseErrorMessages: string[] = [];
    public static coreCssClass = "analytics-fields-filter-control";

    //All operations against the adapter contract need to be modified to work with a cross-project implementation.
    private _queryAdapter: IQueryAdapterCore;


    constructor(options?: AnalyticsFieldsFilterControlOptions) {
        super($.extend({
            coreCssClass: AnalyticsFieldsFilterControl.coreCssClass
        }, options));
    }

    public initialize() {
        super.initialize();

        //Route filter modification events from base to self, out to explicit onChange handler.
        this._bind("filterModified", (event, filter) => { this._options.onChange(); });
    }

    //Reports the first error message if there any errors
    public getFirstErrorMessage(): string {
        let firstErrorIndex = -1;

        // Array.findIndex() is cleaner, but not supported on IE.
        this.clauseErrorMessages.some((errorMessage, index) => {
            if (errorMessage != null) {
                firstErrorIndex = index;

                return true;
            }
        });

        let message = (firstErrorIndex >= 0) ? Utils_String.format(WidgetResources.AnalyticsFieldsFilterControl_ErrorOnRowFormat, firstErrorIndex + 1, this.clauseErrorMessages[firstErrorIndex]) : null;
        return message;
    }

    //Override
    public setFilter(criteria: any): boolean {
        this._queryAdapter = VSS_Service.getService<QueryAdapter>(QueryAdapter);
        if (!criteria) {
            criteria = this._getDefaultClause();
        }
        // If there is only one clause, the logical operator could be missing. By default we add "AND" logical operator to allow inserting a clause above this clause and to insert abovethere has to be a logical operator.
        if (criteria && criteria.clauses && criteria.clauses.length > 0 && !(criteria.clauses[0].logicalOperator)) {
            criteria.clauses[0].logicalOperator = WiqlOperators.OperatorAnd;
        }
        const wasUpdated = super.setFilter(criteria ? criteria : null);
        this._updateAddClauseVisibility();
        return wasUpdated;
    }

    //Override abstract
    public _getDefaultClause(): IClause {
        return AnalyticsFieldsFilterControl.generateDefaultClause();
    }

    //Expose for generating outside lifespan of control
    public static generateDefaultClause(): IClause {
        return <IClause>{ logicalOperator: WiqlOperators.OperatorAnd, fieldName: "", operator: AgileControlsResources.QueryEqualTo, value: "", index: 0 };
    }

    // Override base
    public _updateAndOrControl(andOrControl: Combo, clause) {
        Diag.logTracePoint("AnalyticsFieldsFilterControl._updateAndOrControl.start");
        andOrControl.setText(this._queryAdapter.getLocalizedOperator(clause.logicalOperator));
        //Right now limiting to only AND operator
        andOrControl.setEnabled(false);
        andOrControl.setSource([WiqlOperators.OperatorAnd]);
        Diag.logTracePoint("AnalyticsFieldsFilterControl._updateAndOrControl.complete");
        //No-op, we don't support logical grouping operator
    }

    // Override base
    public _updateFieldControl(fieldControl: Combo, clause: Filters.IFilterClause) {
        Diag.Debug.assertIsArray(this._options.supportedFieldsDefinitions, "Field Definitions should be a non-empty array", true);
        Diag.logTracePoint("AnalyticsFieldsFilterControl._updateFieldControl.start");

        let fieldName = this._getFieldName(clause.fieldName);

        if (fieldName) {
            fieldControl.setText(fieldName);
        } else {
            // Sets placeholder if field name is not available.
            (fieldControl as any)._input.attr('placeholder', WidgetResources.BurndownConfig_AnalyticsFilterFieldPlaceholderText);
        }

        var fields: string[] = [];

        var fieldDefinitions = this._options.supportedFieldsDefinitions;
        $.each(fieldDefinitions, (index: number, fieldDefinition: WITOM.FieldDefinition) => {
            fields.push(fieldDefinition.name);
        });

        if (!fieldControl._disposed) {
            fieldControl.setSource(fields);
        }
        fieldControl.setMode(fields.length > 0 ? FieldValueControlModes.DROP : FieldValueControlModes.TEXT);

        // The following binding was always firing filterModified event even if there is any change in the input
        // Followed by the autocomplete filtermodified request. Which as causing the flicker in the error message
        // So we need to unbind the change input, so that only autocomplete one is getting fired.
        (fieldControl as any)._input.unbind('change input');

        Diag.logTracePoint("AnalyticsFieldsFilterControl._updateFieldControl.complete");
    }

    //override base
    public _updateOperatorControl(operatorControl: Combo, clause: any, updateClause?: boolean) {
        if (clause.fieldName) {
            Diag.logTracePoint("AnalyticsFieldsFilterControl._updateOperatorControl.async-start");
            this._queryAdapter.beginGetAvailableOperators(clause.fieldName, (operators: string[]) => {
                var fieldType: WITConstants.FieldType = this._queryAdapter.getFieldType(null, clause.fieldName);
                operators = this._getSupportedOperators(operators, fieldType, clause.fieldName);
                if (!operatorControl._disposed) {
                    this._setSourceForOperatorControl(operators, operatorControl, clause, updateClause);
                }
                Diag.logTracePoint("AnalyticsFieldsFilterControl._updateOperatorControl.async-complete");
            });
        }
        else {
            this._setSourceForOperatorControl([AgileControlsResources.QueryEqualTo], operatorControl, clause, updateClause);
        }
        //The following binding was always firing filterModified event even if there is any change in the input
        // Followed by the autocomplete request. Which as causing the flicker in the error message
        // So we need to unbind the change input, so that only autocomplete one is getting fired.
        (operatorControl as any)._input.unbind('change input');
    }

    // Override base
    protected _removeClauseClick(e?: JQueryEventObject, clauseInfo?: Filters.IFilterClauseInfo): any {
        // We need to keep our error message array in sync with the clauses
        this.clauseErrorMessages.splice(clauseInfo.clause.index, 1);

        return super._removeClauseClick(e, clauseInfo);
    }


    private _setupCommonIdentityControl(valueControl: FieldsFilter.FieldsFilterValueControl, clause: any, getAllowedNonIdentityValues: () => string[]) {
        var commonIdentityPickerOptions = WITHelpers.WITIdentityControlHelpers.setupCommonIdentityPickerOptions(false,
            true,
            FeatureAvailability_Services.FeatureAvailabilityService.isFeatureEnabled(ServerConstants.FeatureAvailabilityFlags.WorkItemTrackingAADSupport),
            getAllowedNonIdentityValues,
            (item: Identities_RestClient.IEntity) => {
                valueControl.fireChange();
            },
            () => {
                return valueControl.getControl().getDropdownPrefix();
            },
            null);
        commonIdentityPickerOptions["containerCssClass"] = "identity-picker-container";
        //This is a unique identifier of the Widget Configuration scenario consuming this identity picker.
        let WidgetConfiguration_FieldFilter_IdentityPickerId = "9328d215-c79e-43bb-8ea4-93df65d32290";
        commonIdentityPickerOptions.consumerId = WidgetConfiguration_FieldFilter_IdentityPickerId;
        commonIdentityPickerOptions["ariaLabel"] = Utils_String.format(WitResources.FieldValueIdentityPickerAriaLabel, clause && clause.fieldName ? clause.fieldName : "");
        valueControl.setControl(IdentityPicker.IdentityPickerSearchControl, commonIdentityPickerOptions);

        let identityControl: IdentityPicker.IdentityPickerSearchControl = valueControl.getControl();

        var inputText = identityControl.getElement().find("input");
        inputText.change(() => {
            // on each key type, we want to dirty the query
            valueControl.fireChange();
        });

        if (clause.value) {
            var entity = WITIdentityHelpers.parseUniquefiedIdentityName(clause.value);
            var entityIdentifier = WITIdentityHelpers.getEntityIdentifier(entity);

            if (entityIdentifier) {
                identityControl.setEntities([], [entityIdentifier]);
            }
            else {
                // If the value is a non identity string - we cant ask the control to resolve it
                // So we pass the value as a dummy string entity object
                identityControl.setEntities([entity], []);
            }
        }
    }

    //override base
    public _updateValueControl(valueControl: FieldsFilter.FieldsFilterValueControl, clause: Filters.IFilterClause) {
        var allowedNonIdentityValues: string[];

        var getAllowedNonIdentityValues = () => {
            return allowedNonIdentityValues;
        }

        if (this._isIdentityPickerSupported(clause)) {
            this._setupCommonIdentityControl(valueControl, clause, getAllowedNonIdentityValues);
        }
        else {
            valueControl.setControl(ClauseValueCombo);
            valueControl.setText(this._getLocalizedValue(clause.fieldName, clause.operator, clause.value));
        }

        if (!clause.fieldName || !clause.operator) {
            valueControl.setEnabled(false);
        }
        else {
            Diag.logTracePoint("AnalyticsFieldsFilterControl._updateValueControl.async.start");

            valueControl.setEnabled(true);
            var control = valueControl.getControl();
            var store = TFS_OM_Common.ProjectCollection.getDefaultConnection().getService<WITOM.WorkItemStore>(WITOM.WorkItemStore);

            store.beginGetProject(TFS_Host_TfsContext.TfsContext.getDefault().navigation.projectId,
                (project: WITOM.Project) => {
                    this._queryAdapter.beginGetAvailableFieldValues(project, this._getFieldName(clause.fieldName), clause.operator, true, true, (values) => {
                        var fieldType: WITConstants.FieldType = this._queryAdapter.getFieldType(null, clause.fieldName);
                        values = this._getSupportedValues(values, fieldType);
                        if (control && !control._disposed) {
                            var field = this._queryAdapter.getField(clause.fieldName);
                            if (field && field.isIdentity) {
                                allowedNonIdentityValues = values;
                            }
                            this._updateFieldValues(valueControl, fieldType, values);
                        }
                        Diag.logTracePoint("AnalyticsFieldsFilterControl._updateValueControl.async.complete");
                    },
                        (error) =>
                            this._options.onError(error)
                    );
                },
                (error) => this._options.onError(error));
        }
    }


    /**
 * Overrides the base class version to show DatePicker for DateTime fields.
 * @param valueControl The value control.
 * @param fieldType The type of the field.
 * @param values The values to be populated in the value control.
 */
    public _updateFieldValues(valueControl: FieldsFilter.FieldsFilterValueControl, fieldType: FieldType, values: any[]) {
        Diag.Debug.assertParamIsObject(valueControl, "valueControl");
        super._updateFieldValues(valueControl, fieldType, values);

        if (fieldType === FieldType.DateTime) {
            valueControl.setType("date-time");
            valueControl.setMode("drop");
        }
    }

    //Override default Clause appearance
    public _getAddNewClauseText(): string {
        return WidgetResources.BurndownConfig_FieldFilterAddCriteria;
    }

    /**
     * For a given date, get the short date format (day/month/year or flipped around in some variation) in the users locale
     */
    private _getLocaleShortDateString(date: Date, fromUTCFormat?: boolean): string {
        var format = Culture.getCurrentCulture().dateTimeFormat.ShortDatePattern; // get the short date locale formatting
        if (fromUTCFormat) {
            date = new Date(date.getTime() + date.getTimezoneOffset() * 60 * 1000);
        }
        return Utils_Date.localeFormat(date, format, true);
    }

    /**
     * Clears the error state on a given filter clause and then checks validation and assigns any error states it finds.
     * @param clauseInfo The filter clause we are validating against
     */
    public _validateClause(clauseInfo: Filters.IFilterClauseInfo) {
        Diag.logTracePoint("AnalyticsFieldsFilterControl._validateClause.start");
        var clause = clauseInfo.clause;
        this.clauseErrorMessages[clause.index] = null;
        this.resetErrorState(clauseInfo);

        this._queryAdapter.beginEnsureFields(() => {
            var field = this._queryAdapter.getField(clause.fieldName);

            if (field) {
                clauseInfo.fieldNameControl.setInvalid(false);
                this._queryAdapter.beginGetAvailableOperators(clause.fieldName, (operators: string[]) => {
                    if (this.validateOperator(clauseInfo, operators)) {
                        this.validateValueControl(clauseInfo)
                    }
                });
            }
            else {
                this.setClauseInvalidity(clauseInfo.fieldNameControl, clause.index, WidgetResources.AnalyticsFieldsFilterControl_FieldUnsupported);
                clauseInfo.operatorControl.setInvalid(Utils_String.localeIgnoreCaseComparer(clause.operator, AgileControlsResources.QueryEqualTo) !== 0);
            }
        });
        Diag.logTracePoint("AnalyticsFieldsFilterControl._validateClause.complete");
    }

    /**
     * Clears validation errors on the field, operator, and value.
     * @param clauseInfo 
     */
    private resetErrorState(clauseInfo: Filters.IFilterClauseInfo) : void {
        clauseInfo.fieldNameControl.setInvalid(false);
        clauseInfo.operatorControl.setInvalid(false);
        clauseInfo.valueControl.setInvalid(false);
    }

    /**
     * Handles clause validation of operator, and calls into value validation, after field existence has been verified
     */
    private validateOperator(clauseInfo: Filters.IFilterClauseInfo, operators: string[]) {
        let isValid = false;
        let clause = clauseInfo.clause;
        let fieldType: WITConstants.FieldType = this._queryAdapter.getFieldType(null, clause.fieldName);
        operators = this._getSupportedOperators(operators, fieldType, clause.fieldName);
        if (operators && Utils_Array.contains(operators, this._queryAdapter.getLocalizedOperator(clause.operator), Utils_String.localeIgnoreCaseComparer)) {
            clauseInfo.operatorControl.setInvalid(false);
            isValid = true;
        }
        else {
            //No supported operator
            this.setClauseInvalidity(clauseInfo.operatorControl, clause.index, WidgetResources.AnalyticsFieldsFilterControl_NoSupportedOperator);
        }
        return isValid;
    }

    /**
     * Validate the current state of the Value control.
     */
    private validateValueControl(clauseInfo: Filters.IFilterClauseInfo) {
        let clause = clauseInfo.clause;
        let fieldType: WITConstants.FieldType = this._queryAdapter.getFieldType(null, clause.fieldName);
        if (clause.value) {
            try {
                var invariantValue: string;
                if (Utils_String.startsWith(clause.value, WiqlOperators.MacroStart)) {
                    this.validateNoMacros(clause.value, clauseInfo);
                } else if (fieldType === WITConstants.FieldType.DateTime &&
                    !Utils_String.startsWith(clause.value, WiqlOperators.MacroStart)) {
                    // need to do special update scenario here to handle localizing dates
                    // parse the date string which is in locale or in UTC format
                    var date: Date = Utils_Date.parseDateString(clause.value, undefined, true);
                    invariantValue = this._queryAdapter.getInvariantFieldValue(clause.fieldName, clause.operator, this._getLocaleShortDateString(date, clause.value.length > 10));
                    // get it back and remove single quotes from string (date comes out as WIQL safe aka quoted string)
                    invariantValue = invariantValue.replace(/'/g, "");
                    clause.value = invariantValue;
                } else {
                    invariantValue = this._queryAdapter.getInvariantFieldValue(clause.fieldName, clause.operator, clause.value);

                }
            }
            catch (e) {
                //Exception
                this.setClauseInvalidity(clauseInfo.valueControl, clause.index, WidgetResources.AnalyticsFieldsFilterControl_ErrorOnValidation);

            }
        } else if (fieldType === WITConstants.FieldType.Double ||
            fieldType === WITConstants.FieldType.Internal ||
            fieldType === WITConstants.FieldType.DateTime) {
            //No value
            this.setClauseInvalidity(clauseInfo.valueControl, clause.index, WidgetResources.AnalyticsFieldsFilterControl_EmptyFieldError);
        }
    }

    private validateNoMacros(macro: string, clauseInfo: Filters.IFilterClauseInfo): void {
        if (isMeMacro(macro, false) ||
            isCurrentIterationMacro(macro, false) ||
            isProjectMacro(macro, false) ||
            isTodayMacro(macro, false) ||
            Utils_String.localeIgnoreCaseComparer(macro, WiqlOperators.MacroTeamAreas) === 0) {

            this.setClauseInvalidity(clauseInfo.valueControl, clauseInfo.clause.index, WidgetResources.AnalyticsFieldsFilterControl_UnsupportedMacroError)
        }

    }

    private setClauseInvalidity(control: any, clauseIndex: number, errorMessage: string) {
        control.setInvalid(errorMessage);
        this.clauseErrorMessages[clauseIndex] = errorMessage;
    }

    public _handleOperatorChanged(clauseInfo: Filters.IFilterClauseInfo, oldValue: string) {
        var clause = clauseInfo.clause;
        if (clause.operator) {
            clause.operator = this._queryAdapter.getInvariantOperator(clause.operator);
        }
        this._updateValueControlEnablement(clauseInfo.valueControl, clause);

    }

    public _updateValueControlEnablement(valueControl: FieldsFilter.FieldsFilterValueControl, clause: Filters.IFilterClause) {
        if (!clause.fieldName || !clause.operator) {
            valueControl.setEnabled(false);
        }
        else {
            valueControl.setEnabled(true);
        }
    }

    public _setDirty() {
        //When the filter is modified, enable/disable the AddClause
        this._updateAddClauseVisibility();
    }

    public getClauseValue(valueControl: FieldsFilter.FieldsFilterValueControl, clause: Filters.IFilterClause): string {
        var field: WITOM.FieldDefinition = this._queryAdapter.getField(clause.fieldName);

        if (this._isIdentityPickerSupported(clause)) {
            var resolvedEntities = valueControl.getControl().getIdentitySearchResult().resolvedEntities;
            var unresolvedEntities = valueControl.getControl().getIdentitySearchResult().unresolvedQueryTokens;

            if (resolvedEntities && resolvedEntities.length === 1) {
                return WITIdentityHelpers.getUniquefiedIdentityName(resolvedEntities[0]);
            }
            else {
                var inputText = valueControl.getControl().getElement().find("input");
                return inputText.val();
            }
        }
        else {
            return valueControl.getText();
        }
    }

    public _handleFieldNameChanged(clauseInfo: Filters.IFilterClauseInfo, oldValue: string) {
        Diag.logTracePoint("AnalyticsFieldsFilterControl._onClauseChange.async.start");

        var clause = clauseInfo.clause;
        this._queryAdapter.beginEnsureFields(() => {
            var fieldName = this._queryAdapter.getInvariantFieldName(clause.fieldName, false);
            if (fieldName !== oldValue) {
                this._clearOperatorAndValueControlsIfRequired(clause, oldValue);
                if (!clauseInfo.operatorControl._disposed) {
                    this._updateOperatorControl(clauseInfo.operatorControl, clause, true);
                }
                //fieldRefNames are maintained in the clauses. So for saving purpose we need to store the fieldRefName instead of the localized displayname
                clause.fieldName = fieldName;

                // Update the Field value control based on the new fieldName selected
                if (!clauseInfo.valueControl._disposed) {
                    this._updateValueControl(clauseInfo.valueControl, clause);
                }
            }
            Diag.logTracePoint("AnalyticsFieldsFilterControl._onClauseChange.async.complete");
        });
    }

    private _updateAddClauseVisibility() {
        var element = this.getElement();
        var clausesCount = element.find(".clause.clause-row").length;
        // The Add icons at the start of each clause row.
        var addIconAnchors = element.find(".clause.clause-row .add-remove .icon-add").closest("a");
        // The last row containing Add icons and Add new clause anchor
        var addRemoveRow = element.find(".add-clause.clause-row .add-remove");

        if (clausesCount < this._options.maxClauseCount) {
            addIconAnchors.removeClass("disabled");
            this.isAddClauseDisabled = false;
        }
        else {
            addIconAnchors.addClass("disabled");
            addRemoveRow.addClass("disabled");
            this.isAddClauseDisabled = true;
        }
    }

    private _getLocalizedValue(fieldName: string, operator: string, invariantValue: string) {
        var localizedValue: string = $.trim(invariantValue);

        if (Utils_String.startsWith(localizedValue, WiqlOperators.MacroToday, Utils_String.localeIgnoreCaseComparer)) {
            localizedValue = this._queryAdapter.getLocalizedOperator(WiqlOperators.MacroToday) +
                localizedValue.substr(WiqlOperators.MacroToday.length);
        }
        else if ((Utils_String.ignoreCaseComparer(WiqlOperators.MacroMe, localizedValue) === 0) ||
            (Utils_String.ignoreCaseComparer(WiqlOperators.MacroCurrentIteration, localizedValue) === 0)) {
            localizedValue = this._queryAdapter.getLocalizedOperator(localizedValue);
        }
        else {
            var field = this._queryAdapter.getField(fieldName);
            if (field && invariantValue && field.type === WITConstants.FieldType.DateTime) {
                var date = Utils_Date.parseDateString(invariantValue, undefined, true); // show localized value
                localizedValue = this._getLocaleShortDateString(date, invariantValue.length > 10); // show the locale version of the dates
            }
        }

        return localizedValue;
    }

    private _clearOperatorAndValueControlsIfRequired(clause: Filters.IFilterClause, oldValue: string) {
        var field = this._queryAdapter.getField(clause.fieldName);
        var oldField = this._queryAdapter.getField(oldValue);

        //Clear the operator and value fields if the new fieldtype is not the same as old field type
        if (!field || this._queryAdapter.getFieldType(oldField, oldValue) !== this._queryAdapter.getFieldType(field, clause.fieldName) || (field && field.id === WITConstants.CoreField.Title) ||
            (oldField && field && field.isIdentity !== oldField.isIdentity)) {
            clause.operator = "";
            clause.value = "";
        }
    }

    private _getFieldName(fieldRefName: string) {
        var fieldName = fieldRefName;
        var fieldDef = this._queryAdapter.getField(fieldName);
        if (fieldDef) {
            fieldName = fieldDef.name;
        }
        return fieldName;
    }

    private _getSupportedOperators(operators: string[], fieldType: WITConstants.FieldType, fieldName: string): string[] {
        var filteredOperators: string[] = [];
        var predicateSupportedOperators: string[] = this._options.predicateConfig.getSupportedOperators(fieldType);

        //Tags need to behave through operators in base control. We don't support them for string types in general.
        if (fieldName === "Tags" || fieldName === "System.Tags") {
            predicateSupportedOperators = AnalyticsPredicateConfiguration.getTagOperators();[WiqlOperators.OperatorContains, WiqlOperators.OperatorNotContains];
        }

        $.each(predicateSupportedOperators, (index: number, wiqlOperator: string) => {
            var localizedEqualToOperator = this._queryAdapter.getLocalizedOperator(wiqlOperator);
            if (Utils_Array.contains(operators, localizedEqualToOperator, Utils_String.localeIgnoreCaseComparer)) {
                filteredOperators.push(localizedEqualToOperator);
            }
        });
        return filteredOperators;
    }

    private _getSupportedValues(values: any[], fieldType: WITConstants.FieldType): any[] {
        const predicateSupportedMacros: string[] = this._options.predicateConfig.getSupportedMacros(fieldType);

        const filteredValues = values.filter((value: any, index: number) => {
            let displayName = "";
            if (value) {
                displayName = value.displayName || value.name || value;
            }

            if (displayName) {
                displayName = $.trim(displayName);

                // [Any] isn't supported.
                if (Utils_String.startsWith(displayName, WITCommonResources.WiqlOperators_Any, Utils_String.ignoreCaseComparer)) {
                    return false;
                }

                // If this is a macro, it should be a supported one.
                if (Utils_String.startsWith(displayName, WiqlOperators.MacroStart)) {
                    return predicateSupportedMacros.some(macro =>
                        Utils_String.startsWith(displayName, this._queryAdapter.getLocalizedOperator(macro), Utils_String.ignoreCaseComparer));
                }
            }
            return true;
        });
        return filteredValues;
    }

    private _isIdentityPickerSupported(clause: Filters.IFilterClause): boolean {
        if (this._queryAdapter.areFieldsLoaded()) {
            var field: WITOM.FieldDefinition = this._queryAdapter.getField(clause.fieldName);

            return field && field.isIdentity &&
                !this._queryAdapter.isFieldComparisonOperator(clause.operator);
        }
        return false;
    }

    private _setSourceForOperatorControl(operators: string[], operatorControl, clause: any, updateClause?: boolean) {
        var field: WITOM.FieldDefinition;

        operators = operators || [];

        if (operators.length) {
            operators = operators.filter((operator: string, index: number) => {
                return !this._queryAdapter.isFieldComparisonOperator(operator);
            });
            operatorControl.setSource(operators);
            operatorControl.setMode(operators.length ? FieldValueControlModes.DROP : FieldValueControlModes.TEXT);
        }
        else {
            operatorControl.setSource([]);
            operatorControl.setMode(FieldValueControlModes.TEXT);
        }

        var localizedOperator = this._queryAdapter.getLocalizedOperator(clause.operator);

        if (updateClause) {
            if (clause.operator) {
                if (!Utils_Array.contains(operators, localizedOperator, Utils_String.localeIgnoreCaseComparer)) {
                    clause.operator = "";
                    clause.value = "";
                }
            }
            if (!clause.operator && operators.length) {
                field = this._queryAdapter.getField(clause.fieldName);
                localizedOperator = operators[0];
            }
        }
        clause.operator = this._queryAdapter.getInvariantOperator(localizedOperator);
        operatorControl.setText(localizedOperator || "");
    }
}