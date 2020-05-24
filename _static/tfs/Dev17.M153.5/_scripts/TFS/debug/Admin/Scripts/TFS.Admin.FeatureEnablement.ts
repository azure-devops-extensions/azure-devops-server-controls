///<amd-dependency path="jQueryUI/dialog"/>
/// <reference types="jquery" />



import VSS = require("VSS/VSS");
import Ajax = require("Presentation/Scripts/TFS/TFS.Legacy.Ajax");
import Combos = require("VSS/Controls/Combos");
import Controls = require("VSS/Controls");
import Dialogs = require("VSS/Controls/Dialogs");
import Events_Handlers = require("VSS/Events/Handlers");
import StatusIndicator = require("VSS/Controls/StatusIndicator");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import Diag = require("VSS/Diag");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import Resources = require("Admin/Scripts/Resources/TFS.Resources.Admin");

var delegate = Utils_Core.delegate;

export interface IButton { text: string; click: () => void; }

export class Wizard extends Dialogs.ModalDialog {

    public static DIALOG_HEIGHT = 540;
    public static DIALOG_WIDTH = 700;
    public static EVENT_ON_CLOSE = "on-wizard-close";

    private _buttons: IButton[];
    private _currentPage: BaseWizardPage;
    private _events: Events_Handlers.NamedEventCollection<any, any>;

    constructor (options?: any /* TODO: Address with BaseControl options */) {
        /// <summary>The Wizard object affords a page-to-page dialog experience. It handles wiring up the individual wizard pages navigation inside the wizard</summary>
        /// <param name="options" type="Object">Dialog options</param>
        super(options);

        this._events = new Events_Handlers.NamedEventCollection();
        this._buttons = [];
    }

    public initializeOptions(options?: any /* TODO: Address with BaseControl options */) {
        var wrappedClose: () => void;

        options = options || {};

        wrappedClose = options.close;

        // We are wrapping the provided dialog close option here so we can raise our own pre-close event. Wizard pages can attach to this individually in case they wish to
        // perform operations prior to their containing wizard closing.
        options.close = () => {
            this._raiseOnBeforeClose();
            if ($.isFunction(wrappedClose)) {
                wrappedClose();
            }
        };

        super.initializeOptions(
            $.extend({
                width: Wizard.DIALOG_WIDTH,
                height: Wizard.DIALOG_HEIGHT,
                resizable: false
            },
            options,
            {
                buttons: this._buttons,
                dialogClass: "feature-enablement-dialog"
            })
        );
    }

    public attachOnBeforeClose(handler: IEventHandler) {
        /// <summary>Attaches a handler to be called when the wizard is being closed</summary>
        /// <param name="handler" type="IEventHandler">The handler to attach. Will be called with no parameters</param>
        Diag.Debug.assertParamIsFunction(handler, "handler");

        this._events.subscribe(Wizard.EVENT_ON_CLOSE, <any>handler);
    }

    public detachOnBeforeClose(handler: IEventHandler) {
        /// <summary>Detaches a handler that was to be called when the wizard is being closed</summary>
        /// <param name="handler" type="IEventHandler">The handler to detach</param>
        Diag.Debug.assertParamIsFunction(handler, "handler");

        this._events.unsubscribe(Wizard.EVENT_ON_CLOSE, <any>handler);
    }

    public renderPage(wizardPage: BaseWizardPage) {
        /// <summary>Draws specific page in the wizards main content area</summary>
        /// <param name="wizardPage" type="BaseWizardPage">The page to display in the wizard</param>
        Diag.Debug.assertParamIsObject(wizardPage, "wizardPage");

        var $container = this.getElement(),
            $focusButton: JQuery;

        $container.empty();

        // Save off the current page of the wizard and render it in the wizard dialog.
        this._currentPage = wizardPage;
        wizardPage.render($container);

        // It is possible that during the rendering of a page a transition to a new page has occurred so
        // only swap the buttons if the wizardPage is still the current page.
        if (this._currentPage === wizardPage) {
            this._swapButtons(wizardPage.getButtons());
        }

        // jQuery's focus() is only guaranteed to work across browsers if applied to an input element. So here we find the first button in the dialog to set focus to.
        // If, in the future, we have a need to set focus on other items we can give the BaseWizardPage subclasses the ability to opt-in to set focus.
        $focusButton = $container.parent().find("button:first");

        if ($focusButton.length > 0) {
            $focusButton.focus();
        }
    }

    private _raiseOnBeforeClose() {
        /// <summary>Notify listeners before the wizard is closed</summary>
        this._events.invokeHandlers(Wizard.EVENT_ON_CLOSE);
    }

    private _swapButtons(newButtons: IButton[]) {
        /// <summary>
        ///     Swaps out the buttons from the old wizard page with the new wizard page. Note that this procedurally deletes from and adds to the _buttons member
        ///     because the only way to dynamically change jQuery dialog buttons is to modify the original buttons property that was provided at instantiation.
        /// </summary>
        /// <param name="newButtons" type="Array" elementType="IButton">Array of button objects</param>
        Diag.Debug.assertParamIsArray(newButtons, "newButtons");

        var i: number, 
            l: number;

        // Remove all buttons from dialog by emptying the private button array
        this._buttons.length = 0;

        // Add new buttons to dialog
        for (i = 0, l = newButtons.length; i < l; i += 1) {
            this._buttons.push(newButtons[i]);
        }

        // Reset the jQuery UI dialog button options - this will force the visual update
        this._element.dialog("option", "buttons", this._buttons);
    }
}

VSS.initClassPrototype(Wizard, {
    _buttons: null,
    _currentPage: null,
    _events: null
});

// Note: Until TypeScript adds proper abstract class support implementing the IWizardPage in both super and sub classes
//       gives us the static type checking we need.
export interface IWizardPage {
    render($container: JQuery);
    getButtons(): IButton[];
}

