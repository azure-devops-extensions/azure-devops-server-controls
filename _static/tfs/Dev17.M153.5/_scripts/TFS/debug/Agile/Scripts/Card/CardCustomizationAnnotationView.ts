/// <reference types="jquery" />

import ViewModel = require("Agile/Scripts/Card/CardCustomizationAnnotationViewModel");
import StyleCustomization = require("Agile/Scripts/Card/CardCustomizationStyle");
import Cards_NO_REQUIRE = require("Agile/Scripts/Card/Cards");
import AgileControlsResources = require("Agile/Scripts/Resources/TFS.Resources.AgileControls");

import TFS_Core_Contracts_NO_REQUIRE = require("TFS/Core/Contracts");
import Work_WebApi = require("TFS/Work/RestClient");

import TFS_Knockout = require("Presentation/Scripts/TFS/TFS.Knockout");
import { loadHtmlTemplate } from "Agile/Scripts/Board/Templates";
import Controls = require("VSS/Controls");
import Notifications = require("VSS/Controls/Notifications");
import StatusIndicator = require("VSS/Controls/StatusIndicator");
import Diag = require("VSS/Diag");

import ko = require("knockout");
import Q = require("q");

import { TabContentBaseControl } from "Presentation/Scripts/TFS/TFS.Configurations";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { VssConnection } from "VSS/Service";

TFS_Knockout.overrideDefaultBindings()

/**
 * Control for annotation setting tab in common setting configuration dialog
 */
export class ConfigureAnnotationsCSCControl extends TabContentBaseControl<StyleCustomization.ICardStyleSettingsCSCControlInitOptions> {
    private static CARD_ANNOTATION_INFO_TEMPLATE = "card_annotation_info_template";
    private static CARD_ANNOTATION_CONTENT_CLASS = "card-annotation-dialog-content";
    private static CARD_ANNOTATION_RULES_TEMPLATE_CLASS = "card-annotation-rules-template";
    private static CARD_ANNOTATIONS_CUSTOMIZATION_TEMPLATE = "card_annotations_customization_template";
    private static CARD_ANNOTATIONS_TAB_CONTENT_CLASS = "card-annotation-tab-content";
    private static DESCRIPTION_AREA_CONTAINER_CLASS = "annotation-settings-description-area-container";
    private static MESSAGE_AREA_CONTAINER_CLASS = "annotation-settings-message-area-container";
    private static OVERLAY_CLASS = "card-annotation-control-overlay";

    public applyChanges: Function;

    private _annotationRules: Cards_NO_REQUIRE.IStyleRule[];
    private _controlOverlay: JQuery;
    private _messageArea: Notifications.MessageAreaControl;
    private _requireRefreshOnSave = true;
    private _statusIndicator: StatusIndicator.StatusIndicator;
    private _viewModel: ViewModel.AnnotationCollectionViewModel;

    /**
     * Overrides beginSave method of base class
     * This method is called when changes are saved on annotation tab
     */
    public beginSave(): IPromise<any> {
        let deferred = Q.defer();

        let cardAnnotationRules = this._viewModel.getAnnotationSettings();

        let successHandler = () => {
            deferred.resolve(this._requireRefreshOnSave);
            this.fireDirtyFlagChange(false);
        };

        let errorHandler = (error: { message: string; serverError: any; }) => {
            deferred.reject(error);
        };

        this._beginSettingsSaveRest(
            cardAnnotationRules,
            StyleCustomization.RuleType.ANNOTATION,
            successHandler,
            errorHandler);

        return deferred.promise;
    }

    public dispose(): void {
        ko.cleanNode(this.getElement()[0]);
        this._viewModel.dispose();

        super.dispose();
    }

    /**
     * Hides the overlay control
     */
    public hideOverlay(): void {
        if (this._controlOverlay) {
            Diag.Debug.assertIsNotNull(this._statusIndicator, "this._statusIndicator");
            this._statusIndicator.complete();
            this._controlOverlay.hide();
            this._controlOverlay.empty();
        }
    }

    public initialize(): void {
        super.initialize();
        this.getElement().parents(".tab-content-main").addClass(ConfigureAnnotationsCSCControl.CARD_ANNOTATIONS_TAB_CONTENT_CLASS);

        let createViewModelAndBindHandlers = () => {
            this._viewModel = new ViewModel.AnnotationCollectionViewModel(this._annotationRules, this._options.isEditable);
            this._drawMessageArea();
            this._createAnnotationInfo();
            this._createAnnotationList();
        };

        if (!this._annotationRules) {
            this.showOverlay(AgileControlsResources.CardStyleRulesLoading);

            StyleCustomization.StyleRuleHelper.beginGetBoardCardRuleSettings(this._options.teamId, this._options.boardIdentity).then(
                (boardCardSettings: StyleCustomization.BoardCardRuleSettings) => {
                    this.hideOverlay();
                    this._annotationRules = StyleCustomization.StyleRuleHelper.convertRestDefinitionToBoardStyleSetting(boardCardSettings, StyleCustomization.RuleType.ANNOTATION);
                    createViewModelAndBindHandlers();
                },
                (error: { message: string; ServerError: any; }) => {
                    this.hideOverlay();
                });
        } else {
            createViewModelAndBindHandlers();
        }

        this._requireRefreshOnSave = this._options.requireRefreshOnSave ? this._options.requireRefreshOnSave : false;
    }

