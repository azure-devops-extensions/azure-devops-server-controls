/// <reference types="react" />

import * as React from "react";

import * as Base from "DistributedTaskControls/Common/Components/Base";
import { MultiLineInputComponent } from "DistributedTaskControls/SharedControls/InputControls/Components/MultilineInputComponent";

import {
    EnvironmentTriggerComponent,
    IEnvironmentTriggerProps
} from "PipelineWorkflow/Scripts/SharedComponents/CreateRelease/EnvironmentTriggerComponent";
import {
    CreateReleaseArtifactsComponent,
    IReleaseDialogArtifactsProps
} from "PipelineWorkflow/Scripts/SharedComponents/CreateRelease/CreateReleaseArtifactsComponent";
import { IReleaseDialogContentState } from "PipelineWorkflow/Scripts/SharedComponents/CreateRelease/CreateReleaseStore";
import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";

import { Icon } from "OfficeFabric/Icon";
import { IPivotItemProps, Pivot, PivotItem } from "OfficeFabric/Pivot";
import { TextField } from "OfficeFabric/TextField";

import { css } from "OfficeFabric/Utilities";
import { Async } from "OfficeFabric/Utilities";

import * as Utils_String from "VSS/Utils/String";

import "VSS/LoaderPlugins/Css!DistributedTaskControls/Styles/FabricStyleOverrides";

export interface IReleaseDialogContentProps extends IReleaseDialogContentState, IEnvironmentTriggerProps, IReleaseDialogArtifactsProps, Base.IProps {
    onDescriptionChange(newDescription: string): void;
    pivotItemCssClass?: string;
    pivotCssClass?: string;
    descriptionCssClass?: string;
}

export class ReleaseDialogContentComponent extends Base.Component<IReleaseDialogContentProps, Base.IStateless> {
    constructor(props: IReleaseDialogContentProps) {
        super(props);
    }

    public componentWillMount(): void {
        if (this.props && this.props.onDescriptionChange) {
            this._delayedOnDescriptionChange = this._async.debounce(this.props.onDescriptionChange.bind(this), this._descriptionUpdateDelay);
        }
    }

    public componentWillUnmount(): void {
        if (this._delayedOnDescriptionChange) {
            this._delayedOnDescriptionChange = undefined;
            this._async.dispose();
        }
    }

    public render(): JSX.Element {
        let pivotItems: JSX.Element[] = [];
        if (this.props && this.props.canShowDialogContent) {

            let pivotItemClassName: string = this.props ? this.props.pivotItemCssClass : Utils_String.empty;

            if (this.props.canShowArtifactsVersions) {
                let artifactsPivotItem: JSX.Element = (
                    <PivotItem
                        className="artifacts-pivot-item-header"
                        key="artifacts-pivot-key"
                        itemKey="artifacts-pivot-item"
                        linkText={Resources.ArtifactsText}
                        onRenderItemLink={(link: IPivotItemProps, defaultRenderer: (link: IPivotItemProps) => JSX.Element) => {
                            return this._customRenderer(link, defaultRenderer, this.props.hasAnyErrorsInArtifacts, "Error");
                        }}>
                        <CreateReleaseArtifactsComponent
                            cssClass={pivotItemClassName}
                            artifactsVersionsData={this.props.artifactsVersionsData}
                            onArtifactSelectedVersionChange={this.props.onArtifactSelectedVersionChange}
                            instanceId={this.props.instanceId} />
                    </PivotItem>
                );

                pivotItems.push(artifactsPivotItem);
            }

            let triggerPivotItem: JSX.Element = (
                <PivotItem
                    className="triggers-pivot-item-header"
                    key="triggers-pivot-key"
                    itemKey="deployment-trigger-pivot-item"
                    linkText={Resources.DeploymentsTriggerPivotLabelText}
                    onRenderItemLink={(link: IPivotItemProps, defaultRenderer: (link: IPivotItemProps) => JSX.Element) => {
                        return this._customRenderer(link, defaultRenderer, this.props.hasTriggerWarning, "Warning");
                    }}>
                    <EnvironmentTriggerComponent
                        cssClass={pivotItemClassName}
                        instanceId={this.props.instanceId}
                        environmentTriggers={this.props.environmentTriggers}
                        onEnvironmentTriggerSelectionChange={this.props.onEnvironmentTriggerSelectionChange} />
                </PivotItem>
            );

            pivotItems.push(triggerPivotItem);
        }

        let className: string = this.props ? this.props.cssClass : Utils_String.empty;
        let descriptionClassName: string = this.props ? this.props.descriptionCssClass : Utils_String.empty;
        let pivotClassName: string = this.props ? this.props.pivotCssClass : Utils_String.empty;
        let descriptionValue: string = this.props ? this.props.description : Utils_String.empty;

        return (
            <div className={css("release-dialog-content", className)}>
                <MultiLineInputComponent
                    cssClass={css("release-dialog-content-description", descriptionClassName)}
                    label={Resources.ReleaseDescriptionText}
                    isNotResizable={true}
                    value={descriptionValue}
                    onValueChanged={this._setReleaseDescription} />

                <div className={css("release-dialog-content-pivot-main", pivotClassName)}>
                    {
                        pivotItems.length > 0
                            ? (
                                <Pivot key="release-dialog-content-pivot-hub">
                                    {
                                        pivotItems.map((pivotItem: JSX.Element) => { return pivotItem; })
                                    }
                                </Pivot>
                            )
                            : (
                                <div></div>
                            )
                    }
                </div>
            </div>
        );
    }

    private _setReleaseDescription = (newDescriptionValue: string): void => {
        if (this._delayedOnDescriptionChange) {
            this._delayedOnDescriptionChange(newDescriptionValue);
        }
    }

    private _customRenderer(link: IPivotItemProps, defaultRenderer: (link: IPivotItemProps) => JSX.Element, showIcon: boolean, iconName: string): JSX.Element {
        return (
            <span>
                {showIcon && <Icon iconName={iconName} className={css("release-dialog-pivot-icon", iconName)} />}
                {defaultRenderer(link)}
            </span>);
    }

    // Delay in milli seconds
    private readonly _descriptionUpdateDelay: number = 300;
    private _async = new Async();
    private _delayedOnDescriptionChange: (string) => void;
}