export class BaseWizardPage extends Controls.BaseControl implements IWizardPage {

    private _model: Model;
    private _wizardManager: WizardManager;

    constructor (wizardManager: WizardManager, model: Model) {
        /// <summary>Intended to be derived from. This "class" defines the contract for the Wizard to consume. Derivations of this are intended to be provided to the Wizard instance</summary>
        /// <param name="wizardManager" type="WizardManager">The wizard manager</param>
        /// <param name="model" type="Model">The feature enablement model</param>
        super();

        Diag.Debug.assertParamIsObject(wizardManager, "wizardManager");
        Diag.Debug.assertParamIsObject(model, "model");

        this._wizardManager = wizardManager;
        this._model = model;
    }

    public getModel(): Model {
        /// <summary>Get the model</summary>
        /// <returns type="Model" />
        Diag.Debug.assertIsType(this._model, Model, "Model should be set at object construction");

        return this._model;
    }

    public getWizardManager(): WizardManager {
        /// <summary>Get the wizard manager</summary>
        /// <returns type="WizardManager" />
        Diag.Debug.assertIsType(this._wizardManager, WizardManager, "WizardManager should be set at object construction");

        return this._wizardManager;
    }

    public exit() {
        /// <summary>Exits the wizard</summary>
        this.getWizardManager().exit();
    }

    public render($container: JQuery) {
        throw new Error("This is abstract");
    }

    public getButtons(): IButton[] {
        throw new Error("This is abstract");
    }
}

VSS.initClassPrototype(BaseWizardPage, {
    _model: null,
    _wizardManager: null
});

export class WelcomePage extends BaseWizardPage implements IWizardPage {

    constructor (wizardManager: WizardManager, model: Model) {
        /// <summary>Manages the welcome page content and button handling</summary>
        /// <param name="wizardManager" type="WizardManager">The wizard manager</param>
        /// <param name="model" type="Model">The feature enablement model</param>
        super(wizardManager, model);
    }

    public render($container: JQuery) {
        /// <summary>Renders the main wizard page content</summary>
        /// <param name="$container" type="jQuery">The container to render the wizard page content in</param>
        this._displayContent($container);
    }

    public getButtons(): IButton[] {
        /// <summary>Retrieves the button information to display in the Wizard</summary>
        /// <returns type="Array" elementType="IButton" />
        return [
            {
                text: Resources.FeatureEnablement_Welcome_Button_Verify,
                click: delegate(this, this._onNextButtonClick)
            },
            {
                text: Resources.FeatureEnablement_Button_Cancel,
                click: delegate(this, this.exit)
            }
        ];
    }

    private _displayContent($container: JQuery) {
        /// <summary>Renders the main content for the welcome page</summary>
        /// <param name="$container" type="jQuery">The container to rended the content in</param>
        Diag.Debug.assertParamIsJQueryObject($container, "$container");

        var projectFeatureState: IProjectFeatureState = this.getModel().getProjectFeatureState();

        if (projectFeatureState.partiallyConfigured) {
            $container.append(this._layoutPartialConfiguration(projectFeatureState.featureList));
        }
        else {
            $container.append(this._layout(projectFeatureState.featureList));
        }
    }

    private _createFeatureHelpLink(): JQuery {
        /// <summary>Creates the feature help hyperlink</summary>
        /// <returns type="jQuery" />
        return Utility.createLink(FeatureEnablement.HELPLINK_242980, Resources.FeatureEnablement_LinkText_FeatureEducation);
    }

    private _layoutPartialConfiguration(featureList: IFeature[]): JQuery {
        /// <summary>Renders the partial configuration layout for this page</summary>
        /// <param name="featureList" type="Array" elementType="IFeature">The list of features</param>
        /// <returns type="jQuery" />
        Diag.Debug.assertParamIsArray(featureList, "featureList");

        var $content = $("<div>"),
            $table = $("<table class='featureList'>");

        $content.append($("<p>").text(Resources.FeatureEnablement_Welcome_FeaturesConfigured));
        $content.append($table);
        $content.append($("<p>").append(this._createFeatureHelpLink()));
        $content.append($("<p>").text(Resources.FeatureEnablement_Welcome_Warning));
        $content.append($("<p>").append(Utility.createLink(FeatureEnablement.HELPLINK_242983,
                                                           Resources.FeatureEnablement_LinkText_ManualConfigurationHelp)));
        $content.append($("<p>").text(Resources.FeatureEnablement_Welcome_VerifyPrompt));

        $table.append($.map(featureList, (feature) => {
            return this._drawFeatureRow(feature);
        }));

        return $content.children();
    }
    
    private _drawFeatureRow(feature: IFeature): HTMLElement {
        /// <summary>Draws a row for the feature table</summary>
        /// <param name="feature" type="IFeature">Information about the feature</param>
        /// <returns type="HTMLElement" />
        Diag.Debug.assertParamIsObject(feature, "feature");

        var $tdFeatureState = $("<td>");

        switch (feature.featureState) {
            case ProjectFeatureState.NotConfigured:
                $tdFeatureState.text(Resources.FeatureEnablement_Welcome_NotConfigured);
                break;
            case ProjectFeatureState.PartiallyConfigured:
                $tdFeatureState.text(Resources.FeatureEnablement_Welcome_PartiallyConfigured);
                $tdFeatureState.addClass("incorrectlyConfiguredFeature");
                break;
            case ProjectFeatureState.FullyConfigured:
                $tdFeatureState.text(Resources.FeatureEnablement_Welcome_PreviouslyConfigured);
                break;
            default:
                Diag.Debug.fail("Unexpected feature state");
                break;
        }

        return ($("<tr>")
                .append($("<td>").text(feature.name))
                .append($tdFeatureState))[0];
    }

