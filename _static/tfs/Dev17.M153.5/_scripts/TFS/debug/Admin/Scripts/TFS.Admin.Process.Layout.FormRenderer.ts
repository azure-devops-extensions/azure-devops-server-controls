import AdminProcessContracts = require("Admin/Scripts/Contracts/TFS.Admin.Process.Contracts");
import AdminProcessCommon = require("Admin/Scripts/TFS.Admin.Process.Common");
import AdminResources = require("Admin/Scripts/Resources/TFS.Resources.Admin");
import Contrib_Services = require("VSS/Contributions/Services");
import Controls = require("VSS/Controls");
import EventsServices = require("VSS/Events/Services");
import Menus = require("VSS/Controls/Menus");
import ProcessContracts = require("TFS/WorkItemTracking/ProcessContracts");
import Service = require("VSS/Service");
import Utils_UI = require("VSS/Utils/UI");
import Utils_String = require("VSS/Utils/String");
import Utils_Array = require("VSS/Utils/Array");
import VSS = require("VSS/VSS");
import WITConstants = require("Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants");
import { RichContentTooltip } from "VSS/Controls/PopupContent";
import { InputDescriptor } from "VSS/Common/Contracts/FormInput";
import { ExtendedInputDescriptor, FormInputViewModel, InputsViewModel } from "VSS/Controls/FormInput";

class AdminLayoutConstants {
    public static nodeInfoProperty: string = "nodeInfo";
    public static groupInfoProperty: string = "groupInfo";
    public static parentGroupLookup: string = ".grid-group";
    public static parentPageLookup: string = ".process-layout-grid";
    public static parentSectionLookup: string = ".section";
    public static controlLookup: string = ".process-layout-control";
}


export class ProcessLayoutFormRenderer {
    protected _contextMenu: Menus.PopupMenu;
    private _layout: ProcessContracts.FormLayout;
    private _readOnly: boolean;
    private _removeCallback: (group: ProcessContracts.Group, control: ProcessContracts.Control, fieldIdsToRemoveFromWorkItemType: string[]) => void;
    private _setControlVisibleCallback: (group: ProcessContracts.Group, control: ProcessContracts.Control, visible: boolean) => void;
    private _setGroupVisibleCallback: (page: ProcessContracts.Page, section: ProcessContracts.Section, group: ProcessContracts.Group, visible: boolean) => void;
    private _editGroupCallback: (page: ProcessContracts.Page, section: ProcessContracts.Section, group: ProcessContracts.Group) => void;
    private _removeGroupCallback: (page: ProcessContracts.Page, section: ProcessContracts.Section, group: ProcessContracts.Group) => void;
    private _moveGroupCallback: (page: ProcessContracts.Page, group: ProcessContracts.Group, targetSectionId: string, sourceSectionId: string) => void;
    private _moveControlCallback: (control: ProcessContracts.Control, targetGroupId: string, sourceGroupId: string) => void;
    private _addFieldCallback: (group: ProcessContracts.Group, section?: ProcessContracts.Section) => void;
    private _addControlExtensionCallback: (group: ProcessContracts.Group) => void;
    private _editControlMenuItemSpecsCallback: (section: ProcessContracts.Section, group: ProcessContracts.Group, control: ProcessContracts.Control) => Menus.IMenuItemSpec[];
    private _workItemType: ProcessContracts.ProcessWorkItemType;
    private _process: AdminProcessCommon.ProcessDescriptorViewModel;
    private _sortableElements: JQuery[];
    private _isSystemProcess: boolean;
    private _alsoRemoveFromWorkItemType: boolean;
    private _orderingDisabled: boolean;
    private _fieldsMap: IDictionaryStringTo<AdminProcessContracts.ProcessField>;
    private _contributionIdToContributionMap: IDictionaryStringTo<Contribution>;
    private _contributionInputByIds: IDictionaryStringTo<IDictionaryStringTo<InputDescriptor>>;
    private _contributions: Contribution[];
    private _controlsByLowerCasedId: IDictionaryStringTo<ProcessContracts.Control[]>;
    private _rendered: boolean;
    private _container: JQuery;

    constructor(layout: ProcessContracts.FormLayout,
        readOnly: boolean,
        fieldsMap: IDictionaryStringTo<AdminProcessContracts.ProcessField>,
        contributions: Contribution[],
        removeCallback?: (group: ProcessContracts.Group, control: ProcessContracts.Control, fieldIdsToRemoveFromWorkItemType: string[]) => void,
        setControlVisibleCallback?: (group: ProcessContracts.Group, control: ProcessContracts.Control, visible: boolean) => void,
        setGroupVisibleCallback?: (page: ProcessContracts.Page, section: ProcessContracts.Section, group: ProcessContracts.Group, visible: boolean) => void,
        editGroupCallback?: (page: ProcessContracts.Page, section: ProcessContracts.Section, group: ProcessContracts.Group) => void,
        removeGroupCallback?: (page: ProcessContracts.Page, section: ProcessContracts.Section, group: ProcessContracts.Group) => void,
        moveGroupCallback?: (page: ProcessContracts.Page, group: ProcessContracts.Group, targetSectionId: string, sourceSectionId: string) => void,
        moveControlCallback?: (control: ProcessContracts.Control, targetGroupId: string, sourceGroupId: string) => void,
        addFieldCallback?: (group: ProcessContracts.Group, section?: ProcessContracts.Section) => void,
        addControlExtensionCallback?: (group: ProcessContracts.Group) => void,
        editControlMenuItemSpecsCallback?: (section: ProcessContracts.Section, group: ProcessContracts.Group, control: ProcessContracts.Control) => Menus.IMenuItemSpec[],
        isSystemProcess?: boolean,
        alsoRemoveFromWorkItemType = false) {

        this._layout = layout;
        this._readOnly = readOnly;
        this._fieldsMap = fieldsMap ? fieldsMap : {};
        this._removeCallback = removeCallback;
        this._setControlVisibleCallback = setControlVisibleCallback;
        this._setGroupVisibleCallback = setGroupVisibleCallback;
        this._editGroupCallback = editGroupCallback;
        this._removeGroupCallback = removeGroupCallback;
        this._moveControlCallback = moveControlCallback;
        this._moveGroupCallback = moveGroupCallback;
        this._addFieldCallback = addFieldCallback;
        this._addControlExtensionCallback = addControlExtensionCallback;
        this._editControlMenuItemSpecsCallback = editControlMenuItemSpecsCallback;
        this._isSystemProcess = isSystemProcess;
        this._alsoRemoveFromWorkItemType = alsoRemoveFromWorkItemType;
        this._orderingDisabled = false;

        // If we don't have contributions, listen for the event for them to be loaded and then update the labels
        if (!contributions) {
            EventsServices.getService().attachEvent(
                AdminProcessCommon.ProcessLayoutEvents.CONTRIBUTIONS_LOADED,
                (sender, args: AdminProcessCommon.ProcessLayoutEvents.IContributionLoadedArgs) => {
                    this._populateContributionMaps(args.contributions);
                    this._contributionInputByIds = args.contributionInputByIds;
                    if (this._rendered) {
                        this._updateControlExtensionLabels();
                        this._updateControlExtensionErrors();
                    }
                });
        }
        else {
            this._populateContributionMaps(contributions);
            this._contributionInputByIds = AdminProcessCommon.ProcessContributionHelpers.createContributionInputByIdsMap(contributions);
        }
    }

