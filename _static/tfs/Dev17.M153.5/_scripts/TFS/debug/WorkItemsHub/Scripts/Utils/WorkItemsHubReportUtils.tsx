import * as React from "react";
import * as ReactDOM from "react-dom";
import * as VSS from "VSS/VSS";
import * as Utils_Clipboard from "VSS/Utils/Clipboard";
import * as AdminSendMail_Async from "Admin/Scripts/TFS.Admin.SendMail";
import * as EmailWorkItemsModel_Async from "WorkItemTracking/Scripts/Dialogs/Models/EmailWorkItems";
import * as VSS_Resources_Platform from "VSS/Resources/VSS.Resources.Platform";
import * as Utils_Accessibility from "VSS/Utils/Accessibility";
import * as Utils_Core from "VSS/Utils/Core";
import { ProjectCollection } from "Presentation/Scripts/TFS/TFS.OM.Common";
import { WorkItemStore } from "WorkItemTracking/Scripts/TFS.WorkItemTracking";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { WorkItemHtmlTableFormatter, IWorkItemHtmlTableFormatterColumn, WorkItemHtmlTableFormatType } from "WorkItemTracking/Scripts/Utils/WorkItemHtmlTableFormatter";
import { CoreFieldRefNames } from "Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants";
import { MentionedTabDataProvider, RecentActivityConstants } from "WorkItemsHub/Scripts/Generated/Constants";
import { Callout, DirectionalHint } from "OfficeFabric/Callout";
import { IWorkItemsGridRow } from "WorkItemsHub/Scripts/DataContracts/IWorkItemsGridData";
import { WorkItemsTabContent } from "WorkItemsHub/Scripts/Components/WorkItemsTabContent";
import { ContextualMenuButton } from 'VSSUI/ContextualMenuButton';

export class WorkItemsHubReportUtils {
    private static readonly ColumnsToExclude = [
        RecentActivityConstants.MyActivityDateField,
        RecentActivityConstants.MyActivityDetailsField,
        RecentActivityConstants.RecentlyUpdatedDateField,
        MentionedTabDataProvider.MentionedDateField
    ];
    private static readonly HtmlTableFormatterType: IDictionaryStringTo<WorkItemHtmlTableFormatType> = {
        [CoreFieldRefNames.ChangedDate]: WorkItemHtmlTableFormatType.Date,
        [CoreFieldRefNames.CreatedDate]: WorkItemHtmlTableFormatType.Date,
        [CoreFieldRefNames.AssignedTo]: WorkItemHtmlTableFormatType.Identity,
        [CoreFieldRefNames.CreatedBy]: WorkItemHtmlTableFormatType.Identity
    };

    /**
     * Copy the work items to clipboard in a table format
     * @param fieldReferenceNames Fields to include
     * @param fieldFriendlyNames The friendly names which corresponds to field reference names
     * @param fieldValues List of field values
     * @param ev Optional mouse event object (from command bar if clicked, or undefined from keyboard shortcut)
     * @param targetRow Target row
     */
    public static copyWorkItemsToClipboard(
        fieldReferenceNames: string[],
        fieldFriendlyNames: string[],
        fieldValues: any[][],
        ev?: React.MouseEvent<HTMLElement>,
        targetRow?: IWorkItemsGridRow): void {

        const columns = fieldReferenceNames.map((fieldReferenceName, index) => ({
            index,
            fieldReferenceName,
            name: fieldFriendlyNames[index],
            formatType: WorkItemsHubReportUtils.HtmlTableFormatterType[fieldReferenceName]
        } as IWorkItemHtmlTableFormatterColumn));
        const filteredColumns = columns.filter(c => WorkItemsHubReportUtils.ColumnsToExclude.indexOf(c.fieldReferenceName) < 0);

        const table = new WorkItemHtmlTableFormatter(fieldValues, filteredColumns).getHtml();
        Utils_Clipboard.copyToClipboard(table, { copyAsHtml: true } as Utils_Clipboard.IClipboardOptions);
        if (ev) {
            WorkItemsHubReportUtils._showCopiedCallout(ev, targetRow);
        }
    }

    /**
     * Opens the dialog to email a table formatted list of work items
     * @param fieldReferenceNames Fields to include in the email
     * @param workItemIds IDs of work items to include in the email
     */
    public static openSendEmailDialog(fieldReferenceNames: string[], workItemIds: number[]): void {
        const tfsContext = TfsContext.getDefault();
        const connection = ProjectCollection.getConnection(tfsContext);
        const store = connection.getService<WorkItemStore>(WorkItemStore);
        const filteredFields = fieldReferenceNames.filter(f => WorkItemsHubReportUtils.ColumnsToExclude.indexOf(f) < 0);
        const options: EmailWorkItemsModel_Async.IEmailWorkItemsDialogModelOptions = {
            workItemSelectionOption: {
                workItems: workItemIds,
                fields: filteredFields,
                store: store,
                projectId: tfsContext.navigation.project // Specify project context in order to send emails with project context
            }
        };

        VSS.requireModules(["Admin/Scripts/TFS.Admin.SendMail", "WorkItemTracking/Scripts/Dialogs/Models/EmailWorkItems"]).spread(
            (AdminSendMail: typeof AdminSendMail_Async, EmailWorkItems: typeof EmailWorkItemsModel_Async) => {
                AdminSendMail.Dialogs.sendMail(new EmailWorkItems.EmailWorkItemsDialogModel(options));
            });
    }

    private static _showCopiedCallout(e: React.MouseEvent<HTMLElement>, targetRow: IWorkItemsGridRow) {
        let container = document.createElement("div");
        document.body.appendChild(container);

        const closeCallout = () => {
            if (container) {
                ReactDOM.unmountComponentAtNode(container);
                container.parentElement.removeChild(container); // Note: IE11 doesn't support remove()
                container = null;
            }
        };

        // handle keyboard event (clientX or clientY is 0 or less)
        let target: MouseEvent | HTMLElement = null;
        if (targetRow && !(e.clientX > 0 && e.clientY > 0)) {
            target = document.querySelector(
                `.${WorkItemsTabContent.GridBaseClassName} [role="row"][data-item-key="${targetRow.key}"] .${ContextualMenuButton.ButtonContainerClassName}`) as HTMLElement;
        }

        ReactDOM.render(
            <Callout target={target || e.nativeEvent} directionalHint={DirectionalHint.bottomCenter} isBeakVisible={false} onDismiss={closeCallout} className="work-items-hub-callout" >
                {VSS_Resources_Platform.CopiedContentDialogTitle}
            </Callout>,
            container);
        Utils_Core.delay(this, 500, closeCallout);
        Utils_Accessibility.announce(VSS_Resources_Platform.CopiedContentDialogTitle, true);
    }
}
