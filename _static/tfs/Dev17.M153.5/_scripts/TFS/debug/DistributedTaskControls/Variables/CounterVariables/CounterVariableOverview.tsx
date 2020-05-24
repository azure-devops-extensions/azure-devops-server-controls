/// <reference types="react" />

import * as React from "react";

import * as Base from "DistributedTaskControls/Common/Components/Base";
import { ItemOverviewProps } from "DistributedTaskControls/Common/Item";
import { ITwoPanelOverviewProps, TwoPanelOverviewComponent } from "DistributedTaskControls/Components/TwoPanelOverviewComponent";
import { IVariablesOverviewState } from "DistributedTaskControls/Variables/Common/ComponentBase";
import { CounterVariableDataStore } from "DistributedTaskControls/Variables/CounterVariables/Store/CounterVariableDataStore";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { ErrorComponent } from "DistributedTaskControls/SharedControls/ErrorComponent/ErrorComponent";

import * as Resources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";

export class CounterVariableOverview extends Base.Component<ItemOverviewProps, IVariablesOverviewState> {
    public componentWillMount(): void {
        this._store = StoreManager.GetStore<CounterVariableDataStore>(CounterVariableDataStore);
        this._store.addChangedListener(this._onChange);

        this._onChange();
    }

    public componentWillUnmount(): void {
        this._store.removeChangedListener(this._onChange);
    }

    public render(): JSX.Element {
        const overviewProps = {
            title: Resources.CounterVariablesOverviewText,
            view: this._getView(),
            item: this.props.item,
            instanceId: this.props.instanceId,
            overviewClassName: "variable-counter-overview",
            ariaProps: {
                describedBy: this._errorComponentId
            }
        } as ITwoPanelOverviewProps;

        return (
            <div className="variable-counter-overview-container">
                <TwoPanelOverviewComponent {...overviewProps} />
            </div>
        );
    }

    private _getView(): JSX.Element {
        if (!this.state.isValid) {
            return (
                <ErrorComponent
                    id={this._errorComponentId}
                    cssClass="dtc-vg-overview-error"
                    errorMessage={Resources.VariablesNeedAttention} />
            );
        }

        return null;
    }

    private _onChange: Function = () => this.setState({ isValid: this._store.isValid() });

    private _errorComponentId: string = "error-component-variable-overview";
    private _store: CounterVariableDataStore;
}