    private _layout(featureList: IFeature[]): JQuery {
        /// <summary>Renders the main layout for this page which displays all features when none are configured</summary>
        /// <param name="featureList" type="Array" elementType="IFeature">The list of features</param>
        /// <returns type="jQuery" />
        Diag.Debug.assertParamIsArray(featureList, "featureList");

        var $content = $("<div>");

        $content.append($("<p>").text(Resources.FeatureEnablement_Welcome_FeaturesNotConfigured));
        $content.append($("<ul class='featureList'>").append($.map(featureList, function (val) {
            return $("<li>").text(val.name)[0];
        })));
        $content.append($("<p>").append(this._createFeatureHelpLink()));
        $content.append($("<p>").text(Resources.FeatureEnablement_Welcome_VerifyPrompt));

        return $content.children();
    }

    private _onNextButtonClick(): void {
        /// <summary>Handles the next button click event</summary>
        this.getWizardManager().transition(WizardManager.Verify);
    }
}

export class ProcessTemplatePage extends BaseWizardPage implements IWizardPage {

    public static ISSUES_CLASS = "issues";

    private _$container: JQuery;

    constructor (wizardManager: WizardManager, model: Model) {
        /// <summary>Manages the choose your process template page content and button handling</summary>
        /// <param name="wizardManager" type="WizardManager">The wizard manager</param>
        /// <param name="model" type="Model">The feature enablement model</param>
        super(wizardManager, model);
    }

    public render($container: JQuery) {
        /// <summary>Renders the main wizard page content</summary>
        /// <param name="$container" type="jQuery">The container to render the wizard page content in</param>
        this._$container = $container;
        this._displayContent($container);
    }

    public getButtons(): IButton[] {
        /// <summary>Retrieves the button information to display in the Wizard</summary>
        /// <returns type="Array" />
        var processTemplateInfo: IProcessTemplateInfo[] = this.getModel().getProcessTemplateInfo(),
            buttons: IButton[] = [];

        // If there are no PTs returned or the first 1 is invalid then we dont show configure button
        if (processTemplateInfo && processTemplateInfo.length > 0 && processTemplateInfo[0].isValid) {
            buttons.push({
                text: Resources.FeatureEnablement_Button_Configure,
                click: delegate(this, this._onNextButtonClick)
            });
            buttons.push({
                text: Resources.FeatureEnablement_Button_Cancel,
                click: delegate(this, this.exit)
            });
        }
        else {
            buttons.push({
                text: Resources.FeatureEnablement_Button_Close,
                click: delegate(this, this.exit)
            });
        }

        return buttons;
    }

    private _displayContent($container: JQuery) {
        /// <summary>Renders the main content for the welcome page</summary>
        /// <param name="$container" type="jQuery">The container to rended the content in</param>
        var processTemplateInfo: IProcessTemplateInfo[] = this.getModel().getProcessTemplateInfo();

        if (processTemplateInfo.length === 1 && processTemplateInfo[0].isValid) {
            $container.append(this._displaySingleValidContent(processTemplateInfo[0]));     // 1 valid PT
        }
        else if (processTemplateInfo.length > 1 && processTemplateInfo[0].isValid) {
            $container.append(this._displayMultipleValidContent(processTemplateInfo));      // n valid PT
        }
        else if (processTemplateInfo.length === 1 && !processTemplateInfo[0].isValid) {
            $container.append(this._displaySingleInvalidContent(processTemplateInfo[0]));   // 0 valid PT - showing errors
        }
        else {
            $container.append(this._displayAllInvalidContent());                            // 0 valid PT - showing nothing
        }
    }

    private _createProcessTemplateFieldControl($container: JQuery, processTemplateInfo: IProcessTemplateInfo, indexChanged: (selectedIndex: number) => void) {
        /// <summary>Creates the control that allows selecting the process template and the action list accompanying each process template</summary>
        /// <param name="$container" type="jQuery">The container in which to create the control</param>
        /// <param name="processTemplateInfo" type="IProcessTemplateInfo">The process template info</param>
        /// <param name="indexChanged" type="Function">Function to call when the template control's index changes
        Diag.Debug.assertParamIsJQueryObject($container, "$container");
        Diag.Debug.assertParamIsObject(processTemplateInfo, "processTemplateInfo");
        Diag.Debug.assertParamIsFunction(indexChanged, "indexChanged");

        var recommendedIndex = 0;

        function getTemplateName(processTemplate: IProcessTemplateInfo, index: number): string {
            var templateName: string = processTemplate.name;

            if (processTemplate.isRecommended) {
                recommendedIndex = index;
                templateName += " " + Resources.FeatureEnablement_ProcessTemplate_MultipleValid_Recommended;
            }

            return templateName;
        }

        (<Combos.Combo>Controls.BaseControl.createIn(Combos.Combo, 
                $container,
            {
                allowEdit: false,
                source: $.map(<any>processTemplateInfo, getTemplateName),
                indexChanged: indexChanged
            })
        ).setSelectedIndex(recommendedIndex, true);
    }

    private _displaySingleValidContent(processTemplateInfoRecord: IProcessTemplateInfo): JQuery {
        /// <summary>Displays the content when 1 Process Template is valid</summary>
        /// <param name="processTemplateInfoRecord" type="IProcessTemplateInfo">The process template information</param>
        /// <returns type="jQuery" />
        Diag.Debug.assertParamIsObject(processTemplateInfoRecord, "processTemplateInfoRecord");

        var $content = $("<div>");

        // Store off the selected process template in the model.
        this.getModel().setSelectedProcessTemplateId(processTemplateInfoRecord.id);

        $content.append($("<p>").text(Resources.FeatureEnablement_SingleValidProcessTemplate_Intro)
                                .append("<br/>")
                                .append($("<span>").addClass("templateName").text(processTemplateInfoRecord.name)));

        $content.append($("<p>").text(Resources.FeatureEnablement_ChangesToBeAppliedToProject));
        $content.append($("<p>").text(Resources.FeatureEnablement_DataWontBeChanged));


        return $content.children();
    }

