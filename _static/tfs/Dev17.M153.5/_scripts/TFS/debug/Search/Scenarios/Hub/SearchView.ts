import * as ReactDOM from "react-dom";
import * as SearchPage from "Search/Scenarios/Hub/Components/Page";
import * as NavigationHandler from "Search/Scenarios/Hub/NavigationHandler";
import { NavigationView } from "VSS/Controls/Navigation";
import { ActionsHub } from "Search/Scenarios/Hub/Flux/ActionsHub";
import { ActionCreator, Sources } from "Search/Scenarios/Hub/Flux/ActionCreator";
import { StoresHub } from "Search/Scenarios/Hub/Flux/StoresHub";
import { ProvidersContributionSource } from "Search/Scenarios/Hub/Flux/Sources/ContributionSource";
import { HubTelemetryWriter } from "Search/Scenarios/Hub/Flux/Sources/TelemetryWriter";
import { TelemetrySpy } from "Search/Scenarios/Hub/Flux/Sources/TelemetrySpy";
import { ResultsCountSource } from "Search/Scenarios/Hub/Flux/Sources/ResultsCountSource";

export class SearchView extends NavigationView {
    private disposeActions: Function[] = [];
    private actionCreator: ActionCreator;
    private storesHub: StoresHub;
    private telemetrySpy: TelemetrySpy;

    public initializeOptions(options?: {}): void {
        super.initializeOptions({ attachNavigate: true, ...options });
    }

    public initialize(): void {
        const actionsHub = new ActionsHub();
        this.telemetrySpy = new TelemetrySpy(new HubTelemetryWriter(), actionsHub);
        this.storesHub = new StoresHub(actionsHub);
        this.actionCreator = new ActionCreator(
            actionsHub,
            {
                contributions: new ProvidersContributionSource(),
                resultsCount: new ResultsCountSource()
            },
            this._options._pageContext,
            this.storesHub.getAggregatedState,
            this.onFullScreen);

        SearchPage.renderInto(
            this.getRootElement(),
            {
                actionCreator: this.actionCreator,
                storesHub: this.storesHub
            });

        this.addDisposeActions();

        super.initialize();
    }

    public onNavigate(state: NavigationHandler.UrlParams): void {
        const providerStoreState = this.storesHub.contributedSearchTabsStore.state;
        NavigationHandler.applyNavigatedUrl(this.actionCreator, state, providerStoreState);
    }

    private getRootElement(): HTMLElement {
        return document.querySelector(".search-view") as HTMLElement;
    }

    private addDisposeActions = (): void => {
        // Unmount react nodes
        this.disposeActions.push(() =>
            ReactDOM.unmountComponentAtNode(this.getRootElement()));

        // Dispose provider in action
        this.disposeActions.push(() => {
            const { provider } = this.storesHub.getAggregatedState();
            this.actionCreator.disposeProvider(provider);
        });

        // dispose actionCreator subscriptions.
        this.disposeActions.push(() => this.actionCreator.dispose());

        // Dispose storesHub to unregister from all the actions.
        this.disposeActions.push(() => this.storesHub.dispose());

        // Dispose telemetry spy
        this.disposeActions.push(() => this.telemetrySpy.dispose());
    }

    private onFullScreen = (isFullScreen: boolean): void => {
        this.setFullScreenMode(isFullScreen);
    }

    protected _dispose(): void {
        if (this.disposeActions) {
            this.disposeActions.map(dispose => dispose());
            this.disposeActions = undefined;
        }

        super._dispose();
    }
}
