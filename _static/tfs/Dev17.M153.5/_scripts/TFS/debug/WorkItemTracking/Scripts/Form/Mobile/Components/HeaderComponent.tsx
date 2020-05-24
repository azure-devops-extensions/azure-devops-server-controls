import * as React from "react";

import * as WITConstants from "Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants";
import * as WITOM from "WorkItemTracking/Scripts/TFS.WorkItemTracking";
import { isFollowsEnabled } from "WorkItemTracking/Scripts/Utils/FollowsUtils";

import { WorkItemBindableComponent } from "WorkItemTracking/Scripts/Form/React/Components/WorkItemBindableComponent";
import { SaveButtonComponent } from "WorkItemTracking/Scripts/Form/Mobile/Components/SaveButtonComponent";
import { FollowsButtonComponent } from "WorkItemTracking/Scripts/Form/Mobile/Components/FollowsButtonComponent";
import { InfoBar } from "WorkItemTracking/Scripts/Form/Mobile/Components/InfoBar";
import { TagComponent } from "WorkItemTracking/Scripts/Form/React/Components/TagComponent";
import { TitleComponent } from "WorkItemTracking/Scripts/Form/Mobile/Components/TitleComponent";
import * as TFS_OM_Identities from "Presentation/Scripts/TFS/TFS.OM.Identities";
import * as WorkItemTrackingResources from "WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking";
import * as Utils_Date from "VSS/Utils/Date";
import * as Utils_String from "VSS/Utils/String";
import { LayoutInformation } from "WorkItemTracking/Scripts/Form/Layout";

export interface IHeaderProps {
    layout: LayoutInformation;
}

export class Header extends WorkItemBindableComponent<IHeaderProps, {}> {
    private _followsEnabled: boolean;

    public componentWillMount() {
        this._followsEnabled = isFollowsEnabled(this._formContext.workItemType.store.getTfsContext());
    }

    public render(): JSX.Element {
        const { layout } = this.props;

        return <div className="work-item-form-main-header" style={{ borderLeftColor: this._formContext.workItemTypeColor }}>
            <InfoBar layout={layout} />
            {this._followsEnabled ? <FollowsButtonComponent /> : null}
            <div className="mobile-form-header">
                <TitleComponent />
                {this._renderLastUpdate()}
                <TagComponent />
            </div>
            <SaveButtonComponent />
        </div>;
    }

    private _renderLastUpdate(): JSX.Element {
        const lastUpdateInfo = this._lastUpdateInfo();
        if (lastUpdateInfo) {
            return <div className="work-item-form-updateinfo">{lastUpdateInfo}</div>
        }

        return null;
    }

    private _lastUpdateInfo(): string {
        const workItem = this._formContext.workItem;
        if (!workItem || workItem.isNew()) {
            return null;
        }

        const changedByField = workItem.getField(WITConstants.CoreFieldRefNames.ChangedBy);
        const changedDateField = workItem.getField(WITConstants.CoreFieldRefNames.ChangedDate);
        const identity = changedByField.getIdentityValue();
        let changedDateFieldValue = changedDateField.getValue();

        if (changedDateFieldValue instanceof WITOM.ServerDefaultValue) {
            changedDateFieldValue = changedDateFieldValue.value;
        }

        const friendlyDate = changedDateFieldValue ? Utils_Date.friendly(changedDateFieldValue) : "";

        const fullText = identity ?
            Utils_String.format(WorkItemTrackingResources.UpdatedDateByMessage, friendlyDate, identity.displayName) :
            Utils_String.format(WorkItemTrackingResources.UpdatedDateMessage, friendlyDate);

        return fullText;
    }
}