import "VSS/LoaderPlugins/Css!WorkCustomizationStyles";

import Service = require("VSS/Service");
import * as TFS_Host_TfsContext from "Presentation/Scripts/TFS/TFS.Host.TfsContext";

import * as BacklogLevelsComponent from "Admin/Scripts/BacklogLevels/Components/BacklogLevelsComponent";
import { Store } from "Admin/Scripts/BacklogLevels/Stores/Store";
import { ActionsHub } from "Admin/Scripts/BacklogLevels/Actions/ActionsHub";
import { ActionsCreator } from "Admin/Scripts/BacklogLevels/Actions/ActionsCreator";
import * as AdminProcessCommon from "Admin/Scripts/TFS.Admin.Process.Common";
import * as Interfaces from "Admin/Scripts/BacklogLevels/Interfaces";

export function CreateBacklogLevelsView(
    container: JQuery,
    process: Interfaces.IProcessDescriptor) {

    var actionsHub = new ActionsHub();
    var props: BacklogLevelsComponent.IBacklogLevelsComponentProps = {
        store: new Store(actionsHub, process),
        actionsCreator: new ActionsCreator(actionsHub, process),
    };

    BacklogLevelsComponent.BacklogLevelsComponent.render(container.get(0), props);
}

export function ResetBacklogLevelsView(container: JQuery) {
    BacklogLevelsComponent.BacklogLevelsComponent.unmount(container.get(0));
}