import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import Diag = require("VSS/Diag");
import Notifications = require("VSS/Controls/Notifications");
import AdminResources = require("Admin/Scripts/Resources/TFS.Resources.Admin");
import Controls = require("VSS/Controls");
import TFS_Admin_AreaIterations_DataModels = require("Agile/Scripts/Admin/AreaIterations.DataModels");
import TFS_Grid_Adapters = require("Presentation/Scripts/TFS/TFS.UI.Controls.Grid.DataAdapters");
import TFS_SimpleFieldControl = require("Presentation/Scripts/TFS/FeatureRef/SimpleFieldControl");
import { SaveDiscardControl } from "Agile/Scripts/Common/SaveDiscardControl";
import { RichContentTooltip } from "VSS/Controls/PopupContent";


var CssNode = TFS_Admin_AreaIterations_DataModels.CssNode;

export class TeamField {

    /**
     * Create and return a TeamField in a container 
     * 
     * @param container the html element to create the control in
     */
    public static createIn(container: any) {
        Diag.Debug.assert(typeof (container) === "object", "container is required");
        var $container = $(container),
            data = $(".data-content script", $container).eq(0).html(),
            config = null,
            teamField = null;
        if (data) {
            $container.empty();
            config = Utils_Core.parseMSJSON(data, false);
            teamField = new TeamField($container, config);
        }
        return teamField;
    }

    private _$rootElement: any;
    private _$controlsElement: any;
    private _$controlsTable: any;
    private _$addLink: any;
    private _messageControl: any;
    private _$defaultCellText: any;
    private _teamFieldConfig: any;
    private _hasInValidValue: any;
    private _fieldName: any;
    private _fieldNameText: any;
    private _actionUrl: any;
    private _valueControls: any;
    private _isDirty: any;
    private _saveDiscardControl: SaveDiscardControl;
    private _fieldValuesProvider: any;
    private _editable: any;
    private _messageArea: any;

    /**
     * Create a new Team Field Object
     * 
     * @param rootElement the container to use in drawing the controls
     * @param fieldData Field Data returned from server
     */
    constructor(rootElement: JQuery, fieldData: any) {
        Diag.Debug.assert(typeof (rootElement) === "object", "rootElement is required");
        Diag.Debug.assert(typeof (fieldData) === "object", "fieldData is required");
        this._$rootElement = $(rootElement); // get root element
        this._fieldName = fieldData.fieldName; // get field Name
        this._actionUrl = fieldData.url; // url for submit        
        this._teamFieldConfig = fieldData.teamField; // assign team field configuration
        this._editable = fieldData.userHasTeamWritePermission;
        this._fieldValuesProvider = new TFS_Grid_Adapters.FieldDataProvider(fieldData.treeValues || fieldData.listValues, { sort: CssNode.compare }); // create a data provider
        // protect against invalid values
        this._teamFieldConfig.DefaultValueIndex = Math.max(0, Math.min(this._teamFieldConfig.TeamFieldValues.length - 1, this._teamFieldConfig.DefaultValueIndex));
        this._createLayout(); // create layout

    }

    public show() {
        this._$rootElement.show();
    }

    public hide() {
        this._$rootElement.hide();
    }

    /**
     * Create Layout
     */
    private _createLayout() {

        var that = this,
            $layoutTable = null,
            $layoutRow = null,
            $controlCell = null,
            $descriptionSection = null,
            $errorArea = $("<div class='message-area'></div>");

        // span text for the field name
        this._fieldNameText = "<span class='field-name'>" + this._fieldName + "</span>";

        $descriptionSection = $("<div>").addClass("guidance-text").addClass("admin-work-items-guidance");
        $descriptionSection.append("<div>" + Utils_String.format(AdminResources.TeamWorkItem_Line1, this._fieldNameText) + "<br/><br/></div>");

        $descriptionSection.append("<div>" + AdminResources.TeamWorkItem_Line2 + "</div>");
        this._$rootElement.append($descriptionSection);
        this._messageControl = this._messageArea = <Notifications.MessageAreaControl>Controls.Enhancement.enhance(Notifications.MessageAreaControl, $errorArea, {
            closeable: false
        });

        // Create the main table
        $layoutTable = $("<table class ='controls-layout'/>");
        $layoutRow = $("<tr/>");
        $layoutTable.append("<tr><td class='label-cell'>" + AdminResources.TeamWorkItem_FieldLabel + "</td></tr>");
        $controlCell = $("<td/>");

        // The controls container
        this._$controlsElement = $("<div class='field-config-controls'/>");
        $controlCell.append(this._$controlsElement);
        $layoutRow.append($controlCell);

        $layoutTable.append($layoutRow);
        this._$rootElement.append($layoutTable);

        // table to organize the controls
        this._$controlsTable = $("<table class='controls-container' />");
        this._$controlsElement.append(this._$controlsTable);

        // add link
        function addLinkClickHandler() {
            if (!that._hasInValidValue) {
                that._newRow();
            }
            return false;
        }

        let addTeamFieldLinkId = "add-team-field-link";
        this._$addLink = $(`<a role='button' id='${addTeamFieldLinkId}' href='#' class='add-row-link' />`);
        this._$addLink.append(AdminResources.TeamWorkItem_SpecifyAdditionValues);
        this._$addLink.click(addLinkClickHandler);

        let $addIcon = $(`<span role='button' aria-labelledby='${addTeamFieldLinkId}' class='icon action icon-add'/>`).click(addLinkClickHandler);

        this._$controlsElement.append($addIcon);
        this._$controlsElement.append(this._$addLink);

        // Create the save/discard form
        this._saveDiscardControl = SaveDiscardControl.createIn(this._$rootElement, {
            url: this._actionUrl,
            mode: SaveDiscardControl.MODE_AJAXPOST
        });

        // Set the object which will be sent to the server when saved.
        this._saveDiscardControl.setSaveValue(this._teamFieldConfig);
        this._$rootElement.append($errorArea);

        // Initialize the dirty flag ensuring that the buttons are enabled/disabled appropriately.
        this._setDirtyFlag(false);

        this._$defaultCellText = $("<span>" + AdminResources.TeamWorkItem_DefaultValue + "</span>");


        this._drawControls();
    }

