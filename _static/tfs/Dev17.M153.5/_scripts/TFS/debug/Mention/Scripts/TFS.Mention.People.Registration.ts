import { MentionProcessor, MentionsRenderer } from "Mention/Scripts/TFS.Mention";
import { PeopleMentionParser, PeopleMentionsRenderingProvider, DisplayNameStorageKeyTranslationProvider } from "Mention/Scripts/TFS.Mention.People";

MentionProcessor.getDefault().registerParser(PeopleMentionParser.getDefault);
MentionsRenderer.getDefault().registerProvider(PeopleMentionsRenderingProvider.getDefault);
MentionProcessor.getDefault().setMentionTranslationProvider(DisplayNameStorageKeyTranslationProvider.getDefault());