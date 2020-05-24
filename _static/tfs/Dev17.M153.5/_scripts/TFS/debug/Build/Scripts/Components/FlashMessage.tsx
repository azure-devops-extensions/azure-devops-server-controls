/// <reference types="react" />

import React = require("react");

import Build_Actions = require("Build/Scripts/Actions/Actions");
import Constants = require("Build/Scripts/Constants");

import VSS_Events = require("VSS/Events/Services");

import "VSS/LoaderPlugins/Css!Build/FlashMessage";

export interface State {
    currentClass: string;
}

export interface ILink {
    text: string;
    action: string;
    payload: any;
}

export interface IMessage {
    content: string;
    links?: ILink[];
    contentType?: string;
}

export interface Props extends React.Props<any> {
    isSticky?: boolean;
    message: IMessage;
}

export class Component extends React.Component<Props, State> {
    private _timer: number = null;
    private _previousMessage: IMessage = null;
    private _isMounted: boolean = false;

    constructor(props: Props) {
        super(props);

        this.state = {
            currentClass: ""
        };
    }

    public render(): JSX.Element {
        let message = this.props.message;
        if (!message) {
            // make the message as previous one so that we can fadeout nicely
            message = this._previousMessage;

            if (!message) {
                return null;
            }
        }

        if (!this.props.isSticky) {
            this._createTimer();
        }

        let contentType = message.contentType || Constants.FlashMessageContentTypes.Information;

        message.links = message.links || [];


        return <div className={"build-flash-container " + this.state.currentClass}>
            <div className={"holder " + contentType + " " + this.state.currentClass} >
                <span className={"build-message-icon-" + contentType + " bowtie-icon bowtie-status-" + contentType + "-outline"}></span><div title={message.content} className="content" dangerouslySetInnerHTML={this._renderHtml(message.content)}></div>
                <div className="links">
                    {
                        message.links.map((link) => {
                            return <a key={link.text} onClick={(e) => { this._onLinkClick(link); } } >{link.text}</a>;
                        })
                    }
                </div>
                <span onClick={(e) => { this._onClose(e); } } className="close bowtie-icon bowtie-navigate-close"></span>
            </div>
        </div>;
    }

    public componentDidMount() {
        this._isMounted = true;
    }

    public componentWillReceiveProps(nextProps: Props) {
        this._previousMessage = this.props.message;
        let currentClass = "fadeIn";
        if (!nextProps.message) {
            currentClass = "fadeOut";
        }

        // setting state inside componentWillReceiveProps will not trigger additional render
        this.setState({
            currentClass: currentClass
        });
    }

    public componentWillUnmount() {
        this._isMounted = false;
    }

    private _createTimer() {
        if (this._timer) {
            clearTimeout(this._timer);
        }

        this._timer = setTimeout(() => {
            this._onClose();
        }, 10000);
    }

    private _onLinkClick(link: ILink) {
        VSS_Events.getService().fire(link.action, this, link.payload);
    }

    private _onClose(e?: React.MouseEvent<HTMLElement>) {
        if (e && this._timer) {
            // manual click, clear timeout
            clearTimeout(this._timer);
        }

        if (this._isMounted) {
            this.setState({
                currentClass: "fadeOut"
            });
        }
    }

    private _renderHtml(html: string) {
        return {
            __html: html
        };
    }
}
