import "VSS/LoaderPlugins/Css!Dialogs/WorkItemTemplates/WorkItemTemplateEditDialog";
import "VSS/LoaderPlugins/Css!WorkItemArea";

import WITConstants = require("Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants");
import { WebApiTeam } from "TFS/Core/Contracts";
import WIT_Contracts = require("TFS/WorkItemTracking/Contracts");
import { BaseControl, Control } from "VSS/Controls";
import VSSControlsCombos = require("VSS/Controls/Combos");
import Dialogs = require("VSS/Controls/Dialogs");
import { RichContentTooltip } from "VSS/Controls/PopupContent";
import { RichEditor } from "VSS/Controls/RichEditor";
import { Debug } from "VSS/Diag";
import VSS_Resources_Platform = require("VSS/Resources/VSS.Resources.Platform");
import VSS_Telemetry = require("VSS/Telemetry/Services");
import { ProgressAnnouncer } from "VSS/Utils/Accessibility";
import Array_Utils = require("VSS/Utils/Array");
import Utils_Clipboard = require("VSS/Utils/Clipboard");
import Utils_Core = require("VSS/Utils/Core");
import Utils_Number = require("VSS/Utils/Number");
import Utils_String = require("VSS/Utils/String");
import MultiFieldModel = require("WorkItemTracking/Scripts/Controls/Fields/Models/MultiFieldEditModel");
import MultiField = require("WorkItemTracking/Scripts/Controls/Fields/MultiFieldEditControl");
import TemplateMultiEdit = require("WorkItemTracking/Scripts/Controls/Fields/TemplateMultiEditControl");
import {
    getInvariantOperator,
    getInvariantTodayMacro,
    getLocalizedOperator,
    getLocalizedTodayMacro,
    isCurrentIterationMacro,
    isMeMacro,
    isTodayMacro,
} from "WorkItemTracking/Scripts/OM/WiqlOperators";
import WITResources = require("WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking");
import { FieldDefinition } from "WorkItemTracking/Scripts/TFS.WorkItemTracking";
import { BulkOperation } from "WorkItemTracking/Scripts/Utils/BulkOperation";
import { TagUtils } from "WorkItemTracking/Scripts/Utils/TagUtils";
import { WorkItemRichTextHelper } from "WorkItemTracking/Scripts/Utils/WorkItemRichTextHelper";
import { TemplatesTelemetry } from "WorkItemTracking/Scripts/Utils/WorkItemTemplateUtils";

export interface WorkItemTemplateEditDialogOptions extends Dialogs.IModalDialogOptions {
    /**
     * Dataprovider to pass in to field control
     */
    dataProvider: MultiField.IMultFieldEditDataProvider;

    /**
    * Initial template for the dialog
    */
    initialTemplate: PromiseLike<WIT_Contracts.WorkItemTemplate>;

    /**
    * Called when dialog template contents need to be saved, returns a promise with id of the saved template
    */
    saveCallback: (template: WIT_Contracts.WorkItemTemplate, teamId?: string) => IPromise<string>;

    /**
     * Helper to generate url for 'copy template url' experience 
     */
    getNewWorkItemFromTemplateUrl: (template: WIT_Contracts.WorkItemTemplate, teamId?: string) => string;

    /**
     * Flag indicating whether teamPicker should be rendered or not. Default is FALSE
     */
    showTeamPicker?: boolean;

    /**
     * If provided, a team picker is rendered above the name textbox
     */
    teams?: PromiseLike<WebApiTeam[]>;

    /**
    * Wether to show remove unmodified control or not
    */
    allowRemoveUnmodified?: boolean

    /**
    * List of fields modified on host, e.g. modified fields on the work item form
    */
    manuallySetFieldRefNames?: string[];

    /**
     * Page dialog is launched from. Used for Telemetry
     */
    ciFeature?: string;

}

enum DialogState {
    Loading,
    Saving,
    Idle
};

export class WorkItemTemplateEditDialog<TOptions extends WorkItemTemplateEditDialogOptions> extends Dialogs.ModalDialogO<TOptions> {

