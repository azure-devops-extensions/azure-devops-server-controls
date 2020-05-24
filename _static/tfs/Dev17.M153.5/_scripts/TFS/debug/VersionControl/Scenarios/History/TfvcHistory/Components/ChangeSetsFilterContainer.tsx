import * as React from "react";
import { TfvcHistoryActionCreator } from 'VersionControl/Scenarios/History/TfvcHistory/Actions/TfvcHistoryActionCreator';
import { ChangesetsFilter, ChangesetsFilterSearchCriteria } from 'VersionControl/Scenarios/History/TfvcHistory/Components/ChangesetsFilter';
import { Container } from 'VersionControl/Scenarios/History/TfvcHistory/Components/Container';
import { TfvcChangesetsFilterStore } from 'VersionControl/Scenarios/History/TfvcHistory/Stores/TfvcChangesetsFilterStore';

export interface ChangesetsFilterContainerProps {
    actionCreator: TfvcHistoryActionCreator;
    filterStore: TfvcChangesetsFilterStore;
}

export interface ChangesetsFilterContainerState {
    searchCriteria: ChangesetsFilterSearchCriteria;
}

export class ChangesetsFilterContainer extends Container<ChangesetsFilterContainerProps, ChangesetsFilterContainerState> {

    constructor(props: ChangesetsFilterContainerProps) {
        super(props);
    }

    public render(): JSX.Element {
        return <ChangesetsFilter
            filterUpdatedCallback={this.props.actionCreator.updateFilters}
            initialSearchCriteria={this.state.searchCriteria} />;
    }

    protected getStateFromStores(props: ChangesetsFilterContainerProps): ChangesetsFilterContainerState {
        return {
            searchCriteria: props.filterStore.state,
        };
    }
}
