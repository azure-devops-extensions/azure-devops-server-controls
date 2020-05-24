import {BoolUtils} from "Presentation/Scripts/TFS/TFS.Core.Utils";
import Diag = require("VSS/Diag");
import {FieldType} from "Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants";
import {IFilter} from "VSS/Controls/Filters";
import {localeIgnoreCaseComparer} from "VSS/Utils/String";
import TreeView = require("VSS/Controls/TreeView");
import Array_Utils = require("VSS/Utils/Array");
import Utils_String = require("VSS/Utils/String");
import { FieldDefinition }  from "WorkItemTracking/Scripts/TFS.WorkItemTracking";

/**
 * Field change model. Expected input for bulkupdateworkitem
 */
export interface FieldChange {
    fieldName: string;
    fieldRefName: string;
    value: string;
}

/**
 * Model for multifieldcontrol. Keeps track of fields, allowed values, and field changes
 */
export class MultiFieldEditModel {
    public fields: IFilter = {};

    private _allFields: IDictionaryStringTo<FieldDefinition> = null;
    private _editableFields: IDictionaryStringTo<FieldDefinition> = null;
    private _allowedValues: IDictionaryStringTo<any[]> = {};

    /**
     * Set the collection of all possible fields
     * @param fields
     */
    public setFields(allFields: FieldDefinition[], isEditable: (field: FieldDefinition) => boolean ) {
        // Reset allFields
        this._allFields = {};
        this._editableFields = {};
        allFields.forEach((val) => {
            this._allFields[this._getFieldKey(val.name)] = val;
            if (isEditable(val)) {
                this._editableFields[this._getFieldKey(val.name)] = val;
            }
        });
    }    

    /**
     * Returns field with name lookup
     * @param name
     */
    public getField(name: string): FieldDefinition {
        if (this._allFields) {
            return this._allFields[this._getFieldKey(name)];
        }
        return null;
    }

    /**
     * Check if field is valid based on existing fields and existing changes
     * @param name
     */
    public isFieldValid(name: string): boolean {
        let valid = true;

        if (!name || !this._allFields) {
            // blank, null, or undefined. Valid until we have a fieldName to search for
            // or we do not have fields to check against
            return valid;
        }

        let field = this.getField(name);
        if (!field || !field.isEditable()) {
            // Field does not match something in our field list 
            valid = false;
        }
        else {
            //Check for duplicate field name
            let count = 0;
            this.fields.clauses.forEach((clause) => {
                if (localeIgnoreCaseComparer(clause.fieldName, name) === 0) {
                    count++;
                }
                if (count > 1) {
                    //Duplicates found
                    valid = false;
                    // Exit foreach
                    return;
                }
            });
        }
        return valid;
    }

    /**
     * Get allowed values for a given field name
     * @param fieldName
     */
    public getAllowedValues(fieldName: string): any[] {
        if (this._allFields && this._allFields.hasOwnProperty(this._getFieldKey(fieldName))) {
            return this._allowedValues[this._getFieldKey(fieldName)];
        }
        return [];
    }

    /**
     * Set allowed values for a given field name
     * @param fieldName
     * @param values
     */
    public setAllowedValues(fieldName: string, values: any[]): void {
        let isValidField = this.isFieldValid(fieldName);
        Diag.Debug.assert(isValidField, "Expected a valid field name")
        if (isValidField) {
            this._allowedValues[this._getFieldKey(fieldName)] = values;
        }
    }

    /**
     * Returns sorted field names from the difference of all possible fields and fields we have changes for
     */
    public getRemainingEditableFieldNames(): string[] {
        let remainingFieldNames: string[] = [];

        // Go through all fields
        if (this._editableFields) {
            // Create an existing field lookup
            let existingFields: IDictionaryStringTo<boolean> = {};
            this.fields.clauses.forEach((clause) => {
                existingFields[this._getFieldKey(clause.fieldName)] = true;
            });

            for (let nameKey in this._editableFields) {
                // Add fields that do not exist
                if (!existingFields[this._getFieldKey(nameKey)]) {
                    remainingFieldNames.push(this._allFields[nameKey].name);
                }
            }
            remainingFieldNames = remainingFieldNames.sort();
        }
        return remainingFieldNames;
    }

    /**
     * Returns an array of all field changes
     */
    public getFieldChanges(): FieldChange[] {
        let retVal: FieldChange[] = []
        this.fields.clauses.forEach((clause) => {
            let fieldName = $.trim(clause.fieldName);
            if (fieldName.length > 0) {
                let field = this.getField(fieldName);
                let fieldRefName = field ? field.referenceName : fieldName;
                retVal.push({ fieldName: fieldName, fieldRefName: fieldRefName, value: clause.value });
            }
        });
        return retVal;
    }

