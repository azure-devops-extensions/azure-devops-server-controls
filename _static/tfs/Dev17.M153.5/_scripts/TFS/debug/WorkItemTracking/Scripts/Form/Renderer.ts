import * as React from "react";
import * as ReactDOM from "react-dom";
import Controls = require("VSS/Controls");
import Diag = require("VSS/Diag");
import Models = require("WorkItemTracking/Scripts/Form/Models");
import Grids = require("WorkItemTracking/Scripts/Form/Grids");
import Events = require("WorkItemTracking/Scripts/Form/Events");
import Tabs = require("WorkItemTracking/Scripts/Form/Tabs");
import WITConstants = require("Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants");
import WorkItemTrackingResources = require("WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking");
import { IWorkItemControlOptions } from "WorkItemTracking/Scripts/Controls/WorkItemForm/WorkItemControl";
import Utils_UI = require("VSS/Utils/UI");
import Utils_String = require("VSS/Utils/String");
import WorkItemViewContributionManager = require("WorkItemTracking/Scripts/Form/WorkItemViewContributionManager");
import CopyWorkItemLinkControl = require("WorkItemTracking/Scripts/Controls/WorkItemForm/CopyWorkItemLinkControl");
import DiscussionAdornmentControl = require("WorkItemTracking/Scripts/Controls/WorkItemForm/DiscussionAdornmentControl");
import Events_Services = require("VSS/Events/Services");
import { FreshnessIndicatorDisplayMode, IFreshnessIndicatorOptions } from "WorkItemTracking/Scripts/Controls/WorkItemForm/FreshnessIndicatorControl";
import { ILayout, ILayoutPage, ILayoutSection, ILayoutGroup, ILayoutControl, LayoutInformation, IWorkItemFormLayoutTransformation } from "WorkItemTracking/Scripts/Form/Layout";
import { isContribution, createGroupContribution, createControlContribution } from "WorkItemTracking/Scripts/Form/Contributions";
import { PerfScenarioManager } from "WorkItemTracking/Scripts/Utils/PerfScenarioManager";
import { PerformanceEvents } from "WorkItemTracking/Scripts/CustomerIntelligence";
import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import { FeatureAvailabilityFlags } from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";
import { FormGroup, IFormGroupOptions } from "WorkItemTracking/Scripts/Form/FormGroup";
import { ResponsiveHeader, IResponsiveHeaderProps } from "WorkItemTracking/Scripts/Form/Header/Header";
import { getService } from "VSS/Service";
import { WorkItemFormUserLayoutSettingsService } from "WorkItemTracking/Scripts/Form/UserLayoutSettings";
import { ContributionLoadedCallbacks } from "WorkItemTracking/Scripts/Form/ContributionLoadedCallbacks";

const domElem = Utils_UI.domElem;
const eventSvc = Events_Services.getService();

export interface IPageRenderResult {
    groups: FormGroup[];
}

export interface ILayoutRenderResult extends IPageRenderResult {
    layout: JQuery;
}

export class FormRenderer implements IDisposable {
    private _layoutInformation: LayoutInformation;
    private _layout: ILayout;
    private _header: JQuery;
    private _core: JQuery;
    private _responsiveHeader: JQuery;
    private _formBody: JQuery;
    private _tabsControl: Tabs.WorkItemFormTabsControl;
    private _formContainer: JQuery;
    private _formScrollableFrame: JQuery;
    private _formContentContainer: JQuery;
    private _contributionManager: WorkItemViewContributionManager;
    private _controlIdMap: IDictionaryStringTo<ILayoutControl>;
    private _workItemTypeRefName: string;
    private _formViewId: string;

    private static MINIMAL_CORE_FIELDS_WIDTH = 690;
    private static MAXIMUM_CORE_FIELDS_WIDTH = 920;

