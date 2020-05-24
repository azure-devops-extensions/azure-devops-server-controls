
import Contributions_Controls = require("VSS/Contributions/Controls");
import Controls = require("VSS/Controls");

export class PivotTabsContributionProvider extends Controls.BaseControl {

    public static getContributedExtensionHost($container: JQuery, contributionId: string) {
        Contributions_Controls.createExtensionHost($container, contributionId);
    }
}