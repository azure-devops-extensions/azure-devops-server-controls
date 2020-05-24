import AgileResources = require("Agile/Scripts/Resources/TFS.Resources.Agile");
import { BaseControl, Control } from "VSS/Controls";
import { ModalDialogO, IModalDialogOptions } from "VSS/Controls/Dialogs";
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import TFS_OM_Common = require("Presentation/Scripts/TFS/TFS.OM.Common");
import TFS_Core_Utils = require("Presentation/Scripts/TFS/TFS.Core.Utils");
import WITOM = require("WorkItemTracking/Scripts/TFS.WorkItemTracking")
import WorkItemUtility = require("WorkItemTracking/Scripts/Controls/WorkItemForm/Utils");
import { OpenDropDownOnFocusCombo } from "Presentation/Scripts/TFS/TFS.UI.Controls.OpenDropDownCombo";
import CheckboxList = require("VSS/Controls/CheckboxList");
import { TreeNode } from "VSS/Controls/TreeView";
import { IClassificationValidationResult } from "Agile/Scripts/Admin/Interfaces";
import { ClassificationControlNodeType } from "Agile/Scripts/Admin/TeamClassificationDataManager";
import { MessageAreaControl, MessageAreaType } from "VSS/Controls/Notifications";
import Utils_String = require("VSS/Utils/String");
import Utils_UI = require("VSS/Utils/UI");
import Utils_Array = require("VSS/Utils/Array");

export interface IClassificationPickerDialogOptions extends IModalDialogOptions {
    /** Classification type to use for control population */
    classificationControlType: ClassificationControlNodeType;
    /** Label that is shown for classification picker */
    controlLabel: string;
    /** Function used for node validation. Will be fired each time the value changes */
    validate: IFunctionPR<string, IClassificationValidationResult>;
    /** Show the Fwlink for the learn more */
    showLearnMoreLink?: boolean;
    /** Fwlink for the learn more */
    learnMoreLink?: string;
    /** Text for the fwlink to learn more */
    learnMoreLinkText?: string;
    /** Watermark text for the picker */
    pickerWatermark: string;
    /** Limit of classification can be added */
    addLimit: number;
    /** Message to display when the addLimit is reached */
    addLimitMessage: string;
    /** Root node of the classification tree. Optional. If not specified, falls back to the WITOM Project Nodes.
     *  If the page hosting this control allows users to add/edit/delete nodes,
     *  then since the project nodes would be cached already, those are going to be obsolete.
     *  In such a case, the caller should ensure to leverage this option. */
    rootClassificationNode?: any;
}

/** Dialog that allows consumer to pick a single classification node */
export class ClassificationPickerDialog extends ModalDialogO<IClassificationPickerDialogOptions> {
    public static enhancementTypeName: string = "ClassificationPickerDialog";
    public static CLASSIFICATION_PATH_RESULT_ID = "classificationPath";

    private static SEPARATE_CHAR = "\\";
    private static ADMIN_AREA_ITERATION_CLASS = "admin-area-iteration";
    private static PICKER_CONTAINER_CLASS = ClassificationPickerDialog.ADMIN_AREA_ITERATION_CLASS + "-picker";
    private static PICKER_COMBO_CLASS = ClassificationPickerDialog.ADMIN_AREA_ITERATION_CLASS + "-picker-combo";
    private static ADD_ICON_CLASS = "bowtie-math-plus";
    private static DELETE_ICON_CLASS = "bowtie-edit-delete";

    protected dialogResult: IDictionaryStringTo<any> = {};
    protected combos: OpenDropDownOnFocusCombo[] = [];

    private _messageArea: MessageAreaControl;
    private _$addControl: JQuery;
    private _$addLimitMessageArea: JQuery;

    constructor(options?: IClassificationPickerDialogOptions) {
        super(options);
    }

