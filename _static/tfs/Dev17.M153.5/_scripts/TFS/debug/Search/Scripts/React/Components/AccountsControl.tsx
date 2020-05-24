/// Copyright (c) Microsoft Corporation. All rights reserved.
/// <reference types="react" />
/// <reference types="react-dom" />

"use strict";

import * as React from "react";
import * as ReactDOM from "react-dom";
import * as Context from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { ignoreCaseComparer } from "VSS/Utils/String";
import { ActionCreator } from "Search/Scripts/React/ActionCreator";
import { StoresHub } from "Search/Scripts/React/StoresHub";
import { SearchProvider } from "Search/Scripts/React/Models";
import { autobind, css, getId } from 'OfficeFabric/Utilities';
import { IconType } from  "OfficeFabric/Icon";
import { DirectionalHint } from "OfficeFabric/common/DirectionalHint";
import { Spinner } from "OfficeFabric/Spinner";
import { Utils } from "Search/Scripts/Common/TFS.Search.Helpers";
import { DefaultButton, IButtonProps } from "OfficeFabric/Button";
import { ContextualMenu, IContextualMenuItem} from "OfficeFabric/ContextualMenu";
import { AccountsButtonLabel, AccountsButtonAriaLabel} from "Search/Scripts/Resources/TFS.Resources.Search";
import { Link } from "OfficeFabric/Link";
import * as VssUri from "VSS/Utils/Url";
import { SearchConstants } from "Search/Scripts/Common/TFS.Search.Constants";

import "VSS/LoaderPlugins/Css!Search/React/Components/AccountsControl";

export interface IAccountsComponentProps {
    actionCreator: ActionCreator,
    storesHub: StoresHub
}

export interface IAccountsComponentState {
    items: IContextualMenuItem[],
    loading: boolean,
    active: boolean
}

/**
 * Represents the context menu with button control to list down the accounts in cross account search scenario
 */
export class AccountsComponent extends React.Component<IAccountsComponentProps, IAccountsComponentState> {
    private viewState: IAccountsComponentState;

    constructor(props: IAccountsComponentProps) {
        super(props);
        this.state = this.viewState = { items: [], loading: true, active: false };
    }

    public render(): JSX.Element {
        let { items, loading, active} = this.state,
            activeEntity = this.props.storesHub.searchProvidersStore.CurrentProvider,
            buttonId = getId("search-AccountsBtn-"),
            loadingVisible = active && loading,
            popupMenuVisible = active && !loading;

        if (activeEntity === SearchProvider.code) {
            return (
                <div className="search-Accounts--container">
                    <DefaultButton
                        className="search-AccountsBtn"
                        ariaLabel={AccountsButtonAriaLabel}
                        id={buttonId}
                        onClick={this.onButtonClick}
                        text={AccountsButtonLabel}
                        iconProps={{
                            iconName: "ChevronDown",
                            className: "accounts-Chevron-Icon"
                        }} />
                    {
                        popupMenuVisible &&
                        // Enabling visibility of beak, as in case the list of accounts overflows
                        // the context menu shifts towards the right edge, and without beak being visible
                        // it becomes hard to know which target the context menu is anchored to.
                        <ContextualMenu
                            target={"#" + buttonId}
                            isBeakVisible={true}
                            gapSpace={5}
                            beakWidth={10}
                            shouldFocusOnMount={true}
                            directionalHint={DirectionalHint.bottomLeftEdge}
                            items={items}                            
                            onDismiss={this.onDismiss} />
                    }
                    {
                        // Account list has not been fetched yet and user clicks the button
                        loadingVisible &&
                        <div className="content-loading">
                            <Spinner label="Loading..."/>
                        </div>
                    }
                </div>);
        }

        return <div />;
    }

    /**
     * Bind to stores to act upon cross account load, and search text change.
     */
    public componentDidMount(): void {
        this.props.storesHub.accountsStore.addChangedListener(this.onAccountsLoaded);
        this.props.storesHub.searchResultsStore.addChangedListener(this.onSearchResultsUpdated);
    }

