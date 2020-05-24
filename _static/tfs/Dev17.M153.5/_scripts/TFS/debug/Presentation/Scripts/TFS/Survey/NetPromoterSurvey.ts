/// <reference types="jquery" />
/// <amd-dependency path='VSS/LoaderPlugins/Css!Survey/NetPromoterSurvey' />

import Context = require("VSS/Context");
import Controls = require("VSS/Controls");
import FeatureAvailability_Services = require("VSS/FeatureAvailability/Services");
import SDK_Shim = require("VSS/SDK/Shim");
import Service = require("VSS/Service");
import { FeatureManagementService } from "VSS/FeatureManagement/Services";
import { HubsService } from "VSS/Navigation/HubsService";
import VSS = require("VSS/VSS");
import Utils_String = require("VSS/Utils/String");
import Combos = require("VSS/Controls/Combos");
import { format } from "VSS/Utils/String";

import { Constants, DataKeys, InteractionType, ProductConstants } from "Presentation/Scripts/TFS/Survey/Common";
import PresentationResources = require("Presentation/Scripts/TFS/Resources/TFS.Resources.Presentation");
import ServerConstants = require("Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants");
import TFS_EngagementRegistrations = require("Presentation/Scripts/TFS/TFS.Engagement.Registrations");

import EngagementCore = require("Engagement/Core");
import EngagementDispatcher = require("Engagement/Dispatcher");
import Interaction = require("Engagement/Interaction/Interaction");
import Survey = require("Engagement/Survey");

/**
 * Initializes survey experiences post widget load via the Engagement Dispatcher. This allows for slight performance improvement as these scripts and their dependencies are moved out of the primary loading experience flow
 */
function initializeEngagement(): void {
    TFS_EngagementRegistrations.registerNewFeature();
    EngagementDispatcher.Dispatcher.getInstance().start(Constants.PageId);
}

/**
 * Show NetPromoter Survey
 */
function registerNetPromoterSurvey(verticalNavigationEnabled?: boolean): void {
    const hubsService = Service.getLocalService(HubsService);
    const hubGroup = hubsService.getHubGroupById(hubsService.getSelectedHubGroupId());
    const hub = hubsService.getHubById(hubsService.getSelectedHubId());

    const useNewBranding = FeatureAvailability_Services.FeatureAvailabilityService.isFeatureEnabled(ServerConstants.FeatureAvailabilityFlags.UseNewBranding, false);

    EngagementDispatcher.Dispatcher.getInstance().register(<EngagementCore.IEngagementModel>{
        id: Constants.EngagementId,
        type: EngagementCore.EngagementType.Survey,
        model: new NetPromoterSurveyModel(verticalNavigationEnabled, hubGroup, hub, undefined, useNewBranding).getModel()
    });
}

export class NetPromoterSurveyModel {
    private data: { [id: string]: string; };
    private roleCombo: Combos.Combo;

    private verticalNavigationEnabled: boolean;
    private useNewBranding: boolean;

    private hubGroup: HubGroup;
    private hub: Hub;

    constructor(verticalNavigationEnabled: boolean, hubGroup: HubGroup, hub: Hub, data?: any, useNewBranding?: boolean) {
        this.data = data || {};
        this.verticalNavigationEnabled = verticalNavigationEnabled;
        this.hubGroup = hubGroup;
        this.hub = hub;
        this.useNewBranding = useNewBranding;
    }

    public getModel(): Survey.ISurveyControlOptions {
        return {
            engagementId: Constants.EngagementId,
            title: PresentationResources.NetPromoterSurveyTitle,
            content: this.getView(),
            hubGroup: this.hubGroup,
            hub: this.hub,
            initialize: (data?: any) => this.initialize(data),
            dismissText: PresentationResources.NetPromoterSurveyDismissText,
            submit: (exitMethod: Survey.ExitMethod) => this.submit(exitMethod),
            dismiss: (exitMethod: Survey.ExitMethod) => this.postpone(exitMethod)
        }
    }

