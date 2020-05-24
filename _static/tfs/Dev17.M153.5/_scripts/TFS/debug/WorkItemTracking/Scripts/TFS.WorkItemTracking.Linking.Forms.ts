import * as Artifacts_Constants from "VSS/Artifacts/Constants";
import { LinkingUtilities } from "VSS/Artifacts/Services";
import "VSS/LoaderPlugins/Css!WorkItemArea";
import * as Utils_Core from "VSS/Utils/Core";
import * as Utils_String from "VSS/Utils/String";
import * as Utils_Url from "VSS/Utils/Url";
import * as VSS from "VSS/VSS";
import { CommonErrorDialog } from "WorkItemTracking/Scripts/Dialogs/CommonErrorDialog";
import { LinkForm, registerLinkForm } from "WorkItemTracking/Scripts/LinkForm";
import { RegisteredLinkTypeNames } from "WorkItemTracking/Scripts/RegisteredLinkTypeNames";
import * as Resources from "WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking";
import { WorkItemLinkForm } from "WorkItemTracking/Scripts/TFS.WorkItemTracking.Linking.Forms.WorkItem";
import { HyperlinkValidator, StoryboardLinkValidator } from "WorkItemTracking/Scripts/TFS.WorkItemTracking.LinkValidator";

const delegate = Utils_Core.delegate;

export class HyperlinkForm extends LinkForm {

    public $address: any;

    constructor(options?) {
        super(options);
        this._validator = new HyperlinkValidator(options);
    }

    public initialize() {
        super.initialize();

        // Adding location field
        const addressID = "address";
        this._element.append(LinkForm.createTitleElement(Resources.LinkDialogHyperlinkAddressTitle, addressID));
        this.$address = $("<input>")
            .attr("type", "text")
            .attr("id", addressID)
            .addClass("link-dialog-width-100 textbox")
            .bind("keyup change", delegate(this, this._onLinkChange))
            .bind("paste cut", delegate(this, () => {
                // Need to call _onLinkChange after the change has taken effect on the textbox, so use delay
                Utils_Core.delay(this, 0, () => { this._onLinkChange(null); });
            }))
            .appendTo(this._element);

        // Adding comment field
        this._createComment();

        this.fireLinkFormValidationEvent(false);
    }

    private _onLinkChange(e?) {
        const address = $.trim(this.$address.val());
        if (!address.length) {
            this.fireLinkFormValidationEvent(false);
        } else {
            this.fireLinkFormValidationEvent(true);
        }
    }

    public getLinkResult() {
        let result;
        let address = $.trim(this.$address.val());

        // If this is a file://local_path or \\local_path link, format it accordingly (file://local_path)
        address = StoryboardLinkValidator.normalizeNetworkFilePathToFileUrl(address, true);

        if (!address.length) {
            // If no URL specified, displaying warning message
            CommonErrorDialog.showDialog(
                Resources.LinkValidationFailed,
                Resources.LinksControlEnterUrl, () => { });
        } else if (this._validator.isDuplicate(address)) {
            // If the specified URL is duplicate, displaying warning message
            CommonErrorDialog.showDialog(
                Resources.LinkValidationFailed,
                Resources.LinksControlDuplicateHyperlink, () => { });
        } else if (!Utils_Url.isSafeProtocol(address)) {
            CommonErrorDialog.showDialog(
                Resources.LinkValidationFailed,
                Resources.LinksControlUnsafeUrl, () => { });
        } else {
            result = {
                linkType: "Hyperlink",
                comment: this.getComment(),
                links: [{ location: address }]
            };
        }

        return result;
    }
}

export class TestResultForm extends LinkForm {

    constructor(options?) {
        /// <summary>Test Result link form. It doesn't provide any functionality. What it does is to display
        /// a message on how to add test result using test management</summary>
        super(options);
    }

    public initialize() {
        super.initialize();
        $("<p class='test-result'/>").text(Resources.LinkFormTestResultMessage).appendTo(this._element);
    }
}

