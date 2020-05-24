/// <reference types="react" />

import * as React from "react";

import { PlanHubActionsCreator } from "ScaledAgile/Scripts/PlanHub/Actions/PlanHubActionsCreator";
import { PlanHubStore } from "ScaledAgile/Scripts/PlanHub/Stores/PlanHubStore";
import { IPlanHubStore, IPlanHubData } from "ScaledAgile/Scripts/PlanHub/Models/PlanHubStoreInterfaces";

export interface IPlansHubTabProps {
    planHubActionsCreator: PlanHubActionsCreator;
    planHubStore: PlanHubStore;
}

export interface IPlansHubTabState {
    planHubStoreData: IPlanHubData;
}

/**
 * Base class for plans hub tabs.
 */
export abstract class PlansHubTab<P extends IPlansHubTabProps, S extends IPlansHubTabState> extends React.Component<P, S> {
    private _onPlanHubStoreChanged: IEventHandler;

    constructor(props: P, context?: any) {
        super(props, context);

        this._initializeChangeHandlers();

        this.state = {
            planHubStoreData: this.props.planHubStore.getValue()
        } as S;
    }

    public componentDidMount() {
        this.props.planHubStore.addChangedListener(this._onPlanHubStoreChanged);
    }

    public componentWillUnmount() {
        this.props.planHubStore.removeChangedListener(this._onPlanHubStoreChanged);
        this._onPlanHubStoreChanged = null;
    }

    protected _initializeChangeHandlers() {
        this._onPlanHubStoreChanged = (store: IPlanHubStore) => {
            this.setState($.extend({}, this.state, { planHubStoreData: store.getValue() }));
        };
    }
}
