import VSS = require("VSS/VSS");
import Utils_String = require("VSS/Utils/String");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import TFS_OM_Identities = require("Presentation/Scripts/TFS/TFS.OM.Identities");
import WITOM = require("WorkItemTracking/Scripts/TFS.WorkItemTracking");

export class LinkSetting {

    public static macros: string[] = ["PortalPage", "ProcessGuidance", "ReportManagerUrl", "ReportServiceSiteUrl"];

    private _options: any;
    private _notConfigured: any;

    constructor(options?) {
        this._options = options;
    }

    public getUrl(workItem: WITOM.WorkItem, resourceLocations): string {
        /// <returns type="string" />

        var urlRoot,
            urlPath;


        this._notConfigured = null;
        urlRoot = this._getRootUrl(resourceLocations || {});
        urlPath = this._getUrlPath(workItem);

        if (this._notConfigured) {
            var tfsContext = workItem ? workItem.store.getTfsContext() : TFS_Host_TfsContext.TfsContext.getDefault();
            urlRoot = tfsContext.getActionUrl("notConfigured", "workItems");
            urlPath = "?type=" + this._notConfigured;
        }

        return this._combineUrl(urlRoot, urlPath);
    }

    private _getRootUrl(resourceLocations) {
        var self = this,
            link = this._options.link,
            urlRoot = null;

        $.each(LinkSetting.macros, function () {
            if (link.urlRoot === ("@" + this)) {
                if (resourceLocations[this]) {
                    urlRoot = resourceLocations[this];
                }
                else {
                    self._notConfigured = this;
                }
                return false;
            }
        });

        if (!urlRoot) {
            urlRoot = link.urlRoot;
        }

        return urlRoot;
    }

    private _getUrlPath(workItem) {
        var self = this,
            urlPath,
            params,
            link = this._options.link;

        urlPath = link.urlPath || "";

        if ($.isArray(link.params)) {
            params = [urlPath];
            $.each(link.params, (i, p) => {
                var field;
                if (p) {
                    field = workItem.getField(p.value);
                    //We are handling a special case here for onprem customers who use webpagecontrols.
                    //In Webpagecontrol, customers can grab the identity field value from the workitem and incorporate it into the URL of the control.
                    //After VS2015, we put "<>" in the identity field value (e.g. John Doe <johnd@vs.com>) to disambiguate users.
                    //This results to adding "<>" to the URL of the webpagecontrol. And .NET treat this as a security risk.
                    //To resolve this issue, we remove the "<>" from the identity field value from the URL.
                    if (field) {
                        params[params.length] = field.fieldDefinition.isIdentity ? this._removeBrackets(field.getValue(p.original)) : field.getValue(p.original);
                    }
                    else {
                        params[params.length] = "";
                    }
                }
            });

            try {
                urlPath = Utils_String.format.apply(String, params);
            }
            catch (e) {
                self._notConfigured = "InvalidParameterFormat";
            }
        }

        return urlPath;
    }

    private _removeBrackets(value: string): string {
        let identity = TFS_OM_Identities.IdentityHelper.parseUniquefiedIdentityName(value);
        return identity ? identity.displayName : "";
    }

    /// <summary>Combinees UrlRoot and UrlPath</summary>
    /// <param name="urlRoot" type="string">Contains urlRoot with/without '/' at end</param>
    /// <param name="urlPath" type="string">Contains urlPath with/without '/' at beginning</param>
    /// <Return type="string">Returns a valid url string containing urlRoot, urlPath</param>
    public _combineUrl(urlRoot: string, urlPath: string): string {
        // trim parts
        if (urlRoot) {
            urlRoot = urlRoot.trim();
        }
        if (urlPath) {
            urlPath = urlPath.trim();
        }

        // check if only one part is specified
        if (!urlRoot && !urlPath) {
            return "";
        }
        if (!urlRoot) {
            return urlPath;
        }
        if (!urlPath) {
            return urlRoot;
        }
        // both parts have slash, remove the duplicate
        if (urlRoot.charAt(urlRoot.length - 1) === '/' && urlPath.charAt(0) === '/') {
            return urlRoot + urlPath.substring(1, urlPath.length);
        }
        // one part has a slash
        if (urlRoot.charAt(urlRoot.length - 1) === '/' || urlPath.charAt(0) === '/') {
            return urlRoot + urlPath;
        }
        // none have slash
        return urlRoot + '/' + urlPath;
    }
}

VSS.initClassPrototype(LinkSetting, {
    _options: null,
    _notConfigured: null
});