    public renderLayout(page: ProcessContracts.Page, focusedGroupId: string = null, focusedControlId: string = null): JQuery {
        this._container = $("<div />");

        if (page.isContribution && page.contribution.contributionId) {
            return this._getPageContributionLayout(page);
        }
        else if (AdminProcessCommon.ProcessLayoutHelpers.isEmptyPage(page)) {
            return this._getEmptyPageLayout();
        }
        else {
            if (page.pageType == ProcessContracts.PageType.Custom && page.visible) {
                this._getGrid(page, this._container, (formGrid: any) => {
                    this._fillPage(page, formGrid);
                    this._makeGridSortable(page, formGrid);

                    this._rendered = true;

                    if (focusedControlId && focusedGroupId) {
                        // set focus to control
                        // We use div[id=xyz] format in the jquery selector because the id can have a dot inside it for a field control/group and jquery id selector doesnt work if the id has a dot in it
                        this._container.find(`div[id="${focusedGroupId}"]`).parent().find(".group-controls").find(`div[id="${focusedControlId}"]`).focus();
                    }
                    else if (focusedGroupId) {
                        // set focus to group
                        this._container.find(`div[id="${focusedGroupId}"]`).focus();
                    }
                });
            }
        }

        return this._container;
    }

    private _getPageContributionLayout(page: ProcessContracts.Page): JQuery {
        let contributionId = page.contribution ? page.contribution.contributionId : "";
        if (contributionId) {
            let pageContributionContainer = $('<div class="page-contribution-container">');
            Service.getService(Contrib_Services.ExtensionService).getContribution(contributionId).then((pageContribution: Contribution) => {
                let iconUri = AdminProcessCommon.ProcessContributionHelpers.getContributionIconUri(pageContribution);
                let contributionLabel = AdminProcessCommon.ProcessContributionHelpers.getContributionLabel(pageContribution);
                let publisherName = AdminProcessCommon.ProcessContributionHelpers.getContributionPublisherName(pageContribution);
                let contributionDesc = pageContribution.description || "";

                $("<img>").appendTo(pageContributionContainer).attr("src", iconUri);
                $("<div>").addClass("page-contribution-label").appendTo(pageContributionContainer).text(contributionLabel);
                $("<div>").addClass("page-contribution-publisher").appendTo(pageContributionContainer).text(publisherName);
                $("<div>").addClass("page-contribution-description").appendTo(pageContributionContainer).text(contributionDesc);
            });
            return pageContributionContainer;
        }
        else {
            return this._getEmptyPageLayout();
        }
    }

    private _getEmptyPageLayout(): JQuery {
        let emptyPageContainer = $('<div class="empty-page-container">');
        $('<div class="empty-page-text">').append($('<label>').text(AdminResources.ProcessEmptyPageText))
            .appendTo(emptyPageContainer);
        //anchor without href will cause display in low contrast in high constrast mode
        $('<div class="empty-page-href">').html(Utils_String.format(AdminResources.ProcessAddFieldEmptyPageLinkText, `<a role="button" href="#">${AdminResources.AddFieldsText}</a>`)).appendTo(emptyPageContainer);

        return emptyPageContainer;
    }

    private _populateContributionMaps(contributions: Contribution[]) {
        this._contributions = contributions;
        this._contributionIdToContributionMap = Utils_Array.toDictionary<Contribution, Contribution>(contributions, (item: Contribution) => item.id);
    }

    private _updateControlExtensionLabels() {
        const controlLabels = this._container.find(".process-layout-no-text");
        if (controlLabels && controlLabels.length > 0) {
            for (let i = 0; i < controlLabels.length; i++) {
                const controlLabel = $(controlLabels[i]);
                const controlContainer = controlLabel.closest("div.process-layout-control");
                const control = <ProcessContracts.Control>controlContainer.data(AdminLayoutConstants.nodeInfoProperty);
                if (control && control.contribution) {
                    const contribution = this._contributionIdToContributionMap[control.contribution.contributionId];
                    controlLabel.text(AdminProcessCommon.ProcessContributionHelpers.getContributionLabel(contribution));
                }
            }
        }
    }

    private _updateControlExtensionErrors() {
        const controlErrorIcons = this._container.find(".control-contribution-error");
        if (controlErrorIcons && controlErrorIcons.length > 0) {
            for (let i = 0; i < controlErrorIcons.length; i++) {
                const controlErrorIcon = $(controlErrorIcons[i]);
                const controlContainer = controlErrorIcon.closest("div.process-layout-control");
                const control = <ProcessContracts.Control>controlContainer.data(AdminLayoutConstants.nodeInfoProperty);
                if (control && control.contribution) {
                    const contribution = this._contributionIdToContributionMap[control.contribution.contributionId];
                    const isContributionValid = this._validateContribution(control.contribution, contribution);
                    if (!isContributionValid) {
                        controlErrorIcon.show();
                        controlContainer.removeClass("sort-enabled").addClass("sort-disabled");
                        RichContentTooltip.add(AdminResources.AdminLayoutInvalidContributionTooltip, controlContainer);
                    } else {
                        controlErrorIcon.hide();
                        controlContainer.removeClass("sort-disabled").addClass("sort-enabled");
                    }
                }
            }
        }
    }