    /** OVERRIDE: Refer to Control */
    public initializeOptions(options?: IClassificationPickerDialogOptions) {
        super.initializeOptions($.extend({
            bowtieVersion: 2,
            width: 550,
            defaultButton: "ok",
            okText: AgileResources.SaveAndCloseButtonName,
            dialogClass: "classification-picker-dialog",
            resizable: false,
        }, options));
    }

    /** OVERRIDE: Refer to Control */
    public initialize() {
        super.initialize();
        this._createMessageArea();
        this._createComboArea();
        this._createLearnMoreLink();
    }

    /** Create message area to show server error message */
    private _createMessageArea() {
        this._messageArea = Control.create(
            MessageAreaControl,
            $("<div>").addClass("form-section").appendTo(this.getElement()),
            {});
    }

    private _createComboArea() {
        var $formSection = $("<div>").addClass("form-section bowtie " + ClassificationPickerDialog.ADMIN_AREA_ITERATION_CLASS).appendTo(this.getElement());
        this._createAddIcon($formSection);
        this._createDropdownCombo();
    }

    /** Create dropdown combo control with delete functionality */
    private _createDropdownCombo() {
        var comboId = TFS_Core_Utils.GUIDUtils.newGuid();
        var $formSection = this.getElement().find("." + ClassificationPickerDialog.ADMIN_AREA_ITERATION_CLASS);
        var $pickerContainer = $("<div>").addClass(ClassificationPickerDialog.PICKER_CONTAINER_CLASS).appendTo($formSection);
        var $pickerCombo = $("<div>").addClass(ClassificationPickerDialog.PICKER_COMBO_CLASS).appendTo($pickerContainer);

        var combo = <OpenDropDownOnFocusCombo>BaseControl.createIn(
            OpenDropDownOnFocusCombo,
            $pickerCombo,
            {
                type: "treeSearch",
                allowEdit: true,
                initialLevel: 2,
                fixDropWidth: true,
                sepChar: ClassificationPickerDialog.SEPARATE_CHAR,
                change: (combo: OpenDropDownOnFocusCombo) => { this._handleInputChange(combo) },
                id: comboId,
                showErrorMessageOnInvalid: true,
                label: this._options.pickerWatermark // aria-label
            });

        var $picker = combo.getElement().find("input[type='text']");
        if ($picker) {
            Utils_UI.Watermark($picker, { watermarkText: this._options.pickerWatermark });
            $picker.focus();

            $picker.click(() => {
                if (combo.getText() === Utils_String.empty) {
                    Utils_UI.Watermark($picker, { watermarkText: Utils_String.empty });
                }
            })
                .focusout(() => {
                    if (combo.getText() === Utils_String.empty) {
                        Utils_UI.Watermark($picker, { watermarkText: this._options.pickerWatermark });
                    }
                });
        }

        // populate combo source and pre select node.
        this._populateCombo(combo);
        this._preSelectNextSiblingNode(combo);

        // add into the list of combos.
        this.combos.push(combo);

        combo.createErrorArea();
        this._createDeleteIcon(combo, $pickerContainer);
    }

    /**
     * This function get the node populated from the last combo, and get the next sibling of that node to be pre selected for the given combo.
     * @param combo the combo to pre select the node for.
     */
    private _preSelectNextSiblingNode(combo: OpenDropDownOnFocusCombo) {
        var comboLen = this.combos.length;
        if (comboLen >= 1) {
            // if there is at least one combo
            var lastCombo = this.combos[comboLen - 1];
            var lastSelectedIndex = lastCombo.getSelectedIndex();
            if (lastSelectedIndex > 0) { // excluding root node
                var dataSource = lastCombo.getBehavior().getDataSource();
                var item = dataSource.getItem(lastSelectedIndex);
                var itemParent = item.parent;
                var itemSiblings = itemParent.children;
                var itemNextSibling: TreeNode;
                var found = false;
                // go though each sibling upto the second last node to find the next available valid sibling of the last selected item.
                for (var i = 0, len = itemSiblings.length; i < len - 1; i++) {
                    if (itemSiblings[i].id === item.id || found) {
                        found = true;
                        itemNextSibling = itemSiblings[i + 1];
                        var itemNextSiblingPath = itemNextSibling.path(false, ClassificationPickerDialog.SEPARATE_CHAR);
                        var result = this._options.validate(itemNextSiblingPath);
                        if (result.valid) {
                            // set combo input text as next sibling node 
                            combo.setInputText(itemNextSiblingPath, true);
                            // highlight input text.
                            combo.getInput().select();
                            break;
                        }
                    }
                }
            }
        }
    }

