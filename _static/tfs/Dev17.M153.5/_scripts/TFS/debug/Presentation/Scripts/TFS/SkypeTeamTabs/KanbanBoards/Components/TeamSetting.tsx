import { IComboBoxOption } from "OfficeFabric/ComboBox";
import { css } from "OfficeFabric/Utilities";
import { IFeatureConfigComponentProps } from "Presentation/Scripts/TFS/SkypeTeamTabs/IFeatureConfig";
import { ISkypeTeamTabActionCreator } from "Presentation/Scripts/TFS/SkypeTeamTabs/KanbanBoards/Actions/SkypeTeamTabActionsCreator";
import { SkypeTeamTabBusinessLogic } from "Presentation/Scripts/TFS/SkypeTeamTabs/KanbanBoards/Actions/SkypeTeamTabBusinessLogic";
import { IFieldShallowReference, ITeamSettingData } from "Presentation/Scripts/TFS/SkypeTeamTabs/KanbanBoards/Models/SkypeTeamTabInterfaces";
import { MSTeamsComboBox } from "Presentation/Scripts/TFS/SkypeTeamTabs/MSTeamsComboBox";
import * as React from "react";
import * as Notifications from "VSS/Controls/Notifications";
import * as Resources from "Presentation/Scripts/TFS/Resources/TFS.Resources.Presentation";
import * as Utils_String from "VSS/Utils/String";

export type ITeamSettingProps = IFeatureConfigComponentProps<ISkypeTeamTabActionCreator, ITeamSettingData>;

export class TeamSetting extends React.Component<ITeamSettingProps> {
    public static TEAM_TEXTBOX_ID = "team-textbox-id";
    public static TEAM_SETTING = "skype-team-tab-setting";
    public static TEAM_SETTING_FIELD_CLASS = "skype-team-tab-field";
    public static ERROR_MESSAGE_BANNER = "error-message-banner";

    private _logic: SkypeTeamTabBusinessLogic;

    constructor(props: ITeamSettingProps) {
        super(props);
        this.onProjectChanged = this.onProjectChanged.bind(this);
        this.onTeamChanged = this.onTeamChanged.bind(this);
        this.onBacklogLevelChanged = this.onBacklogLevelChanged.bind(this);
        this._logic = SkypeTeamTabBusinessLogic.getInstance();
    }

    public onProjectChanged(value: string) {
        this.props.actionCreator.changeProject(this._logic.cloneTeamSetting(this.props.value), value);
    }

    public onTeamChanged(value: string) {
        this.props.actionCreator.changeTeam(this._logic.cloneTeamSetting(this.props.value), value);
    }

    public onBacklogLevelChanged(value: string) {
        this.props.actionCreator.changeBacklogLevel(this._logic.cloneTeamSetting(this.props.value), value);
    }

    public render(): JSX.Element {
        if (this.props.value != null) {
            return <div className={TeamSetting.TEAM_SETTING}>
                { this._renderProject() }
                { this._renderTeam() }
                { this._renderBacklog() }
            </div>;
        }
        return null;
    }

    private _renderProject(): JSX.Element {
        if (!this.props.value.projects || this.props.value.projects.length === 0) {
            return <div>{Resources.NoAvailableProjects}</div>;
        }
        var projectErrorMessage: string;
        if (!this.props.value.project.isValid) {
            projectErrorMessage = this.props.value.project.name ? Resources.ProjectDoesNotExistMessage : Resources.ProjectEmptyNameMessage;
        }
        return this._createFilterDropdownControl(Resources.ProjectLabel, this.props.value.projects, this.props.value.project, this.onProjectChanged, Resources.ProjectInputPlaceholder, projectErrorMessage);
    }

    private _renderTeam(): JSX.Element {
        if (!this.props.value.projects || this.props.value.projects.length === 0) {
            return null;
        }
        var teamErrorMessage: string;
        if (!this.props.value.team.isValid) {
            teamErrorMessage = this.props.value.team.name ? Resources.TeamDoesNotExistMessage : Resources.TeamEmptyNameMessage;
        }
        return this._createFilterDropdownControl(Resources.TeamLabel, this.props.value.teams, this.props.value.team, this.onTeamChanged, Resources.TeamInputPlaceholder, teamErrorMessage);
    }

    private _renderBacklog(): JSX.Element {
        if (!this.props.value.projects || this.props.value.projects.length === 0) {
            return null;
        }
        var backlogErrorMessage: string;
        if (!this.props.value.backlogLevel.isValid) {
            backlogErrorMessage = this.props.value.backlogLevel.name ? Resources.BacklogDoesNotExistMessage : Resources.BacklogEmptyNameMessage;
        }
        return this._createFilterDropdownControl(Resources.BacklogLevelLabel, this.props.value.backlogLevels, this.props.value.backlogLevel, this.onBacklogLevelChanged, Resources.BacklogInputPlaceholder, backlogErrorMessage);
    }

    private _createFilterDropdownControl(
        label: string,
        values: IFieldShallowReference[],
        initialValue: IFieldShallowReference,
        onInputChange: (value: string) => void,
        placeholderText: string,
        errorMessage?: string): JSX.Element {

        const onChanged: (selection: IComboBoxOption, index: number, text: string) => void =
            (selection, unusedIndex, text) => {
                const value: string = (selection && selection.key as string) || text;
                onInputChange(value);
            };

        const comboOptions: IComboBoxOption[] = values.map(v => {
            return {
                key: v.name,
                text: v.name,
                selected: v.name === initialValue.name
            };
        });

        const value: string = (initialValue && initialValue.name) || placeholderText;

        const className = css(TeamSetting.TEAM_SETTING_FIELD_CLASS, {
            "skype-team-tab-error": errorMessage != null
        });

        return <MSTeamsComboBox
            id={this.props.value.id}
            className={className}
            label={label}
            value={value}
            options={comboOptions}
            errorMessage={errorMessage}
            onChanged={onChanged}
            disabled={initialValue.disabled || initialValue.isLoading}
            autoComplete="on"
            allowFreeform={true}
            msTeamsTheme={this.props.msTeamsTheme}
        />;
    }
}

