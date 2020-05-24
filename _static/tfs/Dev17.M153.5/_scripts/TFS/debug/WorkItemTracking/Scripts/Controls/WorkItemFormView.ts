/// <amd-dependency path="jQueryUI/button"/>
/// <amd-dependency path="jQueryUI/dialog"/>
/// <amd-dependency path="jQueryUI/tabs"/>

/// <reference types="jquery" />

import * as React from "react";
import * as ReactDOM from "react-dom";

import Controls = require("VSS/Controls");
import Panels = require("VSS/Controls/Panels");
import Utils_UI = require("VSS/Utils/UI");
import VSS = require("VSS/VSS");
import VSSError = require("VSS/Error");
import Events_Services = require("VSS/Events/Services");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import { WorkItemFormShortcutGroup } from "WorkItemTracking/Scripts/WorkItemFormShortcutGroup";
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import Utils_Array = require("VSS/Utils/Array");
import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import WITConstants = require("Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants");
import { FeatureAvailabilityFlags } from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";
import { RichContentTooltip } from "VSS/Controls/PopupContent";
import WITOM = require("WorkItemTracking/Scripts/TFS.WorkItemTracking");
import WorkItemTrackingResources = require("WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking");
import FormModels = require("WorkItemTracking/Scripts/Form/Models");
import FormLayout = require("WorkItemTracking/Scripts/Form/Layout");
import FormGrids = require("WorkItemTracking/Scripts/Form/Grids");
import FormEvents = require("WorkItemTracking/Scripts/Form/Events");
import FormTabs = require("WorkItemTracking/Scripts/Form/Tabs");
import { FormRenderer } from "WorkItemTracking/Scripts/Form/Renderer";
import ExtensionContracts = require("TFS/WorkItemTracking/ExtensionContracts");
import WorkItemViewContributionManager = require("WorkItemTracking/Scripts/Form/WorkItemViewContributionManager");
import CopyWorkItemLinkControl = require("WorkItemTracking/Scripts/Controls/WorkItemForm/CopyWorkItemLinkControl");
import DiscussionAdornmentControl = require("WorkItemTracking/Scripts/Controls/WorkItemForm/DiscussionAdornmentControl");
import {
    beginGetWorkItemControl, IWorkItemControlType, RenderType
} from "WorkItemTracking/Scripts/ControlRegistration";
import "WorkItemTracking/Scripts/ControlRegistration/Form.Desktop";
import { WorkItemControl, IWorkItemControlOptions } from "WorkItemTracking/Scripts/Controls/WorkItemForm/WorkItemControl";
import { PerfScenarioManager } from "WorkItemTracking/Scripts/Utils/PerfScenarioManager";
import { IWorkItemTypeExtension } from "WorkItemTracking/Scripts/OM/WorkItemInterfaces";
import { MaximizableWorkItemControl } from "WorkItemTracking/Scripts/Controls/WorkItemForm/MaximizableWorkItemControl";
import { WorkItemLabel } from "WorkItemTracking/Scripts/Controls/WorkItemForm/LabelControl";
import { WorkItemToolbar } from "WorkItemTracking/Scripts/Controls/WorkItemToolbar";
import { IWorkItemView, WorkItemForm, IWorkItemFormDialogOptions } from "WorkItemTracking/Scripts/Controls/WorkItemForm";
import {
    DiscussionLayoutTransformation, HistoryControlTransformation, DeletedViewTransformation, HistoryControlGroupTransformation
} from "WorkItemTracking/Scripts/Form/LayoutTransformations/LayoutTransformations";
import { LayoutUserSettingsUtility } from "WorkItemTracking/Scripts/Utils/LayoutUserSettingsUtility";
import CIConstants = require("WorkItemTracking/Scripts/CustomerIntelligence");
import { FormFieldEventHandler } from "WorkItemTracking/Scripts/Form/FormFieldEventHandler";
import { WellKnownControlNames, FormLayoutType } from "Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants";
import { FormGroup } from "WorkItemTracking/Scripts/Form/FormGroup";
import { InjectHeaderPageTransformation } from "WorkItemTracking/Scripts/Form/LayoutTransformations/InjectHeaderPageTransformation";
import { WITIdentityHelpers } from "TfsCommon/Scripts/WITIdentityHelpers";
import { IWitContribution } from "WorkItemTracking/Scripts/Form/Models";
import Service = require("VSS/Service");
import Contrib_Services = require("VSS/Contributions/Services");
import { Debug, timeStamp, StampEvent, logError } from "VSS/Diag";
import { WorkItemFormUserLayoutSettingsService } from "WorkItemTracking/Scripts/Form/UserLayoutSettings";
import { DropTargetComponent } from "WorkItemTracking/Scripts/Form/React/Components/DropTargetComponent";
import { useNewDragDrop } from "WorkItemTracking/Scripts/Utils/WitControlMode";

const eventSvc = Events_Services.getService();

const contributionPromises: { [contributionId: string]: PromiseLike<Contribution[]> } = {};

function getContribution(contributionId: string): PromiseLike<Contribution[]> {
    if (!contributionId) {
        return Promise.resolve([]);
    }

    if (!contributionPromises[contributionId]) {
        contributionPromises[contributionId] =
            Service.getService(Contrib_Services.ExtensionService).getContributions([contributionId], true, false);
    }

    return contributionPromises[contributionId];
}

