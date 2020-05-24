import * as Q from "q";

import * as Controls from "VSS/Controls";
import * as Utils_String from "VSS/Utils/String";
import * as Utils_UI from "VSS/Utils/UI";

import { ErrorMessageControl } from "Dashboards/Scripts/ErrorMessageControl";
import { SettingsField } from 'Dashboards/Scripts/SettingsField';
import { TeamScope } from 'Widgets/Scripts/ModernWidgetTypes/CommonConfigurationTypes';
import { IProjectTeamPickerRowOptions, ProjectTeamPickerRow } from 'Widgets/Scripts/Burndown/ProjectTeamPickerRow';

import * as WidgetResources from "Widgets/Scripts/Resources/TFS.Resources.Widgets";

export interface ProjectTeamPickerListOptions {
    /** change handler */
    change: () => void;
}

export class ProjectTeamPickerList extends Controls.Control<ProjectTeamPickerListOptions> {
    private projectTeamPickerRows: ProjectTeamPickerRow[];

    private _$pickerListContainer: JQuery;
    private _$maxTeamsAddedMessage: JQuery;
    private _$addNewRowButton: JQuery;

    private errorMessageControl: ErrorMessageControl;

    public static projectTeamPickerCssClass = "project-team-picker-list";
    public static errorMessageCssClass: string = "project-team-picker-error-message";
    public static maxProjectTeamRows = 50;

    public initializeOptions(options?: ProjectTeamPickerListOptions) {
        super.initializeOptions($.extend({
            coreCssClass: ProjectTeamPickerList.projectTeamPickerCssClass
        }, options));
    }

    public initialize() {
        super.initialize();

        const $container = this.getElement();

        this._$pickerListContainer = $("<div>");

        // Create Teams label
        SettingsField.createSettingsFieldForJQueryElement({
            labelText: WidgetResources.BurndownWidget_TeamsHeader,
        }, this._$pickerListContainer, $container);

        this.projectTeamPickerRows = [];

        // Add team button
        this._$maxTeamsAddedMessage = $("<div>")
            .attr("role", "status")
            .append($("<span>").addClass("bowtie-icon bowtie-status-info"))
            .addClass("bowtie max-rows-message")
            .append(WidgetResources.ProjectTeamPickerList_MaxTeamsAdded);

        this._$addNewRowButton = $("<button>")
            .attr("role", "button")
            .attr("aria-label", WidgetResources.ProjectTeamPickerList_AddTeam)
            .attr("id", "add-team")
            .append($("<span>").addClass("bowtie-icon bowtie-math-plus"))
            .append(WidgetResources.ProjectTeamPickerList_AddTeam)
            .addClass("bowtie add-row-button")
            .on("click", () => {
                this.addProjectTeamPickerRow();
            });

        let $errorMessageDiv = $("<div>").addClass(ProjectTeamPickerList.errorMessageCssClass);
        this.errorMessageControl = ErrorMessageControl.create(ErrorMessageControl, $errorMessageDiv, { collapseOnHide: true });

        Utils_UI.accessible(this._$addNewRowButton);

        $container.append(this._$pickerListContainer)
            .append($errorMessageDiv)
            .append(this._$addNewRowButton)
            .append(this._$maxTeamsAddedMessage);

        this.toggleAddTeamButton();
    }

    public getName(): string {
        return "ProjectTeamPickerList";
    }

    public setContext(teams: TeamScope[]): void {
        // If there are no teams selected yet, create an empty row.
        if (teams.length === 0) {
            this.createProjectTeamPicker();
        }

        // Create Project-Team rows
        teams.forEach(team => {
            this.createProjectTeamPicker(team);
        });
    }

    public validate(suppressErrorMessage: boolean = false): string {
        var rowErrorMessage = null;

        for (var i = 0; i < this.projectTeamPickerRows.length; i++) {
            rowErrorMessage = this.projectTeamPickerRows[i].validate();
            if (rowErrorMessage) {
                break;
            }
        }

        if (!suppressErrorMessage) {
            this.errorMessageControl.setErrorMessage(rowErrorMessage);
        }

        return rowErrorMessage;
    }

    public getSettings(): TeamScope[] {
        var teams: TeamScope[] = [];

        this.projectTeamPickerRows.forEach(projectTeamPickerRow => {
            var projectValue = projectTeamPickerRow.getProjectValue();
            var teamValue = projectTeamPickerRow.getTeamValue();

            if (projectValue && teamValue) {
                teams.push({
                    projectId: projectValue.ProjectId,
                    teamId: teamValue.TeamId
                });
            }
        });

        return teams;
    }

    public createProjectTeamPicker(team?: TeamScope): void {
        var projectTeamPickerOptions = {
            team: team ? team : null,
            change: () => this._options.change(),
            onDelete: (picker: ProjectTeamPickerRow) => { this.onRowDelete(picker) }
        } as IProjectTeamPickerRowOptions;

        var projectTeamPickerRow = ProjectTeamPickerRow.create(
            ProjectTeamPickerRow,
            this._$pickerListContainer,
            projectTeamPickerOptions);

        this.projectTeamPickerRows.push(projectTeamPickerRow);
        this.setFocusOnTeamChanges();
        this.toggleRowRemoveButton()
    }

    private addProjectTeamPickerRow() {
        this.createProjectTeamPicker();
        this.toggleAddTeamButton();
        this.toggleRowRemoveButton();
        this.setFocusOnTeamChanges();
        this._options.change();
    }

    private setFocusOnTeamChanges() {
        if (this.projectTeamPickerRows.length > 0) {
            $(".project-picker .wrap input[type='text']").focus();
        } else {
            this._$addNewRowButton.focus();
        }
    }

    private toggleAddTeamButton() {
        var isTeamLimitReached = !(this.projectTeamPickerRows.length < ProjectTeamPickerList.maxProjectTeamRows && this.projectTeamPickerRows.length >= 0);
        this._$maxTeamsAddedMessage.toggle(isTeamLimitReached);
        this._$addNewRowButton.toggle(!isTeamLimitReached);
    }

    private onRowDelete(picker: ProjectTeamPickerRow) {
        var rowIndex = this.projectTeamPickerRows.indexOf(picker);
        if (this.projectTeamPickerRows.length > 1 && rowIndex >= 0) {
            this.projectTeamPickerRows[rowIndex].dispose();
            this.projectTeamPickerRows.splice(rowIndex, 1);
            this.toggleAddTeamButton();
            this.toggleRowRemoveButton();
            this.setFocusOnTeamChanges();
            this._options.change();
        }
    }

    private toggleRowRemoveButton() {
        if (this.projectTeamPickerRows.length !== 1) {
            for (let i = 0; i < this.projectTeamPickerRows.length; i++) {
                this.projectTeamPickerRows[i].$removeRowButton.removeClass("project-team-picker-delete-disabled");
            }
        } else {
            this.projectTeamPickerRows[0].$removeRowButton.addClass("project-team-picker-delete-disabled");
        }
    }
}