    private _makeGridSortable(page: ProcessContracts.Page, formGrid): void {
        var that = this;
        this._sortableElements = [];

        $.each(page.sections, (i: number, section: ProcessContracts.Section) => {
            var $section: JQuery = formGrid.getSection(section.id);
            if ($section && $section.length > 0) {
                $section.addClass("connected-section-groups");
                $section.find(".group-controls:not(.html-group-controls)").addClass("connected-section-controls");
                this._sortableElements.push($section);
            }
        });

        $(".connected-section-groups").sortable({
            placeholder: "process-layout-sortable-placeholder",
            tolerance: "pointer",
            cancel: ".grid-group.sort-disabled",
            items: ".grid-group",
            containment: ".process-layout-grid .section-container",
            revert: 300,
            helper: function (e, item) {
                var helper = (<any>item).clone();
                helper.width(300);
                if ((<any>item).height() > 200) {
                    // restrict the height of draggable as groups can get too large
                    helper.css("max-height", "200px");
                    helper.css("overflow", "auto");
                }
                return helper;
            },
            scroll: true,
            scrollSpeed: 10,
            // this will make groups under any section draggable to any section
            connectWith: ".connected-section-groups",
            update: function (event, ui) {
                let sourceSectionElement = this;
                let targetSectionElement = ui.item.parent()[0]
                if (sourceSectionElement === targetSectionElement) {
                    that._onGroupMove(ui.item, ui.sender, ui.item.parents(".section"), page);
                }

                that._showEmptySectionBehavior($(sourceSectionElement));
                that._showEmptySectionBehavior($(targetSectionElement));
            },
            start: function (event, ui) {
                $(ui.helper).addClass("process-layout-dragging");
            },
            stop: function (event, ui) {
                $(ui.helper).removeClass("process-layout-dragging");
            }
        }).disableSelection();

        // make controls sortable.
        // This will allow any controls to be draggable under any group in any section
        var connectedSectionControls = $(".connected-section-controls")

        connectedSectionControls.sortable(<JQueryUI.SortableOptions><any>{
            placeholder: {
                element: function (draggedItem: JQuery) {
                    var placeholder = $("<div class='process-layout-sortable-placeholder'></div>");
                    // add the control's data in placeholder so we can use it in update callback below
                    placeholder.data(AdminLayoutConstants.nodeInfoProperty, draggedItem.data(AdminLayoutConstants.nodeInfoProperty));
                    placeholder.data(AdminLayoutConstants.groupInfoProperty, draggedItem.data(AdminLayoutConstants.groupInfoProperty));
                    return placeholder[0];
                },
                update: function (container, placeholder) {
                    if (placeholder && placeholder.length > 0) {
                        // if the field control cant be dropped in the target group, show a error'ed out placeholder
                        var groupDropElement = container.element.parent();
                        if (!that._canDropControlToGroup(placeholder, groupDropElement)) {
                            placeholder.addClass("not-droppable");
                        }
                        else {
                            placeholder.removeClass("not-droppable");
                        }
                    }
                    return placeholder[0];
                }
            },
            tolerance: "pointer",
            cancel: ".process-layout-control.sort-disabled",
            items: ".process-layout-control:not(.process-layout-html-control)",
            containment: ".process-layout-grid .section-container",
            revert: 300,
            helper: function (e, item) {
                var helper = item.clone();
                helper.width(300);
                return helper;
            },
            scroll: true,
            scrollSpeed: 10,
            // this will make controls under any group draggable to any section
            connectWith: ".connected-section-controls",
            update: function (event, ui) {
                if (this === ui.item.parent()[0]) {
                    // this is a move from another group
                    if (ui.sender !== null) {
                        if (that._canDropControlToGroup(ui.item, ui.item.parents(".grid-group"))) {
                            // if a control with same field already exist in target group, dont move the control
                            that._onControlMove(ui.item, ui.sender.parents(".grid-group"), ui.item.parents(".grid-group"));

                            // update the group data for the control (change the control's groupId property as the target group Id)
                            ui.item.data(AdminLayoutConstants.groupInfoProperty, ui.item.parents(".grid-group").data(AdminLayoutConstants.nodeInfoProperty).id);
                        }
                    }
                    // this is a move from within the same group
                    else {
                        that._onControlMove(ui.item, null, ui.item.parents(".grid-group"));
                    }
                }
            },
            start: function (event, ui) {
                $(ui.helper).addClass("process-layout-dragging");
            },
            stop: function (event, ui) {
                if (!that._canDropControlToGroup(ui.item, ui.item.parents(".grid-group"))) {
                    // if a control with same field already exist in target group, disable sorting
                    $(this).sortable("cancel");
                }
                $(ui.helper).removeClass("process-layout-dragging");
            },
        }).disableSelection();

        this._sortableElements.push(connectedSectionControls);
    }

    private _canDropControlToGroup($control: JQuery, $group: JQuery): boolean {
        var movedControl: ProcessContracts.Control = $control.data(AdminLayoutConstants.nodeInfoProperty);
        var sourceGroupId: string = $control.data(AdminLayoutConstants.groupInfoProperty);
        var targetGroup: ProcessContracts.Group = $group.data(AdminLayoutConstants.nodeInfoProperty);

        if (sourceGroupId === targetGroup.id) {
            return true;
        }

        var targetGroupControls = targetGroup.controls.filter((c: ProcessContracts.Control) => {
            return c.id === movedControl.id;
        });

        return (targetGroupControls || []).length === 0;
    }

    public disableOrdering(): void {
        // disable drag drop
        $.each(this._sortableElements, (i, element) => {
            $(element).sortable("disable");
        });

        $(".sort-enabled").removeClass("sort-enabled");

        // disable move up/down context menu items
        this._orderingDisabled = true;
    }

