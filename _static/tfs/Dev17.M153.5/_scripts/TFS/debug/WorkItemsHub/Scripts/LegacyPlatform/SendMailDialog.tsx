import * as React from "react";
import { registerLWPComponent } from "VSS/LWP";
import * as VSS from "VSS/VSS";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { ProjectCollection } from "Presentation/Scripts/TFS/TFS.OM.Common";
import { WorkItemStore } from "WorkItemTracking/Scripts/TFS.WorkItemTracking";
import * as EmailWorkItemsModel_Async from "WorkItemTracking/Scripts/Dialogs/Models/EmailWorkItems";
import * as AdminSendMail_Async from "Admin/Scripts/TFS.Admin.SendMail";

interface ISendMailDialogProps {
    workItemIds: number[];
    fields: string[];
}

class SendMailDialog extends React.Component<ISendMailDialogProps, {}> {
    public static componentType = "sendMailDialog";

    public render(): null {
        const tfsContext = TfsContext.getDefault();
        const connection = ProjectCollection.getConnection(tfsContext);
        const store = connection.getService<WorkItemStore>(WorkItemStore);

        const options: EmailWorkItemsModel_Async.IEmailWorkItemsDialogModelOptions = {
            workItemSelectionOption: {
                workItems: this.props.workItemIds,
                fields: this.props.fields,
                store: store,
                projectId: tfsContext.navigation.project // Specify project context in order to send emails with project context
            }
        };

        VSS.requireModules(["Admin/Scripts/TFS.Admin.SendMail", "WorkItemTracking/Scripts/Dialogs/Models/EmailWorkItems"]).spread(
            (AdminSendMail: typeof AdminSendMail_Async, EmailWorkItems: typeof EmailWorkItemsModel_Async) => {
                AdminSendMail.Dialogs.sendMail(new EmailWorkItems.EmailWorkItemsDialogModel(options));
            });

        return null;
    }
}

registerLWPComponent(SendMailDialog.componentType, SendMailDialog);
