import Controls = require("VSS/Controls");
import Combos = require("VSS/Controls/Combos");
import Dialogs = require("VSS/Controls/Dialogs");
import Notifications = require("VSS/Controls/Notifications");
import Diag = require("VSS/Diag");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import WorkItemTrackingResources = require("WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking");
import WITOM = require("WorkItemTracking/Scripts/TFS.WorkItemTracking");
import { equals } from "VSS/Utils/String";
import { ProjectVisibility } from "TFS/Core/Contracts";

const delegate = Utils_Core.delegate;

export interface CreateCopyOfWorkItemDialogResult {
    project: string;
    type: string;
    copyLinks: boolean;
}

export interface CreateCopyOfWorkItemDialogOptions extends Dialogs.IModalDialogOptions {
    workItem?: WITOM.WorkItem;
}

export class CreateCopyOfWorkItemDialog extends Dialogs.ModalDialogO<CreateCopyOfWorkItemDialogOptions> {

    public static enhancementTypeName: string = "CreateCopyDialog";

    private _projectDropdown: Combos.Combo;
    private _workItemTypeDropdown: Combos.Combo;
    private _$copyLinksCheckbox: JQuery;
    private _projectVisibilityMap: IDictionaryStringTo<ProjectVisibility>; // key: project name, value: ProjectVisibility
    private _messageArea: Notifications.MessageAreaControl;
    private _sourceProjectIndex: number;
    private _sourceProjectName: string;

    constructor(options?) {
        super({
            ...options,
            cssClass: "create-copy-of-work-item-dialog",
            minHeight: 300
        });

        Diag.Debug.assert(options.workItem instanceof WITOM.WorkItem, "Need a WorkItem object to copy.");

        const workItem: WITOM.WorkItem = options.workItem;
        this._projectVisibilityMap = {};
        this._sourceProjectName = workItem.getOriginalWorkItemType().project.name;
    }

    public initialize() {
        super.initialize();
        this.setTitle(WorkItemTrackingResources.CreateCopyOfWorkItemTitle);

        this._decorate();
        this._populateProjects();
    }

    public getDialogResult(): CreateCopyOfWorkItemDialogResult {
        return {
            project: this._projectDropdown.getText(),
            type: this._workItemTypeDropdown.getText(),
            copyLinks: this._copyLinks()
        };
    }

    public onClose(e?) {
        this._options.workItem = null;
        super.onClose(e);
    }

    private _decorate() {
        const $element = this._element;
        const workItem = this._options.workItem;
        const id = Controls.getId();

        const $messageAreaContainer = $("<div>").addClass("form-section");
        this._messageArea = Controls.Control.create(Notifications.MessageAreaControl, $messageAreaContainer, { showIcon: true });
        $element.append($messageAreaContainer);

        // Adding source work item description
        $element.append($("<p />").addClass("create-copy-title").text(Utils_String.format(WorkItemTrackingResources.CreateCopyOfWorkItemSourceFormat, workItem.workItemType.name, workItem.id, workItem.getTitle())));

        // Creating project drop down
        $element.append("<p><label for='project'>" + WorkItemTrackingResources.CreateCopyOfWorkItemProject + "</label><input id='project' name='project' type='text' /></p>");
        this._projectDropdown = <Combos.Combo>Controls.Enhancement.enhance(Combos.Combo, $element.find("input[name='project']"), { allowEdit: false, indexChanged: delegate(this, this._onProjectChange) });

        // Creating work item type drop down
        $element.append("<p><label for='wit'>" + WorkItemTrackingResources.CreateCopyOfWorkItemType + "</label><input id='wit' name='wit' type='text' /></p>");
        this._workItemTypeDropdown = <Combos.Combo>Controls.Enhancement.enhance(Combos.Combo, $element.find("input[name='wit']"), { allowEdit: false });

        const copyLInksCheckboxId = `createCopyOfWorkItem_copyLinksCheckbox_${id}`;
        const $copyLinksInputContainer = $("<div>").addClass("copy-links-input-container").appendTo($element);
        this._$copyLinksCheckbox = $("<input />").attr("type", "checkbox").attr("id", copyLInksCheckboxId).appendTo($copyLinksInputContainer);
        $("<label />").attr("for", copyLInksCheckboxId).text(WorkItemTrackingResources.CreateCopyOfWorkItem_IncludeLinks).appendTo($copyLinksInputContainer);
    }

