// tslint:disable:member-ordering
/// <reference types="jquery" />
import "VSS/LoaderPlugins/Css!Agile";

import { SprintLineManager } from "Agile/Scripts/Backlog/Forecasting/SprintLineManager";
import * as AgileProductBacklogResources from "Agile/Scripts/Resources/TFS.Resources.AgileProductBacklog";
import * as TFS_FormatUtils from "Presentation/Scripts/TFS/FeatureRef/FormatUtils";
import * as TFS_OM_Common from "Presentation/Scripts/TFS/TFS.OM.Common";
import * as Controls from "VSS/Controls";
import * as Combos from "VSS/Controls/Combos";
import * as Validation from "VSS/Controls/Validation";
import * as Diag from "VSS/Diag";
import * as Utils_Core from "VSS/Utils/Core";
import * as Utils_Number from "VSS/Utils/Number";
import * as Utils_UI from "VSS/Utils/UI";
import { initClassPrototype } from "VSS/VSS";
import { BacklogConstants } from "Agile/Scripts/Generated/HubConstants";

const delegate = Utils_Core.delegate;
const ContextUtils = TFS_OM_Common.ContextUtils;
const FormatUtils = TFS_FormatUtils.FormatUtils;

export class VelocityInputControl {
    public static CSS_FORECASTING_INPUT_CONTROL_TABLE: string = "forecasting-input-control-table";
    public static CSS_FORECASTING_INPUT_CONTROL_DISABLED_MESSAGE_ROW: string = "forecasting-input-control-disabled-message-row";
    public static CSS_FORECASTING_INPUT_LABEL: string = "forecasting-input-label";
    public static CSS_FORECASTING_INPUT_CONTROL: string = "forecasting-input-control";
    public static CSS_FORECASTING_INPUT_CONTROL_TEXT: string = "forecasting-input-control-text";
    public static CSS_FORECASTING_INPUT_CONTROL_TEXT_HOVER: string = "forecasting-input-control-text-hover";
    public static COMBO_CONTROL_ID: string = "velocityInput";
    public static DECIMAL_PRECISION: number = 2;

    private _$container: JQuery;
    private _comboControl: Combos.Combo;
    private _$inputContainer: JQuery;
    private _$noComboDiv: JQuery;
    private _currentValidValue: number;
    private _validator: Validation.IntegerRangeValidator<Validation.IntegerRangeValidatorOptions>;
    private _sprintLineManager: SprintLineManager;
    private _processComboRemovalDelegate: any;
    private _comboVisible: boolean;
    private _teamId: string;

    /**
     * Manages the input of expected velocity as it relates to forecasting lines
     * @param $element The container to create the control in
     * @param teamId Id of the team
     * @param sprintLineManager The SprintLineManager instance this velocity input drives
     * @param sprintVelocity The sprint velocity
     */
    constructor($element: JQuery, teamId: string, sprintLineManager: SprintLineManager, sprintVelocity?: number) {
        Diag.Debug.assertParamIsObject($element, "$element");
        Diag.Debug.assertParamIsObject(sprintLineManager, "sprintLineManager");

        this._$container = $element;
        this._teamId = teamId;
        this._sprintLineManager = sprintLineManager;

        if (sprintVelocity !== 0 && !sprintVelocity) {
            const $island = $("script.sprint-forecast-velocity");
            sprintVelocity = Number(Utils_Core.parseMSJSON($island.eq(0).html(), false));
            $island.empty();
        }

        this._initialize(sprintVelocity);
    }

    /** Get the JQuery element for the control */
    public getElement(): JQuery {
        return this._$container;
    }

    /** Dispose this element */
    public dispose() {
        if (this._$container) {
            this._$container.empty();
            this._$container = null;
        }
        if (this._$inputContainer) {
            this._$inputContainer.empty();
            this._$inputContainer = null;
        }
        if (this._$noComboDiv) {
            this._$noComboDiv.empty();
            this._$noComboDiv = null;
        }
    }

    /**
     * Creates the table structure that will house the velocity input label and control
     */
    private _initialize(velocity: number) {

        // Save off the previous valid value for when we need to revert (e.g. user enters invalid value)
        this._currentValidValue = velocity;

        // Tell the SprintLineManager instance
        this._sprintLineManager.setSprintVelocity(velocity);

        // Create the table and append to DOM
        const $table = $("<table/>").addClass(VelocityInputControl.CSS_FORECASTING_INPUT_CONTROL_TABLE);
        let $tr = $("<tr/>");
        $tr.append(this._createLabelCell());
        $tr.append(this._createInputCell(velocity));
        $table.append($tr);
        $tr = $("<tr/>")
            .addClass(VelocityInputControl.CSS_FORECASTING_INPUT_CONTROL_DISABLED_MESSAGE_ROW)
            .append($("<td>").text(AgileProductBacklogResources.Forecast_MessageDisabledWhileFiltering));
        $table.append($tr);
        this._$container.append($table);
    }

