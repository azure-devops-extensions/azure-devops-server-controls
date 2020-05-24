import { Control } from "VSS/Controls";
import { LegacyComponent, ILegacyComponentProps, ILegacyComponentState } from "Presentation/Scripts/TFS/Components/LegacyComponent";
import { MessageAreaControl, IMessageAreaControlOptions } from "VSS/Controls/Notifications";

export interface ILegacyMessageAreaControlProps extends ILegacyComponentProps, IMessageAreaControlOptions {
    /**
     * Optional: callback to invoke when the close message icon is clicked
     */
    closeMessageCallback?: () => void;
}

export interface ILegacyMessageAreaControlState extends ILegacyComponentState {
}

/**
 * MessageAreaControl wrapper. See MessageAreaControl for docs.
 */
export class LegacyMessageAreaControl extends LegacyComponent<MessageAreaControl, ILegacyMessageAreaControlProps, ILegacyMessageAreaControlState> {
    public createControl(element: HTMLElement, props: ILegacyMessageAreaControlProps, state: ILegacyMessageAreaControlState): MessageAreaControl {
        return Control.create(MessageAreaControl, $(element), props);
    }

    /**
     * Binds to the close event of the message control to invoke the closeMessageCallback when triggered
     */
    private _bindCloseHandler() {
        if (this._control && $.isFunction(this.props.closeMessageCallback)) {
            this._control._bind(MessageAreaControl.EVENT_CLOSE_ICON_CLICKED, (e) => {
                this.props.closeMessageCallback();
            });
        }
    }

    /**
    * Unbinds from the close event
    */
    private _unbindCloseHandler() {
        if (this._control && $.isFunction(this.props.closeMessageCallback)) {
            this._control._unbind(MessageAreaControl.EVENT_CLOSE_ICON_CLICKED);
        }
    }

    public componentDidMount() {
        super.componentDidMount();
        this._bindCloseHandler();
    }

    public componentWillUpdate(nextProps: ILegacyMessageAreaControlProps, nextState: ILegacyMessageAreaControlState) {
        // if we are updating, unbind the event
        this._unbindCloseHandler();
        // then recreate the control
        super.componentWillUpdate(nextProps, nextState);
        // then rebind
        this._bindCloseHandler();
    }

    public componentWillUnmount() {
        this._unbindCloseHandler();
        super.componentWillUnmount();
    }
}
