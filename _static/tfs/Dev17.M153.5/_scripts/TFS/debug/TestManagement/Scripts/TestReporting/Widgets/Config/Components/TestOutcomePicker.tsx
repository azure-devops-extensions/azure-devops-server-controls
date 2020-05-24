import * as React from 'react';

import { Label } from 'OfficeFabric/Label';
import { getId } from 'OfficeFabric/Utilities';
import { SelectionMode } from "OfficeFabric/Selection";

import { PickListDropdown, IPickListSelection } from "VSSUI/PickList";

import * as Resources from 'TestManagement/Scripts/Resources/TFS.Resources.TestManagement';
import { TestOutcome } from 'TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/Types';
import { ReportConfigurationDefinition } from 'TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/Definitions';

export interface TestOutcomePickerProps {
    testOutcomes: TestOutcome[];
    onChanged: (testOutcomes: TestOutcome[]) => void;
}
export class TestOutcomePicker extends React.Component<TestOutcomePickerProps, {}> {

    private testOutcomeDictionary: IDictionaryNumberTo<string>;

    constructor(props: TestOutcomePickerProps) {
        super(props);

        const reportConfigurationDefinition = new ReportConfigurationDefinition();
        this.testOutcomeDictionary = reportConfigurationDefinition.getOutcomeConfigurationProps().options;
    }

    private labelId = getId("test-outcome-picker-label");

    private getTestOutcomeOptions() {
        return Object.keys(this.testOutcomeDictionary).map(key => Number(key));
    }

    render(): JSX.Element {
        return (
            <>
                <PickListDropdown
                    className="test-trend-widget-metric-combo"
                    getPickListItems={() => { return this.getTestOutcomeOptions() }}
                    getListItem={(item: TestOutcome) => {
                        return {
                            name: this.testOutcomeDictionary[item],
                            key: String(item)
                        }
                    }}
                    selectedItems={this.props.testOutcomes}
                    isSearchable
                    hideSelectedItemIcon
                    selectionMode={SelectionMode.multiple}
                    onSelectionChanged={(selection: IPickListSelection) => {
                        const selectedOutcomes: TestOutcome[] = selection.selectedItems.map(selectedItem => Number(selectedItem));
                        this.props.onChanged(selectedOutcomes);
                    }}
                    ariaLabelFormat={this.labelId}
                />
            </>
        );
    }
}