    public initializeOptions(options?: any): void {
        this._annotationRules = options.styleRules;
        this.applyChanges = options.applyChanges;

        super.initializeOptions($.extend({
            cssClass: ConfigureAnnotationsCSCControl.CARD_ANNOTATION_CONTENT_CLASS
        }, options));
    }

    /**
     * Shows the overlay control
     */
    public showOverlay(message: string, options?: any): void {
        if (!this._controlOverlay) {
            this._controlOverlay = $("<div />").addClass("control-busy-overlay " + ConfigureAnnotationsCSCControl.OVERLAY_CLASS).appendTo(this.getElement());
        }

        var statusOptions = options || {
            center: true,
            imageClass: "big-status-progress",
            message: message,
            throttleMinTime: 0
        };

        this._statusIndicator = Controls.Control.create(StatusIndicator.StatusIndicator, this._controlOverlay, statusOptions);
        this._statusIndicator.start();

        this._controlOverlay.show();
    }

    private _beginSettingsSaveRest(
        annotationRules: StyleCustomization.IBaseStyleRule[],
        type: string,
        successCallback: IResultCallback,
        errorCallback: IErrorCallback): void {

        let tfsContext = TfsContext.getDefault();
        let tfsConnection = new VssConnection(tfsContext.contextData);
        let workHttpClient = tfsConnection.getHttpClient<Work_WebApi.WorkHttpClient>(Work_WebApi.WorkHttpClient);
        let teamContext: TFS_Core_Contracts_NO_REQUIRE.TeamContext = {
            projectId: tfsContext.contextData.project.id,
            teamId: this._options.teamId,
            project: undefined,
            team: undefined
        };

        let successHandler = (result) => {
            successCallback();
        };

        workHttpClient.updateBoardCardRuleSettings(this._convertAnnotationRulesToBoardCardSettings(annotationRules, type), teamContext, this._options.boardIdentity)
            .then(successHandler, errorCallback);
    }

    private _convertAnnotationRulesToBoardCardSettings(rules: StyleCustomization.IBaseStyleRule[], type: string) {
        let updatedSettings = new StyleCustomization.BoardCardRuleSettings([type]);

        for (let i = 0, length = rules.length; i < length; i++) {
            let rule = rules[i];
            let settingRule = new StyleCustomization.Rule(rule.isEnabled.toString(), rule.name, null, {});

            updatedSettings.addRule(rule.type, settingRule);
        }

        return updatedSettings;
    }

    private _createAnnotationInfo(): void {
        this._loadTemplate(ConfigureAnnotationsCSCControl.CARD_ANNOTATION_INFO_TEMPLATE);
    }

    private _createAnnotationList(): void {
        this._viewModel.annotationRulesUpdatedDelegate = (isDirty: boolean, isValid: boolean) => {
            this.fireDirtyFlagChange(isDirty);
            this.fireValidFlagChange(isValid);

            if (this._options.disableSave) {
                this._options.disableSave(!isDirty);
            }
        }

        this._loadTemplate(
            ConfigureAnnotationsCSCControl.CARD_ANNOTATIONS_CUSTOMIZATION_TEMPLATE,
            ConfigureAnnotationsCSCControl.CARD_ANNOTATION_RULES_TEMPLATE_CLASS);
    }

    public isValid(): boolean {
        return this._viewModel.isValid();
    }

    private _createMessageArea($container: JQuery): void {
        let $messageAreaContainer = $("<div>", { class: ConfigureAnnotationsCSCControl.MESSAGE_AREA_CONTAINER_CLASS });
        let messageAreaOption: Notifications.IMessageAreaControlOptions = {
            closeable: false,
            showIcon: true,
            type: Notifications.MessageAreaType.Warning
        };
        this._messageArea = Controls.Control.create(Notifications.MessageAreaControl, $messageAreaContainer, messageAreaOption);

        $container.append($messageAreaContainer);
    }

    private _drawMessageArea(): void {
        let $textAreaContainer = $("<div>", { class: ConfigureAnnotationsCSCControl.DESCRIPTION_AREA_CONTAINER_CLASS });
        this._createMessageArea($textAreaContainer);
        this.getElement().append($textAreaContainer);

        if (!this._options.isEditable) {
            this._showWarning(AgileControlsResources.CardCustomizationAnnotationsNoPermissions);
        }
    }

    private _loadTemplate(templateName: string, templateClass?: string): void {
        let $element = loadHtmlTemplate(templateName, templateClass);
        if ($element) {
            ko.applyBindings(this._viewModel, $element[0]);
            this.getElement().append($element);
        }
    }

    private _showWarning(message: string): void {
        this._messageArea.setMessage(message, Notifications.MessageAreaType.Warning);
    }
}
