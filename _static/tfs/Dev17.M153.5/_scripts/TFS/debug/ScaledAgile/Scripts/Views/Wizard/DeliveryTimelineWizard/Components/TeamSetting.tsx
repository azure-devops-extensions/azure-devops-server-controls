import * as React from "react";
import { ITeamSettingData } from "ScaledAgile/Scripts/Views/Wizard/DeliveryTimelineWizard/Models/DeliveryTimelineTeamSettingsInterfaces";
import { IFieldShallowReference, ValueState } from "ScaledAgile/Scripts/Views/Wizard/Models/WizardInterfaces";
import { DeliveryTimeLineViewClassNameConstants } from "ScaledAgile/Scripts/Views/DeliveryTimeLine/Components/Constants";
import ScaledAgileResources = require("ScaledAgile/Scripts/Resources/TFS.Resources.ScaledAgile");
import Utils_String = require("VSS/Utils/String");
import Utils_UI = require("VSS/Utils/UI");
import { autobind } from "OfficeFabric/Utilities";

// legacy dependency for control rendering
import { SettingFilterDropdownCombo } from "ScaledAgile/Scripts/Views/Wizard/DeliveryTimelineWizard/Components/SettingFilterDropdownCombo";
import { IComboOptions } from "VSS/Controls/Combos";

export interface ITeamSettingProps extends ITeamSettingData {
    /**
     * Unique guid identifier of the team setting
     */
    id: string;
    /**
     * The row index of the team setting
     */
    index: number;
    /**
     * If the team setting row is deletable
     */
    canDelete: boolean;
    /**
     * The callback whenever a team setting row is asked to be deleted
     */
    onDeleteRow: IArgsFunctionR<void>;
    /**
     * The callback whenever a team changed
     */
    onTeamChanged: IArgsFunctionR<void>;
    /**
     * The callback whenever a project changed
     */
    onProjectChanged: IArgsFunctionR<void>;
    /**
     * The callback whenever a backlog level changed
     */
    onBacklogLevelChanged: IArgsFunctionR<void>;
    /**
     * The callback whenever a reorder has been triggered by keydown events
     */
    onKeyboardReorder: IArgsFunctionR<void>;
    /**
     * If the team setting should be disabled
     */
    disabled: boolean;
    /*
     * Whether this team setting row should focus on mount
     */ 
    focusOnMount?: boolean;
    /*
     * Whether this setting row should focus on delete button when rerender
     */
    focusDeleteButton?: boolean;
    /*
     * Whether this setting row should focus on row when rerender
     */
    focusOnRow?: boolean;
}

export class TeamSetting extends React.Component<ITeamSettingProps, {}> {
    public static TEAM_SETTING_CONTAINER = "wizard-setting-row";
    public static TEAM_SETTING = "wizard-setting";
    public static TEAM_SETTING_DELETE_CONTAINER = "wizard-delete-icon-container";
    public static TEAM_SETTING_DELETE_ICON = "bowtie-icon bowtie-math-multiply";
    public static TEAM_SETTING_FIELD_CLASS = "wizard-field";
    public static TEAM_SETTINGS_PROJECT_NAME = "project-name";
    public static TEAM_SETTINGS_TEAM_NAME = "team-name";
    public static TEAM_SETTINGS_BACKLOG_LEVEL = "backlog-level";
    public static TEAM_SETTING_GRIP = "bowtie-icon bowtie-resize-grip";
    public static TEAM_SETTING_FIELD_WIDTH = 320;
    public static TEAM_SETTING_DELETE_CONTAINER_WIDTH = 14;
    public static TEAM_SETTING_FIELD_MARGIN_RIGHT = 12;
    public static TEAM_SETTING_FIELD_MARGIN_TOP = 5;
    public static TEAM_SETTING_GRIP_WIDTH = 20;

    private _deleteButtonDom: HTMLDivElement;
    private _teamSettingRowDom: HTMLDivElement;

