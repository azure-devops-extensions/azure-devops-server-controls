/// <amd-dependency path="jQueryUI/sortable"/>
/// <reference types="jquery" />
/// <reference types="react" />
/// <reference types="react-dom" />

import ko = require("knockout");
import React = require("react");

import AdminResources = require("Admin/Scripts/Resources/TFS.Resources.Admin");

import BaseSourceProvider = require("Build/Scripts/SourceProviders/BaseSourceProvider");
import BuildContext = require("Build/Scripts/Context");
import BuildCustomTab = require("Build/Scripts/BuildDetails.CustomTab");
import BuildDefinitionViewModel = require("Build/Scripts/BuildDefinitionViewModel");
import Build_FolderManageDialog_Component_NO_REQUIRE = require("Build/Scripts/Components/FolderManageDialog");
import BuildResources = require("Build/Scripts/Resources/TFS.Resources.Build");
import BuildTags = require("Build/Scripts/Controls.Tags");
import BuildView_NO_REQUIRE = require("Build/Scripts/Views");
import { WellKnownContributionData } from "Build/Scripts/Contribution";
import ViewsCommon = require("Build/Scripts/Views.Common");
import XamlFunctions = require("Build/Scripts/Xaml.Functions");

import * as Histogram from "Build.Common/Scripts/Controls/Histogram";

import KnockoutCommon = require("DistributedTasksCommon/TFS.Knockout.CustomHandlers");
import InternalTasksEditor = require("DistributedTasksCommon/TFS.Tasks.TasksEditor.Internal");