type WitFieldType = "";
interface IControlInput {
    id: string;
    name: string;
    type?: "WorkItemField";
    properties: WitFieldType[];
    validation: {
        dataType: "String" | "Number" | "Boolean" | "Field";
        isRequired: boolean;
    };
}

interface IBoundContributedControlData {
    fieldId: string;
    callback: (workItem: WITOM.WorkItem, field: WITOM.Field) => void;
}

function hasSingleField(
    controlOptions: IWitContribution,
    getField: (key: string) => WITOM.FieldDefinition | null,
    contributionsPromise: PromiseLike<Contribution[]> = getContribution(controlOptions.contributionId),
): PromiseLike<WITOM.FieldDefinition | null> {
    return contributionsPromise.then((contributions): WITOM.FieldDefinition | null => {
        const contribution = contributions.filter((c) => c.id === controlOptions.contributionId)[0];
        const inputs: IControlInput[] = contribution && contribution.properties[
            WITConstants.WorkItemFormContributionProperties.Inputs
        ] || [];
        const fieldInputs = inputs.filter((i) => i.id in controlOptions.inputs && i.type === "WorkItemField");
        if (fieldInputs.length !== 1) {
            return;
        }
        return getField(controlOptions.inputs[fieldInputs[0].id]);
    });
}

export function addControlContributionTooltip(
    $contributionContainer: JQuery,
    getField: (key: string) => WITOM.FieldDefinition | null,
    addTooltip: (content: string | JQuery, target: JQuery) => void,
    contributionsPromise: PromiseLike<Contribution[]> = getContribution(
        ($contributionContainer.data("contribution") || {} as IWitContribution).contributionId
    ),
): PromiseLike<void> {
    return hasSingleField(
        $contributionContainer.data("contribution"),
        getField,
        contributionsPromise,
    ).then((field) => {
        const helpText = field && field.helpText;
        if (!helpText) {
            return;
        }
        const $helpText = $("<div/>")
            .append($("<div/>").text(helpText))
            .append($("<div/>").text(
                Utils_String.format(WorkItemTrackingResources.WorkItemFieldLabelTitleFormat, field.name)
            ));
        addTooltip($helpText, $contributionContainer);
    });
}

interface IFormInfo {
    layout: JQuery;
    renderer: any;
}

export interface IWorkItemFormViewOptions {
    workItem: WITOM.WorkItem;
    workItemType: WITOM.WorkItemType;
    extension: IWorkItemTypeExtension;
    isDeletedView: boolean;
    form: WorkItemForm;
}

export class WorkItemFormView extends Controls.Control<IWorkItemFormViewOptions> implements IWorkItemView {
    public workItem: WITOM.WorkItem;
    public workItemType: WITOM.WorkItemType;
    public extension: IWorkItemTypeExtension;
    public controls: WorkItemControl[];
    public options: IWorkItemFormViewOptions;
    public attached: boolean;
    public form: WorkItemForm;
    public extensionInfo;
    public isDeletedView: boolean;
    protected _renderer: FormRenderer;
    protected _tfsContext: TFS_Host_TfsContext.TfsContext;
    private isDisabledView: boolean;
    private _windowResizeEventHandler: (eventObject: JQueryEventObject) => any;
    private _groupExpandStateChangedHandler: IEventHandler;
    private _layoutResizeHandler: IEventHandler;
    private _controlVisibilityHandler: IEventHandler;
    private _controlResizeHandler: IEventHandler;
    private _groups: FormGroup[];
    private _pageGrids: FormGrids.FormGrid[];
    private _layout: JQuery;
    private _layoutModel: FormModels.ILayout;
    private _toolbar: WorkItemToolbar;
    private _contributionManager: WorkItemViewContributionManager;
    private _copyWorkItemLinkControl: CopyWorkItemLinkControl;
    private _discussionAdornmentControl: DiscussionAdornmentControl;
    private _shortcutGroup: WorkItemFormShortcutGroup;
    private _dropTargetIsCreated: boolean = false;
    private _dropTargetContainer: HTMLElement;
    private _dropTarget: DropTargetComponent;

    private _unregisteredTabs: FormTabs.WorkItemFormTab[] = [];
    private _registeredTabs: FormTabs.WorkItemFormTab[] = [];
    private _unregisteredGroups: FormGroup[] = [];
    private _registeredGroups: FormGroup[] = [];
    private _formFieldEventHandlers: FormFieldEventHandler[] = [];

    constructor(options?: IWorkItemFormViewOptions) {
        super(options);

        this.isDeletedView = this._options.isDeletedView;
        this.workItemType = this._options.workItemType;
        this.extension = this._options.extension;
        this.form = this._options.form;
        this.controls = [];
        this._groups = [];
        this._pageGrids = [];
        this._tfsContext = this.workItemType.store.getTfsContext();

        this._contributionManager = new WorkItemViewContributionManager();
    }

    public initializeOptions(options?: IWorkItemFormViewOptions) {
        /// <param name="options" type="any" />
        super.initializeOptions($.extend({
            coreCssClass: "work-item-view new-work-item-view",
            readOnly: false
        }, options));
    }

    public _dispose() {
        if (this._shortcutGroup) {
            this._shortcutGroup.removeShortcutGroup();
        }

        if (this._dropTargetIsCreated) {
            ReactDOM.unmountComponentAtNode(this._dropTargetContainer);
        }

        this.unbind();

        if (this.controls) {
            this.controls.forEach((control) => {
                control.dispose();
            });
        }

        this._contributionManager.dispose();

        if (this._renderer) {
            this._renderer.dispose();
            this._renderer = null;
        }

        super._dispose();
    }

