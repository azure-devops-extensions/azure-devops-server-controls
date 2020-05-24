
import "VSS/LoaderPlugins/Css!TfsCommon/Navigation/L1.RightMenuBar";

import Context = require("VSS/Context");
import Controls = require("VSS/Controls");
import Menus = require("VSS/Controls/Menus");
import Navigation_Common = require("TfsCommon/Scripts/Navigation/Common");
import SDK_Shim = require("VSS/SDK/Shim");
import VSS = require("VSS/VSS");

import FeatureManagementUtil_Async = require("TfsCommon/Scripts/FeatureManagement/FeatureManagementUtil");

import Engagement_Resources_Async = require("Engagement/Resources/VSS.Resources.Engagement");
import SAS_FeedbackService_Async = require("Engagement/SendASmile/FeedbackService");
import SAS_FeedbackForm_Async = require("Engagement/SendASmile/FeedbackForm");
import SAS_Utils_Async = require("Engagement/SendASmile/Utils");

var SAS_ROOT_COMMAND = "l1-send-a-smile";
var SAS_POSITIVE_COMMAND = "send-a-smile-positive";
var SAS_NEGATIVE_COMMAND = "send-a-smile-negative";
var SAS_ROOT_COMMAND_NEW = "l1-customer-report";
var SAS_PROBLEM_COMMAND = "report-a-problem";
var SAS_SUGGESTION_COMMAND = "provide-a-suggestion"; 

interface RightMenuOptions extends Navigation_Common.HeaderOptions {
}

class RightMenuBar extends Menus.MenuBar {

    feedbackService: SAS_FeedbackService_Async.FeedbackService;

    initializeOptions(options?: Menus.MenuBarOptions) {
        super.initializeOptions($.extend({
            executeAction: this.onExecuteAction.bind(this),
            alwaysOpenSubMenuOnHover: true
        }, options));
    }

    initialize(): void {
        super.initialize();

        this.getItem("l1-extensions").updateItems(this.getExtensionsMenuItems());

        if (Context.getPageContext().webAccessConfiguration.isHosted) {
            if (this.getItem(SAS_ROOT_COMMAND_NEW) != null) {
                this.getItem(SAS_ROOT_COMMAND_NEW).updateItems((contextInfo: any, callback: IResultCallback, errorCallback?: IErrorCallback) => {
                    VSS.using([
                        "Engagement/Resources/VSS.Resources.Engagement",
                        "Engagement/SendASmile/Utils",
                        "Engagement/SendASmile/FeedbackService"], (
                            Engagement_Resources: typeof Engagement_Resources_Async,
                            SAS_Utils: typeof SAS_Utils_Async,
                             SAS_FeebackService: typeof SAS_FeedbackService_Async
                        ) => {

                            if (!this.feedbackService) {
                                this.feedbackService = new SAS_FeebackService.FeedbackService();
                            }

                            let items = <Menus.IMenuItemSpec>[
                                { id: SAS_PROBLEM_COMMAND, text: Engagement_Resources.ReportAProblem, setDefaultTitle: false, icon: "bowtie-icon bowtie-status-error-outline" },
                                { id: SAS_SUGGESTION_COMMAND, text: Engagement_Resources.ProvideASuggestion, setDefaultTitle: false, icon: "bowtie-icon bowtie-comment-outline" }
                            ];

                            SAS_Utils.Utils.publishTelemetry(SAS_Utils.Telemetry.Area, SAS_Utils.Telemetry.Actions.PopUp);

                            callback(items);
                        });
                });
            }
            if (this.getItem(SAS_ROOT_COMMAND) != null) {
                this.getItem(SAS_ROOT_COMMAND).updateItems((contextInfo: any, callback: IResultCallback, errorCallback?: IErrorCallback) => {
                    VSS.using([
                        "Engagement/Resources/VSS.Resources.Engagement",
                        "Engagement/SendASmile/Utils"], (
                            Engagement_Resources: typeof Engagement_Resources_Async,
                            SAS_Utils: typeof SAS_Utils_Async
                        ) => {
                            let items = <Menus.IMenuItemSpec>[
                                { id: SAS_POSITIVE_COMMAND, text: Engagement_Resources.SendASmileSentimentSelectionPositive, setDefaultTitle: false, icon: "bowtie-icon bowtie-feedback-positive-outline" },
                                { id: SAS_NEGATIVE_COMMAND, text: Engagement_Resources.SendASmileSentimentSelectionNegative, setDefaultTitle: false, icon: "bowtie-icon bowtie-feedback-negative-outline" }
                            ];

                            SAS_Utils.Utils.publishTelemetry(SAS_Utils.Telemetry.Area, SAS_Utils.Telemetry.Actions.PopUp);

                            callback(items);
                        });
                });
            }
        }

        const profileItems = this.getItem("profile");
        if (profileItems) {
            profileItems.updateItems(this.getProfileMenuItems());
        }
        
        this.getItem("ellipsis").updateItems(this.getHelpMenuItems());
    }