    /**
     * Draw the controls rows
     */
    private _drawControls() {

        var i, length;

        this._$controlsTable.empty();
        this._valueControls = [];

        if (!this._teamFieldConfig.TeamFieldValues || this._teamFieldConfig.TeamFieldValues.length === 0) {
            this._newRow();
            this._setDirtyFlag(false); // we are not really dirty here
        }
        else {
            length = this._teamFieldConfig.TeamFieldValues.length;
            for (i = 0; i < length; i += 1) {
                this._addRow(i, this._teamFieldConfig.TeamFieldValues[i]);
            }
        }

        this._updateGlobalError();
    }

    /**
     * Create a new row of data
     */
    private _newRow() {

        var values = this._teamFieldConfig.TeamFieldValues,
            index = 0;

        if (values) {
            index = values.length;
        }
        else {
            this._teamFieldConfig.TeamFieldValues = values = [];
        }
        values.push({
            Value: "",
            IncludeChildren: this._fieldValuesProvider.isTree()
        });
        this._setDirtyFlag(true);
        this._addRow(index, values[index]);
        this._valueControls[this._valueControls.length - 1].focus();
        this._updateGlobalError();
    }

    /**
     * Add a new row to the table and create needed controls
     * 
     * @param index the index of that value in the list
     * @param fieldValue the field value object
     */
    private _addRow(index: number, fieldValue: any) {

        Diag.Debug.assert(typeof index === "number", "index is required");
        Diag.Debug.assert(Boolean(fieldValue), "field Value is required");

        var that = this, combo, $deleteCell, $deleteLink,
            $includeChildrenCell,
            $includeChildrenCheck,
            checkId = "include-children-check" + index,
            radioId = "default-value-radio" + index,
            $row = $("<tr/>"),
            $valueCell = $("<td class='field-value control-cell'></td>"),
            $defaultCell = $("<td class='default-value control-cell'/>"),
            $defaultRadio = $("<input type='radio' class='default-value-radio' name='default-value-radio' id='" + radioId + "' />");

        // add $row to table
        this._$controlsTable.append($row);

        // add the delete link only when the current row is > 0
        $deleteCell = $("<td class='row-delete-cell control-cell'/>");
        if (index > 0) {
            $deleteLink = $("<a href='#' class='row-delete' />");
            $deleteLink.append($("<div class='icon icon-delete' />"));
            $deleteCell.append($deleteLink);

            RichContentTooltip.add(AdminResources.TeamWorkItem_DeleteRow, $deleteLink);

            // add handler to delete row
            $deleteLink.click(function () {
                that._removeRow(index);
            });
        }

        $row.append($deleteCell);

        // Add the combo box
        $row.append($valueCell);
        combo = this._createControl($valueCell, fieldValue);
        combo.setText(fieldValue.Value);
        this._valueControls[index] = combo;

        // Add include children control if this is a tree field
        if (this._fieldValuesProvider.isTree()) {
            $includeChildrenCheck = $("<input type='checkbox' class='include-children-check' id='" + checkId + "' />");
            $includeChildrenCheck.prop("checked", fieldValue.IncludeChildren);
            $includeChildrenCheck.click(function () {
                that._setDirtyFlag(true);
                fieldValue.IncludeChildren = $includeChildrenCheck.prop("checked");
            });

            $includeChildrenCell = $("<td class='include-children control-cell' />");
            $includeChildrenCell.append($includeChildrenCheck);
            $includeChildrenCell.append("<label for='" + checkId + "'>" + AdminResources.TeamWorkItem_UseChildren + "</label>");

            $row.append($includeChildrenCell);
        }

        // Add select default
        $defaultCell.append($defaultRadio);
        $defaultCell.append("<label class='hidden' for='" + radioId + "'>" + AdminResources.TeamWorkItem_DefaultValue + "</label>");
        if (that._teamFieldConfig.DefaultValueIndex === index && that._teamFieldConfig.TeamFieldValues.length > 1) {
            $defaultCell.append(this._$defaultCellText);
        }
        $row.append($defaultCell);
        $defaultRadio.click(function () {
            that._setDirtyFlag(true);
            that._teamFieldConfig.DefaultValueIndex = index;
            $(this).parent().append(that._$defaultCellText);
        });
        // we need to do that after adding to DOM to work around ie7 issue
        $defaultRadio.prop("checked", index === that._teamFieldConfig.DefaultValueIndex);
        this._handleRadioButton();
    }

