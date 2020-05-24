import { ColumnActionsMode, IColumn } from "OfficeFabric/DetailsList";
import { WorkItemStateColorsProvider } from "Presentation/Scripts/TFS/FeatureRef/WorkItemStateColorsProvider";
import { CoreFieldRefNames } from "Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants";
import * as React from "react";
import { renderIdentity } from "TFSUI/Identity/IdentityRenderer";
import { createWorkItemDateTimeCell } from "WorkItemsHub/Scripts/Components/Cells/WorkItemDateTimeCell";
import { createWorkItemIconTitleCell } from "WorkItemsHub/Scripts/Components/Cells/WorkItemIconTitleCell";
import { createWorkItemSimpleCell } from "WorkItemsHub/Scripts/Components/Cells/WorkItemSimpleCell";
import { createWorkItemStateCell } from "WorkItemsHub/Scripts/Components/Cells/WorkItemStateCell";
import { createWorkItemCommentCountCell } from "WorkItemsHub/Scripts/Components/Cells/WorkItemCommentCountCell";
import { MyActivityDateFieldValues } from "WorkItemsHub/Scripts/Constants";
import { IWorkItemsGridRow } from "WorkItemsHub/Scripts/DataContracts/IWorkItemsGridData";
import { RecentActivityConstants } from "WorkItemsHub/Scripts/Generated/Constants";
import * as Resources from "WorkItemsHub/Scripts/Resources/TFS.Resources.WorkItemsHub";
import { OnOpenWorkItemHandler } from "WorkItemsHub/Scripts/Utils/NavigationUtils";
import { TagList } from "WorkItemTracking/Scripts/Components/TagList";
import { WorkItemIdentityRef } from "WorkItemTracking/Scripts/OM/WorkItemInterfaces";
import { TagUtils } from "WorkItemTracking/Scripts/Utils/TagUtils";
import {
    convertWorkItemIdentityRefFromFieldValue,
    getAvatarUrl,
    isWorkItemIdentityRef,
} from "WorkItemTracking/Scripts/Utils/WorkItemIdentityHelper";

type CreateSimpleCell<T> = (value: T, friendlyStartDateTime?: Date) => JSX.Element;

export interface IWorkItemsGridColumnFactory {
    create(
        projectName: string,
        fieldReferenceName: string,
        fieldFriendlyName: string,
        fieldReferenceNameToIndex: IDictionaryStringTo<number>,
        friendlyStartDateTime: Date,
        onOpenWorkItem: OnOpenWorkItemHandler,
        isSorted: boolean,
        isSortedDescending: boolean,
        width?: number): IColumn;

}

export class WorkItemsGridColumnFactory implements IWorkItemsGridColumnFactory {

    private static readonly DefaultWidth = 150;
    private static readonly MinWidth = 10;

    private static readonly KnownColumnDefaultWidths: IDictionaryStringTo<number> = {
        [CoreFieldRefNames.Id]: 60,
        [CoreFieldRefNames.WorkItemType]: 90,
        [CoreFieldRefNames.Title]: 450,
        [CoreFieldRefNames.AreaPath]: 200,
        [CoreFieldRefNames.IterationPath]: 200,
        [CoreFieldRefNames.AssignedTo]: 200,
        [CoreFieldRefNames.State]: 100,
        [CoreFieldRefNames.Tags]: 200,
        [CoreFieldRefNames.CommentCount]: 75,
        [RecentActivityConstants.MyActivityDetailsField]: 110
    };

    private static readonly DefaultCreateMethod: CreateSimpleCell<string> = (value: string): JSX.Element => {
        return createWorkItemSimpleCell({ text: value });
    };

    public static getDefaultColumnWidth(fieldReferenceName: string): number {
        return WorkItemsGridColumnFactory.KnownColumnDefaultWidths[fieldReferenceName] || WorkItemsGridColumnFactory.DefaultWidth;
    }

    public create(
        projectName: string,
        fieldReferenceName: string,
        fieldFriendlyName: string,
        fieldReferenceNameToIndex: IDictionaryStringTo<number>,
        friendlyStartDateTime: Date,
        onOpenWorkItem: OnOpenWorkItemHandler,
        isSorted: boolean,
        isSortedDescending: boolean,
        width?: number): IColumn {

        return {
            key: fieldReferenceName,
            name: fieldFriendlyName,
            minWidth: WorkItemsGridColumnFactory.MinWidth,
            calculatedWidth: width,
            isPadded: false,
            isResizable: true,
            isSorted: isSorted,
            isSortedDescending: isSortedDescending,
            columnActionsMode: ColumnActionsMode.clickable,
            onRender: (item: IWorkItemsGridRow, index: number, column: IColumn) =>
                this._createCell(projectName, item, fieldReferenceName, fieldReferenceNameToIndex, column, friendlyStartDateTime, onOpenWorkItem)
        } as IColumn;
    }