    private _displayMultipleValidContent(processTemplateInfo: IProcessTemplateInfo[]): JQuery {
        /// <summary>Displays the content when more than 1 Process Template is valid</summary>
        /// <param name="processTemplateInfo" type="Array">The list of information about features in process templates</param>
        /// <returns type="jQuery" />
        Diag.Debug.assertParamIsObject(processTemplateInfo, "processTemplateInfo");

        var $content = $("<div>"),
            $processTemplateCombo = $("<div>");

        $content.append($("<p>").text(Resources.FeatureEnablement_ProcessTemplate_MultipleValid_Intro));
        $content.append($("<p>").text(Resources.FeatureEnablement_ProcessTemplate_MultipleValid_PickProcessTemplate));

        $content.append($processTemplateCombo);

        $content.append($("<p>").text(Resources.FeatureEnablement_ChangesToBeAppliedToProject));

        $content.append($("<p>").text(Resources.FeatureEnablement_DataWontBeChanged));

        var applySelection = (selectedIndex: number) => {
            var templateInfo = processTemplateInfo[selectedIndex];

            // Store off the selected process template in the model.
            this.getModel().setSelectedProcessTemplateId(templateInfo.id);
        }

        // create the process template combo (which also fires the applySelection method)
        Utils_Core.delay(this, 0, this._createProcessTemplateFieldControl, [$processTemplateCombo, processTemplateInfo, applySelection]);

        return $content.children();
    }

    private _displaySingleInvalidContent(processTemplateInfoRecord: IProcessTemplateInfo): JQuery {
        /// <summary>Displays the content when 1 Process Template is invalid but is a close match and manual intervention is necessary</summary>
        /// <param name="processTemplateInfoRecord" type="Object">The process template information</param>
        /// <returns type="jQuery" />
        Diag.Debug.assertParamIsObject(processTemplateInfoRecord, "processTemplateInfoRecord");

        var $content = $("<div>");

        $content.append($("<p>").text(Resources.FeatureEnablement_ProcessTemplate_InvalidWithErrors_Intro)
                                .append("<br/>")
                                .append($("<span>").addClass("templateName").text(processTemplateInfoRecord.name)));

        $content.append($("<p>").text(Resources.FeatureEnablement_ProcessTemplate_CannotConfigure)
                                .append("<br/>")
                                .append(Utility.createLink(FeatureEnablement.HELPLINK_242983,
                                                           Resources.FeatureEnablement_LinkText_ManualConfigurationHelp)));

        $content.append($("<p>").text(Resources.FeatureEnablement_ProcessTemplate_CannotConfigureReasons)
                                .append("<br/>")
                                .append(Utility.createLink(FeatureEnablement.HELPLINK_246511,
                                                           Resources.FeatureEnablement_LinkText_ErrorEducation)));

        $content.append($("<p>").append(this._createIssuesRegion(processTemplateInfoRecord)));

        return $content.children();
    }

    private _displayAllInvalidContent(): JQuery {
        /// <summary>Displays the content when no Process Templates are valid and manual intervention is necessary</summary>
        /// <returns type="jQuery" />

        var $content = $("<div>");

        $content.append($("<p>").text(Resources.FeatureEnablement_ProcessTemplate_Invalid_Intro));
        $content.append($("<p>").text(Resources.FeatureEnablement_ProcessTemplate_CannotConfigure)
                                .append("<br/>")
                                .append(Utility.createLink(FeatureEnablement.HELPLINK_242983,
                                                           Resources.FeatureEnablement_LinkText_ManualConfigurationHelp)));

        return $content.children();
    }

    private _createIssuesRegion(processTemplateInfoRecord?: IProcessTemplateInfo): JQuery {
        /// <summary>Creates an error region to show issues that the process template had related to feature configuration</summary>
        /// <param name="processTemplateInfoRecord" type="IProcessTemplateInfo" optional="true">Optional: The process template information</param>
        /// <returns type="jQuery" />

        var $content = $("<div>").addClass(ProcessTemplatePage.ISSUES_CLASS),
            rows = 1,
            text = "";
        
        if (processTemplateInfoRecord) {
            Diag.Debug.assertParamIsObject(processTemplateInfoRecord, "processTemplateInfoRecord");
            text = $.map(processTemplateInfoRecord.issues, function (issue) {
                return issue.message;
            }).join("\n\n");
            rows = (processTemplateInfoRecord.issues.length * 2) - 1;
        }

        $content.append(Utility.createHiddenIssuesLabel());
        $content.append(Utility.createIssueTextArea(text, rows));

        return $content;
    }

    private _onNextButtonClick() {
        /// <summary>Handles the next button click event</summary>
        this.getWizardManager().transition(WizardManager.Enabling);
    }
}

VSS.initClassPrototype(ProcessTemplatePage, {
    _$container: null
});

class FinishPage extends BaseWizardPage implements IWizardPage {

    private _onBeforeCloseDelegate: () => void;

    constructor (wizardManager: WizardManager, model: Model) {
        /// <summary>Manages the finish page content and button handling</summary>
        /// <param name="wizardManager" type="WizardManager">The wizard manager</param>
        /// <param name="model" type="Model">The feature enablement model</param>
        super(wizardManager, model);
    }

