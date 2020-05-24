/// <reference types="react" />

import * as React from "react";
import { Component, Props, State } from "VSS/Flux/Component";
import * as Constants from "WorkCustomization/Scripts/Constants";
import { FilterBar } from "VSSUI/FilterBar";
import { KeywordFilterBarItem } from "VSSUI/TextFilterBarItem";
import Resources = require("WorkCustomization/Scripts/Resources/TFS.Resources.WorkCustomization");
import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import { FeatureAvailabilityFlags } from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";
import { Filter, IFilterState, FILTER_CHANGE_EVENT } from "VSSUI/Utilities/Filter";
import * as Navigation_Services from "VSS/Navigation/Services";
import { updateFilterAction, IFilterUpdatePayload } from "WorkCustomization/Scripts/Common/Actions/ProcessAdminFilterActions";
import { autobind } from "OfficeFabric/Utilities";
import { PageLearnMoreLink } from "WorkCustomization/Scripts/Common/Components/LearnMoreLink";

export class ProcessNavFilterState {
    private _filter: Filter;

    constructor() {
        this._filter = new Filter();
    }

    public showFilter: boolean;
    public filterPlaceholder: string;
    
    public get filter(): Filter {
        return this._filter;
    }
}

export class ProcessNavFilter extends Component<Props, ProcessNavFilterState>
{
    private _state: ProcessNavFilterState;

    constructor(props: Props) {
        super(props);
        this.resetFilter(Navigation_Services.getHistoryService().getCurrentState().action);
    }

    public render() {
        if (this.getState().showFilter) {
            return <div className="process-admin-filter-container">
                <div className="learn-more-link"><PageLearnMoreLink href={Resources.ProcessesFwLink} /></div>
                <FilterBar filter={this.getState().filter} className="process-admin-filter">
                    <KeywordFilterBarItem
                        filterItemKey={Constants.FilterConstants.filterItemKey}
                        placeholder={this.getState().filterPlaceholder}
                        />
                </FilterBar>
            </div>
        }
        else {
            return <div />;
        }
    }


    public getState(): ProcessNavFilterState {
        if (this._state == null) {
            this._state = new ProcessNavFilterState();
        }
        return this._state;
    }

    public componentDidMount(): void {
        Navigation_Services.getHistoryService().attachNavigate("*", this._historyHandler, true);
        this.getState().filter.subscribe(this._onFilterApplied, FILTER_CHANGE_EVENT);
    }

    /**
     * Enables/disables filter on the page based on the url and resets the state
     */
    public resetFilter(action: string) {
        this.getState().filter.reset();

        let filterOnPage = Constants.FilterConstants.filterEnabledPages.filter(a=>a.pageAction === action);
        let showFilter: boolean = filterOnPage != null && filterOnPage.length > 0;
        this.getState().showFilter = showFilter;

        if (showFilter) {
    
            this.getState().filterPlaceholder = filterOnPage[0].filterPlaceholder;
            
            let payload: IFilterUpdatePayload = {
                filterValue: null
            }
            updateFilterAction.invoke(payload);
        }
    }

    @autobind
    private _onFilterApplied(currentState: IFilterState): void {
        let filterState = this.getState().filter.getFilterItemState(Constants.FilterConstants.filterItemKey);

        if (!filterState) {
            return;
        }

        let payload: IFilterUpdatePayload = {
            filterValue: filterState.value
        };
        updateFilterAction.invoke(payload);
    }

    @autobind
    private _historyHandler(sender, state) {
        this.resetFilter(state.action);
    }

    public componentWillUnmount(): void {
        super.componentWillUnmount();
        Navigation_Services.getHistoryService().detachNavigate("*", this._historyHandler);

        this.getState().filter.unsubscribe(this._onFilterApplied, FILTER_CHANGE_EVENT);
    }
}