/// <reference types="jquery" />
import Combos = require("VSS/Controls/Combos");
import Controls = require("VSS/Controls");

// VSS
import Filters = require("VSS/Controls/Filters");
import TreeView = require("VSS/Controls/TreeView");
import Utils_String = require("VSS/Utils/String");
import Utils_Array = require("VSS/Utils/Array");

// Notifications
import Notifications_Contracts = require("Notifications/Contracts");

// Notifications UI
import NotifResources = require("NotificationsUI/Scripts/Resources/VSS.Resources.NotificationsUI");
import NotifViewModel = require("NotificationsUI/Scripts/NotificationsViewModel");

import * as IdentityPicker from "VSS/Identities/Picker/Controls";
import * as Identities_RestClient from "VSS/Identities/Picker/RestClient";
import { IFilterClause } from "VSS/Controls/Filters";
import VSS_FormInput_Contracts = require("VSS/Common/Contracts/FormInput");
/**
 * Creates a value control of a given control type for use with FieldFilterControl
 */
export class FieldFilterValueControl extends Controls.BaseControl {
    public static enhancementTypeName: string = "tfs.fieldsFilterValueControl";
    private _selectedControl: any;
    private _containerClass: string;

    constructor(options?) {
        super(options);
    }

    /**
     * Initialize options
     * @param options
     */
    public initializeOptions(options?: any) {
        super.initializeOptions(options);
    }

    /**
     * Initialize control and add related class
     */
    public initialize() {
        super.initialize();
        this._selectedControl = null;
        this._element.addClass("field-filter-value-control");
    }

    /**
     * On change behavior, fires change option if passed in
     */
    public fireChange() {
        if (typeof this._options.change === "function") {
            this._options.change();
        }
    }

    /**
     * Creates a control of the given type with the given options.
     * @param controlType
     * @param options
     */
    public setControl(controlType: any, options?: any) {
        if (this._selectedControl) {
            this._element.empty();
            this._selectedControl.dispose();
        }
        if (this._containerClass) {
            this._element.removeClass(this._containerClass);
        }

        if (options && options.containerCssClass) {
            this._element.addClass(options.containerCssClass);
            this._containerClass = options.containerCssClass;
        }
        else {
            this._containerClass = "";
        }

        let tempOptions: any = null; // Respect the options passed through setControl call when overriding this._options
        this._selectedControl = Controls.BaseControl.createIn(controlType, this._element, $.extend(tempOptions, this._options, options));
    }

    /**
     * Returns the control
     */
    public getControl(): any {
        return this._selectedControl;
    }

    /**
     * Sets type of the control if control supports setType
     * @param type
     */
    public setType(type: string) {
        if (this._selectedControl && $.isFunction(this._selectedControl.setType)) {
            this._selectedControl.setType(type);
        }
    }

    /**
     * Sets the mode of the control if control supports setMode
     * @param mode
     */
    public setMode(mode: string) {
        if (this._selectedControl && $.isFunction(this._selectedControl.setMode)) {
            this._selectedControl.setMode(mode);
        }
    }

    /**
     * Sets the value of the control if control supports setValue
     * @param value
     */
    public setValue(value: any) {
        if (this._selectedControl && $.isFunction(this._selectedControl.setValue)) {
            this._selectedControl.setValue(value);
        }
    }

    /**
     * Gets value of the control if control supports getValue, otherwise returns ""
     */
    public getValue(): any {
        if (this._selectedControl && $.isFunction(this._selectedControl.getValue)) {
            return this._selectedControl.getValue();
        }

        return "";
    }

    /**
     * Sets the text of the control if control supports setText
     * @param text
     */
    public setText(text: string) {
        if (this._selectedControl && $.isFunction(this._selectedControl.setText)) {
            this._selectedControl.setText(text);
        }
    }

    /**
     * Returns the text of the control if control supports getText, otherwise returns ""
     */
    public getText(): string {
        if (this._selectedControl && $.isFunction(this._selectedControl.getText)) {
            return this._selectedControl.getText();
        }

        return "";
    }