    public static enhancementTypeName: string = "WorkItemTemplateEditDialog";
    private _$dialogMessageArea: JQuery;
    private _$dialogMessageAreaText: JQuery;

    private _$rootControlsContainer: JQuery;
    private _$nameContainer: JQuery;
    private _$descriptionContainer: JQuery;
    private _fieldsEditControl: TemplateMultiEdit.TemplateMultiEditControl<TemplateMultiEdit.TemplateMultiEditControlOptions>;
    private _commentControl: RichEditor;
    private _initialTemplate: WIT_Contracts.WorkItemTemplate;
    //This is either the initialTemplate or the last saved version of the template
    private _savedTemplate: WIT_Contracts.WorkItemTemplate;
    private _$copyLinkControl: JQuery;
    private _$copyLinkButton: JQuery;
    private _$copyLinkMessage: JQuery;

    private _dialogState: DialogState;
    private _fieldDefinitions: FieldDefinition[];
    private _fieldDefinitionByRefName: IDictionaryStringTo <FieldDefinition> = {};
    private _removeUnmodifiedClicked: boolean;
    private _teams: WebApiTeam[];
    private _selectedTeam: WebApiTeam;
    private _teamPickerCombo: VSSControlsCombos.Combo;

    constructor(options?: WorkItemTemplateEditDialogOptions) {
        super(options);
    }

    /**
     * Initialize options
     * @param options
     */
    public initializeOptions(options?: WorkItemTemplateEditDialogOptions) {
        Debug.assertIsNotNull(options, "Options must be passed in");
        super.initializeOptions($.extend({
            beforeClose: (() => {
                /**
                 * Force close is requried because Dialogs.showMessageDialog is asynchronous.
                 * First time through the confirmation is triggered and then those close is canceled.
                 * If the confirmation is successful then the dialog executes a 2nd close.
                 * During the 2nd close the confirmation prompt would show again if forceClose was not flipped.
                 */
                var forceClose = false;
                return () => {
                    if (!forceClose && this._dialogState !== DialogState.Loading && this._isDirtyFromOriginalTemplate()) {
                        Dialogs.MessageDialog.showMessageDialog(WITResources.WorkItemTemplateDialog_ConfirmClosePrompt).then(
                            () => {
                                forceClose = true;
                                this.close();
                            }
                        );
                        return forceClose;
                    }
                };
            })(),
            cssClass: "workitemtemplate-dialog",
            buttons: {
                "ok": {
                    id: "ok",
                    text: WITResources.DialogSave,
                    click: () => this.onOkClick(),
                    class: "cta",
                    disabled: "disabled"
                },
                "cancel": {
                    id: "cancel",
                    text: WITResources.DialogClose,
                    click: () => this.onCancelClick()
                }
            },
            width: 600,
            minWidth: 450,
            height: 580,
            minHeight: 580
        }, options));
    }

    private _onCopyLink() {
        const teamId = (this._options.showTeamPicker && this._selectedTeam) ? this._selectedTeam.id: Utils_String.empty;
        const templateUrl = this._options.getNewWorkItemFromTemplateUrl(this._savedTemplate, teamId);

        Debug.assertIsString(templateUrl, "Template url cannot be null/undefined");

        Utils_Clipboard.copyToClipboard(templateUrl);

        // in IE the element loses focus after calling copy to clipboard, so manually put focus back to the control.
        Utils_Core.delay(this, 0, () => {
            this._$copyLinkButton.focus();
            this._$copyLinkButton.addClass("bowtie-tooltipped bowtie-tooltipped-sw bowtie-tooltipped-transient");
            this._$copyLinkButton.attr("aria-label", VSS_Resources_Platform.CopiedContentDialogTitle);
        });
    }

    public onClose(e?) {
        this.onCancelClick();
        super.onClose(e);
    }