    private _createCell(
        projectName: string,
        row: IWorkItemsGridRow,
        fieldReferenceName: string,
        fieldReferenceNameToIndex: IDictionaryStringTo<number>,
        column: IColumn,
        friendlyStartDateTime: Date,
        onOpenWorkItem: OnOpenWorkItemHandler): JSX.Element {

        if (fieldReferenceName === CoreFieldRefNames.Title) {
            return this._createTitleCell(projectName, row, fieldReferenceNameToIndex, onOpenWorkItem);
        }

        if (fieldReferenceName === CoreFieldRefNames.State) {
            return this._createStateCell(projectName, row, fieldReferenceNameToIndex);
        }

        const index = fieldReferenceNameToIndex[fieldReferenceName];
        let fieldValue = row.values[index];

        if (fieldReferenceName === CoreFieldRefNames.Tags) {
            return fieldValue ? <TagList tags={TagUtils.splitAndTrimTags(fieldValue)} tagWidthsCache={row.tagWidthsCache} maxWidth={column.calculatedWidth} /> : null;
        }

        if (fieldReferenceName === CoreFieldRefNames.AssignedTo) {
            return WorkItemsGridColumnFactory._createIdentityCell(fieldValue);
        }

        if (fieldReferenceName === CoreFieldRefNames.CommentCount) {
            return Number(fieldValue) !== 0 ? WorkItemsGridColumnFactory._createCommentCountCell(fieldValue) : null;
        }

        let createMethod: CreateSimpleCell<string | number>;
        if (fieldValue instanceof Date) {
            return WorkItemsGridColumnFactory._createDateTimeCell(row.values[index], "{0}", friendlyStartDateTime, false);
        }
        if (isWorkItemIdentityRef(fieldValue)) {
            return WorkItemsGridColumnFactory._createIdentityCell(fieldValue);
        }
        else {
            if (fieldReferenceName === RecentActivityConstants.MyActivityDetailsField) {
                fieldValue = MyActivityDateFieldValues[fieldValue];
            }
            if (fieldValue != null && typeof fieldValue !== "string" && typeof fieldValue !== "number") {
                fieldValue = String(fieldValue);
            }

            createMethod = WorkItemsGridColumnFactory.DefaultCreateMethod;
        }

        return createMethod(fieldValue, friendlyStartDateTime);
    }

    private _createStateCell(
        projectName: string, row: IWorkItemsGridRow, fieldReferenceNameToIndex: IDictionaryStringTo<number>): JSX.Element {

        const stateColorProvider = WorkItemStateColorsProvider.getInstance();
        const state = row.values[fieldReferenceNameToIndex[CoreFieldRefNames.State]];
        const workItemType = row.values[fieldReferenceNameToIndex[CoreFieldRefNames.WorkItemType]];

        return createWorkItemStateCell({
            workItemStateName: state,
            workItemStateColor: stateColorProvider.getColor(projectName, workItemType, state)
        });
    }

    private _createTitleCell(
        projectName: string, row: IWorkItemsGridRow, fieldReferenceNameToIndex: IDictionaryStringTo<number>, onOpenWorkItem: OnOpenWorkItemHandler): JSX.Element {

        const workItemId = row.values[fieldReferenceNameToIndex[CoreFieldRefNames.Id]];
        const workItemTitle = row.values[fieldReferenceNameToIndex[CoreFieldRefNames.Title]];
        const workItemType = row.values[fieldReferenceNameToIndex[CoreFieldRefNames.WorkItemType]];

        return createWorkItemIconTitleCell({ workItemId, workItemTitle, projectName, workItemType, onOpenWorkItem: onOpenWorkItem });
    }

    private static _createDateTimeCell(dateTimeString: string, contentFormat: string, friendlyStartDateTime: Date, showFriendlyDateTime: boolean = true): JSX.Element {
        return createWorkItemDateTimeCell({
            dateTime: new Date(dateTimeString),
            contentFormat,
            showFriendlyDateTime,
            friendlyStartDateTime
        });
    }

    private static _createIdentityCell(name: string | WorkItemIdentityRef): JSX.Element {
        const witIdentityRef = convertWorkItemIdentityRefFromFieldValue(name);
        const imageSource = getAvatarUrl(witIdentityRef);

        return renderIdentity({
            tooltip: witIdentityRef.distinctDisplayName || Resources.WorkItemUnassigned,
            displayName: witIdentityRef.identityRef.displayName || Resources.WorkItemUnassigned,
            imageSource
        });
    }

    private static _createCommentCountCell(count: string): JSX.Element {
        return createWorkItemCommentCountCell({
            workItemCommentCount: count
        });
    }
}