    private _populateCombo(combo: OpenDropDownOnFocusCombo) {
        var errorHandler = () => {
            this._messageArea.setMessage(AgileResources.WorkAdminHub_ClassficationPicker_Error, MessageAreaType.Error);
        };

        // If the root node for the classification tree has been specified, use that to populate the combo
        if (this._options.rootClassificationNode) {
            var rootNode: TreeNode = WorkItemUtility.populateUINodes(this._options.rootClassificationNode, null, 1);
            combo.setSource([rootNode]);
        }
        else {
            // Fall back to the project nodes
            var tfsContext = TFS_Host_TfsContext.TfsContext.getDefault();

            var store = TFS_OM_Common.ProjectCollection.getConnection(tfsContext).getService<WITOM.WorkItemStore>(WITOM.WorkItemStore);
            store.beginGetProject(tfsContext.navigation.project, (project: WITOM.Project) => {
                project.nodesCacheManager.beginGetNodes().then(() => {
                    var rootNode: TreeNode;
                    switch (this._options.classificationControlType) {
                        case ClassificationControlNodeType.Iteration:
                            rootNode = WorkItemUtility.populateUINodes(project.nodesCacheManager.getIterationNode(true), null, 1);
                            break;
                        case ClassificationControlNodeType.Area:
                            rootNode = WorkItemUtility.populateUINodes(project.nodesCacheManager.getAreaNode(true), null, 1);
                            break;
                    }

                    combo.setSource([rootNode]);

                }, errorHandler);
            }, errorHandler);
        }
    }

    private _createLearnMoreLink() {
        if (this._options.showLearnMoreLink) {
            this.getElement().append($('<div>').html());
            var $link = $("<a />", {
                href: this._options.learnMoreLink,
                text: this._options.learnMoreLinkText,
                target: "learnMore"
            });
            $link.attr("aria-label", Utils_String.format(AgileResources.WorkAdminHubSelectDialog_LearnMoreLabel, this._options.controlLabel))
            $link.append($("<span />").addClass("bowtie-icon bowtie-navigate-external"));
            this.getElement().append($link);
        }
    }

    /** Handler when combo input change */
    private _handleInputChange(combo: OpenDropDownOnFocusCombo) {
        var path = combo.getText();
        var result = this._options.validate(path);
        var errorText = result.errorMessage;

        if (result.valid) {
            combo.setInvalid(false, "");
            if (this._isAllPathValid()) {
                this.updateOkButton(true);
            }
        }
        else {
            this.updateOkButton(false);
            if (!errorText) {
                errorText = path ? Utils_String.format(AgileResources.ClassificationPicker_ErrorText_PathNotExist, path) : AgileResources.ClassificationPicker_ErrorText_PathRequired;
            }
            combo.setInvalid(true, errorText);
        }
    }

    /** 
     * Validate if all of the value in the combo lists are valid.
     * @return True if all of the value are valid. False otherwise.
     */
    private _isAllPathValid(): boolean {
        for (var i = 0, len = this.combos.length; i < len; i++) {
            var isValid = this.combos[i].isValid();
            if (!isValid) {
                return false;
            }
        }
        return true;
    }

    /** OVERRIDE: See Dialog */
    public onClose(e?: JQueryEventObject) {
        super.onClose(e);
    }