    public processResult() {
        this._setState(DialogState.Saving);

        let fields = this._getTemplateFields();
        if (fields) {
            fields = this._getInvariantFieldValues(fields);
        }

        let updatedTemplate = <WIT_Contracts.WorkItemTemplate>{
            description: this._$descriptionContainer.val(),
            name: this._$nameContainer.val(),
            id: this._savedTemplate.id,
            workItemTypeName: this._savedTemplate.workItemTypeName,
            fields: fields
        };

        this._publishTelemetry(updatedTemplate);

        this._removeUnmodifiedClicked = false;

        const teamId = (this._teamPickerCombo && this._selectedTeam) ? this._selectedTeam.id: null;
        const savePromise = this._options.saveCallback(updatedTemplate, teamId).then((id) => {
            updatedTemplate.id = id;
            this._savedTemplate = updatedTemplate;
            this._hideError();
            this._setState(DialogState.Idle);
            this._fieldsEditControl.hideRemoveUnmodified();

            if (this._teamPickerCombo) {
                // Note: Once a template is created/saved, its projectId and ownerId cannot change
                // So if the combo control exists, ensure its disabled on successful save
                this._teamPickerCombo.setEnabled(false);
            }
        }, (error: Error) => {
            this._setState(DialogState.Idle);
            this._showError(error.message || WITResources.WorkItemTemplate_FailedToSave);
        });
        // Accessible saving experience
        ProgressAnnouncer.forPromise(savePromise, {
            announceStartMessage: WITResources.WorkItemTemplateDialog_SavingAnnouncerStart,
            announceEndMessage: WITResources.WorkItemTemplateDialog_SavingAnnouncerEnd,
            announceErrorMessage: WITResources.WorkItemTemplateDialog_SavingAnnouncerError
        });
    }

    /**
     * Initializes the dialog.
     */
    public initialize(): void {
        super.initialize();
        this._decorate();
        Debug.assert(!!this._options.initialTemplate, "initialTemplate is required.");

        this._setState(DialogState.Loading);

        Promise.all([this._options.initialTemplate, this._options.teams]).then(
            ([initialTemplate, teams]) => {
                if (initialTemplate) {
                    // Save template
                    this._initialTemplate = initialTemplate;
                    this._savedTemplate = initialTemplate;
                }

                if (this._options.showTeamPicker) {
                    if (!teams || teams.length === 0){
                        this._showError(WITResources.WorkItemTemplateDialog_NoMemberTeamsError);
                        this._teams = [];
                    } else {
                        this._teams = teams.sort((t1, t2) => Utils_String.ignoreCaseComparer(t1.name, t2.name));
                    }
                }

                // Initialize controls
                this._initializeControls();
            },
            (error: Error) => {
                this._savedTemplate = null;
                this._setState(DialogState.Idle);
                this._showError((error && error.message) ? error.message : WITResources.WorkItemTemplate_FailedToLoad);    
            }
        );
    }

    private _publishTelemetry(updatedTemplate: WIT_Contracts.WorkItemTemplate) {
        var props: IDictionaryStringTo<any> = {};
        props[TemplatesTelemetry.PropType] = updatedTemplate.workItemTypeName;
        props[TemplatesTelemetry.RemoveUnmodifiedClicked] = this._removeUnmodifiedClicked;
        if (!updatedTemplate.id) {
            var initial: number = 0;
            var removed: number = 0;
            if (this._initialTemplate && this._initialTemplate.fields) {
                for (var field of Object.keys(this._initialTemplate.fields)) {
                    initial++;
                    if (!updatedTemplate.fields[field]) {
                        removed++;
                    }
                }
            }

            props[TemplatesTelemetry.PropNumOfInitialFields] = initial;
            props[TemplatesTelemetry.PropNumOfRemovedFields] = removed;
        }

        var feature: string;
        if (updatedTemplate.id) {
            feature = TemplatesTelemetry.FeatureReplaceTemplate;
        }
        else {
            feature = this._options.ciFeature ? this._options.ciFeature : TemplatesTelemetry.FeatureCreateTemplate;
        }

        var event: VSS_Telemetry.TelemetryEventData = new VSS_Telemetry.TelemetryEventData(
            TemplatesTelemetry.Area,
            feature,
            props);
        VSS_Telemetry.publishEvent(event);
    }

