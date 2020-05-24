import * as React from "react";
import * as List from "OfficeFabric/List";
import { FocusZone, FocusZoneDirection } from "OfficeFabric/FocusZone";
import { IRenderFunction } from "OfficeFabric/Utilities";
import { PreviewOrientationActionIds } from "Search/Scenarios/Code/Constants";
const rowHeightInHorizontalMode: number = 57;
const rowHeightInVerticalMode: number = 33;

export interface DetailsListWrapperProps extends List.IListProps {
    currentItemIndex: number;

    previewOrientation: string;

    searchSucceeded: boolean;

    notifyResultsRendered: () => void;
}

/**
 * Wrapping List in this react component so as to have a handle to the reference of the root element
 * to perform operations such as scrolling to a desired element on list updation.
 */
export class DetailsListWrapper extends React.Component<DetailsListWrapperProps, {}> {
    private listRef: List.List;
    private shouldNotifyResultsRendered: boolean;

    public render(): JSX.Element {
        // Since componentWillReceiveProps is deprecated method in react lifecycle, keeping this check here.
        if (this.props.searchSucceeded) {
            this.shouldNotifyResultsRendered = true;
        }

        return (
            <FocusZone
                className="itemList-focus-zone"
                direction={FocusZoneDirection.vertical}
                isInnerZoneKeystroke={(evt?: React.KeyboardEvent<HTMLElement>) =>
                    evt.keyCode === 39 /* right */ || evt.keyCode === 37 /* left */}>
                <List.List componentRef={(ref: List.List) => { this.listRef = ref }} {...this.props} onRenderPage={this.onRenderPage} />
            </FocusZone>
        );
    }

    private onRenderPage = (pageProps: List.IPageProps, defaultRender: IRenderFunction<List.IPageProps>): React.ReactNode => {
        // Search results are not populated on first render in OfficeFabric List. It builds page(s) from items passed and checks whether 
        // 'show more' list option is required. Hence, we record TTI scenario when search result list is actually rendered.
        if (this.shouldNotifyResultsRendered) {
            this.shouldNotifyResultsRendered = false;
            this.props.notifyResultsRendered();
        }

        return defaultRender(pageProps);
    }

    public componentDidMount(): void {
        this.postRender();
    }

    public componentDidUpdate(): void {
        this.postRender();
    }

    private postRender(): void {
        const { items, currentItemIndex } = this.props;

        if (this.listRef) {
            this.listRef.forceUpdate();
            // Providing measure function so as to avoid bringing the page into view to avoid sudden jump.
            this.listRef.scrollToIndex(currentItemIndex, (index) => {
                return this.props.previewOrientation === PreviewOrientationActionIds.Bottom
                    ? rowHeightInVerticalMode
                    : rowHeightInHorizontalMode;
            });
        }
    }
}