import { Link, ILink } from "OfficeFabric/Link";
import * as React from "react";

export enum MessageLevel {
    INFO,
    ERROR
}

export interface IMessage {
    key: number;
    iconCssClass: string;
    text: string;
    actionLabel: string;
    actionCallback: Function;
    actionIconCssClass: string;
    actionAutoFocus?: boolean;
    level: MessageLevel;
    count?: number;
}

export interface IStateless { }

export interface MessageAreaProperties {
    messages: IMessage[];
    dismissMessage?(key: number): void;
}

export class MessageArea extends React.Component<MessageAreaProperties, IStateless> {
    public render() {
        const makeMessageBar = (message: IMessage) => {
            return <MessageBar
                key={message.key}
                message={message.text}
                icon={message.iconCssClass}
                actionLabel={message.actionLabel}
                action={message.actionCallback}
                actionIcon={message.actionIconCssClass}
                actionAutoFocus={message.actionAutoFocus}
                level={message.level}
                count={message.count}
                dismissMessage={this.props.dismissMessage}
                />;
        }
        const className = "vc-message-area " + ((this.props.messages.length > 0) ? "visible" : "");

        if (this.props.messages) {
            return (<div className={className} aria-live="polite">
                {this.props.messages.map(makeMessageBar)}
            </div>
            );
        }
        else
            return (<div className={className} aria-live="polite">
            </div>
            );
    }
}

interface MessageBarProperties {
    key: number;
    message: string;
    icon?: string;
    actionLabel: string;
    action: Function;
    actionIcon?: string;
    actionAutoFocus?: boolean;
    level: MessageLevel;
    count?: number;
    dismissMessage?(key: number): void;
}

class MessageBar extends React.Component<MessageBarProperties, IStateless> {
    public render() {
        const actionLabel = this.props.actionLabel || "Dismiss";
        const iconClass = this.props.icon ? `action-icon bowtie-icon ${this.props.icon}` : "";
        const actionIconClass = this.props.actionIcon ? `action-icon bowtie-icon ${this.props.actionIcon}` : "";
        const labelClass = this.props.actionIcon ? "action-label" : "";
        let count = "";
        let countClassName = "";
        if (this.props.count && this.props.count > 1) {
            count = this.props.count.toString();
            countClassName = "count";
        }
        return (
            <div className={this._levelToCssClass(this.props.level)} aria-label={this.props.message}>
                <span className="message">
                    <span className={iconClass}></span>
                    <span>{this.props.message}</span>
                    <span className={countClassName}>{count}</span>
                </span>
                { this.props.action &&
                    <Link className="action" onClick={this._onActionClick} componentRef={this.props.actionAutoFocus && this.focusRef}>
                        <span className={actionIconClass}></span>
                        <span className={labelClass}>{this.props.actionLabel}</span>
                    </Link>
                }
            </div>
        );
    }

    private focusRef = (ref: ILink): void => {
        if (ref) {
            ref.focus();
        }
    }

    private _onActionClick = (event: React.MouseEvent<HTMLElement>) => {
        event.preventDefault();
        if (this.props.action) {
            this.props.action();
        }
        else {
            if (this.props.dismissMessage) {
                this.props.dismissMessage(this.props.key);
            }
        }
    }

    private _levelToCssClass(level: MessageLevel): string {
        let levelClass;
        switch (level) {
            case MessageLevel.ERROR:
                levelClass = "error";
                break;
            default:
                levelClass = "info";
                break;
        }
        return "vc-message-bar " + levelClass;
    }
}
