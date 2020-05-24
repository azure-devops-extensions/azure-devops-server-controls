import "VSS/LoaderPlugins/Css!Presentation/Components/IdentityPickerSearch";

import * as React from "react";

import { autobind, css } from "OfficeFabric/Utilities";

// legacy stuff for control rendering
import * as Controls from "VSS/Controls";
import * as IdentityPicker from "VSS/Identities/Picker/Controls";
import * as IdentitiesPickerRestClient from "VSS/Identities/Picker/RestClient";
import * as Identities_Services from "VSS/Identities/Picker/Services";

import "VSS/LoaderPlugins/Css!VersionControl/IdentityPickerSearch";

export interface IdentityPickerProps {
    focusOnLoad: boolean;
    dropdownWidth?: number;
    consumerId: string;
    className?: string;
    multiIdentitySearch: boolean;
    inlineSelectedEntities: boolean;
    showTemporaryDisplayName?: boolean;
    defaultEntities?: string[];
    controlSize?: IdentityPicker.IdentityPickerControlSize;
    includeGroups?: boolean;
    /* Default true */
    includeUsers?: boolean;
    id?: string;
    placeholderText?: string;
    identitySelected?: (identity: IdentitiesPickerRestClient.IEntity) => void;
    identitiesUpdated?: (identities: IdentitiesPickerRestClient.IEntity[]) => void;
    unresolvedIdentitiesUpdated?: (unresolvedEntitites: string[]) => void;
    preDropdownRender?: (identities: IdentitiesPickerRestClient.IEntity[], isDirectorySearchEnabled?: boolean) => IdentitiesPickerRestClient.IEntity[];
    showMruOnClick?: boolean;
    readOnly?: boolean;
    /** default true */
    showMru?: boolean;
    /** default true */
    showContactCard?: boolean;
    showMruTriangle?: boolean;
    highlightResolved?: boolean;
    /* default ims, source */
    operationScope?: Identities_Services.IOperationScope;
    extensionData?: Identities_Services.IExtensionData;
    /** any keystroke or identity selection change */
    onCharacterChange?: (entities: IdentitiesPickerRestClient.IEntity[], textValue: string) => void;
}

function getValueOrDefault<T, K extends keyof T>(object: T, key: K, defaultValue: T[K]): T[K] {
    if (key in object) {
        return object[key];
    }
    return defaultValue;
}

/**
 * Render the identity picker search control.
 *
 * Picker is only created onMount and is not updated afterwards
 */
export class IdentityPickerSearch extends React.Component<IdentityPickerProps, {}> {
    private _containerElement: HTMLElement;

    private _identityPickerControl: IdentityPicker.IdentityPickerSearchControl;

    public static defaultProps: IdentityPickerProps = {
        includeGroups: true,
    } as IdentityPickerProps;

    public render(): JSX.Element {
        return <div className="identityPickerSearch-root">
            <div
                className={css("identityPickerSearch", this.props.className)}
                ref={(d) => this._containerElement = d} />
            <div
                className="identityPickerSearch-fixed-overlay" />
        </div>;
    }

    public componentDidMount() {
        this._createIdentityPicker();
    }

    public componentWillUnmount() {
        if (this._identityPickerControl) {
            this._identityPickerControl.dispose();
            this._identityPickerControl = null;
        }
    }

    public componentDidUpdate(prevProps: IdentityPickerProps) {
        if (this._identityPickerControl && this.props.readOnly !== prevProps.readOnly) {
            if (this.props.readOnly) {
                this._identityPickerControl.enableReadOnlyMode();
            }
            else {
                this._identityPickerControl.disableReadOnlyMode();
            }
        }
    }

    public clear(): void {
        if (this._identityPickerControl) {
            this._identityPickerControl.clear();
        }
    }

    public focus(): void {
        this._focusIdentityPickerControl();
    }