    public getView(): string {

        const titleBlock =
            '<div class="survey-feedback-submit-headline required">' + format(PresentationResources.NetPromoterSurveyScoreLabel, this.getProductName()) + '</div>';

        const choiceGroupElements = [];
        for (var i = 0; i <= 10; i++) {
            const element = [
                '<li class="survey-feedback-submit-choice-group-element">',
                '<input type="radio" id="survey-feedback-submit-choice-group-element-' + i + '" class="survey-feedback-submit-choice-group-element-input" name="survey-feedback-submit-choice-group" value="' + i + '" aria-checked="false" />',
                '<label role="radio" class="survey-feedback-submit-choice-group-element-label" for="survey-feedback-submit-choice-group-element-' + i + '">' + i + '</label>',
                '</li>'
            ].join('');

            choiceGroupElements.push(element);
        }

        const detailsTextBlock = [
            '<div class="survey-feedback-submit-headline"><label for="survey-feedback-textarea">' + PresentationResources.NetPromoterSurveyReasonLabel + '</label></div>',
            '<div class="survey-feedback-submit-textarea-container">',
            '<textarea id="survey-feedback-textarea" maxlength="5000"></textarea>',
            '</div>',
        ].join('');

        const roleBlock = [
            '<div class="survey-feedback-submit-headline"><label for="survey-feedback-role">' + PresentationResources.NetPromoterSurveyRoleLabel + '</label></div>',
            '<div class="survey-feedback-submit-role-container"></div>',
        ].join('');

        const contactMeBlock = [
            '<div class="survey-feedback-submit-contactme-container">',
            '<input type="checkbox" id="survey-feedback-contactme" name="survey-feedback-contactme"/>',
            '<label for="survey-feedback-contactme">' + PresentationResources.NetPromoterSurveyContactMeLabel + '</label>',
            '</div>'
        ].join('');

        const privacyBlock = [
            '<div class="survey-privacy-link-container">',
            '<a class="survey-privacy-link" target="_blank" href="' + Constants.Privacy + '">' + PresentationResources.NetPromoterSurveyPrivacyLabel + '</a>',
            '</div>',
        ].join('');

        return [
            '<div class="' + Constants.ContainerClassName + ' survey-modal">',
            titleBlock,
            '<ul class="survey-feedback-submit-choice-group-container">' + choiceGroupElements.join('') + '</ul>',
            '<div class="survey-feedback-submit-choice-group-labels">',
            '<span>' + PresentationResources.NetPromoterSurveyScore0Label + '</span><span class="survey-feedback-submit-choice-group-labels-pull-right">' + PresentationResources.NetPromoterSurveyScore10Label + '</span>',
            '</div>',
            '<hr class="survey-feedback-submit-separator">',
            detailsTextBlock,
            roleBlock,
            contactMeBlock,
            privacyBlock,
            '</div>'
        ].join('');
    }

    public initialize(data?: any): void {
        this.data = data;

        // Initialize score radio group
        // When a value is selected, enable the submit button
        $("input:radio[name='survey-feedback-submit-choice-group']").on('change', function() {
            let checked: boolean = $(this).is(":checked");
            $(this).siblings().attr("aria-checked", checked.toString());
            $(this).parent().siblings().find("label").attr("aria-checked", "false");

            let buttonElement = $("." + Survey.Constants.DialogClassName).find("button#submit");
            buttonElement.button("option", "disabled", "");
        });

        // Initialize role dropdown
        var roleOptions = <Combos.IComboOptions>{
            mode: 'drop', // show dropdown icon
            allowEdit: false,
            source: PresentationResources.NetPromoterSurveyRoleList.split(",")
        };
        var $comboElement = $(".survey-feedback-submit-role-container");
        this.roleCombo = <Combos.Combo>Controls.BaseControl.createIn(Combos.Combo, $comboElement, roleOptions);
    
        // Set the default value from _data if present
        if (data && data[DataKeys.UserRole]) {
            this.roleCombo.setText(data[DataKeys.UserRole]);
        }
    }

    public postpone(exitMethod: Survey.ExitMethod): void {
        // If the user deferred more than n times, then don't ask him for the next m days
        // Else, ask again in a few days
        var deferredTimes = (Number(this.data[DataKeys.DeferredTimes]) || 0) + 1;
        if (deferredTimes >= Number(this.data[DataKeys.MaxAllowableDeferTimes])) {
            var interactionType = InteractionType.Submit;
            deferredTimes = 0;
        } else {
            var interactionType = InteractionType.Postpone;
        }

        Interaction.logInteraction(Constants.EngagementId, this.buildInteractionInputData(interactionType, deferredTimes));

        // Log telemetry event
        let telemetryProperties = this.buildTelemetryProperties(interactionType, deferredTimes, exitMethod, false);
        Survey.SurveyTelemetry.PublishTelemetry(Survey.SurveyTelemetry.Feature.UserPostpone, this.hubGroup, this.hub, telemetryProperties);
    }

