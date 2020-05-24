///<amd-dependency path="jQueryUI/core"/>
///<reference types="jquery" />

import VSS = require("VSS/VSS");
import Admin_Controls = require("Admin/Scripts/TFS.Admin.Controls");
import Admin_Common = require("Admin/Scripts/TFS.Admin.Common");
import Ajax = require("Presentation/Scripts/TFS/TFS.Legacy.Ajax");
import Controls = require("VSS/Controls");
import Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import SDK_Shim = require("VSS/SDK/Shim");
import Navigation = require("VSS/Controls/Navigation");

var TfsContext = Host_TfsContext.TfsContext;
var tfsContext = Host_TfsContext.TfsContext.getDefault();

class OrganizationSecurityView extends Controls.BaseControl {

    constructor(options?) {
        super(options);
    }

    public initialize() {
        Ajax.getHTML(
            tfsContext.getActionUrl('index', 'security', { area: 'admin' }),
            { isOrganizationLevel: true },
            (content) => {
                this.getElement().empty();
                this.getElement().html(content);

                if (!$('.manage-identities-error-view', this._element).length) {
                    Controls.Enhancement.enhance(Navigation.PivotView, $('.manage-view-tabs', this._element));
                    Controls.Enhancement.enhance(Admin_Common.VerticalFillLayout, $('.vertical-fill-layout', this._element));
                    Controls.Enhancement.enhance(Admin_Controls.ManageIdentitiesView, $('.manage-identities-view', this._element));
                    VSS.globalProgressIndicator.registerProgressElement($('.hub-progress', this._element));
                    $("#manage-identities-create-group", this._element).hide();
                }
            },
            (error) => {
            });     
    }
}

SDK_Shim.registerContent("organizationAdministration.organizationSecurityHub", (context) => {
    return Controls.create(OrganizationSecurityView, context.$container, context.options);
});

VSS.initClassPrototype(OrganizationSecurityView, {});

VSS.classExtend(OrganizationSecurityView, TfsContext.ControlExtensions);

// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("TFS.Admin.Controls.OrganizationSecurity", exports);
