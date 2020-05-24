import * as React from "react";

import { SharedContainerProps } from "Wiki/Scenarios/Shared/Components/WikiContainer";

import { HistoryContainer } from "Wiki/Scenarios/History/Components/HistoryContainer";
import { HistoryActionCreator } from "Wiki/Scenarios/History/HistoryActionCreator";
import { HistoryActionsHub } from "Wiki/Scenarios/History/HistoryActionsHub";
import { HistoryStoresHub } from "Wiki/Scenarios/History/HistoryStoresHub";
import { PerformanceConstants } from "Wiki/Scripts/CustomerIntelligenceConstants";

export class HistoryModule extends React.Component<SharedContainerProps, {}> {
    private _actionCreator: HistoryActionCreator;
    private _storesHub: HistoryStoresHub;

    public componentWillMount(): void {
        const historyActionsHub = new HistoryActionsHub();
        this._storesHub = new HistoryStoresHub(this.props.sharedStoresHub, historyActionsHub);
        const repositoryContext = this._storesHub.state.sharedState.commonState.repositoryContext;

        this._actionCreator = new HistoryActionCreator(
            this.props.sharedActionCreator,
            historyActionsHub,
            {},
        );
    }

    public componentWillUnmount(): void {
        if (this._storesHub) {
            this._storesHub.dispose();
            this._storesHub = null;
        }

        this._actionCreator = null;
    }

    public render(): JSX.Element {
        return (
            <HistoryContainer
                actionCreator={this._actionCreator}
                storesHub={this._storesHub}
                onScenarioComplete={this._onScenarioComplete}
                />
        );
    }

    private _onScenarioComplete = (): void => {
        this.props.sharedActionCreator.notifyContentRendered(PerformanceConstants.Revisions);
    }
}