    private _onGroupMove(item: JQuery, sourceSection: JQuery, targetSection: JQuery, page: ProcessContracts.Page): void {
        var group: ProcessContracts.Group = item.data(AdminLayoutConstants.nodeInfoProperty);

        if (AdminProcessCommon.ProcessLayoutHelpers.isSealedGroup(group) && !group.isContribution) {
            // Focus on the dragged html control after moved
            item.find(".process-layout-control").focus();
        }
        else {
            // Focus on the dragged group after moved
            item.find(".process-layout-group").focus();
        }

        var targetSectionId: string = targetSection.data(AdminLayoutConstants.nodeInfoProperty).id;
        var sourceSectionId: string = null;

        if (sourceSection !== null) {
            sourceSectionId = sourceSection.data(AdminLayoutConstants.nodeInfoProperty).id;
        }

        var movedGroup: ProcessContracts.Group = {
            id: group.id,
            label: group.label,
            controls: null,
            order: group.order,
            inherited: group.inherited,
            overridden: group.overridden,
            visible: group.visible,
            contribution: null,
            isContribution: false,
            height: null
        };

        var order = this._getGroupOrder(item, targetSection);
        if (order >= 0) {
            movedGroup.order = order;
            group.order = order;

            this._moveGroupCallback(page, movedGroup, targetSectionId, sourceSectionId);
        }
    }

    private _onControlMove(item: JQuery, sourceGroup: JQuery, targetGroup: JQuery): void {
        // Focus on the dragged control after moved
        item.focus();

        var control: ProcessContracts.Control = item.data(AdminLayoutConstants.nodeInfoProperty);

        var targetGroupId: string = targetGroup.data(AdminLayoutConstants.nodeInfoProperty).id;
        var sourceGroupId: string = null;

        if (sourceGroup !== null) {
            sourceGroupId = sourceGroup.data(AdminLayoutConstants.nodeInfoProperty).id;
        }

        var order = this._getControlOrder(item, targetGroup);

        if (order >= 0) {
            control.order = order;
            this._moveControlCallback(control, targetGroupId, sourceGroupId);
        }
    }

    private _onMoveControlUp(controlElement: JQuery): void {
        var groupElement: JQuery = this._getParentGroupElement(controlElement);
        var order: number = this._getControlOrder(controlElement, groupElement);

        if (order === 0) {
            return;
        }

        order = order - 1;
        var sibling: JQuery = $(groupElement.find(AdminLayoutConstants.controlLookup)[order]);
        controlElement.insertBefore(sibling);
        this._onControlMove(controlElement, null, groupElement);
    }

    private _onMoveControlDown(controlElement: JQuery): void {
        var groupElement: JQuery = this._getParentGroupElement(controlElement);
        var order: number = this._getControlOrder(controlElement, groupElement);
        var controlsCount: number = groupElement.find(AdminLayoutConstants.controlLookup).length;

        if (order === controlsCount - 1) {
            return;
        }

        order = order + 1;
        var sibling: JQuery = $(groupElement.find(AdminLayoutConstants.controlLookup)[order]);
        controlElement.insertAfter(sibling);
        this._onControlMove(controlElement, null, groupElement);
    }

    private _onMoveGroupUp(groupElement: JQuery): void {
        var sectionElement: JQuery = this._getParentSectionElement(groupElement);
        var order: number = this._getGroupOrder(groupElement, sectionElement);

        var pageElement: JQuery = this._getParentPageElement(sectionElement);
        var page: ProcessContracts.Page = this._getNodeData(pageElement);

        if (order === 0) {
            return;
        }

        order = order - 1;
        var sibling: JQuery = $(sectionElement.find(AdminLayoutConstants.parentGroupLookup)[order]);
        groupElement.insertBefore(sibling);
        this._onGroupMove(groupElement, null, sectionElement, page);
    }

    private _onMoveGroupDown(groupElement: JQuery): void {
        var sectionElement: JQuery = this._getParentSectionElement(groupElement);
        var order: number = this._getGroupOrder(groupElement, sectionElement);
        var groupsCount: number = groupElement.find(AdminLayoutConstants.parentGroupLookup).length;

        var pageElement: JQuery = this._getParentPageElement(sectionElement);
        var page: ProcessContracts.Page = this._getNodeData(pageElement);

        if (order === groupsCount - 1) {
            return;
        }

        order = order + 1;
        var sibling = $(sectionElement.find(AdminLayoutConstants.parentGroupLookup)[order]);
        groupElement.insertAfter(sibling);
        this._onGroupMove(groupElement, null, sectionElement, page);
    }

    private _getControlOrder(item: JQuery, parent: JQuery): number {
        return this._getItemOrder(item, parent.find(AdminLayoutConstants.controlLookup));
    }

    private _getGroupOrder(item: JQuery, parent: JQuery): number {
        return this._getItemOrder(item, parent.find(AdminLayoutConstants.parentGroupLookup));
    }

    private _getItemOrder(item: JQuery, container: JQuery): number {
        var order: number = -1;

        $.each(container, (i, child) => {
            if (child === item[0]) {
                order = i;
            }
        });

        return order;
    }

    protected _getGrid(page: ProcessContracts.Page, container: JQuery, callback: IResultCallback): void {
        VSS.using(['WorkItemTracking/Scripts/Form/Grids'], (_TFS_WorkItemTracking_Form_Grids: any) => {
            var formGrid = Controls.BaseControl.createIn(_TFS_WorkItemTracking_Form_Grids.TwoOneOneSectionFormGrid, container, { showSectionLabels: true, coreCssClass: "process-layout-grid", useFixedLayout: true });
            formGrid.getElement().data(AdminLayoutConstants.nodeInfoProperty, page);
            if (this._readOnly) {
                formGrid.getElement().addClass("readonly-process-grid");
            }
            callback(formGrid);
        });
    }

    protected _fillPage(page: ProcessContracts.Page, grid: any): void {
        $.each(page.sections, (i: number, section: ProcessContracts.Section) => {
            this._fillSection(page, i + 1, section, grid);
        });
    }

    protected _fillSection(page: ProcessContracts.Page, sectionNumber: number, section: ProcessContracts.Section, grid: any): void {
        var sectionElement = grid.getSection(section.id);

        if (sectionElement && sectionElement.length === 1) {
            sectionElement.data(AdminLayoutConstants.nodeInfoProperty, section);

            $.each(section.groups, (i: number, group: ProcessContracts.Group) => {
                var groupElement = this._createGroup(page, section, group);
                grid.addToSection(groupElement, section.id);
                if (!this._readOnly) {
                    this._registerElementEvent(groupElement.find(".process-layout-group"), true);
                }
            });

            this._showEmptySectionBehavior(sectionElement);
        }
    }

