import * as React from "react";

import { ResponsiveHeader } from "Presentation/Scripts/TFS/Components/ResponsiveHeader";
import { WorkItemBindableComponent } from "WorkItemTracking/Scripts/Form/React/Components/WorkItemBindableComponent";
import { SaveButtonComponent } from "WorkItemTracking/Scripts/Form/Mobile/Components/SaveButtonComponent";
import { TitleComponent } from "WorkItemTracking/Scripts/Form/Mobile/Components/TitleComponent";

export class ResponsiveFormHeader extends WorkItemBindableComponent<{}, {}> {
    public render() {
        return <ResponsiveHeader className="work-item-form-collapsed-header-wrapper" scrollThresholdPx={140}>
            <div className="work-item-form-collapsed-header" style={{
                borderLeftColor: this._formContext.workItemTypeColor
            }}>
                <TitleComponent />
                <SaveButtonComponent />
            </div>
        </ResponsiveHeader>;
    }
}

