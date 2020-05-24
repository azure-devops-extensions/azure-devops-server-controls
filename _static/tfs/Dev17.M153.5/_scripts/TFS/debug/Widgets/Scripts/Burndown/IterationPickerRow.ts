import "VSS/LoaderPlugins/Css!Widgets/Styles/IterationPicker";

import * as Q from "q";

import * as Controls from "VSS/Controls";
import * as Utils_Array from "VSS/Utils/Array";
import * as Utils_String from "VSS/Utils/String";
import * as Utils_UI from "VSS/Utils/UI";
import * as DateUtils from "VSS/Utils/Date";
import { TreeNode } from "VSS/Controls/TreeView";

import { SettingsField } from 'Dashboards/Scripts/SettingsField';
import { ErrorMessageControl } from "Dashboards/Scripts/ErrorMessageControl";
import { TimePeriodPickerValues } from 'Widgets/Scripts/Burndown/TimePeriodPickerValues';
import { TimePeriodConfiguration, DateSampleInterval } from 'Widgets/Scripts/Burndown/BurndownSettings';
import { TypedCombo, TypedComboO } from "Widgets/Scripts/Shared/TypedCombo";

import { Iteration } from 'Analytics/Scripts/CommonClientTypes';

import { TimePeriodHelper } from 'Widgets/Scripts/Burndown/TimePeriodHelper';

import * as WidgetResources from "Widgets/Scripts/Resources/TFS.Resources.Widgets";


export interface IterationPickerRowOptions {
    /** constant list of all iterations that won't be tested against date changes */
    allIterations: Iteration[];

    /** iteration path to display **/
    iterationPath: string;

    /** callback to handle change in the row **/
    onChange: () => void;

    /** callback to handle the case when the picker is removed */
    onDelete: (picker: IterationPickerRow) => void;

    /** callback to handle when an iteration row is selected */
    onIterationChange: () => void;
}

export class IterationPickerRow extends Controls.Control<IterationPickerRowOptions> {
    public static rowCssClass = "iteration-picker-row";
    public static removeRowCssClass = "iteration-picker-remove-row";
    public static IterationRowRowItemCssClass = "iteration-picker-row-item";
    public static dateDateFieldCssClass = "iteration-picker-date";

    public iterationPickerCombo: IterationsPickerCombo;

    public $DateField: JQuery;
    public $removeRowButton: JQuery;

    /** Iterations picker + supporting Settings Field */
    public iterationPickerBlock: SettingsField<IterationsPickerCombo>;

    private _$row: JQuery;

    private allIterations: Iteration[];

    public initializeOptions(options?: IterationPickerRowOptions) {
        super.initializeOptions($.extend({
            coreCssClass: IterationPickerRow.rowCssClass
        }, options));

        this.allIterations = this._options.allIterations;
    }

    public initialize() {
        super.initialize();

        const $container = this.getElement();
        this._$row = $("<div>");

        this.drawIterationPicker();
        this.drawDateField();
        this.drawRemoveRowButton();

        if (this._options.iterationPath) {
            this.iterationPickerBlock.control.setText(this._options.iterationPath);
            this.setDateField();
        }

        $container.append(this._$row);
    }

    public setSource(iterationTree: TreeNode[]) {
        this.iterationPickerCombo.setSource(iterationTree);
    }

    public getName(): string {
        return "IterationPickerRow";
    }

    public getSettings(): Iteration {
        let selectedIterationPath = this.getIterationPathName();
        let selectedIteration = TimePeriodHelper.getSelectedIterationFromPath(selectedIterationPath, this.allIterations);

        if (selectedIteration) {
            return selectedIteration;
        } else {
            return null;
        }
    }

    public getIterationPathName(): string {
        return this.iterationPickerCombo.getText();
    }

    private drawIterationPicker() {
        this.iterationPickerCombo = TypedCombo.create(
            IterationsPickerCombo,
            this._$row,
            {
                cssClass: "iteration-picker-control",
                placeholderText: WidgetResources.TimePeriod_IterationsHeader,
                mode: "drop",
                type: "treeSearch",
                allowEdit: true,
                change: () => {
                    this._options.onChange();
                    this._options.onIterationChange();
                    this.setDateField();
                }
            }
        );

        this.iterationPickerBlock = SettingsField.createSettingsField({
            control: this.iterationPickerCombo,
            hasErrorField: true
        }, this._$row);

        this.iterationPickerBlock.getElement().addClass(IterationPickerRow.IterationRowRowItemCssClass);
    }

    private drawRemoveRowButton() {
        this.$removeRowButton = $("<div>")
            .attr("role", "button")
            .attr("aria-label", WidgetResources.TimePeriod_IterationsRemoveLabel)
            .addClass(IterationPickerRow.removeRowCssClass + " iteration-picker-delete-disabled bowtie-icon bowtie-edit-delete")
            .on("click", () => {
                this._options.onDelete(this);
            });

        Utils_UI.accessible(this.$removeRowButton);
        this._$row.append(this.$removeRowButton);
    }

    private drawDateField() {
        let placeholderText: string = "";
        this.$DateField = $("<div>")
            .attr("role", "textbox")
            .addClass("bowtie")
            .addClass(IterationPickerRow.dateDateFieldCssClass)
            .text(placeholderText);
        this._$row.append(this.$DateField);
    }

    private setDateField() {
        let currentIterationValue = this.iterationPickerBlock.control.getText();
        let dateString = TimePeriodHelper.getEndDateOfIteration(this.allIterations, currentIterationValue);
        this.$DateField.text(dateString);
    }
}

export class IterationsPickerCombo extends TypedCombo<TreeNode> {
}