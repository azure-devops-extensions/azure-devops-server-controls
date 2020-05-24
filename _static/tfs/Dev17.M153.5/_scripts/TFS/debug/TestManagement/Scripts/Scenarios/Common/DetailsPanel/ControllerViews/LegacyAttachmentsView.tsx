/// <reference types="react" />
import * as React from "react";

import { AttachmentsViewActionsCreator } from "TestManagement/Scripts/Scenarios/Common/DetailsPanel/Actions/AttachmentsViewActionsCreator";
import { AttachmentsViewActionsHub } from "TestManagement/Scripts/Scenarios/Common/DetailsPanel/Actions/AttachmentsViewActionsHub";
import { AttachmentsView } from "TestManagement/Scripts/Scenarios/Common/DetailsPanel/ControllerViews/AttachmentsView";
import { AttachmentsLogStoreViewSource } from "TestManagement/Scripts/Scenarios/Common/DetailsPanel/Sources/AttachmentsLogStoreViewSource";
import { AttachmentsViewSource } from "TestManagement/Scripts/Scenarios/Common/DetailsPanel/Sources/AttachmentsViewSource";
import { AttachmentsViewStore } from "TestManagement/Scripts/Scenarios/Common/DetailsPanel/Stores/AttachmentsViewStore";
import * as ComponentBase from "VSS/Flux/Component";
import { registerLWPComponent } from "VSS/LWP";

export interface ILegacyAttachmentsViewProps extends ComponentBase.Props {
    testRunId: number;
    testResultId: number;
    subResultId: number;
    attachmentSource: string;
}

export class LegacyAttachmentsView extends ComponentBase.Component<ILegacyAttachmentsViewProps, {}> {
    constructor(props) {
        super(props);
        const attachmentsViewActionsHub = new AttachmentsViewActionsHub();
        const attachmentsViewSource = new AttachmentsViewSource();
        const sourceLogStore = new AttachmentsLogStoreViewSource();
        this._store = new AttachmentsViewStore(attachmentsViewActionsHub);
        this._actionCreator = new AttachmentsViewActionsCreator(attachmentsViewActionsHub, attachmentsViewSource, sourceLogStore);
    }

    render() {
        return (
            <AttachmentsView
                actionsCreator={this._actionCreator}
                store={this._store}
                {... this.props}
            />);
    }

    private _actionCreator: AttachmentsViewActionsCreator;
    private _store: AttachmentsViewStore;
}


registerLWPComponent("legacyAttachmentsView", LegacyAttachmentsView);