import ColumnOptionHelper = require("TestManagement/Scripts/TFS.TestManagement.ColumnOptionHelper");
import TCMLite = require("TestManagement/Scripts/TFS.TestManagement.Lite");
import TMUtils = require("TestManagement/Scripts/TFS.TestManagement.Utils");
import WITOM = require("WorkItemTracking/Scripts/TFS.WorkItemTracking");
let TestCaseCategoryUtils = TMUtils.TestCaseCategoryUtils;
let WITUtils = TMUtils.WorkItemUtils;

export class WorkItemColumnHelper {

    /**
     * Get Additional work item columns which are selected in column options
     * @param savedColumns
     * @param callback
     * @param errorCallback
     */
    public static beginGetAdditionalWorkItemFields(savedColumns: TCMLite.ITestPointGridDisplayColumn[], callback: IResultCallback, errorCallback?: IErrorCallback) {
        let fieldsToShow: WITOM.FieldDefinition[] = [];

        this.getAvailableColumns((fields: WITOM.FieldDefinition[]) => {
            $.each(fields, (i, field) => {
                if (field.hasOwnProperty("referenceName") &&
                    this.isSelectedInColumnOptions(savedColumns, field.referenceName)) {
                    fieldsToShow.push(field);
                }
            });

            fieldsToShow = this.updateOrderAsColumns(savedColumns, fieldsToShow);
            callback(fieldsToShow);
        }, errorCallback);
    }

    private static updateOrderAsColumns(savedColumns: TCMLite.ITestPointGridDisplayColumn[], additionalFields: WITOM.FieldDefinition[]): WITOM.FieldDefinition[] {
        let fieldNameToFieldMap: { [key: string]: WITOM.FieldDefinition; } = {},
            fieldsArray: WITOM.FieldDefinition[] = [];

        for (let i = 0, len = additionalFields.length; i < len; i++) {
            fieldNameToFieldMap[additionalFields[i].referenceName] = additionalFields[i];
        }

        for (let i = 0, length = savedColumns.length; i < length; i++) {
            let field = fieldNameToFieldMap[savedColumns[i].name];
            if (field) {
                fieldsArray.push(field);
            }
        }

        return fieldsArray;
    }

    /**
     * Gets the available columns based on the work item types that are displayed in the grid.
     * @param callback The callback that will be fired when the column information is successfully retrieved
     * @param errorCallback callback in case of error
     */
    private static getAvailableColumns(callback: IResultCallback, errorCallback?: IErrorCallback) {
        let additionalFields,
            fields,
            that = this;

        TestCaseCategoryUtils.getAllTestCaseCategoryWorkItemFields(function (witFields: WITOM.FieldDefinition[]) {
            additionalFields = ColumnOptionHelper.ColumnOptions.getRemovableTestPointFields(),
                fields = $.map(witFields, function (item: any) {
                    item.fieldId = item.id;
                    if (!ColumnOptionHelper.ColumnOptions.isFixedField(item) && !ColumnOptionHelper.ColumnOptions.isHiddenField(item)) {
                        return item;
                    }
                });
            fields = additionalFields.concat(fields);
            callback(fields);
        }, errorCallback);
    }

    private static isSelectedInColumnOptions(savedColumns: TCMLite.ITestPointGridDisplayColumn[], fieldReferenceName: string): boolean {
        for (let i = 0, length = savedColumns.length; i < length; i++) {
            if (fieldReferenceName === savedColumns[i].name) {
                return true;
            }
        }

        return false;
    }
}