    public render($container: JQuery) {
        /// <summary>Renders the main wizard page content</summary>
        /// <param name="$container" type="jQuery">The container to render the wizard page content in</param>           
        this._onBeforeCloseDelegate = delegate(this, this._onClose);

        this.getWizardManager().attachOnBeforeClose(this._onBeforeCloseDelegate);

        this._displayContent($container);
    }

    public getButtons(): IButton[] {
        /// <summary>Retrieves the button information to display in the Wizard</summary>
        /// <returns type="Array" />
        return [{
            text: Resources.FeatureEnablement_Button_Close,
            click: () => {
                this.exit();
            }
        }];
    }

    private _displayContent($container: JQuery) {
        /// <summary>Renders the main content for the welcome page</summary>
        /// <param name="$container" type="jQuery">The container to rended the content in</param>
        Diag.Debug.assertParamIsJQueryObject($container, "$container");

        $container.append($("<p>").text(Resources.FeatureEnablement_Finish_Success_Intro));
        $container.append($("<p>").text(Resources.FeatureEnablement_Finish_ConfigurationApplied));

        $container.append($("<p>").append(Utility.createLink(FeatureEnablement.HELPLINK_242980,
                                                             Resources.FeatureEnablement_LinkText_EnabledFeaturesEducation)));
        $container.append($("<br/>"));
    }
    
    private _onClose() {
        /// <summary>Perform any operations prior to closing the wizard</summary>
        var wizardManager: WizardManager = this.getWizardManager();

        wizardManager.setWizardResult(true);

        wizardManager.detachOnBeforeClose(this._onBeforeCloseDelegate);
    }
}

VSS.initClassPrototype(FinishPage, {
    _onBeforeCloseDelegate: null
});

class ErrorPage extends BaseWizardPage implements IWizardPage {

    constructor (wizardManager, model) {
        /// <summary>Manages the error page content and button handling</summary>
        super(wizardManager, model);
    }

    public render($container: JQuery) {
        /// <summary>Renders the main wizard page content</summary>
        /// <param name="$container" type="jQuery">The container to draw the content in</param>
        Diag.Debug.assertParamIsJQueryObject($container, "$container");

        $container.append($("<p>").text(Resources.FeatureEnablement_Finish_Error_Intro));
        $container.append($("<p>").text(Resources.FeatureEnablement_Finish_Error_Prefix));

        $container.append(Utility.createHiddenIssuesLabel());
        $container.append(Utility.createIssueTextArea(this.getModel().getErrorMessage()));
    }

    public getButtons(): IButton[] {
        /// <summary>Retrieves the button information to display in the Wizard</summary>
        /// <returns type="Array" />
        return [{
            text: Resources.FeatureEnablement_Button_Close,
            click: delegate(this, this.exit)
        }];
    }
}

export interface ILoadingPage extends IWizardPage {
    _$getData(isDialogOpen: () => boolean);
    _$getText(): string;
}

class LoadingPage extends BaseWizardPage implements ILoadingPage {

    private _statusIndicator: StatusIndicator.StatusIndicator;

    constructor (wizardManager, model) {
        /// <summary>Manages the loading page content and button handling</summary>
        super(wizardManager, model);
    }

    public render($container) {
        /// <summary>OVERRIDE: Renders the main wizard page content</summary>
        var $textContainer: JQuery,
            $loadingContainer = $container,
            loadingText: string = this._$getText();

        if (loadingText) {
            $container.append($textContainer = $("<p>").text(loadingText));
            $container.append($loadingContainer = $("<div>"));

            /* Explicit height is used in dialog so this is needed to not show scroll bars */
            $loadingContainer.height($container.height() - $textContainer.outerHeight(true));  // true = include margins
        }

        this._statusIndicator = <StatusIndicator.StatusIndicator>Controls.BaseControl.createIn(StatusIndicator.StatusIndicator, $loadingContainer, { center: true, imageClass: "big-status-progress" });
        this._statusIndicator.start();

        this._$getData(() => {
            return this.getWizardManager().isDialogOpen();
        });
    }

    public getButtons(): IButton[] {
        /// <summary>Retrieves the button information to display in the Wizard</summary>
        /// <returns type="Array" />
        return [{
            text: Resources.FeatureEnablement_Button_Cancel,
            click: delegate(this, this.exit)
        }];
    }

    public _$getData(isDialogOpen: () => boolean) {
        throw new Error("This is abstract");
    }
    
    public _$getText(): string {
        throw new Error("This is abstract");
    }
}

VSS.initClassPrototype(LoadingPage, {
    _statusIndicator: null
});

class LaunchPage extends LoadingPage implements ILoadingPage {

    constructor (wizardManager, model) {
        /// <summary>Manages the launch page content and button handling</summary>
        super(wizardManager, model);
    }

    public _$getData(isDialogOpen: () => boolean) {
        /// <summary>Retrieves project feature state and stores it in the model for future wizard pages</summary>
        /// <param name="isDialogOpen" type="Function">Determines whether the dialog is still open</param>
        FeatureEnablement.getDefault().beginGetProjectFeatureState(
            (projectFeatureState) => { // Success
                if (isDialogOpen()) {
                    this.getModel().setProjectFeatureState(projectFeatureState);
                    this.getWizardManager().transition(WizardManager.Welcome);
                }
            },
            (error) => { // Failure
                this.getModel().setErrorMessage(VSS.getErrorMessage(error));
                this.getWizardManager().transition(WizardManager.Error);
            }
        );
    }

    public _$getText(): string {
        /// <summary>Retrieves the text to display on the loading page</summary>
        /// <returns type="string" />
        return "";
    }
}

class VerifyPage extends LoadingPage implements ILoadingPage {

    constructor (wizardManager, model) {
        /// <summary>Manages the verify page content and button handling</summary>
        super(wizardManager, model);
    }