    /**
     * Sets enabled state of control if control supports setEnabled
     * @param enabled
     */
    public setEnabled(enabled: boolean) {
        if (this._selectedControl) {
            if (typeof this._selectedControl.setEnabled === "function") {
                this._selectedControl.setEnabled(enabled);
            } else if (enabled && this._selectedControl.disableReadOnlyMode){
                this._selectedControl.disableReadOnlyMode();
            } else if (!enabled && this._selectedControl.enableReadOnlyMode) {
                this._selectedControl.enableReadOnlyMode();
            }
        }
    }

    /**
     * Sets invalid state of control if control supports setInvalid
     * @param invalid
     */
    public setInvalid(invalid: boolean) {
        if (this._selectedControl && $.isFunction(this._selectedControl.setInvalid)) {
            this._selectedControl.setInvalid(invalid);
        }
    }

    /**
     * Sets source of control if control supports setSource
     * @param source
     */
    public setSource(source: any[]) {
        if (this._selectedControl && $.isFunction(this._selectedControl.setSource)) {
            this._selectedControl.setSource(source);
        }
    }
}

export interface AlertFilterControlOptions extends Filters.IFilterControlOptions {
    tfsContext?: any;
}

export class AlertFilterControl extends Filters.FilterControlO<AlertFilterControlOptions> {

    public static enhancementTypeName: string = "tfs.alerts.AlertFilter";

    private _alertsManager: any;
    private _subscription: any;
    private _eventTypeInfo: Notifications_Contracts.NotificationEventType;
    private _fields: { [key: string]: Notifications_Contracts.NotificationEventField; };
    private _isTeam: boolean;
    private _deliverToTeamAlias;
    private _FieldsInputValues: any;
    private _viewModel: NotifViewModel.NotificationsViewModel;
    private _criteria: Notifications_Contracts.ExpressionFilterModel;
    private static readonly GROUP_OPERATORS = [ "Member of" ];
    private static readonly IDENTITY_OPERATORS = [ "Member of" ];
    private static readonly RESOLVED_INPUT_REMOVED_EVENT = 'identity-picker-resolved-input-removed';

    constructor(options?) {
        super(options);
    }

    public initializeOptions(options?: any) {
        /// <param name="options" type="any" />

        super.initializeOptions($.extend({
            coreCssClass: "alerts-filter"
        }, options));
    }

    public initialize() {
        super.initialize();
    }

    public setAlert(
        alert,
        eventType: Notifications_Contracts.NotificationEventType,
        fieldsInputValues,
        isTeam: boolean,
        deliveryToTeamAlias: boolean,
        viewModel: NotifViewModel.NotificationsViewModel,
        tfsContext) {

        this._viewModel = viewModel
        this._subscription = alert;
        this._eventTypeInfo = eventType;
        this._fields = $.extend(true, {}, this._eventTypeInfo.fields);
        this._isTeam = isTeam;
        this._deliverToTeamAlias = deliveryToTeamAlias;
        this.FilterOutFields(fieldsInputValues);
        this.setCriteria(alert.filter.criteria);
    }
    
    /**
     * Override
     * Creates clause value control in given container with given options
     * @param container
     * @param options
     */
    public createClauseValueControl(container: JQuery, options?: any): FieldFilterValueControl {
        const valueControl = <FieldFilterValueControl>Controls.BaseControl.createIn(FieldFilterValueControl, container, Object.assign({maxAutoExpandDropWidth: 300 }, options));
        AlertFilterControl._setUpCommonComboControl(valueControl);
        return valueControl;
    }
    
    public setCriteria(criteria: Notifications_Contracts.ExpressionFilterModel) {
        this._criteria = $.extend(true, {}, criteria);
        this._filterCriteria();
        this.setFilter(this._criteria);
    }

    public getCriteria() {
        return this._criteria;
    }

    public setReadOnly(readOnly: boolean) {
        this._options.readOnly = readOnly;
        this._options.enableRowAddRemove = !readOnly;
        this.setFilter(this._criteria);
    }

    public setTeamDeliveryType(deliverToTeamAlias: boolean) {
        this._deliverToTeamAlias = deliverToTeamAlias;
    }

