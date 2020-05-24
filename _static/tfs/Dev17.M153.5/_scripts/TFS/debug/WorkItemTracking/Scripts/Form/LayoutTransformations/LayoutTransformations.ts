import CIConstants = require("WorkItemTracking/Scripts/CustomerIntelligence");
import FormModels = require("WorkItemTracking/Scripts/Form/Models");
import { IWorkItemDiscussionControlOptions, IStateTransitionGraphControlOptions } from "WorkItemTracking/Scripts/Controls/WorkItemForm/Interfaces"; 
import {
    ILayout, ILayoutPage, ILayoutGroup, ILayoutControl, LayoutConstants, IWorkItemFormLayoutTransformation, WorkItemFormLayoutTransformationResult
} from "WorkItemTracking/Scripts/Form/Layout";
import Telemetry = require("VSS/Telemetry/Services");
import WITConstants = require("Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants");
import WorkItemTrackingResources = require("WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking");
import WitFormMode = require("WorkItemTracking/Scripts/Utils/WitControlMode");
import { FormGrid } from "WorkItemTracking/Scripts/Form/Grids";
import { PageType } from "WorkItemTracking/Scripts/Form/Models";

export class DeletedViewTransformation implements IWorkItemFormLayoutTransformation {
    constructor(private _isDeletedView: boolean) { }

    public apply(witLayout: ILayout): WorkItemFormLayoutTransformationResult {
        let modifiedLayout = false;

        for (var i = witLayout.pages.length - 1; i >= 0; i--) {
            var page = witLayout.pages[i];
            if (page && page.isContribution && !page.contribution.showOnDeletedWorkItem === this._isDeletedView) {
                //remove the page contribution
                witLayout.pages.splice(i, 1);

                modifiedLayout = true;
                continue;
            }

            if (page && page.sections) {
                for (var j = 0; j < page.sections.length; j++) {
                    var section = page.sections[j];
                    if (section && section.groups) {
                        for (var k = section.groups.length - 1; k >= 0; k--) {
                            var group = section.groups[k];
                            if (group && group.isContribution && !group.contribution.showOnDeletedWorkItem === this._isDeletedView) {
                                //remove the group contribution
                                section.groups.splice(k, 1);

                                modifiedLayout = true;
                                continue;
                            }

                            if (group.controls) {
                                for (var l = group.controls.length - 1; l >= 0; l--) {
                                    var control = group.controls[l];
                                    if (control && control.isContribution && !control.contribution.showOnDeletedWorkItem === this._isDeletedView) {
                                        //remove the control contribution
                                        group.controls.splice(l, 1);
                                        modifiedLayout = true;
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        if (modifiedLayout) {
            return WorkItemFormLayoutTransformationResult.LayoutChanged;
        }

        return WorkItemFormLayoutTransformationResult.None;
    }
}

export class DiscussionLayoutTransformation implements IWorkItemFormLayoutTransformation {
    public apply(witLayout: ILayout): WorkItemFormLayoutTransformationResult {
        var discussionControl: ILayoutControl = {
            id: WITConstants.CoreFieldRefNames.History,
            controlType: "WorkItemDiscussionControl",
            label: WorkItemTrackingResources.WorkItemDiscussionLabel,
            readonly: false,
            visible: true,
            watermark: void 0,
            metadata: void 0,
            order: 0,
            hideLabel: true,
            inherited: false,
            controlOptions: <IWorkItemDiscussionControlOptions>{ enableContactCard: true },
            contribution: null,
            height: null,
            isContribution: false
        };

        var discussionGroup: ILayoutGroup = {
            label: WorkItemTrackingResources.WorkItemDiscussionLabel,
            visible: true,
            controls: [discussionControl],
            id: "discussionControl",
            order: 0,
            inherited: false,
            calculatedVisible: true,
            isMaximizable: true,
            isCollapsible: true            
        };

        if (witLayout.pages.some(
            (page: ILayoutPage) => {
                // Add discussion control as a new section to the first page that
                // 1. is not system page
                // 2. is not a page contribution
                if (page.pageType === FormModels.PageType.custom && !page.isContribution) {
                    page.sections.push({
                        id: FormGrid.BottomSection,
                        groups: [discussionGroup],
                        calculatedVisible: true
                    });

                    return true;
                }

                return false;
            })) {
            return WorkItemFormLayoutTransformationResult.LayoutChanged;
        }

        return WorkItemFormLayoutTransformationResult.None;
    }
}

export class HistoryControlTransformation implements IWorkItemFormLayoutTransformation {
    public apply(witLayout: ILayout): WorkItemFormLayoutTransformationResult {
        // Find and insert the state transition graph before the old history control as appropriate    
        var stateGraphControl: ILayoutControl = {
            id: WITConstants.CoreFieldRefNames.History,
            controlType: "WorkItemStateGraphControl",
            label: WorkItemTrackingResources.WorkItemLogControlStateGraphTitle,
            readonly: false,
            visible: true,
            watermark: void 0,
            metadata: void 0,
            order: 0,
            hideLabel: true,
            inherited: false,
            controlOptions: <IStateTransitionGraphControlOptions>{
                showSpinner: true,
                showErrors: true,
                showPin: false
            }
        };

        var stateGraphGroup: ILayoutGroup = {
            label: WorkItemTrackingResources.WorkItemLogControlStateGraphTitle,
            visible: true,
            controls: [stateGraphControl],
            id: LayoutConstants.StateGraphControlGroupName,
            order: 0,
            inherited: false,
            calculatedVisible: true,
            isMaximizable: false,
            isCollapsible: true,
            isExpanded: true
        };

        for (var i = 0; i < witLayout.pages.length; i++) {
            var page = witLayout.pages[i];
            if (page && page.sections) {
                for (var j = 0; j < page.sections.length; j++) {
                    var section = page.sections[j];
                    if (section && section.groups) {
                        for (var k = 0; k < section.groups.length; k++) {
                            var group = section.groups[k];
                            if (group && group.controls) {
                                for (var l = 0; l < group.controls.length; l++) {
                                    var control = group.controls[l];
                                    if (control.controlType === WITConstants.WellKnownControlNames.WorkItemLogControl
                                        || (control.controlOptions && control.controlOptions.controlType === WITConstants.WellKnownControlNames.WorkItemLogControl)) {
                                        // We are using the new history control, replace the log control with it.
                                        control.controlType = WITConstants.WellKnownControlNames.WorkItemHistoryControl;
                                        if (control.controlOptions) {
                                            control.controlOptions.controlType = WITConstants.WellKnownControlNames.WorkItemHistoryControl;
                                        }
                                        
                                        section.groups.unshift(stateGraphGroup);

                                        return WorkItemFormLayoutTransformationResult.LayoutChanged;
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        return WorkItemFormLayoutTransformationResult.None;
    }
}

/**
 * Make the group containing the history control (if it's the only control) non-collapsible
 */
export class HistoryControlGroupTransformation implements IWorkItemFormLayoutTransformation {
    apply(layout: ILayout): WorkItemFormLayoutTransformationResult {
        for (let historyPage of layout.pages.filter(p => p.pageType === PageType.history)) {
            for (let section of historyPage.sections) {
                for (let group of section.groups) {
                    if (group.controls && group.controls.length === 1) {
                        if (group.controls[0].controlType === WITConstants.WellKnownControlNames.WorkItemHistoryControl) {
                            group.isCollapsible = false;
                        }
                    }
                }
            }
        }

        return WorkItemFormLayoutTransformationResult.LayoutChanged;
    }
}