    private _afterFieldsLoaded(fields: FieldDefinition[]) {
        let fieldChanges: MultiFieldModel.FieldChange[] = [];
        this._fieldDefinitions = fields;
        this._fieldDefinitionByRefName = {};
        let fieldDefinitionByRefName = this._fieldDefinitionByRefName;
        fields.forEach((fd) => {
            fieldDefinitionByRefName[fd.referenceName] = fd;
        });

        if (this._savedTemplate.fields) {
            let localizedFields = this._getLocalizedFieldValues(this._savedTemplate.fields);
            for (let fieldRefName in localizedFields) {
                fieldChanges.push({
                    fieldRefName: fieldRefName,
                    fieldName: fieldRefName,
                    value: localizedFields[fieldRefName]
                });
            }
        }

        if (fieldChanges) {
            this._fieldsEditControl.populateFields(fieldChanges);
        }

        this._setState(DialogState.Idle);
    }

    private _getLocalizedFieldValues(fields: IDictionaryStringTo<string>): IDictionaryStringTo<string> {
        let result: IDictionaryStringTo<string> = {};
        for (let fieldRefName in fields) {
            let value = fields[fieldRefName];
            if (this._isDateField(fieldRefName)) {
                if (isTodayMacro(value, false)) {
                    result[fieldRefName] = getLocalizedTodayMacro(value);
                }
                else {
                    result[fieldRefName] = this._getDateDisplayString(value);
                }
            }
            else if (this._isIdentityField(fieldRefName) && isMeMacro(value, false)) {
                result[fieldRefName] = getLocalizedOperator(value);
            }
            else if (this._isCurrentIterationField(fieldRefName) && isCurrentIterationMacro(value, false)) {
                result[fieldRefName] = getLocalizedOperator(value);
            }
            else if (this._isDoubleField(fieldRefName)) {
                let parsedNumber = Utils_Number.parseInvariant(value);
                if (!isNaN(parsedNumber)) {
                    result[fieldRefName] = Utils_Number.toDecimalLocaleString(parsedNumber);
                }
                else {
                    result[fieldRefName] = value;
                }
            }
            else {
                result[fieldRefName] = value;
            }
        }
        return result;
    }

    private _getInvariantFieldValues(fields: IDictionaryStringTo<string>): IDictionaryStringTo<string> {
        let result: IDictionaryStringTo<string> = {};
        for (let fieldRefName in fields) {
            let value = fields[fieldRefName];
            if (this._isDateField(fieldRefName)) {
                if (isTodayMacro(value, true)) {
                    result[fieldRefName] = getInvariantTodayMacro(value);
                }
                else {
                    result[fieldRefName] = this._getDateDisplayString(value);
                }
            }
            else if (this._isIdentityField(fieldRefName) && isMeMacro(value, true)) {
                result[fieldRefName] = getInvariantOperator(value);
            }
            else if (this._isCurrentIterationField(fieldRefName) && isCurrentIterationMacro(value, true)) {
                result[fieldRefName] = getInvariantOperator(value);
            }
            else if (this._isDoubleField(fieldRefName)) {
                let invariantNumber = Utils_Number.parseLocale(value);                
                if (!isNaN(invariantNumber)) {
                    result[fieldRefName] = invariantNumber.toString();
                }
                else {
                    result[fieldRefName] = value;
                }
            }
            else {
                result[fieldRefName] = value;
            }
        }
        return result;
    }

    private _setState(state: DialogState) {
        this._dialogState = state;
        this._updateUI();
    }

    private _updateUI() {
        switch (this._dialogState) {
            case DialogState.Loading:
                this.showBusyOverlay();
                this._updateCopyLinkButton(false);
                this.updateOkButton(false);
                break;
            case DialogState.Idle:
                this.hideBusyOverlay();
                let isSaveEnabled = !!this._savedTemplate && this._isDirty() && this._isValid();
                this.updateOkButton(isSaveEnabled);
                this._updateCopyLinkButton(!!this._savedTemplate && !!this._savedTemplate.id);
                break;
            case DialogState.Saving:
                this._hideError();
                this.showBusyOverlay();
                this.updateOkButton(false);
                this._updateCopyLinkButton(false);
                break;
        }

        if (this._$nameContainer) {
            if (this._isNameValid()) {
                this._$nameContainer.removeClass("invalid");
            } else {
                this._$nameContainer.addClass("invalid");
            }
        }
    }