    private _showEmptySectionBehavior(sectionElement: JQuery) {
        let hasGroups = sectionElement.find(".grid-group").length > 0;

        if (hasGroups) {
            sectionElement.find(".add-field-to-section-link").remove();
            sectionElement.removeClass("empty-section");
        }
        else if (!sectionElement.hasClass("empty-section")) {
            let columnText = "";
            if (sectionElement.hasClass("section1")) {
                columnText = AdminResources.Section1;
            }
            else if (sectionElement.hasClass("section2")) {
                columnText = AdminResources.Section2;
            }
            else if (sectionElement.hasClass("section3")) {
                columnText = AdminResources.Section3;
            }
            sectionElement.addClass("empty-section").attr("aria-label", columnText).uniqueId();
            let addFieldLink = $("<a>").addClass("add-field-to-section-link").attr("tabindex", "0").attr("aria-describedby", sectionElement.attr("id"))
                .text(AdminResources.EmptySectionAddFieldText).appendTo(sectionElement);

            let clickHandler = () => {
                if ($.isFunction(this._addFieldCallback)) {
                    let section = sectionElement.data(AdminLayoutConstants.nodeInfoProperty);
                    this._addFieldCallback(null, section);
                }
            };

            addFieldLink.click(clickHandler).keyup((e: JQueryKeyEventObject) => {
                if (e.keyCode === Utils_UI.KeyCode.ENTER) {
                    clickHandler();
                }
            });
        }
    }

    protected _createGroup(page: ProcessContracts.Page, section: ProcessContracts.Section, group: ProcessContracts.Group): JQuery {
        var groupContainer: JQuery = $("<div />").addClass("grid-group");

        var $groupElement = this._getTextElement(group.label, group.isContribution ? AdminResources.GroupExtensionSubtitle : null, false, group.inherited, group.visible, true, group.id, group.isContribution, false);

        var isSealedGroup: boolean = AdminProcessCommon.ProcessLayoutHelpers.isSealedGroup(group);

        $groupElement.addClass("process-layout-group");
        if (group.isContribution) {
            $groupElement.addClass("process-layout-group-contribution");
        }
        groupContainer.append($groupElement);

        if (this._isSystemProcess) {
            $groupElement.addClass("sort-disabled");
            groupContainer.addClass("sort-disabled");
            RichContentTooltip.add(AdminResources.AdminLayoutSystemTooltip, $groupElement);
        }
        else if (this._readOnly === true) {
            $groupElement.addClass("sort-disabled");
            groupContainer.addClass("sort-disabled");
            RichContentTooltip.add(AdminResources.AdminLayoutNeedPermissionsGroupTooltip, $groupElement);
        }
        else if (group.inherited === true) {
            $groupElement.addClass("sort-disabled");
            groupContainer.addClass("sort-disabled");
            RichContentTooltip.add(AdminResources.AdminLayoutInheritedGroupTooltip, $groupElement);
        }
        else {
            $groupElement.addClass("sort-enabled");
            groupContainer.addClass("sort-enabled");
        }
        $groupElement.data(AdminLayoutConstants.nodeInfoProperty, group);
        groupContainer.data(AdminLayoutConstants.nodeInfoProperty, group);

        if (!group.isContribution) {
            var groupControls: JQuery = $("<div />").addClass("group-controls");
            if (isSealedGroup) {
                $groupElement.hide();
                groupControls.addClass("html-group-controls");
            }

            groupContainer.append(groupControls);
        }

        $.each(group.controls, (i: number, control: ProcessContracts.Control) => {
            var subTitle: string = "";
            var field = this._fieldsMap[control.id];
            if (field) {
                subTitle = new AdminProcessCommon.ProcessFieldHelper().getFieldTypeLabelFromField(field);
            }
            else if (Utils_String.equals(control.controlType, WITConstants.WellKnownControlNames.LinksControl, true)) {
                subTitle = AdminResources.LinksControlSubtitle;
            }
            else if (Utils_String.equals(control.controlType, WITConstants.WellKnownControlNames.AssociatedAutomationControl, true)) {
                subTitle = AdminResources.AssociatedAutomationControlSubtitle;
            }
            else if (Boolean(control.contribution)) {
                subTitle = AdminResources.ControlExtensionSubtitle;
            }

            let contributionLabelEmpty = false;
            let controlLabel = control.label || group.label;
            let isContributionValid: boolean = true;

            if (control.isContribution) {
                if (control.label) {
                    controlLabel = control.label;
                }
                else if (this._contributionIdToContributionMap && this._contributionIdToContributionMap[control.contribution.contributionId]) {
                    // contributions are already loaded, set the label to the contribution name
                    controlLabel = AdminProcessCommon.ProcessContributionHelpers.getContributionLabel(this._contributionIdToContributionMap[control.contribution.contributionId]);
                    contributionLabelEmpty = true;
                }
                else {
                    // contributions haven't loaded, set the label to the default no label text
                    controlLabel = AdminResources.LayoutViewNoControlLabel;
                    contributionLabelEmpty = true;
                }

                if (this._contributionIdToContributionMap && this._contributionIdToContributionMap[control.contribution.contributionId]) {
                    isContributionValid = this._validateContribution(control.contribution, this._contributionIdToContributionMap[control.contribution.contributionId]);
                }
            }

            var $fieldElement = this._getTextElement(controlLabel, subTitle, true, control.inherited, control.visible, isSealedGroup, control.id, control.isContribution, contributionLabelEmpty, isContributionValid);
            // Only HTML Controls gets the control text bolded.
            if (isSealedGroup) {
                $fieldElement.addClass("process-layout-html-control");
            }

            $fieldElement.data(AdminLayoutConstants.nodeInfoProperty, control);
            $fieldElement.data(AdminLayoutConstants.groupInfoProperty, group.id);
            groupControls.append($fieldElement);

            if (this._isSystemProcess) {
                $fieldElement.addClass("sort-disabled");
                RichContentTooltip.add(AdminResources.AdminLayoutSystemTooltip, $fieldElement);
            }
            else if (this._readOnly === true) {
                $fieldElement.addClass("sort-disabled");
                RichContentTooltip.add(AdminResources.AdminLayoutNeedPermissionsFieldTooltip, $fieldElement);
            }
            else if (control.inherited === true) {
                $fieldElement.addClass("sort-disabled");
                RichContentTooltip.add(AdminResources.AdminLayoutInheritedFieldTooltip, $fieldElement);
            }
            else if (control.isContribution && !isContributionValid) {
                $fieldElement.addClass("sort-disabled");
                RichContentTooltip.add(AdminResources.AdminLayoutInvalidContributionTooltip, $fieldElement);
            }
            else {
                $fieldElement.addClass("sort-enabled");
            }

            if (!this._readOnly) {
                this._registerElementEvent($fieldElement, false);
            }
        });

        return groupContainer;
    }

