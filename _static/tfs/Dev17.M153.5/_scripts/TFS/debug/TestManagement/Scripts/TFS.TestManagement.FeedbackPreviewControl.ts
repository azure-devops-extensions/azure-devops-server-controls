import Utils_Core = require("VSS/Utils/Core");
import AdminSendMail = require("Admin/Scripts/TFS.Admin.SendMail");
import FeedbackResources = require("Requirements/Scripts/Resources/TFS.Resources.RequirementsFeedback");
import FeedbackRequestViewModel = require("TestManagement/Scripts/TFS.TestManagement.FeedbackRequestViewModel");
import FeedbackRequestControl = require("TestManagement/Scripts/TFS.TestManagement.FeedbackRequestControl");
import FeedbackDialog = require("TestManagement/Scripts/TFS.TestManagement.FeedbackDialog");
import WITOM = require("WorkItemTracking/Scripts/TFS.WorkItemTracking");

let RequestViewModel = FeedbackRequestViewModel.RequestViewModel;
let delegate = Utils_Core.delegate;
let RequestControl = FeedbackRequestControl.RequestControl;

export class PreviewControl implements FeedbackDialog.IPageControl {
    private _requestView: FeedbackDialog.FeedbackDialog;
    private $rootElement: JQuery;
    private $emailAddresses: JQuery;
    private $subject: JQuery;
    private $emailPreview: JQuery;
    private _messageForm: AdminSendMail.MessageForm;

    constructor(requestView: any) {
        this._requestView = requestView;
        this._initialize();
    }

    public activated() {
        let model = this._requestView.model,
            longRunningOperation = this._requestView.getLongRunningOperation(),
            that = this,
            identityValidationError;

        identityValidationError = this._requestView.model.getErrors().getById(RequestViewModel.INVALID_IDENTITIES_FIELD);

        if (identityValidationError && identityValidationError.message) {
            this._requestView.handleError(identityValidationError.message);
        }

        longRunningOperation.beginOperation(function () {
            model.beginPrepareRequest(function () {
                longRunningOperation.endOperation();
                that.setMailData(model.getValue(RequestViewModel.TO_FIELD),
                    model.getValue(RequestViewModel.SUBJECT_FIELD));
            }, delegate(that._requestView, that._requestView.handleError));
        });
    }

    public getRootElement(): JQuery {
        return this.$rootElement;
    }

    public setMailData(toAddresses: string, mailSubject: string) {
        this.$emailAddresses.val(toAddresses);
        this.$subject.val(mailSubject);
        this.$emailPreview.html(this._requestView.model.generateModernEmailPreview());
    }

    //TODO: Resource handling
    private _appendAddressSection(): void {
        // append To label
        this.$rootElement.append($("<div style='font-size:14px;margin-bottom:5px;margin-top:5px;padding-right:42px;color: #666666;float:left'>")
            .text(FeedbackResources.ToLabel));

        // append To input box
        let $addressDiv = $("<div>");
        $addressDiv.css("overflow", "hidden");
        let $childDiv = $("<div>");
        $addressDiv.append($childDiv);
        this.$emailAddresses = $("<input>").attr("type", "text")
            .attr("style", "outline:none;padding-left:2px;")
            .attr("disabled", "")
            .attr("maxlength", WITOM.WorkItem.MAX_TITLE_LENGTH)
            .addClass("combo")
            .addClass("feedback-request-item-text-input")
            .addClass("align-with-label")
            .appendTo($childDiv);

        this.$emailAddresses.css("height", "26px");
        this.$emailAddresses.val(this._requestView.model.getValue(RequestViewModel.TO_FIELD));
        $addressDiv.appendTo(this.$rootElement);
    }
    
    private _appendSubjectSection(): void {
        // append Subject label
        this.$rootElement.append($("<div style='font-size:14px;margin-bottom:24px;margin-top:18px;padding-right:12px;color: #666666;float:left;clear:both'>")
            .text(FeedbackResources.SubjectLabel));

        // append subject input box
        let $subjectDiv = $("<div>");
        $subjectDiv.css("overflow", "hidden");
        $subjectDiv.css("margin-top", "15px");
        let $childDiv = $("<div>");
        $subjectDiv.append($childDiv);
        this.$subject = $("<input>").attr("type", "text")
            .attr("style", "outline:none;padding-left:2px;")
            .attr("disabled", "")
            .attr("maxlength", WITOM.WorkItem.MAX_TITLE_LENGTH)
            .addClass("combo")
            .addClass("feedback-request-item-text-input")
            .addClass("align-with-label")
            .appendTo($childDiv);

        $subjectDiv.appendTo(this.$rootElement);
        this.$subject.css("height", "26px");
        this.$subject.val(this._requestView.model.getValue(RequestViewModel.SUBJECT_FIELD));
    }

    private _emailPreviewSection(): void {
        //append email preview
        this.$emailPreview = $("<div>");
        this.$emailPreview.css("max-height", "300px");
        this.$emailPreview.css("clear", "both");
        this.$emailPreview.appendTo(this.$rootElement);
    }

    //TODO: Resource handling
    private _initialize() {
        this.$rootElement = $("<div>");
        this._appendAddressSection();
        this._appendSubjectSection();
        this._emailPreviewSection();

        $("#send-button").focus();
    }

    public handleErrors(errors) {
        this.$rootElement.find("*").removeClass("invalid");
    }
}
