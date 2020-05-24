import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import WITBulkEdit = require("WorkItemTracking/Scripts/TFS.WorkItemTracking.Controls.BulkEdit");
import Dialogs = require("VSS/Controls/Dialogs");

export class BulkEditTestCases {
    public _bulkEditTestCases(testCaseIds: number[], projectTypeMapping: IDictionaryStringTo<string[]>) {
        let options = {
            workItemIds: testCaseIds,
            width: 600,
            minWidth: 450,
            height: 450,
            minHeight: 300,
            attachResize: true,
            tfsContext: TFS_Host_TfsContext.TfsContext.getDefault(),
            okCallback: function (dialogResult) {
                let bulkOptions = {
                    container: this._element
                };

                WITBulkEdit.bulkUpdateWorkItems(TFS_Host_TfsContext.TfsContext.getDefault(),
                    dialogResult.workItemIds,
                    dialogResult.changes,
                    bulkOptions);
            },
            projectTypeMapping: projectTypeMapping
        };

        Dialogs.show(WITBulkEdit.BulkEditWorkItemDialog, options);
    }
}