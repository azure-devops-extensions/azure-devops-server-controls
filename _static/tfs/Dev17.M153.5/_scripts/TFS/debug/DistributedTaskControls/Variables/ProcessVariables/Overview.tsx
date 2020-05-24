/// <reference types="react" />

import * as React from "react";

import * as Base from "DistributedTaskControls/Common/Components/Base";
import { ItemOverviewProps } from "DistributedTaskControls/Common/Item";
import { ITwoPanelOverviewProps, TwoPanelOverviewComponent } from "DistributedTaskControls/Components/TwoPanelOverviewComponent";
import { IVariablesOverviewState } from "DistributedTaskControls/Variables/Common/ComponentBase";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { ProcessVariablesStore } from "DistributedTaskControls/Variables/ProcessVariables/DataStore";
import { ErrorComponent } from "DistributedTaskControls/SharedControls/ErrorComponent/ErrorComponent";

import * as Resources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";

import "VSS/LoaderPlugins/Css!DistributedTaskControls/Variables/ProcessVariables/Item";

export interface IProcessVariableItemOverviewProps extends ItemOverviewProps {
    title: string;
    supportsScopes?: boolean;
}

export class ProcessVariableOverview extends Base.Component<IProcessVariableItemOverviewProps, IVariablesOverviewState> {

    constructor(props: IProcessVariableItemOverviewProps) {
        super(props);
        this._store = StoreManager.GetStore<ProcessVariablesStore>(ProcessVariablesStore);
        this._store.addChangedListener(this._onChange);

        this.state = { isValid: this._store.isValid() };
    }
  
    public componentWillUnmount(): void {
        this._store.removeChangedListener(this._onChange);
    }

    public render(): JSX.Element {
        let overviewProps = {
            title: this.props.title,
            view: this._getView(),
            item: this.props.item,
            instanceId: this.props.instanceId,
            overviewClassName: "process-variables-overview"
        } as ITwoPanelOverviewProps;

        return (
            <div className="process-variables-overview-container">
                <TwoPanelOverviewComponent {...overviewProps} />
            </div>
        );
    }

    private _getView(): JSX.Element {
        let errorMessage: string = null;
        if (!this.state.isValid) {
            if (!this.props.supportsScopes) {
                //  CI scenario - no scope support
                errorMessage = Resources.VariablesNeedAttention;
            }
            else {
                //  CD scenario - scope support exists
                errorMessage = this._store.getVariableOverviewErrorMessage();
            }
            return (
                <ErrorComponent
                    cssClass="dtc-vg-overview-error"
                    errorMessage={errorMessage} />
            );
        }

        return null;
    }

    private _onChange = () => {
        this.setState({ isValid: this._store.isValid() });
    }

    private _store: ProcessVariablesStore;
}
