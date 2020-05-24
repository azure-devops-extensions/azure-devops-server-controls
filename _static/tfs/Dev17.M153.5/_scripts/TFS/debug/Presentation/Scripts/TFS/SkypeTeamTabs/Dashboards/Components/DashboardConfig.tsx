import * as React from "react";
import { DashboardConfigActionCreator } from "Presentation/Scripts/TFS/SkypeTeamTabs/Dashboards/Actions/DashboardConfigActionCreator";
import { IDashboardConfigData, IDashboardConfigPickerState } from "Presentation/Scripts/TFS/SkypeTeamTabs/Dashboards/Models/IDashboardConfigData";
import { ComboBox, IComboBoxOption } from "OfficeFabric/ComboBox";
import * as Resources from "Presentation/Scripts/TFS/Resources/TFS.Resources.Presentation";
import { IFeatureConfigComponentProps } from "Presentation/Scripts/TFS/SkypeTeamTabs/IFeatureConfig";
import { MSTeamsComboBox } from "Presentation/Scripts/TFS/SkypeTeamTabs/MSTeamsComboBox";

export type IDashboardConfigProps = IFeatureConfigComponentProps<DashboardConfigActionCreator, IDashboardConfigData>;

export class DashboardConfig extends React.Component<IDashboardConfigProps> {
    /**
     * Gets the available options for the picker from the store data that was passed in.
     * @param props underlying store data representing the state of the picker
     */
    private getOptionsFromPickerProps(props: IDashboardConfigPickerState<{ id: string, name: string }>): IComboBoxOption[] {
        let options: IComboBoxOption[] = [];
        let match = props.selected && props.selected.id;
        options = props.options.values.map(option => {
            return {
                key: option.id,
                text: option.name,
                selected: match && match === option.id
            }
        });
        return options;
    }

    private selectProjectCallback(selection: IComboBoxOption, uselessIndex: number, freeformValue: string): void {
        if (selection) {
            this.props.actionCreator.selectProject(this.props.value.project.options.values.find(x => x.id === selection.key));
        } else {
            this.props.actionCreator.setProjectError(freeformValue);
        }
    }

    private selectTeamCallback(selection: IComboBoxOption, uselessIndex: number, freeformValue: string): void {
        if (selection) {
            this.props.actionCreator.selectTeam(this.props.value.project.selected, this.props.value.team.options.values.find(x => x.id === selection.key));
        } else {
            this.props.actionCreator.setTeamError(freeformValue);
        }
    }

    private selectDashboardCallback(selection: IComboBoxOption, uselessIndex: number, freeformValue: string): void {
        if (selection) {
            this.props.actionCreator.selectDashboard(this.props.value.dashboard.options.values.find(x => x.id === selection.key));
        } else {
            this.props.actionCreator.setDashboardError(freeformValue);
        }
    }

    private getPickerDisplayValue(props: IDashboardConfigPickerState<{ name: string }>, placeholderText: string) {
        let placeholder = placeholderText;

        if (props.options.isLoading) {
            placeholder = Resources.Loading;
        }
        if (props.selected) {
            placeholder = props.selected.name;
        }
        if (props.error) {
            placeholder = props.error.customText;
        }

        return placeholder;
    }

    private getErrorFromProps(props: IDashboardConfigPickerState<any>): string {
        let errorMessage = null;
        if (props.error) {
            errorMessage = props.error.errorMessage;
        }
        return errorMessage;
    }

    private getMSTeamsComboBox(props: IDashboardConfigPickerState<{ id: string, name: string }>, defaultPlaceholder: string, label: string, callback: Function): JSX.Element {
        let options: IComboBoxOption[] = this.getOptionsFromPickerProps(props);
        let placeholder = this.getPickerDisplayValue(props, defaultPlaceholder);
        let error = this.getErrorFromProps(props);

        return <MSTeamsComboBox
            onChanged={ callback.bind(this) }
            allowFreeform={ true }
            value={ placeholder }
            label={ label }
            disabled={ props.disabled }
            options={ options }
            msTeamsTheme={ this.props.msTeamsTheme }
            errorMessage={ error }
        />
    }

    public render(): JSX.Element {
        let projectProps = this.props.value.project;
        let teamProps = this.props.value.team;
        let dashboardProps = this.props.value.dashboard;

        return <div>
            {
                this.getMSTeamsComboBox(
                    projectProps, 
                    Resources.MSTeamsVSTSConfig_ProjectPickerPlaceholder, 
                    Resources.ProjectLabel,
                    this.selectProjectCallback
                )
            }
            {
                this.getMSTeamsComboBox(
                    teamProps, 
                    Resources.MSTeamsVSTSConfig_TeamPickerPlaceholder, 
                    Resources.TeamLabel,
                    this.selectTeamCallback
                )
            }
            {
                this.getMSTeamsComboBox(
                    dashboardProps, 
                    Resources.MSTeamsVSTSConfig_DashboardPickerPlaceholder,
                    Resources.MSTeamsVSTSConfig_DashboardPickerLabel,
                    this.selectDashboardCallback
                )
            }
        </div>
    }
}