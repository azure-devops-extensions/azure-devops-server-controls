/// <reference types="react" />
/// <reference types="react-dom" />

import "VSS/LoaderPlugins/Css!fabric";
import "VSS/LoaderPlugins/Css!WorkCustomization/Common/Components/ProcessNavPage";

import * as React from "react";
import { Fabric } from "OfficeFabric/Fabric";
import { css } from "OfficeFabric/Utilities";
import { ProcessNavBreadCrumb } from "WorkCustomization/Scripts/Common/Components/ProcessNavBreadCrumb";
import { MessageBar } from "WorkCustomization/Scripts/Common/Components/MessageBar";
import { CreateInheritedProcessMessageBar } from "WorkCustomization/Scripts/Common/Components/CreateInheritedProcessMessageBar";
import { ProcessNavFilter } from "WorkCustomization/Scripts/Common/Components/ProcessNavFilter";
import * as PivotView from "Presentation/Scripts/TFS/Components/PivotView";
import { DialogManager } from "WorkCustomization/Scripts/Dialogs/Components/DialogManager";

export interface IProcessNavPageProps {
    items: PivotView.PivotViewItem[];
    className?: string;
    onPageLoad?: () => void;
}

export class ProcessNavPage extends React.Component<IProcessNavPageProps, {}> {
    public render(): JSX.Element {
        return (
            <Fabric className={css("work-hub-content", this.props.className)}>
                <MessageBar cssClass={"page-level-message-bar"} />
                <CreateInheritedProcessMessageBar cssClass={"page-level-message-bar ms-MessageBar content-inherited-process-message"} />
                <ProcessNavBreadCrumb />
                <ProcessNavFilter />
                <div className={"hub-content"}>
                    <PivotView.Component items={this.props.items} useContributionComponent={true} />
                </div>
                <DialogManager />
            </Fabric>
        );
    }

    public componentDidMount(): void {
        if (this.props.onPageLoad) {
            this.props.onPageLoad();
        }
    }
}