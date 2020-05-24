/// <reference types="jquery" />
/// <reference types="q" />

import Q = require("q");

import Core = require("VSS/Utils/Core");
import * as VSS from "VSS/VSS";
import { logError } from "VSS/Diag";

import Telemetry = require("Mention/Scripts/TFS.Social.Telemetry");
import Utils_Array = require("VSS/Utils/Array");
import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import { FeatureAvailabilityFlags } from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";

export module Constants {
    export const PATTERN_WORD_START_SEPARATOR = "\\s|^|-|\\.|,|:|;|'|\"|\\(";
    export const PATTERN_WORD_END_SEPARATOR = "\\s|$|\\.|,|:|;|-|' | \"|\\)";
    export const PATTERN_WORD_SEPARATOR = "\\s#";

    export const METADATA_ATTR_SEPARATOR = ":";
    export const HTML_MENTION_ATTR_NAME = "data-vss-mention";
    export const HTML_MENTION_ID_ATTR = "id";
    export const HTML_MENTION_VERSION_ATTR = "version";
    export const HTML_MENTION_LEGACY_HREF_ATTR = "mailto";
    export const HTML_MENTION_VERSION_10 = HTML_MENTION_VERSION_ATTR + METADATA_ATTR_SEPARATOR + "1.0";
    export const HTML_MENTION_VERSION_20 = HTML_MENTION_VERSION_ATTR + METADATA_ATTR_SEPARATOR + "2.0";
    export const HTML_MENTION_ID_ATTR_PREFIX = Constants.HTML_MENTION_ID_ATTR + Constants.METADATA_ATTR_SEPARATOR;
    export const HTML_MENTION_LEGACY_FORMAT_HREF = HTML_MENTION_LEGACY_HREF_ATTR + Constants.METADATA_ATTR_SEPARATOR;

    // Supporting only the basic markdown it code block syntaxes.
    export const CODE_BLOCK_REGEX = "(```[a-z]*[\\s\\S]*?```)\|(<pre>[a-z]*[\\s\\S]*?</pre>)\|(`[a-z]*[\\s\\S]*?`)";

    export const IDENTITY_PICKER_CONSUMER_ID = "0ca36598-9c44-4a19-a3b1-74960b631990";

    export const DISCUSSION_MESSAGE_CLASS = "discussion-messages-messagecontent";
}

export module CssClasses {
    export var AUTOCOMPLETE_ID = "mention-autocomp-id";
    export var AUTOCOMPLETE_TITLE = "mention-autocomp-title";
}

export function createHtmlMention(href: string, text: string, additionalMetadata?: string, version: string = "1.0"): string {
    let metadata = Constants.HTML_MENTION_VERSION_ATTR + Constants.METADATA_ATTR_SEPARATOR + version;

    if (additionalMetadata) {
        metadata += "," + additionalMetadata;
    }

    var $anchor = $("<a>")
        .attr("href", href)
        .attr(Constants.HTML_MENTION_ATTR_NAME, metadata)
        .text(text);
    return $anchor[0].outerHTML + "&nbsp;";
}

export enum TextPartType {
    Text = 0,
    Mention = 1
}

export interface ITextPart {
    Text: string;
    Type: TextPartType;
    StartIndex: number; //Start index of the text w.r.t the full text
}

export interface IMentionTextPart extends ITextPart {
    ArtifactId: string;
    ArtifactType: string;
}

export interface ArtifactIndexResult {
    start: number;
    end: number;
}

export interface ArtifactMentionParserTextResult {
    index: ArtifactIndexResult;
    id: string;
}

export interface IMentionParser {
    /**
     * Parses the mentions from the input string.
     * @param {string} input string to parse mention.
     * @param {ArtifactIndexResult} ignoreBlocksArtifacts list of indices (start and end index) of the blocks on the full text.
     * Any mentions inside this block will be ownered as a normal text. Currently we do it for code blocks.
     */
    parseMentions(input: string, inputStartIndex: number, ignoreBlocksArtifacts: ArtifactIndexResult[]): ITextPart[];
    getArtifactType(): string;
}