    public getLayout() {
        if (!this._layout) {
            const formInfo: IFormInfo = this._getFormInfo();
            this._layout = formInfo.layout;
            this._renderer = formInfo.renderer;
        }

        this._applyUserLayoutSettings();

        return this._layout;
    }

    protected _getLayoutTransformations(): FormLayout.IWorkItemFormLayoutTransformation[] {
        let transformations = [
            new DeletedViewTransformation(this.isDeletedView),
            new DiscussionLayoutTransformation(),
            new HistoryControlTransformation(),
            new HistoryControlGroupTransformation()
        ];

        if (FeatureAvailabilityService.isFeatureEnabled(FeatureAvailabilityFlags.WebAccessWorkItemTrackingFormResponsiveHeader)) {
            transformations.push(new InjectHeaderPageTransformation());
        }

        return transformations;
    }

    private _getFormInfo(): IFormInfo {
        const form = this.workItemType.form;
        Debug.assertIsString(form);
        if (typeof form === "string") {
            this._layoutModel = JSON.parse(this.workItemType.form) as FormModels.ILayout;
            if (this.workItem && this.workItem.isReadOnly()) {
                this._layoutModel.showEmptyReadOnlyFields = true;
            }
        }

        const renderer = new FormRenderer(
            this.workItemType.referenceName,
            this._layoutModel,
            this._getLayoutTransformations(),
            this._contributionManager,
            this.getId());

        const { layout, groups } = renderer.drawLayout();
        this._unregisteredGroups.push(...groups);

        return {
            layout,
            renderer: renderer
        };
    }

    /**
     * This will apply the saved settings for the user on the layout dom.
     * This includes collapsing the groups the user has collapsed in the past(and that we have saved for him)
     */
    protected _applyUserLayoutSettings($grid?: JQuery): void {
        const workItemTypeSettings = Service.getService(WorkItemFormUserLayoutSettingsService).getLayoutSettingsForWorkItemType(this.workItemType);

        if (workItemTypeSettings && workItemTypeSettings.collapsedGroups) {
            const groups = $grid && $grid.length > 0 ? $grid.find(".grid-group-container") : this._layout.find(".grid-group-container");
            $.each(groups, (i, g) => {
                const group = <FormGroup>Controls.Enhancement.getInstance(FormGroup, $(g));
                if (group) {
                    if (LayoutUserSettingsUtility.isGroupCollapsedForWorkItemType(workItemTypeSettings, group.getGroupId())) {
                        group.collapse();
                    } else {
                        group.expand();
                    }
                }
            });
        }
    }

    public beginAttachLayout(callback?: () => void): void {
        const layout: JQuery = this.getLayout();

        PerfScenarioManager.addSplitTiming(CIConstants.PerformanceEvents.WORKITEMSVIEW_ATTACHLAYOUT, true);

        if (this.attached) {
            this.showElement();
            PerfScenarioManager.addSplitTiming(CIConstants.PerformanceEvents.WORKITEMSVIEW_ATTACHLAYOUT, false);
            if (callback) {
                callback();
            }
        } else {
            this._renderLayoutContent(layout, true, () => {
                PerfScenarioManager.addSplitTiming(CIConstants.PerformanceEvents.WORKITEMSVIEW_APPENDELEMENT, true);
                this._element.append(layout);
                PerfScenarioManager.addSplitTiming(CIConstants.PerformanceEvents.WORKITEMSVIEW_APPENDELEMENT, false);
                this.attached = true;
                PerfScenarioManager.addSplitTiming(CIConstants.PerformanceEvents.WORKITEMSVIEW_ATTACHLAYOUT, false);
                if (callback) {
                    callback();
                }
            });
        }
    }

    public detachLayout() {
        if (this.attached) {
            this.hideElement();
        }
    }

    private contributedControlBindingData: IBoundContributedControlData[] = [];
    private bindControlContributions(
        workItem: WITOM.WorkItem,
    ): Promise<void> {
        PerfScenarioManager.addSplitTiming(CIConstants.PerformanceEvents.WORKITEMSVIEW_BIND_CONTRIBUTIONS, true);

        const getField = (key: string) => this.workItemType.getFieldDefinition(key);
        const containers = this._layout.find(".control-extension-container");

        const promises: PromiseLike<void>[] = [];
        for (const container of containers.toArray()) {
            const $container = $(container);
            const options: IWitContribution = $container.data("contribution") || {};

            promises.push(hasSingleField(options, getField).then((fieldDefinition): void => {
                if (!fieldDefinition) {
                    return;
                }

                const bindingData: IBoundContributedControlData = {
                    fieldId: fieldDefinition.referenceName,
                    callback: (wi, field) => {
                        if (field.isValid()) {
                            $container.removeClass("invalid");
                        } else {
                            $container.addClass("invalid");
                        }
                    }
                };
                this.contributedControlBindingData.push(bindingData);
                workItem.attachFieldChange(bindingData.fieldId, bindingData.callback);
            }));

        }

        // i know this is before the promises are resolved, but mostly just timing how long
        // the method takes since it's part of the render logic which is not async
        PerfScenarioManager.addSplitTiming(CIConstants.PerformanceEvents.WORKITEMSVIEW_BIND_CONTRIBUTIONS, false);

        return Promise.all(promises).then((): void => undefined);
    }
    private _unbindControlContributions(workItem: WITOM.WorkItem) {
        while (this.contributedControlBindingData.length > 0) {
            const bindingData = this.contributedControlBindingData.pop();
            workItem.detachFieldChange(bindingData.fieldId, bindingData.callback);
        }
    }