    /**
     * Create the identity search control and bind it to the page.
     */
    private _createIdentityPicker() {
        const $containerElement = $(this._containerElement);
        const operationScope: Identities_Services.IOperationScope = getValueOrDefault(this.props, "operationScope", {
            IMS: true,
            Source: true,
        });
        const identityType: Identities_Services.IEntityType = {
            User: getValueOrDefault(this.props, "includeUsers", true),
            Group: this.props.includeGroups
        };

        this._identityPickerControl = Controls.create<IdentityPicker.IdentityPickerSearchControl, IdentityPicker.IIdentityPickerSearchOptionsInternal>(
            IdentityPicker.IdentityPickerSearchControl, $containerElement, {
                callbacks: {
                    onItemSelect: (item: IdentitiesPickerRestClient.IEntity) => {
                        if (!this.props.inlineSelectedEntities) {
                            this.clear();
                        }
                        this._focusIdentityPickerControl();
                        this._selectIdentity(item);
                        this._onCharacterChange();
                    },
                    onInputBlur: () => {
                        this._onUpdated();
                    },
                    preDropdownRender: (items: IdentitiesPickerRestClient.IEntity[], isDirectorySearchEnabled?: boolean) => {
                        if (this.props.preDropdownRender) {
                            return this.props.preDropdownRender(items, isDirectorySearchEnabled);
                        }
                        return items;
                    }
                },
                identityType,
                operationScope,
                multiIdentitySearch: this.props.multiIdentitySearch,
                showMru: getValueOrDefault(this.props, "showMru", true),
                showContactCard: getValueOrDefault(this.props, "showContactCard", true),
                size: getValueOrDefault(this.props, "controlSize", IdentityPicker.IdentityPickerControlSize.Medium),
                dropdownWidth: this.props.dropdownWidth,
                consumerId: this.props.consumerId,
                elementId: this.props.id,
                placeholderText: this.props.placeholderText,
                dialogAppendTo: ".identityPickerSearch-fixed-overlay",
                dropdownContainer: () => $containerElement,
                showTemporaryDisplayName: this.props.showTemporaryDisplayName,
                showMruOnClick: this.props.showMruOnClick,
                showMruTriangle: this.props.showMruTriangle,
                highlightResolved: this.props.highlightResolved,
                extensionData: this.props.extensionData
            });

        // subscribe to identity removed event
        this._identityPickerControl._bind(IdentityPicker.IdentityPickerSearchControl.RESOLVED_INPUT_REMOVED_EVENT, this._onUpdated);
        this._identityPickerControl._element.find("input").keyup(this._onCharacterChange);

        // set focus on load
        if (this.props.focusOnLoad) {
            this._focusIdentityPickerControl();
        }

        if (this.props.defaultEntities) {
            this._identityPickerControl.setEntities([], this.props.defaultEntities);
        }

        if (this.props.readOnly) {
            this._identityPickerControl.enableReadOnlyMode();
        }
    }

    public setEntities(entities: IdentitiesPickerRestClient.IEntity[], queryTokens: string[]) {
        this._identityPickerControl.setEntities(entities, queryTokens);
    }

    public getInputText(): string {
        return this._identityPickerControl.getInputText();
    }

    @autobind
    private _onCharacterChange() {
        if (!this.props.onCharacterChange) {
            return;
        }
        const entities = this._identityPickerControl.getIdentitySearchResult().resolvedEntities;
        const text = this._identityPickerControl.getInputText();
        this.props.onCharacterChange(entities, text);
    }

    /**
     * Handle a reviewer add event.
     */
    @autobind
    private _selectIdentity(identity: IdentitiesPickerRestClient.IEntity) {
        if (this.props.identitySelected) {
            this.props.identitySelected(identity);
        } else {
            // try identitiesUpdated event when identitySelected not specified
            this._onUpdated();
        }

        if (this._identityPickerControl && identity && identity.localId) {
            this._identityPickerControl.addIdentitiesToMru([identity]);
        }

        this._updateUnresolvedIdentities();
    }

    @autobind
    private _onUpdated(): void {
        if (this.props.identitiesUpdated) {
            const identities = this._identityPickerControl.getIdentitySearchResult().resolvedEntities;
            this.props.identitiesUpdated(identities);
        }
        this._updateUnresolvedIdentities();
    }

    @autobind
    private _updateUnresolvedIdentities() {
        if (this.props.unresolvedIdentitiesUpdated) {
            const input = this._identityPickerControl.getElement()[0].querySelector("input").value.trim();
            const unresolvedEntitites = this._identityPickerControl.getIdentitySearchResult().unresolvedQueryTokens.concat(input || []);
            this.props.unresolvedIdentitiesUpdated(unresolvedEntitites);
        }
    }

    private _focusIdentityPickerControl() {
        if (this._identityPickerControl) {
            this._identityPickerControl._element.find(".identity-picker-input").focus();
        }
    }
}
