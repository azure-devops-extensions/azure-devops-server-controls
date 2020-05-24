import Controls = require("VSS/Controls");
import * as Utils_Accessibility from "VSS/Utils/Accessibility";

export interface ErrorMessageControlOptions {
    errorMessage: string;
    collapseOnHide?: boolean;
}

/**
 * Presents errors during widget configurations
 */
export class ErrorMessageControl extends Controls.Control<ErrorMessageControlOptions>{
     /**
     * Class to be added to the control
     */
    public static CssConfigurationErrorClass: string = "configuration-error";

    public $errorParentElement: JQuery;
    public $errorTextElement: JQuery;

    constructor(options: any) {
        super(options);
    }

    public initialize() {
        super.initialize();

        this.$errorParentElement = $('<span>')
            .addClass("inline-error-configuration")
            .append($('<span>').addClass("bowtie-icon bowtie-status-error"));

        this.$errorTextElement = $('<span>');
        this.$errorParentElement.append(this.$errorTextElement);

        this.getElement().append(this.$errorParentElement);

        if (this._options.errorMessage) {
            this.setErrorMessageWithoutShow(this._options.errorMessage);
        }

        this.hideElement();
    }

    private setErrorMessageWithoutShow(errorMessage: string, isTrustedHtml: boolean = false) {
        if (isTrustedHtml) {
            this.$errorTextElement.html(errorMessage); //Caller has to explicitly opt-in as trusted Rich Text
        }
        else {
            this.$errorTextElement.text(errorMessage);
        }
    }

    public setErrorMessage(errorMessage: string, isTrustedHtml: boolean = false) {
        this.setErrorMessageWithoutShow(errorMessage, isTrustedHtml);

        if (errorMessage && errorMessage.length > 0) {
            this.showElement();
        } else {
            this.hideElement();
        }
    }

    public showElement() {
        Utils_Accessibility.announce(this.$errorTextElement.text(), true /*assertive*/);
        if (this._options.collapseOnHide) {
            this.getElement().show();
        }
        this.getElement().addClass(ErrorMessageControl.CssConfigurationErrorClass);
    }

    public hideElement() {
        if (this._options.collapseOnHide) {
            this.getElement().hide();
        }

        this.getElement().removeClass(ErrorMessageControl.CssConfigurationErrorClass);    
    }
}