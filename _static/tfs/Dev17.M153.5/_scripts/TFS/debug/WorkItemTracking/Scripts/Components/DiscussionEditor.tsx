import "VSS/LoaderPlugins/Css!WorkItemTracking/Components/DiscussionEditor";

import * as React from "react";
import { css } from "OfficeFabric/Utilities";
import { IdentityRef } from "VSS/WebApi/Contracts";
import { ITelemetryContext, HtmlEditor } from "WorkItemTracking/Scripts/Components/HtmlEditor";
import { Component, imageSizeSmall } from "Presentation/Scripts/TFS/Components/IdentityImage";
import { IMessageEntryControl } from "WorkItemTracking/Scripts/Controls/WorkItemForm/DiscussionEditorInterfaces";

const TelemetryContext: ITelemetryContext = { controlName: "DiscussionEditor" };

export interface IDiscussionEditorProps {
    hideAvatar?: boolean;
    currentIdentity?: IdentityRef;
    className?: string;
    onChange?: () => void;
    uploadImageHandler?: (file: File) => Promise<string>;
    placeholder?: string;
    helpText?: string;
    ariaLabel?: string;
}

export interface IDiscussionEditorState {
    isHidden?: boolean;
    height?: number;
}

export class DiscussionEditor extends React.PureComponent<IDiscussionEditorProps, IDiscussionEditorState> implements IMessageEntryControl {
    private _control: HtmlEditor;

    constructor(props: IDiscussionEditorProps) {
        super(props);
        this.state = { isHidden: false, height: undefined };
    }

    public render(): JSX.Element {
        const { className, hideAvatar, currentIdentity, onChange, uploadImageHandler, placeholder, helpText, ariaLabel } = this.props;
        return (
            <div className={css("discussion-editor-control", className, { "no-avatar": hideAvatar, "is-hidden": this.state.isHidden })}>
                <div className={"discussion-message-entry"}>
                    {!hideAvatar && (
                        <div className={"discussion-messages-left"}>
                            <Component size={imageSizeSmall} identity={currentIdentity} showProfileCardOnClick={true} />
                        </div>
                    )}
                    <div className={"discussion-messages-right"}>
                        <HtmlEditor
                            htmlContent={""}
                            onChange={onChange}
                            className={"editor"}
                            uploadImageHandler={uploadImageHandler}
                            ref={this._htmlEditorOnRef}
                            mentionsEnabled={true}
                            placeholder={placeholder}
                            helpText={helpText}
                            telemetryContext={TelemetryContext}
                            showChromeBorder={true}
                            ariaLabel={ariaLabel}
                            height={this.state.height}
                            forceDelayLoad={true}
                        />
                    </div>
                </div>
            </div>
        );
    }

    public hasFocus(): boolean {
        return this._control && this._control.hasFocus();
    }

    public getValue(): string {
        return this._control && this._control.htmlContent;
    }

    public setValue(newValue: string): void {
        if (!this._control) {
            throw new Error("Expected the control to be instantiated");
        }
        this._control.setContent(newValue);
    }

    public ready(callback: () => void): void {
        callback();
    }

    public selectText(): void {
        if (this._control) {
            this._control.selectAll();
        }
    }

    public checkModified(): void {
        if (this._control) {
            this._control.flushChanges();
        }
    }

    public isVisible(): boolean {
        return !this.state.isHidden;
    }

    public showElement(): void {
        this.setState({ isHidden: false });
    }

    public hideElement(): void {
        this.setState({ isHidden: true });
    }

    public setFullScreen(fullScreen: boolean): void {
        // for discussion, we want a decently sized fixed height, no auto grow and not the oob full screen fill
        // because we want saved comments to be visible below the editor
        this.setState({ height: fullScreen ? 180 : undefined });
    }

    public dispose(): void {
        // no-op
    }

    /**
     * Placeholder for legacy contract, DO NOT USE
     */
    public enableToolbar(): void {
        // Not implemented
    }

    /**
     * Placeholder for legacy contract, DO NOT USE
     */
    public disableToolbar(): void {
        // Not implemented
    }

    /**
     * Placeholder for legacy contract, DO NOT USE
     */
    public getOuterHeight(includeMargin?: boolean): number {
        // Not implemented
        return 0;
    }

    /**
     * Placeholder for legacy contract, DO NOT USE
     */
    public getHeight(): number {
        // Not implemented
        return 0;
    }

    /**
     * Placeholder for legacy contract, DO NOT USE
     */
    public setHeight(newHeight: number): void {
        // Not implemented
    }

    public refreshCommandBar(): void {
        this._control && this._control.refreshCommandBar();
    }

    private _htmlEditorOnRef = (ref: HtmlEditor): void => {
        this._control = ref;
    };
}
