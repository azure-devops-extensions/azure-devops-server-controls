import VSS = require("VSS/VSS");
import SPS_Host_TfsContext = require("Presentation/Scripts/TFS/SPS.Host.TfsContext");
import Controls = require("VSS/Controls");
import AccountResources = require("UserManagement/Scripts/Resources/SPS.Resources.UserManagement");

export class UserHubSigninRedirectControl extends Controls.BaseControl {
    public static enhancementTypeName: string = "tfs.account.UserHubSigninRedirect";
    private $redirectUrl: string;
    private $tfsAccountUrl: string;

    constructor(options?) {
        super(options);
    }

    public initialize() {
        super.initialize();
        this.$redirectUrl = this._getRedirectUrl();
        this.$tfsAccountUrl = this._getTfsAccountUrl();
        if (this.$redirectUrl) {
            this._redirectToSignin();
        }
    }

    private _getRedirectUrl() {
        var contextElement, url;

        contextElement = $(".userHub-redirectUrl", document);

        if (contextElement.length > 0) {
            url = contextElement.eq(0).html();
            if (url) {
                return url;
            }
        }
        return null;
    }

    private _getTfsAccountUrl() {
        var contextElement, url;

        contextElement = $(".tfsAccount-Url", document);

        if (contextElement.length > 0) {
            url = contextElement.eq(0).html();
            if (url) {
                return url;
            }
        }
        return null;
    }

    private _redirectToSignin() {
        var message = { actionId: AccountResources.SPS_ACCOUNT_LEVEL_COOKIE_MISSING, url: this.$redirectUrl };
        var strmessage = JSON.stringify(message);
        parent.postMessage(strmessage, this.$tfsAccountUrl);
    }
}
VSS.classExtend(UserHubSigninRedirectControl, SPS_Host_TfsContext.TfsContext.ControlExtensions);