    private _initializeCopyLinkControl(): JQuery {
        this._$copyLinkControl = $(`<div class='copy-link-control'></div>`);
        this._$copyLinkButton = $(`<a href='#'><span class='menu-item-icon bowtie-icon bowtie-copy-to-clipboard work-item-template-copy-button'></span>${WITResources.WorkItemTemplateDialog_CopyLink}</a>`).appendTo(this._$copyLinkControl);
        this._$copyLinkButton.attr('role', 'button');

        this._$copyLinkButton.bind("focusout mouseleave", (e: JQueryEventObject) => {
            this._$copyLinkButton.removeClass("bowtie-tooltipped bowtie-tooltipped-sw bowtie-tooltipped-transient");
            this._$copyLinkButton.removeClass(e.type === "focusout" ? "focus" : "hover");
        });

        this._$copyLinkMessage = $("<div>").addClass("copy-link-message").appendTo(this._$copyLinkControl);
        return this._$copyLinkControl;
    }

    private _updateCopyLinkButton(enabled: boolean) {
        if (this._$copyLinkControl && this._$copyLinkButton) {
            if (enabled) {
                RichContentTooltip.add(WITResources.WorkItemTemplateDialog_CopyLinkEnabledMessage, this._$copyLinkControl);
                this._$copyLinkControl.removeAttr('disabled');
                this._$copyLinkButton.removeAttr('tabindex');
                this._$copyLinkButton.attr('aria-disabled', 'false');
                this._$copyLinkMessage.text(WITResources.WorkItemTemplateDialog_CopyLinkEnabledMessage);
                this._$copyLinkButton.click((e: Event) => {
                    this._onCopyLink();
                    e.preventDefault();
                });
            }
            else {
                RichContentTooltip.add(WITResources.WorkItemTemplateDialog_CopyLinkDisabledMessage, this._$copyLinkControl);
                this._$copyLinkControl.attr('disabled', "disabled");
                this._$copyLinkButton.attr('tabindex', '-1');
                this._$copyLinkButton.attr('aria-disabled', 'true');
                this._$copyLinkMessage.text(WITResources.WorkItemTemplateDialog_CopyLinkDisabledMessage);
            }
        }
    }

    private _isNameValid(): boolean {
        return !!this._$nameContainer.val().trim();
    }

    private _isTeamValid(): boolean {
        if (!this._options.showTeamPicker) {
            return true;
        }
        return !!this._selectedTeam;
    }

    private _isValid(): boolean {
        let isValid = this._isNameValid() && this._isTeamValid();
        if (this._fieldsEditControl) {
            isValid = isValid && this._fieldsEditControl.isValid(false);
        }
        return isValid;
    }

    /**
     * Initializes the dialog UI.
     */
    private _decorate() {
        let $element = this._element;
        $element.empty();
        this._$rootControlsContainer = $("<div class='work-item-template-controls-container'>")

        $element.append(this._$rootControlsContainer);
    }

    private _initializeControls() {
        this._createMessageArea(this._element);
        this._$rootControlsContainer
            .append(this._initializeTeamNameControl())
            .append(this._initializeNameControl())
            .append(this._initializeDescriptionControl())
            .append(this._initializeFieldsControl())
            .append(this._initializeCommentControl())
            .append(this._initializeCopyLinkControl());
    }