    constructor(props: ITeamSettingProps) {
        super(props);
        this.onProjectChanged = this.onProjectChanged.bind(this);
        this.onTeamChanged = this.onTeamChanged.bind(this);
        this.onBacklogLevelChanged = this.onBacklogLevelChanged.bind(this);
    }

    public onProjectChanged(value: string) {
        this.props.onProjectChanged(this.props.id, value);
    }

    public onTeamChanged(value: string) {
        this.props.onTeamChanged(this.props.id, value);
    }

    public onBacklogLevelChanged(value: string) {
        this.props.onBacklogLevelChanged(this.props.id, value);
    }

    public componentDidMount() {
        if (this.props.focusDeleteButton) {
            this._deleteButtonDom.focus();
        }
        else if (this.props.focusOnRow) { 
            this._teamSettingRowDom.focus();
        }
    }

    public componentDidUpdate() {
        if (this.props.focusDeleteButton) {
            this._deleteButtonDom.focus();
        }
        else if (this.props.focusOnRow) { 
            this._teamSettingRowDom.focus();
        }
    }

    public render(): JSX.Element {
        return <div className={TeamSetting.TEAM_SETTING_CONTAINER} id={this.props.id}>
            {this._renderTeamSetting()}
        </div>;
    }

    private _renderTeamSetting(): JSX.Element {
        let projectErrorMessage = this.props.project.name ? Utils_String.format(ScaledAgileResources.ProjectDoesNotExistMessage, this.props.project.name) : ScaledAgileResources.ProjectEmptyNameMessage;
        let teamErrorMessage = this.props.team.name ? Utils_String.format(ScaledAgileResources.TeamDoesNotExistMessage, this.props.team.name) : ScaledAgileResources.TeamEmptyNameMessage;
        let backlogErrorMessage = this.props.backlogLevel.name ? Utils_String.format(ScaledAgileResources.BacklogDoesNotExistMessage, this.props.backlogLevel.name) : ScaledAgileResources.BacklogEmptyNameMessage;
        const teamFieldStyle = this._getTeamFieldDivStyle();
        return <div className={TeamSetting.TEAM_SETTING} ref={(element) => { this._teamSettingRowDom = element; } } tabIndex={0} onKeyDown={this._onKeyboardReorder} aria-label={ScaledAgileResources.TeamSettingsReorderLabel}>
            <div className={TeamSetting.TEAM_SETTING_GRIP} style={this._getTeamSettingGripStyle()}></div>
            <div className={`${TeamSetting.TEAM_SETTING_FIELD_CLASS} ${TeamSetting.TEAM_SETTINGS_PROJECT_NAME}`} style={teamFieldStyle}>
                {this._createFilterDropdownControl(this.props.projects,
                    this.props.project,
                    this.onProjectChanged,
                    this.props.id + "_project",
                    ScaledAgileResources.ProjectInputPlaceholder,
                    ScaledAgileResources.ProjectLabel)}
                <div aria-live="assertive" className="input-error-tip" hidden={this.props.project.valueState !== ValueState.ReadyButInvalid}>{projectErrorMessage}</div>
            </div>
            <div className={`${TeamSetting.TEAM_SETTING_FIELD_CLASS} ${TeamSetting.TEAM_SETTINGS_TEAM_NAME}`} style={teamFieldStyle}>
                {this._createFilterDropdownControl(this.props.teams,
                    this.props.team,
                    this.onTeamChanged,
                    this.props.id + "_team",
                    ScaledAgileResources.TeamInputPlaceholder,
                    ScaledAgileResources.Team)}
                <div aria-live="assertive" className="input-error-tip" hidden={this.props.team.valueState !== ValueState.ReadyButInvalid}>{teamErrorMessage}</div>
            </div>
            <div className={`${TeamSetting.TEAM_SETTING_FIELD_CLASS} ${TeamSetting.TEAM_SETTINGS_BACKLOG_LEVEL}`} style={teamFieldStyle}>
                {this._createFilterDropdownControl(this.props.backlogLevels,
                    this.props.backlogLevel,
                    this.onBacklogLevelChanged,
                    this.props.id + "_backlog",
                    ScaledAgileResources.BacklogInputPlaceholder,
                    ScaledAgileResources.BacklogLevelLabel,
                    this.props.focusOnMount)}
                <div aria-live="assertive" className="input-error-tip" hidden={this.props.backlogLevel.valueState !== ValueState.ReadyButInvalid}>{backlogErrorMessage}</div>
            </div>
            <div className={TeamSetting.TEAM_SETTING_DELETE_CONTAINER + " " + DeliveryTimeLineViewClassNameConstants.propagateKeydownEvent} // for now we must add a special propogate keydown classname when adding an onKeyDown prop to a component rendered inside jquery dialog
                ref={(element) => { this._deleteButtonDom = element; } }
                style={this._getDeleteButtonStyle()}
                tabIndex={0}
                role="button"
                aria-label={ScaledAgileResources.BacklogLevelDeleteTooltip}
                onClick={(e) => { this._onDeleteButtonClick(e); } }
                onKeyDown={(e) => { this._onDeleteButtonKeyDown(e); } }>
                <i className={TeamSetting.TEAM_SETTING_DELETE_ICON} />
            </div>
        </div>;
    }

