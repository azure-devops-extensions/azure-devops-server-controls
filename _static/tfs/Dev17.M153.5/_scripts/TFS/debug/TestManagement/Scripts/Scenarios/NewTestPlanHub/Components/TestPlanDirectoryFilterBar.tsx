import * as React from "react";
import * as Utils_String from "VSS/Utils/String";
import { autobind, BaseComponent, IBaseProps } from "OfficeFabric/Utilities";
import { FilterBar, IFilterBar } from "VSSUI/FilterBar";
import { KeywordFilterBarItem } from "VSSUI/TextFilterBarItem";
import {
    Filters,
    ITestPlanDirectoryFilterBarComponentState,
    ITestPlanFilterField,
    TestPlanFilterFieldType
} from "TestManagement/Scripts/Scenarios/NewTestPlanHub/Contracts";
import { IPickListItem, PickListFilterBarItem } from "VSSUI/PickList";
import { SelectionMode } from "OfficeFabric/Selection";
import { TelemetryService } from "TestManagement/Scripts/TFS.TestManagement.Telemetry";
import { TestPlanDirectoryStore } from "TestManagement/Scripts/Scenarios/NewTestPlanHub/Stores/TestPlanDirectoryStore";

export interface ITestPlanDirectoryFilterBarComponentProps extends IBaseProps {
    store: TestPlanDirectoryStore;
    fields: ITestPlanFilterField[];
    className: string;

    /**
     * Optional callback to access the ITestPlanDirectoryFilterBar interface. Use this instead of ref for accessing
     * the public methods and properties of the component.
     */
    componentRef?: (component: ITestPlanDirectoryFilterBar) => void;
}

export interface ITestPlanDirectoryFilterBar {
    /**
     *  Sets focus on the first filter item on the filter bar.
     */
    focus(): void;
}

export class TestPlanDirectoryFilterBar extends BaseComponent<ITestPlanDirectoryFilterBarComponentProps, ITestPlanDirectoryFilterBarComponentState> implements ITestPlanDirectoryFilterBar {

    private _filterBar: IFilterBar;

    constructor(props: ITestPlanDirectoryFilterBarComponentProps) {
        super(props);

        this.state = props.store.getPivotFilterBarState();
    }

    public componentWillMount(): void {
        this.props.store.addChangedListener(this._onStoreChanged);
    }

    public componentWillUnmount(): void {
        this.props.store.removeChangedListener(this._onStoreChanged);
    }

    public componentDidMount(): void {
        TelemetryService.publishEvent(TelemetryService.featureNewTestPlanHub, TelemetryService.testPlanDirectoryFilterClick, Utils_String.empty);
    }

    public render() {
        if (!this.state.isLoading) {

            const fields = this.props.fields;

            const filters: JSX.Element[] = fields.map(filterField => {
                if (filterField.displayType === TestPlanFilterFieldType.Text) {
                    return <KeywordFilterBarItem
                        key={filterField.fieldName}
                        filter={this.state.activeFilter}
                        filterItemKey={filterField.fieldName}
                        placeholder={filterField.placeHholder}
                    />;

                } else if (filterField.displayType === TestPlanFilterFieldType.CheckboxList) {
                    return <PickListFilterBarItem
                        key={filterField.fieldName}
                        filter={this.state.activeFilter}
                        filterItemKey={filterField.fieldName}
                        selectionMode={SelectionMode.multiple}
                        placeholder={filterField.placeHholder}
                        getPickListItems={() => this._getItemsToRender(filterField.fieldName) }
                        getListItem={(item) => item as IPickListItem}
                        showSelectAll={false}
                        isSearchable={true}
                    />;
                }
            });

            return (
                <div className={this.props.className}>
                    <FilterBar
                        filter={this.state.activeFilter}
                        componentRef={this._setFilterBar}>
                        {filters}
                    </FilterBar>
                </div>);
        }

        //  Avoid rendering the component while loading data.
        return null;
    }

    /**
     *  Sets focus on the first filter item on the filter bar.
     */
    public focus() {
        if (this._filterBar) {
            this._filterBar.focus();
        }
    }

    /**
     *  Update state when store is updated.
     */
    @autobind
    protected _onStoreChanged() {
        this.setState(this.props.store.getPivotFilterBarState());
    }

    /**
     * Retrieves the initial set of values to show.These are just text, during render for the picklist 'getListItem' is called
    * which will return the actual data to be rendered.
     * @param fieldName Name of the field to get the unique values for
     */
    protected _getItemsToRender(fieldName: string): IPickListItem[] {
        return this.state.fields[fieldName];
    }

    @autobind
    private _setFilterBar(item: IFilterBar): void {
        this._filterBar = item;
    }

}