    /**
     * Fetch latest set of accounts from store, and update the state to re-render the component. After removing the current
     * working account from the list. Once the results are obtained it modifies the state from loading to non-loading, signifying
     * that the control has data to render.
     */
    @autobind
    private onAccountsLoaded(): void {
        let accounts: any[] = this.props.storesHub.accountsStore.accounts || [],
            currentAccount: string = Context.TfsContext.getDefault().contextData.account.name;

        // Filter out current working account.
        accounts = accounts.filter((a, i) => { return ignoreCaseComparer(a.name, currentAccount) !== 0 });
        this.viewState.items = this.createItems(accounts);
        this.viewState.loading = false;

        this.setState(this.viewState);
    }

    /**
     * On first click on the button, method queues as request to fetch the list of accounts in cross account search scenario.
     * Also maintains the state of the popup menu.
     */
    @autobind
    private onButtonClick(): void {
        // Queue fetching search hits across accounts if not already loaded.
        if (this.state.loading) {
            this.props.actionCreator.fetchAccounts();
        }

        this.viewState.active = !this.state.active;
        this.setState(this.viewState);
    }

    @autobind
    private onDismiss(): void {
        this.viewState.active = false;
        this.setState(this.viewState);
    }

    /**
     * Resets state from non-loading to loading as a new query with new search text was fired, hence
     * there is a need to fetch the accounts again.
     */
    @autobind
    private onSearchResultsUpdated(): void {
        this.viewState.items = [];
        this.viewState.loading = true;

        this.setState(this.viewState);
    }

    /**
     * converts list of accounts{name, id, resultCount } into a list of representable objects of type IContextualMenuItem.
     * @param accounts
     */
    private createItems(accounts: any[]): IContextualMenuItem[] {
        let items: IContextualMenuItem[] = [];
        return accounts.map((account, index) => {
            return {
                key: account.id,
                name: account.name,
                onClick: (ev?, item?: IContextualMenuItem) => {
                    let url = AccountsComponent.getAccountSearchURL(item.name);
                    window.open(url, "_blank");
                },
                data: {
                    facet: account.resultCount
                },
                onRender: (item: IContextualMenuItem): React.ReactNode => {
                    return (
                        <div
                            key={item.name}                            
                            className={css("search-Account-Item", "overflow")}
                            onClick={(ev) => item.onClick(ev, item)}>
                            <Link className={css("account-Name")}>{item.name}</Link>
                            <span className={css("facet", "overflow")}>{item.data.facet}</span>
                        </div>
                    );
                }
            } as IContextualMenuItem;
        });
    }

    private static getAccountSearchURL(accountName: string): string {
        let uri: VssUri.Uri = new VssUri.Uri(window.location.href),
            searchText = uri.getQueryParam("text"),
            filters = uri.getQueryParam("filters") || "",
            codeElementFilterApplied = filters.indexOf("CodeElementFilters") >= 0,
            codeElementSubstring = filters.substring(filters.indexOf("CodeElementFilters")),
            codeElementFilters = codeElementSubstring.substring(0, codeElementSubstring.indexOf("}") + 1),
            currentAccountSearchUrl: string = Utils.getAccountSearchResultsViewUrl(
                codeElementFilterApplied ? codeElementFilters: "",
                searchText,
                SearchConstants.SearchActionName,
                null,
                SearchConstants.CodeEntityTypeId);

        // ToDo: Need to have a better way to construct account URL
        let firstIndexOfAccountName: number = currentAccountSearchUrl.indexOf("//") + 2,
            scheme = currentAccountSearchUrl.substr(0, firstIndexOfAccountName),
            domainWithQueryParams = currentAccountSearchUrl.substr(currentAccountSearchUrl.indexOf(".")).replace("#", "?");

        return scheme + accountName + domainWithQueryParams;

    }
}