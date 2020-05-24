import Q = require("q");
import VSS = require("VSS/VSS");
import Utils_String = require("VSS/Utils/String");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import WITOM = require("WorkItemTracking/Scripts/TFS.WorkItemTracking");
import Utils_Core = require("VSS/Utils/Core");
import FeedbackResources = require("Requirements/Scripts/Resources/TFS.Resources.RequirementsFeedback");
import Diag = require("VSS/Diag");
import WIT_WebApi = require("TFS/WorkItemTracking/RestClient");
import VSS_Common_Contracts = require("VSS/WebApi/Contracts");
import WIT_Contracts = require("TFS/WorkItemTracking/Contracts");
import TFS_Core_Utils = require("Presentation/Scripts/TFS/TFS.Core.Utils");
import Ajax = require("Presentation/Scripts/TFS/TFS.Legacy.Ajax");
import VSS_Resources_Common = require("VSS/Resources/VSS.Resources.Common");
import FeedbackModel = require("Requirements/Scripts/TFS.Requirements.Feedback.Models");
import TCMTelemetry = require("TestManagement/Scripts/TFS.TestManagement.Telemetry");
import WITConstants = require("Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants");

let TelemetryService = TCMTelemetry.TelemetryService;
let transformError = TFS_Core_Utils.transformError;
let tfsContext = TFS_Host_TfsContext.TfsContext.getDefault();
let delegate = Utils_Core.delegate;

export class RequestViewModel extends FeedbackModel.RequestViewModel {


    public static FEEDBACK_TITLE: string = "VSS.Requirements.Feedback.Title";
    public static FEEDBACK_INSRUCTIONS: string = "VSS.Requirements.Feedback.Instructions";

    /**
     * <summary>Creates a new instance of the Feedback Request view model with the specified options.</summary>
     * @param options
     */
    constructor(options?) {
        super(options);
    }

    /**
     * Generates the initial email preview based on the currently captured request information</summary>
     * A jQuery element for the HTML content of the email preview.
     */
    public generateModernEmailPreview() {
        let resultHtml = FeedbackResources.ModernFeedbackEmailTemplate,
            displayName = TFS_Host_TfsContext.TfsContext.getDefault().currentIdentity.displayName;

        let projectName = TFS_Host_TfsContext.TfsContext.getDefault().contextData.project.name;
        let teamName = this._team;
        let header = Utils_String.format(FeedbackResources.TeamFormat, projectName, teamName);
        let email = TFS_Host_TfsContext.TfsContext.getDefault().currentIdentity.email;
        let title = Utils_String.htmlEncode(this.getValue(RequestViewModel.FEEDBACK_TITLE));
        let instructions: string = this._getTrimmedInstructions();
        if (instructions) {
            instructions = Utils_String.htmlEncode(instructions);
            instructions = instructions.replace(/(?:\r\n|\r|\n)/g, "<br />");
        }

        Diag.logVerbose("Generating email preview");
        resultHtml = resultHtml.replace(/[\r\n]/g, Utils_String.empty);
        resultHtml = Utils_String.format(resultHtml,
            header,
            FeedbackResources.NewFeedbackRequest,
            Utils_String.format(FeedbackResources.ProvideFeedbackFormat, email, displayName, title),
            FeedbackResources.Instructions,
            instructions ? instructions : FeedbackResources.NoInstructions,
            Utils_String.empty,
            FeedbackResources.ProvideFeedback,
            FeedbackResources.QuickTip,
            FeedbackResources.EmailTip,
            Utils_String.format(FeedbackResources.EmailFooterHeaderFormat, email, displayName),
            FeedbackResources.GetStarted,
            FeedbackResources.LearnMore,
            FeedbackResources.Support);
        return resultHtml;
    }

    public beginSendMail(feedbackWorkItem, completionCallback, errorCallback?) {
        let to = this.getValue(RequestViewModel.TO_FIELD),
            subject = this.getValue(RequestViewModel.SUBJECT_FIELD),
            body = this.getValue(RequestViewModel.BODY_FIELD),
            title = this.getValue(RequestViewModel.FEEDBACK_TITLE),
            instructions = this._getTrimmedInstructions(),
            actionUrl = this.getRequirementsSendMailUrl({teamId: this._team}),
            myId = { tfids: [TFS_Host_TfsContext.TfsContext.getDefault().currentIdentity.id] },
            parameters,
            recipients;

        this._pushTelemetryEvents();

        if (body !== null && body !== undefined && body.length > 1024) {
            body = body.substring(0, 1024);
        }

        Diag.Debug.assert(to, "To address is required");
        recipients = this._jsonifyRecipients(to);

        parameters = {
            message: Utils_Core.stringifyMSJSON({
                to: recipients,
                cc: myId,
                replyTo: myId,
                subject: subject,
                body: body
            }),
            title: title,
            id: feedbackWorkItem.id,
            instructions: instructions
        };

        Ajax.postMSJSON(actionUrl, parameters, completionCallback,
            transformError(errorCallback, FeedbackResources.FeedbackRequestEmailFailed));
    }