export interface IArtifactMentionParser extends IMentionParser {
    parseFromText(text: string): ArtifactMentionParserTextResult[];
    parseFromUrl(url: string): any;
}

export interface IMentionTranslationProvider {
    translateDisplayNamesToStorageKeys(rawUntranslatedText: string): string;
    translateStorageKeysToDisplayNames(rawUntranslatedText: string): IPromise<string>;
}

export interface MentionRendererHTMLComponent {
    htmlComponent: JQuery;
    displayText: string;
}

export class MentionProcessor {
    private static _defaultInstance;

    private _parserFactories: IPromise<(() => IMentionParser)>[] = [];
    private _parsers: IPromise<IMentionParser[]>;
    private _mentionsRenderer: MentionsRenderer;
    private _mentionTranslationProvider: IMentionTranslationProvider;
    private _MentionTranslatorFactory: IPromise<(() => IMentionTranslationProvider)>;

    public static getDefault(): MentionProcessor {
        if (!MentionProcessor._defaultInstance) {
            MentionProcessor._defaultInstance = new MentionProcessor();
        }
        return MentionProcessor._defaultInstance;
    }

    constructor(mentionsRenderer: MentionsRenderer = MentionsRenderer.getDefault()) {
        this._mentionsRenderer = mentionsRenderer;

        if (FeatureAvailabilityService.isFeatureEnabled(FeatureAvailabilityFlags.WebAccessVersionControlPullRequestsMentions, false)) {
            this._parserFactories.push(Q.Promise((resolve, reject) => {
                VSS.using(["VersionControl/Scripts/Mentions/PullRequestMentionParser"], (vcParser) => {
                    resolve(() => { return vcParser.createParser() });
                });
            }));
        }

        this._MentionTranslatorFactory = Q.Promise((resolve, reject) => {
            VSS.using(["Mention/Scripts/TFS.Mention.People", "Mention/Scripts/TFS.Mention.People.Registration"], (peopleMention, peopleMentionRegistration) => {
                resolve(() => { return peopleMention.getDisplayNameStorageKeyTranslatorInstance() });
            });
        });
    }

    public registerParser(parserFactory: () => IMentionParser) {
        if (this._parsers) {
            this._parsers.then((parsers: IMentionParser[]) => {
                const newParser = parserFactory();
                const parserArtifactType = newParser.getArtifactType();
                for (const parser of parsers) {
                    if (parser.getArtifactType() === parserArtifactType) {
                        throw new Error("Cannot register additional parser of same artifact type after initialization.");
                    }
                }
                parsers.push(newParser);
                return parsers;
            });
        } else {
            this._parserFactories.push(Q.resolve(parserFactory));
        }
    }

    public setMentionTranslationProvider(mentionTranslationProvider: IMentionTranslationProvider) {
        if (!this._mentionTranslationProvider) {
            this._mentionTranslationProvider = mentionTranslationProvider;
        }
    }

    public getMentionsRenderer(): MentionsRenderer {
        return this._mentionsRenderer;
    }
    
    /**
     * Gets all the code block in the text.
     * @param {string} text string to parse for the code blocks.
     * @returns list of indices (start and end index) of the code blocks with the text input. 
     * Code blocks starts with (``` code ```) or (<pre> code </pre>) or (` code `)
     */
    public parseCodeBlocksFromText(text: string): ArtifactIndexResult[] {
        var codeBlockIndices: ArtifactIndexResult[] = [];
        var pattern = new RegExp(Constants.CODE_BLOCK_REGEX, "ig");
        var match;
        while (match = pattern.exec(text)) {
            codeBlockIndices.push({
                start: match.index,
                end: pattern.lastIndex,
            });
        }
        return codeBlockIndices;
    }
    
