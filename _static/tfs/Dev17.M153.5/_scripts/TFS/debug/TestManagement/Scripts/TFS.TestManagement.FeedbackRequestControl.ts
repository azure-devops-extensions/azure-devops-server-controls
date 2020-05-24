import Controls = require("VSS/Controls");
import Utils_Core = require("VSS/Utils/Core");
import AdminSendMail = require("Admin/Scripts/TFS.Admin.SendMail");
import FeedbackResources = require("Requirements/Scripts/Resources/TFS.Resources.RequirementsFeedback");
import Utils_UI = require("VSS/Utils/UI");
import WITOM = require("WorkItemTracking/Scripts/TFS.WorkItemTracking");
import FeedbackRequestViewModel = require("TestManagement/Scripts/TFS.TestManagement.FeedbackRequestViewModel");
import FeedbackDialog = require("TestManagement/Scripts/TFS.TestManagement.FeedbackDialog");
import Utils_String = require("VSS/Utils/String");
let RequestViewModel = FeedbackRequestViewModel.RequestViewModel;
let delegate = Utils_Core.delegate;

export class RequestControl implements FeedbackDialog.IPageControl {
    constructor(requestView: any, feedbackTitle: string) {
        this._requestView = requestView;
        this.feedbackTitle = feedbackTitle;
        this._initialize();
    }

    public getRootElement(): JQuery {
        return this.$rootElement;
    }

    public activated() {
    }

    public getSelectedIdentities() {
        return this._identityPickerControl.getSelectedEntities();
    }

    public getInvalidIdentities() {
        return this._identityPickerControl.getInvalidIdentities();
    }

    public handleErrors(errors: any) {
    }

    //TODO: Resource handling
    private _appendIdentitySelectorSection(): void {
        // append To label
        this.$rootElement.append($("<div style='font-size:14px;margin-bottom:5px;margin-top:5px;padding-right:42px;color: #666666;float:left'>")
            .text(FeedbackResources.ToLabel));

        // append identity picker label
        let $identityPicker = this._createUserPicker();
        $identityPicker.css("border", "1px solid #e6e6e6");
        $identityPicker.appendTo(this.$rootElement);
    }

    private _appendSubjectSection(): void {
        // append Subject label
        this.$rootElement.append($("<div style='font-size:14px;margin-bottom:5px;margin-top:18px;padding-right:12px;color: #666666;float:left;clear:both'>")
            .text(FeedbackResources.SubjectLabel));

        // append subject input box
        let $subjectDiv = $("<div>");
        $subjectDiv.css("overflow", "hidden");
        $subjectDiv.css("margin-top", "15px");
        let $childDiv = $("<div>");
        $subjectDiv.append($childDiv);
        let $subjectInput = $("<input>").attr("type", "text")
            .attr("style", "outline:none;padding-left:2px;")
            .attr("maxlength", WITOM.WorkItem.MAX_TITLE_LENGTH)
            .addClass("combo")
            .addClass("feedback-request-item-text-input")
            .addClass("align-with-label")
            .bind("keyup", delegate(this, function (event) {
                this._requestView.model.setValue(RequestViewModel.SUBJECT_FIELD, event.target.value);
            })).appendTo($childDiv);

        $subjectDiv.appendTo(this.$rootElement);
        $subjectInput.css("height", "26px");
        Utils_UI.Watermark($subjectInput, { watermarkText: FeedbackResources.SubjectWatermark });

        this._requestView.model.setValue(RequestViewModel.SUBJECT_FIELD, FeedbackResources.DefaultSubject);
        $subjectInput.val(FeedbackResources.DefaultSubject);
    }

    private _appendSeparator(): void {
        $("<div style='padding-top:21px;border-bottom: 1px solid #e6e6e6;width: 748px;height: 1px;overflow: hidden;clear:both;'>")
            .appendTo(this.$rootElement);
    }

