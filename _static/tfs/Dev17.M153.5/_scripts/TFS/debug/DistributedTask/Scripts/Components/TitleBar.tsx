/// <reference types="react-dom" />

import React = require("react");
import Component_Base = require("VSS/Flux/Component");
import Button = require("VSSPreview/Flux/Components/Button");
import Events_Action = require("VSS/Events/Action");
import Navigation_Services = require("VSS/Navigation/Services");
import Events_Services = require("VSS/Events/Services");
import Utils_String = require("VSS/Utils/String");

import Constants = require("DistributedTask/Scripts/Constants");
import DTUtils = require("DistributedTask/Scripts/DT.Utils");
import Resources = require("DistributedTask/Scripts/Resources/TFS.Resources.DistributedTask");
import { Breadcrumb, IBreadcrumbItem } from 'OfficeFabric/Breadcrumb';
import { MessageBar, MessageBarType } from 'OfficeFabric/MessageBar';
import { SearchBox } from 'OfficeFabric/SearchBox';

export interface Props extends Component_Base.Props {
    buttons: Button.Props[];
    searchBox?: { labelText?: string, value?: string, onChange: (searchValue: any) => void };
    errorMessage?: string;
    itemType?: string;
    itemText?: string;
    isItemDirty?: boolean;
}

export interface State extends Component_Base.Props {
    path: string;
}

export class TitleBar extends Component_Base.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        let urlState = Navigation_Services.getHistoryService().getCurrentState();
        this.state = this.getState();
        (this.state as State).path = urlState.path;
    }

    public render(): JSX.Element {
        let buttons = this.props.buttons || [];
        let searchBox: JSX.Element;
        if (!!this.props.searchBox) {
            searchBox = <div className="lib-title-bar-search">
                <SearchBox onChange={this.props.searchBox.onChange} labelText={this.props.searchBox.labelText} value={this.props.searchBox.value} />
            </div>
        }

        let errorMessageBox: JSX.Element;
        if (!!this.props.errorMessage) {
            errorMessageBox = <div className="lib-title-error">
                <MessageBar messageBarType={MessageBarType.error} onDismiss={() => { Events_Services.getService().fire(Constants.LibraryActions.ClearErrorMessage); }}>
                    {this.props.errorMessage}
                </MessageBar>
            </div>
        }

        return <div className={`lib-title-bar ${this.props.cssClass || ""}`}>
            <table style={{ width: '100%' }}>
                <tbody>
                    <tr>
                        <td style={{ width: '100%' }}>
                            <Breadcrumb items={this.getBreadcrumbsItems()} maxDisplayedItems={3} />
                        </td>
                        <td key="tbs">
                            {searchBox}
                        </td>
                        {
                            // Iterate through all buttons and render them
                            buttons.map((buttonProps: TitleBarButtonProps, index: number) => {
                                return <td key={`tbb${buttonProps.key || index}`} className="title-bar-button-col">
                                    <TitleBarButtonComponent {...buttonProps} />
                                </td>;
                            })
                        }
                    </tr>
                </tbody>
            </table>
            {errorMessageBox}
        </div>;
    }

    public componentWillMount() {
        Navigation_Services.getHistoryService().attachNavigate(this.onUrlChange);
    }

    public componentWillUnmount() {
        Navigation_Services.getHistoryService().detachNavigate(this.onUrlChange);
    }

    protected onUrlChange = (): void => {
        let urlState = Navigation_Services.getHistoryService().getCurrentState();
        let state = this.getState();
        state.path = urlState.path;
        this.setState(state);
    }

    protected getState(): State {
        if (this.state == null) {
            return { path: null };
        }

        return this.state;
    }

    private onBreadcrumbItemClicked = (ev: React.MouseEvent<HTMLElement>, item: IBreadcrumbItem): void => {
        if (item.key == Constants.LibraryConstants.BreadCrumbLastElementKey) {
            // Last Breadcrumb item has been clicked. Do nothing as the user is already on same path
        } else {
            if (item.key == Constants.LibraryConstants.BreadCrumbLibraryKey) {
                let queryParams = {};
                if (this.props.itemType) {
                    queryParams = { itemType: this.props.itemType };
                }
                this.navigateToGivenPathInLibraryHub("", queryParams);
            }
            else {
                this.navigateToGivenPathInLibraryHub("", { path: item.key });
            }
        }
    }

    private navigateToGivenPathInLibraryHub(action: string, queryParams: any): void {
        var contributionId: string = Constants.ExtensionArea.LibraryHub;

        Events_Action.getService().performAction(Events_Action.CommonActions.ACTION_WINDOW_NAVIGATE, {
            url: DTUtils.UrlHelper.getUrlForExtension(contributionId, action, queryParams)
        });
    }

    private getBreadcrumbsItems(): IBreadcrumbItem[] {
        let items: IBreadcrumbItem[] = [
            { text: Resources.LibraryHubTitle, 'key': Constants.LibraryConstants.BreadCrumbLibraryKey, onClick: this.onBreadcrumbItemClicked }
        ];
            
        if(this.props.itemText != null) {
            items.push({ text: this.props.isItemDirty != null && this.props.isItemDirty && this.props.itemText != null ? Utils_String.format("{0}{1}", this.props.itemText, "*") : this.props.itemText, 'key': this.props.itemText, onClick: this.onBreadcrumbItemClicked });
        }
        else if (!!this.state.path) {
            items.push({ text: this.state.path, 'key': this.state.path, onClick: this.onBreadcrumbItemClicked });
        }

        // marking last element in bread crumb so we can identify it as last element when it is clicked
        items[items.length - 1].key = Constants.LibraryConstants.BreadCrumbLastElementKey;

        return items;
    }

}

export interface TitleBarButtonProps extends Component_Base.Props {
    template: () => JSX.Element;
}

class TitleBarButtonComponent extends Component_Base.Component<TitleBarButtonProps, Button.State> {
    public render(): JSX.Element {
        return this.props.template();
    }
}