    private _validateContribution(controlContribution: ProcessContracts.WitContribution, contribution: Contribution): boolean {
        const inputs: ExtendedInputDescriptor[] = contribution.properties[WITConstants.WorkItemFormContributionProperties.Inputs];
        if (inputs && inputs.length > 0) {
            const formInputViewModel = new FormInputViewModel(null, null, null, null);
            const inputsViewModel = new InputsViewModel(formInputViewModel, inputs, controlContribution.inputs, null, null);

            return inputsViewModel.areValid();
        }

        return true;
    }

    private _registerElementEvent($element: JQuery, isGroup: boolean): void {
        // Showing the context menu only on right click on the element
        $element.mousedown(
            (event: JQueryEventObject) => {
                var $target = $(event.target);
                var $closestLayoutControl = $target.closest("div.process-layout-control, div.process-layout-group");
                var $closestDropIcon = $target.closest("span.icon.bowtie-ellipsis");
                var $closestMenuPopup = $target.closest("ul.menu-popup");

                if ($closestLayoutControl.length > 0) {
                    $closestLayoutControl.focus();

                    if ($closestDropIcon.length > 0) {
                        this._showPopupMenu(
                            $closestDropIcon, $closestLayoutControl, isGroup);
                        event.preventDefault();
                        return false;
                    }
                    else if ($closestMenuPopup.length > 0) {
                        // prevent dragging while context menu is open
                        event.preventDefault();
                        return false;
                    }
                    else if (event.button == 2) {
                        this._showPopupMenu(
                            $closestLayoutControl.find("span.icon.bowtie-ellipsis"), $closestLayoutControl, isGroup);
                        event.preventDefault();
                        return false;
                    }
                    else {
                        this._disposeContextMenu();
                    }
                }

                return true;
            });

        // Making sure contextmenu as no only we should disable browser default behavior as well as make sure all browser handles the keyboard context menu properly
        $element.on("contextmenu", (event: JQueryEventObject) => this._onContextMenu(event, isGroup));
        $element.keydown((event: JQueryKeyEventObject) => {
            var keyCode = Utils_UI.KeyCode;
            if (event.keyCode === keyCode.F10 && event.shiftKey) {
                return this._onContextMenu(event, isGroup);
            }
            return true;
        });
    }

    private _onContextMenu(event: JQueryKeyEventObject, isGroup: boolean): Boolean {
        var $target = $(event.target);
        var $closestLayoutControl = $target.closest("div.process-layout-control, div.process-layout-group");

        if ($closestLayoutControl.length > 0) {
            $closestLayoutControl.focus();
            this._showPopupMenu(
                $closestLayoutControl.find("span.icon.bowtie-ellipsis"), $closestLayoutControl, isGroup);
            event.preventDefault();
            return false;
        }
        return true;
    }

    private _disposeContextMenu() {
        if (this._contextMenu) {
            this._contextMenu.hide({ immediate: true });
            this._contextMenu.dispose();
            this._contextMenu = null;
        }
    }

    protected _showPopupMenu($menuPin: JQuery, $layoutControlElement: JQuery, isGroup: boolean): void {
        this._disposeContextMenu();
        this._contextMenu = this._buildPopupMenu($layoutControlElement, isGroup);
        this._contextMenu.getElement().prependTo($layoutControlElement);
        this._contextMenu.popup($layoutControlElement, $menuPin);
        $layoutControlElement.addClass("drop-open");
    }

    private _buildPopupMenu(element: JQuery, isGroup: boolean): Menus.PopupMenu {
        var groupElement: JQuery = null;
        var group: ProcessContracts.Group = null;
        var controlElement: JQuery = null;
        var control: ProcessContracts.Control = null;

        if (isGroup) {
            groupElement = element;
            group = <ProcessContracts.Group>this._getNodeData(groupElement);
        }
        else {
            controlElement = element;
            control = <ProcessContracts.Control>this._getNodeData(controlElement);
            groupElement = this._getParentGroupElement(controlElement);
            group = this._getNodeData(groupElement);
        }

        var sectionElement = this._getParentSectionElement(groupElement);
        var section: ProcessContracts.Section = this._getNodeData(sectionElement);

        var pageElement = this._getParentPageElement(sectionElement);
        var page: ProcessContracts.Page = this._getNodeData(pageElement);

        var popupMenu;
        if (isGroup) {
            popupMenu = this._createContextPopupMenuControl(element, page, section, group, true);
        }
        else {
            popupMenu = this._createContextPopupMenuControl(element, page, section, group, false, control);
        }

        return popupMenu;
    }

    private _getNodeData(element: JQuery): any {
        return element.data(AdminLayoutConstants.nodeInfoProperty);
    }

    private _getParentGroupElement(controlElement: JQuery): JQuery {
        return controlElement.parents(AdminLayoutConstants.parentGroupLookup);
    }

    private _getParentSectionElement(groupElement: JQuery): JQuery {
        return groupElement.parents(AdminLayoutConstants.parentSectionLookup);
    }

    private _getParentPageElement(sectionElement: JQuery): JQuery {
        return sectionElement.parents(AdminLayoutConstants.parentPageLookup);
    }

