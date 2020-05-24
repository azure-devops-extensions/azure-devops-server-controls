import * as React from "react";
import * as ReactDOM from "react-dom";

import { autobind, BaseComponent, IBaseProps } from "OfficeFabric/Utilities";
import { IContextualMenuItem } from "OfficeFabric/ContextualMenu";

import { getService as getEventActionService, CommonActions } from "VSS/Events/Action";
import * as VssContext from "VSS/Context";

import { IVssHubViewState, VssHubViewState } from "VSSPreview/Utilities/VssHubViewState";
import { FilterBar } from "VSSUI/FilterBar";
import { KeywordFilterBarItem } from "VSSUI/TextFilterBarItem";
import { IFilterState, FILTER_CHANGE_EVENT } from "VSSUI/Utilities/Filter";
import { Hub, IHub } from "VSSUI/Hub";
import { PivotBarItem, IPivotBarAction } from "VSSUI/PivotBar";
import { HubHeader } from "VSSUI/HubHeader";
import { VssIconType } from "VSSUI/VssIcon";

import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { ImportExportFileUtils } from "DistributedTaskControls/Common/ImportExportFileUtils";
import { FileUploadDialog, FileInputResult, FileInputContentType } from "DistributedTaskControls/SharedControls/InputControls/Components/FileUploadDialog";

import { PerfTelemetryManager, TaskGroupTelemetry } from "TaskGroup/Scripts/Utils/TelemetryUtils";
import { TaskGroupsActionCreator } from "TaskGroup/Scripts/TaskGroups/TaskGroupsActionCreator";
import { TaskGroupsStore, ITaskGroupsState } from "TaskGroup/Scripts/TaskGroups/TaskGroupsStore";
import { TaskGroupsHubItemKeys } from "TaskGroup/Scripts/TaskGroups/Constants";
import { SessionStorageKeys } from "TaskGroup/Scripts/Common/Constants";
import { TaskGroupsList } from "TaskGroup/Scripts/TaskGroups/TaskGroupsList";
import { ZeroDayExperience } from "TaskGroup/Scripts/TaskGroups/ZeroDayExperience";
import { navigateToImportTaskGroup } from "TaskGroup/Scripts/Utils/TaskGroupUrlUtils";
import { showSecurityDialogForAllTaskGroups } from "TaskGroup/Scripts/Utils/SecurityHelper";
import * as Resources from "TaskGroup/Scripts/Resources/TFS.Resources.TaskGroup";

export class TaskGroupsHub extends BaseComponent<IBaseProps, ITaskGroupsState>{
    constructor(props: IBaseProps) {
        super(props);
        this._taskGroupsActionCreator = ActionCreatorManager.GetActionCreator<TaskGroupsActionCreator>(TaskGroupsActionCreator);
        this._taskGroupsStore = StoreManager.GetStore<TaskGroupsStore>(TaskGroupsStore);
        this._hubViewState = new VssHubViewState();
        this._hubCommands = [
            {
                key: TaskGroupsHubItemKeys.ImportMenuItem,
                name: Resources.ImportTaskGroupMenuItemName,
                iconProps: {
                    iconName: "Download",
                    iconType: VssIconType.fabric
                },
                important: true,
                onClick: this._onImportTaskGroupClick
            },
            {
                key: TaskGroupsHubItemKeys.SecurityMenuItem,
                name: Resources.TaskGroupSecurityMenuItemName,
                iconProps: {
                    className: "bowtie-icon bowtie-shield",
                },
                important: true,
                onClick: this._onSecurityClick
            }
        ];

        this._hubViewState.filter.subscribe(this._onFilterChange, FILTER_CHANGE_EVENT);
    }

    public render() {
        return (
            <Hub
                className={"task-groups-hub"}
                hubViewState={this._hubViewState}
                commands={this._hubCommands}>
                <HubHeader
                    iconProps={
                        {
                            iconName: "bowtie-task-group",
                            iconType: VssIconType.bowtie
                        }
                    }
                    title={Resources.TaskGroupsHubHeader} />
                <FilterBar>
                    <KeywordFilterBarItem
                        placeholder={Resources.SearchTaskGroupsPlaceholder}
                        filterItemKey={TaskGroupsHubItemKeys.SearchFilterKey} />
                </FilterBar>
                <PivotBarItem
                    className={"task-group-list-pivot"}
                    itemKey={TaskGroupsHubItemKeys.PivotItemKey}
                    name={Resources.TaskGroupsHubHeader} >
                    {this._getTaskGroupPivotItemContent()}
                </PivotBarItem>
            </Hub>
        );
    }

    public componentWillMount(): void {
        this.setState(this._taskGroupsStore.getState());
        this._taskGroupsStore.addChangedListener(this._onStoreChange);
    }

    public componentWillUnmount(): void {
        this._taskGroupsStore.removeChangedListener(this._onStoreChange);
    }

    private _onImportTaskGroupClick = (ev: React.MouseEvent<HTMLElement>) => {
        TaskGroupTelemetry.importTaskGroupClicked();
        const importDialogContainer = document.createElement("div");
        ReactDOM.render(<FileUploadDialog
            cssClass={"task-group-hub-import-dialog"}
            resultContentType={FileInputContentType.RawText}
            maxFileSize={25 * 1024 * 1024}
            onOkClick={(file: FileInputResult) => {

                ImportExportFileUtils.saveFileContentToSessionStorageWithTimeout(
                    SessionStorageKeys.ImportTaskGroupStorageSessionKey,
                    file.content,
                    3 * 60 * 1000/*Wait for 3 mins*/);

                navigateToImportTaskGroup();
            }}
            onDialogClose={() => {
                ReactDOM.unmountComponentAtNode(importDialogContainer);
            }}
        />, importDialogContainer);
    }

    private _onSecurityClick = (ev: React.MouseEvent<HTMLElement>, item: IContextualMenuItem) => {
        showSecurityDialogForAllTaskGroups();
    }

    private _onFilterChange = (filterState: IFilterState, action: string) => {
        const filter = this._hubViewState.filter;

        let filterString = filter.getFilterItemValue<string>(TaskGroupsHubItemKeys.SearchFilterKey);
        this._taskGroupsActionCreator.filterTaskGroups(filterString);
    }

    private _onStoreChange = () => {
        const state = this._taskGroupsStore.getState();
        this.setState(state);
    }

    private _getTaskGroupPivotItemContent(): JSX.Element {
        if (this.state.containsAnyTaskGroup) {
            return <TaskGroupsList />;
        }
        else {
            return <ZeroDayExperience
                onTaskGroupImportClick={this._onImportTaskGroupClick}
            />;
        }
    }

    private _hubViewState: IVssHubViewState;
    private _hubCommands: IPivotBarAction[];
    private _taskGroupsActionCreator: TaskGroupsActionCreator;
    private _taskGroupsStore: TaskGroupsStore;
}