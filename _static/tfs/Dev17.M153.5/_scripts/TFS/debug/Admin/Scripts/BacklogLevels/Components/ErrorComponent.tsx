/// <reference types="react" />

import "VSS/LoaderPlugins/Css!Admin/Scripts/BacklogLevels/Components/ErrorComponent";

import * as React from "react";

import * as MessageBar from "OfficeFabric/MessageBar";

export interface IProps {
    message: string;
}

export class ErrorMessage extends React.Component<IProps, null> {
    public render(): JSX.Element {
        return (
            <div className="backlog-levels-basic-error">
                <span className="bowtie-icon bowtie-status-error" ></span>
                <span>{this.props.message}</span>
            </div>
        );
    }
}

export interface IMessageBarProps {
    errors: Error[];
    onDismiss?: () => any;
}

export class ErrorMessageBar extends React.Component<IMessageBarProps, null> {
    public render(): JSX.Element {
        if ($.isArray(this.props.errors) && this.props.errors.length > 0) {
            var props: MessageBar.IMessageBarProps = {
                isMultiline: true,
                messageBarType: MessageBar.MessageBarType.error,
                onDismiss: this.props.onDismiss
            };

            if (this.props.errors.length > 1) {
                return (
                    <MessageBar.MessageBar {...props as any}>
                        <span>
                            {
                                this.props.errors.map((e, i) => {
                                    return (
                                        <span key={i}>{e.message}<br /></span>
                                    );
                                })
                            }
                        </span>
                    </MessageBar.MessageBar>
                );
            }
            else {
                return (
                    <MessageBar.MessageBar {...props as any}>
                        {this.props.errors[0].message}
                    </MessageBar.MessageBar>
                );
            }
        }
        else {
            return null;
        }
    }
}