    private _appendFeedbackTitleSection(): void {
        // append Feedback on
        this.$rootElement.append($("<div style='font-size:14px;margin-bottom:5px;color: #666666;clear:both;padding-top: 35px'>")
            .text(FeedbackResources.FeedbackLabel));

        // append Feedback title textbox
        let $requestTitleInput = $("<input>").attr("type", "text")
            .attr("style", "outline:none;padding-left:2px")
            .attr("maxlength", WITOM.WorkItem.MAX_TITLE_LENGTH)
            .addClass("combo")
            .addClass("feedback-request-item-text-input")
            .addClass("align-with-label")
            .bind("keyup", delegate(this, function (event) {
                this._requestView.model.setValue(RequestViewModel.FEEDBACK_TITLE, event.target.value);
            }))
            .appendTo(this.$rootElement);

        $requestTitleInput.css("height", 26 + "px");
        Utils_UI.Watermark($requestTitleInput, { watermarkText: FeedbackResources.FeedbackTitleWatermark });
        this._requestView.model.setValue(RequestViewModel.FEEDBACK_TITLE, this.feedbackTitle);
        $requestTitleInput.val(this.feedbackTitle);
    }

    private _appendNotesSection(): void {
        // append feedback instructions label
        this.$rootElement.append($("<div style='font-size:14px;margin-bottom:5px;margin-top:15px;color: #666666;float:left' id='instructions-label-id'>")
            .text(FeedbackResources.InstructionsLabel));

        // append instructions character count label
        this.$rootElement.append($("<label style='float:right;margin-top:18px' class='email-characters-count'></label>")
            .text(Utils_String.format(FeedbackResources.NotesCountLabel, 0)));

        // append feedback instructions
        let $textArea = $("<textarea aria-labelledby=\"instructions-label-id\" style=\"width:748px;height:107px;resize:none;outline:none;overflow-x:hidden\" />");

        $textArea.bind("keyup", delegate(this, function (event) {
            let value: string = event.target ? event.target.value : null;
            $(".email-characters-count").text(Utils_String.format(FeedbackResources.NotesCountLabel, value ? value.length : 0));
            if (value && value.length >= this.textAreaMaxlength) {
                $(".email-characters-count").css("color", "#C00000");
                $(".email-characters-count").attr("role", "alert");
            } else {
                $(".email-characters-count").css("color", "#6e6e6e");
                $(".email-characters-count").attr("role", "status");
            }
            this._requestView.model.setValue(RequestViewModel.FEEDBACK_INSRUCTIONS, value);
        }));
        $textArea.css("border", "1px solid #e6e6e6");
        $textArea.appendTo(this.$rootElement);
    }

    //TODO: Resource handling
    private _initialize() {
        this.$rootElement = $("<div>");
        this._appendIdentitySelectorSection();
        this._appendSubjectSection();
        this._appendSeparator();
        this._appendFeedbackTitleSection();
        this._appendNotesSection();
    }

    private _createUserPicker(): JQuery {
        let $userContainer = $("<div style='border:1px solid lightgrey;overflow:hidden;'>");
        this._identityPickerControl = <AdminSendMail.SendMailCommonIdentityPicker>Controls.BaseControl.createIn(AdminSendMail.SendMailCommonIdentityPicker, $userContainer, {
            errorHandler: delegate(this._requestView, delegate(this, function (message) {
                this._requestView.model.setValue(RequestViewModel.IDENTITIES_FIELD, this.getSelectedIdentities());
                this._requestView.model.setValue(RequestViewModel.INVALID_IDENTITIES_FIELD, this.getInvalidIdentities());
                this._requestView.handleError(message);
            }))
        });

        this._identityPickerControl.attachIdentitiesChanged(delegate(this, function () {
            this._requestView.model.setValue(RequestViewModel.IDENTITIES_FIELD, this.getSelectedIdentities());
            this._requestView.model.setValue(RequestViewModel.INVALID_IDENTITIES_FIELD, this.getInvalidIdentities());
        }));

        $userContainer.find(this._identityPickerClassName).attr("aria-label", FeedbackResources.ToLabel);

        return $userContainer;
    }

    private _requestView: FeedbackDialog.FeedbackDialog;
    private $rootElement: JQuery;
    private feedbackTitle: string;
    private textAreaMaxlength: number = 1024;
    private _identityPickerControl: any;
    private _identityPickerClassName = ".identity-picker-input";
}
