/// <reference types="jquery" />

import Annotations = require("Agile/Scripts/Card/CardsAnnotationsCommon");
import AgileControlsResources = require("Agile/Scripts/Resources/TFS.Resources.AgileControls");
import Boards = require("Agile/Scripts/TFS.Agile.Boards");
import Diag = require("VSS/Diag");
import Utils_String = require("VSS/Utils/String");
import { IBacklogLevelConfiguration } from "Presentation/Scripts/TFS/FeatureRef/BacklogConfiguration/Service";
import { RichContentTooltip } from "VSS/Controls/PopupContent";

export interface IChecklistAnnotationBadgeOptions extends Annotations.IAnnotationBadgeOptions {
    /**
     * The method check whether the work item is completed or not.
     */
    isComplete: IArgsFunctionR<boolean>;

    /**
     * BacklogCategoryConfiguration of the backlog work items for which Checklist control will be created
     */
    backlogConfiguration: IBacklogLevelConfiguration;

    /**
     * WorkItemType of the Annotation represented by this adapter. Only unique when feature flag enabled.
     */
    workItemType?: string;
}

export class ChecklistAnnotationBadge extends Annotations.AnnotationBadge {
    private _$summaryText: JQuery;
    private _summaryTooltip: RichContentTooltip;
    private _$errorMessageIcon: JQuery;
    private _errorMessageTooltip: RichContentTooltip;

    /**
     * Refreshes the badge control with updated data.
     * @param {Boards.Item[]} source
     */
    public update(source: Boards.Item[]): void {
        super.update(source);
        this._updateSummary(source);
    }

    public createLayout(): void {
        super.createLayout();

        this._$errorMessageIcon = $("<div>").addClass("error-message-icon bowtie-icon bowtie-status-error");
        this.$container[0].appendChild(this._$errorMessageIcon[0]);
        this._$summaryText = $("<span>").addClass("work-item-summary-text");
        this.$container[0].appendChild(this._$summaryText[0]);
    }

    public dispose(): void {
        super.dispose();
        if (this._errorMessageTooltip) {
            this._errorMessageTooltip.dispose();
            this._errorMessageTooltip = null;
        }

        if (this._summaryTooltip) {
            this._summaryTooltip.dispose();
            this._summaryTooltip = null;
        }
    }

    private _updateSummary(items: Boards.Item[]): void {
        /// <summary>Update the current summary text for the control.</summary>
        /// <param name="items" type="Array" elementType="Boards.Item">The source items.</param>
        Diag.Debug.assertIsNotNull(items, "items");
        let totalCount = 0;

        for (let i = 0, len = items.length; i < len; i++) {
            if (items[i].id() > 0) {
                totalCount++;
            }
        }
        let completedCount = this._getCompletedItemCount(items);
        let workItemTypeDisplayName = (<IChecklistAnnotationBadgeOptions>this._options).workItemType + "s";
        let tooltipText = Utils_String.format(AgileControlsResources.Checklist_Summary_Tooltip, completedCount, totalCount, workItemTypeDisplayName);
        this._$summaryText
            .text(Utils_String.format(AgileControlsResources.Checklist_Summary, completedCount, totalCount));
        if (this._summaryTooltip) {
            this._summaryTooltip.setTextContent(tooltipText);
        }
        else {
            this._summaryTooltip = RichContentTooltip.add(tooltipText, this.$container, { setAriaDescribedBy: true });
        }
        let errorMessage = this._getErrorMessage(items);
        if (this._errorMessageTooltip) {
            this._errorMessageTooltip.setTextContent(errorMessage);
        }
        else {
            this._errorMessageTooltip = RichContentTooltip.add(errorMessage, this._$errorMessageIcon, { setAriaDescribedBy: true });
        }
        if (errorMessage) {
            // JQuery's toggle function sets the display to block, so set it to inline-block explicitly, instead of using "toggle(this._hasError)"
            this._$errorMessageIcon.addClass("show");
        }
        else {
            this._$errorMessageIcon.removeClass("show");
        }
    }

    private _getCompletedItemCount(items: Boards.Item[]): number {
        var completedItemCount = 0;

        $.each(items, (index, item) => {
            if ((<IChecklistAnnotationBadgeOptions>this._options).isComplete(item)) {
                completedItemCount += 1;
            }
        });
        return completedItemCount;
    }

    private _getErrorMessage(items: Boards.Item[]): string {
        // Show the first error message, in case of multiple errors
        var message: string;
        for (var i = 0, len = items.length; i < len; i++) {
            message = items[i].message();
            if (message) {
                break;
            }
        }
        return message;
    }
}
