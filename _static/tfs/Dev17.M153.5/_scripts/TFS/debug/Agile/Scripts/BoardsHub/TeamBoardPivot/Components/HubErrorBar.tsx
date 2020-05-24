// React
import * as React from "react";
import { Component, Props, State } from "VSS/Flux/Component";
import { Action } from "VSS/Flux/Action";

// VSS
import * as Utils_String from "VSS/Utils/String";

// OfficeFabric
import { MessageBar, MessageBarType } from "OfficeFabric/MessageBar";

// Favorites
import { FavoritesFailureState } from "Favorites/Controls/FavoritesModels";

export interface IHubErrorMessageState extends State {
    errorMessage?: string;
}

export interface IHubErrorMessageProps extends Props {
    actions: Array<Action<Error | FavoritesFailureState>>;
}

export class HubErrorBar extends Component<IHubErrorMessageProps, IHubErrorMessageState> {

    constructor(props: IHubErrorMessageProps) {
        super();

        this.state = {};
    }

    public render(): JSX.Element {
        if (!this.state.errorMessage) {
            return null;
        }

        return <div className="boards-directory-messagebar" >
            <MessageBar
                messageBarType={MessageBarType.error}
                onDismiss={() => { this.setState({ errorMessage: Utils_String.empty }); }}>
                {this.state.errorMessage}
            </MessageBar>
        </div>;
    }

    public componentWillMount() {
        this.props.actions.forEach((action) => {
            action.addListener(this._setErrorMessageFromException);
        });
    }

    public componentWillUnmount(): void {
        // Remove listener
        this.props.actions.forEach((action) => {
            action.removeListener(this._setErrorMessageFromException);
        });
    }

    /**
     * Set error message from Error exception or from a Favorites failure
     */
    private _setErrorMessageFromException = (exception: Error | FavoritesFailureState) => {
        const isErrorType = exception instanceof Error;
        const errorMessage = isErrorType ? (exception as Error).message : (exception as FavoritesFailureState).exceptionMessage;

        if (!Utils_String.equals(this.state.errorMessage, errorMessage, true)) {
            this.setState({
                errorMessage: errorMessage
            });
        }
    }
}