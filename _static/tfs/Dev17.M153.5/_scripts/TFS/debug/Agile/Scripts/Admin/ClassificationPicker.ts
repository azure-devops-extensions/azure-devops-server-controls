import "VSS/LoaderPlugins/Css!Agile/Admin/AdminHub";

import AgileResources = require("Agile/Scripts/Resources/TFS.Resources.Agile");
import { IClassificationValidationResult } from "Agile/Scripts/Admin/Interfaces";
import { ClassificationControlNodeType } from "Agile/Scripts/Admin/TeamClassificationDataManager";
import { BaseControl, Control } from "VSS/Controls";
import { OpenDropDownOnFocusCombo } from "Presentation/Scripts/TFS/TFS.UI.Controls.OpenDropDownCombo";
import { delegate } from "VSS/Utils/Core";
import Dialogs = require("VSS/Controls/Dialogs");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import TFS_OM_Common = require("Presentation/Scripts/TFS/TFS.OM.Common");
import WITOM = require("WorkItemTracking/Scripts/TFS.WorkItemTracking");
import { TreeNode } from "VSS/Controls/TreeView";
import WorkItemUtility = require("WorkItemTracking/Scripts/Controls/WorkItemForm/Utils");
import Utils_String = require("VSS/Utils/String");
import { RichContentTooltip } from "VSS/Controls/PopupContent";
import { Enhancement } from "VSS/Controls";
import { GUIDUtils } from "Presentation/Scripts/TFS/TFS.Core.Utils";

/** Options for the classification picker */
export interface IClassificationPickerOptions {
    /** Classification type */
    classificationType: ClassificationControlNodeType;
    /** The textual label to display */
    label: string;
    /** The tooltip for the label */
    labelTooltip?: string;
    /** The initial value of the classification path for display in the control */
    classificationPath: string;
    /** Function called when classification path is saved */
    onClassificationSave?: (path: string) => void;
    /** Function called when classification path is changed. Return true if the path is valid. Return false otherwise. */
    onClassificationChange?: (path: string) => IClassificationValidationResult;
    /** Show the control in read only mode */
    disabled?: boolean;
    /** Additional nodes to show at the top level */
    additionalNodes?: string[];
    /** Root node of the classification tree. Optional. If not specified, falls back to the WITOM Project Nodes.
     *  If the page hosting this control allows users to add/edit/delete nodes,
     *  then since the project nodes would be cached already, those are going to be obsolete.
     *  In such a case, the caller should ensure to leverage this option. */
    rootClassificationNode?: any;
}

/** Control used for selecting iteration */
export class ClassificationPicker extends Control<IClassificationPickerOptions> {
    protected _classificationPath: string;

    private _$comboContainer: JQuery;
    private _$errorTip: JQuery;
    private _$textContainer: JQuery;
    private _textContainerTooltip: RichContentTooltip;
    private _$okButton: JQuery;
    private _$cancelButton: JQuery;
    private _combo: OpenDropDownOnFocusCombo;

    constructor(options?: IClassificationPickerOptions) {
        super(options);
        this._classificationPath = options.classificationPath;
    }

    /** OVERRIDE: Refer to Control */
    public initialize() {
        super.initialize();

        this._createHeader();
        this._createSwitchableRegion();
        this._createChangeButton();
    }

    /**
     * Set the classification path 
     * @param path Expects a valid path (does not perform validation)
     */
    public setClassificationPath(path: string, save: boolean = true) {
        this._setClassificationPathText(path);
        this._applyReadMode();
        if (!Utils_String.equals(this._classificationPath, path, true)) {
            this._classificationPath = path;
            if (save && this._options.onClassificationSave) {
                this._options.onClassificationSave(path);
            }
        }
    }

    /**
     * Return the classification path name
     */
    protected getClassificationPath(): string {
        return this._combo ? this._combo.getText() : null;
    }

    /**
     * Cancels the in-progress edit if applicable
     */
    public cancelOperation() {
        if (this._$comboContainer.is(":visible")) {
            this._applyReadMode();
        }
    }

