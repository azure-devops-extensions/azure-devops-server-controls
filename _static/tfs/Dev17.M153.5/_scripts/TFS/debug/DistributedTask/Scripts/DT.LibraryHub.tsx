/// <amd-dependency path='VSS/LoaderPlugins/Css!Library' />
/// <amd-dependency path='VSS/LoaderPlugins/Css!fabric' />

import SDK_Shim = require("VSS/SDK/Shim");
import VSS = require("VSS/VSS");
import VSSControls = require("VSS/Controls");
import Component_LibraryHub = require("DistributedTask/Scripts/Components/LibraryHub");
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";

export interface ILibraryItems {
}

export class LibraryHub extends VSSControls.Control<ILibraryItems> {

    public initialize(): void {
        this._disposeManagers();
        super.initialize();
        Component_LibraryHub.start($(".library-view")[0]);
    }

    public initializeOptions(options: ILibraryItems): void {
        super.initializeOptions($.extend({
            coreCssClass: "hub-view library-view"
        }, options));
    }

    public dispose(): void {
        this._disposeManagers();
        super.dispose();
    }

    private _disposeManagers(): void {
        StoreManager.dispose();
        ActionCreatorManager.dispose();
    }
}

SDK_Shim.VSS.register("dt.libraryHub", (context) => {
    return VSSControls.create(LibraryHub, context.$container, context.options);
});