    constructor(
        workItemTypeRefName: string,
        layout: Models.ILayout,
        layoutTransformations: IWorkItemFormLayoutTransformation[],
        contributionManager: WorkItemViewContributionManager,
        formViewId?: string) {

        this._layoutInformation = new LayoutInformation(
            layout, {
                hideReadOnlyEmptyFields: layout.showEmptyReadOnlyFields !== true
            },
            layoutTransformations);
        this._layout = this._layoutInformation.layout;

        this._formViewId = formViewId;

        this._workItemTypeRefName = workItemTypeRefName;
        this._contributionManager = contributionManager;

        this._populateControlIdMapping();

        // *****Layout structure*****
        // witform-layout               entire form
        // |--scrollable-frame          outside container to show horizontal scrollbar
        // |--|--content-container      actual content container with minimal width (for scrollbar)
        // |--|--|--form-main-header    header fields/toolbar
        // |--|--|--form-main-core      core fields
        // |--|--|--form-body           tab page content
        // |--header-color              color coding bar for work item type which always stays on top left
        this._formContainer = $("<div>").addClass("witform-layout");
        this._formScrollableFrame = $("<div>").addClass("witform-layout-scrollable-frame").appendTo(this._formContainer);
        this._formContentContainer = $("<div/>").addClass("witform-layout-content-container").appendTo(this._formScrollableFrame);

        this._header = $("<div/>").addClass("work-item-form-main-header").appendTo(this._formContentContainer);
        this._core = $("<div/>").addClass("work-item-form-main-core").appendTo(this._formContentContainer);
        this._formBody = $("<div/>").addClass("form-body").appendTo(this._formContentContainer);

        // This is a point in time mitigation for the width of the label of the customizable reason field
        // Mainly for WDG, we gave them the ability to replace the reason field with another field. However, this leads to a new problem
        // since the new form was designed with Reason in mind and not other field labels. So now when they put Resolved Reason in that spot
        // most of it gets cut off. We plan to address this issue fully when we are doing the REACT form conversion but for now we will just give them a FF
        // that will extend the space.
        if (FeatureAvailabilityService.isFeatureEnabled(FeatureAvailabilityFlags.WorkItemTrackingNewFormMoreSpaceInHeader)) {
            this._core.addClass("core-left-column-more-space");
        }
    }

    public dispose(): void {
        if (this._responsiveHeader) {
            ReactDOM.unmountComponentAtNode(this._responsiveHeader[0]);
        }
    }

    public getWorkItemForm() {
        return this._formContainer[0];
    }

    public drawLayout(): ILayoutRenderResult {
        PerfScenarioManager.addSplitTiming(
            PerformanceEvents.WORKITEMSVIEW_CREATELAYOUT, true);

        // Build header
        this._buildHeaderContent();

        // Build Core
        const groups = this._buildCoreContent();

        PerfScenarioManager.addSplitTiming(
            PerformanceEvents.WORKITEMSVIEW_CREATELAYOUT, false);

        return { layout: this._formContainer, groups };
    }

    public fillPage(page: ILayoutPage, grid: Grids.FormGrid): IPageRenderResult {
        const contributionCallbacks = new ContributionLoadedCallbacks(page);
        const groups: FormGroup[] = [];
        for (const section of page.sections) {
            if (section.calculatedVisible) {
                const sectionGroups = this._fillSection(section, grid, contributionCallbacks);
                groups.push(...sectionGroups);
            }
        }
        return { groups };
    }

    public getTabsControl(): Tabs.WorkItemFormTabsControl {
        return this._tabsControl;
    }

    public getContributionManager(): WorkItemViewContributionManager {
        return this._contributionManager;
    }

