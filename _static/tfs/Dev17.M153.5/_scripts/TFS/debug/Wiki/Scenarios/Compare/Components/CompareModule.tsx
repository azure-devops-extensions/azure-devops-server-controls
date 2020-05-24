import * as React from "react";

import { WikiV2 } from "TFS/Wiki/Contracts";
import { CompareActionCreator } from "Wiki/Scenarios/Compare/CompareActionCreator";
import { CompareActionsHub } from "Wiki/Scenarios/Compare/CompareActionsHub";
import { CompareContainer } from "Wiki/Scenarios/Compare/Components/CompareContainer";
import { SignalRSpy } from "Wiki/Scenarios/Compare/SignalRSpy";
import { WikiCompareSource } from "Wiki/Scenarios/Compare/Sources/WikiCompareSource";
import { CompareStoresHub } from "Wiki/Scenarios/Compare/Stores/CompareStoresHub";
import { SharedContainerProps } from "Wiki/Scenarios/Shared/Components/WikiContainer";
import { PerformanceConstants } from "Wiki/Scripts/CustomerIntelligenceConstants";

export class CompareModule extends React.Component<SharedContainerProps, {}> {
    private _actionCreator: CompareActionCreator;
    private _storesHub: CompareStoresHub;
    private _signalRSpy: SignalRSpy;

    constructor(props: SharedContainerProps) {
        super(props);

        const compareActionsHub = new CompareActionsHub();
        this._storesHub = new CompareStoresHub(this.props.sharedStoresHub, compareActionsHub);
        const wiki: WikiV2 = this._storesHub.state.sharedState.commonState.wiki;
        const repositoryContext = this._storesHub.state.sharedState.commonState.repositoryContext;
        this._actionCreator = new CompareActionCreator(
            this.props.sharedActionCreator,
            compareActionsHub,
            {
                wikiCompareSource: new WikiCompareSource(wiki, repositoryContext),
            },
        );

        this._signalRSpy = new SignalRSpy(this.props.sharedStoresHub);
    }

    public render(): JSX.Element {
        return (
            <CompareContainer
                actionCreator={this._actionCreator}
                storesHub={this._storesHub}
                onContentRendered={this._onContentRendered} />
        );
    }

    public componentWillUnmount(): void {
        if (this._storesHub) {
            this._storesHub.dispose();
            this._storesHub = null;
        }
        if (this._signalRSpy) {
            this._signalRSpy.dispose();
            this._signalRSpy = null;
        }

        this._actionCreator = null;
    }

    private _onContentRendered = (): void => {
        this.props.sharedActionCreator.notifyContentRendered(PerformanceConstants.Compare);
    }

}