    public beginSendRequest(completionCallback, errorCallback?) {
        let that = this,
            nonFatalErrorCallback,
            wrappedErrorCallback;

        wrappedErrorCallback = function (error) {
            that._operationInProgress = false;

            if ($.isFunction(errorCallback)) {
                errorCallback.call(this, error);
            }
        };

        nonFatalErrorCallback = transformError(errorCallback, function (error) {
            that._operationInProgress = false;
            error.isNonFatal = true;
            return error;
        });

        this._operationInProgress = true;
        this._raiseBeginOperation();

        let onGetConfigurationCompleted = function () {
            Diag.Debug.assertIsObject(this._configuration, "Configuration was not initialized");

            let emailBody = this.getValue(RequestViewModel.BODY_FIELD),
                maxCharsInEmailBody = this._configuration.maxCharsInEmailBody,
                bytesPerChar = this._configuration.bytesPerChar;

            Diag.Debug.assert(typeof emailBody === "string", "email body is not a string");
            Diag.Debug.assert(typeof maxCharsInEmailBody === "number", "maxCharsInEmailBody is not a number");
            Diag.Debug.assert(typeof bytesPerChar === "number", "bytesPerChar is not a number");

            // Early validation of the email body size:
            //     The email body at this stage is still not the final version, but its size is close to the final one's.
            // Trying the size check here so as to avoid unnecessary server calls.
            if (emailBody.length > maxCharsInEmailBody) {
                wrappedErrorCallback(Utils_String.format(VSS_Resources_Common.EmailExceedsMaxBodySizeLimit, maxCharsInEmailBody * bytesPerChar / 1024));
                return;
            }

            let witClient = WIT_WebApi.getClient();
            let project = TFS_Host_TfsContext.TfsContext.getDefault().contextData.project.name;

            this._getDefaultFeedbackWorkItemType().then((workItemType) => {
                witClient.createWorkItem(that._getCreatePatchDocument(), project, workItemType)
                    .then((feedbackWorkItem: WIT_Contracts.WorkItem) => {
                        that.beginSendMail(
                            feedbackWorkItem,
                            delegate(this, completionCallback),
                            delegate(this, nonFatalErrorCallback));
                    });
            });
        };

        this.beginGetConfiguration(
            delegate(this, onGetConfigurationCompleted),
            delegate(this, wrappedErrorCallback));
    }

    protected setDefaultSubject(): void {
    }

    protected clearPreviewFields(): void {
    }

    protected getRequirementsSendMailUrl(params?: any) {
        return tfsContext.getActionUrl("sendFeedbackMail", "feedback", $.extend({ area: "api" }, params));
    }

    protected validateModel() {
        this._errors.clear();

        let errors = [],
            toAddresses,
            appLaunchUrl,

            feedbackTitle = this.getValue(RequestViewModel.FEEDBACK_TITLE);
        if (!feedbackTitle || feedbackTitle.length > WITOM.WorkItem.MAX_TITLE_LENGTH) {
            errors.push({ id: RequestViewModel.FEEDBACK_TITLE });
        }

        let subject = this.getValue(RequestViewModel.SUBJECT_FIELD);
        if (!subject || subject.length > WITOM.WorkItem.MAX_TITLE_LENGTH) {
            errors.push({ id: RequestViewModel.SUBJECT_FIELD });
        }

        let identities = this.getValue(RequestViewModel.IDENTITIES_FIELD);
        if (identities == null || identities.length === 0) {
            errors.push({
                id: RequestViewModel.IDENTITIES_FIELD
            });
        }

        toAddresses = this.getValue(RequestViewModel.TO_FIELD);
        if (!toAddresses) {
            errors.push({ id: RequestViewModel.TO_FIELD });
        }

        let message;
        let invalidIdentities = this.getValue(RequestViewModel.INVALID_IDENTITIES_FIELD) == null ? [] : this.getValue(RequestViewModel.INVALID_IDENTITIES_FIELD);
        if (invalidIdentities.length > 0) {
            message = Utils_String.format(FeedbackResources.FeedbackRequest_Error_FailedProvidersReselectOnly, invalidIdentities.join(", "));
            errors.push({
                id: RequestViewModel.INVALID_IDENTITIES_FIELD,
                message: message
            });
        }

        this._errors.addRange(errors);
        this._raiseModelValidated(this._errors);
    }

