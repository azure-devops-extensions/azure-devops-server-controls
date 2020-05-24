/// <reference types="react" />
/// <reference types="react-dom" />
import "VSS/LoaderPlugins/Css!ScaledAgile/Scripts/BasePage";
import * as React from "react";
import { IMessage, PageLoadingState } from "ScaledAgile/Scripts/Shared/Models/PageInterfaces";
import { Messages } from "ScaledAgile/Scripts/Main/Components/Messages";
import { ViewPerfScenarioManager } from "ScaledAgile/Scripts/Shared/Utils/Telemetry";
import { BasePageStore } from "ScaledAgile/Scripts/Main/Stores/BasePageStore";
import { PageActions } from "ScaledAgile/Scripts/Shared/Actions/PageActions";
import { WorkShortcutGroup } from "WorkItemTracking/Scripts/WorkShortcutGroup";

export interface IBasePageProps {
    /**
     * Additional hub view class name, by default it is using the result from getName.
     */
    hubViewClass?: string;
    /**
     * The page store -- manages the page loading state and notifications.
     */
    pageStore: BasePageStore;
    /**
     * The page action is passed down to the plan page to have the active
     * view being able to have the page action. This allow the active ActionCreator
     * to invoke page level action like setting the page's message or page's loading state.
     */
    pageActions?: PageActions;
}

export interface IBasePageState {
    messages: IMessage[];
    pageLoadingState: PageLoadingState;
}

export abstract class BasePage<P extends IBasePageProps, S extends IBasePageState> extends React.Component<P, S> {
    private _loadScenarioComplete = false;
    protected curtain: HTMLDivElement;
    protected hubProgress: HTMLDivElement;
    protected containerReference: HTMLDivElement = null;

    /**
     * Unique identifier of the loading curtain. One per page that we hide and show.
     */
    public static pageLoadingCurtainId = "loading-curtain";

    constructor(props: P, context?: any) {
        super(props, context);
        this.props.pageStore.addChangedListener(this._onPageStoreChanged);
        this.state = {
            messages: [],
            pageLoadingState: PageLoadingState.None
        } as S;
        this.startScenario();

        // Initialize work hub shortcuts
        new WorkShortcutGroup();
    }

    private _onPageStoreChanged = (pageStore: BasePageStore) => {
        this.setState({ pageLoadingState: pageStore.getValue().pageLoadingState, messages: pageStore.getValue().messages } as S);
    };

    public componentDidUpdate(prevProps: P, prevState: S) {
        if (!this._loadScenarioComplete) {
            if (this.endScenario(prevProps, prevState)) {
                this._loadScenarioComplete = true;
            }
        }

        this._refreshWindowSize(prevState.messages, this.state.messages);
    }

    /**
     * Once the page update, we look to see if messages has changed. If yes, we invoke the windows resize which will handle logic 
     * to re-calculate the positions and size of the UI. This is used especially in the DeliveryTimeline view (but not limited to only this one)
     * to ensure the height of the content is the right one to have the right viewport height as well as the right scrollbar height.
     */
    private _refreshWindowSize(previous: IMessage[], current: IMessage[]): void {
        if (previous !== current) {
            try {
                window.dispatchEvent(new Event("resize")); // Chrome, Firefox, Edge
            } catch (e) { // IE
                let event = document.createEvent("Event");
                event.initEvent("resize", false, true);
                window.dispatchEvent(event);
            }
        }
    }

    public componentWillMount() {
        ViewPerfScenarioManager.split(`${this._getName()}.componentWillMount`);
    }

    public componentDidMount() {
        ViewPerfScenarioManager.split(`${this._getName()}.componentDidMount`);
    }

    public componentWillUnmount() {
        this.props.pageStore.removeChangedListener(this._onPageStoreChanged);
    }

    public render(): JSX.Element {
        return <div className="scaledagile-page-wrapper" ref={(container) => {
            this.containerReference = container;
        }}>
            {this._renderMessages()}
            <div className="scaledagile-page-content" >
                {this._renderContent()}
            </div>
        </div>;
    }

    /**
     * Diagnostic name to be used as performance prefix.
     * Also this name is added as a class name on the root <div> element.
     */
    protected abstract _getName(): string;
    protected abstract startScenario(): void;
    protected abstract endScenario(prevProps: P, prevState: S): boolean;

    protected _renderMessages(): JSX.Element {
        return <Messages messages={this.state.messages.slice()} onCloseMessage={this._onCloseMessage} />;
    }

    protected _renderContent(): JSX.Element {
        return null;
    }

    private _getHubViewCssClass(): string {
        return this.props.hubViewClass || this._getName();
    }

    private _onCloseMessage = (id: string) => {
        this.props.pageActions.clearPageMessage.invoke(id);
    };
}