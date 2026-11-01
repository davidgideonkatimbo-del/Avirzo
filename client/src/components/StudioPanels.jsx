import React from 'react';
import { ProjectsPanel } from './ProjectsPanel';
import { ResearchPanel } from './ResearchPanel';
import { TimelinePanel } from './TimelinePanel';
import { CharacterBible } from './CharacterBible';
import { CollaborationPanel } from './CollaborationPanel';
import { BillingPanel } from './BillingPanel';

export function StudioPanels(props) {
  const { showProjects, showResearch, timelineOpen, showBible, showCollaboration, showBilling } = props;
  return <>
    <ProjectsPanel {...props.projectProps} visible={showProjects} />
    <ResearchPanel {...props.researchProps} visible={showResearch} />
    <TimelinePanel {...props.timelineProps} visible={timelineOpen} />
    <CharacterBible {...props.bibleProps} visible={showBible} />
    <CollaborationPanel {...props.collaborationProps} visible={showCollaboration} />
    <BillingPanel {...props.billingProps} visible={showBilling} />
  </>;
}