    public bind(workItem: WITOM.WorkItem, isDisabledView?: boolean) {
        PerfScenarioManager.addSplitTiming(CIConstants.PerformanceEvents.WORKITEMSVIEW_BIND, true);
        this.workItem = workItem;
        this.isDisabledView = isDisabledView;
        let startTime: number;
        const controlBindLogging: IDictionaryStringTo<string> = {};
        const logControlBindDuration = !FeatureAvailabilityService.isFeatureEnabled(FeatureAvailabilityFlags.DisableLogControlBindDuration);
        for (const control of this.controls) {
            try {
                startTime = Date.now();
                timeStamp(`${control.getControlType()}.Bind`, StampEvent.Enter);
                control.bind(workItem, isDisabledView);
                const duration = Date.now() - startTime;
                const controlId = control.getControlId();
                // only log if the control takes > 25ms to bind to avoid flooding the event
                if (logControlBindDuration
                    && controlId
                    && duration > 10) {
                    controlBindLogging[controlId] = `${control.getControlType()}:${duration}`;
                }
                timeStamp(`${control.getControlType()}.Bind`, StampEvent.Leave);
            } catch (error) {
                // Catch any error on binding and log it to CI. We dont want to break other controls binding.
                const errorMsg = VSS.getErrorMessage(error);
                const msg = `Error binding control associated with field ${control._fieldName}. More details: ${errorMsg}`;
                if (window.console && window.console.warn) {
                    window.console.warn(msg);
                }
                VSSError.publishErrorToTelemetry({
                    name: "CouldNotBindControl",
                    message: msg
                });
            }
        }

        if (Object.keys(controlBindLogging).length > 0) {
            PerfScenarioManager.addData({
                slowControls: controlBindLogging
            });
        }

        this.bindControlContributions(workItem);

        this._registerFormChangeHandlers();

        PerfScenarioManager.addSplitTiming(CIConstants.PerformanceEvents.WORKITEMSVIEW_BIND, false);

        this._contributionManager.bind(workItem);

        // make the element focusable
        const form = this.form;
        $(this._element).attr("tabindex", -1);

        const isDeleted = workItem.isDeleted();
        if (!isDeleted) {
            $(this._element).keydown((keyEventObject: JQueryKeyEventObject) => {
                // Handle Mod+S event to trigger work item save
                if (Utils_UI.KeyUtils.isExclusivelyCommandOrMetaKeyBasedOnPlatform(keyEventObject) && (String.fromCharCode(keyEventObject.keyCode).toLowerCase() === "s")) {
                    if (workItem.isDirty() && !workItem.isSaving()) {
                        workItem.beginSave(null, function () {
                            // In the error case, adds data to tell the info bar to add role=alert to the element
                            // So that the screenreader will read the error message
                            form.addAlertToInfobarError();
                        }, "ToolbarSave");
                    }
                    return false;
                }

                // Handle ENTER event to trigger work item save and close
                if (Utils_UI.KeyUtils.isExclusivelyCommandOrMetaKeyBasedOnPlatform(keyEventObject) && keyEventObject.keyCode === Utils_UI.KeyCode.ENTER) {
                    if (this._toolbar) {
                        this._toolbar.executeMenuItem(WorkItemToolbar.SAVE_AND_CLOSE_WORK_ITEM);
                    }
                    return false;
                }
            });
        }

        this._registerPageFieldHandlers();
        this._registerGroupFieldHandlers();

        if (!isDeleted) {
            if (!this._copyWorkItemLinkControl) {
                const container = $(".work-item-form-headerContent .copy-workitem-title-container", this._element);
                this._copyWorkItemLinkControl = <CopyWorkItemLinkControl>Controls.Enhancement.getInstance(CopyWorkItemLinkControl, container);
            }
            this._copyWorkItemLinkControl.bind(workItem);
        }

        const dialogOptions: IWorkItemFormDialogOptions = this.form.getDialogOptions();
        this._shortcutGroup = new WorkItemFormShortcutGroup({
            workItemFormView: this,
            copyControl: this._copyWorkItemLinkControl,
            tabsControl: this._renderer.getTabsControl(),
            dialogOptions: dialogOptions ? {
                maximizeToggle: dialogOptions.toggleFullScreen
            } : null
        });

        if (!this._discussionAdornmentControl) {
            const container = $(".work-item-form-headerContent .discussion-adornment-control", this._element);
            this._discussionAdornmentControl = <DiscussionAdornmentControl>Controls.Enhancement.getInstance(DiscussionAdornmentControl, container);

            this._discussionAdornmentControl.onClick(() => {
                this.navigateToAndFocusOnDiscussion();
            });
        }
        this._discussionAdornmentControl.bind(workItem);

        // Delay triggering onRender method to fix formgrid layout after applying empty field rule,
        // collapsing groups and adjusting dialog height
        Utils_Core.delay(this, 0, () => {
            eventSvc.fire(FormEvents.FormEvents.LayoutResizedEvent(this.getId()));
        });

        if (this._dropTargetIsCreated) {
            this._dropTarget.updateWorkItem(workItem);
        }
    }