    public submit(exitMethod: Survey.ExitMethod): void {
        // Build interaction input data and log interaction
        let interactionType = InteractionType.Submit;
        var deferredTimes = 0; // reset the deferral count
        Interaction.logInteraction(Constants.EngagementId, this.buildInteractionInputData(interactionType, deferredTimes));

        // Log telemetry event
        let telemetryProperties = this.buildTelemetryProperties(interactionType, deferredTimes, exitMethod, true);
        Survey.SurveyTelemetry.PublishTelemetry(Survey.SurveyTelemetry.Feature.UserSubmit, this.hubGroup, this.hub, telemetryProperties);
    }

    public getUserResponse(): { [id: string]: string; } {
        let score = $("input:radio[name='survey-feedback-submit-choice-group']:checked").val();
        let reason = $("#survey-feedback-textarea").val();
        let role = this.roleCombo.getValue();
        let contactMe = $("input:checkbox[name='survey-feedback-contactme']").is(':checked');

        var values: { [key: string]: any } = {}

        if (Boolean(score)) values[DataKeys.Score] = score;
        if (Boolean(reason)) values[DataKeys.Reason] = reason;
        if (Boolean(role)) values[DataKeys.UserRole] = role;
        values[DataKeys.ContactMe] = contactMe;

        return values;
    }

    /**
     * Builds a dictionary containing the core interaction data to be used by interaction service and telemetry
     * @param interactionType
     * @param deferredTimes
     * @param userRole
     */
    public buildCoreData(interactionType: string, deferredTimes: number, userRole: string): { [key: string]: string; } {
        let coreData = {};
        coreData[DataKeys.UserRole] = userRole;
        coreData[DataKeys.InteractionType] = interactionType;
        coreData[DataKeys.DeferredTimes] = deferredTimes;

        return coreData;
    }

    public buildInteractionInputData(interactionType: string, deferredTimes: number): { [key: string]: string; } {
        let userResponse = this.getUserResponse();
        return this.buildCoreData(interactionType, deferredTimes, userResponse[DataKeys.UserRole] || this.data[DataKeys.UserRole]);
    }

    public buildTelemetryProperties(interactionType: string, deferredTimes: number, exitMethod: Survey.ExitMethod, withUserResponse: boolean): { [key: string]: string; } {
        // a. Get the user response
        let userResponse = withUserResponse ? this.getUserResponse() : {};

        // b. Get the set of core properties, encapsulate in the Interaction key
        let coreData = {};
        coreData[DataKeys.Interaction] = this.buildCoreData(interactionType, deferredTimes, userResponse[DataKeys.UserRole]);

        // c. Augment the data
        let extendedData = {};
        extendedData[DataKeys.SurveyId] = Constants.EngagementId;
        extendedData[DataKeys.ExitMethod] = this.getExitMethodAsString(exitMethod);
        extendedData[DataKeys.PromptId] = this.data[DataKeys.PromptId];
        extendedData[DataKeys.VerticalNavigationEnabled] = this.verticalNavigationEnabled;
        extendedData[DataKeys.UseNewBranding] = this.useNewBranding;
        if (withUserResponse) {
            extendedData[DataKeys.Response] = userResponse;
        }

        return $.extend({}, coreData, extendedData);
    }

    public getProductName(): string {
        return ProductConstants.BrandName + ' ' + (ProductConstants.HubGroupToProductName[this.hubGroup.id] || ProductConstants.ProductName);        
    }

    private getExitMethodAsString(exitMethod: Survey.ExitMethod) {
        switch (exitMethod) {
            case Survey.ExitMethod.Submit:
                return "Submit";
            case Survey.ExitMethod.Close:
                return "Ask me later";
            case Survey.ExitMethod.ClickAway:
                return "Click-away";
            case Survey.ExitMethod.TopRightClose:
                return "Close";
            default:
                return "Unknown";
        }
    }
}

SDK_Shim.registerContent("survey.initialize", (context) => {
    registerNetPromoterSurvey(false);
    initializeEngagement();
})

SDK_Shim.registerContent("survey.initialize.vertical-navigation", (context) => {
    registerNetPromoterSurvey(true);
    initializeEngagement();
})