    /** OVERRIDE: See Dialog */
    public getDialogResult(): IDictionaryStringTo<any> {
        var result: string[] = [];
        for (var i = 0, len = this.combos.length; i < len; i++) {
            var inputText = this.combos[i].getText();
            result.push(inputText);
        }
        // filter out empty string and duplicated result.
        result = result.filter((value: string) => value !== Utils_String.empty);
        result = Utils_Array.unique(result, Utils_String.localeIgnoreCaseComparer);
        this.dialogResult[ClassificationPickerDialog.CLASSIFICATION_PATH_RESULT_ID] = result;
        return this.dialogResult;
    }

    /** OVERRIDE: See Control */
    public dispose() {
        super.dispose();
        for (var i = 0, len = this.combos.length; i < len; i++) {
            this.combos[i].dispose();
        }
    }

    private _createAddIcon($container: JQuery) {
        this._$addControl = $("<button>").addClass("add-control-container")
            .attr("aria-label", Utils_String.format(AgileResources.WorkAdminHubSelectDialog_AddLabel, this._options.controlLabel))
            .bind("click", (e) => { this._onAddIconClick(e) });

        var addIconContainer = $("<span>");
        $("<div>").addClass("bowtie-icon " + ClassificationPickerDialog.ADD_ICON_CLASS).appendTo(addIconContainer);
        $("<div>").text(this._options.controlLabel).appendTo(addIconContainer);
        this._$addControl.append(addIconContainer);
        $container.append(this._$addControl);

        this._createAddLimitMessageArea($container);
    }

    /** On add icon click handler */
    protected _onAddIconClick(e?: JQueryEventObject) {
        var comboLen = this.combos.length;
        if (comboLen < this._options.addLimit) {
            this._createDropdownCombo();
        }
        this._displayOrHideAddLimitMessage();
        this._displayOrHideDeleteIcon();
    }

    private _createAddLimitMessageArea($container: JQuery) {
        this._$addLimitMessageArea = $("<div>").addClass("admin-area-iteration-message-area");
        $("<div>").addClass("bowtie-icon bowtie-status-info").appendTo(this._$addLimitMessageArea);
        $("<span>").appendTo(this._$addLimitMessageArea);
        this._$addLimitMessageArea.appendTo($container);
        this._setAddLimitMessageArea("", false);
    }

    private _setAddLimitMessageArea(message: string, visible: boolean) {
        this._$addLimitMessageArea.find("span").text(message);
        this._$addLimitMessageArea.css("display", visible ? "inline-block" : "none");
    }

    private _displayOrHideAddLimitMessage() {
        var comboLen = this.combos.length;
        if (comboLen >= this._options.addLimit) {
            this._enableAddIcon(false);
            this._setAddLimitMessageArea(this._options.addLimitMessage, true);
        }
        else {
            this._enableAddIcon(true);
            this._setAddLimitMessageArea("", false);
        }
    }

    private _enableAddIcon(enable: boolean) {
        if (enable) {
            this._$addControl.find("." + ClassificationPickerDialog.ADD_ICON_CLASS).removeClass(" disabled");
        }
        else {
            this._$addControl.find("." + ClassificationPickerDialog.ADD_ICON_CLASS).addClass(" disabled");
        }
    }

    private _createDeleteIcon(combo: OpenDropDownOnFocusCombo, $container: JQuery) {
        $("<button>").addClass("delete-button")
            .append($("<div>").addClass("bowtie-icon " + ClassificationPickerDialog.DELETE_ICON_CLASS))
            .attr("aria-label", Utils_String.format(AgileResources.WorkAdminHubSelectDialog_DeleteLabel, this._options.controlLabel))
            .bind("click", (e) => { this._onDeleteIconClick(combo, e) })
            .bind("keydown", (e) => { this._onDeleteIconKeyDown(combo, e) })
            .appendTo($container);
        this._displayOrHideDeleteIcon();
    }

