import Controls = require("VSS/Controls");
import React = require("react");
import VCResources = require("VersionControl/Scripts/Resources/TFS.Resources.VersionControl");
import { MessageArea, IMessage, MessageLevel } from "VersionControl/Scenarios/Shared/MessageArea";

export interface ILoadingMessageAreaProps extends React.Props<void> {
}

/**
 * Display a waiting spinner when this control is activated.
 */
export class LoadingMessageArea extends React.Component<ILoadingMessageAreaProps, {}> {
    constructor(props: ILoadingMessageAreaProps) {
        super(props);
    }
        
    public render(): JSX.Element {
        return <MessageArea
            messages={[this._waitMessage()]} />
    }

    private _waitMessage(): IMessage {
        return {
            key: 1,
            iconCssClass: "action-icon bowtie-icon status-progress",
            text: VCResources.LoadingText,
            actionLabel: "",
            actionCallback: () => { },
            actionIconCssClass: "",
            level: MessageLevel.INFO
        } as IMessage;
    }
}