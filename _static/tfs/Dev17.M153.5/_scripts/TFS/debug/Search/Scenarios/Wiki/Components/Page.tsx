import { Fabric } from "OfficeFabric/Fabric";
import * as React from "react";
import * as ReactDOM from "react-dom";

import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";

import { ActionCreator } from "Search/Scenarios/Wiki/ActionCreator";
import { FilterSection } from "Search/Scenarios/Wiki/Components/FilterSection";
import { HeaderSection } from "Search/Scenarios/Wiki/Components/HeaderSection";
import { SearchResultsList } from "Search/Scenarios/Wiki/Components/SearchResultsList";
import { ContributedSearchTabsStoreState } from "Search/Scenarios/Wiki/Stores/ContributedSearchTabsStore";
import { SearchState } from "Search/Scenarios/Wiki/Stores/SearchStore";
import { StoresHub } from "Search/Scenarios/Wiki/Stores/StoresHub";

import "VSS/LoaderPlugins/Css!fabric";

export interface PageProps {
    actionCreator: ActionCreator;
    storesHub: StoresHub;
}

export interface PageState {
    tfsContext: TfsContext;
    searchState: SearchState;
    contributionsState: ContributedSearchTabsStoreState;
}

export function renderInto(container: HTMLElement, props: PageProps): void {
    ReactDOM.render(
        <Page {...props} />,
        container);
}

export class Page extends React.Component<PageProps, PageState> {
    private _isMounted: boolean;

    constructor(props: PageProps) {
        super(props);
        this.state = this.getStateFromStores();
    }

    public componentDidMount(): void {
        this._isMounted = true;
        this.props.storesHub.contextStore.addChangedListener(this.onStoreChanged);
        this.props.storesHub.searchStore.addChangedListener(this.onStoreChanged);
        this.props.storesHub.contributionsStore.addChangedListener(this.onStoreChanged);
    }

    public componentWillUnmount(): void {
        this.props.storesHub.contextStore.removeChangedListener(this.onStoreChanged);
        this.props.storesHub.searchStore.removeChangedListener(this.onStoreChanged);
        this.props.storesHub.contributionsStore.removeChangedListener(this.onStoreChanged);
        this._isMounted = false;
    }

    public render(): JSX.Element {
        const props = {...this.state, ...this.props};
        return (
            <Fabric className={"wikisearch-page absolute-full"}>
                <HeaderSection {...props} />
                <FilterSection {...props} />
                <SearchResultsList {...props} />
            </Fabric>
        );
    }

    private onStoreChanged = (): void => {
        if (this._isMounted) {
            this.setState(this.getStateFromStores());
        }
    }

    private getStateFromStores(): PageState {
        const { contextStore, searchStore, contributionsStore } = this.props.storesHub;
        return {
            tfsContext: contextStore.getTfsContext(),
            searchState: searchStore.state,
            contributionsState: contributionsStore.state
        };
    }
}
