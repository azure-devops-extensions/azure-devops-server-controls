import FormModels = require("WorkItemTracking/Scripts/Form/Models");

import { IWorkItemDiscussionControlOptions, IWorkItemAttachmentsControlOptions } from "WorkItemTracking/Scripts/Controls/WorkItemForm/Interfaces";
import {
    ILayout, ILayoutGroup, LayoutConstants, GroupOrientation, ILayoutControl, IWorkItemFormLayoutTransformation, WorkItemFormLayoutTransformationResult
} from "WorkItemTracking/Scripts/Form/Layout";
import { FormGrid } from "WorkItemTracking/Scripts/Form/Grids";
import { IWebLayoutLinksControlOptions, WebLayoutLinksControlViewMode, WebLayoutLinksControlZeroDataExperience } from "WorkItemTracking/Scripts/Controls/Links/Interfaces";
import { WellKnownControlNames, CoreFieldRefNames } from "Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants";
import * as WorkItemTrackingResources from "WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking";

export class MobileLayoutTransformation implements IWorkItemFormLayoutTransformation {
    public apply(layout: ILayout): WorkItemFormLayoutTransformationResult {

        // For every page, we will gather all groups from all sections and move them to the first section.
        // The "bottom-section" for discussion is treated in a special way.
        // Example: Given a page with sections and groups (numbers, D => discussion) like this:
        // |-----------------|
        // ||----||----||----|
        // || 0  ||  1 || 4  |
        // ||----||----||----|
        // ||----||----||----|
        // || D  ||  2 || 3  |
        // ||----||----||----|
        // |-----------------|
        // expected output would be
        // |-----|
        // ||---||
        // || 0 ||
        // || D ||
        // || 1 ||
        // || 2 ||
        // || 4 ||
        // || 3 ||
        // ||---||
        // |-----|
        for (const page of layout.pages) {
            const targetSection = page.sections[0];
            if (!targetSection) {
                // No section on page, ignore page
                continue;
            }

            const groupsToAppend: ILayoutGroup[] = [];
            for (const section of page.sections.slice(1)) {
                if (section.id !== FormGrid.BottomSection) {
                    groupsToAppend.push(...section.groups);
                }
            }

            // Append groups to target section
            targetSection.groups.push(...groupsToAppend);

            // Filter out unwanted groups.
            targetSection.groups = targetSection.groups.filter(group => !this._isFilteredGroup(group));

            // Update the properties for the controls to be what we want for mobile
            this._updateControlProperties(targetSection.groups);

            // Remove all other sections from page
            page.sections = page.sections.slice(0, 1);

            if (page.sections && page.sections[0] && page.sections[0].groups && page.sections[0].groups[0]) {
                page.sections[0].groups[0].hideHeader =
                    page.pageType === FormModels.PageType.attachments ||
                    page.pageType === FormModels.PageType.links ||
                    page.pageType === FormModels.PageType.history;
            }
        }

        this._applyCoreFieldsLayout(layout);

        // Ensure all groups are initially expanded
        this._expandAllGroups(layout);

        return WorkItemFormLayoutTransformationResult.LayoutChanged;
    }

    private _updateControlProperties(groupsToUpdate: ILayoutGroup[]) {
        for (const group of groupsToUpdate) {
            for (const control of group.controls) {
                if (control.visible) {
                    this._setLinksControlProperties(control);
                    this._setAttachmentsControlProperties(control);
                    this._setDiscussionControlProperties(control);
                    this._setHistoryControlProperties(group, control);
                }
            }
        }
    }

    private _setLinksControlProperties(control: ILayoutControl) {
        if (control.controlType === WellKnownControlNames.LinksControl) {
            control.controlOptions.readOnly = "True";

            const linksControlOptions = <IWebLayoutLinksControlOptions>control.controlOptions;

            linksControlOptions.hideActions = true;
            linksControlOptions.showCallToAction = false;
            if (linksControlOptions.zeroDataExperience !== WebLayoutLinksControlZeroDataExperience.CallToAction) {
                // Override any 'Developer' zero data experience, since we don't allow creating branches in mobile
                linksControlOptions.zeroDataExperience = WebLayoutLinksControlZeroDataExperience.Default;
            }
            linksControlOptions.viewMode = WebLayoutLinksControlViewMode.List;
        }
    }

    private _setDiscussionControlProperties(control: ILayoutControl) {
        if (control.controlType === WellKnownControlNames.WorkItemDiscussionControl) {
            const discussionControlOptions = <IWorkItemDiscussionControlOptions>control.controlOptions;
            discussionControlOptions.enableContactCard = false;
            discussionControlOptions.pageSize = 3;
        }
    }

    private _setAttachmentsControlProperties(control: ILayoutControl) {
        if (control.controlType === WellKnownControlNames.AttachmentsControl) {
            const attachmentsControlOptions = <IWorkItemAttachmentsControlOptions>control.controlOptions;
            attachmentsControlOptions.showBrowseButton = true;
            attachmentsControlOptions.showNameColumnOnly = true;
            attachmentsControlOptions.calculateHeightWidth = true;
            attachmentsControlOptions.hideActions = true;
            attachmentsControlOptions.clickCellToOpen = true;
        }
    }

