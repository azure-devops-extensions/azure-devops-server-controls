import Controls = require("VSS/Controls");
import Resources = require("WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking");
import VSS = require("VSS/VSS");
import Events_Services = require("VSS/Events/Services");
import { ToolNames } from "VSS/Artifacts/Constants";
import { IRegisteredLinkType } from "WorkItemTracking/Scripts/OM/WorkItemInterfaces";
import { WorkItem } from "WorkItemTracking/Scripts/TFS.WorkItemTracking";
import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import { FeatureAvailabilityFlags } from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";

const linkForms = {};
const eventSvc = Events_Services.getService();

export function registerLinkForm(name: string, linkFormType: { new(options?: any): LinkForm; }) {
    /// <summary>Registers link type form for add link dialog</summary>
    /// <param name="name" type="String">Link type name to be registered</param>
    /// <param name="linkFormType" type="{ new (options?: any): LinkForm; }">Type of the link type form</param>

    registerLinkFormAsync(name, (callback: any) => { callback(linkFormType); });
}

export function registerLinkFormAsync(name: string, callback: (linkFormType: { new(options?: any): LinkForm; }) => void) {
    /// <summary>Registers link type form for the add link dialog (fetched asynchronously)</summary>
    /// <param name="name" type="String">Link type name to be registered</param>
    /// <param name="linkFormType" type="{ new (options?: any): LinkForm; }">Type of the link type form</param>

    name = name.toUpperCase();
    linkForms[name] = callback;
}

export function beginGetLinkForm(name: string, callback: (linkFormType: { new(options?: any): LinkForm; }) => void) {
    /// <summary>Gets the registers link form type by the specified name</summary>
    /// <param name="name" type="String">Name of the link type form</param>
    let asyncGetFormMethod: any;

    name = name.toUpperCase();
    asyncGetFormMethod = linkForms[name];

    if (asyncGetFormMethod) {
        asyncGetFormMethod(callback);
    } else {
        callback(null);
    }
}

/**
 * Checks if a LinkForm is registered for the link type form. 
 * @param name Name of the link type form
 */
export function isLinkFormRegistered(linkType: IRegisteredLinkType): boolean {
    return !!linkForms[linkType.name.toUpperCase()] ||
        (FeatureAvailabilityService.isFeatureEnabled(FeatureAvailabilityFlags.GitHubIntegration) && linkType.toolId === ToolNames.GitHub); // GitHub links use a shared external connection link form so not individually registered. 
}

export class LinkForm extends Controls.BaseControl {
    public static LINKFORM_VALIDATED = "linkform-validated";

    public static createTitleElement(title, labelFor?: string, labelClass?: string) {
        /// <param name="labelFor" type="string" optional="true" />

        var label = $("<label/>").addClass("dialog-linkform-label").text(title);

        if (labelFor) {
            label.attr("for", labelFor);
        }

        if (labelClass) {
            label.addClass(labelClass);
        }

        return label;
    }

    public static createTitleElementWithIconClass(title: string, labelFor: string, iconClass: string, labelClass?: string, errorContainer?: JQuery) {
        var result = $("<div/>").addClass("section-title");
        $("<div/>").addClass(iconClass).appendTo(result);
        LinkForm.createTitleElement(title, labelFor, labelClass).appendTo(result);

        if (errorContainer) {
            errorContainer.appendTo(result);
        }

        return result;
    }

    public _workItem: WorkItem;
    public _validator: any;

    constructor(options?) {

        super(options);
        this._workItem = options.workItem;
    }

    public initializeOptions(options?: any) {
        /// <param name="options" type="any" />

        super.initializeOptions($.extend({
            coreCssClass: "link-dialog-form"
        }, options));
    }

    public _createComment() {
        /// <summary>Creates comment elements for the form</summary>
        const commentID = "comment";
        if(this._element != null) {
            this._element.append(LinkForm.createTitleElement(Resources.LinkDialogCommentTitle, commentID));
            this._element.append($("<input>")
                .attr("type", "text")
                .attr("id", commentID)
                .addClass("link-dialog-width-100"));
        }  
    }

    public getComment() {
        return $.trim(this._element.find("#comment").val());
    }

    LinkResult() {
        return null;
    }

    public unload() {
        this.dispose();
        this._workItem = null;
        this._validator = null;
    }

    public fireLinkFormValidationEvent(isValid: boolean) {
        eventSvc.fire(LinkForm.LINKFORM_VALIDATED, this, { linkForm: isValid });
    }
}

VSS.initClassPrototype(LinkForm, {
    _workItem: null,
    _validator: null
});
