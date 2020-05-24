
import * as ReactDOM from "react-dom";
import { NavigationView } from "VSS/Controls/Navigation";
import { getHistoryService } from "VSS/Navigation/Services";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";

import { ResultsCountSource } from "Search/Scenarios/Hub/Flux/Sources/ResultsCountSource";
import { ActionCreator } from "Search/Scenarios/Wiki/ActionCreator";
import {ActionsHub} from "Search/Scenarios/Wiki/ActionsHub";
import * as SearchPage from "Search/Scenarios/Wiki/Components/Page";
import { ContributionsSource } from "Search/Scenarios/Wiki/Sources/ContributionsSource";
import { TelemetrySpy } from "Search/Scenarios/Wiki/Sources/TelemetrySpy";
import { TelemetryWriter } from "Search/Scenarios/Wiki/Sources/TelemetryWriter";
import { WikiSearchSource } from "Search/Scenarios/Wiki/Sources/WikiSearchSource";
import { StoresHub, AggregateState } from "Search/Scenarios/Wiki/Stores/StoresHub";
import * as UrlPageHandler from "Search/Scenarios/Wiki/UrlPageHandler";
import { getSearchEntity } from "Search/Scripts/React/Models";

import "VSS/LoaderPlugins/Css!Search/WikiSearch";

export class WikiSearchView extends NavigationView {
    private actionCreator: ActionCreator;
    private disposeActions: Function[] = [];
    private rawState: {};
    private getAggregateState: () => AggregateState;
    private _telemetrySpy: TelemetrySpy;
    
    public initializeOptions(options?: {}): void {
        super.initializeOptions({ attachNavigate: true, ...options });
    }

    public initialize(): void {
        this.initializeFlux();
        super.initialize();
    }

    public _onNavigate(state: {}) {
        this.rawState = state;

        if (this.actionCreator) {
            UrlPageHandler.applyNavigatedUrl(this.actionCreator, this.rawState, this.getAggregateState());
        }
    }

    private initializeFlux(): void {
        const tfsContext = this._options.tfsContext || TfsContext.getDefault();

        const actionsHub = new ActionsHub();
        const storesHub = new StoresHub(actionsHub);
        this.getAggregateState = storesHub.getAggregateState;        
        const telemetryWriter = new TelemetryWriter();
        this._telemetrySpy = new TelemetrySpy(telemetryWriter, actionsHub);

        this.actionCreator = new ActionCreator(
            actionsHub,
            {
                wikiSearch: new WikiSearchSource(),
                contributions: new ContributionsSource(),
                countSource: new ResultsCountSource()
            },
            storesHub.getAggregateState);

        this.actionCreator.loadInitialState(tfsContext);

        SearchPage.renderInto(
            this.getRootElement(),
            {
                actionCreator: this.actionCreator,
                storesHub
            });

        this.disposeActions.push(() =>
            ReactDOM.unmountComponentAtNode(this.getRootElement()));

        storesHub.contributionsStore.addChangedListener(this.updateUrl);
        storesHub.searchStore.addChangedListener(this.updateTitle);
        storesHub.searchStore.addChangedListener(this.updateUrl);

        this.disposeActions.push(() => {
            storesHub.contributionsStore.removeChangedListener(this.updateUrl);
            storesHub.searchStore.removeChangedListener(this.updateTitle);
            storesHub.searchStore.removeChangedListener(this.updateUrl);
            if (this._telemetrySpy) {
                this._telemetrySpy.dispose();
                this._telemetrySpy = null;
            }
        });
    }

    private updateUrl = (): void => {
        if (!this.rawState) {
            return;
        }

        const nextParams = UrlPageHandler.getUrlParamters(this.getAggregateState(), this.rawState);
        const willRedirect = UrlPageHandler.redirectIfNeeded(this.getAggregateState(), nextParams);
        if (willRedirect) {
            this._dispose();
            return;
        }

        if (UrlPageHandler.areEqualUrlParameters(nextParams, this.rawState)) {
            return;
        }

        const params = {suppressNavigate: true, mergeParams: false};
        getHistoryService().addHistoryPoint(undefined, nextParams, undefined, params.suppressNavigate, params.mergeParams);
        this.rawState = nextParams;
    }

    private updateTitle = (): void => {
        const {searchState: { searchText }, contributionsState: { currentTab } } = this.getAggregateState();

        if (searchText) {
            const searchHint = getSearchEntity(currentTab).placeholderText;
            this.setWindowTitle(`${searchText} - ${searchHint}`);
        }
    }

    private getRootElement(): HTMLElement {
        return document.querySelector(".search-view") as HTMLElement;
    }

    protected _dispose(): void {
        if (this.disposeActions) {
            this.disposeActions.map(dispose => dispose());
            this.disposeActions = undefined;
        }

        super._dispose();
    }
}