    /**
     * Creates the label table cell and contents
     * 
     * @return The table cell that will contain the velocity input label
     */
    private _createLabelCell(): JQuery {
        return $("<td/>")
            .append(
                $("<label>" + AgileProductBacklogResources.Forecast_VelocityLabel + "</label>")
                    .attr("for", VelocityInputControl.COMBO_CONTROL_ID + "_txt")
                    .addClass(VelocityInputControl.CSS_FORECASTING_INPUT_LABEL)
                    .attr("id", "forecast-input-label-id")
            );
    }

    /**
     * Creates the input table cell and contents
     * @param velocity The velocity value. This is sent from the server
     * @return The table cell that will contain the velocity input control
     */
    private _createInputCell(velocity: number): JQuery {
        Diag.Debug.assertParamIsNumber(velocity, "velocity");

        return $("<td />").append(this._createInputControl(velocity));
    }

    /**
     * Constructs the input control in its initial state. That is, displaying the forecast velocity. Clicking
     * this velocity area will show an input area allowing the user to change the velocity.
     * @param velocity The velocity value. This is sent from the server
     */
    private _createInputControl(velocity: number): JQuery {
        Diag.Debug.assertParamIsNumber(velocity, "velocity");

        let comboShowing = false;
        const showComboDelegate = delegate(this, () => {
            if (!comboShowing) {
                comboShowing = true;
                this._showCombo();
                comboShowing = false;
            }
        });

        this._$inputContainer = $("<div/>");

        this._$noComboDiv = $("<div/>")
            .text(FormatUtils.formatNumberForDisplay(velocity, VelocityInputControl.DECIMAL_PRECISION))
            .addClass(VelocityInputControl.CSS_FORECASTING_INPUT_CONTROL)
            .addClass(VelocityInputControl.CSS_FORECASTING_INPUT_CONTROL_TEXT)
            .attr("role", "edit")
            .attr("aria-labeledby", "forecast-input-label-id")
            .attr("tabindex", "0")
            .focusin(showComboDelegate)
            .click(showComboDelegate);

        this._$container.bind("mouseover", () => {
            this._$noComboDiv.addClass(VelocityInputControl.CSS_FORECASTING_INPUT_CONTROL_TEXT_HOVER);
        })
            .bind("mouseout", () => {
                this._$noComboDiv.removeClass(VelocityInputControl.CSS_FORECASTING_INPUT_CONTROL_TEXT_HOVER);
            });

        // Append the velocity display div to the input container
        this._$inputContainer.append(this._$noComboDiv);

        return this._$inputContainer;
    }

    /**
     * Create an instance of the Combo control. Should only be called once (when the user first clicks or navigates to the velocity display area)
     */
    private _createComboControl() {
        let $input;
        let $comboElement;

        this._comboControl = <Combos.Combo>Controls.BaseControl.createIn(Combos.Combo, $("<div/>"), {
            id: VelocityInputControl.COMBO_CONTROL_ID,
            mode: "text",
            cssClass: VelocityInputControl.CSS_FORECASTING_INPUT_CONTROL
        });

        // Get the input element so we can add validation below
        $comboElement = this._comboControl.getElement();
        $input = $("input", $comboElement);

        // Add attributes that enable the use of the validator
        $input.addClass("validate integerRange");

        // Create the validator for use with the Combo input element
        this._validator = <Validation.IntegerRangeValidator<Validation.IntegerRangeValidatorOptions>>Controls.Enhancement.enhance(Validation.IntegerRangeValidator, $input, {
            minValue: 1,
            maxValue: 99999
        });

        // When we create the Combo control we need to initialize the value to the value that came from the server
        this._comboControl.setText(this._currentValidValue ? this._currentValidValue.toString() : null);

        $comboElement.bind("keydown", delegate(this, this._onInputKeyDown));
    }

