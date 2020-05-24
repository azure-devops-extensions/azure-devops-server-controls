import CoreAjax = require("Presentation/Scripts/TFS/SPS.Legacy.Ajax");
import Utils_Core = require("VSS/Utils/Core");
import AccountResources = require("UserManagement/Scripts/Resources/SPS.Resources.UserManagement");


var delegate = Utils_Core.delegate;

export class ExtensionDynamicLinkDivs {
    private _tfsContext;
    private $buyMoreLink: JQuery;
    private $learnMoreLink: JQuery;

    private _onlyShowLearnMore: boolean;

    private static sourceQueryParameterName = "source";
    private static userHubSource = "UserHub";
    private static freeInstall = "freeInstall";

    constructor(buyMoreContainer: JQuery, learnMoreContainer: JQuery, tfsContext) {
        this.$buyMoreLink = buyMoreContainer;
        this.$learnMoreLink = learnMoreContainer;
        this._tfsContext = tfsContext;
    }

    private _setBuyMoreLinkTextAndUrl(text: string, url: string): void {
        if (this.$buyMoreLink && this.$buyMoreLink != null) {
            // modify the link to embed the source in the install page url
            var fullLink = url + (url.indexOf("?") === -1 ? "?" : "&") + ExtensionDynamicLinkDivs.sourceQueryParameterName + "=" + ExtensionDynamicLinkDivs.userHubSource + "&wt.mc_id=" + ExtensionDynamicLinkDivs.userHubSource;
            this.$buyMoreLink.empty();
            var anchor = $("<a />");
            anchor.appendTo(this.$buyMoreLink);
            anchor.attr("href", fullLink).attr("target", "_blank").text(text);
        }
    }

    private _setLearnLinkTextAndUrl(text: string, url: string): void {
        if (this.$learnMoreLink && this.$learnMoreLink != null) {
            this.$learnMoreLink.empty();
            var anchor = $("<a />");
            anchor.appendTo(this.$learnMoreLink);
            anchor.attr("href", url).attr("target", "_blank").text(text);
        }
    }

    public show() {
        if (!this._onlyShowLearnMore) {
            if (this.$buyMoreLink && this.$buyMoreLink != null)
                this.$buyMoreLink.show();
        }
        if (this.$learnMoreLink && this.$learnMoreLink != null)
            this.$learnMoreLink.show();
    }

    public hide() {
        if (this.$buyMoreLink && this.$buyMoreLink != null)
            this.$buyMoreLink.hide();
        if (this.$learnMoreLink && this.$learnMoreLink != null)
            this.$learnMoreLink.hide();
    }

    public updateLinks(extensionId: string, onlyShowLearnMore: boolean = false) {
        this._onlyShowLearnMore = onlyShowLearnMore;
        CoreAjax.getMSJSON(this._tfsContext.getActionUrl("GetExtensionUrls", "apiextension"),
            {
                mkt: "en-us",
                extensionId: extensionId
            },
            // handle success.
            delegate(this, this._getLinksSuccess),
            //handle error.
            delegate(this, this._getLinksFailed)
        );
    }

    public updateCancelPurchaseMessage(data) {
        this.show();
        this._setBuyMoreLinkTextAndUrl(AccountResources.CancelPurchaseLink, data["CancelUrl"]);
    }

    private _getLinksSuccess(data) {
        this.show();
        this._setBuyMoreLinkTextAndUrl(AccountResources.BuyMoreLink, data["BuyMoreUrl"]);
        this._setLearnLinkTextAndUrl(AccountResources.LearnMoreLink, data["LearnMoreUrl"]);
    }

    private _getLinksFailed(error) {
        this.hide();
    }
}