    private _buildHeaderContent(): void {
        // building id and title
        const idTitleContainer: JQuery = $("<div/>").addClass("work-item-form-headerContent").appendTo(this._header);

        // create the id control
        this._createFormControl(idTitleContainer, this._getSystemControlOptions(WITConstants.CoreFieldRefNames.Id, {
            controlCss: "work-item-form-id",
            controlType: "PlainTextControl",
            ariaLabel: WorkItemTrackingResources.IdField
        }));

        // create the title control
        const titleWatermark = this._getSystemControlEmptyText(WITConstants.CoreFieldRefNames.Title) || WorkItemTrackingResources.TitleEmptyText;
        const titleControl = this._createFormControl(idTitleContainer, this._getSystemControlOptions(WITConstants.CoreFieldRefNames.Title, {
            controlCss: "work-item-form-title",
            emptyText: titleWatermark,
            ariaLabel: WorkItemTrackingResources.TitleField,
            chromeBorder: false
        }));

        // creating the control to copy title and id to clipboard
        <CopyWorkItemLinkControl>Controls.BaseControl.createIn(CopyWorkItemLinkControl, idTitleContainer, { boundControl: titleControl });

        // building state and assigned To
        const headerToolbarContainer: JQuery = $("<div/>").addClass("work-item-form-headerContent").appendTo(this._header);
        const headerFieldsWrapper: JQuery = $("<div>").addClass("work-item-form-header-controls-container").appendTo(headerToolbarContainer);

        // create assigned to control
        const assignedToWatermark = this._getSystemControlEmptyText(WITConstants.CoreFieldRefNames.AssignedTo) || WorkItemTrackingResources.AssignedToEmptyText;
        const assignedToLabel = this._getSystemControlLabel(WITConstants.CoreFieldRefNames.AssignedTo) || WorkItemTrackingResources.AssignedToLabel;
        this._createFormControl(headerFieldsWrapper, this._getSystemControlOptions(WITConstants.CoreFieldRefNames.AssignedTo, {
            controlCss: "work-item-form-assignedTo",
            emptyText: assignedToWatermark,
            label: assignedToLabel,
            showUnsetImage: true,
            hideLabel: true,
            ariaLabel: WorkItemTrackingResources.AssignedToField,
            chromeBorder: false
        }));

        // create the discussion adornment control
        const discussionAdornmentControlContainer = $("<div/>").addClass("discussion-adornment-container").appendTo(headerFieldsWrapper);
        Controls.BaseControl.createIn(DiscussionAdornmentControl, discussionAdornmentControlContainer);

        // create the tags control.
        this._createFormControl(headerFieldsWrapper, this._getSystemControlOptions(WITConstants.CoreFieldRefNames.Tags, {
            controlCss: "work-item-form-tags",
            controlType: "TagFieldControl",
            hideLabel: true
        }));

        // toolbarcontainer
        $("<div>").addClass("work-item-form-toolbar-container").appendTo(headerToolbarContainer);

        $("<div>").addClass("clearfix").appendTo(headerToolbarContainer);
    }

    private _buildCoreContent(): FormGroup[] {
        if (FeatureAvailabilityService.isFeatureEnabled(FeatureAvailabilityFlags.WebAccessWorkItemTrackingFormResponsiveHeader)) {
            return this._buildResponsiveCore(this._core);
        }

        return this._buildCoreAndRefreshIndicator(this._core);
    }

    private _buildResponsiveCore(container: JQuery): FormGroup[] {
        this._responsiveHeader = $("<div>").addClass("work-item-form-responsive-header").appendTo(container);

        const $tabContainer = $("<div>");
        const groups = this._buildTabs($tabContainer, () => {
            // Adjust for margins
            return this._responsiveHeader.width() - 20;
        });

        let responsiveHeaderInstance: ResponsiveHeader;

        const onDisplayModeChanged = () => {
            // When the freshness indicator is re-rendered it might have become visible/hidden, in that case we need to reserve
            // space for it.
            if (responsiveHeaderInstance) {
                responsiveHeaderInstance.measure();
            }
        };

        responsiveHeaderInstance = ReactDOM.render(
            React.createElement(
                ResponsiveHeader,
                {
                    formViewId: this._formViewId,
                    headerPage: this._layoutInformation.layout.headerPage,
                    tabs: $tabContainer,
                    freshnessIndicator: {
                        full: this._createStaticFreshnessIndicatorControl(FreshnessIndicatorDisplayMode.Full, onDisplayModeChanged),
                        minimal: this._createStaticFreshnessIndicatorControl(FreshnessIndicatorDisplayMode.Minimal, onDisplayModeChanged)
                    },
                    createFormControl: this._createFormControl
                } as IResponsiveHeaderProps
            ),
            this._responsiveHeader[0]);

        return groups;
    }

