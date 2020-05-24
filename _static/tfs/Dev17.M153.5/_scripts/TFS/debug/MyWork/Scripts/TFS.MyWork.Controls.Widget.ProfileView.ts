import VSS = require("VSS/VSS");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import Controls = require("VSS/Controls");
import MyWorkSummary = require("MyWork/Scripts/TFS.MyWork.Summary");
import MyWorkResources = require("MyWork/Scripts/Resources/TFS.Resources.MyWork");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import Utils_Date = require("VSS/Utils/Date");
import Utils_UI = require("VSS/Utils/UI");
import Telemetry = require("MyWork/Scripts/TFS.MyWork.Telemetry");

var tfsContext: TFS_Host_TfsContext.TfsContext = TFS_Host_TfsContext.TfsContext.getDefault();
var domElem = Utils_UI.domElem;
var delegate = Utils_Core.delegate;

class ProfileWidgetViewConstants {
    public static coreCssClass: string = "profile-widget-view";
    public static SUMMARY_CSSCLASS = "profile-summary";

}

export class ProfileWidgetView extends Controls.BaseControl {

    private MYWORK_PROFILE: string;
    private _summaries: { [type: number]: MyWorkSummary.ISummaryContent; } = {};
    private _$greetingLabel: JQuery;

    public __test() {
        var that = this;
    }

    constructor(options?) {
        super(options);
    }

    public initializeOptions(options?: any) {
        /// <param name="options" type="any" />

        super.initializeOptions($.extend({
            coreCssClass: ProfileWidgetViewConstants.coreCssClass
        }, options));
    }

    public initialize() {
        super.initialize();
        var id = Controls.getId();

        this.MYWORK_PROFILE = id + "_mywork_profile";

        $(window).on(MyWorkSummary.Constants.SUMMARY_EVENT, delegate(this, this.handleSummaryEvent));

        this.displayContent();
    }

    public displayContent() {

        var $profileDiv = this._element;

        $(domElem("img", "image"))
            .attr("src", tfsContext.getIdentityImageUrl(tfsContext.currentIdentity.id))
            .attr("title", tfsContext.currentIdentity.displayName)
            .appendTo($profileDiv);

        this._$greetingLabel = $(domElem("span", "name"))
            .addClass(ProfileWidgetViewConstants.SUMMARY_CSSCLASS)
            .appendTo($profileDiv);

        this.updateGreeting();
    }

    private updateGreeting() {
        var summary = this.getSummary();

        var greeting: string;
        if (summary && summary.length > 0) {
            greeting = Utils_String.format(MyWorkResources.UserGreetingWithSummary, tfsContext.currentIdentity.displayName, summary);
        } else {
            greeting = Utils_String.format(MyWorkResources.GreetingFallback, tfsContext.currentIdentity.displayName);
        }

        this._$greetingLabel
            .html(greeting);
    }

    private getSummary() {
        var summaries = new Array<MyWorkSummary.ISummaryContent>();
        for (var s in this._summaries) {
            var summary = this._summaries[s];
            if (this._summaries.hasOwnProperty(s) && summary && summary.count > 0) {
                summaries.push(this._summaries[s]);
            }
        }

        this.publishTelemetry(summaries);

        return MyWorkSummary.formatSummaries(summaries);
    }

    private publishTelemetry(summaries: MyWorkSummary.ISummaryContent[]) {
        var properties: { [x: string]: string; } = {};

        summaries.forEach((s) => {
            properties[s.text] = `${s.count}`;
        });

        Telemetry.MyWorkTelemetry.publishPulseUpdate(properties);
    }

    private handleSummaryEvent(e: any, args: MyWorkSummary.ISummaryEvent) {
        this._summaries[args.type] = args.summary;
        this.updateGreeting();
    }
}

Controls.Enhancement.registerEnhancement(ProfileWidgetView, "." + ProfileWidgetViewConstants.coreCssClass);

// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("TFS.MyWork.Controls.Widget.ProfileView", exports);