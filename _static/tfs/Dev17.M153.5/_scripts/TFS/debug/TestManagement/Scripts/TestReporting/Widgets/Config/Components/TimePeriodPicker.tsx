import * as React from 'react';
import { Label } from 'OfficeFabric/Label';
import { getId } from 'OfficeFabric/Utilities';
import { PickListDropdown, IPickListSelection } from "VSSUI/PickList";
import { TimePeriodPickerPropertyDefinition } from 'TestManagement/Scripts/TestReporting/Widgets/Config/Components/TimePeriodPickerPropertyDefinition';
import { withPipelinesConfigContext, IPipelinesConfigProps } from 'TestManagement/Scripts/TestReporting/Widgets/Config/Framework/PipelinesContext';
import * as StringUtils from "VSS/Utils/String";
import * as Resources from 'TestManagement/Scripts/Resources/TFS.Resources.TestManagement';

export const TimePeriodPickerDefaultPropertyName = "ms.azdev.pipelines.components.time-period-picker";

export interface TimePeriodPickerProps {
    /**
     * (optional) Defaults to `TimePeriodPickerDefaultPropertyName`
     *
     * A unique name for the data represented by this control in the Config.
     *
     * If you've got multiple instances of this control, explicitly provide names to ensure uniqueness.
     */
    propertyName?: string;
}

export const TimePeriodPicker = withPipelinesConfigContext(
    class extends React.Component<TimePeriodPickerProps & IPipelinesConfigProps, {}> {

        private const timePeriodOptions = [7, 14, 30];
        private labelId = getId("time-period-picker-label");

        public static defaultProps: TimePeriodPickerProps = {
            propertyName: TimePeriodPickerDefaultPropertyName,
        }

        constructor(props: TimePeriodPickerProps & IPipelinesConfigProps) {
            super(props);

            this.props.configContext.actionCreator.registerPropertyDefinition(
                new TimePeriodPickerPropertyDefinition(this.props.propertyName)
            );
        }

        render(): JSX.Element {
            const configProperties = this.props.configContext.state.properties;
            return (
                <>
                    <Label id={this.labelId}>{Resources.PeriodLabel}</Label>
                    <PickListDropdown
                        getPickListItems={() => this.timePeriodOptions}
                        getListItem={(item: any) => {
                            return {
                                name: StringUtils.format(Resources.NoOfDaysFormatString, item),
                                key: item
                            }
                        }}
                        selectedItems={[ configProperties[this.props.propertyName] ] }
                        onSelectionChanged={(selection: IPickListSelection) => {
                            this.props.configContext.actionCreator.setProperty(this.props.propertyName, selection.selectedItems[0]);
                        }}
                        ariaDescribedBy={this.labelId}
                    />
                </>
            );
        }
    }
);