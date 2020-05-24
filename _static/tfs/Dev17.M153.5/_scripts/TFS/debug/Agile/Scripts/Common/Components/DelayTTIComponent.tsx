import * as React from "react";
import * as Events_Page from "VSS/Events/Page";
import * as Performance from "VSS/Performance";
import { LoadingComponent } from "Presentation/Scripts/TFS/Components/LoadingComponent";

export interface IDelayTTIComponentProps {
    children: () => JSX.Element;
    // Should we show a loading indicator until page is interactive
    showLoading?: boolean;
}

export interface IDelayTTIComponentState {
    isPageInteractive: boolean;
}

export class DelayTTIComponent extends React.Component<IDelayTTIComponentProps, IDelayTTIComponentState> {
    constructor(props: IDelayTTIComponentProps) {
        super(props);

        this.state = {
            isPageInteractive: false || !Performance.getScenarioManager().isPageLoadScenarioActive()
        };
    }

    public componentWillMount() {
        Events_Page.getService().subscribe(Events_Page.CommonPageEvents.PageInteractive, this._pageInteractiveEventListner);
    }

    public componentWillUnmount() {
        Events_Page.getService().unsubscribe(Events_Page.CommonPageEvents.PageInteractive, this._pageInteractiveEventListner);
    }

    public render() {
        const {
            children,
            showLoading
        } = this.props;

        if (this.state.isPageInteractive) {
            return children();
        }

        if (showLoading) {
            return <LoadingComponent />;
        }

        return null;
    }

    private _pageInteractiveEventListner = () => {
        this.setState({
            isPageInteractive: true
        });
    }

}