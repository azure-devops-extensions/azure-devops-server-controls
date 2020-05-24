/// <reference types="react" />

import React = require("react");

import Marked = require("Presentation/Scripts/marked");

export interface Props {
    markdown: string;
    options?: MarkedOptions;
}

export interface State {
}

export class Component extends React.Component<Props, State> {
    public render(): JSX.Element {
        return <span dangerouslySetInnerHTML={ this._getRawMarkup() } />
    }

    private _getRawMarkup() {
        let markedOptions = this.props.options;
        if (!markedOptions) {
            markedOptions = {
                sanitize: true
            };
        }

        let rawMarkup: string = Marked(this.props.markdown, markedOptions);
        return {
            __html: rawMarkup
        };
    }
}