    private _createStaticFreshnessIndicatorControl(displayMode: FreshnessIndicatorDisplayMode, onDisplayModeChanged: () => void): JQuery {
        const $container: JQuery = $("<div/>").addClass("work-item-form-coreContent-lastUpdatedContainer");
        this._createFormControl(
            $container,
            <IFreshnessIndicatorOptions>this._getSystemControlOptions(WITConstants.CoreFieldRefNames.ChangedBy, <IFreshnessIndicatorOptions>{
                controlCss: "work-item-form-changedby",
                controlType: WITConstants.WellKnownControlNames.FreshnessIndicatorControl,
                isReadOnlyIconHidden: true,
                getDisplayMode: () => {
                    if (onDisplayModeChanged) {
                        onDisplayModeChanged();
                    }

                    return displayMode;
                }
            }));

        return $container;
    }

    private _buildCoreAndRefreshIndicator(container: JQuery): FormGroup[] {
        const coreHeader: JQuery = $("<div/>").addClass("work-item-form-coreContent").appendTo(container);
        // we need 2 rows for the core controls.
        // The 1st line will have state, area, and freshnessIndicator control. FreshnessIndicator will be trimmed and disappear if there's no space.
        // The 2nd line will have reason, iteration and workItemTabs. The 2nd line will wrap and put tabs controls to another line if there's no space.
        const row1 = $("<div/>").addClass("work-item-form-coreContent-row1").appendTo(coreHeader);
        const row2 = $("<div/>").addClass("work-item-form-coreContent-row2").appendTo(coreHeader);
        const controlsContainerRow1 = $("<div>").addClass("work-item-form-coreContent-controls-container").appendTo(row1);
        const controlsContainerRow2 = $("<div>").addClass("work-item-form-coreContent-controls-container").appendTo(row2);

        // create row1 controls
        // create state control
        const watermark = this._getSystemControlEmptyText(WITConstants.CoreFieldRefNames.State) || WorkItemTrackingResources.StateEmptyText;
        const label = this._getSystemControlLabel(WITConstants.CoreFieldRefNames.State) || WorkItemTrackingResources.StateLabel;
        const stateContainer: JQuery = $("<div/>").addClass("work-item-form-coreContent-stateContainer").appendTo(controlsContainerRow1);
        this._createFormControl(stateContainer, this._getSystemControlOptions(WITConstants.CoreFieldRefNames.State, {
            controlCss: "work-item-form-state",
            emptyText: watermark, label: label,
            chromeBorder: false
        }));

        // create area path control
        const areaLabel = this._getSystemControlLabel(WITConstants.CoreFieldRefNames.AreaPath) || WorkItemTrackingResources.AreaLabel;
        const areaPathContainer: JQuery = $("<div/>").addClass("work-item-form-coreContent-areaPathContainer").appendTo(controlsContainerRow1);
        this._createFormControl(areaPathContainer, this._getSystemControlOptions(WITConstants.CoreFieldRefNames.AreaPath, {
            controlCss: "work-item-form-areaIteration",
            controlType: this._isSystemControlReplaced(WITConstants.CoreFieldRefNames.AreaPath) ? undefined : "WorkItemClassificationControl",
            label: areaLabel,
            chromeBorder: false
        }));

        // create lastUpdated by control
        const lastUpdatedContainer: JQuery = $("<div/>").addClass("work-item-form-coreContent-lastUpdatedContainer").appendTo(row1);
        const lastUpdatedWrapper: JQuery = $("<div/>").addClass("work-item-form-coreContent-lastUpdatedWrapper").appendTo(lastUpdatedContainer);

        this._createFormControl(lastUpdatedWrapper,
            <IFreshnessIndicatorOptions>this._getSystemControlOptions(WITConstants.CoreFieldRefNames.ChangedBy, <IFreshnessIndicatorOptions>{
                controlCss: "work-item-form-changedby",
                controlType: "FreshnessIndicatorControl",
                isReadOnlyIconHidden: true,
                getDisplayMode: (fullWidth: number, minimalWidth: number): FreshnessIndicatorDisplayMode => {
                    const containerWidth = coreHeader.width();

                    const tabWidth = this._tabsControl.getElement().outerWidth();
                    // Incase if tabwidth is smaller than refreshindicator control container width
                    const maxWidth = Math.max(tabWidth, fullWidth);

                    if (containerWidth > FormRenderer.MAXIMUM_CORE_FIELDS_WIDTH + maxWidth) {
                        // Display core fields and tabs control on the same row when possible
                        controlsContainerRow1.css("flex-basis", containerWidth - maxWidth - 60);
                        controlsContainerRow2.css("flex-basis", containerWidth - maxWidth - 60);
                        lastUpdatedContainer.css("flex-basis", fullWidth);
                        return FreshnessIndicatorDisplayMode.Full;
                    } else if (containerWidth > FormRenderer.MINIMAL_CORE_FIELDS_WIDTH + minimalWidth) {
                        // Display minimal freshness indicator text when core fields don't have 920px if living with full text mode
                        controlsContainerRow1.css("flex-basis", containerWidth - minimalWidth);
                        controlsContainerRow2.css("flex-basis", containerWidth - minimalWidth);
                        lastUpdatedContainer.css("flex-basis", minimalWidth);
                        return FreshnessIndicatorDisplayMode.Minimal;
                    } else {
                        // Display only the core fields when core fields don't have at least 600px if living with minimal text mode
                        // Set the basis of the freshness Indicator to be zero to const the area and iteration controls to be aligned at the row end.
                        lastUpdatedContainer.css("flex-basis", "0px");
                        return FreshnessIndicatorDisplayMode.None;
                    }
                }
            }));

        // create row2 controls
        // create reason control
        const reasonLabel = this._getSystemControlLabel(WITConstants.CoreFieldRefNames.Reason) || WorkItemTrackingResources.ReasonLabel;
        const reasonContainer: JQuery = $("<div/>").addClass("work-item-form-coreContent-reasonContainer").appendTo(controlsContainerRow2);
        this._createFormControl(reasonContainer, this._getSystemControlOptions(WITConstants.CoreFieldRefNames.Reason, {
            controlCss: "work-item-form-reason",
            label: reasonLabel,
            chromeBorder: false
        }));

        // create iteration path control
        const iterationLabel = this._getSystemControlLabel(WITConstants.CoreFieldRefNames.IterationPath) || WorkItemTrackingResources.IterationLabel;
        const iterationPathContainer: JQuery = $("<div/>").addClass("work-item-form-coreContent-iterationPathContainer").appendTo(controlsContainerRow2);
        this._createFormControl(iterationPathContainer, this._getSystemControlOptions(WITConstants.CoreFieldRefNames.IterationPath, {
            controlCss: "work-item-form-areaIteration",
            controlType: this._isSystemControlReplaced(WITConstants.CoreFieldRefNames.IterationPath) ? undefined : "WorkItemClassificationControl",
            label: iterationLabel,
            chromeBorder: false
        }));

        // Hide system controls that are set not visible
        if (!this._isSystemControlVisible(WITConstants.CoreFieldRefNames.IterationPath)) {
            iterationPathContainer.css("visibility", "hidden");
        }

        if (!this._isSystemControlVisible(WITConstants.CoreFieldRefNames.AreaPath)) {
            areaPathContainer.css("visibility", "hidden");
        }

        if (!this._isSystemControlVisible(WITConstants.CoreFieldRefNames.Reason)) {
            reasonContainer.css("visibility", "hidden");
        }

        // create tabs
        return this._buildTabs(row2, () => {
            const coreContent = container.find(".work-item-form-coreContent");
            return coreContent.width();
        });
    }

