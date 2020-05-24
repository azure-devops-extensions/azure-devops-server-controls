import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import * as ProcessTemplateHttpClient from "TFS/WorkItemTracking/ProcessTemplateRestClient";
import * as Events_Action from "VSS/Events/Action";

const tfsContext = TFS_Host_TfsContext.TfsContext.getDefault();

export module ExportProcessActionCreator {
    export function exportProcess(templateTypeId: string): void {
        Events_Action.getService().performAction(Events_Action.CommonActions.ACTION_WINDOW_NAVIGATE, {
            url: getProcessExportUrl(templateTypeId)
        });
    }

    function getProcessExportUrl(templateTypeId: string): string {
        const area = "processAdmin",
            resource = "processes",
            action = "export";
        return `${tfsContext.getServiceHostUrl()}_apis/work/${area}/${resource}/${action}/${templateTypeId}`;
    }
}