    private getRightMenubarActions(): any {
        let options = <Navigation_Common.HeaderOptions>this._options;
        return Navigation_Common.getRightMenuItemAction<Navigation_Common.HeaderItemContext>(options.headerContext, "rightMenuBar");
    }

    private getExtensionsMenuItems(): Menus.IMenuItemSpec[] {
        let rightMenuActions = this.getRightMenubarActions();
        let actions: Navigation_Common.HeaderItemAction[] = [];
        actions.push(rightMenuActions.market);
        actions.push(rightMenuActions.gallery);
        actions.push(rightMenuActions.extensions);

        return Navigation_Common.actionsToMenuItem(actions);
    }

    private getProfileMenuItems(): Menus.IMenuItemSpec[] {
        let rightMenuActions = this.getRightMenubarActions();
        let actions: Navigation_Common.HeaderItemAction[] = [];
        actions.push(rightMenuActions.profile);
        actions.push(rightMenuActions.alerts);
        actions.push(rightMenuActions.security);
        actions.push(rightMenuActions.usage);
        if (rightMenuActions.toggleNewNavFeature) {
            actions.push({ separator: true });
            actions.push(rightMenuActions.toggleNewNavFeature);
        }
        if (rightMenuActions.manageFeatures) {
            actions.push(rightMenuActions.manageFeatures);
        }
        actions.push({ separator: true });
        actions.push(rightMenuActions.signInAs);
        actions.push(rightMenuActions.signOut);

        if (rightMenuActions.profile) {
            rightMenuActions.profile.targetSelf = true;
        }

        if (rightMenuActions.security) {
            rightMenuActions.security.targetSelf = true;
        }

        if (rightMenuActions.usage) {
            rightMenuActions.usage.targetSelf = true;
        }

        if (rightMenuActions.signInAs) {
            rightMenuActions.signInAs.targetSelf = true;
        }

        if (rightMenuActions.signOut) {
            rightMenuActions.signOut.targetSelf = true;
            rightMenuActions.signOut.cta = true;
        }

        const menuItems = Navigation_Common.actionsToMenuItem(actions);
        menuItems.unshift(this.getProfileInfoItem());
        return menuItems;
    }

    private getProfileInfoItem(): Menus.IMenuItemSpec {
        let rightMenuContext = Navigation_Common.getRightMenuItem<Navigation_Common.HeaderItemContext>((<Navigation_Common.HeaderOptions>this._options).headerContext, "rightMenuBar");
        const identityImageUrl = rightMenuContext.properties.IdentityImageUri;
        const { name, uniqueName } = Context.getPageContext().webContext.user;

        let html = `
<img src="${identityImageUrl}" class="profile-image" alt="" />
<div class="profile-menu-name" title="${name}">${name}</div>
<div class="profile-menu-unique-name" title="${uniqueName}">${uniqueName}</div>
        `;
        return {
            id: "profileInfo",
            cssClass: "profile-info-item",
            html: html,
            disabled: true
        }
    }

