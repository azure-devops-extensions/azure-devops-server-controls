import * as React from "react";

export interface ITabComponentProps<TTab> {
    tabs: TTab[];

    renderTab: (tab: TTab) => JSX.Element;
}

export interface ITabComponentState<TTab> {
    activeTab: number;
    renderedTabs: JSX.Element[];
}

export class TabComponent<TTab> extends React.Component<ITabComponentProps<TTab>, ITabComponentState<TTab>> {
    constructor(props) {
        super(props);

        this.state = {
            activeTab: 0,
            renderedTabs: this.props.tabs.map(t => null)
        };
    }

    public render(): JSX.Element {
        return <div>
            {this._getRenderedTabs()}
        </div>;
    }

    private _getRenderedTabs(): JSX.Element[] {
        if (!this.state.renderedTabs[this.state.activeTab]) {
            this.state.renderedTabs[this.state.activeTab] = this.props.renderTab(this.props.tabs[this.state.activeTab]);
        }

        // Add all rendered tabs to the DOM
        return this.state.renderedTabs.map((tab, index) => this._renderTab(tab, index));
    }

    private _renderTab(tab: JSX.Element, index: number) {
        return <div key={index} style={{ display: this.state.activeTab === index ? "block" : "none" }}>
            {tab}
        </div>;
    }

    /**
     * Set the active tab
     * @param activeTab Index of tab, or tab object to select
     * @param callback Optional callback once tab has been activated
     */
    public setActiveTab(activeTab: number | TTab, callback?: () => void) {
        let newActiveTab: number;
        if (typeof activeTab === "number") {
            newActiveTab = activeTab;
        } else {
            newActiveTab = this.props.tabs.indexOf(activeTab);
        }

        this.setState({
            activeTab: newActiveTab
        } as ITabComponentState<TTab>, () => {
            if (callback) {
                callback();
            }
        });
    }
}