    private _createHeader() {
        const $container = $("<div>");
        const sectionHeaderId = GUIDUtils.newGuid();
        const $sectionHeader = $("<div>").addClass("section-header").text(this._options.label).attr("id", sectionHeaderId);
        $container.append($sectionHeader);

        if (this._options.labelTooltip) {
            const $iconDiv = $("<div>").addClass("section-header-tooltip-icon");
            const $tooltipIcon = $("<i>")
                .addClass("bowtie-icon bowtie-status-info-outline")
                .attr("tabindex", "0")
                .attr("aria-labelledby", sectionHeaderId);

            // Enhance the RichContentTooltip, which displays a tooltip, if the user clicks on the $iconDiv
            // Note: The tooltip content is not accessible via screen readers yet, 
            //       should get fixed once the accessibility pass for the RichContentTooltip control has been completed.
            Enhancement.enhance(RichContentTooltip, $tooltipIcon, {
                cssClass: "rich-content-tooltip auto-width",
                text: this._options.labelTooltip,
                setAriaDescribedBy: true,
                openCloseOnHover: false
            });

            $iconDiv.append($tooltipIcon);
            $container.append($iconDiv);
        }
        this.getElement().append($container);
    }

    private _createSwitchableRegion() {
        var $switchableRegion = $("<div>").addClass("classification-switchable-region").appendTo(this.getElement());
        this._createText($switchableRegion);
        this._createComboContainer($switchableRegion);
        this._createErrorTip($switchableRegion);
    }

    private _createText($container: JQuery) {
        this._$textContainer = $("<div>").addClass("classification-picker-text ellipsis")
            .text(this._classificationPath)
            .appendTo($container);

        this._textContainerTooltip = RichContentTooltip.addIfOverflow(this._classificationPath, this._$textContainer);
    }

    private _createComboContainer($container: JQuery) {
        this._$comboContainer = $("<div>").addClass("classification-picker-combo").appendTo($container);
        this._$comboContainer.hide();
    }

    private _createErrorTip($container: JQuery) {
        this._$errorTip = $("<div>").addClass("input-error-tip").appendTo($container);
        this._$errorTip.hide();
    }

    private _createChangeButton() {
        if (!this._options.disabled) {
            var $container = $("<div>").addClass("classification-picker-change-container").appendTo(this.getElement());
            this._$okButton = $("<a>").attr(
                {
                    "href": "#",
                    "role": "button",
                    "aria-label": this._options.label
                }).appendTo($container)
                .text(AgileResources.WorkAdminHub_ClassificationPicker_Change)
                .click(delegate(this, this._handleOkButtonClick))
                .appendTo($container);
            this._$cancelButton = $("<a>").addClass("cancel").attr(
                {
                    "href": "#",
                    "role": "button",
                    "aria-label": this._options.label
                }).appendTo($container)
                .text(AgileResources.WorkAdminHub_ClassificationPicker_Cancel)
                .click(delegate(this, this.cancelOperation))
                .appendTo($container);
            this._$cancelButton.hide();
        }
    }

    private _setClassificationPathText(path: string) {
        $(".classification-picker-text", this.getElement()).text(path);
    }

    private _handleOkButtonClick() {
        if (this._$comboContainer.is(":visible")) {
            this.setClassificationPath(this.getClassificationPath());
        }
        else {
            this._applyEditMode();
        }
    }

    private _applyEditMode() {
        this._ensureCombo();
        this._combo.setText(this._$textContainer.text());
        this._$comboContainer.show();
        this._$textContainer.hide();
        this._$cancelButton.show();
        this._$okButton.text(AgileResources.WorkAdminHub_ClassificationPicker_Persist);
        this._focusCombo();
    }

