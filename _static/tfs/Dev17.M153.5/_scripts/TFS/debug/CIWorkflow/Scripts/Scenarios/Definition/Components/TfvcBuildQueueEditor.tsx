/// <reference types="react" />

import * as React from "react";

import { RepositoryTypes } from "Build.Common/Scripts/Generated/TFS.Build2.Common";

import { ScmUtils } from "CIWorkflow/Scripts/Common/ScmUtils";
import * as Resources from "CIWorkflow/Scripts/Resources/TFS.Resources.CIWorkflow";

import * as Base from "DistributedTaskControls/Common/Components/Base";

import { ICalloutContentProps } from "DistributedTaskControls/Components/CalloutComponent";
import { Component as InfoButton } from "DistributedTaskControls/Components/InfoButton";
import * as DTCResources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";
import { IInfoProps } from "DistributedTaskControls/SharedControls/InputControls/Common";
import { StringInputComponent } from "DistributedTaskControls/SharedControls/InputControls/Components/StringInputComponent";

import { IconButton } from "OfficeFabric/Button";

import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import * as HistoryDialogs_LAZY_LOAD from "VersionControl/Scripts/Controls/HistoryDialogs";

import * as Utils_String from "VSS/Utils/String";
import * as VSS from "VSS/VSS";

import "VSS/LoaderPlugins/Css!CIWorkflow/Scripts/Scenarios/Definition/Components/TfvcBuildQueueEditor";

/**
 * Encapsulates the editor to be shown for Tfvc when the build is queued.
 */
export interface ITfvcQueueBuildState extends Base.IState {
    shelvesetName: string;
}

export interface IProps extends Base.IProps {
    onShelvesetChanged: (shelveset: string) => void;
    onSourceVersionChanged: (sourceVersion: string) => void;
    shelvesetName?: string;
}

export class TfvcBuildQueueEditor extends Base.Component<IProps, ITfvcQueueBuildState>  {    
    public render(): JSX.Element {
        const sourceVersionInfoProps: IInfoProps = {
            calloutContentProps: {
                calloutDescription: Resources.SourceVersionInfo,
            }
        };
        return (
            <div className="tfvc-build-queue-editor">
                <div className="source-version-details">
                    <StringInputComponent
                        label={Resources.SourceVersionText}
                        cssClass="source-version"
                        infoProps={sourceVersionInfoProps}
                        onValueChanged={this.props.onSourceVersionChanged} />
                </div>
                <div className="shelveset-details">
                    <StringInputComponent
                        required={false}
                        label={Resources.ShelvesetLabel}
                        cssClass="shelveset"
                        value={this.state.shelvesetName}
                        onValueChanged={this._onShelvesetChanged} />
                    <IconButton
                        className="browse-shelveset"
                        iconProps={{ iconName: "More" }}
                        onClick={this._onBrowseShelvesetClick}
                        ariaLabel={DTCResources.Browse}>
                    </IconButton>
                </div>
            </div>);
    }

    public componentDidMount() {
        if (this.props.shelvesetName) {
            this.setState({
                shelvesetName: this.props.shelvesetName
            });
        }
    }

    private _onBrowseShelvesetClick = (): void => {
        // Displaying shelveset picker
        VSS.using(["VersionControl/Scripts/Controls/HistoryDialogs"], (VersionControlControlsHistory: typeof HistoryDialogs_LAZY_LOAD) => {
            VersionControlControlsHistory.Dialogs.shelvesetPicker({
                tfsContext: TfsContext.getDefault(),
                okCallback: (shelveset) => {
                    const shelvesetName = shelveset ? (shelveset.shelvesetName + ";" + shelveset.owner) : Utils_String.empty;
                    this._onShelvesetChanged(shelvesetName);
                }
            });
        });
    }

    private _onShelvesetChanged = (shelvesetName: string): void => {
        this.setState({
            shelvesetName: shelvesetName
        } as ITfvcQueueBuildState);

        this.props.onShelvesetChanged(shelvesetName);
    }
}