    /**
     * Initializes the history panel
     */
    private _initializeCommentControl(): JQuery {
        let $container = $("<div class='comment-control'>"),
            commentEditorControlId = "comment-control",
            $commentEditorElement = $("<div>"),
            commentEditorOptions = {
                pageHtml: WorkItemRichTextHelper.getPageHtml(),
                height: "60px",
                id: commentEditorControlId,
                fireOnEveryChange: true,
                internal: true,
                change: () => {
                    this._updateUI();
                },
            };

        this._commentControl = <RichEditor>BaseControl.createIn(RichEditor, $commentEditorElement, commentEditorOptions);

        let comment = "";
        if (this._savedTemplate.fields) {
            comment = this._savedTemplate.fields[WITConstants.CoreFieldRefNames.History] || "";
        }

        this._commentControl.ready(() => {
            this._commentControl.setValue(comment);
        });

        $("<label>")
            .attr("for", this._commentControl.getTextAreaId())
            .append(WITResources.WorkItemTemplateDialog_AddComment)
            .appendTo($container);
        $container.append($commentEditorElement);

        return $container;
    }

    /**
     * Initializes the fields control
     * @return the panel container
     */
    private _initializeFieldsControl(): JQuery {
        let options: TemplateMultiEdit.TemplateMultiEditControlOptions = {
            dataProvider: this._options.dataProvider,
            onChange: () => {
                this._updateUI();
            },
            getUnmodifiedFieldNames: () => { return this._getUnmodifiedFieldNames(); },
            afterFieldsLoaded: (fields) => this._afterFieldsLoaded(fields),
            prependAddRow: true,
            allowRemoveUnmodified: this._options.allowRemoveUnmodified,
        }

        let $container = $("<div class='fields-container'>");
        this._fieldsEditControl = <TemplateMultiEdit.TemplateMultiEditControl<TemplateMultiEdit.TemplateMultiEditControlOptions>>BaseControl.createIn(TemplateMultiEdit.TemplateMultiEditControl, $container, options);

        return $container;
    }

    private _getUnmodifiedFieldNames(): string[] {
        let currentFieldValues = this._getTemplateFields();
        let lastSavedFieldValues = this._savedTemplate.fields;
        let modifiedRefNames: string[] = [];

        this._removeUnmodifiedClicked = true;

        let currentFieldRefNames = Object.keys(currentFieldValues);
        let lastSavedFieldRefNames = Object.keys(lastSavedFieldValues);

        //Get any dialog changes after the last save
        for (let fieldRefName of currentFieldRefNames) {
            if (currentFieldValues[fieldRefName] !== lastSavedFieldValues[fieldRefName]) {
                modifiedRefNames.push(fieldRefName);
            }
        }

        //Union with manuallySetFieldNames to capture changes done on the work item before launching the dialog
        modifiedRefNames = Array_Utils.union(modifiedRefNames, this._options.manuallySetFieldRefNames, Utils_String.ignoreCaseComparer);

        //Get field ref names for unmodified fields
        let unmodifiedFieldRefNames = currentFieldRefNames
            .filter((cfv) => !Array_Utils.contains(modifiedRefNames, cfv, Utils_String.ignoreCaseComparer));

        let fieldDefinitions = this._fieldDefinitions;

        //Get field names for unmodified fields
        let unmodifiedFieldNames = fieldDefinitions
            .filter((f) => Array_Utils.contains(unmodifiedFieldRefNames, f.referenceName, Utils_String.ignoreCaseComparer))
            .map((f) => f.name);

        //Special handling for Tags Add and remove
        let tagsField: FieldDefinition = null;
        if (Array_Utils.contains(unmodifiedFieldRefNames, TagUtils.RemoveTagsPseudoRefName, Utils_String.ignoreCaseComparer)) {
            tagsField = Array_Utils.first(fieldDefinitions, (f) => f.referenceName === TagUtils.RemoveTagsPseudoRefName);
            unmodifiedFieldNames.push(TagUtils.getTagsRemovePseudoFieldName(tagsField.name));
        }

        if (Array_Utils.contains(unmodifiedFieldRefNames, TagUtils.AddTagsPseudoRefName, Utils_String.ignoreCaseComparer)) {
            tagsField = tagsField || Array_Utils.first(fieldDefinitions, (f) => f.referenceName === TagUtils.AddTagsPseudoRefName);
            unmodifiedFieldNames.push(TagUtils.getTagsAddPseudoFieldName(tagsField.name));
        }

        return unmodifiedFieldNames;
    }