    public parseInput(input: string): IPromise<ITextPart[]> {
        if (!this._parsers) {
            this._parsers = Q.allSettled(this._parserFactories).then(parseFactoriesStates => {
                // if some of the factories failed, let's still install the ones that succeeded
                return parseFactoriesStates.map(promiseState => {
                    return promiseState.state == "fulfilled" ? promiseState.value() : null
                }).filter(parser => parser != null);
            });
        }
        var codeBlockIndices = this.parseCodeBlocksFromText(input);
        return this._parsers.then(parsers => {
            var result: ITextPart[] = [{ Text: input, Type: TextPartType.Text, StartIndex: 0 }];

            for (var i in parsers) {
                var parser = parsers[i];
                result = <ITextPart[]>$.map(result, t => {
                    var textPart = <ITextPart>t;
                    if (textPart.Type === TextPartType.Mention) {
                        return t;
                    }
                    else {
                        return parser.parseMentions(textPart.Text, textPart.StartIndex, codeBlockIndices);
                    }
                });
            }

            return result;
        });
    }

    public renderParts($container: JQuery, parts: ITextPart[], telemetryProperties: Telemetry.IMentionablePreviewEvent): JQueryPromise<JQuery> {
        var deferred = $.Deferred<JQuery>();

        var $result: JQuery = $();
        var resultsCount = 0;
        var telemetryPartSummaries = [];

        for (var i = 0; i < parts.length; i++) {
            $result = $result.add("<span>");
        }

        var resolveItem = function (i) {
            resultsCount++;
            if (resultsCount === parts.length) {
                telemetryProperties.parts = telemetryPartSummaries.join(",");
                deferred.resolve($result);
            }
        }

        parts.forEach((part, i) => {
            if (part.Type === TextPartType.Mention) {
                var mention = part as IMentionTextPart;
                telemetryPartSummaries.push(this._mentionsRenderer.getTelemetryMentionSummary(mention));
                this._mentionsRenderer.renderMention($($result[i]), mention)
                    .then((result) => {
                        resolveItem(i);
                    }, (result) => {
                        resolveItem(i)
                    });
            } else {
                telemetryPartSummaries.push("text");
                $($result[i]).text(part.Text);
                resolveItem(i);
            }
        });

        $result.appendTo($container);
        return deferred.promise();
    }

    public translateDisplayNamesToStorageKeysOfPersonMentions(rawUnTranslatedText: string): string {
        if (rawUnTranslatedText && this._mentionTranslationProvider) {
            return this._mentionTranslationProvider.translateDisplayNamesToStorageKeys(rawUnTranslatedText);
        }

        return rawUnTranslatedText;
    }

    public translateStorageKeysToDisplayNamesOfPersonMentions(rawUnTranslatedText: string): IPromise<string> {
        //This is always the first method called on page load so, we set the translationprovider instance here
        const callback = (): IPromise<string> => {
            if (this._mentionTranslationProvider && rawUnTranslatedText) {
                return this._mentionTranslationProvider.translateStorageKeysToDisplayNames(rawUnTranslatedText);
            } else {
                return Q.resolve(rawUnTranslatedText);
            }
        };

        if (!this._mentionTranslationProvider) {
            return this._MentionTranslatorFactory.then((translationFactory) => {
                //Check again before setting because Mention.people.ts might have been loaded between now and the time before the promise started to resolve
                if (!this._mentionTranslationProvider) {
                    this._mentionTranslationProvider = translationFactory();
                }
                return callback();
            });
        }

        return callback();
    }
}

export class ArtifactMentionParser implements IArtifactMentionParser {

    public parseFromText(text: string): ArtifactMentionParserTextResult[] {
        throw new Error("Not implemented");
    }

    public getArtifactType(): string {
        throw new Error("Not implemented");
    }

    public parseFromUrl(url: string): any {
        throw new Error("Not implemented");
    }

    /**
     * Returns true if start and end index is in between the indices param's start and end index 
     */
    private isInsideIgnoreBlock(indices: ArtifactIndexResult[], start: number, end: number): boolean {
        var isInside: boolean = false;
        indices && indices.forEach(element => {
            // Check if start and end index is in between the ignore block's start and end index 
            if ((element.start < start && element.start < end) && 
                (element.end > start && element.end > end)) {
                isInside = true;
            }
        });
        return isInside;
    }

