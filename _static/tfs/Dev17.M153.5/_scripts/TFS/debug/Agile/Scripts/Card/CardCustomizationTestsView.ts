/// <reference types="jquery" />

import AgileControlsResources = require("Agile/Scripts/Resources/TFS.Resources.AgileControls");
import Boards = require("Agile/Scripts/TFS.Agile.Boards");
import Controls = require("VSS/Controls");
import Diag = require("VSS/Diag");
import Notifications = require("VSS/Controls/Notifications");
import ko = require("knockout");
import TFS_Knockout = require("Presentation/Scripts/TFS/TFS.Knockout");
import StyleCustomization = require("Agile/Scripts/Card/CardCustomizationStyle");
import StatusIndicator = require("VSS/Controls/StatusIndicator");
import ViewModel = require("Agile/Scripts/Card/CardCustomizationTestsViewModel");
import Utils_Core = require("VSS/Utils/Core");
import { loadHtmlTemplate } from "Agile/Scripts/Board/Templates";

import { TabContentBaseControl } from "Presentation/Scripts/TFS/TFS.Configurations";

TFS_Knockout.overrideDefaultBindings()

var delegate = Utils_Core.delegate;


/// <summary>
/// Control for showing all the annotaiton settings
/// </summary>
export class ConfigureTestsCSCControl extends TabContentBaseControl<StyleCustomization.ICardStyleSettingsCSCControlInitOptions> {

    private static VIEW_TEMPLATE = "test_annotation_config_template";
    private static MESSAGE_AREA_CONTAINER_CLASS = "test-settings-message-area-container";
    private static DESCRIPTION_AREA_CONTAINER_CLASS = "test-settings-description-area-container";
    private static OVERLAY_CLASS = "card-annotation-control-overlay";
    private _viewModel: ViewModel.TestAnnotationSettingsViewModel;
    private _controlOverlay: JQuery;
    private _messageArea: Notifications.MessageAreaControl;
    private _statusIndicator: StatusIndicator.StatusIndicator;

    /// <summary>
    /// Overrides beginSave method of base class
    /// this method is called when changes are saved on test settings tab
    /// </summary>
    public beginSave(): IPromise<any> {
        return this._viewModel.beginSave();
    }

    public dispose(): void {
        ko.cleanNode(this.getElement()[0]);
        this._viewModel.dispose();
        super.dispose();
    }

    public initialize(): void {
        super.initialize();
        this.showOverlay(AgileControlsResources.CardStyleRulesLoading);
        this._viewModel = new ViewModel.TestAnnotationSettingsViewModel({
            teamId: this._options.teamId,
            isEditable: this._options.isEditable && this._isAnnotationEnabled(),
            fireDirtyFlagChange: delegate(this, this.fireDirtyFlagChange)
        });
        this._viewModel.beginInitialize().then(() => {
            this.hideOverlay();
            this._drawMessageArea();
            this._loadTemplate(ConfigureTestsCSCControl.VIEW_TEMPLATE);
        }, (error: { message: string; ServerError: any; }) => {
            this.hideOverlay();
        });
    }

    /// <summary>
    /// Hides the overlay control
    /// </summary>
    public hideOverlay(): void {
        if (this._controlOverlay) {
            Diag.Debug.assertIsNotNull(this._statusIndicator, "this._statusIndicator");
            this._statusIndicator.complete();
            this._controlOverlay.hide();
            this._controlOverlay.empty();
        }
    }


    /// <summary>
    /// Shows the overlay control
    /// </summary>
    public showOverlay(message: string, options?: any): void {
        if (!this._controlOverlay) {
            this._controlOverlay = $("<div />").addClass("control-busy-overlay " + ConfigureTestsCSCControl.OVERLAY_CLASS).appendTo(this.getElement());
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

    private _loadTemplate(templateName: string, templateClass?: string): void {
        let $element = loadHtmlTemplate(templateName, templateClass);
        if ($element) {
            ko.applyBindings(this._viewModel, $element[0]);
            this.getElement().append($element);
        }
    }

    private _createMessageArea($container: JQuery): void {
        let $messageAreaContainer = $("<div>", { class: ConfigureTestsCSCControl.MESSAGE_AREA_CONTAINER_CLASS });
        let messageAreaOption: Notifications.IMessageAreaControlOptions = {
            closeable: false,
            showIcon: true,
            type: Notifications.MessageAreaType.Warning
        };
        this._messageArea = Controls.Control.create(Notifications.MessageAreaControl, $messageAreaContainer, messageAreaOption);

        $container.append($messageAreaContainer);
    }

    private _drawMessageArea(): void {
        let $textAreaContainer = $("<div>", { class: ConfigureTestsCSCControl.DESCRIPTION_AREA_CONTAINER_CLASS });
        this._createMessageArea($textAreaContainer);
        this.getElement().append($textAreaContainer);

        if (!this._options.isEditable) {
            this._showWarning(AgileControlsResources.CardCustomizationAnnotationsNoPermissions);
        }
        else if (!this._isAnnotationEnabled()) {
            this._showWarning(AgileControlsResources.TestAnnotation_Configuration_AnnotationDisabledWarning);
        }
    }

    private _isAnnotationEnabled(): boolean {
        var enabled = false;
        $.each(this._options.styleRules, (index, rule) => {
            if (rule.name === Boards.BoardAnnotationsIdentifier.TestAnnotation) {
                enabled = rule.isEnabled;
                return false;
            }
        });
        return enabled;
    }

    private _showWarning(message: string): void {
        this._messageArea.setMessage(message, Notifications.MessageAreaType.Warning);
    }
}
