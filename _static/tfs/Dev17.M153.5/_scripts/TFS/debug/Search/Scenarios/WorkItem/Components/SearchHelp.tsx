import * as React from "react";
import * as Resources from "Search/Scripts/Resources/TFS.Resources.Search.Scenarios";
import * as SharedSearchHelp from "Search/Scenarios/Shared/Components/SearchHelp";
import * as _IdentityPicker from "Search/Scenarios/WorkItem/Components/IdentityPicker";
import * as _IdentityPickerRestClient from "VSS/Identities/Picker/RestClient";
import { getAsyncLoadedComponent } from "VSS/Flux/AsyncLoadedComponent";
import { DropdownType, getSuggestedText } from "Search/Scenarios/WorkItem/Flux/Stores/HelpStore";
import { FormatComponent } from "VSSPreview/Flux/Components/Format";

/**
* The component is responsible to plugin the required dropdown which can either be filter specific or identitity picker.
* depending upon the scenario.
*/
export interface ISearchHelpComponentProps extends SharedSearchHelp.ISearchHelpComponentProps {
    dropdownType: DropdownType;

    isMember: boolean;
}

export class SearchHelp extends React.Component<ISearchHelpComponentProps, {}> {
    private focusable: SharedSearchHelp.IFocusable;

    public render(): JSX.Element {
        const { dropdownType, filterText, isMember } = this.props;

        if (dropdownType !== DropdownType.Identity) {
            return <SharedSearchHelp.SearchHelpComponent {...this.props} onRenderFilterText={onRenderFilterText} />;
        }
        else if (dropdownType === DropdownType.Identity && isMember) {
            return <IdentityPickerAsync
                onItemSelect={this._onIdentityEntitySelection}
                filterText={filterText}
                onDismiss={this.props.onDismiss}
                componentRef={this.props.componentRef} />;
        }

        return null;
    }
    
    private _onIdentityEntitySelection = (entity: _IdentityPickerRestClient.IEntity): void => {
        const { searchInput, onItemActivated } = this.props,
            currentString = searchInput.getText(),
            identityName = `"${this.getIdentityName(entity)}"`,
            suggestedString = getSuggestedText(currentString, identityName, false, false);

        searchInput.updateText(suggestedString, true);

        if (onItemActivated) {
            onItemActivated(null);
        }
    }

    private getIdentityName = (item: _IdentityPickerRestClient.IEntity): string => {
        if (!item) {
            return "";
        }

        const uniqueName = item.signInAddress || item.mail;

        if (uniqueName) {
            if (uniqueName.indexOf("@") === -1 && item.scopeName) {
                // if uniqueName is not an email, use both domain and alias
                return `${item.displayName} <${item.scopeName}\\${uniqueName}>`;
            }
            else {
                // if uniqueName is an email, only use email
                return `${item.displayName} <${uniqueName}>`;
            }
        }
        else {
            return item.displayName || "";
        }
    }
}

const onRenderFilterText = (filter: SharedSearchHelp.ISearchFilter, filterText: string): JSX.Element | string => {
    filterText = filterText.replace(/[\s]+/g, " ").toLowerCase();
    const hasSpace = filterText.search(/\s/) > 0;

    if (!filterText || filterText === "") {
        return filter.text;
    }

    let highlightedText, nonHighligtedText;

    if (hasSpace) {
        highlightedText = filter.text.substring(filterText.length);
        nonHighligtedText = filter.text.substring(0, filterText.length);
    }
    else {
        let indexOfSpace = filter.text.indexOf(" "),
            filterTextLength = filterText.length;
        while (indexOfSpace > 0) {
            if (filterTextLength > indexOfSpace) {
                filterTextLength += 1;
                indexOfSpace = filter.text.indexOf(" ", indexOfSpace + 1);
            }
            else {
                break;
            }
        }

        highlightedText = filter.text.substring(filterTextLength);
        nonHighligtedText = filter.text.substring(0, filterTextLength);
    }

    return (
        <FormatComponent format={`${nonHighligtedText}{0}`}>
            <span style={{ fontWeight: 700 }}>{highlightedText}</span>
        </FormatComponent>
    );
}

const IdentityPickerAsync = getAsyncLoadedComponent(
    ["Search/Scenarios/WorkItem/Components/IdentityPicker"],
    (IdentityPickerSearch: typeof _IdentityPicker) => IdentityPickerSearch.IdentityPicker);