    private _isSystemControlReplaced(fieldRefName: string): boolean {
        const systemControl = this._controlIdMap[fieldRefName];
        return systemControl && !Utils_String.equals(fieldRefName, systemControl.controlOptions.refName, true);
    }

    private _getSystemControlLabel(fieldRefName: string): string {
        const systemControl = this._controlIdMap[fieldRefName];
        const label = systemControl && systemControl.label ? systemControl.label : null;
        return label;
    }

    private _isSystemControlVisible(fieldRefName: string): boolean {
        const systemControl = this._controlIdMap[fieldRefName];
        return !systemControl || systemControl.visible !== false;
    }

    private _getSystemControlEmptyText(fieldRefName: string): string {
        const systemControl = this._controlIdMap[fieldRefName];
        const watermark = systemControl && systemControl.watermark ? systemControl.watermark : null;
        return watermark;
    }

    private _getSystemControlOptions(fieldRefName: string, options: IWorkItemControlOptions): IWorkItemControlOptions {
        const mappedOptions = this._controlIdMap[fieldRefName] && this._controlIdMap[fieldRefName].controlOptions || {};

        const mergedOptions: IWorkItemControlOptions = $.extend(true, {
            fieldName: fieldRefName,
            controlType: WITConstants.WellKnownControlNames.FieldControl // Default control type if no other is specified
        }, mappedOptions, options);

        if (!mergedOptions.controlId) {
            // No unique id specified for this control, generate one, otherwise it won't be possible to reference
            // this control from labels, for example.
            mergedOptions.controlId = LayoutInformation.buildUniqueControlId();
        }

        return mergedOptions;
    }