    private _applyReadMode() {
        this._$comboContainer.hide();
        this._$textContainer.show();
        this._$cancelButton.hide();
        this._$okButton.text(AgileResources.WorkAdminHub_ClassificationPicker_Change);
        this._enableOkButton();
        this._$okButton.focus();
        this._removeErrorState();

        if (this._textContainerTooltip) {
            this._textContainerTooltip.setTextContent(this._$textContainer.text());
        }
    }

    private _focusCombo() {
        $("input", this._combo.getElement()).focus();
    }

    private _ensureCombo() {
        if (!this._combo) {
            this._combo = <OpenDropDownOnFocusCombo>BaseControl.createIn(
                OpenDropDownOnFocusCombo,
                this._$comboContainer,
                {
                    type: "treeSearch",
                    allowEdit: true,
                    initialLevel: 2,
                    sepChar: "\\",
                    change: delegate(this, this._onChange),
                    setTitleOnlyOnOverflow: true,
                    label: this._options.label
                });

            this._populateClassifications();
        }
        else {
            this._refreshClassifications();
        }
    }

    private _populateClassifications() {
        // If the root node for the classification tree has been specified, use that to populate the combo
        if (this._options.rootClassificationNode) {
            this._setComboSourceFromRootNode();
        }
        else {
            var tfsContext = TFS_Host_TfsContext.TfsContext.getDefault();

            var store = TFS_OM_Common.ProjectCollection.getConnection(tfsContext).getService<WITOM.WorkItemStore>(WITOM.WorkItemStore);
            store.beginGetProject(tfsContext.navigation.project, (project: WITOM.Project) => {
                project.nodesCacheManager.beginGetNodes().then(() => {
                    var rootNode: TreeNode;
                    switch (this._options.classificationType) {
                        case ClassificationControlNodeType.Iteration:
                            rootNode = WorkItemUtility.populateUINodes(project.nodesCacheManager.getIterationNode(true), null, 1);
                            break;
                        case ClassificationControlNodeType.Area:
                            rootNode = WorkItemUtility.populateUINodes(project.nodesCacheManager.getAreaNode(true), null, 1);
                            break;
                    }

                    var nodes: TreeNode[] = [];

                    if (this._options.additionalNodes) {
                        for (var i = 0; i < this._options.additionalNodes.length; i++) {
                            nodes.push(TreeNode.create(this._options.additionalNodes[i]));
                        }
                    }

                    nodes.push(rootNode);

                    this._combo.setSource(nodes);
                }, () => {
                    this._setErrorState(AgileResources.WorkAdminHub_GenericError);
                });
            }, () => {
                this._setErrorState(AgileResources.WorkAdminHub_GenericError);
            });
        }
    }

    private _refreshClassifications() {
        // If the root node for the classification tree has been specified,
        // then we expect that node to be updated, so reset the source for the combo
        if (this._options.rootClassificationNode) {
            this._setComboSourceFromRootNode();
        }
        // No action required in case we are relying on the project nodes, 
        // as that involves a server call, and node change would not be a common scenario in that case
    }

    private _setComboSourceFromRootNode() {
        var rootNode: TreeNode = WorkItemUtility.populateUINodes(this._options.rootClassificationNode, null, 1);
        this._combo.setSource([rootNode]);
    }

    private _onChange() {
        var path = this.getClassificationPath();
        if ($.isFunction(this._options.onClassificationChange)) {
            var validationResult: IClassificationValidationResult = this._options.onClassificationChange(path);
            if (validationResult && !validationResult.valid) {
                this._disableOkButton();
                this._setErrorState(validationResult.errorMessage);
            }
            else {
                this._enableOkButton();
                this._removeErrorState();
            }
        }
    }

    private _setErrorState(errorText?: string) {
        if (this._combo) {
            this._combo.getElement().addClass("invalid");
            var path = this.getClassificationPath();
            if (!errorText) {
                errorText = path ? Utils_String.format(AgileResources.ClassificationPicker_ErrorText_PathNotExist, path) : AgileResources.ClassificationPicker_ErrorText_PathRequired;
            }
            this._$errorTip.text(errorText);
            this._$errorTip.show();
        }
    }