    parseMentions(input: string, inputStartIndex: number, ignoreBlocksArtifacts: ArtifactIndexResult[]): ITextPart[] {
        var result: ITextPart[] = [];
        if (input) {
            var artifacts = this.parseFromText(input);
            var prevEnd = 0;
            for (var i = 0; i < artifacts.length; i++) {
                var artifact = artifacts[i];
                if (artifact.index.start > prevEnd) {
                    result.push({
                        Type: TextPartType.Text,
                        Text: input.substring(prevEnd, artifact.index.start),
                        StartIndex: inputStartIndex + prevEnd
                    });
                }
                // If the mention is not inside the code block, then only consider this as mention,
                // else consider this as a normal text, so that the mention inside the code block
                // gets rendered as it is as text.
                if (!this.isInsideIgnoreBlock(ignoreBlocksArtifacts, inputStartIndex + artifact.index.start, inputStartIndex  + artifact.index.end)) {
                    result.push(<IMentionTextPart>{
                        Type: TextPartType.Mention,
                        Text: input.substring(artifact.index.start, artifact.index.end),
                        ArtifactType: this.getArtifactType(),
                        ArtifactId: artifact.id,
                        StartIndex: inputStartIndex + artifact.index.start
                    });
                } else {
                    result.push({
                        Type: TextPartType.Text,
                        Text: input.substring(artifact.index.start, artifact.index.end),
                        StartIndex: inputStartIndex + artifact.index.start
                    });
                }
                prevEnd = artifact.index.end;
            }
            if (input.length > prevEnd) {
                result.push({
                    Type: TextPartType.Text,
                    Text: input.substring(prevEnd, input.length),
                    StartIndex: inputStartIndex + prevEnd
                });
            }
        }
        return result;
    }
}

export interface IMentionsRenderingProvider {
    getArtifactType(): string;
    renderMention(mention: IMentionTextPart, insertHtml: (html: string | JQuery) => JQuery): IPromise<MentionRendererHTMLComponent>;
    getTelemetryMentionSummary(mention: IMentionTextPart): string;
}

/**
 * Responsible for rendering mentions. It finds appropriate {@link IMentionsRenderingProvider} based on mention ArtifactType and
 * uses it to render a mention.
 */
export class MentionsRenderer {
    private static _defaultInstance;

    private _rendererFactories: (() => IMentionsRenderingProvider)[] = [];
    private _renderers: IMentionsRenderingProvider[];
    private _vcRendererPromise: IPromise<IMentionsRenderingProvider>;

    constructor() {
        if (FeatureAvailabilityService.isFeatureEnabled(FeatureAvailabilityFlags.WebAccessVersionControlPullRequestsMentions, false)) {
            this._vcRendererPromise = Q.Promise<IMentionsRenderingProvider>((resolve, reject) => {
                VSS.using(["VersionControl/Scripts/Mentions/PullRequestMentionRenderer"], (vcRenderering) => {
                    resolve(vcRenderering.createRenderer());
                }, error => {
                    logError(error);
                    resolve(null);
                });
            });
        }
        else {
            this._vcRendererPromise = Q.resolve(null);
        }
    }

    public static getDefault(): MentionsRenderer {
        if (!MentionsRenderer._defaultInstance) {
            MentionsRenderer._defaultInstance = new MentionsRenderer();
        }
        return MentionsRenderer._defaultInstance;
    }

    public registerProvider(rendererFactory: () => IMentionsRenderingProvider) {
        if (this._renderers) {
            const renderer = rendererFactory();
            const rendererArtifactType = renderer.getArtifactType();
            for (const renderer of this._renderers) {
                if (renderer.getArtifactType() === rendererArtifactType) {
                    throw new Error("Cannot register additional providers of same artifact type after initialization.");
                }
            }
            this._renderers.push(renderer);
        } else {
            this._rendererFactories.push(rendererFactory);
        }
    }

