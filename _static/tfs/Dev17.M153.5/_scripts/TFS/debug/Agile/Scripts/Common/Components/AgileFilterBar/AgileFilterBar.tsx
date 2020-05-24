import * as React from "react";

import "VSS/LoaderPlugins/Css!Agile/Scripts/Common/Components/AgileFilterBar/AgileFilterBar";
import { AgileFilterManager } from "Agile/Scripts/Common/Components/AgileFilterBar/AgileFilterManager";
import { IFilterBarProps } from "VSSUI/FilterBar";
import { IFilterState } from "VSSUI/Utilities/Filter";
import { IObservableValue } from "VSS/Core/Observable";
import { WorkItemFilter } from "WorkItemTracking/Scripts/Controls/Filters/WorkItemFilter";
import { FilterState } from "WorkItemTracking/Scripts/Filtering/FilterManager";

export interface IAgileFilterContext {
    /** The filter manager which listens to filter events */
    filterManager: AgileFilterManager;

    /** Initial board filter state */
    initialFilterState: FilterState;

    /** Should skip focusing on mount */
    skipFocusOnMount?: boolean;
}

export interface IAgileFilterBarProps extends IFilterBarProps {
    /** The filter context */
    filterContext: IObservableValue<IAgileFilterContext>;

    /** Callback for when the filter changes */
    onFilterChanged?: (filterState: IFilterState) => void;
}

export interface IAgileFilterBarState {
    /** The filter manager used to fire filter events */
    filterManager: AgileFilterManager;
}

export class AgileFilterBar extends React.Component<IAgileFilterBarProps, IAgileFilterBarState> {
    private _filterControlRef: WorkItemFilter;

    constructor(props: IAgileFilterBarProps) {
        super(props);

        if (props.filterContext.value && props.filterContext.value.filterManager) {
            this.state = {
                filterManager: props.filterContext.value.filterManager
            };
        } else {
            this.state = {
                filterManager: null
            };
        }
    }

    public componentWillMount(): void {
        if (this.state.filterManager) {
            this.state.filterManager.activate();
        }
    }

    public componentDidMount(): void {
        this.props.filterContext.subscribe(this._onFilterContextUpdated);
        if (this.state.filterManager) {
            this.state.filterManager.attachOnDataUpdated(this._onDataUpdated);
        }

        const filterContext = this.props.filterContext.value;
        if (filterContext && filterContext.skipFocusOnMount) {
            filterContext.skipFocusOnMount = false;
        } else if (filterContext && !filterContext.skipFocusOnMount && this._filterControlRef) {
            this._filterControlRef.focus();
        }
    }

    public componentWillReceiveProps(nextProps: IAgileFilterBarProps): void {
        if (nextProps.filterContext !== this.props.filterContext) {
            this.props.filterContext.unsubscribe(this._onFilterContextUpdated);

            if (nextProps.filterContext) {
                nextProps.filterContext.subscribe(this._onFilterContextUpdated);
            }
        }
    }

    public componentWillUpdate(nextProps: IAgileFilterBarProps, nextState: IAgileFilterBarState): void {
        if (nextState.filterManager !== this.state.filterManager) {
            if (this.state.filterManager) {
                this.state.filterManager.detachOnDataUpdated(this._onDataUpdated);
            }
            if (nextState.filterManager) {
                nextState.filterManager.attachOnDataUpdated(this._onDataUpdated);
                nextState.filterManager.activate();
            }
        }
    }

    public render(): JSX.Element {
        const {
            filter,
            filterContext,
            onDismissClicked
        } = this.props;

        const {
            filterManager
        } = this.state;

        if (filterManager && filterContext.value) {
            return (
                <div className="agile-filter-bar">
                    <WorkItemFilter
                        ref={this._resolveFilterControlRef}
                        filter={filter}
                        initialFilterState={filterContext.value.initialFilterState}                        
                        filterUpdatedCallback={this._onFilterUpdated}
                        fields={filterManager.filterFields}
                        dataSource={filterManager.dataSource}
                        setDefaultFilter={true}
                        onDismissClicked={onDismissClicked}
                    />
                </div>
            );
        }

        return null;
    }

    public componentWillUnmount(): void {
        this._filterControlRef = null;
        this.props.filterContext.unsubscribe(this._onFilterContextUpdated);

        if (this.state.filterManager) {
            this.state.filterManager.detachOnDataUpdated(this._onDataUpdated);
        }
    }

    private _onFilterContextUpdated = (): void => {
        if (this._filterControlRef) {
            // Clear out cached pick list values
            this._filterControlRef.update();
        }

        this.setState({ filterManager: this.props.filterContext.value.filterManager });
    }

    private _resolveFilterControlRef = (filter: WorkItemFilter): void => {
        this._filterControlRef = filter;
    }

    private _onDataUpdated = (): void => {
        if (this._filterControlRef) {
            this._filterControlRef.update();
        }
    }

    private _onFilterUpdated = (): void => {
        const {
            onFilterChanged
        } = this.props;

        const {
            filterManager
        } = this.state;

        if (onFilterChanged) {
            onFilterChanged(filterManager.filter.getState());
        }
    }
}