    public _$getData(isDialogOpen: () => boolean) {
        /// <summary>Retrieves process template information and stores it in the model for future wizard pages</summary>
        /// <param name="isDialogOpen" type="Function">Determines whether the dialog is still open</param>
        FeatureEnablement.getDefault().beginGetProcessTemplateInfo(
            (processTemplateInfo) => { // Success
                if (isDialogOpen()) { 
                    this.getModel().setProcessTemplateInfo(processTemplateInfo);
                    this.getWizardManager().transition(WizardManager.ProcessTemplate);
                }
            },
            (error) => { // Failure
                this.getModel().setErrorMessage(VSS.getErrorMessage(error));
                this.getWizardManager().transition(WizardManager.Error);
            }
        );
    }

    public _$getText(): string {
        /// <summary>Sets informational text for the user while loading</summary>
        /// <returns type="string" />
        return Resources.FeatureEnablement_Verify_LoadingInfo;
    }
}

class EnablingPage extends LoadingPage implements ILoadingPage {

    constructor (wizardManager, model) {
        /// <summary>Manages the enabling loading page content and button handling</summary>
        super(wizardManager, model);
    }

    public getButtons(): IButton[] {
        /// <summary>Retrieves the button information to display in the Wizard</summary>
        /// <returns type="Array" />

        // Overriding this since we don't want any buttons on the enabling page. if the Ajax request times out we will hit the error page.
        return [];
    }

    public _$getData(isDialogOpen: () => boolean) {
        /// <summary>Performs request to server to enable features and stores the result of that call in the model</summary>
        /// <param name="isDialogOpen" type="Function">Determines whether the dialog is still open</param>
        var finished = (success) => {
            if (isDialogOpen()) {
                this.getWizardManager().transition(success ? WizardManager.Finish : WizardManager.Error);
            }
        }

        FeatureEnablement.getDefault().beginEnableFeatures(
            this.getModel().getSelectedProcessTemplateId(),
            () => { // Success
                finished(true);
            },
            (error) => { // Error    
                this.getModel().setErrorMessage(VSS.getErrorMessage(error));
                finished(false);
            });
    }

    public _$getText(): string {
        /// <summary>Sets informational text for the user while loading</summary>
        /// <returns type="string" />

        return Resources.FeatureEnablement_Verify_EnablingInfo;
    }
}

export class WizardManager {

    public static Launch: string = "launch";
    public static Welcome: string = "welcome";
    public static ProcessTemplate: string = "processTemplate";
    public static Verify: string = "verify";
    public static Enabling: string = "enabling";
    public static Finish: string = "finish";
    public static Error: string = "error";

    private _model: Model;
    private _wizard: Wizard;
    private _wizardPageMap: Object;

    constructor () {
        /// <summary>Manages the interactions between wizard pages and the wizard host</summary>
        this._model = new Model();
    }

    public showDialog(options?: any /* TODO: Address with BaseControl options */) {
        /// <summary>Initializes and displays the Wizard</summary>
        /// <param name="options" type="Object">Options to pass to the dialog</param>
        this._wizard = Dialogs.show(Wizard, $.extend(options, {
            title: Resources.FeatureEnablement_Wizard_Title
        }));

        this.transition(WizardManager.Launch);
    }

    public transition(wizardPage: string) {
        /// <summary>Handles transitioning from page to page</summary>
        /// <param name="wizardPage" type="String">The page to transition to in the wizard</param>
        Diag.Debug.assertParamIsString(wizardPage, "wizardPage");
        
        var WizardPageCtor: (...args: any[]) => void = this._getWizardPageCtor(wizardPage),
            wizardPageInstance: BaseWizardPage;

        wizardPageInstance = new WizardPageCtor(this, this._model);

        Diag.Debug.assert(wizardPageInstance instanceof BaseWizardPage, "Wizard page must inherit from BaseWizardPage");

        this._wizard.renderPage(wizardPageInstance);
    }

    public isDialogOpen(): boolean {
        /// <summary>Determines whether the dialog has been closed</summary>
        /// <returns type="Boolean" />
        return Boolean(this._wizard.getElement());
    }

    public setWizardResult(result: any) {
        /// <summary>Sets the wizard result which can be queried</summary>
        /// <param name="result" type="Object">The result you wish to set</param>
        this._wizard.setDialogResult(result);
    }
    
    public getWizardResult(): any /* TODO: Don't want to touch any other files right now so using any until we can update getDialogResult() */ {
        /// <summary>Gets the wizard result</summary>
        /// <returns type="Object" />
        return this._wizard.getDialogResult();
    }

    public attachOnBeforeClose(handler: IEventHandler) {
        /// <summary>Allows wizard pages to attach event handlers that will be called when the wizard is closing</summary>
        /// <param name="handler" type="IEventHandler">The handler to call. Will be called with no parameters.</param>
        Diag.Debug.assertParamIsFunction(handler, "handler");

        this._wizard.attachOnBeforeClose(handler);
    }

    public detachOnBeforeClose(handler: IEventHandler) {
        /// <summary>Allows wizard pages to detach event handlers that will be called when the wizard is closing</summary>
        /// <param name="handler" type="IEventHandler">The handler to detach</param>
        Diag.Debug.assertParamIsFunction(handler, "handler");

        this._wizard.detachOnBeforeClose(handler);
    }

    public exit() {
        /// <summary>Exits the wizard experience</summary>
        if (this._wizard) {
            this._wizard.close();
        }
    }

    private _getWizardPageCtor(wizardPage: string): (...args: any[]) => void /* TODO: Returning constructor function. Figure out best way to type this. */ {
        /// <summary>Gets the wizard page constructor</summary>
        /// <param name="wizardPage" type="String">The wizard page name</param>
        /// <returns type="Function" />
        Diag.Debug.assertParamIsString(wizardPage, "wizardPage");

        var WizardPageCtor = this._wizardPageMap[wizardPage];

        Diag.Debug.assert(WizardPageCtor, "Could not find wizard page in page map");

        return WizardPageCtor;
    }
}