    // Store the control Id map to populate options for header and core controls
    private _populateControlIdMapping(): void {
        this._controlIdMap = {};
        if (this._layout.systemControls) {
            for (const control of this._layout.systemControls) {
                if (control.replacesFieldReferenceName) {
                    this._controlIdMap[control.replacesFieldReferenceName] = control;
                } else {
                    this._controlIdMap[control.id] = control;
                }
            }
        }
    }

    private _buildTabs(container: JQuery, getAvailableWidth: () => number): FormGroup[] {
        // create the tabs control
        this._tabsControl = <Tabs.WorkItemFormTabsControl>Controls.Control.createIn(Tabs.WorkItemFormTabsControl, container, {
            getAvailableWidth
        } as Tabs.IWorkItemFormTabOptions);

        this._buildTabsContent();

        return this._setActiveTab();
    }

    private _setActiveTab(): FormGroup[] {
        let activeTab: Tabs.WorkItemFormTab;
        for (const tab of this._tabsControl.getTabs()) {
            if (!activeTab && tab.page.visible) {
                activeTab = tab;
            }
        }

        this._tabsControl.setActiveTab(activeTab);

        const { groups } = this.fillPage(activeTab.page, activeTab.formGrid);
        return groups;
    }

    private _buildTabsContent(): void {
        $.each(this._layout.pages, (i: number, page: ILayoutPage) => {
            if (page.visible) {
                this._buildTabContent(page, i);
            }
        });
    }

    private _buildTabContent(page: ILayoutPage, pageIndex: number): void {
        const grid: Grids.FormGrid = this._getGrid(page, this._formBody);
        grid.hide();
        this._tabsControl.addTab(page, pageIndex, grid, this);
    }

    private _getGrid(page: ILayoutPage, container: JQuery): Grids.FormGrid {
        const numSectionsWithContent = this._layoutInformation.numberOfSectionsWithContent(page);

        const options: Grids.FormGridOptions = { coreCssClass: "form-grid", layoutMode: page.layoutMode };

        if (numSectionsWithContent <= 1) {
            return <Grids.FormGrid>Controls.BaseControl.createIn(Grids.SingleSectionFormGrid, container, options);
        } else if (numSectionsWithContent === 2) {
            return <Grids.FormGrid>Controls.BaseControl.createIn(Grids.ThreeOneSectionFormGrid, container, options);
        } else if (numSectionsWithContent === 3) {
            return <Grids.FormGrid>Controls.BaseControl.createIn(Grids.TwoOneOneSectionFormGrid, container, options);
        }

        Diag.Debug.assert(numSectionsWithContent === 4, "Too many sections defined");

        return <Grids.FormGrid>Controls.BaseControl.createIn(Grids.TwoOneOneOneSectionFormGrid, container, options);
    }

