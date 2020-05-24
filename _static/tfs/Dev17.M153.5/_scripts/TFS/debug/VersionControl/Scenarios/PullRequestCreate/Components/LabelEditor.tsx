import * as React from "react";
import { LabelsComponent } from "VersionControl/Scenarios/Shared/LabelsComponent";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";

import "VSS/LoaderPlugins/Css!VersionControl/PullRequestLabelsList";
import "VSS/LoaderPlugins/Css!WorkItemArea";

export interface LabelEditorProps{
    labelsAvailable: boolean;
    labels: string[];
    addLabel(newLabel: string): void;
    removeLabel(newLabel: string): void;
    beginGetSuggestedLabels(callback: (tagNames: string[]) => void): void;
    onError(error: Error, component: string);
}

export class LabelEditor extends React.Component<LabelEditorProps, {}>{
    constructor(props: LabelEditorProps) {
        super(props);
    }

    private labels: string[] = [];

    public render(): JSX.Element {
        if (!this.props.labelsAvailable){
           return (null);
        }
        return <div className="vc-pullRequestCreate-labels-section" >
                   <LabelsComponent
                       labels={this.props.labels}
                       readOnly={false}
                       useDeleteExperience={true}
                       onNewLabel={this.props.addLabel}
                       onRemoveLabel={this.props.removeLabel}
                       beginGetSuggestedLabels={this.props.beginGetSuggestedLabels}
                       onError={this.props.onError}/>
              </div>;
    }
}
