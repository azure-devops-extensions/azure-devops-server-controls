/// <amd-dependency path='VSS/LoaderPlugins/Css!VersionControlControls' />
import Utils_String = require("VSS/Utils/String");
import Utils_Date = require("VSS/Utils/Date");
import Utils_UI = require("VSS/Utils/UI");
import Controls = require("VSS/Controls");
import VSS_Telemetry = require("VSS/Telemetry/Services");
import Notifications = require("VSS/Controls/Notifications");
import * as CustomerIntelligenceConstants from "VersionControl/Scripts/CustomerIntelligenceConstants";
import { Suggestion } from "VersionControl/Scenarios/Shared/Suggestion";
import VCResources = require("VersionControl/Scripts/Resources/TFS.Resources.VersionControl");

import domElem = Utils_UI.domElem;

export class SuggestionRibbon extends Controls.BaseControl {
    private _messageArea: Notifications.MessageAreaControl;
    protected _visibility: boolean;
    private isValidSuggestionAvailable: boolean;
    constructor(options?) {
        super(options);
    }

    public initialize(): void {
        super.initialize();
        this.isValidSuggestionAvailable = false; // If this is fasle, dont set the Ribbon visible
        this.setVisibility(true);
        this.createPullRequestSuggestion();
    }

    public setVisibility(visible: boolean): void {
        this._visibility = visible;
        this._element.toggleClass("hidden", !this.isValidSuggestionAvailable || !visible);
    }

    /**
     * function to create suggestion ribbon from PR suggestion
     */
    public createPullRequestSuggestion(): void {
        this._messageArea = <Notifications.MessageAreaControl>Controls.BaseControl.createIn(Notifications.MessageAreaControl, this.getElement(), {
            showDetailsLink: false,
            showHeader: false,
            showIcon: true
        });

        this._messageArea._bind(Notifications.MessageAreaControl.EVENT_CLOSE_ICON_CLICKED, (e) => {
            this.onCloseSuggestionClick();
        });

        this._messageArea.setMessage({
            type: Notifications.MessageAreaType.Info,
            content: this.createPullRequestSuggestionElement()
        });

        this.isValidSuggestionAvailable = true;
    }

    private onCloseSuggestionClick(): void {
        this._element.empty();
        // Following method call is needed to update the height of sibling divs like hub-pivot-content
        this.isValidSuggestionAvailable = false;
        this.setVisibility(this._visibility);
        (this._options.suggestion as Suggestion).invalidateSuggestion();
    }

    private createPullRequestSuggestionElement(): JQuery {
        let $suggestion = $(domElem("div", "vc-pullrequest-suggestion"));
        let $sourceBranch = $(domElem("span")).text(this._options.suggestion.sourceBranch);
        let $branchIcon = $(domElem("span", "bowtie-icon bowtie-tfvc-branch"));
        let $newPRAction = $(domElem("a")).text(VCResources.CreatePullRequestLabel).attr("href", this._options.suggestion.createPullRequestURL)
            .click(() => {
                VSS_Telemetry.publishEvent(new VSS_Telemetry.TelemetryEventData(CustomerIntelligenceConstants.VERSION_CONTROL_AREA, CustomerIntelligenceConstants.PULL_REQUEST_CREATE_FEATURE, {
                    "SourceUI": CustomerIntelligenceConstants.PULL_REQUEST_CREATE_SOURCEUI_SUGGESTION,
                    "SourceView": this._options.suggestion.repositoryContext.getTfsContext().navigation.currentAction
                }));
                
                });

        Utils_UI.accessible($newPRAction);

        $(domElem("span")).text(VCResources.PullRequest_SuggestionBranchPushed1).appendTo($suggestion);
        $(domElem('a')).attr("href", this._options.suggestion.explorerBranchUrl)
            .append($branchIcon)
            .append($sourceBranch)
            .appendTo($suggestion);

        $(domElem("span")).text(" " + Utils_String.format(VCResources.PullRequest_SuggestionBranchPushed2, Utils_Date.ago(this._options.suggestion.pushDate)))
            .appendTo($suggestion);

        $newPRAction.appendTo($suggestion);

        return $suggestion;
    }

}