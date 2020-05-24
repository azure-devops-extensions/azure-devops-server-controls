import * as VSSError from "VSS/Error";
import * as WITConstants from "Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants";
import * as Utils_String from "VSS/Utils/String";
import FormRendererHelpers = require("WorkItemTracking/Scripts/Utils/FormRendererHelpers");
import * as Models from "WorkItemTracking/Scripts/Form/Models";
import { IWorkItemControlOptions } from "WorkItemTracking/Scripts/Controls/WorkItemForm/WorkItemControl";
import { isNewDiscussionMaximizable } from "WorkItemTracking/Scripts/Utils/WitControlMode";

export namespace LayoutConstants {
    export const StateGraphControlGroupName = "StateGraphControl";
}

export interface ILayout extends Models.ILayout {
    pages: ILayoutPage[];

    systemControls: ILayoutControl[];

    /** Generated page containing header controls */
    headerPage?: ILayoutPage;
}

export interface ILayoutPage extends Models.IPage {
    sections: ILayoutSection[];
}

export interface ILayoutSection extends Models.ISection {
    groups: ILayoutGroup[];

    /**
     * Value indicating whether section should be shown. Sections are shown if:
     * - any group within the section is visible
     */
    calculatedVisible: boolean;
}

export enum GroupOrientation {
    /** Default orientation */
    Vertical = 0,

    Horizontal = 1
}

export interface ILayoutGroup extends Models.IGroup {
    controls: ILayoutControl[];
    isMaximizable: boolean;
    isCollapsible: boolean;
    hasTooltip?: boolean;

    /** Optional orientation for group */
    orientation?: GroupOrientation;

    /** Optional flag to hide group header */
    hideHeader?: boolean;

    /**
     * Value indicating whether the group should be shown. Groups are shown if:
     * - group is visible, and a contribution, or
     * - group contains any visible controls
     */
    calculatedVisible: boolean;

    /**
     * Initial expansion state of the group
     */
    isExpanded?: boolean;

    /**
     * Optional additional CSS classes to add to the group.
     */
    className?: string;
}

export interface ILayoutControl extends Models.IControl {
    controlOptions: IWorkItemControlOptions;
}

export enum WorkItemFormLayoutTransformationResult {
    None = 0,

    /** Transformation has modified the layout, visibility needs to be recalculated */
    LayoutChanged = 1
}

export interface IWorkItemFormLayoutTransformation {
    /** Apply layout transformation */
    apply(layout: ILayout): WorkItemFormLayoutTransformationResult;
}

export interface IDefaultControlOptions {
    /** Indicates whether controls bound to read only empty fields should be hidden */
    hideReadOnlyEmptyFields?: boolean;
}

export class LayoutInformation {
    private static controlId: number = 0;

    /** Return a unique wit control id  */
    public static buildUniqueControlId(): string {
        return `witc_${++LayoutInformation.controlId}`;
    }

    public readonly layout: ILayout;

    private readonly _defaultControlOptions: IDefaultControlOptions;

    /**
     * Create new instance of layout information
     * @param formLayout Layout to build layout information from
     * @param defaultControlOptions Default options for any control encountered in the form layout
     * @param layoutTransformations Optional layout transformations to apply
     */
    constructor(
        formLayout: Models.ILayout,
        defaultControlOptions: IDefaultControlOptions,
        layoutTransformations?: IWorkItemFormLayoutTransformation[]) {
        // Cast for now, we'll modify the object in-place then
        this.layout = <ILayout>formLayout;
        this._defaultControlOptions = defaultControlOptions;

        this._buildLayout();

        // Run any optional transformation for client generated parts of the form
        let rebuildRequired = false;

        if (layoutTransformations) {
            for (let transformation of layoutTransformations) {
                if (transformation.apply(this.layout) === WorkItemFormLayoutTransformationResult.LayoutChanged) {
                    rebuildRequired = true;
                }
            }
        }

        // Transformations might have made changes to the layout that require recalculating visibility, rebuild
        if (rebuildRequired) {
            this._buildLayout();
        }
    }