import ServerConstants = require("Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import TFS_Knockout = require("Presentation/Scripts/TFS/TFS.Knockout");

import BuildExtensionContracts = require("TFS/Build/ExtensionContracts");
import BuildContracts = require("TFS/Build/Contracts");
import VCContracts = require("TFS/VersionControl/Contracts");

import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";
import VCGitRepositorySelectorMenu = require("VersionControl/Scripts/Controls/GitRepositorySelectorMenu");
import VCGitVersionSelectorMenu = require("VersionControl/Scripts/Controls/GitVersionSelectorMenu");
import * as GitRefUtility from "VersionControl/Scripts/GitRefUtility";
import VCSpecs = require("VersionControl/Scripts/TFS.VersionControl.VersionSpecs");

import { TemplateControl } from "VSS/Adapters/Knockout";
import ComboControls_NO_REQUIRE = require("VSS/Controls/Combos");
import Context = require("VSS/Context");
import Contributions_Contracts = require("VSS/Contributions/Contracts");
import Contributions_Controls = require("VSS/Contributions/Controls");
import Controls = require("VSS/Controls");
import { getService as getEventService } from "VSS/Events/Services";
import Splitter_NO_REQUIRE = require("VSS/Controls/Splitter");
import FeatureAvailability_Services = require("VSS/FeatureAvailability/Services");
import Navigation_Services = require("VSS/Navigation/Services");
import Panels = require("VSS/Controls/Panels");
import Utils_String = require("VSS/Utils/String");
import { KeyCode } from "VSS/Utils/UI";
import VSS = require("VSS/VSS");

import ReactDOM = require("react-dom");

var _initialized: boolean = false;
export class KnockoutCustomHandlers {

    public static initializeKnockoutHandlers() {
        if (_initialized) {
            return;
        }
        _initialized = true;

        ko.bindingHandlers["buildResource"] = TFS_Knockout.getResourceBindingHandler(BuildResources);
        ko.bindingHandlers["adminResource"] = TFS_Knockout.getResourceBindingHandler(AdminResources);

        ko.bindingHandlers["createEnhancement"] = {
            init: function (element: JQuery, valueAccessor: () => any, allBindingsAccessor: () => any, viewModel: any, bindingContext: KnockoutBindingContext) {
                return { controlsDescendantBindings: true };
            },
            update: function (element: JQuery, valueAccessor: () => any, allBindingsAccessor: () => any, viewModel: any, bindingContext: KnockoutBindingContext) {
                var value: {
                    controlType: string;
                    viewModel: any;
                    controlInitialized: (control: any) => void;
                    eventHandlers?: [{ type: any; eventHandler: any }];
                } = valueAccessor();
                element = $(element);
                var ENHANCED_DATA_KEY = "EnhancedControlKey";
                if (value) {
                    var controlType;
                    switch (value.controlType) {
                        case "histogram":
                            controlType = Histogram.BuildHistogramControl;
                            break;
                        case "tags":
                            controlType = BuildTags.TagsControl;
                            break;
                    }
                    if (!controlType) {
                        return;
                    }
                    var data: any = element.data(ENHANCED_DATA_KEY);
                    var control: Controls.BaseControl = data;
                    if (!control) {
                        control = Controls.BaseControl.createIn(controlType, element, value.viewModel);
                        element.data(ENHANCED_DATA_KEY, control);
                        if (value.controlInitialized) {
                            value.controlInitialized(control);
                        }

                        try {
                            // add any element event handlers 
                            var eventHandlers = value.eventHandlers;
                            if (eventHandlers) {
                                $.each(eventHandlers, (index, data: { type: any; eventHandler: any }) => {
                                    element.bind(data.type, data.eventHandler);
                                });
                            }
                        }
                        catch (err) {

                        }
                    }
                }
            }
        }

        ko.bindingHandlers["createComboControl"] = {
            init: function (element: JQuery, valueAccessor: () => any, allBindingsAccessor: () => any, viewModel: any, bindingContext: KnockoutBindingContext) {
                return { controlsDescendantBindings: true };
            },
            update: function (element: JQuery, valueAccessor: () => any, allBindingsAccessor: () => any, viewModel: any, bindingContext: KnockoutBindingContext) {
                let value: {
                    options: ComboControls_NO_REQUIRE.IComboOptions;
                    observable: KnockoutObservable<string>;
                    invalid?: KnockoutObservableBase<boolean>;
                } = valueAccessor();
                element = $(element);
                VSS.using(["VSS/Controls/Combos"], (_comboControl: typeof ComboControls_NO_REQUIRE) => {
                    let ENHANCED_DATA_KEY = "EnhancedControlKey";
                    let data: any = element.data(ENHANCED_DATA_KEY);
                    let control: ComboControls_NO_REQUIRE.Combo = data;
                    if (!control) {
                        control = <ComboControls_NO_REQUIRE.Combo>Controls.BaseControl.createIn(_comboControl.Combo, element, value.options);
                        element.data(ENHANCED_DATA_KEY, control);
                    }

                    if (value.observable) {
                        control.setText(value.observable.peek());
                        let observableSubscription = value.observable.subscribe((newValue) => {
                            control.setText(newValue);
                        });
                        element.data("disposableSubscription", observableSubscription);

                        ko.utils.domNodeDisposal.addDisposeCallback(element[0], () => {
                            let subscription: IDisposable = element.data("disposableSubscription");
                            if (subscription) {
                                subscription.dispose();
                            }
                        });
                    }

                    if (value.invalid) {
                        control.setInvalid(value.invalid.peek());
                        let validSubscription = value.invalid.subscribe((newValue) => {
                            control.setInvalid(newValue);
                        });
                        element.data("invalidSubscription", validSubscription);

                        ko.utils.domNodeDisposal.addDisposeCallback(element[0], () => {
                            let subscription: IDisposable = element.data("invalidSubscription");
                            if (subscription) {
                                subscription.dispose();
                            }
                        });
                    }
                });
            }
        }

        ko.bindingHandlers["createFolderManageReactComponent"] = {
            init: function (element: JQuery, valueAccessor: () => Build_FolderManageDialog_Component_NO_REQUIRE.IFolderManageDialogProps, allBindingsAccessor: () => any, viewModel: any, bindingContext: KnockoutBindingContext) {
            },
            update: function (element: JQuery, valueAccessor: () => any, allBindingsAccessor: () => any, viewModel: any, bindingContext: KnockoutBindingContext) {
                element = $(element);
                VSS.using(["Build/Scripts/Components/FolderManageDialog"], (_Build_FolderManageDialog_Component: typeof Build_FolderManageDialog_Component_NO_REQUIRE) => {
                    if (!this._folderManageComponentInitialized) {
                        let folderManageDialogClass = ".folder-manage-component-dialog";
                        if (element.length === 0) {
                            // create placeholder for this component
                            element = $(Utils_String.format("<div class='{0}'></div>", folderManageDialogClass));
                            this._element.append(element);
                        }
                        ReactDOM.render(React.createElement("div", null, React.createElement(_Build_FolderManageDialog_Component.FolderManageDialog, valueAccessor())), element[0]);
                    }

                    let dialogElement = $(element.parents('.ui-dialog').get(0));
                    dialogElement.on("dialogclose", () => {
                        // clean up component when dialog closes
                        ReactDOM.unmountComponentAtNode(element[0]);
                    });

                    ko.utils.domNodeDisposal.addDisposeCallback(element[0], () => {
                        // clean up component when element is disposed, this can be achieved by moving back and forth through wizard pages
                        ReactDOM.unmountComponentAtNode(element[0]);
                    });
                });
            }
        }

        ko.bindingHandlers["createCollapsiblePanel"] = {
            init: function (element: JQuery, valueAccessor: () => any, allBindingsAccessor: () => any, viewModel: any, bindingContext: KnockoutBindingContext) {
                return { controlsDescendantBindings: true };
            },
            update: function (element: JQuery, valueAccessor: () => any, allBindingsAccessor: () => any, viewModel: any, bindingContext: KnockoutBindingContext) {
                element = $(element);
                var value: {
                    templateName: string;
                    headerTextCssClass?: string;
                    headerText: string;
                    viewModel: any;
                    collapseByDefault?: boolean;
                } = valueAccessor();

                if (value) {
                    var templateName = ko.utils.unwrapObservable(value.templateName);
                    var headerCss = "summary-text";
                    if (value.headerTextCssClass) {
                        headerCss = value.headerTextCssClass;
                    }
                    element.removeAttr("data-bind");
                    var loadedElement = TFS_Knockout.loadHtmlTemplate(templateName).appendTo(element);
                    ko.cleanNode(element[0]);
                    ko.applyBindings(value.viewModel, element[0]);
                    var control = <Panels.CollapsiblePanel>Controls.BaseControl.createIn(Panels.CollapsiblePanel, element, value.viewModel);
                    var header = $("<span>").text(value.headerText).addClass(headerCss);
                    control.appendHeader(header);
                    loadedElement.remove();
                    control.appendContent(loadedElement);
                    if (!value.collapseByDefault) {
                        control.expand();
                    }
                    ko.applyBindings(value.viewModel, control.getElement()[0]);
                }
            }
        };

        ko.bindingHandlers["sortableList"] = {
            init: function (element: JQuery, valueAccessor: () => any) {
                var rulesList = valueAccessor();
                $(element).sortable({
                    update: function (event, ui) {
                        // get the rule from the ui
                        var rule = ko.dataFor(ui.item[0]);
                        var position = ko.utils.arrayIndexOf(ui.item.parent().children().toArray(), ui.item[0]);

                        if (position >= 0) {
                            rulesList.remove(rule);
                            rulesList.splice(position, 0, rule);
                            ui.item.remove();
                        }
                    }
                });
            }
        };

        var RefsHeadsPrefix = "refs/heads/";
        var RefsTagsPrefix = "refs/tags/";
        ko.bindingHandlers["tfgitVersionSelectorControl"] = {
            update: function (element: JQuery, valueAccessor: () => any, allBindingsAccessor: () => any, viewModel: any, bindingContext: KnockoutBindingContext) {
                var repositoryContext: GitRepositoryContext = valueAccessor();
                if (ko.isObservable(repositoryContext)) {
                    repositoryContext = (<any>repositoryContext)();
                }

                var allBindings = allBindingsAccessor();
                var observable: KnockoutObservable<string> = allBindings.observable;
                var repoOptions: any = allBindings.repoOptions || {};

                repoOptions.onItemChanged = (selectedItem: any) => {
                    if (selectedItem) {
                        var item = "";
                        if (selectedItem.branchName) {
                            item = GitRefUtility.getFullRefNameFromBranch(selectedItem.branchName);
                        }
                        else if (selectedItem.tagName) {
                            item = RefsTagsPrefix + selectedItem.tagName;
                        }

                        observable(item);
                    }
                };

                var versionSelectorMenu = <VCGitVersionSelectorMenu.GitVersionSelectorMenu>Controls.Enhancement.enhance(VCGitVersionSelectorMenu.GitVersionSelectorMenu, element, repoOptions);
                versionSelectorMenu.setRepository(repositoryContext);

                var initialBranch = observable();
                if (initialBranch) {
                    versionSelectorMenu.setSelectedItem(new VCSpecs.GitBranchVersionSpec(GitRefUtility.getRefFriendlyName(initialBranch)));
                }
            }
        }

        ko.bindingHandlers["tfgitRepositorySelectorControl"] = {
            update: function (element: JQuery, valueAccessor: () => any, allBindingsAccessor: () => any, viewModel: any, bindingContext: KnockoutBindingContext) {
                var tfsContext = TFS_Host_TfsContext.TfsContext.getDefault();
                var projectId = tfsContext.navigation.projectId;
                var value: {
                    repository: KnockoutObservable<VCContracts.GitRepository>,
                    onItemChanged: (repository: VCContracts.GitRepository) => {},
                    showTfvc: any
                } = valueAccessor();
                var repo: VCContracts.GitRepository = ko.utils.unwrapObservable(value.repository);
                var tfvcRepo = null;

                var projectInfoPromise: IPromise<VCContracts.VersionControlProjectInfo> = projectInfoPromise = BuildContext.viewContext.buildDefinitionManager.getProjectInfo();

                projectInfoPromise.then((projectInfo) => {
                    if (value.showTfvc && projectInfo && projectInfo.supportsTFVC) {
                        // This is how VersionControl shows both tfvc and git in the same control - see /Tfs/Service/WebAccess/VersionControl/Scripts/Views/BaseView.ts
                        tfvcRepo = <VCContracts.GitRepository>{ name: "$/" + tfsContext.navigation.project };
                    }

                    var repoSelectorMenu = <VCGitRepositorySelectorMenu.GitRepositorySelectorMenu>Controls.Enhancement.enhance(VCGitRepositorySelectorMenu.GitRepositorySelectorMenu, element, <VCGitRepositorySelectorMenu.GitRepositorySelectorMenuOptions>{
                        tfsContext: tfsContext,
                        projectId: projectId,
                        initialSelectedItem: repo,
                        showRepositoryActions: false,
                        onItemChanged: value.onItemChanged ? value.onItemChanged.bind(viewModel) : null,
                        projectInfo: projectInfo,
                        tfvcRepository: tfvcRepo
                    });

                    if (repo && repo.id) {
                        repoSelectorMenu.setSelectedRepository(repo);
                    }
                    else if (tfvcRepo) {
                        repoSelectorMenu.setSelectedRepository(tfvcRepo);
                    }
                });
            }
        }

        ko.bindingHandlers["renderSummaryMarkdown"] = {
            init: function (element: JQuery, valueAccessor: () => any, allBindingsAccessor: () => any, viewModel: any, bindingContext: KnockoutBindingContext) {
                return { controlsDescendantBindings: true };
            },
            update: function (element: JQuery, valueAccessor: () => any, allBindingsAccessor: () => any, viewModel: any, bindingContext: KnockoutBindingContext) {
                element = $(element);
                var value: {
                    markDown: string;
                } = valueAccessor();

                if (value) {
                    XamlFunctions.renderMessageForDisplay(element, value.markDown || "");
                }
            }
        };

        ko.bindingHandlers["enhanceResultsViewContributions"] = {
            init: function (element: JQuery, valueAccessor: () => any, allBindingsAccessor: () => any, viewModel: any, bindingContext: KnockoutBindingContext) {
                return { controlsDescendantBindings: true };
            },
            update: function (element: JQuery, valueAccessor: () => any, allBindingsAccessor: () => any, viewModel: any, bindingContext: KnockoutBindingContext) {
                let value: {
                    contribution: KnockoutObservable<Contributions_Contracts.Contribution>,
                    selected: KnockoutObservable<boolean>
                } = valueAccessor();
                element = $(element);
                let contribution: Contributions_Contracts.Contribution = ko.utils.unwrapObservable(value.contribution);
                if (!contribution || element.data("contribution")) {
                    return;
                }
                if (value.selected) {
                    let selected = ko.utils.unwrapObservable(value.selected);
                    if (!selected) {
                        // if this not selected yet, don't unnecessarily render
                        return;
                    }
                }
                // Set build callbacks
                let webContext = Context.getDefaultWebContext();
                var buildCallBacks = [];

                // Subscribe to call back changes  and build changes 
                let callBackSubscription = ko.computed(() => {
                    let currentBuild = BuildContext.buildDetailsContext.currentBuild();
                    if (currentBuild) {
                        let status = currentBuild.status(); // touch status - since we need to react to status as well
                        $.each(buildCallBacks, (index, callBack) => {
                            callBack(currentBuild.value());
                        });
                    }
                });
                element.data("callBackSubscription", callBackSubscription);
                element.data("contribution", contribution);

                if (contribution.properties["height"]) {
                    let height = contribution.properties["height"];
                    element.height(height);
                    let parentElement = element.parent();
                    // for external tab contributions, since iframe is involved, let's honor same height dictacted by extension as height for tab content holder
                    if (Utils_String.equals(contribution.type, WellKnownContributionData.ResultsTabType) && parentElement.hasClass('build-custom-tab')) {
                        parentElement.height(height);
                    }
                }

                if (contribution.properties["width"]) {
                    element.width(contribution.properties["width"]);
                }

                let loadingSpan = $(Utils_String.format("<span id='enhanceResultsViewContributions-loading-span'>{0}</span>", BuildResources.Loading));
                element.append(loadingSpan);

                // Create extension
                Contributions_Controls.createExtensionHost(element, contribution, <BuildExtensionContracts.IBuildResultsViewExtensionConfig>{
                    // See BuildExtensionContracts.IBuildResultsViewExtensionConfig
                    onBuildChanged: (buildCallBack) => {
                        buildCallBacks.push(buildCallBack);
                        let currentBuild = BuildContext.buildDetailsContext.currentBuild();
                        if (currentBuild) {
                            let build = currentBuild.value();
                            buildCallBack(build);
                            VSS.using(["VSS/Controls/Splitter"], (_Splitter: typeof Splitter_NO_REQUIRE) => {
                                // for xaml, we need left pane to stay hidden, there might be other controls like fullscreen toggle who makes the splitter visible/hidden
                                var mainSplitter = <Splitter_NO_REQUIRE.Splitter>Controls.Enhancement.getInstance(_Splitter.Splitter, $(".hub-content > .splitter.horizontal"));
                                if (mainSplitter) {
                                    if (build.definition && build.definition.type === BuildContracts.DefinitionType.Xaml) {
                                        mainSplitter.collapse();
                                    }
                                    else {
                                        mainSplitter.expand();
                                    }
                                }
                            });
                        }
                    },
                    // see BuildExtensionContracts.IBuildResultsViewExtensionConfig
                    onViewDisplayed: (onDisplayedCallBack: () => void) => {
                        // for sections, this callback doesn't do anything
                        if (viewModel instanceof BuildCustomTab.BuildCustomTabViewModel) {
                            viewModel.setTabSelectedCallBack(onDisplayedCallBack);
                        }
                    },
                    // This is used only by internal extensions - currently test management extension
                    onFullScreenToggle: (isFullScreen: boolean) => {
                        handleFullScreenToggleForBuildSummaryTab(isFullScreen);
                    },
                    // This is used only by internal extensions - currently test management extension, to identify the extension they are dealing with
                    name: WellKnownContributionData.ResultsView,
                    // see BuildExtensionContracts.IBuildResultsViewExtensionConfig
                    selectTab: (fullyQualifiedTabId: string) => {
                        // lazily loading build views script
                        VSS.using(["Build/Scripts/Views"], (_buildViewScript: typeof BuildView_NO_REQUIRE) => {
                            let buildview = _buildViewScript.buildViewUtils.getRegisteredBuildView(ViewsCommon.BuildViewType.Result);
                            if (buildview && buildview.getCurrentView()) {
                                let historySvc = Navigation_Services.getHistoryService();
                                let currentState = historySvc.getCurrentState();
                                let action = currentState.action || "summary";
                                if (currentState) {
                                    currentState[ViewsCommon.BuildNavigationStateProperties.tab] = fullyQualifiedTabId;
                                    historySvc.addHistoryPoint(action, currentState);
                                }
                            }
                        });
                    },
                    setSectionVisibility: (fullyQualifiedSectionId: string, value: boolean) => {
                        getEventService().fire(BuildContext.BuildSummaryViewEvents.HideSection, {
                            id: fullyQualifiedSectionId,
                            value: value
                        } as BuildContext.IHideSectionEventPayload);
                    }
                }).then((host) => {
                    host.getLoadPromise().then(() => {
                        // show the element when the extension is succesfully loaded
                        loadingSpan.remove();
                        element.hide().fadeIn('slow');
                    }, (error) => {
                        loadingSpan.remove();
                        VSS.handleError(error);
                    });
                }, (error) => {
                    loadingSpan.remove();
                    VSS.handleError(error);
                });

                ko.utils.domNodeDisposal.addDisposeCallback(element[0], () => {
                    let subscription: IDisposable = element.data("callBackSubscription");
                    if (subscription) {
                        subscription.dispose();
                    }
                });

            }
        };

        ko.bindingHandlers["buildCreateTaskEditor"] = {
            init: function (element: JQuery, valueAccessor: () => any, allBindingsAccessor: () => any, viewModel: any, bindingContext: KnockoutBindingContext) {
                return { controlsDescendantBindings: true };
            },
            update: function (element: JQuery, valueAccessor: () => any, allBindingsAccessor: () => any, viewModel: any, bindingContext: KnockoutBindingContext) {
                var control = $(element);
                var value: {
                    viewModel: KnockoutObservable<BuildDefinitionViewModel.BuildDefinitionViewModel>;
                } = valueAccessor();

                if (value) {
                    control.removeAttr("data-bind");
                    var templateName = "taskeditor_view";
                    control = TFS_Knockout.loadHtmlTemplate(templateName, "tasks-editor-content").appendTo(element);
                    var vm = new InternalTasksEditor.TaskGroupListEditorViewModel(value.viewModel, null, false, {
                        addTasksLabel: BuildResources.BuildDefinitionAddBuildStepText,
                        defaultTaskCategoryName: "Build",
                        tasksVisibilityFilter: ["Build"],
                        variableProvider: value.viewModel.peek().variableProvider
                    });
                    ko.cleanNode(control[0]);
                    // We don't use TemplateControl.ApplyRegisteredControl pattern since it doesn't work when the parent VM context and child context are different
                    // In which case, it would apply parent's VM to child whenever there are VM updates
                    // By creating customhandler we intercept this and do what is needed
                    // To Load actual template from script
                    ko.applyBindings(vm, control[0]);
                    var editorControl = Controls.BaseControl.enhance(InternalTasksEditor.TaskGroupListEditorControl, control, vm);
                    // Now apply bindings           
                    ko.applyBindings(vm, editorControl.getElement()[0]);
                    // initialize control
                    editorControl.initialize();
                }
            }
        };

        ko.bindingHandlers["repositoryForm"] = {
            init: function (element: JQuery, valueAccessor: () => any, allBindingsAccessor: () => any, viewModel: any, bindingContext: KnockoutBindingContext) {
                return { controlsDescendantBindings: true };
            },
            update: function (element: JQuery, valueAccessor: () => any, allBindingsAccessor: () => any, viewModel: any, bindingContext: KnockoutBindingContext) {
                var control = $(element);
                var value: {
                    viewModel: IRepositoryEditorViewModel;
                } = valueAccessor();

                if (value) {
                    var repoVM: IRepositoryEditorViewModel = ko.utils.unwrapObservable(value.viewModel);
                    if (!repoVM) {
                        return;
                    }
                    control.removeAttr("data-bind");
                    var vm = new BaseSourceProvider.RepositoryEditorWrapperViewModel(repoVM);
                    var templateName = repoVM.getTemplateName();
                    if (templateName) {
                        control = TFS_Knockout.loadHtmlTemplate(repoVM.getTemplateName(), "repository-form").appendTo(element);

                        ko.cleanNode(control[0]);
                        ko.applyBindings(vm, control[0]);

                        var repoEditor = Controls.BaseControl.enhance(repoVM.getEditorControlType(), control, vm);

                        ko.applyBindings(vm, repoEditor.getElement()[0]);
                        repoEditor.initialize();
                    }
                }
            }
        };

        ko.bindingHandlers["triggerClickOnKeyUp"] = {
            init: function (element: Element, valueAccessor: () => any, allBindingsAccessor: () => any, viewModel: any, bindingContext: KnockoutBindingContext) {
                let callBack: Function = valueAccessor();
                let jElement = $(element);
                if (callBack) {
                    jElement.keyup((event: JQueryEventObject) => {
                        let key = event.which ? event.which : event.keyCode;
                        if (key === KeyCode.ENTER || key === KeyCode.SPACE) {
                            callBack.call(viewModel, viewModel, event);
                            return false;
                        }

                        return true;
                    });
                }
            }
        };

        ko.bindingHandlers["triggerFocus"] = {
            init: function (element: JQuery, valueAccessor: () => boolean, allBindingsAccessor: () => any, viewModel: any, bindingContext: KnockoutBindingContext) {
                return { controlsDescendantBindings: true };
            },
            update: function (element: JQuery, valueAccessor: () => boolean, allBindingsAccessor: () => any, viewModel: any, bindingContext: KnockoutBindingContext) {
                element = $(element);
                const value = valueAccessor();
                if (value) {
                    const triggerFocus = ko.utils.unwrapObservable(value);
                    if (triggerFocus) {
                        element.focus();
                    }
                }
            }
        };

        // DistributedTasksCommon's TFS.Knockoutout.Common script defines more bindingHandlers
        KnockoutCommon.initKnockoutHandlers(true);
    }
}

function handleFullScreenToggleForBuildSummaryTab(isFullScreen: boolean): void {
    let classesToAttachInFullScreenMode: string[] = [
        ".buildvnext-details-header",
        ".hub-title",
        ".hub-pivot",
        ".buildvnext-view-right-pane-content",
        ".hub-content",
        ".right-hub-content",
        ".pageProgressIndicator"];

    classesToAttachInFullScreenMode.forEach((searchPattern: string) => {
        $(searchPattern).toggleClass("full-screen-mode-summary-tab-extension", isFullScreen);
    });
}

TemplateControl.registerBinding("buildvnext_histogram", Histogram.BuildHistogramControl, (context?: any): Histogram.BuildHistogramViewModel => {
    return new Histogram.BuildHistogramViewModel(new Histogram.BuildsInfo(context.builds, 0), (build) => {
        BuildContext.viewContext.viewBuild(build);
    });
});


// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("KnockoutExtensions", exports);