    private getRenderer(mention: IMentionTextPart): IPromise<IMentionsRenderingProvider> {
        return this._vcRendererPromise.then(vcRenderer => {
            if (!this._renderers) {
                this._renderers = $.map(this._rendererFactories, (factory) => {
                    return factory();
                });

                if (vcRenderer) {
                    this._renderers.push(vcRenderer);
                }
            }
            return Utils_Array.first(this._renderers, p => { return mention.ArtifactType === p.getArtifactType(); });
        });
    }

    public renderMention($container: JQuery, mention: IMentionTextPart): IPromise<MentionRendererHTMLComponent> {
        return this.getRenderer(mention).then((renderer) => {
            if (renderer) {
                return renderer.renderMention(mention, (html) => {
                    const $html = $(html);
                    $html.appendTo($container);
                    return $html;
                });
            }
            throw new Error("No rendering provider found for artifact type");
        });
    }

    public getTelemetryMentionSummary(mention: IMentionTextPart): IPromise<string> {
        return this.getRenderer(mention).then(renderer => {
            if (renderer) {
                return renderer.getTelemetryMentionSummary(mention);
            }
            return null;
        });
    }
}

export class ArtifactsCache<TArtifact> {
    private _cache: { [key: string]: IPromise<TArtifact> } | { [key: number]: IPromise<TArtifact> } = {};
    private _queue: { key: (string | number); deferred: Q.Deferred<TArtifact> }[] = [];
    private _keyPoppedFromQueue: { [key: string]: boolean } | { [key: number]: boolean } = {};

    constructor(
        private _artifactsLoader: ((keys: string[]) => { [key: string]: IPromise<TArtifact> }) | ((keys: number[]) => { [key: number]: IPromise<TArtifact> }),
        private _queueWaitMSec: number,
        private _maxBatchSize: number) {
    }

    public getArtifactPromise(key: string | number): IPromise<TArtifact> {
        var promise: IPromise<TArtifact>;
        if (typeof this._cache[<string>key] !== "undefined") {
            promise = this._cache[<string>key];
        }
        else {
            var deferred = Q.defer<TArtifact>();
            promise = deferred.promise;
            this._cache[<string>key] = promise;
            this._queue.push({
                key: key,
                deferred: deferred
            });
            this._keyPoppedFromQueue[<string>key] = false;
            this._delayProcessQueue(key);
        }
        return promise;
    }

    protected _delayProcessQueue(triggeringKey: string | number) {
        setTimeout(() => this._processQueue(triggeringKey), this._queueWaitMSec);
    }

    protected _processQueue(triggeringKey: string | number) {
        if (this._keyPoppedFromQueue[<any>triggeringKey]) {
            return;
        }
        while (this._queue.length > 0) {
            var batch: { key: (string | number); deferred: Q.Deferred<TArtifact> }[];
            var maxBatchSize = this._maxBatchSize;
            if (this._queue.length <= maxBatchSize) {
                batch = this._queue;
                this._queue = [];
            }
            else {
                batch = this._queue.slice(0, maxBatchSize);
                this._queue = this._queue.slice(maxBatchSize);
            }
            for (var i = 0; i < batch.length; i++) {
                this._keyPoppedFromQueue[<string>batch[i].key] = true;
            }
            this._processBatch(batch);
        }
    }

    protected _processBatch(batch: { key: (string | number); deferred: Q.Deferred<TArtifact> }[]) {
        var keys = batch.map((batchItem) => batchItem.key);
        var artifacts = (<(keys: string[]) => { [key: string]: IPromise<TArtifact> }>this._artifactsLoader)(<string[]>keys);
        batch.forEach((batchItem, index) => {
            if (artifacts.hasOwnProperty(<string>batchItem.key)) {
                var artifactPromise = artifacts[<string>batchItem.key];
                artifactPromise.then((artifact) => {
                    batchItem.deferred.resolve(artifact);
                }, function () {
                    batchItem.deferred.reject.apply(batchItem.deferred, arguments);
                });
            }
            else {
                batchItem.deferred.reject(new Error("Artifact was missing from results of batch load."));
            }
        });
    }
}