var map = {};
map[WizardManager.Launch] = LaunchPage;
map[WizardManager.Welcome] = WelcomePage;
map[WizardManager.ProcessTemplate] = ProcessTemplatePage;
map[WizardManager.Verify] = VerifyPage;
map[WizardManager.Enabling] = EnablingPage;
map[WizardManager.Finish] = FinishPage;
map[WizardManager.Error] = ErrorPage;


VSS.initClassPrototype(WizardManager, {
    _model: null,
    _wizard: null,
    _wizardPageMap: map
});

export interface IFeature {
    featureState: ProjectFeatureState;
    name: string;
}

export interface IProjectFeatureState {
    partiallyConfigured: boolean;
    featureList: IFeature[];
}

export interface IIssue {
    message: string;
}

export interface IProcessTemplateInfo {
    id: string;
    name: string;
    isValid: boolean;
    isRecommended: boolean;
    issues: IIssue[];
}

export class Model {
    private _projectFeatureState: IProjectFeatureState;
    private _processTemplateInfo: IProcessTemplateInfo[];
    private _errorMessage: string;
    private _selectedProcessTemplateId: string;

    constructor () {
        /// <summary>Provides get and set access to feature enablement data</summary>
    }

    public getProjectFeatureState(): IProjectFeatureState {
        /// <summary>Gets the project feature state</summary>
        /// <param name="projectFeatureState" type="Object">The project feature state</param>
        Diag.Debug.assertIsObject(this._projectFeatureState, "_projectFeatureState should have been set before attempting retrieval");
        return this._projectFeatureState;
    }

    public setProjectFeatureState(projectFeatureState: IProjectFeatureState) {
        /// <summary>Sets the project feature state</summary>
        /// <param name="processTemplateInfo" type="Object">An array of project feature state info. TODO: doc the object</param>
        Diag.Debug.assertParamIsObject(projectFeatureState, "projectFeatureState");

        this._projectFeatureState = projectFeatureState;
    }

    public getProcessTemplateInfo(): IProcessTemplateInfo[] {
        /// <summary>Gets the process template info</summary>
        /// <param name="processTemplateInfo" type="Object">The process template info</param>
        Diag.Debug.assertIsArray(this._processTemplateInfo, "_processTemplateInfo should have been set before attempting retrieval");
        return this._processTemplateInfo;
    }

    public setProcessTemplateInfo(processTemplateInfo: IProcessTemplateInfo[]) {
        /// <summary>Sets the process template info</summary>
        /// <param name="processTemplateInfo" type="Array">An array of process template info. TODO: doc the object</param>
        Diag.Debug.assertParamIsArray(processTemplateInfo, "processTemplateInfo");

        this._processTemplateInfo = processTemplateInfo;
    }

    public setSelectedProcessTemplateId(processTemplateId: string) {
        /// <summary>Sets the process template id that the user has chosen to use to perform the feature enablement.</summary>
        /// <param name="processTemplateId" type="number">Process template ID to use in performing feature enablement.</param>
        Diag.Debug.assert(Utils_String.isGuid(processTemplateId), "processTemplateId is not a Guid");

        this._selectedProcessTemplateId = processTemplateId;
    }
    
    public getSelectedProcessTemplateId(): string {
        /// <summary>Gets the process template id that the user has chosen to use to perform the feature enablement.</summary>
        /// <returns type="number" />
        Diag.Debug.assert(Utils_String.isGuid(this._selectedProcessTemplateId), "processTemplateId has not been set or is not a Guid");

        return this._selectedProcessTemplateId;
    }

    public getErrorMessage(): string {
        /// <summary>Gets the error message describing the most recent critical error that was encountered</summary>
        return this._errorMessage;
    }

    public setErrorMessage(errorMessage: string) {
        /// <summary>Sets the error message describing the most recent critical error that was encountered</summary>
        /// <param name="errorMessage" type="String">The error message describing the critical error encountered</param>
        Diag.Debug.assertParamIsString(errorMessage, "errorMessage");

        this._errorMessage = errorMessage;
    }
}

VSS.initClassPrototype(Model, {
    _projectFeatureState: null,
    _processTemplateInfo: null,
    _errorMessage: null,
    _selectedProcessTemplateId: null
});

class Utility {

    public static ISSUES_TEXTAREA_ID = "issues-textarea-id";

    public static createLink(url: string, text: string): JQuery {
        /// <summary>Creates an hyperlink</summary>
        /// <param name="url" type="String">The target url for the hyperlink</param>
        /// <param name="text" type="String">The hyperlink text</param>
        /// <returns type="jQuery" />
        Diag.Debug.assertParamIsString(url, "url");
        Diag.Debug.assertParamIsString(text, "text");

        return $("<a target='_blank' />").attr("href", url).text(text);
    }

    public static createIssueTextArea(text: string, rows?: number): JQuery {
        /// <summary>Create a read-only textarea element with the given text and rows</summary>
        /// <param name="text" type="String">The text for the textarea</param>
        /// <param name="rows" type="number" optional="true">Optional number of rows for the textarea</param>

        return $("<textarea readonly='true'>")
                    .attr("rows", rows || 5)
                    .attr("id", Utility.ISSUES_TEXTAREA_ID)
                    .val(text);
    }

    public static createHiddenIssuesLabel(): JQuery {
        /// <summary>Create a hidden LABEL element for the issues text area. Used for accessibility</summary>
        return $("<label>")
                    .text(Resources.FeatureEnablement_IssuesList)
                    .attr("for", Utility.ISSUES_TEXTAREA_ID)
                    .hide();
    }