    public isValid() {
        var valid = true;
        for (var index in this._criteria.clauses) {
            var clauseInfo: Filters.IFilterClauseInfo = <Filters.IFilterClauseInfo>{ clause: this._criteria.clauses[index] };
            valid = this._validateClause(clauseInfo);
            if (!valid) {
                return false;
            }
        }
        return true;
    }

    public _getDefaultClause() {
        /// <summary>Get the default clause for this filter.</summary>
        return { logicalOperator: NotifResources.OperatorAnd, fieldName: "", operator: "=", value: "", index: 0 };
    }

    public _updateAndOrControl(andOrControl: any, clause: any) {
        /// <summary>Update the and/or dropdown based on the given clause</summary>
        /// <param name="andOrControl" type="Object">The control to be updated.</param>
        /// <param name="clause" type="Object">The clause associated with the control.</param>
        andOrControl.setText(clause.logicalOperator);
        andOrControl.setSource([NotifResources.OperatorAnd, NotifResources.OperatorOr]);
    }

    public _updateFieldControl(fieldControl: any, clause: any) {
        /// <summary>Update the field dropdown based on the given clause</summary>
        /// <param name="fieldControl" type="Object">The control to be updated.</param>
        /// <param name="clause" type="Object">The clause associated with the control.</param>

        var fieldNames = [];

        if (!fieldControl._disposed) {

            for (var field in this._fields) {
                var fieldInfo = this._fields[field];
                fieldNames.push(fieldInfo.name);
            }
            fieldControl.setSource(fieldNames);
            fieldControl.setMode(fieldNames.length > 0 ? "drop" : "text");
            fieldControl.setText(clause.fieldName);
        }
    }

    public _updateOperatorControl(operatorControl: any, clause: any, updateClause?: boolean) {
        /// <summary>Update the operator dropdown based on the given clause</summary>
        /// <param name="operatorControl" type="Object">The control to be updated.</param>
        /// <param name="clause" type="Object">The clause associated with the control.</param>
        /// <param name="updateClause" type="Boolean" optional="true">True to update the clause with the new operator/value.</param>

        function setSource(operators) {
            operators = operators || [];

            if (operators.length) {
                operatorControl.setSource(operators);
                operatorControl.setMode("drop");
            }
            else {
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
                    clause.operator = operators[0];
                }
            }

            operatorControl.setText(clause.operator || "");
        }