    private _createFormControl(container: JQuery, options: IWorkItemControlOptions): JQuery {
        const label: JQuery = $("<div/>");
        label.addClass("workitemlabel");
        if (options.labelCss) {
            label.addClass(options.labelCss);
        } else {
            label.addClass("label-control");
        }

        if (options.hideLabel) {
            label.hide();
        }

        label.data("wit-options", options);
        label.appendTo(container);

        const control: JQuery = $(domElem("div", "workitemcontrol work-item-control"));
        if (options.controlCss) {
            control.addClass(options.controlCss);
        }
        if (options.chromeBorder === undefined) {
            options.chromeBorder = getService(WorkItemFormUserLayoutSettingsService).fieldChromeBorder ? true : undefined;
        }
        if (options.chromeBorder) {
            control.addClass("chromeBorder");
        }

        control.data("wit-options", options);
        control.appendTo(container);

        return control;
    }

    private _fillSection(section: ILayoutSection, grid: Grids.FormGrid, contributionCallbacks: ContributionLoadedCallbacks, onlyOneVisibleGroupInPage?: boolean): FormGroup[] {
        const sectionElement = grid.getSection(section.id);

        const groups: FormGroup[] = [];

        if (sectionElement) {
            for (const group of section.groups) {
                if (group.calculatedVisible) {
                    const formGroup = this._createGroup(grid, group, section, contributionCallbacks, onlyOneVisibleGroupInPage);
                    groups.push(formGroup);
                    grid.addToSection(formGroup._element.parent(), section.id);
                }
            }
        }
        return groups;
    }

    private _createGroup(grid: Grids.FormGrid, group: ILayoutGroup, section: ILayoutSection, contributionCallbacks: ContributionLoadedCallbacks, onlyOneVisibleGroupInPage?: boolean): FormGroup {
        const groupContainer = $(domElem("div"));

        const formGroup = <FormGroup>FormGroup.createIn<IFormGroupOptions>(FormGroup, groupContainer, {
            model: group,
            isMaximizable: group.isMaximizable,
            isCollapsible: group.isCollapsible,
            hasTooltip: group.hasTooltip,
            onToggleCallback: (isExpanded) => {
                if (formGroup.shouldFireToggleEvent()) {
                    const groupExpandStateChangedArgs: Events.IGroupExpandStateChangedArgs = {
                        group: group,
                        isExpanded: isExpanded,
                        groupElement: formGroup.getElement(),
                        witRefName: this._workItemTypeRefName
                    };

                    eventSvc.fire(Events.FormEvents.GroupExpandStateChangedEvent(), formGroup, groupExpandStateChangedArgs);
                }
            }
        });

        if (isContribution(group)) {
            const callbacks = contributionCallbacks.getCallBacks(group);
            const groupContributionContent = createGroupContribution(this._contributionManager, group, callbacks);

            formGroup.appendContent(groupContributionContent);
        } else {
            // Not a contributed group, create controls
            const groupControls: JQuery = $(domElem("div", "group-controls"));
            formGroup.appendContent(groupControls);

            for (const control of group.controls) {
                if (control.visible) {
                    if (control.isContribution) {
                        const callbacks = contributionCallbacks.getCallBacks(control);
                        groupControls.append(createControlContribution(this._contributionManager, control, callbacks));
                    } else {
                        groupControls.append(this._createControl(control, group, section));
                    }
                }
            }
        }

        return formGroup;
    }

    private _createControl(control: ILayoutControl, group: ILayoutGroup, section: ILayoutSection): JQuery {
        const controlContainer: JQuery = $(domElem("div", "control"));
        this._createFormControl(controlContainer, control.controlOptions);
        return controlContainer;
    }
}
