
import "VSS/LoaderPlugins/Css!TfsCommon/Navigation/L1.ProjectSelector";

import Controls = require("VSS/Controls");
import Menus = require("VSS/Controls/Menus");
import Resources = require("TfsCommon/Scripts/Resources/TFS.Resources.TfsCommon");
import SDK_Shim = require("VSS/SDK/Shim");


SDK_Shim.registerContent("navbar.level1.collectionSelector", (context) => {

    let $collectionSelector = context.$container.find(".l1-collection-selector");

    if ($collectionSelector.length > 0 && !$collectionSelector.hasClass("read-only")) {
        // Enhance when the control is present on the page and there are multiple collections present
        Controls.Enhancement.enhance(
            Menus.MenuBar,
            $collectionSelector,
            <Menus.MenuBarOptions>{
                ariaLabel: Resources.CollectionSelectorLabel
            });
    }
});
