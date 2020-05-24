/// Copyright (c) Microsoft Corporation. All rights reserved.

import * as React from "react";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import { Toggle } from "OfficeFabric/Toggle";
import { Link } from "OfficeFabric/Link";
import { Label } from "OfficeFabric/Label";
import "VSS/LoaderPlugins/Css!VersionControl/VCAdmin";

import * as VCTypes from "VersionControl/Scenarios/VCAdmin/VCAdminTypes";
import { VCAdminActionCreator } from "VersionControl/Scenarios/VCAdmin/VCAdminActionCreator";
import { RepoOptionsStore } from "VersionControl/Scenarios/VCAdmin/Stores/RepoOptionsStore"; 
import * as String from "VSS/Utils/String";

export interface RepositoryOptionsContainerProps {
    actionCreator: VCAdminActionCreator;
    repoOptionsStore: RepoOptionsStore;
    canEditPolicies: boolean;
}

export interface RepositoryOptionsContainerState {
    optionsHashtable: VCTypes.HashTable<VCTypes.RepositoryOption>;
    loadError: Error;
}

export class RepositoryOptionsContainer extends React.Component<RepositoryOptionsContainerProps, RepositoryOptionsContainerState> {

    constructor(props: RepositoryOptionsContainerProps) {
        super(props);
        this.state = props.repoOptionsStore.getData();

        this.props.actionCreator.getRepositoryOptions();
    }

    public componentDidMount() {
        this.props.repoOptionsStore.addChangedListener(this._onStateChanged);
    }

    public componentWillUnmount() {
        this.props.repoOptionsStore.addChangedListener(this._onStateChanged);
    }

    public render(): JSX.Element {
        if (this.state.loadError) {
            return <div>{this.state.loadError.message}</div>;
        }

        let forks = null;
        if (this.state.optionsHashtable[VCTypes.Constants.ForksKey]) {
            forks = this._renderForks();
        }

        let wit = null;
        if (this.state.optionsHashtable[VCTypes.Constants.WitMentionsKey]) {
            wit = this._renderWit();
        }

        let webEdit = null;
        if (this.state.optionsHashtable[VCTypes.Constants.WebEditKey]) {
            webEdit = this._renderWebEdit();
        }

        let gravatar = null;
        if (this.state.optionsHashtable[VCTypes.Constants.GravatarKey]) {
            gravatar = this._renderGravatar();
        }

        return (
            <div>
                {gravatar}
                {forks}
                {wit}
                {webEdit}
            </div>
        );
    }

    private _renderGravatar(): JSX.Element {
        const gravatarOption = this.state.optionsHashtable[VCTypes.Constants.GravatarKey];

        const disabled: boolean = gravatarOption.updateError !== null && gravatarOption.updateError !== undefined;
        return (
            <div className={VCTypes.Css.OptionGroup}>
                <h3 className={VCTypes.Css.OptionHeader}>{gravatarOption.category}</h3>
                <Label>
                    {gravatarOption.displayHtml}&nbsp;
                    <Link className={VCTypes.Css.Link} href="https://go.microsoft.com/fwlink/?LinkId=313945" target="_blank">{VCResources.LearnMore}.</Link>
                </Label>
                <Toggle
                    checked={gravatarOption.value}
                    onChanged={this._onGravatarChanged}
                    onText={VCResources.OnText}
                    offText={VCResources.OffText}
                    disabled={disabled}
                    onAriaLabel={String.format(VCResources.VCToggleLabel, gravatarOption.displayHtml, VCResources.OnText)}
                    offAriaLabel={String.format(VCResources.VCToggleLabel, gravatarOption.displayHtml, VCResources.OffText)}
                />

                {
                    gravatarOption.updateError &&
                        <div aria-live="assertive" className={VCTypes.Css.Error}>{VCResources.GitSettingError} {gravatarOption.updateError.message}</div>
                }
            </div>
        );
    }

    private _renderWebEdit(): JSX.Element {
        const webEditOption = this.state.optionsHashtable[VCTypes.Constants.WebEditKey];

        const disabled: boolean = webEditOption.updateError !== null && webEditOption.updateError !== undefined;

        return (
            <div className={VCTypes.Css.OptionGroup}>
                <h3 className={VCTypes.Css.OptionHeader}>{webEditOption.category}</h3>
                <Label>{webEditOption.displayHtml}</Label>
                <Toggle
                    checked={webEditOption.value}
                    onChanged={this._onWebEditChanged}
                    onText={VCResources.OnText}
                    offText={VCResources.OffText}
                    disabled={disabled}
                    onAriaLabel={String.format(VCResources.VCToggleLabel, webEditOption.displayHtml, VCResources.OnText)}
                    offAriaLabel={String.format(VCResources.VCToggleLabel, webEditOption.displayHtml, VCResources.OffText)}
                />

                {
                    webEditOption.updateError &&
                        <div aria-live="assertive" className={VCTypes.Css.Error}>{VCResources.GitSettingError} {webEditOption.updateError.message}</div>
                }
            </div>
        );
    }