    protected hasIndexPageValidationError(): boolean {
        return ((this._errors.getById(RequestViewModel.IDENTITIES_FIELD) ||
            this._errors.getById(RequestViewModel.SUBJECT_FIELD) ||
            this._errors.getById(RequestViewModel.FEEDBACK_TITLE)));
    }

    protected initializeRequestItems(): void {
    }

    private _getTrimmedInstructions(): string {
        let instructions = this.getValue(RequestViewModel.FEEDBACK_INSRUCTIONS) || Utils_String.empty;
        if (instructions && instructions.length > this.maxInstructionsLength) {
            instructions = instructions.substr(0, this.maxInstructionsLength);
        }
        return instructions;
    }

    private _getCreatePatchDocument(): VSS_Common_Contracts.JsonPatchDocument {
        let to = this.getValue(RequestViewModel.TO_FIELD);
        let recipients = this._jsonifyRecipients(to);
        let descriptionText = Utils_String.format(FeedbackResources.FeedbackRequestDescriptionFormat, recipients.tfIds.join(", "));
        let comment = Utils_String.format(FeedbackResources.EmailSentTo, to);
        let instructions: string = this._getTrimmedInstructions();
        if (instructions) {
            instructions = Utils_String.htmlEncode(instructions);
            instructions = instructions.replace(/(?:\r\n|\r|\n)/g, "<br />");
        }

        let postData: VSS_Common_Contracts.JsonPatchDocument[] = [
            {
                "op": "add",
                "path": "/fields/System.Title",
                "value": this.getValue(RequestViewModel.FEEDBACK_TITLE)
            },
            {
                "op": "add",
                "path": "/fields/System.IterationPath",
                "value": this._options.fieldData[WITConstants.CoreField.IterationPath]
            },
            {
                "op": "add",
                "path": "/fields/System.Description",
                "value": descriptionText
            },
            {
                "op": "add",
                "path": "/fields/System.History",
                "value": comment
            },
            {
                "op": "add",
                "path": "/fields/Microsoft.VSTS.Feedback.ApplicationType",
                "value": this._configuration.applicationTypes.webApplication
            },
            {
                "op": "add",
                "path": "/fields/Microsoft.VSTS.Feedback.ApplicationLaunchInstructions",
                "value": instructions
            },
            {
                "op": "add",
                "path": "/relations/-",
                "value": {
                    "rel": "System.LinkTypes.Hierarchy-Reverse",
                   "url": this._getWorkItemApiUrl(this._options.fieldData[WITConstants.CoreField.Id]),
                    "attributes": {
                        "comment": ""
                    }
                }
            }
        ];
        if (this._options.fieldData[WITConstants.CoreField.AreaPath])
        {
            postData.push({
                "op": "add",
                "path": "/fields/System.AreaPath",
                "value": this._options.fieldData[WITConstants.CoreField.AreaPath]
                });
        }
        return postData as VSS_Common_Contracts.JsonPatchDocument;
    }

    private _getWorkItemApiUrl(workItemId: number): string {
        let tfsContext = TFS_Host_TfsContext.TfsContext.getDefault();
        let webContext = tfsContext.contextData;
        let collectionUrl = webContext.collection.uri;

        // build url
        let wiUrl = collectionUrl
            + "_apis/wit/workItems/"
            + workItemId;
        wiUrl = encodeURI(wiUrl);

        return wiUrl;
    }

    private _getDefaultFeedbackWorkItemType(): IPromise<string> {
        let workItemType;
        let witClient = WIT_WebApi.getClient();
        let project = TFS_Host_TfsContext.TfsContext.getDefault().contextData.project.name;
        return witClient.getWorkItemTypeCategory(project, this.feedbackCategory)
            .then((workItemTypeCategory) => {
                workItemType = workItemTypeCategory.defaultWorkItemType.name;
                return workItemType;
            });
    }

    private _pushTelemetryEvents(): void {
        let fullInstructions: string = this.getValue(RequestViewModel.FEEDBACK_INSRUCTIONS) || Utils_String.empty;
        if (fullInstructions.length > this.maxInstructionsLength) {
            TelemetryService.publishEvents(TelemetryService.featureRequestFeedbackInstructionsTrimmed, {});
        }
        TelemetryService.publishEvents(TelemetryService.featureSentRequestFeedback, {});
    }

    private maxInstructionsLength: number = 1024;
    private feedbackCategory: string = "Microsoft.FeedbackRequestCategory";
}