    private isFieldValid(field: WITOM.Field) {
        return field.isValid();
    }

    // Only call this on the new form
    private _registerPageFieldHandlers() {
        while (this._unregisteredTabs.length > 0) {
            const tab = this._unregisteredTabs.pop();
            this.getPageFields(this.workItem, tab.page).then((fields) => {
                if (this.workItem) {
                    const handler = new FormFieldEventHandler(this.workItem,
                        this.isFieldValid.bind(this),
                        tab.setIsValid.bind(tab), fields);
                    this._formFieldEventHandlers.push(handler);
                }
            }, (error) => { });
            this._registeredTabs.push(tab);
        }
    }

    private getPageFields(workItem: WITOM.WorkItem, model: FormModels.IPage): Promise<{ [refName: string]: WITOM.Field }> {
        const groupPromises: Promise<{ [refName: string]: WITOM.Field }>[] = [];
        for (const section of model.sections) {
            groupPromises.push(...section.groups.map((g) => this.getGroupFields(workItem, g)));
        }
        return Promise.all(groupPromises).then((groupFieldsArr): { [refName: string]: WITOM.Field } => {
            let fields: { [refName: string]: WITOM.Field } = {};
            for (const groupFields of groupFieldsArr) {
                fields = { ...fields, ...groupFields };
            }
            return fields;
        });
    }

    // Only call this on the new form
    private _registerGroupFieldHandlers() {
        while (this._unregisteredGroups.length > 0 && this.workItem) {
            const group = this._unregisteredGroups.pop();
            this.getGroupFields(this.workItem, group.model).then((fields) => {
                if (this.workItem) {
                    const errorHandler = new FormFieldEventHandler(this.workItem,
                        this.isFieldValid.bind(this),
                        group.setIsValid.bind(group),
                        fields);
                    this._formFieldEventHandlers.push(errorHandler);
                }
            }, (error) => { });

            if (this._layoutModel.showEmptyReadOnlyFields !== true) {
                const { fields: controlFields, hasPermanentControls } = this.getGroupVisibilityCriteria(this.workItem, group.model);
                const visibilityHandler = new FormFieldEventHandler(this.workItem,
                    // is hidden if not readonly or has nonempty value
                    (field: WITOM.Field) => field.isReadOnly() && WITOM.Field.isEmpty(field.getValue()),
                    (allHidden) => group.setIsHidden(!hasPermanentControls && allHidden),
                    controlFields
                );

                this._formFieldEventHandlers.push(visibilityHandler);
            }

            this._registeredGroups.push(group);
        }
    }

    private getGroupFields(workItem: WITOM.WorkItem, model: FormModels.IGroup): Promise<{ [refName: string]: WITOM.Field }> {
        const fields: { [refName: string]: WITOM.Field } = {};
        for (const control of model.controls.filter(c => !c.isContribution)) {
            const field = workItem.getField(control.id);
            if (field) {
                fields[field.fieldDefinition.referenceName] = field;
            }
        }

        return Promise.all(
            model.controls.filter(c => c.isContribution)
                .map(c => hasSingleField(c.contribution, key => this.workItemType.getFieldDefinition(key)))
        ).then((contributionFields): { [refName: string]: WITOM.Field } => {
            for (const field of contributionFields.filter(f => f)) {
                fields[field.referenceName] = workItem.getField(field.referenceName);
            }
            return fields;
        });
    }

    private getGroupVisibilityCriteria(workItem: WITOM.WorkItem, model: FormModels.IGroup) {
        const fields: { [refName: string]: WITOM.Field } = {};
        // Controls that do not have visiblity conditions are permanently visible.
        const hasPermanentControls: boolean = model.isContribution || model.controls.filter(c =>
            c.visible && c.isContribution
            || (
                c.controlType !== WellKnownControlNames.FieldControl
                && c.controlType !== WellKnownControlNames.HtmlControl
                && c.controlType !== WellKnownControlNames.DateControl
            )).length > 0;
        for (const control of model.controls.filter(c => !c.isContribution && c.visible)) {
            const field = workItem.getField(control.id);
            if (field) {
                fields[field.fieldDefinition.referenceName] = field;
            }
        }
        return { fields, hasPermanentControls };
    }

    public unbind(isDisposing?: boolean) {
        if (this.workItem) {
            $.each(this.controls, (i: number, control: WorkItemControl) => {
                control.unbind(isDisposing);
            });

            this._unbindControlContributions(this.workItem);

            this._detatchFieldEventHandlers();

            this.workItem = null;
        }

        this._detachFormChangeHandlers();

        $(this._element).unbind("keydown");
        if (this._copyWorkItemLinkControl) {
            this._copyWorkItemLinkControl.unbind();
        }
        if (this._discussionAdornmentControl) {
            this._discussionAdornmentControl.unbind();
        }

        this.restoreInPlaceMaximizedGroups();
        this._contributionManager.unbind();
    }

    private _detatchFieldEventHandlers() {
        while (this._formFieldEventHandlers.length > 0) {
            const handler = this._formFieldEventHandlers.pop();
            handler.detachFields();
            this._unregisteredTabs.push(...this._registeredTabs);
            this._registeredTabs.length = 0;
            this._unregisteredGroups.push(...this._registeredGroups);
            this._registeredGroups.length = 0;
        }
    }