    private _renderWit(): JSX.Element {
        const witMentions = this.state.optionsHashtable[VCTypes.Constants.WitMentionsKey];
        const witSticky = this.state.optionsHashtable[VCTypes.Constants.WitTransitionsKey];

        const mentionsDisabled: boolean = !!witMentions.updateError || !this.props.canEditPolicies;
        const stickyDisabled: boolean = !!witSticky.updateError || !this.props.canEditPolicies;

        const mention = (
            <div>
                <Label>{witMentions.displayHtml}</Label>
                <Toggle
                    checked={witMentions.value}
                    onChanged={this._onWitMentionChanged}
                    onText={VCResources.OnText}
                    offText={VCResources.OffText}
                    disabled={mentionsDisabled}
                    onAriaLabel={String.format(VCResources.VCToggleLabel, witMentions.displayHtml, VCResources.OnText)}
                    offAriaLabel={String.format(VCResources.VCToggleLabel, witMentions.displayHtml, VCResources.OffText)}
                />

                {
                    witMentions.updateError &&
                        <div aria-live="assertive" className={VCTypes.Css.Error}>{VCResources.GitSettingError} {witMentions.updateError.message}</div>
                }
            </div>
        );

        const sticky = (
            <div>
                <Label>{witSticky.displayHtml}</Label>
                <Toggle
                    checked={witSticky.value}
                    onChanged={this._onWitStickyChanged}
                    onText={VCResources.OnText}
                    offText={VCResources.OffText}
                    disabled={stickyDisabled}
                    onAriaLabel={String.format(VCResources.VCToggleLabel, witSticky.displayHtml, VCResources.OnText)}
                    offAriaLabel={String.format(VCResources.VCToggleLabel, witSticky.displayHtml, VCResources.OffText)}
                />

                {
                    witSticky.updateError &&
                        <div aria-live="assertive" className={VCTypes.Css.Error}>{VCResources.GitSettingError} {witSticky.updateError.message}</div>
                }
            </div>
        );

        return (
            <div className={VCTypes.Css.OptionGroup}>
                <h3 className={VCTypes.Css.OptionHeader}>{witMentions.category}</h3>
                {mention}
                {sticky}
            </div>
        );
    }

    private _renderForks(): JSX.Element {
        const forksOption = this.state.optionsHashtable[VCTypes.Constants.ForksKey];

        const forksDisabled: boolean = !!forksOption.updateError || !this.props.canEditPolicies;

        return (
            <div className={VCTypes.Css.OptionGroup}>
                <h3 className={VCTypes.Css.OptionHeader}>{forksOption.category}</h3>
                <Label>{forksOption.displayHtml}</Label>
                <Toggle
                    checked={forksOption.value}
                    onChanged={this._onForksChanged}
                    onText={VCResources.OnText}
                    offText={VCResources.OffText}
                    disabled={forksDisabled}
                    onAriaLabel={String.format(VCResources.VCToggleLabel, forksOption.displayHtml, VCResources.OnText)}
                    offAriaLabel={String.format(VCResources.VCToggleLabel, forksOption.displayHtml, VCResources.OffText)}
                />

                {
                    forksOption.updateError &&
                        <div aria-live="assertive" className={VCTypes.Css.Error}>{VCResources.GitSettingError} {forksOption.updateError.message}</div>
                }
            </div>
        );
    }

    private _onOptionChanged(optionKey: string, enabled: boolean) {
        this.props.actionCreator.updateRepositoryOption(optionKey, enabled);
    }

    private _onGravatarChanged = (enabled: boolean) => {
        this._onOptionChanged(VCTypes.Constants.GravatarKey, enabled);
    }

    private _onWitMentionChanged = (enabled: boolean) => {
        this._onOptionChanged(VCTypes.Constants.WitMentionsKey, enabled);
    }

    private _onWitStickyChanged = (enabled: boolean) => {
        this._onOptionChanged(VCTypes.Constants.WitTransitionsKey, enabled);
    }

    private _onWebEditChanged = (enabled: boolean) => {
        this._onOptionChanged(VCTypes.Constants.WebEditKey, enabled);
    }

    private _onForksChanged = (enabled: boolean) => {
        this._onOptionChanged(VCTypes.Constants.ForksKey, enabled);
    }

    private _onStateChanged = () => {
        this.setState(this.props.repoOptionsStore.getData());
    }
}