    /**
     * Determine how many visible sections with content are there for the given page
     * @param page Page to check sections for
     */
    public numberOfSectionsWithContent(page: ILayoutPage): number {
        return page.sections.filter(section => section
            && section.groups
            && section.groups.length
            && Utils_String.startsWith(section.id, "Section")
            && section.calculatedVisible).length;
    }

    private _buildLayout() {
        // Map system controls
        if (this.layout.systemControls) {
            for (let systemControl of this.layout.systemControls) {
                this._mapControl(systemControl);
            }
        }

        this._calculateVisibility(this.layout.pages);

        for (let page of this.layout.pages) {
            const onlyOneVisibleGroupInPage = this._hasOnlyOneVisibleGroupInPage(page);

            this._mapPage(page, onlyOneVisibleGroupInPage);
        }

        if (this.layout.headerPage) {
            this._buildHeaderPage();
        }
    }

    private _buildHeaderPage() {
        this._calculateVisibility([this.layout.headerPage]);
        this._mapPage(this.layout.headerPage, false);
    }

    private _calculateVisibility(pages: ILayoutPage[]) {
        for (let page of pages) {
            let isPageVisible = false;

            if (page.visible) {
                for (let section of page.sections) {
                    // First section in first page is always visible
                    let isSectionVisible = page === pages[0] && section === page.sections[0];

                    for (let group of section.groups) {
                        let isGroupVisible = false;

                        for (let control of group.controls) {
                            if (control.visible) {
                                isGroupVisible = true;
                                isSectionVisible = true;
                                isPageVisible = true;
                                break;
                            }
                        }

                        // Group extensions are always visible
                        if (group.isContribution && group.visible) {
                            isSectionVisible = true;
                            isPageVisible = true;
                            isGroupVisible = true;
                        }

                        group.calculatedVisible = isGroupVisible;
                    }

                    section.calculatedVisible = isSectionVisible;
                }

                if (page.isContribution) {
                    isPageVisible = true;
                }

                page.visible = isPageVisible;
            }
        }
    }

    private _hasOnlyOneVisibleGroupInPage(page: ILayoutPage): boolean {
        let numOfVisibleGroupsInPage = 0;

        if (page.sections) {
            for (let section of page.sections) {
                if (section.groups) {
                    for (let group of section.groups) {
                        if (group.controls && group.calculatedVisible) {
                            numOfVisibleGroupsInPage++;
                        }
                        if (numOfVisibleGroupsInPage > 1) {
                            break;
                        }
                    }
                }

                if (numOfVisibleGroupsInPage > 1) {
                    break;
                }
            };
        }

        return numOfVisibleGroupsInPage === 1;
    }

    private _mapPage(page: ILayoutPage, onlyOneVisibleGroupInPage: boolean): void {
        for (let section of page.sections) {
            this._mapSection(section, onlyOneVisibleGroupInPage);
        }
    }

    private _mapSection(section: ILayoutSection, onlyOneVisibleGroupInPage: boolean): void {
        for (let group of section.groups) {
            this._mapGroup(group, section, onlyOneVisibleGroupInPage);
        }
    }

    private _mapGroup(group: ILayoutGroup, section: ILayoutSection, onlyOneVisibleGroupInPage: boolean): void {
        const isMaximizableGroup = this._isMaximizableGroup(group);

        group.isMaximizable = isMaximizableGroup;
        group.isCollapsible = !onlyOneVisibleGroupInPage && group.isCollapsible !== false;
        group.hasTooltip = this._isMultilineField(group);

        if (!group.isContribution) {
            // In some cases we need to hide the label for the last control in a group:
            const hideLabelOfLastControl = isMaximizableGroup
                || (group.controls && group.controls.length === 1
                    && (ControlRules.isOfType(group.controls[0], WITConstants.WellKnownControlNames.TestStepsControl)
                        || ControlRules.isOfType(group.controls[0], WITConstants.WellKnownControlNames.AttachmentsControl)
                        || group.controls[0].hideLabel));

            for (let control of group.controls) {
                if (control.visible) {
                    let hideLabel = false;

                    if (control === group.controls[group.controls.length - 1]) {
                        hideLabel = hideLabelOfLastControl;
                    }

                    this._mapControl(control, group, section, onlyOneVisibleGroupInPage, hideLabel);
                }
            }
        }
    }

