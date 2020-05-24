/// <reference types="react" />
import * as React from "react";
import { Label } from "OfficeFabric/Label";
import * as VSSControls from "VSS/Controls";
import * as VSSPlatformComponent from "VSS/Flux/PlatformComponent";
import { AddRelatedWorkItemsControl, IAddRelatedWorkItemsControlOptions } from "VersionControl/Scripts/Controls/AddRelatedWorkItemsControl";
import { LinkedArtifactsControl, ILinkedArtifactControlOptions } from "Presentation/Scripts/TFS/Controls/LinkedArtifacts/Control";

export interface WorkItemListSelectorProps extends ILinkedArtifactControlOptions, IAddRelatedWorkItemsControlOptions {
    label?: string;
}

export class WorkItemListSelector extends React.PureComponent<WorkItemListSelectorProps, {}> {
    public render(): JSX.Element {
        return (
            <div>
                { this.props.label && <Label>{this.props.label}</Label> }
                <WorkItemSelector cssClass="bowtie-style" options={this.props} />
                <div className="linked-artifacts-container">
                    <LinkedArtifactsControl {...this.props} />
                </div>
            </div>);
    }
}

type WorkItemSelectorProps = VSSPlatformComponent.Props<IAddRelatedWorkItemsControlOptions>;

class WorkItemSelector extends VSSPlatformComponent.Component<AddRelatedWorkItemsControl, WorkItemSelectorProps, VSSPlatformComponent.State> {
    protected createControl(element: JQuery): AddRelatedWorkItemsControl {
        return VSSControls.create(AddRelatedWorkItemsControl, element, this.props.options);
    }
}
