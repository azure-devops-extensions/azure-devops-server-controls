import { MentionProcessor, MentionsRenderer } from "Mention/Scripts/TFS.Mention";
import {WorkItemMentionsRenderingProvider, WorkItemsMentionParser } from "Mention/Scripts/TFS.Mention.WorkItems";

MentionsRenderer.getDefault().registerProvider(WorkItemMentionsRenderingProvider.getDefault);
MentionProcessor.getDefault().registerParser(WorkItemsMentionParser.getDefault);