    protected _getTextElement(text: string, subTitle: string, isControl: boolean, isInherited: boolean, isVisible: boolean, isBold: boolean, id?: string, isContribution?: boolean, isContributionLabelEmpty?: boolean, isContributionValid?: boolean): JQuery {
        var $icon;
        var $container = $("<div>").attr("tabindex", "0");
        if (id) {
            $container.attr("id", id);
        }

        var $iconContainer = $("<span>").attr("aria-hidden", "true").addClass("process-layout-icon-container").appendTo($container);

        if (this._isSystemProcess || isInherited) {
            $("<span>").attr("aria-hidden", "true").addClass('icon bowtie-icon bowtie-row-child').appendTo($iconContainer);
        }
        else if (isContribution) {
            $("<span>").addClass('icon bowtie-icon bowtie-shop-server menu-item-icon').appendTo($iconContainer);
        }
        else {
            $("<span>").addClass("no-icon").appendTo($iconContainer);
        }
        const $textContainer = $("<div>").addClass("process-layout-text-container").appendTo($container);
        const $primaryTitleContainer = $("<div>").addClass("process-layout-primary-title-container").appendTo($textContainer);
        const $text = $("<div>").attr("aria-hidden", "true").text(text).appendTo($primaryTitleContainer);

        if (isContribution && isContributionLabelEmpty) {
            $text.addClass("process-layout-no-text");
        }

        var $subTitle = $("<div>").appendTo($textContainer);
        if (subTitle) {
            $subTitle.text(subTitle);
        }

        $subTitle.addClass("process-layout-subtitle");

        if (isControl) {
            $text.addClass("process-layout-text");
            $container.addClass("process-layout-control");

            if (isContribution) {
                const $errorIcon = $("<span>").addClass("control-contribution-error icon bowtie-icon bowtie-status-error-outline menu-item-icon").prependTo($primaryTitleContainer);

                if (isContributionValid) {
                    $errorIcon.hide();
                }
            }
        }
        else {
            $text.addClass("process-layout-group-text");
        }

        if (!isVisible) {
            $text.addClass("process-layout-text-hidden");
        }

        const ariaLabel = [
            text,
            subTitle,
            isBold ? AdminResources.FormGroup : "",
            isControl ? AdminResources.FormControl : "",
            isContribution ? AdminResources.FormContribution : "",
            isInherited ? AdminResources.Inherited : ""
        ].filter(t => !!t).join(", ");
        $container.attr({
            "role": "presentation",
            "aria-label": ariaLabel
        });

        if (isBold) {
            // .screenreader = only visible to screen readers
            $text.addClass("process-layout-text-bold");
            const $screenreaderLabel = $("<h3 />")
                .addClass("screenreader")
                .text(ariaLabel);
            $textContainer.append($screenreaderLabel);
        } else {
            const $screenreaderLabel = $("<h4 />")
                .addClass("screenreader")
                .text(ariaLabel);
            $textContainer.append($screenreaderLabel);
        }

        // Don't show the ellipsis if the process is readonly
        if (!this._readOnly) {
            $("<span>")
                .addClass("icon bowtie-icon bowtie-ellipsis")
                .attr({
                    "role": "button",
                    "aria-label": Utils_String.format(AdminResources.FormActions, text)
                })
                .appendTo($textContainer);
        }
        else {
            $container.addClass("readonly");
        }

        return $container;
    }

    private _createContextPopupMenuControl($container: JQuery,
        page: ProcessContracts.Page,
        section: ProcessContracts.Section,
        group: ProcessContracts.Group,
        isGroup: boolean,
        control?: ProcessContracts.Control): Menus.PopupMenu {

        var menuItems;
        if (isGroup) {
            menuItems = $.map(this._getGroupMenuItems($container, page, section, group) || [], function (menuItem) {
                return menuItem;
            });
        }
        else {
            menuItems = $.map(this._getControlMenuItems($container, group, control, section) || [], function (menuItem) {
                return menuItem;
            });
        }

        return <Menus.PopupMenu>Controls.BaseControl.createIn(Menus.PopupMenu, $container, {
            showIcon: true,
            align: "left-bottom",
            items: [{
                childItems: Menus.sortMenuItems(menuItems)
            }],
            onHide: () => {
                $container.removeClass("drop-open");
            }
        });
    }

    protected _getControlMenuItems(controlElement: JQuery, group: ProcessContracts.Group, control: ProcessContracts.Control, section: ProcessContracts.Section) {
        var menuItems: Menus.IMenuItemSpec[] = [];

        if (this._editControlMenuItemSpecsCallback) {
            let editMenuItems = this._editControlMenuItemSpecsCallback(section, group, control);
            if (editMenuItems) {
                editMenuItems.forEach(item => menuItems.push(item));
            }
        }

        if (control && control.inherited) {
            if (control.visible) {
                menuItems.push({
                    id: "process-layout-hide", text: AdminResources.HideNodeInLayoutContextMenuText, icon: "bowtie-icon bowtie-status-no", action: (contextInfo) => {
                        if ($.isFunction(this._setControlVisibleCallback)) {
                            this._setControlVisibleCallback(group, control, false);
                        }
                    }
                });
            }
            else {
                menuItems.push({
                    id: "process-layout-show", text: AdminResources.ShowNodeInLayoutContextMenuText, icon: "bowtie-icon bowtie-check-light", action: (contextInfo) => {
                        if ($.isFunction(this._setControlVisibleCallback)) {
                            this._setControlVisibleCallback(group, control, true);
                        }
                    }
                });
            }
        }

        var groupElement = this._getParentGroupElement(controlElement);

        // If control is not parent process 
        if (control && !control.inherited) {
            let fieldIdsToRemove: string[] = [];
            if (this._alsoRemoveFromWorkItemType) {
                let controlId = control.id;
                let lowerCasedControlId = controlId.toLocaleLowerCase();
                let allControlsById: IDictionaryStringTo<ProcessContracts.Control[]> = this._getControlsByLowerCasedId();

                let controls: ProcessContracts.Control[] = allControlsById[lowerCasedControlId] || [];
                if (!control.isContribution && controls.length == 1 && controls[0] == control) {
                    fieldIdsToRemove.push(controlId);
                }
                else if (control.contribution && control.contribution.inputs) {
                    let fieldIdsToCheck: string[] = AdminProcessCommon.ProcessContributionHelpers.getContributionInputLowerCasedWorkItemFieldIds(
                        control.contribution.inputs, this._contributionInputByIds, control.contribution.contributionId);

                    fieldIdsToCheck.forEach((fieldId) => {
                        let controls: ProcessContracts.Control[] = allControlsById[fieldId] || [];
                        if (controls.length == 1 && controls[0] == control) {
                            fieldIdsToRemove.push(fieldId);
                        }
                    });
                }
            }

            menuItems.push({
                id: "process-layout-delete",
                text: fieldIdsToRemove.length > 0 ?
                    AdminResources.Remove : AdminResources.RemoveFieldFromLayoutContextMenuText,
                icon: "bowtie-icon bowtie-edit-delete",
                action: (contextInfo) => {
                    if ($.isFunction(this._removeCallback)) {
                        this._removeCallback(group, control, fieldIdsToRemove);
                    }
                }
            });

            // The html field acts as the group and the field. We replace the field
            // move up and down buttons with the group up and down buttons in this case to enable sorting for html field groups. If we dont do this the fields
            // will not have up and down buttons since they are the only field in the group so there is nothing to sort.
            if (AdminProcessCommon.ProcessLayoutHelpers.isSealedGroup(group)) {
                this._addGroupMoveUpDownMenuItems(groupElement, menuItems);
            }
            else {
                this._addControlMoveUpDownMenuItems(controlElement, menuItems);
            }
        }

        // If the control is overridden 
        if (control && control.overridden) {
            menuItems.push({
                id: "process-layout-reset", text: AdminResources.Revert, icon: "bowtie-icon bowtie-edit-undo", action: (contextInfo) => {
                    if ($.isFunction(this._removeCallback)) {
                        this._removeCallback(group, control, []);
                    }
                }
            });
        }

        return menuItems;
    }