    private _copyLinks(): boolean {

        if (this._$copyLinksCheckbox) {
            return this._$copyLinksCheckbox.prop("checked");
        }

        return false;
    }

    private _populateProjects() {
        let i;
        let len;
        const workItem = this._options.workItem;
        const projectPicker = this._projectDropdown;

        // Loading projects first
        workItem.store.beginGetProjects((projects: WITOM.Project[]) => {
            let p, selectedProject, projectSource = [];

            // Sorting projects according to the name aplhabetically
            projects.sort(function (p1, p2) {
                return p1.name.localeCompare(p2.name);
            });

            // Iterating through projects to populate source of combo
            for (i = 0, len = projects.length; i < len; i++) {
                p = projects[i].name;
                projectSource[projectSource.length] = p;

                // Trying to identify the selected project for the combo
                if (p === workItem.project.name) {
                    selectedProject = projects[i];
                }
            }

            // Ensuring first project to be selected if nothing found
            selectedProject = selectedProject || projects[0];

            // Setting source of project combo
            projectPicker.setSource(projectSource);

            // Setting selected project
            projectPicker.setText(selectedProject.name);

            // build projects map
            projects.forEach(p => this._projectVisibilityMap[p.name] = p.visibility);

            this._sourceProjectIndex = projectSource.indexOf(this._sourceProjectName);

            selectedProject.beginGetVisibleWorkItemTypeNames(witNames => {
                this._populateWits(witNames);
            });

            Diag.logTracePoint("CreateCopyOfWorkItemDialog._populateProjects.complete");
        });
    }

    private _populateWits(witNames) {
        let i, len, wit, selectedWit,
            workItem = this._options.workItem,
            witSource = [];

        // Loading work item type names of the selected project
        for (i = 0, len = witNames.length; i < len; i++) {
            wit = witNames[i];
            witSource[witSource.length] = wit;

            if (wit === workItem.workItemType.name) {
                selectedWit = wit;
            }
        }

        selectedWit = selectedWit || witNames[0];

        // Setting source of work item type combo
        this._workItemTypeDropdown.setSource(witSource);

        // Setting initial value for work item type combo
        this._workItemTypeDropdown.setText(selectedWit);

        // Enabling OK button because we have enough input right now to create the copy of work item
        this.updateOkButton(true);
    }

    private _onProjectChange(index) {
        const projectName = this._projectDropdown.getText();
        const project: WITOM.Project = this._options.workItem.store.projects.find(p => equals(p.name, projectName, true));

        if (this._isNewProject() && this._isPublicProject(projectName)) {
            this._showPublicProjectVisibilityMessage();
        }
        else {
            this._messageArea.clear();
        }

        project.beginGetVisibleWorkItemTypeNames(witNames => {
            this._populateWits(witNames);
        });
    }

    private _isNewProject(): boolean {
        return this._projectDropdown.getSelectedIndex() !== this._sourceProjectIndex;
    }

    private _isPublicProject(projectName: string): boolean {
        return this._projectVisibilityMap.hasOwnProperty(projectName) && this._projectVisibilityMap[projectName] === ProjectVisibility.Public;
    }

    private _showPublicProjectVisibilityMessage() {
        const $message = $("<span />").text(WorkItemTrackingResources.CopyWorkItemToPublicProjectMessage)
            .append($("<a />").attr(
                {
                    href: WorkItemTrackingResources.WorkItemPublicVisibilityLearnMoreLink,
                    target: "_blank",
                    rel: "noopener noreferrer"
                })
                .text(WorkItemTrackingResources.WorkItemMoveCopyPublicVisibilityLearnMoreLinkText));

        this._messageArea.setMessage($message, Notifications.MessageAreaType.Info);
    }
}
