/// <reference types="react" />

import * as React from "react";

import * as Base from "DistributedTaskControls/Common/Components/Base";
import { ItemOverviewProps } from "DistributedTaskControls/Common/Item";
import { ITwoPanelOverviewProps, TwoPanelOverviewComponent } from "DistributedTaskControls/Components/TwoPanelOverviewComponent";
import { IVariablesOverviewState } from "DistributedTaskControls/Variables/Common/ComponentBase";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { VariableGroupDataStore } from "DistributedTaskControls/Variables/VariableGroup/Store/VariableGroupDataStore";
import { ErrorComponent } from "DistributedTaskControls/SharedControls/ErrorComponent/ErrorComponent";

import * as Resources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";

export class VariableGroupOverview extends Base.Component<ItemOverviewProps, IVariablesOverviewState> {

    constructor(props: ItemOverviewProps) {
        super(props);
        this._store = StoreManager.GetStore<VariableGroupDataStore>(VariableGroupDataStore);
        this._store.addChangedListener(this._onChange);

        this.state = { isValid: this._store.isValid() };
    }

    public componentWillUnmount(): void {
        this._store.removeChangedListener(this._onChange);
    }

    public render(): JSX.Element {
        let overviewProps = {
            title: Resources.LinkedVariableGroupsText,
            ariaProps: {
                describedBy: this._errorComponentId
            },
            view: this._getView(),
            item: this.props.item,
            instanceId: this.props.instanceId,
            overviewClassName: "variable-group-overview"
        } as ITwoPanelOverviewProps;

        return (
            <div className="variable-group-overview-container">
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
                    errorMessage={Resources.VariableGroupsNeedAttention} />
            );
        }

        return null;
    }

    private _onChange = () => {
        this.setState({ isValid: this._store.isValid() });
    }

    private _errorComponentId: string = "error-component-vg-overview";
    private _store: VariableGroupDataStore;
}