    /** On delete icon click handler */
    protected _onDeleteIconClick(combo: OpenDropDownOnFocusCombo, e?: JQueryEventObject) {
        if (this.combos.length === 1) {
            return;
        }

        // remove the dom element containing the combo.
        combo.getElement().parent().parent().remove();

        // remove from list of combos
        var comboId = combo.getId();
        for (var i = 0, len = this.combos.length; i < len; i++) {
            if (this.combos[i].getId() === comboId) {
                this._setFocusAfterDelete(i);
                this.combos.splice(i, 1);
                break;
            }
        }
        combo.dispose();

        // hide add limit message.
        this._displayOrHideAddLimitMessage();
        this._displayOrHideDeleteIcon();

        // validate
        if (this._isAllPathValid()) {
            this.updateOkButton(true);
        }
    }

    private _onDeleteIconKeyDown(combo: OpenDropDownOnFocusCombo, e?: JQueryEventObject) {
        if (e.keyCode === Utils_UI.KeyCode.ENTER) {
            this._onDeleteIconClick(combo, e);
            e.stopPropagation();
            e.preventDefault();
            return false;
        }
        return true;
    }

    private _displayOrHideDeleteIcon() {
        var comboLen = this.combos.length;
        var firstDeleteIconDom = this._getDeleteIconDom(this.combos[0]);
        if (comboLen === 1) {
            firstDeleteIconDom.css("visibility", "hidden");
        }
        else {
            firstDeleteIconDom.css("visibility", "visible");
        }
    }

    private _setFocusAfterDelete(deletedIndex: number) {
        if (deletedIndex + 1 < this.combos.length) {
            // Move focus to next item
            this._getDeleteIconDom(this.combos[deletedIndex + 1]).focus();
        }
        else if (deletedIndex - 1 > 0) {
            // Move focus to previous item
            this._getDeleteIconDom(this.combos[deletedIndex - 1]).focus();
        }
        else {
            // Move focus to add control
            this._$addControl.focus();
        }
    }

    /**
     * Return the delete icon Dom element of the given combo.
     * @param combo 
     */
    private _getDeleteIconDom(combo: OpenDropDownOnFocusCombo): JQuery {
        return combo.getElement().parent().siblings(".delete-button");
    }
}

/**
 * On the area picker dialog, there would be one more checkbox on the dialog which is used to indicate the value of includeSubArea
 */
export class AreaPickerDialog extends ClassificationPickerDialog {
    public static INCLUDE_SUBAREA_RESULT_ID = "includeSubArea";
    public static INCLUDE_SUBAREA_CHECKBOX_ITEM = "include_subarea_checkbox_item";

    private _areaCheckboxList: CheckboxList.CheckboxList;

    public initialize() {
        super.initialize();
        this._createCheckboxes();
    }

    private _createCheckboxes() {
        const checkboxItems: CheckboxList.ICheckboxListItem[] = [{
            checked: false,
            value: AreaPickerDialog.INCLUDE_SUBAREA_CHECKBOX_ITEM,
            text: AgileResources.AdminWorkHub_IncludeSubAreas
        }];
        const $checkboxContainer = $("<div>").addClass("form-section bowtie").appendTo(this.getElement());
        const checkboxOptions: CheckboxList.ICheckboxListOptions = {
            items: checkboxItems,
            itemCssClass: "admin-hub-include-sub-areas"
        };

        this._areaCheckboxList = <CheckboxList.CheckboxList>BaseControl.createIn(
            CheckboxList.CheckboxList,
            $checkboxContainer,
            checkboxOptions
        );

        this._areaCheckboxList.getElement().addClass("checkbox-list-no-padding");
    }

    /** OVERRIDE: See ClassificationPickerDialog */
    public getDialogResult(): IDictionaryStringTo<any> {
        super.getDialogResult();
        const checkedValues = this._areaCheckboxList ? this._areaCheckboxList.getCheckedValues() : [];
        //When the checkbox of include subareas is checked
        if (checkedValues && checkedValues.length !== 0 &&
            Utils_Array.contains(checkedValues, AreaPickerDialog.INCLUDE_SUBAREA_CHECKBOX_ITEM)) {

            this.dialogResult[AreaPickerDialog.INCLUDE_SUBAREA_RESULT_ID] = true;
        }

        return this.dialogResult;
    }
}
