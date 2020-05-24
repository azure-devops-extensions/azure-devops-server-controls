import * as React from "react";

import "VSS/LoaderPlugins/Css!Agile/Scripts/SprintsHub/SprintEditor/Components/SprintEditorFormPage";
import { Team } from "Agile/Scripts/Models/Team";
import * as SprintsHubResources from "Agile/Scripts/Resources/TFS.Resources.SprintsHub";
import * as SprintEditorResources from "Agile/Scripts/Resources/TFS.Resources.SprintsHub.SprintEditor";
import { ISprintEditorFormProps, SprintEditorForm } from "Agile/Scripts/SprintsHub/SprintEditor/Components/SprintEditorForm";
import { IComboBox, IComboBoxOption, VirtualizedComboBox } from "OfficeFabric/ComboBox";
import { Label } from "OfficeFabric/Label";
import { TooltipHost, TooltipOverflowMode } from "VSSUI/Tooltip";
import { getId } from "OfficeFabric/Utilities";
import { DirectionalHint, InfoIcon } from "Presentation/Scripts/TFS/Components/InfoIcon";
import { IMessage, Messages } from "Presentation/Scripts/TFS/Components/Messages";
import { VssIcon, VssIconType } from "VSSUI/VssIcon";

export interface ISprintEditorFormPageProps extends ISprintEditorFormProps {
    hasFatalError: boolean;
    /** Should hide the team selection combobox */
    hideTeamSelection?: boolean;
    /** The messages that will display on top of the page */
    messages: IMessage[];
    /** The selected team id */
    selectedTeam: Team;
    /** The list of teams to select from */
    teams: Team[];
    /** Callback for when the user cancels the form */
    onCancel: () => void;
    /** Callback for when a new iteration is created */
    onCreateIteration: (name: string, startDate: Date, endDate: Date, iterationPath: string) => void;
    /** Callback for when an iteration is selected */
    onSelectIteration: (iterationPath: string) => void;
    /** Callback for when a team is selected */
    onTeamChanged?: (teamId: string) => void;
    /** Callback for when a message is dismissed */
    onCloseMessage?: (id: string) => void;
}

export interface ISprintEditorFormPageState {
    currentIterationName: string;
}

/**
 * Page which hosts the sprint editor form
 */
export class SprintEditorFormPage extends React.Component<ISprintEditorFormPageProps, ISprintEditorFormPageState> {
    private _SprintEditorForm: SprintEditorForm;
    private _teamComboBox: IComboBox;
    private _teamComboInfoId: string;

    constructor(props: ISprintEditorFormPageProps) {
        super(props);

        this.state = {
            currentIterationName: props.editingIteration ? props.editingIteration.name : ""
        };

        this._teamComboInfoId = getId("sprint-editor-form-page");
    }

    public componentDidMount(): void {
        const {
            hideTeamSelection
        } = this.props;

        if (!hideTeamSelection && this._teamComboBox) {
            // set focus to team box
            this._teamComboBox.focus();
        } else if (this._SprintEditorForm) {
            // set focus to the form
            this._SprintEditorForm.focusInitialElement();
        }
    }

    public render(): JSX.Element {
        const {
            editingIteration,
            hasFatalError,
            isFetching,
            isCreating,
            nextSuggestedIterationPath,
            projectIterationHierarchy,
            onCancel,
            onCreateIteration,
            onEditIteration,
            onSelectIteration,
            selectedTeam,
            selectedTeamBacklogIteration,
            selectedTeamDaysOff,
            selectedTeamIterationPaths,
            suggestedParentNode
        } = this.props;

        const {
            currentIterationName
        } = this.state;

        const iterationName = currentIterationName ? `${selectedTeam ? selectedTeam.name : ""} ${currentIterationName}` : "";
        return (
            <div className="sprint-editor-page">
                {this._renderMessages()}
                {!hasFatalError && [
                    (
                        <h1 className="sprint-editor-page-title" key="title">
                            <VssIcon iconType={VssIconType.bowtie} iconName="sprint" />
                            <span className="sprint-editor-page-title-header">{editingIteration ? SprintEditorResources.EditSprint : SprintsHubResources.NewSprint}</span>
                            {iterationName && ": "}
                            <TooltipHost content={iterationName} overflowMode={TooltipOverflowMode.Parent}>
                                {iterationName && <span>{iterationName}</span>}
                            </TooltipHost>
                        </h1>
                    ),
                    (
                        <div className="sprint-editor-form" key="form">
                            {this.renderTeamSection()}
                            <SprintEditorForm
                                componentRef={this._resolveSprintEditorForm}
                                editingIteration={editingIteration}
                                nextSuggestedIterationPath={nextSuggestedIterationPath}
                                selectedTeamBacklogIteration={selectedTeamBacklogIteration}
                                selectedTeamDaysOff={selectedTeamDaysOff}
                                selectedTeamIterationPaths={selectedTeamIterationPaths}
                                isCreating={isCreating}
                                isFetching={isFetching}
                                projectIterationHierarchy={projectIterationHierarchy}
                                suggestedParentNode={suggestedParentNode}
                                onCancel={onCancel}
                                onCreateIteration={onCreateIteration}
                                onEditIteration={onEditIteration}
                                onSelectIteration={onSelectIteration}
                                onIterationNameChanged={this._onIterationNameChanged}
                            />
                        </div>
                    )
                ]
                }
            </div>
        );
    }

    private _renderMessages(): JSX.Element {
        const {
            messages,
            onCloseMessage
        } = this.props;

        return (
            <Messages
                messages={messages}
                onCloseMessage={onCloseMessage}
            />
        );
    }

    private renderTeamSection(): JSX.Element {
        const {
            hideTeamSelection,
            selectedTeam
        } = this.props;

        if (!hideTeamSelection) {
            return (
                <div className="team-selection-box">
                    <div className="team-label-container">
                        <Label className="team-label" required={true}>
                            {SprintEditorResources.TeamHeaderTitle}
                        </Label>
                        <InfoIcon
                            id={this._teamComboInfoId}
                            className="team-help"
                            directionalHint={DirectionalHint.leftCenter}
                            iconProps={{ iconType: VssIconType.fabric, iconName: "Info" }}
                            infoText={SprintEditorResources.TeamExtraInfoText}
                        />
                    </div>
                    <VirtualizedComboBox
                        componentRef={this._resolveTeamComboBox}
                        aria-describedby={this._teamComboInfoId}
                        aria-label={SprintEditorResources.TeamHeaderTitle}
                        selectedKey={selectedTeam ? selectedTeam.id : undefined}
                        options={this._getTeamComboBoxOptions()}
                        autoComplete="on"
                        allowFreeform={true}
                        onChanged={this._onSelectedTeamChanged}
                        useComboBoxAsMenuWidth={true}
                    />
                </div>
            );
        }
    }

    private _onIterationNameChanged = (name: string): void => {
        this.setState({ currentIterationName: name });
    }

    private _onSelectedTeamChanged = (option: IComboBoxOption, index: number, value: string) => {
        const {
            onTeamChanged
        } = this.props;

        if (onTeamChanged && option) {
            onTeamChanged(option.key.toString());
        }
    }

    private _getTeamComboBoxOptions(): IComboBoxOption[] {
        const {
            teams
        } = this.props;

        if (teams) {
            return teams.map((team: Team) => ({
                key: team.id,
                text: team.name
            }));
        }

        return [];
    }

    private _resolveSprintEditorForm = (form: SprintEditorForm): void => {
        this._SprintEditorForm = form;
    }

    private _resolveTeamComboBox = (comboBox: IComboBox): void => {
        this._teamComboBox = comboBox;
    }
}