    private _removeErrorState() {
        if (this._combo) {
            this._combo.getElement().removeClass("invalid");
            this._$errorTip.text("");
            this._$errorTip.hide();
        }
    }

    private _enableOkButton() {
        this._$okButton.removeClass("disabled");
        this._$okButton.unbind("click");
        this._$okButton.click(delegate(this, this._handleOkButtonClick));
    }

    private _disableOkButton() {
        this._$okButton.addClass("disabled");
        this._$okButton.unbind("click");
        this._$okButton.click(() => {
            return false;
        });

    }
}

/** Extension of ClassificationPicker, causes a confirmation dialog to appear when changing iterations */
export class IterationPicker extends ClassificationPicker {
    public setClassificationPath(path: string) {
        if (Utils_String.equals(this._classificationPath, path, true)) {
            // No change
            super.setClassificationPath(this._classificationPath);
        }
        else {
            var options = <IClassificationConfirmationDialogOptions>{
                messageHeader: AgileResources.TeamSettings_Iteration_ConfirmationDialogMessageHeader,
                messageContent: Utils_String.format(AgileResources.TeamSettings_Iteration_ConfirmationDialogMessageContent, this.getClassificationPath()),
                okCallback: () => {
                    var path = this.getClassificationPath();
                    super.setClassificationPath(path);
                },
                cancelCallback: () => {
                    super.setClassificationPath(this._classificationPath);
                },
                successCallback: () => { },
                title: AgileResources.TeamSettings_Iteration_ConfirmationDialogTitle
            }

            ClassificationConfirmationDialog.showDialog(options);
        }
    }
}

/** Options for the ClassificationConfirmationDialog used by the IterationPicker */
export interface IClassificationConfirmationDialogOptions extends Dialogs.IConfirmationDialogOptions {
    messageHeader: string;
    messageContent: string;
}

/**
 * Base classification confirmation dialog
 * @class BaseClassificationConfirmationDialog
 */
export class ClassificationConfirmationDialog<TOption extends IClassificationConfirmationDialogOptions> extends Dialogs.ConfirmationDialogO<TOption>{
    constructor(options?: TOption) {
        super(options);
    }

    /**
     * Initialize options
     *
     * @param options options
     */
    public initializeOptions(options?: any) {
        super.initializeOptions($.extend({
            bowtieVersion: 2,
            width: 500,
            height: "auto",
        }, options));
    }

    /**
     * Initialize the control
     */
    public initialize() {
        super.initialize();

        var $container = $("<table>").addClass("classification-confirmation-dialog-content");
        var $row = $("<tr>");
        var $warningIcon = $("<td>").addClass("bowtie-icon bowtie-status-warning");

        $row.append($warningIcon).append(this.getConfirmationMessage());
        $container.append($row);
        this.getElement().append($container);
    }

    /**
    * Gets the current dialog result which will be used when ok button is clicked.
    */
    public getDialogResult() {
        return true;
    }

    /**
     * show confirmation dialog
     * @param refreshRequired if true, refresh warning message will show up in the confimation dialog
     * @param callback callback function for ok button
     */
    public static showDialog(options?: IClassificationConfirmationDialogOptions) {
        var defaultOptions = {
            disposeOnClose: true
        }

        Dialogs.show(this, $.extend(options, defaultOptions));
    }

    /*
     * Override the base getConfirmationMessage method
     * @return The confirmation element
     */
    public getConfirmationMessage(): JQuery {
        var $confirmationMessageArea = $("<td>").addClass("classification-warning-message-area");
        var $confirmationMessageHeader = $("<tr>").addClass("classification-warning-message-header").html(this._options.messageHeader);
        var $confirmationMessageContent = $("<tr>").addClass("classification-warning-message-content").html(this._options.messageContent);
        $confirmationMessageArea.append($confirmationMessageHeader).append("<br>").append($confirmationMessageContent);
        return $confirmationMessageArea;
    }
}
