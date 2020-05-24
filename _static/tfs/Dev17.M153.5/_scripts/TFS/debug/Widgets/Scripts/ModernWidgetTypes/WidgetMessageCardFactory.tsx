import 'VSS/LoaderPlugins/Css!widgets';

import { EmptyChartHelper } from 'Charting/Scripts/EmptyChartHelper';
import * as ChartingResources from 'Charting/Scripts/Resources/TFS.Resources.Charting';
import { IImageProps, ImageFit } from 'OfficeFabric/Image';
import TFS_Host_TfsContext = require('Presentation/Scripts/TFS/TFS.Host.TfsContext');
import * as React from 'react';
import * as Locations from 'VSS/Locations';
import * as StringUtils from 'VSS/Utils/String';
import { IVssIconProps, VssIconType } from 'VSSUI/VssIcon';
import { Size } from 'WidgetComponents/ComponentLayoutEngine';
import { MessageType } from 'WidgetComponents/LayoutState';
import { WidgetMessageCard } from 'WidgetComponents/WidgetMessageCard/WidgetMessageCard';
import {
    IWidgetMessageCardProps,
    WidgetMessageCardAction,
} from 'WidgetComponents/WidgetMessageCard/WidgetMessageCard.Props';
import * as WidgetResources from 'Widgets/Scripts/Resources/TFS.Resources.Widgets';


// This file encapsulates responsability for generating Widget Message Cards, as a generalization from Velocity widget message presentatio code.
// Ultimately, this layer should be factorable to a responsability of Widget Components.


// TODO: Factor ImageConstants into a common location to be shared by other widgets
export module ImageConstants {
    export const SET_ITERATIONS_IMAGE_PATH = '../../../Widgets/sprintBurndown-buildChartLoading.png';
    export const AX_FAULTIN_IMAGE_PATH = 'Dashboards/service-setup.png';
    export const UNCONFIGURED_WIDGET_IMAGE_PATH = 'Dashboards/unconfigured-large.png';

    export const NUMBER_OF_AVAILABLE_NODATA_IMAGES: number = 7;
}

/** Options for configuring the action of a card. */
export interface ActionMessageOptions {
    actionText: string;
    actionAriaLabel: string;
    actionOnClickDelegate: () => void;
}

/** Additional options for the SetIterationDates message type. */
export interface SetIterationDatesMessageOptions extends ActionMessageOptions { }

/** Additional options for the AxFaultIn message type. */
export interface AxFaultInMessageOptions extends ActionMessageOptions { }

export interface MessageOptions extends SetIterationDatesMessageOptions, AxFaultInMessageOptions { }

export interface MessageCardOptions {
    /* Detailed error message */
    message?: string;

    /* Type of message to be displayed */
    messageType: MessageType;

    /** Additional options for particular message types. */
    messageOptions?: MessageOptions;
}

export interface WidgetMessageCardFactoryProps extends MessageCardOptions {
    /* Title of widget */
    title: string;

    /* Size of widget */
    size: Size;
}

export interface WidgetMessageCardFactoryState {
}

/* Gets MessageType from BaseViewComponent and returns WidgetMessageCardProps */
export class WidgetMessageCardFactory extends React.Component<WidgetMessageCardFactoryProps, WidgetMessageCardFactoryState> {

    public constructor(props: WidgetMessageCardFactoryProps) {
        super(props);
    }

    public render(): JSX.Element {
        let messageCardProps = this.getMessageCardProps();

        return <div className="widget-message-card-container">
            <WidgetMessageCard {...messageCardProps} />
        </div>;
    }

    private getMessageCardProps(): IWidgetMessageCardProps {
        var cardAction: WidgetMessageCardAction;

        switch (this.props.messageType) {
            case MessageType.NoData: {
                let imageProps = this.getImageProps(EmptyChartHelper.getEmptyChartResourceFileName());

                return {
                    title: this.props.title,
                    message: StringUtils.format(ChartingResources.EmptyChart_AltTextFormat, StringUtils.empty),
                    size: this.props.size,
                    icon: this.getIconProps(StringUtils.empty, VssIconType.image, imageProps)
                } as IWidgetMessageCardProps
            }

            case MessageType.SetIterationDates: {
                let imageProps = this.getImageProps(Locations.urlHelper.getVersionedContentUrl(ImageConstants.SET_ITERATIONS_IMAGE_PATH));

                return {
                    title: this.props.title,
                    message: WidgetResources.MessageCard_SetIterationDates,
                    size: this.props.size,
                    action: this.getWidgetCardAction(this.props.messageOptions as SetIterationDatesMessageOptions),
                    icon: this.getIconProps(StringUtils.empty, VssIconType.image, imageProps)
                } as IWidgetMessageCardProps
            }

            case MessageType.AxFaultIn: {
                let imageProps = this.getImageProps(Locations.urlHelper.getVersionedContentUrl(ImageConstants.AX_FAULTIN_IMAGE_PATH));

                return {
                    title: this.props.title,
                    message: WidgetResources.MessageCard_AxFaultInMessage,
                    size: this.props.size,
                    action: this.getWidgetCardAction(this.props.messageOptions as AxFaultInMessageOptions),
                    icon: this.getIconProps(StringUtils.empty, VssIconType.image, imageProps)
                } as IWidgetMessageCardProps
            }

            case MessageType.Unconfigured: {
                let imageProps = this.getImageProps(Locations.urlHelper.getVersionedContentUrl(ImageConstants.UNCONFIGURED_WIDGET_IMAGE_PATH));

                return {
                    title: this.props.title,
                    message: WidgetResources.MessageCard_Unconfigured,
                    size: this.props.size,
                    icon: this.getIconProps(StringUtils.empty, VssIconType.image, imageProps)
                } as IWidgetMessageCardProps
            }
        }
    }

    private getIconProps(iconName: string, iconType: VssIconType = VssIconType.bowtie, imageProps?: IImageProps): IVssIconProps {
        return {
            iconName: iconName,
            iconType: iconType,
            imageProps: imageProps
        } as IVssIconProps;
    }

    private getImageProps(src: string): IImageProps {
        return {
            src: src,
            imageFit: ImageFit.none
        } as IImageProps;
    }

    private getWidgetCardAction(messageOptions: MessageOptions): WidgetMessageCardAction {
        let action: WidgetMessageCardAction;

        if (this.props.messageOptions != null
            && this.props.messageOptions.actionText
            && this.props.messageOptions.actionAriaLabel
            && this.props.messageOptions.actionOnClickDelegate) {

            action = {
                text: this.props.messageOptions.actionText,
                ariaLabel: this.props.messageOptions.actionAriaLabel,
                onClick: this.props.messageOptions.actionOnClickDelegate
            };
        }

        return action;
    }
}
