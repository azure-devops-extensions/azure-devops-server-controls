/// <reference types="react" />

import * as React from "react";

import * as Base from "DistributedTaskControls/Common/Components/Base";
import { IScope, IPublishTelemetryArg, VariablesTelemetryFeatureType } from "DistributedTaskControls/Variables/Common/Types";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { ProcessVariablesFilterActions } from "DistributedTaskControls/Variables/Filters/ProcessVariablesFilterActions";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { ProcessVariablesFilterStore, IProcessVariablesFilterState, IProcessVariablesFilterStoreArgs } from "DistributedTaskControls/Variables/Filters/ProcessVariablesFilterStore";
import { ProcessVariablesFilterKeys } from "DistributedTaskControls/Variables/Common/Constants";
import { Telemetry, Feature, Properties } from "DistributedTaskControls/Common/Telemetry";
import { ProcessVariablesFilterUtility } from "DistributedTaskControls/Variables/Filters/ProcessVariablesFilterUtility";
import * as Resources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";

import { SelectionMode } from "OfficeFabric/Selection";
import { autobind } from "OfficeFabric/Utilities";

import * as Utils_String from "VSS/Utils/String";
import { FilterBar } from "VSSUI/FilterBar";
import { KeywordFilterBarItem } from "VSSUI/TextFilterBarItem";
import { PickListFilterBarItem, IPickListItem } from "VSSUI/PickList";
import { FILTER_CHANGE_EVENT, IFilterState, Filter } from "VSSUI/Utilities/Filter";

export interface IProcessVariablesFilterProps extends Base.IProps {
    scopeKey?: number;
    onPublishTelemetry?: (arg: IPublishTelemetryArg) => void;
}

export class ProcessVariablesFilter extends Base.Component<IProcessVariablesFilterProps, IProcessVariablesFilterState> {

    constructor(props: IProcessVariablesFilterProps) {
        super(props);

        this._store = StoreManager.CreateStore<ProcessVariablesFilterStore, IProcessVariablesFilterStoreArgs>(ProcessVariablesFilterStore, props.instanceId, {
            scopeKey: this.props.scopeKey
        });

        this._actions = ActionsHubManager.GetActionsHub<ProcessVariablesFilterActions>(ProcessVariablesFilterActions, props.instanceId);

        this.state = this._store.getState();
        this.state.filter.subscribe(this._handleFilterUpdated, FILTER_CHANGE_EVENT);

        this._store.addChangedListener(this._onChanged);
    }

    public render(): JSX.Element {
        return (
            <div className="dtc-process-variables-filters">
                <FilterBar
                    filter={this.state.filter} >
                    {this._getFilterBarItems()}
                </FilterBar>
            </div>
        );
    }

    public componentWillUnmount() {
        if (this.state.filter) {
            this.state.filter.unsubscribe(this._handleFilterUpdated, FILTER_CHANGE_EVENT);
        }

        this._store.removeChangedListener(this._onChanged);
    }

    private _getFilterBarItems(): JSX.Element[] {
        let items: JSX.Element[] = [];

        items.push(this._getKeywordFilterBarItem());
        items.push(this._getScopeFilterBarItem());

        return items;
    }

    private _getKeywordFilterBarItem(): JSX.Element {
        return <KeywordFilterBarItem
            throttleWait={500}
            filter={this.state.filter}
            key={ProcessVariablesFilterKeys.Keyword}
            setKey={String(this._store.getActiveScopeKey())}
            filterItemKey={ProcessVariablesFilterKeys.Keyword} />;
    }

    private _getScopeFilterBarItem(): JSX.Element {
        return <PickListFilterBarItem
            className="dtc-variables-scope-filter"
            placeholder={Resources.ScopeText}
            showSelectAll={false}
            isSearchable={true}
            selectionMode={SelectionMode.multiple}
            filter={this.state.filter}
            key={ProcessVariablesFilterKeys.Scope}
            searchBoxAriaLabel={Resources.VariableScopeFilterSearchBoxAriaLabel}
            filterItemKey={ProcessVariablesFilterKeys.Scope}
            getListItem={(scope: IScope) => this._getPickListItem(scope)}
            getPickListItems={() => { return this.state.scopes; }} />;
    }

    private _getPickListItem(scope: IScope): IPickListItem {
        return {
            name: scope.value,
            key: String(scope.key)
        } as IPickListItem;
    }

    @autobind
    private _handleFilterUpdated(changedState: IFilterState): void {
        this._actions.filter.invoke(this.state.filter);
        this._publishTelemetry(this.state.filter);

        //  Publishing telemety if default scope is changed
        if (this.props.onPublishTelemetry && !!ProcessVariablesFilterUtility.areDefaultScopesChanged(ProcessVariablesFilterUtility.getScopes(this.state.filter), this._store.getDefaultScopes())) {
            this.props.onPublishTelemetry({
                variablesTelemetryFeatureType: VariablesTelemetryFeatureType.VariablesDefaultFilterChanged,
                variablesViewType: this._store.getSelectedView()
            });
        }
    }

    @autobind
    private _onChanged() {
        let state = this._store.getState();
        this.setState(state);
    }

    private _publishTelemetry(filter: Filter) {
        let eventProperties: IDictionaryStringTo<any> = {};

        const keyword = ProcessVariablesFilterUtility.getKeyword(filter);
        const scopes = ProcessVariablesFilterUtility.getScopes(filter);

        if (keyword) {
            eventProperties[Properties.filterByKeyword] = true;
        }

        if (scopes && scopes.length > 0) {
            eventProperties[Properties.filterByScope] = scopes.length;
        }

        eventProperties[Properties.selectedPivotView] = this._store.getSelectedView();

        Telemetry.instance().publishEvent(Feature.Variables, eventProperties);
    }

    private _actions: ProcessVariablesFilterActions;
    private _store: ProcessVariablesFilterStore;
}