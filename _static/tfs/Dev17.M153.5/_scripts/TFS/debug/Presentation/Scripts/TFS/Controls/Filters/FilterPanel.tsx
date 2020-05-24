import * as React from "react";
import * as ReactDOM from "react-dom";
import { ClearFilterButton } from "Presentation/Scripts/TFS/Controls/Filters/ClearFilterButton";

import { IFilterComponentProps } from "Presentation/Scripts/TFS/Controls/Filters/Components/IFilterComponent"
import { FilterPanelProps, FilterPanelState, FilterSearchCriteria, FilterState } from "Presentation/Scripts/TFS/Controls/Filters/IFilterPanel";
import { FilterHelpers } from "Presentation/Scripts/TFS/Controls/Filters/FilterHelpers";
import "VSS/LoaderPlugins/Css!Presentation/Controls/Filters/FilterPanel";
import "VSS/LoaderPlugins/Css!fabric";

export class FilterPanel extends React.Component<FilterPanelProps, FilterPanelState> {

    constructor(props: any, context?: any) {
        super(props, context);

        let initialSearchCriteria: FilterSearchCriteria = {};
        React.Children.forEach(this.props.children, (child) => {
            let childElement = child as React.ReactElement<IFilterComponentProps>;
            initialSearchCriteria[childElement.props.filterKey] = (childElement.props.filterValue ? childElement.props.filterValue : null);
        })

        this.state = {
            filterState: FilterHelpers.hasNonEmptyProperties(initialSearchCriteria) ? FilterState.FILTER_APPLIED : FilterState.FILTER_CLEARED,
            currentSearchCriteria: initialSearchCriteria,
        };
    }

    public componentWillMount(){
        $("body").addClass("page-has-filters");
    }

    public componentWillUnmount(){
        $("body").removeClass("page-has-filters");
    }

    public componentWillReceiveProps(nextProps?: FilterPanelProps & { children?: React.ReactNode }): void {
        // Calculate the next searchCriteria from the new props of child components
        // that are recieved and set the initial state accordingly.
        let nextSearchCriteria: FilterSearchCriteria = {};

        React.Children.forEach(nextProps.children, (child: React.ReactChild) => {
            let childElement = child as React.ReactElement<IFilterComponentProps>;
            nextSearchCriteria[childElement.props.filterKey] = (childElement.props.filterValue ? childElement.props.filterValue : null);
        })
        this.setState({
            filterState: FilterHelpers.hasNonEmptyProperties(nextSearchCriteria) ? FilterState.FILTER_APPLIED : FilterState.FILTER_CLEARED,
            currentSearchCriteria: nextSearchCriteria,
        });
    }

    public render(): JSX.Element {
        let childrenWithExtraProps = React.Children.map(this.props.children, (child: React.ReactChild) =>
            React.cloneElement(child as React.ReactElement<IFilterComponentProps> as any,
                {
                    onUserInput: (property, value) => { this.handleChange(property, value); },
                    filterValue: this.state.currentSearchCriteria[(child as React.ReactElement<IFilterComponentProps>).props.filterKey],
                }
            ));
        return (
            <div className={"filter-panel-container"} role={"region"} aria-label={this.props.ariaLabel}>
                <div className={"filter-panel " + this.props.className}>
                    <ClearFilterButton filterState={this.state.filterState} filterCleared={this.filterCleared.bind(this) } />
                    {childrenWithExtraProps}
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
    }

    private handleChange(property: string, value: string): void {
        if (value === "") {
            value = null;
        }
        if (!(this.state.currentSearchCriteria[property] === value)) {
            this.setState((prevState: FilterPanelState, props: FilterPanelProps): FilterPanelState => {
                let newSearchCriteria: FilterSearchCriteria = $.extend({}, prevState.currentSearchCriteria,{[property]: value});
                return {
                    filterState: (FilterHelpers.hasNonEmptyProperties(newSearchCriteria) ? FilterState.FILTER_APPLIED : FilterState.FILTER_CLEARED),
                    currentSearchCriteria: newSearchCriteria,
                };
            }, () => this.props.filterUpdated(this.getSearchCriteria()));
        }
    }

    private getSearchCriteria(): FilterSearchCriteria  {
        //returning a copy of searchCriteria so that caller cannot modify component's state.
        return $.extend({}, this.state.currentSearchCriteria);
    }

}