    private getHelpMenuItems(): Menus.IMenuItemSpec[] {
        let rightMenuActions = this.getRightMenubarActions();
        let actions: Navigation_Common.HeaderItemAction[] = [];
        actions.push(rightMenuActions.welcome);
        actions.push(rightMenuActions.msdn);
        actions.push(rightMenuActions.gettingStarted);
        actions.push(rightMenuActions.community);
        actions.push(rightMenuActions.support);
        actions.push(rightMenuActions.keyboardShortcuts);
        actions.push(rightMenuActions.privacy);
        actions.push(rightMenuActions.about);

        if (rightMenuActions.about) {
            rightMenuActions.about.targetSelf = true;
        }

        return Navigation_Common.actionsToMenuItem(actions);
    }

    private onExecuteAction(args): boolean {
        let commandName = args.get_commandName();
        switch (commandName) {
            case SAS_NEGATIVE_COMMAND:
            case SAS_POSITIVE_COMMAND:
                VSS.using([
                    "Engagement/SendASmile/FeedbackService",
                    "Engagement/SendASmile/FeedbackForm",
                    "Engagement/SendASmile/Utils",
                    "VSS/LoaderPlugins/Css!VSS.Features.Engagement"], (
                        SAS_FeebackService: typeof SAS_FeedbackService_Async,
                        SAS_FeedbackForm: typeof SAS_FeedbackForm_Async,
                        SAS_Utils: typeof SAS_Utils_Async
                    ) => {
                        if (!this.feedbackService) {
                            this.feedbackService = new SAS_FeebackService.FeedbackService();
                        }

                        let sentimentValue = commandName === SAS_POSITIVE_COMMAND ? SAS_FeebackService.SentimentValues.positive : SAS_FeebackService.SentimentValues.negative;
                        let textEntry = new SAS_FeedbackForm.ModalFeedbackForm(sentimentValue, this.feedbackService);
                        textEntry.setup();

                        let properties: any = {};
                        properties[SAS_Utils.Telemetry.PropertyKeys.SentimentValue] = SAS_FeebackService.SentimentValues[sentimentValue];
                        SAS_Utils.Utils.publishTelemetry(SAS_Utils.Telemetry.Area, SAS_Utils.Telemetry.Actions.SentimentSelect, properties);
                    });

                break;

            case SAS_PROBLEM_COMMAND:
                this.feedbackService && this.feedbackService.redirectReportProblem(Context.getDefaultWebContext(), Context.getPageContext());
                VSS.using([
                    "Engagement/Resources/VSS.Resources.Engagement",
                    "Engagement/SendASmile/Utils"], (
                        Engagement_Resources: typeof Engagement_Resources_Async,
                        SAS_Utils: typeof SAS_Utils_Async
                    ) => {
                        let properties: any = {};
                        properties[SAS_Utils.Telemetry.PropertyKeys.SentimentValue] = Engagement_Resources.ReportAProblem;
                        SAS_Utils.Utils.publishTelemetry(SAS_Utils.Telemetry.Area, SAS_Utils.Telemetry.Actions.SentimentSelect, properties);
                    });

                 break;

            case SAS_SUGGESTION_COMMAND:
                this.feedbackService && this.feedbackService.redirectProvideSuggestion();
                VSS.using([
                    "Engagement/Resources/VSS.Resources.Engagement",
                    "Engagement/SendASmile/Utils"], (
                        Engagement_Resources: typeof Engagement_Resources_Async,
                        SAS_Utils: typeof SAS_Utils_Async
                    ) => {
                        let properties: any = {};
                        properties[SAS_Utils.Telemetry.PropertyKeys.SentimentValue] = Engagement_Resources.ProvideASuggestion;
                        SAS_Utils.Utils.publishTelemetry(SAS_Utils.Telemetry.Area, SAS_Utils.Telemetry.Actions.SentimentSelect, properties);
                    });

                break;

            case "manageFeatures":
                VSS.using(["TfsCommon/Scripts/FeatureManagement/FeatureManagementUtil"], (_FeatureManagementUtil: typeof FeatureManagementUtil_Async) => {
                    _FeatureManagementUtil.showFeatureManagementUI();
                });
                return false;
            default:
                break;
        }
    }
}

SDK_Shim.registerContent("navbar.level1.rightMenuBar", (context) => {
    Controls.Enhancement.enhance(RightMenuBar, context.$container.find(".right-menu-bar"), <any>Navigation_Common.getHeaderOptions<RightMenuOptions>(context));
});