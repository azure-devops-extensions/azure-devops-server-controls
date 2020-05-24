import * as React from "react";

import { first as firstInArray } from "VSS/Utils/Array";
import { localeIgnoreCaseComparer as localeIgnoreCaseStringCompare } from "VSS/Utils/String";

import { BaseComponent, IBaseProps } from "OfficeFabric/Utilities";
import { IColumn, SelectionMode, ColumnActionsMode } from "OfficeFabric/DetailsList";

import { VssDetailsList } from "VSSUI/VssDetailsList";

import { ITaskGroupReferenceGroup, ITaskGroupReference } from "DistributedTask/TaskGroups/ExtensionContracts";

import { SafeLink } from "DistributedTaskControls/Components/SafeLink";
import { IStateless } from "DistributedTaskControls/Common/Components/Base";

import { SpecialCharacters } from "TaskGroup/Scripts/Common/Constants";
import { TaskGroupReferenceListColumnKeys } from "TaskGroup/Scripts/TaskGroupEditor/Constants";
import * as Resources from "TaskGroup/Scripts/Resources/TFS.Resources.TaskGroup";

export interface IReferencesListProps extends IBaseProps {
    referenceGroup: ITaskGroupReferenceGroup;
}

export class ReferencesList extends BaseComponent<IReferencesListProps, IStateless>{
    public render(): JSX.Element {

        return (
            <VssDetailsList
                className={"tg-editor-references-list"}
                items={this._getSortedReferences(this.props.referenceGroup.references)}
                columns={this._getColumns(this.props.referenceGroup.references)}
                selectionMode={SelectionMode.none}
            />);
    }

    private _getSortedReferences(references: ITaskGroupReference[]): ITaskGroupReference[] {
        return references.sort((ref1: ITaskGroupReference, ref2: ITaskGroupReference) => localeIgnoreCaseStringCompare(ref1.displayName, ref2.displayName));
    }

    private _getColumns(references: ITaskGroupReference[]): IColumn[] {
        const hasChildren = references.some((reference: ITaskGroupReference) => {
            return reference.childReferences && reference.childReferences.length > 0;
        });

        let columns: IColumn[] = [
            {
                name: Resources.NameColumnHeader,
                key: TaskGroupReferenceListColumnKeys.Name,
                fieldName: "displayName",
                columnActionsMode: ColumnActionsMode.disabled,
                onRender: this._onRenderReferencesCell,
                minWidth: 200,
                maxWidth: 400
            }
        ];

        if (hasChildren) {
            const childReferenceName = firstInArray(
                references,
                (reference: ITaskGroupReference) => !!reference.childReferenceTypeDisplayName).childReferenceTypeDisplayName;

            columns.push({
                isMultiline: true,
                name: childReferenceName,
                key: TaskGroupReferenceListColumnKeys.ChildReferences,
                fieldName: "childReferences",
                columnActionsMode: ColumnActionsMode.disabled,
                onRender: this._onRenderChildReferencesCell,
                minWidth: 200,
                maxWidth: 400
            });
        }

        return columns;
    }

    private _onRenderReferencesCell = (item: ITaskGroupReference, index?: number, column?: IColumn): JSX.Element => {
        return (
            <SafeLink
                allowRelative={true}
                href={item.url}
                tabIndex={0}
                target={"_blank"}
            >
                {item.displayName}
            </SafeLink>);
    }

    private _onRenderChildReferencesCell = (item: ITaskGroupReference, index?: number, column?: IColumn): JSX.Element => {
        if (item.childReferences && item.childReferences.length > 0) {
            const mergedReferences = item.childReferences
                .map((reference: ITaskGroupReference) => reference.displayName)
                .join(SpecialCharacters.CommaSeperator);

            return (
                <div>
                    {mergedReferences}
                </div>);
        }

        return null;
    }
}