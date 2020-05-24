import "VSS/LoaderPlugins/Css!Widgets/Styles/ProjectTeamPickerRow";

import * as Q from "q";
import * as Controls from "VSS/Controls";
import * as Utils_String from "VSS/Utils/String";
import * as Utils_UI from "VSS/Utils/UI";
import { SettingsField } from 'Dashboards/Scripts/SettingsField';
import { ErrorMessageControl } from "Dashboards/Scripts/ErrorMessageControl";
import { ProjectPicker } from 'Widgets/Scripts/Shared/AnalyticsPickers';
import { TeamPicker } from 'Widgets/Scripts/Shared/AnalyticsPickers';
import { TeamScope } from "Widgets/Scripts/ModernWidgetTypes/CommonConfigurationTypes";
import { ProjectIdentity, TeamIdentity } from 'Analytics/Scripts/CommonClientTypes';
import * as WidgetResources from "Widgets/Scripts/Resources/TFS.Resources.Widgets";
import { WidgetsCacheableQueryService } from "Widgets/Scripts/DataServices/WidgetsCacheableQueryService";
import { ProjectCollection } from "Presentation/Scripts/TFS/TFS.OM.Common";
import { ProjectsInCollectionQuery } from "Analytics/Scripts/QueryCache/ProjectsInCollectionQuery";
import { TeamsInProjectQuery } from "Analytics/Scripts/QueryCache/TeamsInProjectQuery";

export interface IProjectTeamPickerRowOptions {
    /** contains the projectId and teamId **/
    team: TeamScope;

    /** callback to handle change in the row **/
    change: () => void;

    /** callback to handle the case when the picker is removed */
    onDelete: (picker: ProjectTeamPickerRow) => void;
}

export class ProjectTeamPickerRow extends Controls.Control<IProjectTeamPickerRowOptions> {
    private dataService: WidgetsCacheableQueryService;

    public static rowCssClass = "project-team-picker-row";
    public static removeRowCssClass = "project-team-picker-remove-row";
    public static projectTeamPickerRowItemCssClass = "project-team-picker-row-item";
    public static errorMessageCssClass: string = "project-team-picker-error-message";

    public $removeRowButton: JQuery;

    /** Project picker + supporting Settings Field */
    public projectPickerBlock: SettingsField<ProjectPicker>;

    /** Team picker + supporting Settings Field */
    public teamPickerBlock: SettingsField<TeamPicker>;

    private _$row: JQuery;
    private $errorMessage: ErrorMessageControl;

    private selectedTeam: TeamScope;

    public initializeOptions(options?: IProjectTeamPickerRowOptions) {
        super.initializeOptions($.extend({
            coreCssClass: ProjectTeamPickerRow.rowCssClass
        }, options));

        this.selectedTeam = this._options.team;
        this.dataService = ProjectCollection.getDefaultConnection().getService(WidgetsCacheableQueryService);
    }

    public initialize() {
        super.initialize();

        const $container = this.getElement();
        this._$row = $("<div>");

        this.drawProjectPicker();
        this.drawTeamPicker();
        this.drawRemoveRowButton();
        this.drawErrorMessageControl();

        $container.append(this._$row);

        this.loadProjectDataAndSetSelections().then(() => {
            if (this.selectedTeam) {
                this.projectPickerBlock.control.setSelectedByPredicate(project => project.ProjectId === this.selectedTeam.projectId, false);
                this.loadTeamDataAndSetSelections(this.selectedTeam.projectId);
            }

            this.projectPickerBlock.toggleControlBusyOverlay(false);
        }, e => {
            this.teamPickerBlock.toggleControlBusyOverlay(false);
        });
    }

    public getName(): string {
        return "ProjectTeamPickerRow";
    }

    public getProjectValue(): ProjectIdentity {
        return this.projectPickerBlock.control.getValue() as ProjectIdentity;
    }

    public getTeamValue(): TeamIdentity {
        return this.teamPickerBlock.control.getValue() as TeamIdentity;
    }

    public validate(): string {
        this.$errorMessage.hideElement();
        this.$errorMessage.setErrorMessage(null);

        if (this.projectPickerBlock.control.validate() || this.teamPickerBlock.control.validate()) {
            return WidgetResources.BurndownConfig_ProjectTeamPickerRowSelectionError;
        }

        return null;
    }

    private drawProjectPicker() {
        this.projectPickerBlock = SettingsField.createSettingsField({
            control: ProjectPicker.createInstance(null, {
                change: () => {
                    this._options.change();
                    let selectedProject = this.getProjectValue();
                    if (selectedProject) {
                        this.loadTeamDataAndSetSelections(selectedProject.ProjectId);
                    }
                },
            }),
            hasErrorField: true
        }, this._$row);

        // Add css class to set row-specific styles.
        this.projectPickerBlock.getElement().addClass(ProjectTeamPickerRow.projectTeamPickerRowItemCssClass);
    }

    private drawTeamPicker() {
        this.teamPickerBlock = SettingsField.createSettingsField({
            control: TeamPicker.createInstance(null, {
                change: () => {
                    this._options.change();
                }
            }),
            hasErrorField: true,
        }, this._$row);

        // Add css class to set row-specific styles.
        this.teamPickerBlock.getElement().addClass(ProjectTeamPickerRow.projectTeamPickerRowItemCssClass);
        this.teamPickerBlock.control.setEnabled(false);
    }

    private drawRemoveRowButton() {
        this.$removeRowButton = $("<div>")
            .attr("role", "button")
            .attr("aria-label", WidgetResources.ProjectTeamPicker_RemoveRowButtonAriaLabel)
            .addClass(ProjectTeamPickerRow.removeRowCssClass + " project-team-picker-delete-disabled bowtie-icon bowtie-edit-delete")
            .on("click", () => {
                this._options.onDelete(this);
            });

        Utils_UI.accessible(this.$removeRowButton);
        this._$row.append(this.$removeRowButton);
    }

    private drawErrorMessageControl() {
        var errorMessageDiv = $("<div>").addClass(ProjectTeamPickerRow.errorMessageCssClass);
        this.$errorMessage = ErrorMessageControl.create(ErrorMessageControl, errorMessageDiv, {});
        this._$row.append(errorMessageDiv);
    }

    private loadProjectDataAndSetSelections(): IPromise<void> {
        this.projectPickerBlock.toggleControlBusyOverlay(true);

        let projectsQuery = new ProjectsInCollectionQuery();
        return this.dataService.getCacheableQueryResult(projectsQuery).then((projects) => {
            this.projectPickerBlock.control.setSource(projects);
            this.projectPickerBlock.toggleControlBusyOverlay(false);
        }, e => {
            this.projectPickerBlock.toggleControlBusyOverlay(false);
        });
    }

    private loadTeamDataAndSetSelections(projectId: string): IPromise<void> {
        this.teamPickerBlock.control.setEnabled(true);
        this.teamPickerBlock.toggleControlBusyOverlay(true);

        let teamsInProjectQuery = new TeamsInProjectQuery(projectId);

        return this.dataService.getCacheableQueryResult(teamsInProjectQuery).then((teams) => {
            this.teamPickerBlock.control.setSource(teams);
            if (this.selectedTeam && this.selectedTeam.projectId === projectId) {
                this.teamPickerBlock.control.setSelectedByPredicate(team => team.TeamId === this.selectedTeam.teamId, false);
            }
            this.teamPickerBlock.toggleControlBusyOverlay(false);
        }, e => {
            this.teamPickerBlock.toggleControlBusyOverlay(false);
        });
    }
}