    public navigateToAndFocusOnDiscussion() {
        const tabsControl = this._renderer && this._renderer.getTabsControl();
        const tabs = tabsControl && tabsControl.getTabs();

        if (tabs && tabs.length > 0) {
            // Details Tab is always first
            const tab: FormTabs.WorkItemFormTab = tabs[0];

            if (tab) {
                // restore maximized control before switching tab
                this.restoreMaximizedControl();
                this.restoreInPlaceMaximizedGroups();

                // set the active tab to where the history control lives
                tabsControl.setActiveTab(tab);

                const discussionControl = Utils_Array.first(this.controls, (c) => c._fieldName === WITConstants.CoreFieldRefNames.History);
                if (discussionControl) {
                    // Find the parent group of discussion control
                    const controlGroup = $(discussionControl._container).parents(".grid-group");
                    if (controlGroup.length === 1) {
                        const discussionGroupControl = <Panels.CollapsiblePanel>Controls.Enhancement.getInstance(Panels.CollapsiblePanel, controlGroup);
                        // Expand the group on the discussion control
                        discussionGroupControl.expand();
                        discussionGroupControl.focus();
                    }

                    if (this.workItem.isReadOnly()) {
                        const discussionHeader = controlGroup.find("." + FormGroup.COLLAPSABLE_HEADER_CLASS);
                        if (discussionHeader.length > 0) {
                            discussionHeader.focus();
                        }
                    }
                    else {
                        if ($(discussionControl).focus instanceof Function) {
                            $(discussionControl).focus();
                        }
                    }

                    const offsetParent = controlGroup.offsetParent();
                    const offsetTop = controlGroup.position().top;
                    offsetParent.scrollTop(offsetParent.scrollTop() + offsetTop);
                }
            }
        }
    }

    public assignItemToCurrentIdentity(): void {
        // Assign current user to a non-deleted workitem, if the workitem and field control are not readonly
        const assignedToControl = Utils_Array.first(this.controls || [], c => c._fieldName === WITConstants.CoreFieldRefNames.AssignedTo);
        if (this.workItem && (!assignedToControl || !assignedToControl.isReadOnly())) {
            this.workItem.setFieldValue(WITConstants.CoreFieldRefNames.AssignedTo, WITIdentityHelpers.getUniqueIdentityNameForContextIdentity(this._tfsContext.currentIdentity.uniqueName, this._tfsContext.currentIdentity.displayName));
        }
    }

    public getWorkItem(): WITOM.WorkItem {
        return this.workItem;
    }

    public suppressFieldUpdates(suppress: boolean = true) {
        $.each(this.controls, (i: number, control: WorkItemControl) => {
            control.suppressInvalidate = suppress;
        });
    }

    private _registerFormChangeHandlers() {
        this._registerFormGroupExpandStateChangedHandler();
        this._registerLayoutResizedHandler();
        this._registerControlResizedHandler();
        this._registerControlVisibilityChangedHandler();
    }

    private _detachFormChangeHandlers() {
        this._detachFormGroupExpandStateChangedHandler();
        this._detachLayoutResizedHandler();
        this._detachControlResizedHandler();
        this._detachControlVisibilityChangedHandler();
    }

    public getToolbar(toolbarOptions: any): WorkItemToolbar {
        if (!this._toolbar) {
            const toolBarContainer = this.getElement().find(".work-item-form-toolbar-container");
            this._toolbar = <WorkItemToolbar>Controls.BaseControl.createIn(WorkItemToolbar, toolBarContainer, $.extend({ isResponsive: true }, toolbarOptions));
        }
        return this._toolbar;
    }

    // Fire events to extensions that are hosted on the form (page extensions)
    public fireEventToControlContributions(notificationAction: (notificationService: ExtensionContracts.IWorkItemNotificationListener, objectId: string) => void): void {
        this._contributionManager.getPromises().forEach((contributionHost) => {
            contributionHost.then((value) => {
                if (value.source) {
                    notificationAction(value.source, value.objectId);
                }
            });
        });
    }

    public restoreInPlaceMaximizedGroups(): void {
        // Restore any in-place maximized groups
        const formGroups = $(".grid-group-container", this._element);
        formGroups.each((i, group) => {
            const formGroup = <FormGroup>FormGroup.getInstance(FormGroup, $(group));

            if (formGroup) {
                formGroup.restore();
            }
        });
    }

    public restoreMaximizedControl(): void {
        $.each(
            this.controls,
            (index: number, control: WorkItemControl) => {
                if (control instanceof MaximizableWorkItemControl) {
                    const maximizableControl: MaximizableWorkItemControl = control;
                    if (maximizableControl && maximizableControl.isMaximized()) {
                        maximizableControl.restore();
                    }
                }
            });
    }

    /* listener for group expand collpase events */
    private _registerFormGroupExpandStateChangedHandler(): void {
        this._groupExpandStateChangedHandler = (sender: FormGroup, actionArgs: FormEvents.IGroupExpandStateChangedArgs) => {

            // resize grids
            // this is mainly plumbed so the discussion control can position itself correctly.
            this._resizeGrids();

            if (actionArgs.group) {
                Service.getService(WorkItemFormUserLayoutSettingsService)
                    .setGroupExpansionState(this.workItemType, actionArgs.group.id, !actionArgs.isExpanded, FormLayoutType.Desktop)
                    .then(null, () => { /* Ignore errors */ });
            }

            // notify controls in this group
            if (actionArgs.group && actionArgs.groupElement) {
                const controls = actionArgs.groupElement.find(".workitemcontrol");

                $.each(controls, (i, control) => {
                    const workItemControl: WorkItemControl = $(control).data("witControl");

                    if (workItemControl) {
                        workItemControl.onResize();
                    }
                });
            }
        };

        eventSvc.attachEvent(FormEvents.FormEvents.GroupExpandStateChangedEvent(), this._groupExpandStateChangedHandler);
    }

