import * as React from 'react';
import { Label } from 'OfficeFabric/Label';
import { getId } from 'OfficeFabric/Utilities';
import { PickListDropdown, IPickListSelection, IPickListItem } from "VSSUI/PickList";
import { SelectionMode } from "OfficeFabric/Selection";
import { FilterEntityData, DistinctValuesFilterEntityQuery } from 'TestManagement/Scripts/TestReporting/Analytics/Widgets/AnalyticsTestTrend/Queries/DistinctValuesFilterEntityQuery'
import { WidgetsCacheableQueryService } from "Widgets/Scripts/DataServices/WidgetsCacheableQueryService";
import { ProjectCollection } from "Presentation/Scripts/TFS/TFS.OM.Common";
import { GroupingProperty, Workflow } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/Types";
import { GroupingPropertyUtility } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/GroupingPropertyUtility";
import { AnalyticsTestTrendCoreSettings } from 'TestManagement/Scripts/TestReporting/Analytics/Widgets/AnalyticsTestTrend/AnalyticsTestTrendSettings';
import { WorkflowRestrictedComponent } from 'TestManagement/Scripts/TestReporting/Widgets/Config/Components/WorkflowRestrictedComponent';
import { WorkflowUtility } from 'TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/WorkflowUtility';

interface FilterStrategy {
    getPicklistItems: () => any[] | Promise<any[]>;
    getListItem: (item: any) => IPickListItem;
    workflowRestrictedTo: Workflow,
}

export interface FiltersPickerRowProps<T> {
    workflow: Workflow;
    workflowPickerPropertyName: string;
    coreSettings: AnalyticsTestTrendCoreSettings;
    filter: GroupingProperty;
    values: T[];
    onChanged: (values: T[]) => void;
    workflowFilters: Workflow[];
}

export class FiltersPickerRow<T> extends React.Component<FiltersPickerRowProps<T>, {}> {

    private labelId = getId("test-runs-picker-label");
    private dataService: WidgetsCacheableQueryService;

    constructor(props: FiltersPickerRowProps<T>) {
        super(props);
        this.dataService = ProjectCollection.getDefaultConnection().getService(WidgetsCacheableQueryService);
    }

    private getEntities(): IPromise<FilterEntityData[]> {
        let query = new DistinctValuesFilterEntityQuery(
            this.props.filter,
            this.props.coreSettings,
            this.props.workflowFilters,
        );
        return this.dataService.getCacheableQueryResult(query);
    }

    private isDisabled() {
        let pipelines = this.props.workflow === Workflow.Build ? this.props.coreSettings.buildPipelines : this.props.coreSettings.releasePipelines;
        return (pipelines.length === 0);
    }

    private getFilterStrategy(): FilterStrategy {
        switch (this.props.filter) {
            case GroupingProperty.Workflow:
                return {
                        getPicklistItems: () => [Workflow.Build, Workflow.Release],
                        getListItem: (workflow: Workflow) => ({
                            name: WorkflowUtility.getDisplayName(workflow),
                            key: String(workflow),
                        }),
                        workflowRestrictedTo: Workflow.Build,
                };

            default:
                return {
                    getListItem: (item: FilterEntityData) => {
                        return {
                            name: item.name,
                            key: item.name,
                        }
                    },
                    getPicklistItems: () => Promise.resolve(this.getEntities()),
                    workflowRestrictedTo: 0, // No restriction
                }
        }
    }

    render(): JSX.Element {
        let filterStrategy = this.getFilterStrategy();
        return (
            <WorkflowRestrictedComponent
                workflowPickerPropertyName={this.props.workflowPickerPropertyName}
                restrictedTo={filterStrategy.workflowRestrictedTo}
            >
                <Label id={this.labelId}>{GroupingPropertyUtility.getDisplayName(this.props.filter)}</Label>
                <PickListDropdown
                    selectionMode={SelectionMode.multiple}
                    isSearchable
                    disabled={this.isDisabled()}
                    getPickListItems={filterStrategy.getPicklistItems}
                    getListItem={filterStrategy.getListItem}
                    selectedItems={this.props.values}
                    onSelectionChanged={(selection: IPickListSelection) => this.props.onChanged(selection.selectedItems)}
                    ariaDescribedBy={this.labelId}
                />
            </WorkflowRestrictedComponent>
        );
    }
}