    /**
     * Checks if a value is valid for a given fieldname
     * @param fieldName
     * @param value
     */
    public isFieldValueValid(fieldName: string, value: string): boolean {
        Diag.Debug.assertIsString(fieldName, "Field name not passed in as string");
        Diag.Debug.assertIsString(value, "Field value not passed in as string");
        let isValid = true,
            field = this.getField(fieldName);

        if (!field) {
            // Field name passed in does not match field, no values to check
            return isValid;
        }

        // Note: We do not check allowed values for other field types because 
        // they may be suggested values and there isn't a way to distinguish between them.
        if (field.type === FieldType.TreePath) {
            let allowedValues = this.getAllowedValues(fieldName);
            if (!value) {
                // tree paths cannot be empty or invalid
                isValid = false;
            }
            else if (allowedValues) {
                let validTreePaths = this._getAllTreePaths(allowedValues);
                isValid = $.inArray(value, validTreePaths) >= 0;
            }
        }
        else if (field.type === FieldType.Boolean) {
            isValid = BoolUtils.isValid(value);
        }
        return isValid;
    }

    /**
     * Checks to see if the model contains valid changes
     */
    public isValid(validateFieldValues: boolean): boolean {
        let clauses = this.fields.clauses;

        if (clauses && clauses.length) {
            // Search for invalid clauses
            return !clauses.some((clause) => !this.isFieldValid(clause.fieldName) || (validateFieldValues && !this.isFieldValueValid(clause.fieldName, clause.value)));
        }
        return true;
    }

    /**
     * Adds the given fields to the model
     * @param fields Fields to Add
     */
    public populateFields(fields: FieldChange[]) {
        if (this._allFields && fields.length > 0) {
            // Create value lookup for possible values
            let fieldValuesToSetLookup: IDictionaryStringTo<string> = {};
            fields.forEach((change) => {
                fieldValuesToSetLookup[this._getFieldKey(change.fieldName)] = change.value;
                if (change.fieldRefName) {
                    fieldValuesToSetLookup[this._getFieldKey(change.fieldRefName)] = change.value;
                }
            });

            // Clear out fields before adding all
            this.fields.clauses = [];
            
            for (let fieldKey in this._allFields) {
                let field: FieldDefinition = this._allFields[fieldKey];
                if (fieldValuesToSetLookup.hasOwnProperty(this._getFieldKey(field.referenceName)) ||  fieldValuesToSetLookup.hasOwnProperty(fieldKey)) {
                    let fieldValue = fieldValuesToSetLookup[this._getFieldKey(field.referenceName)] || fieldValuesToSetLookup[fieldKey] || "";
                    this.fields.clauses.push({ logicalOperator: "", fieldName: this._allFields[fieldKey].name, operator: "", value: fieldValue, index: 0 });
                }
            }
        }
    }

    /**
     * Removes all field from model that do not have a value set 
     */
    public removeUnmodifiedFields(fieldNamesToRemove: string[]) {
        // Filter clauses to only those with values
        this.fields.clauses = this.fields.clauses.filter((clause) => !Array_Utils.contains(fieldNamesToRemove, clause.fieldName, Utils_String.ignoreCaseComparer));
    }

    /**
     * Generate consistent field name for dictionary lookups
     * @param fieldName
     */
    private _getFieldKey(fieldName: string): string {
        return $.trim(fieldName).toLocaleUpperCase();
    }

    /**
     * Gets all the tree paths used as values of a field.
     * @param treeRootNodes The root nodes of the trees.
     */
    private _getAllTreePaths(treeRootNodes: TreeView.TreeNode[]): string[] {
        Diag.Debug.assertParamIsArray(treeRootNodes, "treeRootNodes", false);
        let treePaths: string[] = [];

        // Calculates all the subtree paths of a given root node.
        function getSubTreePaths(subRootNode, parentPath) {
            Diag.Debug.assertParamIsObject(subRootNode, "subRootNode");
            Diag.Debug.assertParamIsString(parentPath, "parentPath");

            let i: number, subRootPath: string = parentPath.length > 0 ? parentPath + '\\' + subRootNode.name : subRootNode.name;

            treePaths.push(subRootPath);

            for (i = 0; i < subRootNode.children.length; i++) {
                getSubTreePaths(subRootNode.children[i], subRootPath);
            }
        }

        for (let i = 0; i < treeRootNodes.length; i++) {
            getSubTreePaths(treeRootNodes[i], "");
        }

        return treePaths;
    }
}
