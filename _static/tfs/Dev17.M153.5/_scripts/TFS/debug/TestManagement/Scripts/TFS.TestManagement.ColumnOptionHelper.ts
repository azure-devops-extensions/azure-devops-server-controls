import * as Q from "q";

import { TestManagementColumnOptionsDialog } from "TestManagement/Scripts/TFS.TestManagement.ColumnOptions";
import * as Resources from "TestManagement/Scripts/Resources/TFS.Resources.TestManagement";

import { TestHubColumnOption, TestCaseCategoryUtils } from "TestManagement/Scripts/TFS.TestManagement.Utils";
import { WorkItemStore, FieldDefinition } from "WorkItemTracking/Scripts/TFS.WorkItemTracking";
import { FieldFlags } from "WorkItemTracking/Scripts/OM/WorkItemConstants";

import { show } from "VSS/Controls/Dialogs";
import { FieldType, CoreField, CoreFieldRefNames} from "Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { ProjectCollection } from "Presentation/Scripts/TFS/TFS.OM.Common";

export class ColumnOptions {
    /**
     * Shows the column options dialog box.
     */
    public static showColumnOptions(options?) {
        show(TestManagementColumnOptionsDialog, $.extend(options, {
            width: 560,
            minHeight: 300,
            height: 350,
            simpleMode: true,
            getAvailableColumns: options.getAvailableColumns,
            cssClass: "column-options-host simple",
            initialFocusSelector: "select",
            okCallback: options.okCallback,
            url: options.tfsContext.getActionUrl("columnOptions", "wit", { area: "api", simpleMode: true, includeLanguage: true })
        }));
    }

    /**
     * Get all the display column which are not hidden or fixed.
     */
    public static getDisplayColumns(allGridColumns : any[]): any[] {
        return $.map(allGridColumns, (column) => {
            if (!column.hidden && !ColumnOptions.isFixedField(column)) {
                return column;
            }
        });
    }

    /**
     * Gets the available columns based on the work item types that are displayed in the grid.
     * @param callback : The callback that will be fired when the column information is successfully retrieved
     * @param errorCallback 
     * @returns {} 
     */
    public static  getAvailableColumns(callback: IResultCallback, errorCallback?: IErrorCallback) {

        let additionalFields,
            fields,
            that = this;

        TestCaseCategoryUtils.getAllTestCaseCategoryWorkItemFields(function (witFields: FieldDefinition[]) {
            additionalFields = ColumnOptions.getRemovableTestPointFields(),
            fields = $.map(witFields, function (item: any) {
                item.fieldId = item.id;
                if (!ColumnOptions.isFixedField(item) && !ColumnOptions.isHiddenField(item)) {
                    return item;
                }
            });
            fields = additionalFields.concat(fields);
            callback(fields);
        }, errorCallback);
    }

    public static getAvailableColumnsAsFieldDefinitions(): IPromise<FieldDefinition[]> {
        const deferred = Q.defer<FieldDefinition[]>();
        const tfsContext = TfsContext.getDefault();
        const projectId = tfsContext.navigation.projectId;
        const store = ProjectCollection.getConnection(tfsContext).getService<WorkItemStore>(WorkItemStore);

        const additionalFields = ColumnOptions.getRemovableTestPointFields().map(af => new FieldDefinition(store, {
            id: af.id,
            name: af.name,
            referenceName: af.refName,
            type: null,
            flags: FieldFlags.Queryable,
            usages: null,
            isIdentity: false,
            isHistoryEnabled: false
        }));
        TestCaseCategoryUtils.getAllTestCaseCategoryWorkItemFields((witFields: FieldDefinition[]) => {
            let fields = witFields.filter(f => !ColumnOptions.isFixedField(f) && !ColumnOptions.isHiddenField(f));
            fields = additionalFields.concat(fields);

            deferred.resolve(fields);
        }, deferred.reject);

        return deferred.promise;
    }

    public static getRemovableTestPointFields(): any[] {
        let testPointFields = [];
        testPointFields.push(TestHubColumnOption._testPointConfigurationField);
        testPointFields.push(TestHubColumnOption._testPointTesterField);
        testPointFields.push(TestHubColumnOption._testPointSuiteIdField);
        testPointFields.push(TestHubColumnOption._testPointSuiteNameField);
        testPointFields.push(TestHubColumnOption._testPointLastRunByField);
        testPointFields.push(TestHubColumnOption._testPointLastRunDurationField);
        testPointFields.push(TestHubColumnOption._testPointBuildField);
        return testPointFields;
    }

    /**
     * Returns if the given feild is fixed or not. Returns true if given feild is fixed.
     */
    public static isFixedField(field): boolean {
        const fixedFields = this.getFixedFields();
        const id = field.fieldId || field.id; // This function works for both FieldDefinition and GridColumn parameters, so we have to check both the properties

        for (let fixedField of fixedFields) {
            if (id === fixedField.id) {
                return true;
            }
        }

        return false;
    }

    /**
     * Returns if the given feild is hidden or not. Returns true if given feild is hidden . Else returns false.
     */
    public static isHiddenField(field: any): boolean {
        let i: number,
            length = this.hiddenRefNames.length;

        if (field.type === FieldType.Html) {
            return true;
        }

        for (i = 0; i < length; i++) {
            if (field.referenceName === this.hiddenRefNames[i]) {
                return true;
            }
        }
        return false;
    }

    private static getFixedFields(): any[] {
        let workItemFields = [
            {
                id: CoreField.Id,
                text: Resources.TestPointGridColumnID,
                name: CoreFieldRefNames.Id
            },
            {
                id: CoreField.Title,
                text: Resources.TestPointGridColumnTitle,
                name: CoreFieldRefNames.Title
            }], fields = [];

        fields.push(TestHubColumnOption._testPointOutcomeField);
        fields.push(TestHubColumnOption._testPointOrderField);
        fields = fields.concat(workItemFields);
        return fields;
    }

    private static hiddenRefNames = ["System.History"];
}