    /**
     * Handle Show/Hide of first element default radio button
     */
    private _handleRadioButton() {

        var that = this,
            length = that._teamFieldConfig.TeamFieldValues.length;

        // when the length grow to 2 then we need to show the first row default radio
        if (length === 2) {
            $(".default-value-radio:first", this._$controlsTable).each(function () {
                var $object = $(this);
                $object.removeClass("hidden");
                if (that._teamFieldConfig.DefaultValueIndex === 0) {
                    $object.parent().append(that._$defaultCellText);
                }
            });
        }
        else if (length === 1) {
            // if the length is 1 then we need to hide
            $(".default-value-radio:first", this._$controlsTable).addClass("hidden");
        }
    }

    /**
     * Create the Combo control that will display the values
     * 
     * @param controlContainer the object to host the control
     * @param fieldValue the field value object corresponding to this control
     * @return 
     */
    private _createControl(controlContainer: JQuery, fieldValue: any): Controls.BaseControl {

        Diag.Debug.assert(Boolean(controlContainer), "control container is requered");
        Diag.Debug.assert(Boolean(fieldValue), "fieldValue is requered");
        var that = this,
            control = null;

        control = new TFS_SimpleFieldControl.SimpleFieldControl(controlContainer, this._fieldValuesProvider);

        control.attachFieldChanged(function (fieldControl, args) {
            if (args.textValue !== fieldValue.Value) {
                fieldValue.Value = args.textValue;
                that._setDirtyFlag(true);
                that._updateGlobalError();
            }
        });

        return control;
    }

    /**
     * Display an error if a non-valid value selected
     */
    private _updateGlobalError() {
        var i, duplicate, inValid,
            length = this._teamFieldConfig.TeamFieldValues.length,
            showError = false,
            message = null;

        for (i = 0; i < length; i += 1) {
            duplicate = this._isDuplicateBefore(i);
            inValid = !this._fieldValuesProvider.isValidValue(this._teamFieldConfig.TeamFieldValues[i].Value);
            if (duplicate || inValid) {
                if (inValid) {
                    message = message || AdminResources.TeamWorkItem_SelectValidValues;
                }
                else {
                    message = message || AdminResources.TeamWorkItem_DuplicateValue;
                }
                showError = true;
                this._valueControls[i].setInvalid(true);
            }
            else {
                this._valueControls[i].setInvalid(false);
            }
        }

        if (showError) {
            this._messageControl.setError(message);
            this._hasInValidValue = true;
        }
        else {
            this._messageControl.clear();
            this._hasInValidValue = false;
        }

        this._updateButtons();
    }

    /**
     * Set Dirty Flag and update buttons accordingly
     * 
     * @param isDirty dirty flag
     */
    private _setDirtyFlag(isDirty: boolean) {

        this._isDirty = isDirty;
        this._updateButtons();
    }

    /**
     * Update Button Enable/Disable state
     */
    private _updateButtons() {

        var enableButtons = this._editable && this._isDirty;

        this._$addLink.attr("disabled", this._hasInValidValue);
        this._saveDiscardControl.setSaveEnabled(enableButtons && !this._hasInValidValue);
        this._saveDiscardControl.setDiscardEnabled(enableButtons);
    }

    /**
     * Return true if the value at index is duplicate in positions less than index
     * 
     * @param index the index at which to do the check
     */
    private _isDuplicateBefore(index: number) {

        Diag.Debug.assert(typeof (index) === "number", "index required to be a number");

        var i,
            duplicate = false,
            length = this._teamFieldConfig.TeamFieldValues.length,
            values = this._teamFieldConfig.TeamFieldValues;

        Diag.Debug.assert(index < length, "index required to be less than length");

        for (i = 0; i < index && !duplicate; i += 1) {
            duplicate = values[i].Value === values[index].Value;
        }
        return duplicate;
    }

    /**
     * Delete a row of data
     * 
     * @param index the index of the row to delete
     */
    private _removeRow(index: number) {

        Diag.Debug.assert(typeof (index) === "number", "index required to be a number");
        var defaultIndex = this._teamFieldConfig.DefaultValueIndex;

        if (index === defaultIndex) {
            this._teamFieldConfig.DefaultValueIndex = 0;
        }
        else if (index < defaultIndex) {
            this._teamFieldConfig.DefaultValueIndex -= 1;
        }

        // Remove the value from the list
        this._teamFieldConfig.TeamFieldValues.splice(index, 1);

        // Draw the controls
        this._drawControls();
        this._setDirtyFlag(true);
    }
}
