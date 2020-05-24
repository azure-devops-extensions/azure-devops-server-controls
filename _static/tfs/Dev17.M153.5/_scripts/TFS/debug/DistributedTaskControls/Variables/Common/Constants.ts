/**
 * Constants defined for variables
 */
export namespace VariableConstants {

    /**
     * key for scope is number, ex. for environment it is environment id
     * taking the max int value to avoid any clash
     */
    export const DefaultScopeKey: number = 2147483647;
}

/**
 * Store keys for the variables
 * Unique keys to be used by store manager to distinguish stores
 */
export namespace VariableStoreKeys {
    export const StoreKey_ProcessVariablesDataStore = "STORE_KEY_DEFINITION_VARIABLES_DATA_STORE";
    export const StoreKey_ProcessVariablesViewStore = "STORE_KEY_DEFINITION_VARIABLES_VIEW_STORE";
    export const StoreKey_RuntimeVariablesStore = "STORE_KEY_RUNTIME_VARIABLES_STORE";
    export const StoreKey_VariablesGridViewStore = "STORE_KEY_DEFINITION_VARIABLES_GRID_VIEW_STORE";
    export const StoreKey_VariablesListViewStore = "STORE_KEY_DEFINITION_VARIABLES_LIST_VIEW_STORE";
    export const StoreKey_ProcessVariablesFilterStore = "STORE_KEY_PROCESS_VARIABLES_FILTER_STORE";
    export const StoreKey_ListGridViewStore = "STORE_KEY_LIST_GRID_VIEW_STORE";
    export const StoreKey_CounterVariableDataStore = "STORE_KEY_COUNTER_VARIABLE_DATA_STORE";
    export const StoreKey_CounterVariableViewStore = "STORE_KEY_COUNTER_VARIABLE_VIEW_STORE";
}

/**
 * Action Hub keys
 * Unique keys to be used for different action hub
 */
export namespace VariableActionHubKeys {
    export const VariablesSection_ActionsHub = "ACTIONS_HUB_KEY_VARIABLES_SECTION_ACTIONS_HUB";
    export const VariablesSection_ViewActionsHub = "ACTIONS_HUB_KEY_VARIABLES_VIEW_SECTION_ACTIONS_HUB";
    export const RuntimeVariables_ActionsHub = "ACTIONS_HUB_KEY_RUNTIME_VARIABLES_SECTION_ACTIONS_HUB";
    export const VariablesSection_FiltersActionsHub = "ACTIONS_HUB_KEY_VARIABLES_SECTION_FILTERS_ACTIONS_HUB";
    export const VariablesGrid_ActionsHub = "ACTIONS_HUB_KEY_VARIABLES_GRID_ACTIONS_HUB";
    export const VariablesPivot_ActionsHub = "ACTIONS_HUB_KEY_VARIABLES_PIVOT_ACTIONS_HUB";
    export const CounterVariables_ActionHub = "ACTIONS_HUB_KEY_COUNTER_VARIABLES_ACTION_HUB";
    export const CounterVariables_ViewActionHub = "ACTIONS_HUB_KEY_COUNTER_VARIABLES_VIEW_ACTION_HUB";
}

/**
 * Actioncreator keys
 * Unique keys to be used for different actionCreator
 */
export namespace VariableActionCreatorKeys {
    export const VariablesSection_ActionCreator = "ACTIONS_CREATOR_KEY_VARIABLES_SECTION_ACTIONS_CREATOR";
    export const RuntimeVariables_ActionCreator = "ACTIONS_CREATOR_KEY_RUNTIME_VARIABLES_SECTION_ACTION_CREATOR";
    export const VariablesGrid_ActionCreator = "ACTIONS_CREATOR_KEY_VARIABLES_GRID_ACTIONS_CREATOR";
    export const CounterVariables_ActionCreator = "ACTIONS_CREATOR_KEY_COUNTER_VARIABLES_ACTIONS_CREATOR";
}

/**
 * Unique key for each column in the variables grids
 */
export namespace VariableColumnKeys {
    export const IconColumnKey: string = "icon";
    export const NameColumnKey: string = "name";
    export const ValueColumnKey: string = "value";
    export const DeleteColumnKey: string = "delete";
    export const SecretColumnKey: string = "secret";
    export const SettableAtQueueTimeColumnKey: string = "settableAtQueueTime";
    export const ScopeColumnKey: string = "scope";
}


/**
 * Lists the property names of ProcessVariableColumnOptions
 */
export namespace ProcessVariableColumnOptionProperties {
    export const HeaderName: string = "headerName";
    export const MinWidth: string = "minWidth";
    export const MaxWidth: string = "maxWidth";
    export const IsReadOnly: string = "isReadOnly";
}

/**
 * Unique key for each column in the variable group grids
 */
export namespace VariableGroupColumnKeys {
    export const NameColumnKey: string = "name";
    export const ValueColumnKey: string = "value";
}

/**
 * Unique key for each column gridcell in the variable group grids
 */
export namespace VariableGroupFieldNameKeys {
    export const NameFieldKey = "name";
    export const ValueFieldKey = "value";
}

/**
 * Unique key for variable name column in the pipeline variables grid view
 */
export namespace ProcessVariablesGridViewColumnKeys {

    export const NameColumnKey: string = "dtc-pv-grid-name-column-key";
    export const IconColumnKey: string = "dtc-pv-grid-icon-column-key";
}

/**
 * Unique key for each filter in pipeline variables filters
 */
export namespace ProcessVariablesFilterKeys {
    export const Keyword: string = "keyword";
    export const Scope: string = "scope";
}

export namespace ListGridPivotKeys {
    export const List: string = "List";
    export const Grid: string = "Grid";
}

export namespace InstanceIds {
    export const VariableGroupLinkPanelScopePickerInstanceId = "link-variable-group-panel-scope-picker-store-instance";
    export const VariableGroupEditPanelScopePickerInstanceId = "edit-variable-group-panel-scope-picker-store-instance";
}

export namespace ScopePickerChoiceGroupKeys {
    export const Default: string = "default";
    export const Others: string = "others";
}

export namespace CounterVariableColumnKeys {
    export const Icon: string = "icon";
    export const Name: string = "name";
    export const Delete: string = "delete";
    export const Seed: string = "seed";
    export const Value: string = "value";
    export const Reset: string = "reset";
}
