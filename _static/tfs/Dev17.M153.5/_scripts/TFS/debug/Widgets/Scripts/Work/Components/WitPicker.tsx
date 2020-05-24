import * as React from 'react';

import { WorkItemTypesMultiPicker } from 'Analytics/Scripts/Controls/WorkItemTypesMultiPicker';

import { WitPickerTranslator } from "Widgets/Scripts/Work/Components/WitPickerTranslator";

import { withWorkConfigContext, IWorkConfigProps } from "Widgets/Scripts/Work/Framework/WorkContext";
import { WitPickerPropertyDefinition } from "Widgets/Scripts/Work/Components/WitPickerPropertyDefinition";

export const WitPickerDefaultPropertyName = "ms.azdev.work.components.wit-picker";

export interface WitPickerProps {
    /**
     * (optional) Defaults to `WitPickerDefaultPropertyName`
     *
     * A unique name for the data represented by this control in the Config.
     *
     * If you've got multiple instances of this control, explicitly provide names to ensure uniqueness.
     */
    propertyName?: string;
}

export const WitPicker = withWorkConfigContext(
    class extends React.Component<WitPickerProps & IWorkConfigProps, {}> {

        public static defaultProps: WitPickerProps = {
            propertyName: WitPickerDefaultPropertyName,
        }

        private witPickerTranslator: WitPickerTranslator;

        constructor(props: WitPickerProps & IWorkConfigProps) {
            super(props);
            this.witPickerTranslator = new WitPickerTranslator(
                this.props.workContext,
                this.props.propertyName
            );
            this.props.configContext.actionCreator.registerPropertyDefinition(
                new WitPickerPropertyDefinition(
                    this.props.propertyName,
                    this.witPickerTranslator,
                    this.props.workContext
                )
            );
        }

        componentDidMount() {
            this.props.workContext.actionCreator.demandBacklogConfigurations();
            this.props.workContext.actionCreator.demandWitTypes();
        }

        render(): JSX.Element {
            let configProperties = this.props.configContext.state.properties;
            let witTypesLoaded = this.props.workContext.selector.isWitTypesLoaded(configProperties);
            let backlogConfigurationsLoaded = this.props.workContext.selector.isBacklogConfigurationsLoaded(configProperties);
            let witTypes = this.props.workContext.selector.getWitTypes(configProperties);
            let backlogLevelConfigurations = this.props.workContext.selector.getBacklogConfigurations(configProperties);
            let workItemTypeFilters = witTypes ? this.witPickerTranslator.getClientWitTypeFilters(configProperties) : undefined;

            return (
                <WorkItemTypesMultiPicker
                    backlogLevelConfigurations={backlogLevelConfigurations}
                    selectedFilters={workItemTypeFilters}
                    workItemTypes={witTypes}
                    disabled={!witTypesLoaded && !backlogConfigurationsLoaded}
                    onChanged={filters => {
                        let configProperty = this.witPickerTranslator.fromClientWitTypeFilters(filters);
                        this.props.configContext.actionCreator.setProperty(this.props.propertyName, configProperty);
                    }}
                />
            );
        }
    }
);