import * as BuildResources from "Build/Scripts/Resources/TFS.Resources.Build";

import { BuildLinks } from "Build.Common/Scripts/Linking";

import * as Marked from "Presentation/Scripts/marked";

import { BaseControl, Enhancement } from "VSS/Controls";
import { MessageAreaControl, MessageAreaType } from "VSS/Controls/Notifications";
import { format } from "VSS/Utils/String";

import "VSS/LoaderPlugins/Css!Build/Views.Explorer.Banner";

export class Banner extends BaseControl {
    private _messageAreaControl: MessageAreaControl = null;

    constructor() {
        super();
    }

    public initialize() {
        const message = Marked(format(BuildResources.ExplorerWarningMarkDown, BuildLinks.getMyDefinitionsLink()));
        this._messageAreaControl = new MessageAreaControl({
            message: {
                content: $(message),
                type: MessageAreaType.Warning
            },
            showDetailsLink: false,
            showHeader: false
        });
        this._messageAreaControl.enhance(this._element);

        this._messageAreaControl._bind(MessageAreaControl.EVENT_CLOSE_ICON_CLICKED, () => {
            document.cookie = "Tfs-HideBuildExplorerWarningBanner=true";
        })
    }
}

Enhancement.enhance(Banner, ".explorer-warning-message");