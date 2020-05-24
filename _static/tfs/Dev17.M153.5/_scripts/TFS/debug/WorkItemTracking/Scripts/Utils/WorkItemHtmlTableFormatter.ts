import { CoreFieldRefNames } from "Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { ActionUrl } from "WorkItemTracking/Scripts/ActionUrls";
import { HtmlTableFormatter, IHtmlTableFormatterColumn } from "VSS/Utils/HtmlTableFormatter";
import * as Utils_Array from "VSS/Utils/Array";
import * as Utils_String from "VSS/Utils/String";
import * as Utils_Core from "VSS/Utils/Core";
import { convertWorkItemIdentityRefFromFieldValue, isWorkItemIdentityRef, isIdentityRef } from "WorkItemTracking/Scripts/Utils/WorkItemIdentityHelper";
import { WorkItemIdentityRef } from "WorkItemTracking/Scripts/OM/WorkItemInterfaces";

export enum WorkItemHtmlTableFormatType {
    PlainText = 0,
    Date = 1,
    Identity = 2
}

/**
 * Interface for a work item HTML table formatter column
 */
export interface IWorkItemHtmlTableFormatterColumn extends IHtmlTableFormatterColumn {
    /**
     * Field reference name of the column
     */
    fieldReferenceName: string;

    /**
     * Format type for the column
     */
    formatType: WorkItemHtmlTableFormatType
}

/**
 * Work Item HTML table formatter that takes in columns and list of row values
 */
export class WorkItemHtmlTableFormatter extends HtmlTableFormatter {
    private _tfsContext: TfsContext;

    constructor(rows: string[][], columns: IWorkItemHtmlTableFormatterColumn[]) {
        super(rows, columns.map(c => ({ ...c, isValueHtml: WorkItemHtmlTableFormatter.isHtmlField(c.fieldReferenceName) } as IWorkItemHtmlTableFormatterColumn)));

        this._tfsContext = TfsContext.getDefault();
    }

    protected _getCellValue(rowIndex: number, column: IWorkItemHtmlTableFormatterColumn): string {
        const rowValue = this._rows[rowIndex][column.index];

        if (Utils_String.equals(column.fieldReferenceName, CoreFieldRefNames.Id, true)) {
            return WorkItemHtmlTableFormatter.getIdColumnValue(parseInt(rowValue, 10), this._tfsContext);
        }

        let columnFormatType = column.formatType;
        if (columnFormatType === undefined || columnFormatType === null) {
            columnFormatType = WorkItemHtmlTableFormatter._getColumnFormatType(rowValue);
        }

        if (columnFormatType === WorkItemHtmlTableFormatType.Identity) {
            return WorkItemHtmlTableFormatter.getIdentityValue(rowValue);
        }

        if (columnFormatType === WorkItemHtmlTableFormatType.Date) {
            return Utils_Core.convertValueToDisplayString(new Date(rowValue));
        }

        return Utils_Core.convertValueToDisplayString(rowValue);
    }

    public static getIdentityValue(name: string | WorkItemIdentityRef): string {
        const witIdentityRef = convertWorkItemIdentityRefFromFieldValue(name);
        return witIdentityRef.identityRef.displayName || Utils_String.empty;
    }

    public static getIdColumnValue(workItemId: number, tfsContext: TfsContext): string {
        const url = tfsContext.getPublicActionUrl(ActionUrl.ACTION_EDIT, "workitems", { parameters: [workItemId] });
        return `<a href="${url}" style="color:#106ebe" target="_blank">${workItemId}</a>`;
    }

    private static isHtmlField(fieldReferenceName: string): boolean {
        return Utils_String.equals(CoreFieldRefNames.Id, fieldReferenceName, true);
    }

    private static _getColumnFormatType(fieldValue: any): WorkItemHtmlTableFormatType {
        if (isWorkItemIdentityRef(fieldValue) || isIdentityRef(fieldValue)) {
            return WorkItemHtmlTableFormatType.Identity;
        }

        if (fieldValue instanceof Date) {
            return WorkItemHtmlTableFormatType.Date;
        }

        return WorkItemHtmlTableFormatType.PlainText;
    }
}
