import Controls = require("VSS/Controls");
import TFS_CORE_AJAX = require("Presentation/Scripts/TFS/TFS.Legacy.Ajax");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import PresentationResources = require("Presentation/Scripts/TFS/Resources/TFS.Resources.Presentation");
import LOCATIONS = require("VSS/Locations");
import VSS = require("VSS/VSS");

export class StakeholderLicenseMessageControl extends Controls.BaseControl {

    public initialize() {
        super.initialize();

        var refreshButton: JQuery = this._element.find(".refresh-action");
        refreshButton.bind("click", this.refreshLicense);
    }

    refreshLicense() {
        var refreshUserRightsUrl = TFS_Host_TfsContext.TfsContext.getDefault().getActionUrl('RefreshUserRights', 'user', { area: 'api' });
        TFS_CORE_AJAX.postHTML(
            refreshUserRightsUrl,
            null,
            function (data) {
                window.location.reload();
            },
            null,
            {
                wait: {

                    image: LOCATIONS.urlHelper.getVersionedContentUrl("big-progress.gif"),
                    message: PresentationResources.StakeholderMsdnEligibleRefreshButtonPageWaitText,
                    target: $('.content-section')
                }
            });
      }
}

Controls.Enhancement.registerEnhancement(StakeholderLicenseMessageControl, "div.stakeholder-license-message");
