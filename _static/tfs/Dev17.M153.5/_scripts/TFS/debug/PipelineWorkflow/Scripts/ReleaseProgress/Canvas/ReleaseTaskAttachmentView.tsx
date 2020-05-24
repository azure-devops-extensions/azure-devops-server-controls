/// <reference types="react" />

import * as React from "react";

import * as Base from "DistributedTaskControls/Common/Components/Base";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import { Collapsible } from "DistributedTaskControls/SharedControls/Collapsible/Collapsible";

import { ReleaseEnvironmentStore } from "PipelineWorkflow/Scripts/ReleaseProgress/ReleaseEnvironment/ReleaseEnvironmentStore";
import { IReleaseTaskAttachmentViewStoreState, ReleaseTaskAttachmentViewStore } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseTaskAttachmentViewStore";
import { ReleaseTaskAttachmentActionCreator } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseTaskAttachmentActionCreator";
import { ReleaseTaskAttachmentUtils } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseTaskAttachmentUtils";
import { IMarkdownMetadata } from "PipelineWorkflow/Scripts/ReleaseProgress/ReleaseEnvironment/ReleaseEnvironmentTypes";
import { FeatureFlagUtils } from "PipelineWorkflow/Scripts/Shared/Utils/FeatureFlagUtils";

import { autobind } from "OfficeFabric/Utilities";

import "VSS/LoaderPlugins/Css!RM:PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseTaskAttachmentView";

export interface IReleaseTaskAttachmentViewProps extends Base.IProps {
    releaseId: number;
}

export class ReleaseTaskAttachmentView extends Base.Component<IReleaseTaskAttachmentViewProps, IReleaseTaskAttachmentViewStoreState> {

    constructor(props) {
        super(props);
        this._releaseEnvironmentNodeStore = StoreManager.GetStore<ReleaseEnvironmentStore>(ReleaseEnvironmentStore, this.props.instanceId);
        this._releaseEnvironmentNodeStore.addChangedListener(this._onEnvironmentStoreChange);
        
        this._releaseTaskAttachmentActionsCreator = ActionCreatorManager.GetActionCreator<ReleaseTaskAttachmentActionCreator>(ReleaseTaskAttachmentActionCreator, this.props.instanceId);

        this._releaseTaskAttachmentViewStore = StoreManager.GetStore<ReleaseTaskAttachmentViewStore>(ReleaseTaskAttachmentViewStore, this.props.instanceId);

        this.state = this._releaseTaskAttachmentViewStore.getState();
    }

    public componentDidMount(): void {
        this._releaseTaskAttachmentViewStore.addChangedListener(this._onTaskAttachmentStoreChanged);
        this._releaseTaskAttachmentActionsCreator.updateTaskAttachmentItems(this.props.releaseId, this._releaseEnvironmentNodeStore.getEnvironment());        
    }

    public componentWillUnmount(): void {
        this._releaseEnvironmentNodeStore.removeChangedListener(this._onEnvironmentStoreChange);
        this._releaseTaskAttachmentViewStore.removeChangedListener(this._onTaskAttachmentStoreChanged);
    }

    public render(): JSX.Element {
        /* tslint:disable:react-no-dangerous-html */
        return (
            <div className="environment-markdown-section">
                {
                    this.state.markdownMetadataArray.map((markdownMetadata: IMarkdownMetadata) => {
                        return (
                            <Collapsible
                                label={ReleaseTaskAttachmentUtils.getMarkdownHeader(markdownMetadata.fileInfo.name)}
                                initiallyExpanded={true}
                                headingLevel={2}
                                addSeparator={false}
                                addSectionHeaderLine={true}
                                cssClass={"markdown-content"}>

                                <div dangerouslySetInnerHTML={ReleaseTaskAttachmentUtils.constructHtmlForRender(markdownMetadata.markDownText)} />

                            </Collapsible>
                        );
                    })
                }
            </div>
        );
        /* tslint:enable:react-no-dangerous-html */
    }

    private _onTaskAttachmentStoreChanged = () => {
        this.setState(this._releaseTaskAttachmentViewStore.getState());
    }

    private _onEnvironmentStoreChange = () => {
        const environment = this._releaseEnvironmentNodeStore.getEnvironment();
        if (environment && ReleaseTaskAttachmentUtils.showTaskAttachments(environment.status)) {
            this._releaseTaskAttachmentActionsCreator.updateTaskAttachmentItems(this.props.releaseId, this._releaseEnvironmentNodeStore.getEnvironment());
        }
    }

    private _releaseEnvironmentNodeStore: ReleaseEnvironmentStore;
    private _releaseTaskAttachmentViewStore: ReleaseTaskAttachmentViewStore;
    private _releaseTaskAttachmentActionsCreator: ReleaseTaskAttachmentActionCreator;
}