        if (clause.fieldName) {
            var fieldInfo = this._getFieldInfo(clause.fieldName)
            if (fieldInfo) {
                setSource(fieldInfo.fieldType.operators.map(function (op) { return op.displayName; }));
            }
            else {
                setSource(["="]);
            }
        }
        else {
            setSource(["="]);
        }
    }

    private _filterCriteria() {
        if (this._criteria.clauses) {
            for (const clause of this._criteria.clauses) {
                if (this._isIdentityPickerSupportedForClause(clause)) {
                    if (clause.value === '[Me]') {
                        clause.value = this._viewModel.getSubscriber().id;
                    }
                } else if (this._isTeam && clause.value === '[Me]') {
                    clause.value = '[Member]';
                }
            }
        }
    }

    private _setFieldsPossibleValues(fieldsInputValues) {
        this._FieldsInputValues = fieldsInputValues;
        this._filterOutFieldsPossibleValues();

        if (!this._eventTypeInfo.fields || Object.keys(this._eventTypeInfo.fields).length == 0) {
            this._eventTypeInfo.fields = this._FieldsInputValues;
            this._fields = { ...this._FieldsInputValues };
        }
        else {
            this._populateFieldsPossibleValues();
        }
    }

    private _populateFieldsPossibleValues() {
        for (var field in this._fields) {
            var fieldInfo = this._fields[field];
            // Null check to avoid exceptions when this is called too early before querying for fields values
            if (fieldInfo && fieldInfo.fieldType && fieldInfo.fieldType.value) {
                var fieldInputId = fieldInfo.path;
                fieldInfo.fieldType.value.dataSource = this._getFieldPossibleValues(fieldInputId);
            }
        }
    }

    private _getFieldPossibleValues(fieldInputId) {
        if (this._FieldsInputValues) {
            for (var index in this._FieldsInputValues) {
                if (this._FieldsInputValues[index].path && this._FieldsInputValues[index].path.toLowerCase() == fieldInputId.toLowerCase() && this._FieldsInputValues[index].fieldType.value) {
                    return this._FieldsInputValues[index].fieldType.value.dataSource;
                }
            }
        }
        return null;
    }

    private _getFieldInfo(fieldName: string): Notifications_Contracts.NotificationEventField {
        for (var field in this._fields) {
            var fieldInfo = this._fields[field];
            if (fieldInfo.name.toLowerCase() == fieldName.toLowerCase()) {
                return fieldInfo;
            }
        }
        return null;
    }

    // Filters out the possible values for fields based on our selections
    // For example: in team subscriptions, if the user selects to send to team alias then
    // identity fields would not show the @Me macro 
    private _filterOutFieldsPossibleValues() {
        for (let field of this._FieldsInputValues) {
            this._filterOutFieldPossibleValues(field);
        }
    }

    private _filterOutFieldPossibleValues(field: Notifications_Contracts.NotificationEventField) {
        if (!field.fieldType.value) {
            return;
        }

        if (this._isTeam) {
            this._filterOutTeamPossibleValues(field);
        }
    }

    private _filterOutTeamPossibleValues(field: Notifications_Contracts.NotificationEventField) {
        if (this._deliverToTeamAlias) {
            AlertFilterControl._filterOutMeValues(field);
        } else {
            AlertFilterControl._changeMeToMember(field);
        }
    }

    private static _changeMeToMember(field: Notifications_Contracts.NotificationEventField) {
        const possibleValues = field.fieldType.value.dataSource;
        for (const valueObj of possibleValues) {
            if (valueObj.value === "[Me]") {
                valueObj.displayValue = '[Member]';
            }
        }
    }

    private static _filterOutMeValues(field: Notifications_Contracts.NotificationEventField) {
        const filteredPossibleValues = [];
        const possibleValues = field.fieldType.value.dataSource;

        for (const valueObj of possibleValues) {
            if (valueObj.value !== "[Me]") {
                filteredPossibleValues.push(valueObj);
            }
        }

        field.fieldType.value.dataSource = filteredPossibleValues;
    }
    
    // filters out the available fields based on the selected scope
    public FilterOutFields(fieldsInputValues) {
        var scope: string = "collection";
        if (this._subscription.scope && this._subscription.scope.id != CollectionScope && this._subscription.scope.id != Utils_String.EmptyGuidString) {
            scope = "project";
        }

        var filteredFields: { [key: string]: Notifications_Contracts.NotificationEventField; } = {};
        for (var index in this._eventTypeInfo.fields) {
            if (this._doesFieldSupportScope(index, scope)) {
                filteredFields[index] = this._eventTypeInfo.fields[index];
            }
        }
        this._fields = filteredFields;
        this._setFieldsPossibleValues(fieldsInputValues);
    }

    private _doesFieldSupportScope(index, scope) {
        var doesFieldSupportScopes = this._doesFieldHaveScopes(index);
        return (!doesFieldSupportScopes || this._eventTypeInfo.fields[index].supportedScopes.indexOf(scope) > -1);
    }

    private _doesFieldHaveScopes(index) {
        return (this._eventTypeInfo.fields[index].supportedScopes && this._eventTypeInfo.fields[index].supportedScopes.length > 0)
    }
    
    private static getCommonIdentityPickerOptions(
        items: string | Identities_RestClient.IEntity[],
        enableUsers: boolean,
        onItemSelect: (entity: Identities_RestClient.IEntity) => void): IdentityPicker.IIdentityPickerSearchOptions {

        return {
            items,
            multiIdentitySearch: false,
            identityType: { User: enableUsers, Group: true },
            operationScope: { IMS: true },
            consumerId: '',
            size: IdentityPicker.IdentityPickerControlSize.Medium,
            callbacks: { onItemSelect }
        };
    }
    
    private static isGroupOperator(operator: string): boolean {
        return AlertFilterControl.GROUP_OPERATORS.indexOf(operator) !== -1;
    }

    private static isIdentityOperator(operator: string): boolean {
        return AlertFilterControl.IDENTITY_OPERATORS.indexOf(operator) !== -1;
    }
    
    private static _setUpCommonIdentityControl(valueControl: FieldFilterValueControl, clause: IFilterClause) {

        const containerCssClass = "identity-picker-container";
        const enableUsers = !AlertFilterControl.isGroupOperator(clause.operator);

        const commonIdentityPickerOptions = AlertFilterControl.getCommonIdentityPickerOptions(
            clause.value,
            enableUsers,
            () => valueControl.fireChange());
        
        commonIdentityPickerOptions["containerCssClass"] = containerCssClass;
        commonIdentityPickerOptions["consumerId"] = "78379551-82F5-48A3-9AC5-6A810CB22599";
        commonIdentityPickerOptions["ariaLabel"] = Utils_String.format("Search users and groups for field {0}", clause && clause.fieldName ? clause.fieldName : "");
        
        valueControl.setControl(IdentityPicker.IdentityPickerSearchControl, commonIdentityPickerOptions);

        const inputText = valueControl.getControl().getElement().find("input");
        inputText.on('input', () => {
            // on each key type, we want to dirty the query
            valueControl.fireChange();
        });

        // when the selected identity is cleared, we need to clear the filter
        valueControl.getControl()._bind(AlertFilterControl.RESOLVED_INPUT_REMOVED_EVENT, (e: Event, removedbyClose: boolean) => {
            if (removedbyClose) {
                clause.value = '';
            }
        });
    }

    private static _setUpCommonComboControl(valueControl: FieldFilterValueControl, clause?: IFilterClause) {
        valueControl.setControl(Combos.Combo);
        valueControl.setText(clause ? clause.value : '');
    }

    public getClauseValue(valueControl: FieldFilterValueControl, clause: IFilterClause): string {
        if (this._isIdentityPickerSupportedForClause(clause)) {
            const control: IdentityPicker.IdentityPickerSearchControl = valueControl.getControl();
            
            // TODO multilpleValueOperator logic not implemented
            const resolvedIdentities = control.getIdentitySearchResult().resolvedEntities;
            
            if (resolvedIdentities && resolvedIdentities.length === 1) {
                return resolvedIdentities[0].localId;
            } else {
                const inputText = control.getElement().find('input');
                return inputText.val();
            }
        } else {
            return valueControl.getText();
        }
    }

    public _updateValueControl(valueControl: any, clause: any) {
        /// <summary>Update the value dropdown based on the given clause</summary>
        /// <param name="valueControl" type="Object">The control to be updated.</param>
        /// <param name="clause" type="Object">The clause associated with the control.</param>
        
        let fieldValues: VSS_FormInput_Contracts.InputValue[];
        let fieldInfo = this._getFieldInfo(clause.fieldName);
        // if we could not find the info of that field in the event definition then set the value as is
        if (!fieldInfo) {
            this._updateValueControlEnablement(valueControl, clause);
            valueControl.setText(clause.value);
            return;
        }
        
        if (this._isIdentityPickerSupportedForClause(clause)) {
            AlertFilterControl._setUpCommonIdentityControl(valueControl, clause);
        } else {
            AlertFilterControl._setUpCommonComboControl(valueControl, clause);
        }
        this._updateValueControlEnablement(valueControl, clause);
        this._populateFieldsPossibleValues();        
        
        if (fieldInfo && fieldInfo.fieldType && fieldInfo.fieldType.value && fieldInfo.fieldType.value.dataSource) {
            fieldValues = fieldInfo.fieldType.value.dataSource;
            this._refeshValueControlForSpecialTypes(valueControl, clause, fieldValues, fieldInfo.fieldType.id);
        } else {
            this._viewModel.getFieldInputValues(this._subscription, fieldInfo, (values: Notifications_Contracts.NotificationEventField[]) => {
                let fieldTypeId;
                if (values && values.length > 0 && values[0].fieldType && values[0].fieldType.value) {
                    fieldInfo.fieldType.value = values[0].fieldType.value;
                    this._filterOutFieldPossibleValues(fieldInfo);
                    fieldValues = values[0].fieldType.value.dataSource;
                    fieldTypeId = values[0].fieldType.id;
                }
                else {
                    fieldTypeId = fieldInfo.fieldType.id;
                }
                this._refeshValueControlForSpecialTypes(valueControl, clause, fieldValues, fieldTypeId);
            });
        }
    }

    private _setDropdownItems(valueControl, values) {
        if (values && values.length > 0) {
            valueControl.setType("list");
            valueControl.setMode("drop");
            valueControl.setSource(values);
        }
        else {
            valueControl.setType("list");
            valueControl.setMode("text");
            valueControl.setSource([]);
        }
    }

    private _logProperties(objectValue: any) {
        for (var x in objectValue) {
            console.warn("Property: " + x + ", Value: " + objectValue[x]);
        }
    }

    private _formatValues(values) {
        var formattedValues = [];
        var i;
        for (i = 0; i < values.length; i++) {
            if (typeof values[i] == "object") {
                if (values[i].displayValue && values[i].displayValue !== "") {
                    formattedValues.push(values[i].displayValue);
                }
                else {
                    this._logProperties(values[i]);
                    formattedValues.push(values[i]);
                }
            }
            else {
                formattedValues.push(values[i]);
            }
        }
        return formattedValues;
    }

    private _refeshValueControlForSpecialTypes(valueControl, clause, fieldValues, fieldType) {

        if (valueControl._disposed) {
            return;
        }

        if (fieldType === "TreePath") {
            var that = this;
            valueControl.setType("tree");
            valueControl.setMode("drop");
            valueControl.setSource(function () {
                function populateUINodes(fieldValues) {
                    var root: TreeView.TreeNode;
                    for (var index in fieldValues) {
                        var treePath = fieldValues[index].displayValue;
                        var parts = treePath.split("\\");
                        if (parts && parts.length == 1) {
                            root = TreeView.TreeNode.create(treePath);
                        }
                        else {
                            var parentNode: TreeView.TreeNode = that._findParentByPath(root, treePath);
                            if (parentNode) {
                                var newUINode: TreeView.TreeNode = TreeView.TreeNode.create(parts[parts.length - 1]);
                                parentNode.add(newUINode);
                            }
                        }
                    }
                    return root;
                }
                var values = [];
                values.push(fieldValues[0]);
                return $.map(values, function (node) {
                    return populateUINodes(fieldValues);
                });
            });
        }
        else {
            if (!fieldValues) {
                fieldValues = [];
            }
            if (fieldValues.length > 0) {
                valueControl.setType("list");
                valueControl.setMode("drop");
                valueControl.setSource(this._formatValues(fieldValues));
                valueControl.setText(clause.value);
            }
            else {
                valueControl.setType("list");
                valueControl.setMode("text");
                valueControl.setSource([]);
            }
        }
        valueControl.setText(clause.value);
    }

    private _findParentByPath(parentNode, nodePath: string) {
        var i = 0;
        var j: number;
        var k: number;
        var level = 0;          // Relative to parent node.
        var nodes = [];     // Nodes in this level to consider.
        var newNodes = [];  // Temporary holding for next level of nodes to consider.
        var foundNode;   // Latest found node.
        var pathSegments: string[];

        // Normalize & split the path.
        nodePath = nodePath.replace(/^(\s|\u00A0|\\)+|(\s|\u00A0|\\)+$/g, "");  // Trim space & '\'.
        pathSegments = nodePath.toUpperCase().split("\\");

        // Starting with the parent node, traverse each level.
        // As long as we have nodes to consider and path segments to find...
        nodes = [parentNode];
        while (nodes && nodes.length > 0 && i < (pathSegments.length - 1)) {
            foundNode = null;
            newNodes = null;
            for (j = 0, k = nodes.length; j < k; j++) {
                if (nodes[j].text.toUpperCase() === pathSegments[i]) {
                    foundNode = nodes[j];
                    newNodes = foundNode.children;
                    i++;
                    break;
                }
            }

            nodes = newNodes;
        }

        // As long as we found all the segments, return the last found node.
        if ((i + 1) === pathSegments.length) {
            return foundNode;
        } else {
            return null;
        }
    }

    public _validateClause(clauseInfo: any) {
        /// <summary>Validate the given clause.</summary>
        /// <param name="clauseInfo" type="Object">The clause info.</param>
        var clause = clauseInfo.clause;
        var fieldInvalid = true;
        var operatorInvalid = true;

        if (!clause.fieldName || !clause.operator) {
            fieldInvalid = false;
            operatorInvalid = false;
        }
        else {
            var field = this._getFieldInfo(clause.fieldName);
            if (field) {
                fieldInvalid = false;
                var operators = field.fieldType.operators ? field.fieldType.operators.map(function (op) { return op.displayName; }) : [];
                if (Utils_Array.contains(operators, clause.operator, Utils_String.localeIgnoreCaseComparer)) {
                    operatorInvalid = false;
                }
                else {
                    operatorInvalid = true;
                }
            }
            else {
                fieldInvalid = true;
                operatorInvalid = false;
            }
        }
        if (clauseInfo.fieldNameControl) {
            clauseInfo.fieldNameControl.setInvalid(fieldInvalid);
            clauseInfo.operatorControl.setInvalid(operatorInvalid);
        }
        return !fieldInvalid && !operatorInvalid;
    }

    public _handleFieldNameChanged(clauseInfo: any, oldValue: string) {
        /// <summary>Handler called when the field name control's value is changed.</summary>
        /// <param name="clauseInfo" type="Object">The clause info.</param>
        /// <param name="oldValue" type="String">The old field name.</param>
        var clause = clauseInfo.clause;
        var currentField = this._getFieldInfo(clause.fieldName);
        var prevField = this._getFieldInfo(oldValue);

        // If the new field value is not a known/valid field, then don't touch the operator or value
        if (currentField) {
            if (!currentField || !prevField || currentField.fieldType !== prevField.fieldType) {
                clause.operator = "";
                clause.value = "";
                this._updateOperatorControl(clauseInfo.operatorControl, clause, true);
            }
            else {
                this._updateOperatorControl(clauseInfo.operatorControl, clause, true);
            }
            this._updateValueControl(clauseInfo.valueControl, clause);
        }
    }
    
    private static _isIdentitySupportedForField(field: any): boolean {
        return field && field.fieldType.id === "ms.vss-notifications.identity-ref-field-type";
    }

    private _isIdentityPickerSupportedForClause(clause: IFilterClause): boolean {
        const field = this._getFieldInfo(clause.fieldName);
        return AlertFilterControl._isIdentitySupportedForField(field) && AlertFilterControl.isIdentityOperator(clause.operator);
    }

    public _handleOperatorChanged(clauseInfo: any, oldValue: string) {
        /// <summary>Handler called when the operator control's value is changed.</summary>
        /// <param name="clauseInfo" type="Object">The clause info.</param>
        /// <param name="oldValue" type="String">The old operator value.</param>
        const that = this, clause = clauseInfo.clause;
        let fieldInfo = this._getFieldInfo(clause.fieldName);
        if (Utils_String.localeIgnoreCaseComparer(clause.operator, NotifResources.OperatorChanges) === 0 ||
            AlertFilterControl.isGroupOperator(oldValue) !== AlertFilterControl.isGroupOperator(clause.operator) ||
            AlertFilterControl._isIdentitySupportedForField(fieldInfo) && AlertFilterControl.isIdentityOperator(clause.operator) !== AlertFilterControl.isIdentityOperator((oldValue))) {
            clause.value = "";
            that._updateValueControl(clauseInfo.valueControl, clause);
        }
        else {
            this._updateValueControlEnablement(clauseInfo.valueControl, clauseInfo.clause);
        }
    }

    public _updateValueControlEnablement(valueControl, clause) {
        if (!clause.fieldName || this._options.readOnly || !clause.operator || Utils_String.localeIgnoreCaseComparer(clause.operator, "Changes") === 0) {
            valueControl.setEnabled(false);
        }
        else {
            valueControl.setEnabled(true);
        }
    }

    public _setDirty() {
        /// <summary>Mark this filter as dirty.</summary>
        this._subscription.dirty = true;
        this._fire("subscriptionFilterChanged");
    }
}
export const CollectionScope: string = "00000000-0000-636f-6c6c-656374696f6e";

enum ScopeValue {
    Project = 0,
    Collection = 1
}