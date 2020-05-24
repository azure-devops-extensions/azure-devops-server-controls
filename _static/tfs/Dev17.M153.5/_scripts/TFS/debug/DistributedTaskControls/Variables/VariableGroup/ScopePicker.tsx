/// <reference types="react" />

import * as React from "react";

import * as Base from "DistributedTaskControls/Common/Components/Base";
import { IScope } from "DistributedTaskControls/Variables/Common/Types";
import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { VariableGroupActionsCreator } from "DistributedTaskControls/Variables/VariableGroup/Actions/VariableGroupActionsCreator";
import { IScopePickerState, ScopePickerStore } from "DistributedTaskControls/Variables/VariableGroup/Store/ScopePickerStore";
import { ScopePickerChoiceGroupKeys } from "DistributedTaskControls/Variables/Common/Constants";

import * as Resources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";
import * as Utils_Array from "VSS/Utils/Array";

import { Checkbox, ICheckboxProps } from "OfficeFabric/Checkbox";
import { ChoiceGroup } from "OfficeFabric/ChoiceGroup";
import { autobind } from "OfficeFabric/Utilities";
import { TooltipHost, TooltipOverflowMode } from "VSSUI/Tooltip";
import { SelectionMode } from "OfficeFabric/Selection";

import { PickListDropdown, IPickListItem, IPickListSelection, IPickList } from "VSSUI/PickList";
import { VssIconType } from "VSSUI/VssIcon";
import { IItemIndicatorProps } from "VSSUI/ItemIndicator";

import "VSS/LoaderPlugins/Css!DistributedTaskControls/Variables/VariableGroup/ScopePicker";

export class ScopePicker extends Base.Component<Base.IProps, IScopePickerState> {

    public componentWillMount(): void {
        this._actionsCreator = ActionCreatorManager.GetActionCreator<VariableGroupActionsCreator>(VariableGroupActionsCreator);
        this._store = StoreManager.GetStore<ScopePickerStore>(ScopePickerStore, this.props.instanceId);
        
        this._store.addChangedListener(this._onChange);
        this.setState(this._store.getState());
    }

    public componentWillUnmount(): void {
        this._store.removeChangedListener(this._onChange);
    }

    public render(): JSX.Element {
        let defaultScope = Utils_Array.first(this.state.scopes, (scope: IScope) => !!scope.isDefault);
        let otherScopes = this.state.scopes.filter((scope: IScope) => !scope.isDefault);

        return ( 
            <div className = "scope-picker">
                <span className = "scope-picker-title">
                    {Resources.VariableGroupScopeText}
                </span>
                <ChoiceGroup
                    selectedKey = {this.state.isDefaultSelected ? ScopePickerChoiceGroupKeys.Default : ScopePickerChoiceGroupKeys.Others}
                    options = {
                        [
                            {
                                key: ScopePickerChoiceGroupKeys.Default,
                                text: defaultScope.value
                            },
                            {
                                key: ScopePickerChoiceGroupKeys.Others,
                                text: Resources.EnvironmentsScopeText
                            }
                        ]
                    }
                    onChange = {(event: React.FormEvent<HTMLInputElement>, option) => this._onChoiceGroupSelectionChange(option.key)}
                />

                <PickListDropdown 
                    className = "scope-picker-picklist"
                    pickListClassName = "scope-picker-dropdown"
                    placeholder = {Resources.SelectTitle}
                    isSearchable = {true}
                    selectionMode = {SelectionMode.multiple}
                    getPickListItems = {() => otherScopes}
                    getListItem = {this._getListItem}
                    disabled = {this.state.isDefaultSelected}
                    onSelectionChanged = { this._onSelectionChange}
                    selectedItems = {this._getSelectedScopes()}
                    searchBoxAriaLabel = {Resources.VariableScopeFilterSearchBoxAriaLabel}
                    indicators = {[{getItemIndicator: this._getPermissionWarningIndicator}]}/>
            </div>
        );
    }

    @autobind
    private _onChange(): void {
        this.setState(this._store.getState());
    }

    @autobind
    private _onChoiceGroupSelectionChange (option: string): void {
        if (option === ScopePickerChoiceGroupKeys.Default) {
            let defaultScope = this._store.getDefaultScope();
            this._actionsCreator.updateScopeSelection( {
                selectedScopes: [ defaultScope ]
            });
        }
        else {
            this._actionsCreator.updateScopeSelection( {
                selectedScopes: [],
                restore: true
            });
        }
    }

    @autobind
    private _getListItem(scope: IScope): IPickListItem {
        return { 
            key: String(scope.key),
            name: scope.value,
            disabled: this._store.shouldDisable(scope.key)
        };
    }

    @autobind
    private _onSelectionChange (selection: IPickListSelection): void {
        this._actionsCreator.updateScopeSelection( {
            selectedScopes: selection.selectedItems as IScope[],
        });
    }

    @autobind
    private _getSelectedScopes(): IScope[] {
        let state = this._store.getState();
        return state.selectedScopes.filter((scope: IScope) => !scope.isDefault);
    }

    @autobind
    private _getPermissionWarningIndicator(scope: IScope): IItemIndicatorProps {
        if (this._store.shouldDisable(scope.key)) {
            return {
                title: this._store.getPermissionWarningMessage(),
                iconProps: {
                    iconName: "info",
                    iconType: VssIconType.fabric
                },
                className: "scope-picker-permission-info"
            };
        }
    }

    private _store: ScopePickerStore;
    private _actionsCreator: VariableGroupActionsCreator;

}