export class TestForm extends LinkForm {

    constructor(options?) {
        /// <summary>Test link form. It doesn't provide any functionality. What it does is to display
        /// a message on how to add test link using test management</summary>
        super(options);
    }

    public initialize() {
        super.initialize();
        $("<p class='test'/>").text(Resources.LinkFormTestMessage).appendTo(this._element);
    }
}

registerLinkForm(RegisteredLinkTypeNames.Test, TestForm);

export class TestResultAttachmentForm extends LinkForm {

    constructor(options?) {
        /// <summary>Test Result Attachment link form. It doesn't provide any functionality. What it does is to display
        /// a message on how to add test result attachment using test management</summary>
        super(options);
    }

    public initialize() {
        super.initialize();
        $("<div>").addClass("test-result").text(Resources.LinkFormResultAttachmentMessage).appendTo(this._element);
    }
}

export class StoryboardLinkForm extends LinkForm {

    public $address: any;

    constructor(options?: any) {
        /// <summary>Storyboard link form related functionality</summary>
        /// <param name="options" type="object">contains the work item required to link storyboard</param>
        super(options);
        this._validator = new StoryboardLinkValidator(options);
    }

    public initialize() {
        /// <summary>Create a new Storyboard link form</summary>
        super.initialize();

        // Adding address field
        const addressID = "address";
        this._element.append(LinkForm.createTitleElement(Resources.LinkDialogStoryboardLinkAddressTitle, addressID));
        this.$address = $("<input>").attr("type", "text").addClass("textbox").attr("id", addressID).addClass("link-dialog-width-100").appendTo(this._element)
            .bind("keyup change", delegate(this, this._onLinkChange))
            .bind("paste cut", delegate(this, () => {
                // Need to call _onLinkChange after the change has taken effect on the textbox, so use delay
                Utils_Core.delay(this, 0, () => { this._onLinkChange(null); });
            }));

        // Adding comment field
        this._createComment();

        this.fireLinkFormValidationEvent(false)
    }

    private _onLinkChange(e?) {
        const address = $.trim(this.$address.val());
        if (!address.length) {
            this.fireLinkFormValidationEvent(false);
        } else {
            this.fireLinkFormValidationEvent(true);
        }
    }

    public getLinkResult() {
        /// <summary>Calls the storyboard link validator and creates a result object used by the Dialog
        /// to create the storyboard link</summary>
        let result;
        const address = $.trim(this.$address.val());

        if (!address.length) {
            // If no storyboard specified, display warning message
            CommonErrorDialog.showDialog(
                Resources.LinkValidationFailed,
                Resources.LinksControlEnterStoryboardUrl, () => { });
        } else if (this._validator.isDuplicate(address)) {
            // If the specified storyboard link is duplicate, display warning message
            CommonErrorDialog.showDialog(
                Resources.LinkValidationFailed,
                Utils_String.format(Resources.LinksControlDuplicateStoryboard, address), () => { });
        } else if (!StoryboardLinkValidator.isValidStoryboardPath(address)) {
            // If the specified storyboard link is not a valid UNC path or http link, alert
            CommonErrorDialog.showDialog(
                Resources.LinkValidationFailed,
                Utils_String.format(Resources.StoryboardLinkInvalid, address), () => { });
        } else {
            result = {
                linkType: RegisteredLinkTypeNames.Storyboard,
                comment: this.getComment(),
                links: [{
                    artifactUri: LinkingUtilities.encodeUri({
                        tool: Artifacts_Constants.ToolNames.Requirements,
                        type: Artifacts_Constants.ArtifactTypeNames.Storyboard,
                        id: address
                    })
                }]
            };
        }

        return result;
    }
}

registerLinkForm("WorkItemLink", WorkItemLinkForm);

VSS.tfsModuleLoaded("TFS.WorkItemTracking.Linking.Forms", exports);
