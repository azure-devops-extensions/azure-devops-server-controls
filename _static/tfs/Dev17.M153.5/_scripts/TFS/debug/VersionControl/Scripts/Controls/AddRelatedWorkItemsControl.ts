import Q = require("q");
import Controls = require("VSS/Controls");
import * as CustomerIntelligenceConstants from "VersionControl/Scripts/CustomerIntelligenceConstants";
import VCResources = require("VersionControl/Scripts/Resources/TFS.Resources.VersionControl");
import MentionPickerControl = require("Mention/Scripts/TFS.Mention.Controls.Picker");
import MentionAutocomplete = require("Mention/Scripts/TFS.Mention.Autocomplete");
import Telemetry = require("VSS/Telemetry/Services");

export interface IAddRelatedWorkItemsControlOptions extends Controls.EnhancementOptions {
    hostArtifactId: string;
    contextId?: string;
    onWorkItemAdd?: IFunctionPR<number, void>;
    checkWorkItemExists?: IFunctionPR<number, boolean>;
    dropIconCss?: string;

    /**
     * The "aria-labelledby" property to set for this control.
     */
    ariaLabelledBy?: string;
}

/**
 * Control that uses the mention work item picker to allow users to select work items
 */
export class AddRelatedWorkItemsControl extends Controls.BaseControl {
    private _$inputBox: JQuery;
    private _$dropIcon: JQuery;
    private _$inputTextBox: JQuery;

    public initialize() {
        super.initialize();

        const self = this;
        const $container = this._element;
        const dropIconCss = this._options.dropIconCss || "bowtie-triangle-down";
        this._$inputBox = $('<div class="vc-pullrequest-view-details-relatedartifacts-addartifactbox-container" />');
        this._$inputTextBox = $(`<input type="text" class="vc-pullrequest-view-details-relatedartifacts-addartifactbox textbox-input" placeholder="${VCResources.PullRequest_RelatedArtifactsAddWatermark}" aria-label="${VCResources.PullRequest_RelatedWorkItemsTitle}" />`).appendTo(this._$inputBox);

        this._$inputTextBox.attr("role", "combobox")
            .attr("aria-autocomplete", "list")
            .attr("aria-expanded", "false");

        if (this._options.ariaLabelledBy) {
            this._$inputTextBox.attr("aria-labelledby", this._options.ariaLabelledBy);
        }

        this._$dropIcon = $(`<div role="button" aria-label="${VCResources.RelatedWorkItems_ChevronLabel}" class="drop-icon bowtie-icon ${dropIconCss}"/>`).appendTo(this._$inputBox);

        if (this._$inputTextBox != null && this._$inputTextBox.length > 0) {
            const mentionPicker = <MentionPickerControl.MentionPickerEnhancement>Controls.Enhancement.enhance(MentionPickerControl.MentionPickerEnhancement,
                self._$inputTextBox,
                {
                    mentionType: MentionAutocomplete.MentionType.WorkItem,
                    dropDown: this._$dropIcon,
                    open: (range) => {
                        this._$inputTextBox.attr("aria-expanded", "true");
                    },
                    close: () => {
                        this._$inputTextBox.attr("aria-expanded", "false");
                    },
                    select: (replacement) => {
                        const wasValid = self._validateAndCreateWorkItemLink(replacement.getPlainText().textBeforeSelection);
                        if (wasValid) {
                            //if the text box was empty (because the user just clicked on the box and then on a work item),
                            //lose focus so that they can repeat that behavior.
                            //Otherwise, select the text so that the user can begin typing again for a new work item.
                            //The reason we don't clear the box is because if we clear and don't lose focus, the popup immediately re-appears
                            //and this blocks the user's view of their newly added work item which can give the illusion that nothing was added.
                            const typedText = self._$inputTextBox.val();
                            const emptyText = typedText === "";
                            if (emptyText) {
                                // do nothing, leave focus as it is
                            }
                            else {
                                self._$inputTextBox.select();
                            }

                            const executedEvent = new Telemetry.TelemetryEventData(
                                CustomerIntelligenceConstants.VERSION_CONTROL_AREA,
                                CustomerIntelligenceConstants.RELATED_WORK_ITEMS_ADD, {
                                    "contextId": this._options.contextId || "",
                                    "hostArtifactId": this._options.hostArtifactId,
                                    "hasTypedText": !emptyText,
                                    "typedTextIsANumber": !emptyText && !isNaN(typedText)
                                });
                            Telemetry.publishEvent(executedEvent);
                        }
                    },
                }
            );
        }

        $container.append($(`<div></div>`)).append(this._$inputBox);
    }

    /**
     * This method will show/hide the text box and can also focus on the input
     * @param shouldTextBoxDisplay - If this is true, show the text box, if it is false hide the textbox
     * @param focusOnShow - If this is true, we want to focus on the text box when it is shown
     */
    public showTextBox(shouldTextBoxDisplay: boolean, focusOnShow?: boolean) {
        if (shouldTextBoxDisplay) {
            this._$inputBox.show();
            if (focusOnShow) {
                this._$inputTextBox.click();
                this._$inputTextBox.focus();
            }
        }
        else {
            this._$inputBox.hide();
        }
    }

    //returns whether the string was a valid work item identifier
    protected _validateAndCreateWorkItemLink(textVal: string): boolean {
        if (textVal == null || textVal.length <= 0) {
            return false;
        }

        let workItemId = +textVal;
        if (textVal[0] == '#') {
            workItemId = +textVal.substr(1);
        }

        if (isNaN(workItemId) || (workItemId % 1 != 0)) {
            return false;
        }

        if (this._options.checkWorkItemExists && this._options.checkWorkItemExists(workItemId)) {
            //we already have this work item. No need to do anything
            return true;
        }

        if (this._options.onWorkItemAdd) {
            this._options.onWorkItemAdd(workItemId);
        }

        return true;
    }
}