    private _detachFormGroupExpandStateChangedHandler(): void {
        eventSvc.detachEvent(FormEvents.FormEvents.GroupExpandStateChangedEvent(), this._groupExpandStateChangedHandler);
    }

    /* listener for layout resize events */
    private _registerLayoutResizedHandler(): void {
        this._layoutResizeHandler = () => {

            if (this._renderer) {
                this._renderer.getTabsControl().resize();
            }
            // resize grid so they can change shape if needed.
            this._resizeGrids();

            // notify controls so they can change shape if needed.
            this._resizeControls();

        };

        this._windowResizeEventHandler = () => eventSvc.fire(FormEvents.FormEvents.LayoutResizedEvent(this.getId()));

        eventSvc.attachEvent(FormEvents.FormEvents.LayoutResizedEvent(this.getId()), this._layoutResizeHandler);
        $(window).resize(this._windowResizeEventHandler);
    }

    private _detachLayoutResizedHandler(): void {
        $(window).off("resize", this._windowResizeEventHandler);
        eventSvc.detachEvent(FormEvents.FormEvents.LayoutResizedEvent(this.getId()), this._layoutResizeHandler);
    }

    /* listener for control visibility changed events */
    private _registerControlVisibilityChangedHandler(): void {
        this._controlVisibilityHandler = () => {

            // resize grids so they can manage discussions control.
            this._resizeGrids();
        };

        eventSvc.attachEvent(FormEvents.FormEvents.ControlVisibilityChangedEvent(), this._controlVisibilityHandler);
    }

    private _detachControlVisibilityChangedHandler(): void {
        eventSvc.detachEvent(FormEvents.FormEvents.ControlVisibilityChangedEvent(), this._controlVisibilityHandler);
    }

    /* listener for control resize events */
    private _registerControlResizedHandler(): void {
        this._controlResizeHandler = () => {

            // resize grids so they can manage discussions control.
            this._resizeGrids();
        };

        eventSvc.attachEvent(FormEvents.FormEvents.ControlResizedEvent(), this._controlResizeHandler);
    }

    private _detachControlResizedHandler(): void {
        eventSvc.detachEvent(FormEvents.FormEvents.ControlResizedEvent(), this._controlResizeHandler);
    }

    private _resizeGrids(): void {
        $.each(this._pageGrids, (i, grid) => {
            grid.adjustGridSections();
        });
    }

    private _resizeControls(): void {
        $.each(this.controls, (i, control) => {
            control.onResize();
        });

        if (this._toolbar) {
            this._toolbar.resize();
        }
    }

    private _renderLayoutContent(layout: JQuery, initialPass: boolean, callback?: () => void) {
        PerfScenarioManager.addSplitTiming(
            CIConstants.PerformanceEvents.WORKITEMSVIEW_RENDERLAYOUT_CREATELABELANDTABS, true);
        this._createLabels(layout);
        PerfScenarioManager.addSplitTiming(
            CIConstants.PerformanceEvents.WORKITEMSVIEW_RENDERLAYOUT_CREATELABELANDTABS, false);

        PerfScenarioManager.addSplitTiming(
            CIConstants.PerformanceEvents.WORKITEMSVIEW_RENDERLAYOUT_CREATECONTROLS, true);

        this._cacheLayoutNodes(layout);

        const render = () => {
            this._beginCreateControls(layout, () => {
                PerfScenarioManager.addSplitTiming(
                    CIConstants.PerformanceEvents.WORKITEMSVIEW_RENDERLAYOUT_CREATECONTROLS, false);

                PerfScenarioManager.addSplitTiming(
                    CIConstants.PerformanceEvents.WORKITEMSVIEW_RENDERLAYOUT_TABIFYLAYOUT, true);
                this._tabifyLayout(layout, initialPass);
                PerfScenarioManager.addSplitTiming(
                    CIConstants.PerformanceEvents.WORKITEMSVIEW_RENDERLAYOUT_TABIFYLAYOUT, false);

                if (callback) {
                    callback();
                }
            });

            if (useNewDragDrop()) {
                if (!this._dropTargetIsCreated && !this.workItem.isReadOnly()) {
                    this._createDropTarget();
                    this._dropTargetIsCreated = true;
                }
            }
        };

        render();
    }

    private _cacheLayoutNodes(layout: JQuery): void {

        const groups = layout.find(".grid-group-container");

        $.each(groups, (i, group) => {
            const layoutGroup: FormGroup = <FormGroup>Controls.Enhancement.getInstance(FormGroup, $(group));

            if (layoutGroup) {
                this._groups.push(layoutGroup);
            }
        });

        const grids = layout.find(".form-grid");

        $.each(grids, (i, grid) => {
            const layoutGrid: FormGrids.FormGrid = <FormGrids.FormGrid>Controls.Enhancement.getInstance(FormGrids.FormGrid, $(grid));

            if (layoutGrid) {
                this._pageGrids.push(layoutGrid);
            }
        });
    }