    private _isMultilineField(group: Models.IGroup): boolean {
        if (group.controls && group.controls.length > 0) {
            const firstControl = group.controls[0];
            return ControlRules.isHtmlControl(firstControl);
        } 
        return false;
    }

    private _isMaximizableGroup(group: Models.IGroup): boolean {
        // Criteria for maximizable group: Last control in group is maximizable and any control before that is label control
        if (group.controls && group.controls.length > 0) {
            let lastControl = group.controls[group.controls.length - 1];
            if (ControlRules.isMaximizableControl(lastControl)) {
                if (group.controls.slice(0, group.controls.length - 1).some(control => !ControlRules.isLabelControl(control))) {
                    return false;
                }

                for (let i = 0; i < group.controls.length - 1; i++) {
                    if (!ControlRules.isLabelControl(group.controls[i])) {
                        return false;
                    }
                }

                return true;
            }
        }

        return false;
    }

    private _mapControl(control: ILayoutControl, group?: ILayoutGroup, section?: ILayoutSection, autoFitFormHeight: boolean = false, hideLabel: boolean = false) {
        let controlOptions: IWorkItemControlOptions = {
            controlType: control.controlType || "FieldControl",
            controlId: control.controlOptions && control.controlOptions.contributionId || LayoutInformation.buildUniqueControlId(),

            hideWhenReadOnlyAndEmpty: this._defaultControlOptions.hideReadOnlyEmptyFields,

            fieldName: control.id,
            refName: control.id,
            readOnly: control.readonly ? "True" : "False",

            groupLabel: group && group.label,

            autoFitFormHeight: autoFitFormHeight,

            labelPosition: "top",
            hideLabel: hideLabel,
            emptyText: control.watermark,

            // Add passed in options
            ...control.controlOptions
        };

        // Hide label has to be applied in the control options as well as the actual control
        control.hideLabel = hideLabel;

        // I check !== true as the value is only set to true for section 1 group
        // which would just have one control that has the same name as the group.
        if (control.hideLabel !== true) {
            controlOptions.label = control.label;
        } else {
            controlOptions.label = "";
            controlOptions.ariaLabel = control.label;
        }

        // Add any control specific options
        if (!control.isContribution && control.metadata) {
            try {
                FormRendererHelpers.readControlOptions($.parseXML(control.metadata), controlOptions);
            } catch (error) {
                VSSError.publishErrorToTelemetry(error);
            }
        }

        // Determine height rules
        if (ControlRules.isCustomHeightControl(control)) {
            if (control.height && control.height > 0) {
                controlOptions.height = control.height;
            }
            else if (section && section.groups.length > 1) {
                controlOptions.height = 200;
            }
            else {
                controlOptions.height = 300;
            }
        }

        control.controlOptions = controlOptions;
    }

    protected static _buildUniqueSectionId(pageId: string, sectionId: string) {
        return pageId.concat(sectionId);
    }
}

export namespace ControlRules {
    export function isLabelControl(control: Models.IControl): boolean {
        return isOfType(control, WITConstants.WellKnownControlNames.LabelControl);
    }

    export function isHtmlControl(control: Models.IControl): boolean {
        return isOfType(control, WITConstants.WellKnownControlNames.HtmlControl);
    }

    export function isCustomHeightControl(control: Models.IControl): boolean {
        return isHtmlControl(control)
            || isOfType(control, WITConstants.WellKnownControlNames.WebpageControl)
            || isOfType(control, WITConstants.WellKnownControlNames.LinksControl);
    }

    export function isMaximizableControl(control: Models.IControl): boolean {
        return isHtmlControl(control)
            || isOfType(control, WITConstants.WellKnownControlNames.WebpageControl)
            || (isOfType(control, WITConstants.WellKnownControlNames.WorkItemDiscussionControl) && isNewDiscussionMaximizable())
            || isOfType(control, WITConstants.WellKnownControlNames.TestStepsControl)
            || isOfType(control, WITConstants.WellKnownControlNames.LinksControl);
    }

    export function isOfType(control: Models.IControl, controlType: string): boolean {
        return Utils_String.localeIgnoreCaseComparer(control.controlType, controlType) === 0;
    }
}