    protected _getGroupMenuItems(groupElement: JQuery, page: ProcessContracts.Page, section: ProcessContracts.Section, group: ProcessContracts.Group) {
        var menuItems: Menus.IMenuItemSpec[] = [];

        if (group && !AdminProcessCommon.ProcessLayoutHelpers.isSealedGroup(group) && !group.isContribution) {
            menuItems.push({
                id: "process-layout-addField", text: AdminResources.LayoutContextMenuNewField, icon: "bowtie-icon bowtie-edit-rename", action: (contextInfo) => {
                    if ($.isFunction(this._addFieldCallback)) {
                        this._addFieldCallback(group);
                    }
                }
            });

            if (this._contributions && this._contributions.length > 0) {
                menuItems.push({
                    id: "process-layout-addControlExtension", text: AdminResources.LayoutContextMenuNewControlExtension, icon: "bowtie-icon bowtie-shop-server", action: (contextInfo) => {
                        if ($.isFunction(this._addControlExtensionCallback)) {
                            this._addControlExtensionCallback(group);
                        }
                    }
                });
            }
        }

        menuItems.push({
            id: "process-layout-edit", text: AdminResources.Edit, icon: "bowtie-icon bowtie-edit", action: (contextInfo) => {
                if ($.isFunction(this._editGroupCallback)) {
                    this._editGroupCallback(page, section, group);
                }
            }
        });

        // If control is not parent process and not a contribution
        if (group && !group.inherited && !group.isContribution) {
            var groupContainerElement = groupElement.parent(AdminLayoutConstants.parentGroupLookup);

            var controlCount = groupContainerElement.find(AdminLayoutConstants.controlLookup).length;

            if (controlCount === 0) {
                menuItems.push({
                    id: "process-layout-delete", text: AdminResources.Remove, icon: "bowtie-icon bowtie-edit-delete", action: (contextInfo) => {
                        if ($.isFunction(this._removeGroupCallback)) {
                            this._removeGroupCallback(page, section, group);
                        }
                    }
                });
            }

            this._addGroupMoveUpDownMenuItems(groupContainerElement, menuItems);
        }

        // group contributions can only be hidden
        if (group && group.isContribution) {
            if (group.visible) {
                menuItems.push({
                    id: "process-layout-hide", text: AdminResources.HideNodeInLayoutContextMenuText, icon: "bowtie-icon bowtie-status-no", action: (contextInfo) => {
                        if ($.isFunction(this._setGroupVisibleCallback)) {
                            this._setGroupVisibleCallback(page, section, group, false);
                        }
                    }
                });
            }
            else {
                menuItems.push({
                    id: "process-layout-show", text: AdminResources.ShowNodeInLayoutContextMenuText, icon: "bowtie-icon bowtie-check-light", action: (contextInfo) => {
                        if ($.isFunction(this._setGroupVisibleCallback)) {
                            this._setGroupVisibleCallback(page, section, group, true);
                        }
                    }
                });
            }
        }

        return menuItems;
    }

    private _getControlsByLowerCasedId(): IDictionaryStringTo<ProcessContracts.Control[]> {
        if (this._controlsByLowerCasedId == null) {
            this._controlsByLowerCasedId = AdminProcessCommon.ProcessLayoutHelpers.createControlsByLowerCasedIdMap(this._layout, this._contributionInputByIds);
        }

        return this._controlsByLowerCasedId;
    }

    private _addGroupMoveUpDownMenuItems(groupElement: JQuery, menuItems: Menus.IMenuItemSpec[]): void {
        var sectionElement = this._getParentSectionElement(groupElement);
        var order = this._getGroupOrder(groupElement, sectionElement);
        var groupsCount = sectionElement.find(AdminLayoutConstants.parentGroupLookup).length;

        if (order > 0 && !this._orderingDisabled) {
            menuItems.push({
                id: "process-layout-moveup", text: AdminResources.MoveUp, icon: "bowtie-icon bowtie-arrow-up", action: (contextInfo) => {
                    this._onMoveGroupUp(groupElement);
                }
            });
        }

        if (order < groupsCount - 1 && !this._orderingDisabled) {
            menuItems.push({
                id: "process-layout-movedown", text: AdminResources.MoveDown, icon: "bowtie-icon bowtie-arrow-down", action: (contextInfo) => {
                    this._onMoveGroupDown(groupElement);
                }
            });
        }
    }

    private _addControlMoveUpDownMenuItems(controlElement: JQuery, menuItems: Menus.IMenuItemSpec[]): void {
        var groupElement = this._getParentGroupElement(controlElement);
        var order = this._getControlOrder(controlElement, groupElement);
        var controlsCount = groupElement.find(AdminLayoutConstants.controlLookup).length;

        if (order > 0 && !this._orderingDisabled) {

            menuItems.push({
                id: "process-layout-moveup", text: AdminResources.MoveUp, icon: "bowtie-icon bowtie-arrow-up", action: (contextInfo) => {
                    this._onMoveControlUp(controlElement);
                }
            });
        }

        if (order < controlsCount - 1 && !this._orderingDisabled) {
            menuItems.push({
                id: "process-layout-movedown", text: AdminResources.MoveDown, icon: "bowtie-icon bowtie-arrow-down", action: (contextInfo) => {
                    this._onMoveControlDown(controlElement);
                }
            });
        }
    }
}

// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("TFS.Admin.Process.LayoutRenderer", exports);
