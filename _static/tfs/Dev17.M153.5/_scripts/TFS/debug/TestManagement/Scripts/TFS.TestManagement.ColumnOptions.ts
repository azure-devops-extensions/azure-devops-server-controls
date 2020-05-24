
import TMUtils = require("TestManagement/Scripts/TFS.TestManagement.Utils");


import ColumnOptions = require("WorkItemTracking/Scripts/Dialogs/ColumnOptions");

let columnoptions = TMUtils.TestHubColumnOption;

export class TestManagementColumnOptionsDialog extends ColumnOptions.ColumnOptionsDialog {
    
    public createColumnInfoForField(id): any {

        let col = super.createColumnInfoForField(id), testPointFields, i;
        if (!col) {
            // it must be a testpoint field
            testPointFields = this.getTestPointFields();
            for (i = 0; i < testPointFields.length; i++) {
                if (testPointFields[i].id === parseInt(id, 10)) {
                    return {
                        name: testPointFields[i].refName,
                        text: testPointFields[i].text,
                        id: id
                    };
                }
            }
        }

        return col;
    }

    // This is used by column options dialog to return the fields info for the fields selected by the user.
    private getTestPointFields(): any[] {
        let testPointFields = [];
        testPointFields.push(columnoptions._testPointConfigurationField);
        testPointFields.push(columnoptions._testPointTesterField);
        testPointFields.push(columnoptions._testPointOutcomeField);
        testPointFields.push(columnoptions._testPointSuiteNameField);
        testPointFields.push(columnoptions._testPointSuiteIdField);
        testPointFields.push(columnoptions._testPointLastRunByField);
        testPointFields.push(columnoptions._testPointLastRunDurationField);
        testPointFields.push(columnoptions._testPointBuildField);
        testPointFields.push(columnoptions._testPointOrderField);

        return testPointFields;
    }
}



