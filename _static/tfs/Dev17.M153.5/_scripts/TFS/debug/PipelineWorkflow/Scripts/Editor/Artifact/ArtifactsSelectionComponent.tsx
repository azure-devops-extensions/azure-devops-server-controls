/// <reference types="react" />

import * as React from "react";
import * as ReactDOM from "react-dom";

import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { AccordionCustomRenderer } from "DistributedTaskControls/SharedControls/Accordion/AccordionCustomRenderer";
import { ArtifactsSelectionStore, IArtifactsDownloadInput } from "PipelineWorkflow/Scripts/Editor/Artifact/ArtifactsSelectionStore";
import { ArtifactsPickerComponent } from "PipelineWorkflow/Scripts/Editor/Artifact/ArtifactsPickerComponent";
import { DeployPipelineConstants } from "PipelineWorkflow/Scripts/Editor/Constants";
import { PipelineArtifactsDownloadInput } from "PipelineWorkflow/Scripts/Common/Types";
import * as DeployPhaseTypes from "DistributedTaskControls/Phase/Types";
import * as ComponentBase from "DistributedTaskControls/Common/Components/Base";
import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";
import { SharedConstants } from "PipelineWorkflow/Scripts/Shared/Constants";

import * as SDK_Shim from "VSS/SDK/Shim";
import * as Events_Services from "VSS/Events/Services";

import "VSS/LoaderPlugins/Css!RM:PipelineWorkflow/Scripts/Editor/Artifact/ArtifactsSelectionComponent";

export interface IProps extends ComponentBase.IProps {
    readonly: boolean;
    onArtifactsSelectionChanged: (isDirty: boolean, isValid: boolean, artifactsDownloadInput: IArtifactsDownloadInput) => void;
}

export interface IState extends ComponentBase.IState {
    artifactPickerStoreInstanceIds: string[];
}

export class ArtifactsSelectionComponent extends ComponentBase.Component<IProps, IState> {

    constructor(props: IProps) {
        super(props);

        this._store = StoreManager.GetStore<ArtifactsSelectionStore>(ArtifactsSelectionStore, props.instanceId);
    }
    
    public componentWillMount() {
        this._setState();

        this._store.addChangedListener(this._onArtifactsSelectionStoreChange);
    }

    public componentWillUnmount() {
        this._store.removeChangedListener(this._onArtifactsSelectionStoreChange);
    }

    public render(): JSX.Element {
        if (!this.state.artifactPickerStoreInstanceIds || this.state.artifactPickerStoreInstanceIds.length === 0) {
            return null;
        }

        return (<div className="deploy-phase-details-section artifacts-selection-view-container" key={DeployPipelineConstants.PipelineConstant_artifactdownloadinput_properties}>
                    <AccordionCustomRenderer
                        label={Resources.ArtifactDownloadOptions}
                        initiallyExpanded={true}
                        headingLevel={2}
                        addSeparator={false}
                        addSectionHeaderLine={true}>
                        {this._getArtifactsPickerControls()}
                    </AccordionCustomRenderer>
                </div>);
    }

    private _getArtifactsPickerControls(): JSX.Element[] {
        let artifactsPickerControls: JSX.Element[] = [];
        
        this.state.artifactPickerStoreInstanceIds.forEach((instanceId) => {
            artifactsPickerControls.push((<ArtifactsPickerComponent key={instanceId} instanceId={instanceId} readonly={this.props.readonly}/>));
        });
        
        return artifactsPickerControls;
    }

    private _onArtifactsSelectionStoreChange = () => {
        let isDirty = this._store.isDirty();
        let isValid = this._store.isValid();
        let value = this._store.getValue();

        this.props.onArtifactsSelectionChanged(isDirty, isValid, value);
        this._setState();
    }

    private _setState(): void {
        let artifactPickerStoreInstanceIds = [];
        let stores = this._store.getDataStoreList();
        if (stores) {
            stores.forEach((store) => {
                artifactPickerStoreInstanceIds.push(store.getInstanceId());
            });
        }

        this.setState({
            artifactPickerStoreInstanceIds: artifactPickerStoreInstanceIds
        });
    }

    private _store: ArtifactsSelectionStore;
}

SDK_Shim.registerContent("artifactsSelectionExtension", (context) => {
    let options: DeployPhaseTypes.IContributedInputOptions = context.options;
    const inputName = SharedConstants.PipelineConstant_phaseinput_artifactdownloadinput;
    let inputValue: IArtifactsDownloadInput = options.getInputValue(inputName) as IArtifactsDownloadInput;

    let store = StoreManager.CreateStore<ArtifactsSelectionStore, IArtifactsDownloadInput>(ArtifactsSelectionStore, options.instanceId, inputValue);
    
    let onArtifactsSelectionChanged = (isDirty: boolean, isValid: boolean, artifactsDownloadInput: IArtifactsDownloadInput) => {
        options.updateInputStateDelegate(SharedConstants.PipelineConstant_phaseinput_artifactdownloadinput, {
            name: inputName,
            isDirty: isDirty,
            isValid: isValid,
            value: artifactsDownloadInput
        });
    };

    Events_Services.getService().attachEvent(options.hostUpdateEvent, (sender: any, args: any) => {
        let updatedValue = options.getInputValue(inputName) as IArtifactsDownloadInput;
        let currentStore = StoreManager.GetStore<ArtifactsSelectionStore>(ArtifactsSelectionStore, options.instanceId);
        currentStore.reinitialize(updatedValue);
    });

    let props: IProps = {
        instanceId: context.options.instanceId,
        onArtifactsSelectionChanged: onArtifactsSelectionChanged,
        readonly: context.options.disabled
    };

    return (<ArtifactsSelectionComponent {...props} />);
});