    @autobind
    private _onKeyboardReorder(e: React.KeyboardEvent<HTMLElement>) {   
        if (e.keyCode === Utils_UI.KeyCode.DOWN && (e.ctrlKey || e.metaKey)) {
             this.props.onKeyboardReorder(this.props.id, this.props.index + 1);
        }
        else if (e.keyCode === Utils_UI.KeyCode.UP && (e.ctrlKey || e.metaKey)) {
             this.props.onKeyboardReorder(this.props.id, this.props.index - 1);
        }
    }

    private _getTeamSettingGripStyle(): React.CSSProperties {
        return {
            width: TeamSetting.TEAM_SETTING_GRIP_WIDTH
        };
    }

    private _getTeamFieldDivStyle(): React.CSSProperties {
        let pixel = "px ";
        return {
            width: TeamSetting.TEAM_SETTING_FIELD_WIDTH,
            margin: TeamSetting.TEAM_SETTING_FIELD_MARGIN_TOP + pixel + TeamSetting.TEAM_SETTING_FIELD_MARGIN_RIGHT + pixel + TeamSetting.TEAM_SETTING_FIELD_MARGIN_TOP + pixel + "0px"
        };
    }

    private _getDeleteButtonStyle(): React.CSSProperties {
        return {
            visibility: this.props.canDelete ? "visible" : "hidden"
        };
    }

    private _onDeleteButtonClick(e: React.MouseEvent<HTMLElement>) {
        this._onDeleteButtonHandler();
    }

    private _onDeleteButtonKeyDown(e: React.KeyboardEvent<HTMLElement>) {
        if (e.keyCode === Utils_UI.KeyCode.ENTER) {
            this._onDeleteButtonHandler();
        }
        return false;
    }

    private _onDeleteButtonHandler() {
        if (this.props.canDelete && !this.props.disabled) {
            this.props.onDeleteRow(this.props.id);
        }
    }

    private _createFilterDropdownControl(
        values: IFieldShallowReference[],
        initialValue: IFieldShallowReference,
        onInputChange: IArgsFunctionR<void>,
        controlId: string,
        placeholderText?: string,
        ariaLabel?: string,
        focusOnMount?: boolean): JSX.Element {
        let defaultOptions: IComboOptions = {
            placeholderText: placeholderText
        };

        let filterDropdownControl = <SettingFilterDropdownCombo
            id={controlId}
            values={values}
            initialValue={initialValue}
            onInputChange={onInputChange}
            options={defaultOptions}
            ariaLabel={ariaLabel}
            focusOnMount={focusOnMount}
            disabled={this.props.disabled}
            required={true}
            />;

        return filterDropdownControl;
    }
}