    private _createLabels(layout: JQuery): void {
        const that = this;

        layout.find(".workitemlabel").each(function () {
            const $labelHost = $(this);
            const labelOptions: IWorkItemControlOptions = $labelHost.data("wit-options") || {};
            const workItemlabel = new WorkItemLabel($labelHost, labelOptions, that.workItemType);
            labelOptions.workItemLabel = workItemlabel;
        });

        layout.find(".headerlabel").each(function () {
            const $labelHost = $(this);
            const options: IWorkItemControlOptions = $labelHost.data("wit-options");
            if (options) {
                const fieldDef: WITOM.FieldDefinition = that.workItemType.getFieldDefinition(options.fieldName);
                if (fieldDef) {
                    const tooltip = $("<span/>");
                    if (fieldDef.helpText) {
                        tooltip.append($("<span/>").text(fieldDef.helpText))
                            .append($("<br>"));
                    }
                    tooltip.append($("<span/>").text(Utils_String.format(WorkItemTrackingResources.WorkItemFieldLabelTitleFormat, fieldDef.name)));
                    RichContentTooltip.add(tooltip, $labelHost);
                }
            }

        });

        const addTooltip = (text: string | JQuery, target: JQuery) =>
            RichContentTooltip.add(text, target);
        const getField = (key: string) => this.workItemType.getFieldDefinition(key);
        layout.find(".control-extension-container").each(function () {
            addControlContributionTooltip($(this), getField, addTooltip);
        });
    }

    private _beginCreateControls(layout: JQuery, callback?: () => void): void {
        const $controls: JQuery = layout.find(".workitemcontrol");
        let numControls: number = $controls.length;

        $controls.each((index, control) => {
            const workItemType = this.workItemType;
            const extensions = [this.extension];
            const $controlHost = $(control);
            const controlOptions: IWorkItemControlOptions = $controlHost.data("wit-options") || {};

            if (!$controlHost.hasClass("initialized")) {
                $controlHost.addClass("initialized");

                const handleError = (errorText: string) => {
                    $controlHost.text(Utils_String.format(errorText, controlOptions.controlType));
                };

                if (controlOptions.controlType === WITConstants.WellKnownControlNames.WorkItemDiscussionControl) {
                    timeStamp("_beginCreateControls.creatediscussion", StampEvent.Enter);
                }

                beginGetWorkItemControl(controlOptions.controlType, result => {
                    if (controlOptions.controlType === WITConstants.WellKnownControlNames.WorkItemDiscussionControl) {
                        timeStamp("_beginCreateControls.creatediscussion", StampEvent.Leave);
                    }

                    if (result.controlType) {
                        Debug.assert(result.renderType === RenderType.JQuery, "Received non-JQuery control for JQuery based form");

                        try {
                            const controlType = <IWorkItemControlType>result.controlType;
                            const newControl = new controlType($controlHost, controlOptions, workItemType, extensions);

                            // Associating work item control with control host element
                            $controlHost.data("wit-control", newControl);
                            this.controls.push(newControl);
                        } catch (ex) {
                            logError("The following WorkItemControl failed to load: " + controlOptions.controlType);
                            handleError(WorkItemTrackingResources.ErrorCannotCreateWorkItemControl);
                        }
                    } else {
                        handleError(WorkItemTrackingResources.ErrorCannotCreateLegacyExtension);
                    }

                    numControls--;
                    if (numControls === 0) {
                        if (callback) {
                            callback();
                        }
                    }
                });
            }
        });
    }

    private _createDropTarget() {
        const dropTargetComponent = React.createElement(DropTargetComponent, {
            workItem: this.workItem,
            form: this.form
        });
        this._dropTargetContainer = this.form.createDropTargetContainer();
        this._dropTarget = ReactDOM.render(dropTargetComponent, this._dropTargetContainer);
    }

    private _tabifyLayout(layout: JQuery, initialPass: boolean) {
        if (!layout.tabified) {
            const tabs = $(".work-item-form-tab", layout);
            const grids: FormGrids.FormGrid[] = [];

            $.each(tabs, (i: number, tab: JQuery) => {
                const currentTab: JQuery = $(tab);

                const workItemFormTab: FormTabs.WorkItemFormTab = <FormTabs.WorkItemFormTab>Controls.Enhancement.getInstance(FormTabs.WorkItemFormTab, currentTab);
                const grid: FormGrids.FormGrid = workItemFormTab.formGrid;
                grids.push(grid);

                const renderTabContent = () => {
                    // we lazily draw the dom elements of a tab when the tab is clicked on.
                    if (!workItemFormTab.isBodyDrawn()) {
                        const { groups } = workItemFormTab.renderer.fillPage(workItemFormTab.page, grid);
                        this._unregisteredGroups.push(...groups);
                        // The workItem is set after the first page is rendered
                        if (this.workItem) {
                            this._registerGroupFieldHandlers();
                        }

                        this._renderLayoutContent(grid.getElement(), false, () => {
                            if (this.workItem) {
                                // we created new controls for this tab, we need to bind to the current workitem
                                for (const control of this.controls) {
                                    control.bind(this.workItem, this.isDisabledView);
                                }

                                this._applyUserLayoutSettings(grid.getElement());
                            }
                        });
                    }
                };

                workItemFormTab.setTabContentRenderer(renderTabContent);
                this._unregisteredTabs.push(workItemFormTab);
            });

            layout.tabified = true;
        }
    }
}
