import Filters = require("VSS/Controls/Filters");
import MultiField = require("WorkItemTracking/Scripts/Controls/Fields/MultiFieldEditControl");
import MultiEditModel = require("WorkItemTracking/Scripts/Controls/Fields/Models/MultiFieldEditModel");
import WitResources = require("WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking");
import { RichContentTooltip } from "VSS/Controls/PopupContent";

/**
* Options for TemplateMultiEditControl
*/
export interface TemplateMultiEditControlOptions extends MultiField.MultiFieldEditControlOptions {

    /**
    * Wether to show remove unmodified fields control or not.
    */
    allowRemoveUnmodified?: boolean,

    /**
    * Gets list of unmodified fields
    */
    getUnmodifiedFieldNames?: () => string[];
}

/**
 * Override Multi field edit control to add "Remove unmodified" button
 */
export class TemplateMultiEditControl<TOptions extends TemplateMultiEditControlOptions> extends MultiField.MultiFieldEditControl {

    /**
    * Overriding options
    */
    public _options: TOptions = this._options;

    private _$hideUnmodifiedControl: JQuery = null;
    private _showRemoveUnmodified: boolean;

    /**
     * Initialize the options for control. 
     * @param options
     */
    public initializeOptions(options?: TOptions) {
        super.initializeOptions($.extend({
            allowRemoveUnmodified: false,
            getUnmodifiedFieldNames: () => []
        }, options));
        // Options allowRemoveUnmodified represents initial state
        this._showRemoveUnmodified = this._options.allowRemoveUnmodified;
    }

    protected _createClauseTable(): void {
        // Call super to build control
        super._createClauseTable();

        if (this._showRemoveUnmodified) {
            // Add "remove non edited fields" button
            let $addRemove = this.getElement().find("." + Filters.FilterControl.ADD_CLAUSE_ROW_CLASS + " ." + Filters.FilterControl.ADD_REMOVE_CLASS);

            // Create the container div to function as a button
            this._$hideUnmodifiedControl = $("<div>")
                .attr({ tabIndex: 0, role: "button" })
                .addClass("template-edit-hideunmodified")
                .click((e: Event) => {
                    this._removeUnmodifiedClicked();
                    e.preventDefault();
                    //The setFilter call (via _removeUnmodifiedClicked) rebuilds the table and focus is switched back to the body
                    //We explicity switch focus to the link
                    $(".template-edit-hideunmodified").focus();
                });

            // Create Icon and text spans
            let $removeUnmodifiedFieldsIcon =
                $("<span>")
                    .addClass("bowtie-icon bowtie-edit-delete");
            RichContentTooltip.add(WitResources.WorkItemTemplateDialog_RemoveUnmodified, $removeUnmodifiedFieldsIcon);
            let $removeUnmodifiedFieldsText = $("<span/>")
                .addClass("remove-unmodified-text")
                .append(WitResources.WorkItemTemplateDialog_RemoveUnmodified);

            // Append content to container
            this._$hideUnmodifiedControl.append($removeUnmodifiedFieldsIcon);
            this._$hideUnmodifiedControl.append($removeUnmodifiedFieldsText);
            $addRemove.append(this._$hideUnmodifiedControl);

        }
    }

    public hideRemoveUnmodified() {
        if (this._$hideUnmodifiedControl) {
            this._$hideUnmodifiedControl.hide();
            this._showRemoveUnmodified = false;
        }
    }

    public populateFields(fields: MultiEditModel.FieldChange[]) {
        this._model.populateFields(fields);
        this._createClauseTable();
    }

    private _removeUnmodifiedClicked() {
        let fieldNames = this._options.getUnmodifiedFieldNames();
        // Remove the unmodified
        this._model.removeUnmodifiedFields(fieldNames);
        // Refresh the filter view
        this._createClauseTable();
    }
}