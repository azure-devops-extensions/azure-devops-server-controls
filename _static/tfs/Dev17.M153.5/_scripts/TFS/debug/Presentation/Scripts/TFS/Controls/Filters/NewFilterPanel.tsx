import * as React from "react";
import * as ReactDOM from "react-dom";
import { focusFirstChild } from "OfficeFabric/Utilities";
import { NewClearFilterButton } from "Presentation/Scripts/TFS/Controls/Filters/NewClearFilterButton";

import { IFilterComponentProps } from "Presentation/Scripts/TFS/Controls/Filters/Components/IFilterComponent"
import { NewFilterPanelProps, FilterPanelState, FilterSearchCriteria, FilterState } from "Presentation/Scripts/TFS/Controls/Filters/IFilterPanel";
import { FilterHelpers } from "Presentation/Scripts/TFS/Controls/Filters/FilterHelpers";
import "VSS/LoaderPlugins/Css!Presentation/Controls/Filters/NewFilterPanel";
import "VSS/LoaderPlugins/Css!fabric";

export class NewFilterPanel extends React.Component<NewFilterPanelProps, FilterPanelState> {
    private _filterPanel: HTMLElement;

    constructor(props: any, context?: any) {
        super(props, context);

        const initialSearchCriteria: FilterSearchCriteria = {};
        React.Children.forEach(this.props.children, (child) => {
            const childElement = child as React.ReactElement<IFilterComponentProps>;
            if (!!childElement) {
                initialSearchCriteria[childElement.props.filterKey] = (childElement.props.filterValue ? childElement.props.filterValue : null);
            }
        })

        this.state = {
            filterState: FilterHelpers.hasNonEmptyProperties(initialSearchCriteria) ? FilterState.FILTER_APPLIED : FilterState.FILTER_CLEARED,
            currentSearchCriteria: initialSearchCriteria,
        };
    }

    public componentWillMount() {
        $("body").addClass("page-has-filters");
    }

    public componentWillUnmount() {
        $("body").removeClass("page-has-filters");
        this._filterPanel = null;
    }

    public componentWillReceiveProps(nextProps?: NewFilterPanelProps & { children?: React.ReactNode }): void {
        // Calculate the next searchCriteria from the new props of child components
        // that are recieved and set the initial state accordingly.
        let nextSearchCriteria: FilterSearchCriteria = {};

        React.Children.forEach(nextProps.children, (child: React.ReactChild) => {
            const childElement = child as React.ReactElement<IFilterComponentProps>;
            if (!!childElement){
                nextSearchCriteria[childElement.props.filterKey] = (childElement.props.filterValue ? childElement.props.filterValue : null);
            }
        });
        this.setState({
            filterState: FilterHelpers.hasNonEmptyProperties(nextSearchCriteria) ? FilterState.FILTER_APPLIED : FilterState.FILTER_CLEARED,
            currentSearchCriteria: nextSearchCriteria,
        });
    }

    public render(): JSX.Element {
        const childrenWithExtraProps = React.Children.map(this.props.children, (child: React.ReactChild) => {
                return child
                ? React.cloneElement(
                    child as React.ReactElement<IFilterComponentProps>,
                    {
                        onUserInput: (property, value) => { this.handleChange(property, value); },
                        filterValue: this.state.currentSearchCriteria[(child as React.ReactElement<IFilterComponentProps>).props.filterKey],
                    } as IFilterComponentProps)
                : undefined ;
            }
        );

        let style = this.props.isFilterPanelVisible ? {} : { display: "none" };
        return (

            <div className={"new-filter-panel-container"} role={"region"} aria-label={this.props.ariaLabel} style={style} ref={(panel) => this._filterPanel = panel}>
                <div className={"new-filter-panel " + this.props.className}>
                    {childrenWithExtraProps}
                    <NewClearFilterButton filterState={this.state.filterState} filterCleared={this.filterCleared.bind(this)} />
                </div>
            </div>
        );
    }

    private filterApplied(): void {
        this.setState((prevState, props) => {
            return {
                filterState: FilterState.FILTER_APPLIED,
                currentSearchCriteria: prevState.currentSearchCriteria,
            };
        }, () => this.props.filterUpdated(this.getSearchCriteria()));
    }

    private filterCleared(): void {
        this.setState((prevState, props) => {
            let newSearchCriteria = FilterHelpers.clearSearchCriteria(prevState.currentSearchCriteria);
            return {
                filterState: FilterState.FILTER_CLEARED,
                currentSearchCriteria: newSearchCriteria,
            };
        }, () => this.props.filterUpdated(this.getSearchCriteria()));

        if (this._filterPanel) {
            // focusing back to first filter component
            // this is a work around till we move to FilterBar component
            focusFirstChild(this._filterPanel);
        }
    }

    private handleChange(property: string, value: string): void {
        if (value === "") {
            value = null;
        }
        if (!(this.state.currentSearchCriteria[property] === value)) {
            this.setState((prevState: FilterPanelState, props: NewFilterPanelProps): FilterPanelState => {
                let newSearchCriteria: FilterSearchCriteria = $.extend({}, prevState.currentSearchCriteria, { [property]: value });
                return {
                    filterState: (FilterHelpers.hasNonEmptyProperties(newSearchCriteria) ? FilterState.FILTER_APPLIED : FilterState.FILTER_CLEARED),
                    currentSearchCriteria: newSearchCriteria,
                };
            }, () => this.props.filterUpdated(this.getSearchCriteria()));
        }
    }

    private getSearchCriteria(): FilterSearchCriteria {
        //returning a copy of searchCriteria so that caller cannot modify component's state.
        return $.extend({}, this.state.currentSearchCriteria);
    }
}