    /**
     * Initializes the team name control
     * @return team name container
     */
    private _initializeTeamNameControl(): JQuery {
        if (!this._options.showTeamPicker) {
            // Don't include team picker if the options doesn't have the data
            return;
        }

        const $container = $("<div>").addClass("team-name-container"); 

        $("<label>").addClass("template-team-name-label")
            .attr("for", "team-picker-on-template-edit-dialog")
            .append(WITResources.WorkItemTemplateDialog_TeamName)
            .appendTo($container);

        const $teamNameContainer = $("<div/>").addClass("team-name-picklist");
        const isEnabled = this._teams.length > 0;
        this._teamPickerCombo = <VSSControlsCombos.Combo>Control.createIn(VSSControlsCombos.Combo, $teamNameContainer, {
            source: this._teams.map(t => t.name),
            enabled: isEnabled,
            mode: "drop",
            id: "team-picker-on-template-edit-dialog",
            change: () => {
                const text = this._teamPickerCombo.getValue() as string;

                this._selectedTeam = this._teams.find((
                    (value: WebApiTeam, idx: number, teams: WebApiTeam[]): boolean => {
                        return Utils_String.equals(value.name, text, true);
                    }
                ));

                const isInvalid = !this._selectedTeam;
                this._teamPickerCombo.setInvalid(isInvalid);
                this._updateUI();
            },
            allowEdit: isEnabled,
            isFocusableWhenDisabled: false
        });

        $teamNameContainer.appendTo($container);

        Utils_Core.delay(this, 0, () => {
            this._teamPickerCombo.focus();
        });

        return $container;
    }

    /**
     * Initializes the name control
     * @return the panel container
     */
    private _initializeNameControl(): JQuery {
        let $container = $("<div class='name-container'>");

        $("<label for='nameInput'>").addClass("template-name-label")
            .append(WITResources.WorkItemTemplateDialog_Name)
            .appendTo($container);

        this._$nameContainer = $("<input id='nameInput'/>")
            .keyup(() => {
                this._updateUI();
            })
            .attr("type", "text")
            .appendTo($container)

            if (!this._options.showTeamPicker) {
                Utils_Core.delay(this, 0, () => {
                    $container.find("input:not([disabled])").focus();
                });    
            }
            this._$nameContainer.val(this._savedTemplate.name);

        return $container;
    }

    private _initializeDescriptionControl(): JQuery {
        let $container = $("<div class='description-container'>");

        $("<label for='descriptionInput'>").addClass("description-label")
            .append(WITResources.WorkItemTemplateDialog_Description)
            .appendTo($container);


        this._$descriptionContainer = $("<input id='descriptionInput' />")
            .keyup(() => {
                this._updateUI();
            })
            .attr("type", "text")
            .appendTo($container)

        this._$descriptionContainer.val(this._savedTemplate.description);

        return $container;
    }

    private _isDoubleField(fieldRefName: string): boolean {
        return this._fieldDefinitionByRefName[fieldRefName] &&
            this._fieldDefinitionByRefName[fieldRefName].type === WITConstants.FieldType.Double;
    }

    private _isDateField(fieldRefName: string): boolean {
        return this._fieldDefinitionByRefName[fieldRefName] &&
            this._fieldDefinitionByRefName[fieldRefName].type === WITConstants.FieldType.DateTime;
    }

    private _isIdentityField(fieldRefName: string): boolean {
        return this._fieldDefinitionByRefName[fieldRefName] &&
            this._fieldDefinitionByRefName[fieldRefName].isIdentity;
    }

    private _isCurrentIterationField(fieldRefName: string): boolean {
        return this._fieldDefinitionByRefName[fieldRefName] &&
            this._fieldDefinitionByRefName[fieldRefName].referenceName === WITConstants.CoreFieldRefNames.IterationPath;
    }

    private _getDateValue(displayString: string): string {
        let date = BulkOperation.parseDate(displayString);

        if (!date) {
            return displayString;
        }

        return date.toUTCString();
    }

