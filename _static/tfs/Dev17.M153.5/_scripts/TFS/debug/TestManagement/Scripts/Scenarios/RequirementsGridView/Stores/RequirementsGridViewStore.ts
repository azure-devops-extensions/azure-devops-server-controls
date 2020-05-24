/// <reference types="jquery" />
import { IColumn, Selection } from "OfficeFabric/DetailsList";
import { removeIndex } from "OfficeFabric/Utilities";
import * as Resources from "TestManagement/Scripts/Resources/TFS.Resources.TestManagement";
import {
    IWorkItemColorsAndIcon,
    RequirementsGridViewActionsHub,
} from "TestManagement/Scripts/Scenarios/RequirementsGridView/Actions/RequirementsGridViewActionsHub";
import * as WIT_Contracts from "TFS/WorkItemTracking/Contracts";
import { Store } from "VSS/Flux/Store";
import { announce } from "VSS/Utils/Accessibility";
import * as TCMPermissionUtils from "TestManagement/Scripts/Utils/TFS.TestManagement.PermissionUtils";
import * as TFS_Host_TfsContext from "Presentation/Scripts/TFS/TFS.Host.TfsContext";

export interface IRequirementsGridViewState {
    errorMessage: string;
    isLoading: boolean;
    requirements: WIT_Contracts.WorkItem[];
    colorsAndIcon: IWorkItemColorsAndIcon[];
    columns: IColumn[];
    selection: Selection;
    selectionDetails: WIT_Contracts.WorkItem[];
    isContextMenuVisible: boolean;
    contextMenuOpenIndex: number;
    hasPublishTestResultsPermission: boolean;    
}

export class RequirementsGridViewStore extends Store {

    constructor(private _actionsHub: RequirementsGridViewActionsHub) {
        super();
        this._initialize();
    }

    private _initialize(): void {
        this._state = this._getDefaultState();
        this._actionsHub.onError.addListener(this._onErrorListener);
        this._actionsHub.onErrorMessageClose.addListener(this._onErrorMessageCloseListener);
        this._actionsHub.requirementsLoaded.addListener(this._requirementsLoadedListener);
        this._actionsHub.colorsLoaded.addListener(this._colorsLoadedListener);
        this._actionsHub.initializeColumns.addListener(this._initializeColumnsListener);
        this._actionsHub.dismissContextMenu.addListener(this._onDismissContextMenuListener);
        this._actionsHub.updateContextMenuOpenIndex.addListener(this._updateContextMenuOpenIndexListener);
        this._actionsHub.afterSort.addListener(this._requirementsSortedListener);
        this._actionsHub.afterRequirementsDeleted.addListener(this._afterRequirementsDeletedListener);
        this._actionsHub.clearState.addListener(this._clearState);
        this._actionsHub.updateWorkItem.addListener(this._updateWorkItemListener);
        this._actionsHub.updateWorkItemColorsAndInfo.addListener(this._updateWorkItemColorsAndInfoListener);
    }

    public getState(): IRequirementsGridViewState {
        return this._state;
    }

    private _clearState = (): void => {
        this._state = this._getDefaultState();
    }

    private _initializeSelectionListener = (): void => {
        this._state.selection = new Selection({
            onSelectionChanged: () => {
                let previousSelectionLength: number;
                if (this._state.selectionDetails) {
                    previousSelectionLength = this._state.selectionDetails.length;
                } else {
                    previousSelectionLength = 0;
                }
                this._state.selectionDetails = this._getSelectionDetails();
                this.emitChanged();
                if (this._state.selectionDetails.length > previousSelectionLength) {
                    announce(Resources.AnnounceSelected);
                } else {
                    announce(Resources.AnnounceDeselected);
                }
            }
        });
    }

    private _initializeColumnsListener = (columns: IColumn[]): void => {
        this._state.columns = columns;
        if (this._state.selection){
            this._state.selectionDetails = this._getSelectionDetails();
        }
        this.emitChanged();
    }

    private _getSelectionDetails(): WIT_Contracts.WorkItem[] {
        return (this._state.selection.getSelection() as WIT_Contracts.WorkItem[]);
    }

    private _requirementsLoadedListener = (requirements: WIT_Contracts.WorkItem[]): void => {
        this._state.requirements = requirements;
        this._state.isLoading = false;
        this._state.hasPublishTestResultsPermission = TCMPermissionUtils.PermissionUtils.hasPublishResultPermission(TFS_Host_TfsContext.TfsContext.getDefault().navigation.projectId);      
        this._initializeSelectionListener();
        this.emitChanged();
    }

    private _colorsLoadedListener = (workItemColorsAndIcon: IWorkItemColorsAndIcon[]): void => {
        this._state.colorsAndIcon  = workItemColorsAndIcon;
        this.emitChanged();
    }

    private _requirementsSortedListener = (requirements: WIT_Contracts.WorkItem[]): void => {
        this._state.requirements = requirements;
        this.emitChanged();
    }

    private _afterRequirementsDeletedListener = (requirements: WIT_Contracts.WorkItem[]): void => {
        requirements.forEach((bug) => {
            let index = this._state.requirements.indexOf(bug);
            this._state.requirements = removeIndex(this._state.requirements, index);
        });
        this._state.selection.setAllSelected(false);
        this.emitChanged();
    }

    private _onDismissContextMenuListener = (columns: IColumn[]): void => {
        this._state.isContextMenuVisible = false;
        this._state.columns = columns;
        this.emitChanged();
    }

    private _updateContextMenuOpenIndexListener = (openIndex: number): void => {
        this._state.contextMenuOpenIndex = openIndex;
        this.emitChanged();
    }

    private _updateWorkItemListener = (updatedWorkItem: WIT_Contracts.WorkItem): void => {
        let workitems = this._state.requirements;
        for (let i = 0; i < workitems.length; ++i) {
            if (workitems[i].id === updatedWorkItem.id) {
                workitems[i] = updatedWorkItem;
                break;
            }
        }
        this._state.requirements = workitems.slice();
        this.emitChanged();
    }

    private _updateWorkItemColorsAndInfoListener = (updatedWorkItemStateColor: IWorkItemColorsAndIcon): void => {
        let workItemStateColors = this._state.colorsAndIcon;
        for (let i = 0; i < workItemStateColors.length; ++i) {
            if (workItemStateColors[i].id === updatedWorkItemStateColor.id) {
                workItemStateColors[i] = updatedWorkItemStateColor;
                break;
            }
        }
        this._state.colorsAndIcon = workItemStateColors;
        this.emitChanged();
    }

    private _onErrorListener = (errorMessage: string): void => {
        this._state.errorMessage = errorMessage;
        this._state.isLoading = false;
        this.emitChanged();
    }

    private _onErrorMessageCloseListener = (): void => {
        this._state.errorMessage = null;
        this.emitChanged();
    }

    private _getDefaultState(): IRequirementsGridViewState {
        return {
            isLoading: true,
            hasPublishTestResultsPermission: false            
        } as IRequirementsGridViewState;
    }

    private _state: IRequirementsGridViewState;
}
