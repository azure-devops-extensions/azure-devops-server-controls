import * as React from "react";
import * as ReactDOM from "react-dom";

import { BaseComponent, IBaseProps, css } from "OfficeFabric/Utilities";

import { SelectionMode, IColumn } from "OfficeFabric/DetailsList";
import { SpinnerSize } from "OfficeFabric/Spinner";

import { format, localeFormat, empty as emptyString } from "VSS/Utils/String";
import { replaceUrlParam } from "VSS/Utils/Url";

import { VssDetailsList } from "VSSUI/VssDetailsList";

import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { Component as InformationBar } from "DistributedTaskControls/Components/InformationBar";
import { LoadingComponent } from "DistributedTaskControls/Components/LoadingComponent";
import { SafeLink } from "DistributedTaskControls/Components/SafeLink";

import { DeleteTaskGroupDialogActionCreator } from "TaskGroup/Scripts/Common/DeleteTaskGroupDialog/DeleteTaskGroupDialogActionCreator";
import { DeleteTaskGroupDialogStore, IDeleteTaskGroupDialogState, ITaskGroupReferenceSummary } from "TaskGroup/Scripts/Common/DeleteTaskGroupDialog/DeleteTaskGroupDialogStore";
import { MessageBarKeys, DeleteTaskGroupDialogItemKeys, ContributionIds, TaskGroupEditorPivotKeys } from "TaskGroup/Scripts/Common/Constants";
import { getTaskGroupEditorUrl } from "TaskGroup/Scripts/Utils/TaskGroupUrlUtils";
import * as Resources from "TaskGroup/Scripts/Resources/TFS.Resources.TaskGroup";

import "VSS/LoaderPlugins/Css!TaskGroup/Scripts/Common/DeleteTaskGroupDialog/DeleteTaskGroupDialog";

export interface IDeleteTaskGroupDialogContentProps extends IBaseProps {
    taskGroupId: string;
}

export class DeleteTaskGroupDialogContent extends BaseComponent<IDeleteTaskGroupDialogContentProps, IDeleteTaskGroupDialogState>{

    constructor(props: IDeleteTaskGroupDialogContentProps) {
        super(props);
        this._deleteTaskGroupDialogActionCreator = ActionCreatorManager.GetActionCreator<DeleteTaskGroupDialogActionCreator>(DeleteTaskGroupDialogActionCreator);
        this._deleteTaskGroupDialogStore = StoreManager.GetStore<DeleteTaskGroupDialogStore>(DeleteTaskGroupDialogStore);
        this.state = this._deleteTaskGroupDialogStore.getState();
    }

    public render() {
        return (
            <div>

                <InformationBar
                    parentKey={MessageBarKeys.DeleteTaskGroupDialog} />
                {Resources.DeleteTaskGroupDialogText}

                <div className="references-link">
                    <SafeLink
                        href={this._getTaskGroupReferencesViewLink()}
                        allowRelative={true}
                        target={"_blank"}
                    >
                        <span className="references-link-text"> {Resources.ReferencesTabName}</span>
                    </SafeLink>
                </div>

                {
                    !!this.state.referenceSummaries
                        ? this._getReferencesList()
                        : (<div>{Resources.LoadingReferencesText}</div>)
                }

            </div>
        );
    }

    public componentDidMount() {
        this._deleteTaskGroupDialogStore.addChangedListener(this._onStoreChange);
    }

    public componentWillUnmount() {
        this._deleteTaskGroupDialogStore.removeChangedListener(this._onStoreChange);
    }

    private _getReferencesList() {
        return (
            <VssDetailsList
                className={"delete-tg-references-list"}
                columns={this._getReferencesListColumns()}
                items={this._getReferencesListItems()}
                selectionMode={SelectionMode.none}
                isHeaderVisible={false} />
        );
    }

    private _getTaskGroupReferencesViewLink(): string {

        // Currently navigate only to the task group editor, and land on the tasks tab
        // tab name parameter in the link is causing issues. Need to figure that out and re introduce it
        const url = getTaskGroupEditorUrl(this.props.taskGroupId, TaskGroupEditorPivotKeys.ReferencesPivotItemKey);

        return url;
    }

    private _getReferencesListItems(): ITaskGroupReferenceSummary[] {
        return this.state.referenceSummaries;
    }

    private _getReferencesListColumns(): IColumn[] {
        return [{
            name: emptyString,
            key: DeleteTaskGroupDialogItemKeys.ReferencesListColumnKey,
            fieldName: "count",
            minWidth: 0,
            onRender: this._onReferencesListItemRender
        }];
    }

    private _onStoreChange = () => {
        const state = this._deleteTaskGroupDialogStore.getState();
        this.setState(state);
    }

    private _onReferencesListItemRender = (item: ITaskGroupReferenceSummary): JSX.Element => {
        if (item.count === -1) {
            return (
                <LoadingComponent
                    size={SpinnerSize.small}
                />);
        }

        const itemCount: string = item.count && item.count > 0 ? item.count.toString(10) : Resources.NoText;
        return this._getReferencesCell(item.icon, item.displayName, itemCount);
    }

    private _getReferencesCell(iconClass: string, referenceType: string, countText: string): JSX.Element {
        return (
            <div className="reference-item">
                <span className={css("bowtie-icon", iconClass)} />
                {localeFormat(Resources.TaskGroupReferencesConciseTextFormat, countText, referenceType)}
            </div>
        );
    }

    private _deleteTaskGroupDialogStore: DeleteTaskGroupDialogStore;
    private _deleteTaskGroupDialogActionCreator: DeleteTaskGroupDialogActionCreator;
}