    private _setHistoryControlProperties(group: ILayoutGroup, control: ILayoutControl) {
        if (control.controlType === WellKnownControlNames.WorkItemHistoryControl) {
            // Add a class to the group so we can target it.
            group.className = "history-control-group";
        }
    }

    private _applyCoreFieldsLayout(layout: ILayout): void {
        const systemControlsDictionary: IDictionaryStringTo<ILayoutControl> = {};

        if (layout.systemControls) {
            for (const systemControl of layout.systemControls) {
                systemControlsDictionary[systemControl.id] = systemControl;
            }

            // Apply replace logic
            for (const systemControl of layout.systemControls) {
                if (systemControl.replacesFieldReferenceName) {
                    systemControlsDictionary[systemControl.replacesFieldReferenceName] = systemControl;
                }
            }
        }

        const assignedToControl = this._getControl(
            systemControlsDictionary[CoreFieldRefNames.AssignedTo],
            CoreFieldRefNames.AssignedTo, WorkItemTrackingResources.AssignedToLabel, "FieldControl", WorkItemTrackingResources.AssignedToEmptyText);
        const assignedToGroup = this._getNewGroup(assignedToControl.label, [assignedToControl], GroupOrientation.Vertical);

        // State and reason
        const stateControl = this._getControl(
            systemControlsDictionary[CoreFieldRefNames.State],
            CoreFieldRefNames.State, WorkItemTrackingResources.StateLabel, "FieldControl", WorkItemTrackingResources.StateEmptyText);

        const reasonControl = this._getControl(
            systemControlsDictionary[CoreFieldRefNames.Reason],
            CoreFieldRefNames.Reason, WorkItemTrackingResources.ReasonLabel, "FieldControl", null);
        const stateReasonGroup = this._getNewGroup("StateAndReason", [stateControl, reasonControl], GroupOrientation.Horizontal);

        const areaPathControl = this._getControl(
            systemControlsDictionary[CoreFieldRefNames.AreaPath],
            CoreFieldRefNames.AreaPath, WorkItemTrackingResources.AreaLabel, "WorkItemClassificationControl", null);
        const areaPathGroup = this._getNewGroup(areaPathControl.label, [areaPathControl], GroupOrientation.Vertical);

        const iterationPathControl = this._getControl(
            systemControlsDictionary[CoreFieldRefNames.IterationPath],
            CoreFieldRefNames.IterationPath, WorkItemTrackingResources.IterationLabel, "WorkItemClassificationControl", null);
        const iterationPathGroup = this._getNewGroup(iterationPathControl.label, [iterationPathControl], GroupOrientation.Vertical);

        // Filter out groups without visible controls
        const groups = [assignedToGroup, stateReasonGroup, areaPathGroup, iterationPathGroup].filter(group => group.controls.length > 0 && group.controls.every(c => c.visible));
        layout.pages[0].sections[0].groups.unshift(...groups);
    }

    private _getControl(control: ILayoutControl, id: string, label: string, controlType: string, emptyText: string): ILayoutControl {
        control = control || {} as ILayoutControl;
        id = control.id || id;
        label = (control.label || label).replace("&", "");
        controlType = control.controlType || controlType;
        emptyText = (control.controlOptions && control.controlOptions.emptyText) || emptyText;

        return {
            // defaults first
            id: id,
            hideLabel: false,
            metadata: null,
            order: 0,
            visible: true,
            readonly: false,
            inherited: false,
            // then the control
            ...control,
            // then override fields
            controlType: controlType,
            label: label,
            watermark: emptyText,
            controlOptions: {
                // control options first
                ...control.controlOptions,
                // then override fields
                controlType: controlType,
                label: label,
                fieldName: id,
                refName: id,
                emptyText: emptyText,
                hideWhenReadOnlyAndEmpty: false
            }
        };
    }

    private _getNewGroup(label: string, controls: ILayoutControl[], orientation: GroupOrientation) {
        return {
            isMaximizable: false,
            isCollapsible: false,
            visible: true,
            calculatedVisible: true,
            inherited: false,
            hideHeader: true,
            orientation: orientation,
            id: label,
            label: null,
            order: 0,
            controls: controls.filter(control => control.visible)
        };
    }

    private _expandAllGroups(layout: ILayout) {
        for (const page of layout.pages) {
            for (const section of page.sections) {
                for (const group of section.groups) {
                    if (group.isCollapsible) {
                        group.isExpanded = true;
                    }
                }
            }
        }
    }

    private _isSystemPageToRemove(pageType: FormModels.PageType): boolean {
        return pageType === FormModels.PageType.history;
    }

    private _isFilteredGroup(group: FormModels.IGroup): boolean {
        return group.id === LayoutConstants.StateGraphControlGroupName;
    }
}