    /**
     * Replaces the velocity display element with an editable Combo to allow the user to change the velocity
     */
    private _showCombo() {
        let $comboElement;

        // No need to do anything if the Combo is already shown. Note that this is here to circumvent a double event fire problem in IE9
        if (!this._comboVisible) {
            // Only ever create one instance of the Combo control. We will reuse it as the user continues to click the input area.
            if (!this._comboControl) {
                this._createComboControl();
            }

            // Get the containing jQuery element from the control
            $comboElement = this._comboControl.getElement();

            // Replace the velocity display div with the Combo's container
            this._$noComboDiv.detach();
            this._$inputContainer.append($comboElement);

            // Set focus on the input element
            $("input", $comboElement).focus();

            // We need to bind focusout just-in-time in order to work around Chrome/Firefox bug where multiple focusout's fire
            $comboElement.bind("focusout", this._getProcessRemovalDelegate());

            this._comboVisible = true;
        }
    }

    /**
     * Replaces the editable Combo with the original velocity display area
     */
    private _removeCombo() {
        const $comboElement = this._comboControl.getElement();

        // We need to unbind focusout just-in-time in order to work around Chrome/Firefox bug where multiple focusout's fire
        $comboElement.unbind("focusout", this._getProcessRemovalDelegate());
        $comboElement.detach();

        this._$inputContainer.append(this._$noComboDiv);

        this._comboVisible = false;
    }

    /**
     * Handler for Combo input keyDown event
     * @param event Event arguments
     */
    protected _onInputKeyDown(event: any) {
        if (event.keyCode === Utils_UI.KeyCode.ENTER || event.keyCode === Utils_UI.KeyCode.TAB) {
            this._processComboRemoval();
        } else if (event.keyCode === Utils_UI.KeyCode.ESCAPE) {
            this._revertVelocity();
            this._removeCombo();
        } else {
            // Validate needs to be executed after a timeout to allow the Combo control's inner input element to get the correct value prior to validation
            Utils_Core.delay(this, 0, function () {
                this._validator.validate(); // Validate the input on each keystroke that does not switch the Combo out
            });
        }
    }

    private _processComboRemoval() {

        /**
         * Called when the user has taken an action to remove the Combo. This could be a key press or taking focus away from the Combo control
         */
        Diag.logTracePoint("VelocityInputControl._processComboRemoval.start");

        if (this._validator.isValid()) {
            this._saveVelocity();
        } else {
            this._revertVelocity();
        }

        // Hiding the combo and showing the display text needs to be done on a timeout in order to allow
        // the browser to handle events before doing the DOM manipulation. An example of this problem is
        // tabbing backwards from the text input control causes an infinite UI interaction loop where
        // the user cannot seemingly back tab out of the text input control.
        Utils_Core.delay(this, 0, function () {
            this._removeCombo();
        });

        Diag.logTracePoint("VelocityInputControl._processComboRemoval.complete");
    }

    /**
     * Constructs or gets the delegate for processing Combo removal
     */
    private _getProcessRemovalDelegate(): (...args: any[]) => any {
        if (!$.isFunction(this._processComboRemovalDelegate)) {
            this._processComboRemovalDelegate = delegate(this, this._processComboRemoval);
        }

        return this._processComboRemovalDelegate;
    }

    /**
     * Persists the velocity input to the server
     */
    private _saveVelocity() {
        const velocity = Utils_Number.parseLocale(this._comboControl.getText());

        // Persist the velocity to the server
        ContextUtils.saveTeamUserNumberSetting(
            this._teamId, BacklogConstants.SprintForecastVelocity, velocity);

        // Set the display velocity elements text so that it has the correct value when we place it back in the DOM
        this._setDisplayVelocity(velocity);

        // Tell the SprintLineManager instance the new velocity
        this._sprintLineManager.setSprintVelocity(velocity);

        // Set this value as the last valid value in case we need to revert on next edit
        this._currentValidValue = velocity;
    }

    /**
     * Reverts the velocity input to the previous value
     */
    private _revertVelocity() {
        this._setDisplayVelocity(this._currentValidValue);
        // Need to trigger validation again to ensure the invalid state is removed from the Combo control. Otherwise we
        // end up seeing the results of that invalid state show up visually (e.g. the textbox turns yellow) next time we switch to the Combo
        this._validator.validate();
    }

    /**
     * Sets the display velocity. That is, the velocity that will display to the user when the Combo control is removed and replaced with the noComboDiv
     * @param velocity The sprint forecast velocity
     */
    private _setDisplayVelocity(velocity: number) {
        Diag.Debug.assertParamIsNumber(velocity, "velocity");

        this._$noComboDiv.text(velocity);
        this._comboControl.setText(velocity.toString());
    }
}

initClassPrototype(VelocityInputControl, {
    _$container: null,
    _comboControl: null,
    _$inputContainer: null,
    _$noComboDiv: null,
    _currentValidValue: null,
    _validator: null,
    _sprintLineManager: null,
    _processComboRemovalDelegate: null,
    _comboVisible: false
});