import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { ViewStoreBase } from "DistributedTaskControls/Common/Stores/Base";
import { LinkVariableGroupPanelDataStore } from "DistributedTaskControls/Variables/VariableGroup/Store/LinkVariableGroupPanelDataStore";
import { StoreKeys } from "DistributedTaskControls/Common/Common";
import { InstanceIds } from "DistributedTaskControls/Variables/Common/Constants";
import { IScope } from "DistributedTaskControls/Variables/Common/Types";
import { VariableGroupActions, Status, IStatus } from "DistributedTaskControls/Variables/VariableGroup/Actions/VariableGroupActions";
import { ScopePickerStore } from "DistributedTaskControls/Variables/VariableGroup/Store/ScopePickerStore";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { VariableGroupDataStore } from "DistributedTaskControls/Variables/VariableGroup/Store/VariableGroupDataStore";

import { VariableGroup } from "TFS/DistributedTask/Contracts";

import { Selection } from "OfficeFabric/Selection";

import * as Utils_String from "VSS/Utils/String";
import * as Utils_Array from "VSS/Utils/Array";

export interface ILinkVariableGroupPanelViewState {
    showInfoMessage: boolean;
    searchText: string;
    isPanelOpen: boolean;
    status: IStatus;
    variableGroups: VariableGroup[];
    filteredVariableGroups: VariableGroup[];
    selection: Selection;
    selectedVariableGroup: VariableGroup;
    selectedScopes?: IScope[];
}

// ViewStore to keep track of UI properties like search text, filtered variable groups
export class LinkVariableGroupPanelViewStore extends ViewStoreBase {

    public initialize(): void {

        let selection = new Selection({
            getKey: (item: /*VariableGroup*/ any) => String(item.id),
            onSelectionChanged: this._onSelectionChanged
        });
        selection.setItems([]);

        this._state = {
            showInfoMessage: true,
            searchText: Utils_String.empty,
            isPanelOpen: false,
            status: { status: Status.UnKnown },
            variableGroups: [],
            filteredVariableGroups: [],
            selection: selection,
            selectedVariableGroup: null,
            selectedScopes: []
        };

        this._actionsHub = ActionsHubManager.GetActionsHub<VariableGroupActions>(VariableGroupActions);
        this._actionsHub.filterVariableGroups.addListener(this._handleFilterVariableGroups);
        this._actionsHub.showLinkVariableGroupPanel.addListener(this._handleShowLinkVariableGroupPanel);

        this._dataStore = StoreManager.GetStore<LinkVariableGroupPanelDataStore>(LinkVariableGroupPanelDataStore);
        this._dataStore.addChangedListener(this._onDataStoreChanged);

        this._onDataStoreChanged();

        this._scopePickerStore = StoreManager.CreateStore<ScopePickerStore, null>(ScopePickerStore, InstanceIds.VariableGroupLinkPanelScopePickerInstanceId, null);
        this._scopePickerStore.addChangedListener(this._updateSelectedScopes);
    }

    public disposeInternal(): void {
        this._dataStore.removeChangedListener(this._onDataStoreChanged);

        this._actionsHub.filterVariableGroups.removeListener(this._handleFilterVariableGroups);
        this._actionsHub.showLinkVariableGroupPanel.removeListener(this._handleShowLinkVariableGroupPanel);

        StoreManager.DeleteStore<ScopePickerStore>(ScopePickerStore, InstanceIds.VariableGroupLinkPanelScopePickerInstanceId);
    }

    public getState(): ILinkVariableGroupPanelViewState {
        this._setfilteredVariableGroups();
        return this._state;
    }

    public static getKey(): string {
        return StoreKeys.LinkVariableGroupPanelViewStore;
    }

    private _onDataStoreChanged = (): void => {
        this._updateState();
        this.emitChanged();
    }

    private _handleFilterVariableGroups = (searchText: string) => {
        this._state.searchText = searchText;
        this._setfilteredVariableGroups();

        this._state.selection.setChangeEvents(false);
        this._state.selection.setItems(this._state.filteredVariableGroups as any[]);
        this._resetSelection();
        this._state.selection.setChangeEvents(true, true);

        this.emitChanged();
    }

    private _updateState(): void {
        let { status } = this._dataStore.getState();
        this._state.status = status;

        this._setItems();
    }

    private _handleShowLinkVariableGroupPanel = (showPanel: boolean) => {
        this._state.selectedVariableGroup = null;
        this._state.searchText = Utils_String.empty;
        this._setItems();
        this._state.isPanelOpen = showPanel;
        this.emitChanged();
    }

    private _onSelectionChanged = () => {
        let selection = this._state.selection;

        if (selection.getSelectedCount() > 0) {
            let variableGroup = selection.getSelection()[0] as VariableGroup;
            this._state.selectedVariableGroup = variableGroup;
        }
        else {
            this._state.selectedVariableGroup = null;
        }

        this.emitChanged();
    }

    private _setItems() {

        let variableGroupDataStore = StoreManager.GetStore<VariableGroupDataStore>(VariableGroupDataStore);

        // get the variable groups which are already linked in the definition
        let existingGroupIds = variableGroupDataStore.getVariableGroupIds();

        // get the variable groups which can be linked by the user 
        let variableGroups = Utils_Array.clone(this._dataStore.getState().variableGroups);

        // remove the variable groups which are already linked in the definition
        variableGroups = variableGroups.filter((vg: VariableGroup) => {
            return existingGroupIds.indexOf(vg.id) === -1;
        });

        this._state.variableGroups = variableGroups.sort((lhs: VariableGroup, rhs: VariableGroup) => {
            return Utils_String.localeComparer(lhs.name, rhs.name);
        });

        // update the list selection with the filtered list and reset the selection
        this._state.selection.setItems(this._state.variableGroups as any[], true);
    }

    private _setfilteredVariableGroups() {
        let { searchText, variableGroups } = this._state;

        // filter the variable groups according to the filter text
        this._state.filteredVariableGroups = searchText ?
            variableGroups.filter((vg: VariableGroup) => vg.name.toLowerCase().indexOf(searchText.toLowerCase()) > -1) :
            variableGroups;
    }

    private _resetSelection() {
        let selectedIndex: number;

        this._state.filteredVariableGroups.forEach((vg: VariableGroup, index: number) => {

            let id = this._state.selectedVariableGroup && this._state.selectedVariableGroup.id;
            if (vg.id === id) {
                selectedIndex = index;
            }
        });

        if (selectedIndex) {
            this._state.selection.setIndexSelected(selectedIndex, true, false);
        }
    }

    private _updateSelectedScopes = (): void => {
        this._state.selectedScopes = this._scopePickerStore.getSelectedScopes();
        this.emitChanged();
    }

    private _dataStore: LinkVariableGroupPanelDataStore;
    private _state: ILinkVariableGroupPanelViewState;
    private _actionsHub: VariableGroupActions;
    private _scopePickerStore: ScopePickerStore;    
}