    constructor () {
        /// <summary>Utilities used in Feature Enablement. Some of these may be candidates for platform utilities</summary>
    }
}

export enum ProjectFeatureState {
    NotConfigured = 1,
    PartiallyConfigured = 2,
    FullyConfigured = 3,
}

export class FeatureEnablement {

    private static _instance: FeatureEnablement = null;

    public static CONTROLLER_NAME: string = "FeatureEnablement";    
    public static HELPLINK_242980: string = "https://go.microsoft.com/fwlink/?LinkID=242980"; // New features link    
    public static HELPLINK_242983: string = "https://go.microsoft.com/fwlink/?LinkID=242983"; // Add feature manually link    
    public static HELPLINK_246511: string = "https://go.microsoft.com/fwlink/?LinkID=246511"; // Errors link

    public static getDefault() {
        /// <summary>Affords singleton instance retrieval</summary>
        if (!this._instance) {
            this._instance = new FeatureEnablement();
        }

        return this._instance;
    }

    constructor () {
        /// <summary>The API used to retrieve feature enablement data from the server. Do not new up directly. Use static getInstance()</summary>
    }

    public beginGetProjectFeatureState(successCallback: IResultCallback, errorCallback?: IErrorCallback) {
        /// <summary>Gets the state of the features.</summary>
        /// <param name="successCallback" type="IResultCallback">
        /// Function which will be called when the request has completed successfully.  The function will be provided
        //  with one argument for the features state:
        ///     successCallback(featuresState)
        ///
        /// The features state object has the following structure:
        ///    featuresState: [
        ///    {
        ///        name: "Planning tools",
        ///        enabled: false
        ///    },
        ///    {
        ///        name: "Code Review",
        ///        enabled: false
        ///    }]
        /// </param>
        /// <param name="errorCallback" type="IErrorCallback" optional="true">
        /// OPTIONAL: Function invoked when an error has occurred.  The function will be provided with one argument containing the error details.
        ///     errorCallback(error)
        /// </param>
        Diag.Debug.assertParamIsFunction(successCallback, "successCallback");

        var url: string,
            projectFeatureListJsonElement = $(".project-feature-list");

        if (projectFeatureListJsonElement.length) {
            successCallback(Utils_Core.parseMSJSON(projectFeatureListJsonElement.html(), false));
        }
        else {
            url = TFS_Host_TfsContext.TfsContext.getDefault().getActionUrl("GetProjectFeatureState", FeatureEnablement.CONTROLLER_NAME, { area: "api" });
            Ajax.getMSJSON(url, null, function (featuresState) {
                successCallback(featuresState);
            }, errorCallback);
        }
    }

    public beginGetProcessTemplateInfo(successCallback: IResultCallback, errorCallback?: IErrorCallback) {
        /// <summary>Get information on the process templates which can be used to perform the feature enablement.</summary>
        /// <param name="successCallback" type="IResultCallback">
        /// Called when the request has completed successfully.  The function will be provided with one argument
        /// containing the process templates information.
        ///     successCallback(processTemplatesInfo)
        ///
        /// The process templates info object has the following structure:
        ///     processTemplatesInfo: [
        ///     {
        ///         isValid: true,
        ///         name: "Agile - Preview 3",
        ///         issues: [],
        ///         actions: ["Do Agile Actions", "Add field XYZ to WIT State", "Do X and Y to Z"]
        ///     },
        ///     {
        ///         isValid: false,
        ///         name: "Scrum - Preview 3",
        ///         issues: [
        ///             {
        ///                 message: "TF123456: The field XYZ does not exist on the work item Task",
        ///                 level: Error
        ///             },
        ///             {
        ///                 message: "TF987654: The CodeReview work item does not exist"],
        ///                 level: Error
        ///             }
        ///         ],
        ///         actions: ["Do Scrum Actions", "Add field XYZ to WIT State", "Do X and Y to Z"]
        ///     }]
        /// </param>
        /// <param name="errorCallback" type="IErrorCallback" optional="true">
        /// OPTIONAL: Function invoked when an error has occurred.  The function will be provided with one argument containing the error details.
        ///     errorCallback(error)
        /// </param>
        Diag.Debug.assertParamIsFunction(successCallback, "successCallback");

        var url: string = TFS_Host_TfsContext.TfsContext.getDefault().getActionUrl("GetProcessTemplateInfo", FeatureEnablement.CONTROLLER_NAME, { area: "api" });
        Ajax.getMSJSON(url, null, function (featuresState) {
            successCallback(featuresState);
        }, errorCallback);
    }

    public beginEnableFeatures(processTemplateId: string, successCallback: IResultCallback, errorCallback?: IErrorCallback) {
        /// <summary>Perform the feature enablement with the provided process template.</summary>
        /// <param name="processTemplateId" type="number">The process template ID to use when performing the feature enablement.</param>
        /// <param name="successCallback" type="IResultCallback">Called when the operation has completed successfully.</param>
        /// <param name="errorCallback" type="IErrorCallback" optional="true">
        /// OPTIONAL: Function invoked when an error has occurred.  The function will be provided with one argument containing the error details.
        ///     errorCallback(error)
        /// </param>
        Diag.Debug.assert(Utils_String.isGuid(processTemplateId), "processTemplateId is not a Guid");
        Diag.Debug.assertParamIsFunction(successCallback, "successCallback");

        var url: string = TFS_Host_TfsContext.TfsContext.getDefault().getActionUrl("EnableFeatures", FeatureEnablement.CONTROLLER_NAME, { area: "api" });
        Ajax.postMSJSON(
            url,
            {
                processTemplateId: processTemplateId
            },
            function () {
                successCallback();
            },
            errorCallback);
    }
}

// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("TFS.Admin.FeatureEnablement", exports);