    private _getDateDisplayString(value: string): string {
        let date = BulkOperation.parseDate(value);

        if (!date) {
            return value;
        }
        return Utils_Core.convertValueToDisplayString(date, "d");
    }

    private _getTemplateFields(): IDictionaryStringTo<string> {
        let fieldChanges = this._fieldsEditControl.getResults();
        let returnValue: IDictionaryStringTo<string> = {};
        if (fieldChanges && fieldChanges.length > 0) {
            for (let fieldChange of fieldChanges) {
                let value = fieldChange.value;
                if (this._isDateField(fieldChange.fieldRefName) && !isTodayMacro(value, true)) {
                    value = this._getDateValue(value);
                }
                returnValue[fieldChange.fieldRefName] = value;
            }
        }

        let comment = null;
        if (this._commentControl.getWindow() && this._commentControl.isReady()) {
            // If the comment control is ready, get the current value.
            comment = this._commentControl.getValue();
        }
        else if (this._savedTemplate.id) {
            // If the comment control is not ready and the current template in the dialog is already saved, then populate the comment from saved template.
            // We are doing this to prevent the updateUI logic from disabling the 'copy link' button when comment control is not ready.
            comment = this._savedTemplate.fields[WITConstants.CoreFieldRefNames.History];
        }

        if (comment) {
            returnValue[WITConstants.CoreFieldRefNames.History] = comment;
        }
        else {
            delete returnValue[WITConstants.CoreFieldRefNames.History];
        }
        return returnValue;
    }

    private _isDirty(): boolean {

        let invariantFieldValues = this._savedTemplate.fields;
        let currentFieldValues = this._getInvariantFieldValues(this._getTemplateFields());

        if (this._savedTemplate.id) {
            // exiting template, there must be a field change or name/description change
            if (this._$nameContainer.val() !== this._savedTemplate.name
                || this._$descriptionContainer.val() !== this._savedTemplate.description
                || this._isDirtyFields(currentFieldValues, invariantFieldValues)) {
                return true;
            }
        } else { // new template
            if (currentFieldValues && Object.keys(currentFieldValues).length > 0) {
                return true;
            }
        }

        return false;
    }

    private _isDirtyFromOriginalTemplate(): boolean {
        if (!this._fieldsEditControl) {
            return false;
        }

        let invariantFieldValues = this._getInvariantFieldValues(this._getTemplateFields());
        return this._isDirtyFields(invariantFieldValues, this._savedTemplate.fields)
    }

    private _isDirtyFields(first: IDictionaryStringTo<string>, second: IDictionaryStringTo<string>): boolean {
        if (!first) {
            first = {};
        }

        if (!second) {
            second = {};
        }

        let firstKeys = Object.keys(first);
        let secondKeys = Object.keys(second);

        if (firstKeys.length !== secondKeys.length) {
            return true;
        }

        for (let key of firstKeys) {
            if (first[key] !== second[key]) {
                return true;
            }
        }

        return false;
    }

    private _createMessageArea($element: JQuery) {

        // Create message area
        this._$dialogMessageArea = $("<div>").addClass("dialog-error-message-area");
        this._$dialogMessageArea.append($("<span>").addClass("icon bowtie-icon bowtie-status-error"));

        // Create Message text area to show the error message
        this._$dialogMessageAreaText = $("<span>").addClass("error-message");
        this._$dialogMessageArea.append(this._$dialogMessageAreaText);
        this._$dialogMessageArea.hide();

        $element.prepend(this._$dialogMessageArea);
    }

    private _showError(message: string) {
        if (!this._$dialogMessageArea) {
            this._createMessageArea(this.getElement());
        }

        this._$dialogMessageAreaText.text(message);
        this._$dialogMessageArea.addClass("has-error");
        this._$dialogMessageArea.show();
    }

    private _hideError() {
        if (this._$dialogMessageArea) {
            this._$dialogMessageArea.removeClass("has-error");
            this._$dialogMessageArea.hide();
        }
    }
}
